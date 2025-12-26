-- ============================================================================
-- CORRECTION DU TRIGGER POUR GÉRER nb_ressources = 0 AVEC LOGS
-- ============================================================================
-- Description: Corrige le trigger pour supprimer directement la période
-- si nb_ressources = 0 au lieu de retourner NULL (qui n'annule pas l'UPDATE)
-- Ajoute des logs pour le débogage
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
  -- Logs pour débogage
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Déclenché - Opération: %, ID: %', TG_OP, COALESCE(NEW.id::text, OLD.id::text, 'N/A');
  
  -- Protection contre la récursion
  IF current_setting('app.consolidating', true) = 'true' THEN
    RAISE NOTICE '[trigger_consolidate_periodes_charge] Consolidation déjà en cours, retour immédiat';
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
    RAISE NOTICE '[trigger_consolidate_periodes_charge] DELETE - affaire_id: %, site: %, competence: %', v_affaire_id, v_site, v_competence;
  ELSE
    -- Pour INSERT/UPDATE, vérifier si nb_ressources = 0 -> DELETE automatique
    IF NEW.nb_ressources <= 0 THEN
      RAISE NOTICE '[trigger_consolidate_periodes_charge] nb_ressources = 0 détecté - Opération: %', TG_OP;
      
      v_affaire_id := NEW.affaire_id;
      v_site := NEW.site;
      v_competence := NEW.competence;
      
      RAISE NOTICE '[trigger_consolidate_periodes_charge] Suppression de la période avec nb_ressources = 0 - affaire_id: %, site: %, competence: %', v_affaire_id, v_site, v_competence;
      
      -- Pour INSERT, retourner NULL pour annuler l'insertion
      IF TG_OP = 'INSERT' THEN
        RAISE NOTICE '[trigger_consolidate_periodes_charge] INSERT annulé (nb_ressources = 0)';
        RETURN NULL;
      END IF;
      
      -- Pour UPDATE, supprimer directement la période
      -- On ne peut pas faire DELETE dans un trigger AFTER, donc on déclenche la consolidation
      -- qui supprimera automatiquement cette période car nb_ressources = 0
      RAISE NOTICE '[trigger_consolidate_periodes_charge] UPDATE avec nb_ressources = 0 - déclenchement consolidation pour suppression';
      PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);
      
      -- Retourner NULL pour indiquer que la ligne a été supprimée
      -- Mais attention : dans un trigger AFTER, retourner NULL ne supprime pas la ligne
      -- La consolidation a déjà supprimé la période, donc on retourne NULL
      RETURN NULL;
    END IF;
    
    v_affaire_id := NEW.affaire_id;
    v_site := NEW.site;
    v_competence := NEW.competence;
    RAISE NOTICE '[trigger_consolidate_periodes_charge] % - affaire_id: %, site: %, competence: %, nb_ressources: %', TG_OP, v_affaire_id, v_site, v_competence, NEW.nb_ressources;
  END IF;

  -- Appeler la fonction de consolidation pour cette combinaison
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Appel consolidation - affaire_id: %, site: %, competence: %', v_affaire_id, v_site, v_competence;
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Consolidation terminée';

  -- Retourner la ligne appropriée selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[trigger_consolidate_periodes_charge] ERREUR: % - %', SQLSTATE, SQLERRM;
    RAISE;
END;
$$;

-- Ajouter des logs dans la fonction de consolidation
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
  v_nb_jours_ouvres INTEGER;
BEGIN
  RAISE NOTICE '[consolidate_periodes_charge_for_competence] DÉBUT - affaire_id: %, site: %, competence: %', p_affaire_id, p_site, p_competence;
  
  -- Protection contre la récursion infinie
  IF current_setting('app.consolidating', true) = 'true' THEN
    RAISE NOTICE '[consolidate_periodes_charge_for_competence] Consolidation déjà en cours, retour immédiat';
    RETURN;
  END IF;

  -- Marquer qu'on est en train de consolider
  PERFORM set_config('app.consolidating', 'true', true);

  BEGIN
    -- ÉTAPE 1: Créer une table temporaire pour stocker les jours avec leurs charges
    CREATE TEMP TABLE IF NOT EXISTS temp_jours_charge (
      date_jour DATE,
      nb_ressources INTEGER
    ) ON COMMIT DROP;

    -- ÉTAPE 2: Décomposer toutes les périodes existantes en jours individuels
    -- UNIQUEMENT les jours ouvrés (is_business_day = TRUE)
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

    -- Log du nombre de jours ouvrés trouvés
    SELECT COUNT(*) INTO v_nb_jours_ouvres FROM temp_jours_charge;
    RAISE NOTICE '[consolidate_periodes_charge_for_competence] Nombre de jours ouvrés trouvés: %', v_nb_jours_ouvres;

    -- ÉTAPE 3: Supprimer toutes les périodes existantes pour cette combinaison
    DELETE FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site = UPPER(p_site)
      AND competence = p_competence;
    
    RAISE NOTICE '[consolidate_periodes_charge_for_competence] Anciennes périodes supprimées';

    -- ÉTAPE 4: Regrouper les jours consécutifs avec la même charge
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
      FALSE AS force_weekend_ferie,
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

    -- Log du nombre de périodes créées
    GET DIAGNOSTICS v_nb_jours_ouvres = ROW_COUNT;
    RAISE NOTICE '[consolidate_periodes_charge_for_competence] Nombre de périodes créées: %', v_nb_jours_ouvres;

    -- Nettoyer la table temporaire
    DROP TABLE IF EXISTS temp_jours_charge;

    -- Réinitialiser le flag de consolidation
    PERFORM set_config('app.consolidating', 'false', true);
    
    RAISE NOTICE '[consolidate_periodes_charge_for_competence] FIN - Consolidation terminée avec succès';
    
  EXCEPTION
    WHEN OTHERS THEN
      -- En cas d'erreur, réinitialiser le flag et propager l'erreur
      PERFORM set_config('app.consolidating', 'false', true);
      RAISE WARNING '[consolidate_periodes_charge_for_competence] ERREUR: % - %', SQLSTATE, SQLERRM;
      RAISE;
  END;
END;
$$;

