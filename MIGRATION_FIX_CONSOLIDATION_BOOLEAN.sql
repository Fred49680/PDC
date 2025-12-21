-- Migration: Fix consolidation boolean - Sécuriser la conversion boolean dans les fonctions de consolidation
-- Description: Le problème vient du fait que force_weekend_ferie::boolean peut lever une exception
-- si la valeur est invalide, même dans un CASE/COALESCE. On doit utiliser une approche plus sûre.

-- Fonction helper pour convertir en boolean de manière sûre
CREATE OR REPLACE FUNCTION safe_bool_cast(value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Si NULL ou vide, retourner FALSE
  IF value IS NULL OR value = '' OR trim(value) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Convertir en lowercase pour la comparaison
  value := lower(trim(value));
  
  -- Tester les valeurs vraies
  IF value IN ('true', 't', '1', 'yes', 'y', 'on') THEN
    RETURN TRUE;
  END IF;
  
  -- Tester les valeurs fausses
  IF value IN ('false', 'f', '0', 'no', 'n', 'off', '') THEN
    RETURN FALSE;
  END IF;
  
  -- Par défaut, FALSE
  RETURN FALSE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mettre à jour la fonction de consolidation pour utiliser safe_bool_cast
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID AS $$
DECLARE
  v_periodes_consolidees RECORD;
BEGIN
  -- Vérifier si on est déjà en train de consolider pour éviter la récursion
  IF current_setting('app.consolidating', true) = 'true' THEN
    RETURN;
  END IF;

  -- Marquer qu'on est en train de consolider
  PERFORM set_config('app.consolidating', 'true', true);

  BEGIN
    -- Créer une table temporaire pour stocker les jours avec leurs charges
    CREATE TEMP TABLE IF NOT EXISTS temp_periodes_consolidation (
      date_jour DATE,
      nb_ressources NUMERIC,
      force_weekend_ferie BOOLEAN
    ) ON COMMIT DROP;

    -- Récupérer toutes les périodes et les décomposer en jours
    -- IMPORTANT : Normaliser force_weekend_ferie lors de la lecture pour éviter les valeurs invalides
    INSERT INTO temp_periodes_consolidation (date_jour, nb_ressources, force_weekend_ferie)
    SELECT 
      generate_series(date_debut::date, date_fin::date, '1 day'::interval)::date AS date_jour,
      nb_ressources,
      -- Normalisation robuste : utiliser safe_bool_cast pour éviter les exceptions
      CASE 
        WHEN force_weekend_ferie IS NULL THEN FALSE
        WHEN force_weekend_ferie::text IS NULL OR force_weekend_ferie::text = '' THEN FALSE
        ELSE safe_bool_cast(force_weekend_ferie::text)
      END AS force_weekend_ferie
    FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site = UPPER(p_site)
      AND competence = p_competence;

    -- Supprimer les périodes existantes pour cette combinaison
    DELETE FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site = UPPER(p_site)
      AND competence = p_competence;

    -- Regrouper les jours consécutifs avec la même charge et force_weekend_ferie
    WITH periodes_grouped AS (
      SELECT 
        date_jour,
        nb_ressources,
        force_weekend_ferie,
        date_jour - ROW_NUMBER() OVER (PARTITION BY nb_ressources, force_weekend_ferie ORDER BY date_jour)::integer AS grp
      FROM temp_periodes_consolidation
    ),
    periodes_consolidees AS (
      SELECT 
        MIN(date_jour) AS date_debut,
        MAX(date_jour) AS date_fin,
        nb_ressources,
        force_weekend_ferie
      FROM periodes_grouped
      GROUP BY grp, nb_ressources, force_weekend_ferie
    )
    INSERT INTO periodes_charge (affaire_id, site, competence, date_debut, date_fin, nb_ressources, force_weekend_ferie)
    SELECT 
      p_affaire_id,
      UPPER(p_site),
      p_competence,
      date_debut,
      date_fin,
      nb_ressources,
      -- Garantir que c'est toujours un booléen strict (déjà booléen depuis temp table, mais on force pour être sûr)
      COALESCE(force_weekend_ferie, FALSE) AS force_weekend_ferie
    FROM periodes_consolidees
    ORDER BY date_debut;

    -- Nettoyer la table temporaire
    DROP TABLE IF EXISTS temp_periodes_consolidation;

    -- Réinitialiser le flag de consolidation
    PERFORM set_config('app.consolidating', 'false', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- En cas d'erreur, réinitialiser le flag de consolidation
      PERFORM set_config('app.consolidating', 'false', true);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour batch_insert_periodes_charge pour utiliser safe_bool_cast aussi
CREATE OR REPLACE FUNCTION batch_insert_periodes_charge(
  p_periodes JSONB,
  p_affaire_id TEXT,
  p_site TEXT
)
RETURNS VOID AS $$
DECLARE
  v_affaire_uuid UUID;
  v_periode JSONB;
  v_date_debut DATE;
  v_date_fin DATE;
  v_force_weekend_ferie BOOLEAN;
BEGIN
  -- Récupérer l'UUID de l'affaire
  SELECT id INTO v_affaire_uuid
  FROM affaires
  WHERE affaires.affaire_id = p_affaire_id
    AND affaires.site = UPPER(p_site)
  LIMIT 1;

  IF v_affaire_uuid IS NULL THEN
    RAISE EXCEPTION 'Affaire % / % introuvable', p_affaire_id, p_site;
  END IF;

  -- Désactiver les triggers
  PERFORM disable_consolidation_triggers();

  BEGIN
    -- Insérer toutes les périodes
    FOR v_periode IN SELECT * FROM jsonb_array_elements(p_periodes)
    LOOP
      -- Normaliser les dates
      v_date_debut := (v_periode->>'date_debut')::date;
      v_date_fin := (v_periode->>'date_fin')::date;
      
      -- Normaliser force_weekend_ferie : utiliser safe_bool_cast pour éviter les exceptions
      v_force_weekend_ferie := safe_bool_cast(v_periode->>'force_weekend_ferie');

      -- Insérer ou mettre à jour la période
      INSERT INTO periodes_charge (
        affaire_id,
        site,
        competence,
        date_debut,
        date_fin,
        nb_ressources,
        force_weekend_ferie
      )
      VALUES (
        v_affaire_uuid,
        UPPER(p_site),
        v_periode->>'competence',
        v_date_debut,
        v_date_fin,
        (v_periode->>'nb_ressources')::numeric,
        v_force_weekend_ferie
      )
      ON CONFLICT (affaire_id, site, competence, date_debut, date_fin)
      DO UPDATE SET
        nb_ressources = EXCLUDED.nb_ressources,
        force_weekend_ferie = EXCLUDED.force_weekend_ferie,
        updated_at = NOW();
    END LOOP;

    -- Réactiver les triggers
    PERFORM enable_consolidation_triggers();

    -- Consolider toutes les compétences pour cette affaire/site
    PERFORM consolidate_periodes_after_batch(p_affaire_id, p_site);

  EXCEPTION
    WHEN OTHERS THEN
      -- En cas d'erreur, réactiver les triggers avant de propager l'erreur
      PERFORM enable_consolidation_triggers();
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION safe_bool_cast(TEXT) TO authenticated;
