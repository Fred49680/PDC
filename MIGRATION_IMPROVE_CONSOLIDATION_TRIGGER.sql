-- Migration: Améliorer le trigger de consolidation pour qu'il se déclenche plus souvent
-- Description: Le trigger consolide automatiquement après chaque INSERT, UPDATE, DELETE sur periodes_charge
-- et après chaque INSERT, UPDATE, DELETE sur affectations

-- Fonction de consolidation pour periodes_charge
CREATE OR REPLACE FUNCTION consolidate_periodes_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
BEGIN
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

  -- Appeler la fonction de consolidation pour cette combinaison affaire/site/compétence
  -- Utiliser pg_notify pour déclencher la consolidation de manière asynchrone
  PERFORM pg_notify('consolidate_periodes', json_build_object(
    'affaire_id', v_affaire_id,
    'site', v_site,
    'competence', v_competence
  )::text);

  -- Exécuter la consolidation immédiatement (synchrone)
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction de consolidation pour une compétence spécifique
-- Cette fonction regroupe les périodes consécutives avec la même charge
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID AS $$
DECLARE
  v_periodes_temp TABLE (
    date_jour DATE,
    nb_ressources NUMERIC,
    force_weekend_ferie BOOLEAN
  );
  v_periodes_consolidees RECORD;
  v_date_debut_periode DATE;
  v_date_fin_periode DATE;
  v_nb_ressources_periode NUMERIC;
  v_force_weekend_ferie_periode BOOLEAN;
  v_prev_date DATE;
  v_prev_nb_ressources NUMERIC;
  v_prev_force_weekend_ferie BOOLEAN;
BEGIN
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

  -- Supprimer les périodes existantes pour cette combinaison
  DELETE FROM periodes_charge
  WHERE affaire_id = p_affaire_id
    AND site = UPPER(p_site)
    AND competence = p_competence;

  -- Regrouper les jours consécutifs avec la même charge et force_weekend_ferie
  -- Utiliser une requête avec window functions pour identifier les groupes
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
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_insert ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_update ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_delete ON periodes_charge;

-- Créer les nouveaux triggers qui se déclenchent après chaque opération
CREATE TRIGGER trigger_consolidate_periodes_charge_insert
  AFTER INSERT ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_periodes_charge();

CREATE TRIGGER trigger_consolidate_periodes_charge_update
  AFTER UPDATE ON periodes_charge
  FOR EACH ROW
  WHEN (OLD.date_debut IS DISTINCT FROM NEW.date_debut
     OR OLD.date_fin IS DISTINCT FROM NEW.date_fin
     OR OLD.nb_ressources IS DISTINCT FROM NEW.nb_ressources
     OR OLD.competence IS DISTINCT FROM NEW.competence)
  EXECUTE FUNCTION consolidate_periodes_charge();

CREATE TRIGGER trigger_consolidate_periodes_charge_delete
  AFTER DELETE ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_periodes_charge();

-- Fonction pour déclencher la consolidation manuellement (appelée depuis le frontend)
CREATE OR REPLACE FUNCTION trigger_consolidation_periodes_charge(
  p_affaire_id TEXT,
  p_site TEXT
)
RETURNS VOID AS $$
DECLARE
  v_affaire_uuid UUID;
  v_competence TEXT;
BEGIN
  -- Récupérer l'UUID de l'affaire
  SELECT id INTO v_affaire_uuid
  FROM affaires
  WHERE affaire_id = p_affaire_id
    AND site = UPPER(p_site)
  LIMIT 1;

  IF v_affaire_uuid IS NULL THEN
    RAISE EXCEPTION 'Affaire % / % introuvable', p_affaire_id, p_site;
  END IF;

  -- Consolider pour chaque compétence
  FOR v_competence IN
    SELECT DISTINCT competence
    FROM periodes_charge
    WHERE affaire_id = v_affaire_uuid
      AND site = UPPER(p_site)
  LOOP
    PERFORM consolidate_periodes_charge_for_competence(v_affaire_uuid, p_site, v_competence);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

