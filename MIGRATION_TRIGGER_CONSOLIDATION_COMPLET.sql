-- ============================================================================
-- TRIGGER DE CONSOLIDATION COMPLET POUR PERIODES_CHARGE
-- ============================================================================
-- Description: Consolide automatiquement les périodes de charge qui se 
-- chevauchent ou sont adjacentes avec la même charge et force_weekend_ferie
--
-- Fonctionnement:
-- 1. Décompose chaque période en jours individuels
-- 2. Regroupe les jours consécutifs avec la même charge et force_weekend_ferie
-- 3. Reconstruit les périodes consolidées
-- 4. Calcule le nombre de jours ouvrés pour chaque période
-- ============================================================================

-- Supprimer les anciens triggers et fonctions
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_insert ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_update ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_delete ON periodes_charge;
DROP FUNCTION IF EXISTS consolidate_periodes_charge() CASCADE;
DROP FUNCTION IF EXISTS consolidate_periodes_charge_for_competence(UUID, TEXT, TEXT) CASCADE;

-- ============================================================================
-- FONCTION PRINCIPALE DE CONSOLIDATION
-- ============================================================================
-- Cette fonction consolide toutes les périodes pour une combinaison
-- affaire/site/compétence donnée
-- ============================================================================
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID AS $$
DECLARE
  v_periode_consolidee RECORD;
BEGIN
  -- Protection contre la récursion infinie
  IF current_setting('app.consolidating', true) = 'true' THEN
    RETURN;
  END IF;

  -- Marquer qu'on est en train de consolider
  PERFORM set_config('app.consolidating', 'true', true);

  BEGIN
    -- ÉTAPE 1: Créer une table temporaire pour stocker les jours avec leurs charges
    CREATE TEMP TABLE IF NOT EXISTS temp_jours_charge (
      date_jour DATE,
      nb_ressources INTEGER,
      force_weekend_ferie BOOLEAN
    ) ON COMMIT DROP;

    -- ÉTAPE 2: Décomposer toutes les périodes existantes en jours individuels
    -- On prend la charge maximale pour chaque jour (au cas où il y aurait chevauchement)
    -- Pour force_weekend_ferie, on utilise BOOL_OR (TRUE si au moins une période est TRUE)
    INSERT INTO temp_jours_charge (date_jour, nb_ressources, force_weekend_ferie)
    SELECT 
      date_jour::DATE,
      MAX(nb_ressources)::INTEGER AS nb_ressources,
      BOOL_OR(COALESCE(force_weekend_ferie, FALSE)) AS force_weekend_ferie
    FROM (
      SELECT 
        generate_series(date_debut::date, date_fin::date, '1 day'::interval)::date AS date_jour,
        nb_ressources,
        COALESCE(force_weekend_ferie, FALSE) AS force_weekend_ferie
      FROM periodes_charge
      WHERE affaire_id = p_affaire_id
        AND site = UPPER(p_site)
        AND competence = p_competence
    ) AS jours_expands
    GROUP BY date_jour
    ORDER BY date_jour;

    -- ÉTAPE 3: Supprimer toutes les périodes existantes pour cette combinaison
    DELETE FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site = UPPER(p_site)
      AND competence = p_competence;

    -- ÉTAPE 4: Regrouper les jours consécutifs avec la même charge et force_weekend_ferie
    -- On utilise ROW_NUMBER() avec une partition pour identifier les groupes consécutifs
    WITH jours_avec_groupe AS (
      SELECT 
        date_jour,
        nb_ressources,
        force_weekend_ferie,
        -- Créer un groupe pour chaque séquence consécutive avec mêmes valeurs
        date_jour - ROW_NUMBER() OVER (
          PARTITION BY nb_ressources, force_weekend_ferie 
          ORDER BY date_jour
        )::integer AS groupe
      FROM temp_jours_charge
    ),
    periodes_groupes AS (
      SELECT 
        MIN(date_jour) AS date_debut,
        MAX(date_jour) AS date_fin,
        nb_ressources,
        force_weekend_ferie,
        groupe
      FROM jours_avec_groupe
      GROUP BY groupe, nb_ressources, force_weekend_ferie
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
      COALESCE(pg.force_weekend_ferie, FALSE),
      -- Calculer le nombre de jours ouvrés en utilisant la table calendrier
      CASE 
        WHEN COALESCE(pg.force_weekend_ferie, FALSE) = TRUE THEN
          -- Si force_weekend_ferie = TRUE, compter tous les jours (y compris week-ends/fériés)
          (pg.date_fin - pg.date_debut)::INTEGER + 1
        ELSE
          -- Sinon, compter uniquement les jours ouvrés depuis le calendrier
          COALESCE((
            SELECT COUNT(*)
            FROM calendrier c
            WHERE c.date BETWEEN pg.date_debut AND pg.date_fin
              AND c.is_business_day = TRUE
          ), 0)
      END AS jours_ouvres
    FROM periodes_groupes pg
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FONCTION TRIGGER (appelée par les triggers)
-- ============================================================================
CREATE OR REPLACE FUNCTION consolidate_periodes_charge()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRÉATION DES TRIGGERS
-- ============================================================================

-- Trigger après INSERT
CREATE TRIGGER trigger_consolidate_periodes_charge_insert
  AFTER INSERT ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_periodes_charge();

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
    OR OLD.force_weekend_ferie IS DISTINCT FROM NEW.force_weekend_ferie
  )
  EXECUTE FUNCTION consolidate_periodes_charge();

-- Trigger après DELETE
CREATE TRIGGER trigger_consolidate_periodes_charge_delete
  AFTER DELETE ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_periodes_charge();

-- ============================================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ============================================================================
COMMENT ON FUNCTION consolidate_periodes_charge_for_competence(UUID, TEXT, TEXT) IS 
'Consolide toutes les périodes de charge pour une combinaison affaire/site/compétence. 
Fusionne les périodes qui se chevauchent ou sont adjacentes avec la même charge et force_weekend_ferie.';

COMMENT ON FUNCTION consolidate_periodes_charge() IS 
'Fonction trigger appelée automatiquement après INSERT/UPDATE/DELETE sur periodes_charge. 
Déclenche la consolidation pour la combinaison affaire/site/compétence concernée.';

