-- Migration: Fix récursion infinie dans la consolidation
-- Description: Évite la récursion infinie en désactivant temporairement les triggers
-- et en utilisant une variable de session pour détecter les appels récursifs

-- Fonction de consolidation pour une compétence spécifique (corrigée)
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID AS $$
DECLARE
  v_periodes_consolidees RECORD;
BEGIN
  -- Désactiver temporairement les triggers pour éviter la récursion
  SET LOCAL session_replication_role = 'replica';
  
  -- Créer une table temporaire pour stocker les jours avec leurs charges
  CREATE TEMP TABLE IF NOT EXISTS temp_periodes_consolidation (
    date_jour DATE,
    nb_ressources NUMERIC,
    force_weekend_ferie BOOLEAN
  ) ON COMMIT DROP;

  -- Récupérer toutes les périodes et les décomposer en jours
  INSERT INTO temp_periodes_consolidation (date_jour, nb_ressources, force_weekend_ferie)
  SELECT 
    generate_series(date_debut::date, date_fin::date, '1 day'::interval)::date AS date_jour,
    nb_ressources,
    force_weekend_ferie
  FROM periodes_charge
  WHERE affaire_id = p_affaire_id
    AND site = UPPER(p_site)
    AND competence = p_competence;

  -- Supprimer les périodes existantes pour cette combinaison (ne déclenchera pas le trigger)
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
    force_weekend_ferie
  FROM periodes_consolidees
  ORDER BY date_debut;

  -- Nettoyer la table temporaire
  DROP TABLE IF EXISTS temp_periodes_consolidation;
  
  -- Réactiver les triggers (automatique à la fin de la transaction)
  RESET session_replication_role;
END;
$$ LANGUAGE plpgsql;

-- Modifier le trigger pour qu'il ne se déclenche que si on n'est pas déjà en train de consolider
CREATE OR REPLACE FUNCTION consolidate_periodes_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
  v_is_consolidating BOOLEAN;
BEGIN
  -- Vérifier si on est déjà en train de consolider (évite la récursion)
  SELECT COALESCE(current_setting('app.consolidating', true)::boolean, false) INTO v_is_consolidating;
  
  IF v_is_consolidating THEN
    -- Si on est déjà en train de consolider, ne rien faire
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Marquer qu'on est en train de consolider
  PERFORM set_config('app.consolidating', 'true', true);
  
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

  -- Exécuter la consolidation
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);
  
  -- Réinitialiser le flag
  PERFORM set_config('app.consolidating', 'false', true);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, réinitialiser le flag
    PERFORM set_config('app.consolidating', 'false', true);
    RAISE;
END;
$$ LANGUAGE plpgsql;

