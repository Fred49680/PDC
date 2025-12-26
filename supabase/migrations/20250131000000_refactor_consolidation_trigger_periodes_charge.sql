-- ============================================================================
-- REFACTORING COMPLET DES TRIGGERS DE CONSOLIDATION PERIODES_CHARGE
-- ============================================================================
-- Description: Remplace tous les triggers existants par un seul trigger
-- qui consolide automatiquement les périodes par jours ouvrés, par affaire,
-- compétence et nombre de ressources.
--
-- Fonctionnement:
-- 1. Décompose chaque période en jours individuels (jours ouvrés uniquement)
-- 2. Groupe par affaire, compétence, et nombre de ressources
-- 3. Reconstruit les périodes consécutives avec la même charge
-- 4. Supprime automatiquement les périodes avec nb_ressources = 0
-- 5. Gère INSERT/UPDATE/DELETE
-- ============================================================================

-- Supprimer tous les anciens triggers
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_insert ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_update ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_delete ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidation_periodes_charge ON periodes_charge;
DROP TRIGGER IF EXISTS trg_normalize_site_periodes_charge ON periodes_charge;

-- Supprimer les anciennes fonctions de consolidation
DROP FUNCTION IF EXISTS consolidate_periodes_charge() CASCADE;
DROP FUNCTION IF EXISTS consolidate_periodes_charge_for_competence(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS consolidate_periodes_charge_background(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS trigger_consolidate_periodes_charge() CASCADE;
DROP FUNCTION IF EXISTS trigger_consolidation_periodes_charge(TEXT, TEXT) CASCADE;

-- ============================================================================
-- FONCTION PRINCIPALE DE CONSOLIDATION
-- ============================================================================
-- Cette fonction consolide toutes les périodes pour une combinaison
-- affaire/site/compétence donnée en décomposant en jours ouvrés uniquement
-- et en regroupant par nombre de ressources
-- ============================================================================
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_periode_consolidee RECORD;
  v_jours_par_charge RECORD;
  v_date_debut DATE;
  v_date_fin DATE;
  v_nb_ressources INTEGER;
  v_date_precedente DATE;
BEGIN
  -- Protection contre la récursion infinie
  IF current_setting('app.consolidating', true) = 'true' THEN
    RETURN;
  END IF;

  -- Marquer qu'on est en train de consolider
  PERFORM set_config('app.consolidating', 'true', true);

  BEGIN
    -- ÉTAPE 1: Créer une table temporaire pour stocker les jours avec leurs charges
    -- On ne stocke que les jours ouvrés (hors week-ends et fériés)
    CREATE TEMP TABLE IF NOT EXISTS temp_jours_charge (
      date_jour DATE,
      nb_ressources INTEGER
    ) ON COMMIT DROP;

    -- ÉTAPE 2: Décomposer toutes les périodes existantes en jours individuels
    -- UNIQUEMENT les jours ouvrés (is_business_day = TRUE)
    -- On prend la charge maximale pour chaque jour (au cas où il y aurait chevauchement)
    INSERT INTO temp_jours_charge (date_jour, nb_ressources)
    SELECT 
      date_jour::DATE,
      MAX(nb_ressources)::INTEGER AS nb_ressources
    FROM (
      SELECT 
        generate_series(date_debut::date, date_fin::date, '1 day'::interval)::date AS date_jour,
        nb_ressources
      FROM periodes_charge
      WHERE affaire_id = p_affaire_id
        AND site = UPPER(p_site)
        AND competence = p_competence
        AND nb_ressources > 0  -- Ignorer les périodes avec nb_ressources = 0
    ) AS jours_expands
    WHERE EXISTS (
      -- Filtrer uniquement les jours ouvrés (hors week-ends et fériés)
      SELECT 1 
      FROM calendrier c 
      WHERE c.date = jours_expands.date_jour 
        AND c.is_business_day = TRUE
    )
    GROUP BY date_jour
    ORDER BY date_jour;

    -- ÉTAPE 3: Supprimer toutes les périodes existantes pour cette combinaison
    DELETE FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site = UPPER(p_site)
      AND competence = p_competence;

    -- ÉTAPE 4: Regrouper les jours consécutifs avec la même charge
    -- On utilise ROW_NUMBER() avec une partition pour identifier les groupes consécutifs
    WITH jours_avec_groupe AS (
      SELECT 
        date_jour,
        nb_ressources,
        -- Créer un groupe pour chaque séquence consécutive avec même nb_ressources
        date_jour - ROW_NUMBER() OVER (
          PARTITION BY nb_ressources 
          ORDER BY date_jour
        )::integer AS groupe
      FROM temp_jours_charge
    ),
    periodes_groupes AS (
      SELECT 
        MIN(date_jour) AS date_debut,
        MAX(date_jour) AS date_fin,
        nb_ressources,
        groupe
      FROM jours_avec_groupe
      GROUP BY groupe, nb_ressources
    )
    -- ÉTAPE 5: Insérer les périodes consolidées avec calcul des jours ouvrés
    INSERT INTO periodes_charge (
      affaire_id,
      site,
      competence,
      date_debut,
      date_fin,
      nb_ressources,
      force_weekend_ferie,
      jours_ouvres
    )
    SELECT 
      p_affaire_id,
      UPPER(p_site),
      p_competence,
      pg.date_debut,
      pg.date_fin,
      pg.nb_ressources,
      FALSE AS force_weekend_ferie,  -- Toujours FALSE car on ne stocke que les jours ouvrés
      -- Calculer le nombre de jours ouvrés dans la période
      COALESCE((
        SELECT COUNT(*)
        FROM calendrier c
        WHERE c.date BETWEEN pg.date_debut AND pg.date_fin
          AND c.is_business_day = TRUE
      ), 0) AS jours_ouvres
    FROM periodes_groupes pg
    WHERE pg.nb_ressources > 0  -- Sécurité supplémentaire
    ORDER BY pg.date_debut;

    -- Nettoyer la table temporaire
    DROP TABLE IF EXISTS temp_jours_charge;

    -- Réinitialiser le flag de consolidation
    PERFORM set_config('app.consolidating', 'false', true);
    
  EXCEPTION
    WHEN OTHERS THEN
      -- En cas d'erreur, réinitialiser le flag et propager l'erreur
      PERFORM set_config('app.consolidating', 'false', true);
      RAISE;
  END;
END;
$$;

-- ============================================================================
-- FONCTION TRIGGER (appelée par les triggers)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_consolidate_periodes_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
BEGIN
  -- Protection contre la récursion
  IF current_setting('app.consolidating', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Récupérer les valeurs de la ligne modifiée
  IF TG_OP = 'DELETE' THEN
    v_affaire_id := OLD.affaire_id;
    v_site := OLD.site;
    v_competence := OLD.competence;
  ELSE
    -- Pour INSERT/UPDATE, vérifier si nb_ressources = 0 -> DELETE automatique
    IF NEW.nb_ressources <= 0 THEN
      -- Si nb_ressources = 0, déclencher la consolidation qui supprimera cette période
      -- car elle n'aura plus de jours ouvrés avec nb_ressources > 0
      v_affaire_id := NEW.affaire_id;
      v_site := NEW.site;
      v_competence := NEW.competence;
      -- La consolidation supprimera automatiquement cette période car nb_ressources = 0
      PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);
      -- Pour INSERT, retourner NULL pour annuler l'insertion
      -- Pour UPDATE, retourner NULL car la période sera supprimée par la consolidation
      RETURN NULL;
    END IF;
    
    v_affaire_id := NEW.affaire_id;
    v_site := NEW.site;
    v_competence := NEW.competence;
  END IF;

  -- Appeler la fonction de consolidation pour cette combinaison
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);

  -- Retourner la ligne appropriée selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- CRÉATION DU TRIGGER UNIQUE
-- ============================================================================

-- Trigger après INSERT
CREATE TRIGGER trigger_consolidate_periodes_charge_insert
  AFTER INSERT ON periodes_charge
  FOR EACH ROW
  WHEN (NEW.nb_ressources > 0)  -- Ne déclencher que si nb_ressources > 0
  EXECUTE FUNCTION trigger_consolidate_periodes_charge();

-- Trigger après UPDATE (seulement si les colonnes pertinentes changent)
CREATE TRIGGER trigger_consolidate_periodes_charge_update
  AFTER UPDATE ON periodes_charge
  FOR EACH ROW
  WHEN (
    OLD.date_debut IS DISTINCT FROM NEW.date_debut
    OR OLD.date_fin IS DISTINCT FROM NEW.date_fin
    OR OLD.nb_ressources IS DISTINCT FROM NEW.nb_ressources
    OR OLD.competence IS DISTINCT FROM NEW.competence
    OR OLD.site IS DISTINCT FROM NEW.site
    OR OLD.affaire_id IS DISTINCT FROM NEW.affaire_id
  )
  EXECUTE FUNCTION trigger_consolidate_periodes_charge();

-- Trigger après DELETE
CREATE TRIGGER trigger_consolidate_periodes_charge_delete
  AFTER DELETE ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_periodes_charge();

-- ============================================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ============================================================================
COMMENT ON FUNCTION consolidate_periodes_charge_for_competence(UUID, TEXT, TEXT) IS 
'Consolide toutes les périodes de charge pour une combinaison affaire/site/compétence.
Décompose les périodes en jours ouvrés uniquement (hors week-ends et fériés),
puis regroupe les jours consécutifs avec le même nombre de ressources.
Si une période a nb_ressources = 0, elle est automatiquement supprimée.';

COMMENT ON FUNCTION trigger_consolidate_periodes_charge() IS 
'Fonction trigger appelée automatiquement après INSERT/UPDATE/DELETE sur periodes_charge.
Déclenche la consolidation pour la combinaison affaire/site/compétence concernée.
Gère automatiquement la suppression des périodes avec nb_ressources = 0.';

-- ============================================================================
-- MODIFICATION DE LA CONTRAINTE CHECK
-- ============================================================================
-- Permettre nb_ressources = 0 pour déclencher la suppression automatique
-- ============================================================================

-- Supprimer l'ancienne contrainte CHECK qui exige nb_ressources > 0
ALTER TABLE periodes_charge DROP CONSTRAINT IF EXISTS periodes_charge_nb_ressources_check;

-- Créer une nouvelle contrainte qui permet nb_ressources >= 0
ALTER TABLE periodes_charge ADD CONSTRAINT periodes_charge_nb_ressources_check 
  CHECK (nb_ressources >= 0);

-- ============================================================================
-- MISE À JOUR DE LA FONCTION batch_insert_periodes_charge
-- ============================================================================
-- La fonction batch_insert_periodes_charge doit toujours désactiver les triggers
-- pour éviter les consolidations multiples, puis les réactiver à la fin
-- ============================================================================

-- La fonction batch_insert_periodes_charge existe déjà et désactive les triggers
-- On s'assure juste qu'elle fonctionne correctement avec le nouveau trigger
-- (pas de modification nécessaire car elle utilise DISABLE TRIGGER USER)

