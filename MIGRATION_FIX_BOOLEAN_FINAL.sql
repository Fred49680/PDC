-- Migration: Fix final pour l'erreur 'invalid input syntax for type boolean: ""'
-- Description: Nettoie les données existantes, ajoute une contrainte CHECK, et met à jour la fonction de consolidation
-- pour normaliser force_weekend_ferie à la fois lors de la lecture ET de l'insertion

-- Étape 1: Nettoyer TOUTES les données existantes avec des valeurs invalides
-- Mettre à jour toutes les valeurs NULL, chaînes vides, ou valeurs invalides en FALSE
UPDATE periodes_charge
SET force_weekend_ferie = FALSE
WHERE force_weekend_ferie IS NULL 
   OR (force_weekend_ferie::text NOT IN ('true', 'false', 't', 'f', '1', '0'));

-- Étape 2: Ajouter une contrainte CHECK pour empêcher les valeurs invalides à l'avenir
-- Cette contrainte garantit que force_weekend_ferie est toujours un booléen valide (non NULL)
-- PostgreSQL garantit déjà qu'un booléen non NULL est valide, donc on vérifie juste qu'il n'est pas NULL
ALTER TABLE periodes_charge
DROP CONSTRAINT IF EXISTS check_force_weekend_ferie_boolean;

ALTER TABLE periodes_charge
ADD CONSTRAINT check_force_weekend_ferie_boolean
CHECK (force_weekend_ferie IS NOT NULL);

-- Étape 3: Mettre à jour la fonction de consolidation pour normaliser force_weekend_ferie
-- à la fois lors de la lecture depuis la base ET lors de l'insertion
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
      -- Normalisation robuste : convertir toute valeur invalide en FALSE
      CASE 
        WHEN force_weekend_ferie IS NULL THEN FALSE
        WHEN force_weekend_ferie::text = '' THEN FALSE
        WHEN force_weekend_ferie::text IN ('true', 't', '1') THEN TRUE
        WHEN force_weekend_ferie::text IN ('false', 'f', '0') THEN FALSE
        ELSE COALESCE(force_weekend_ferie::boolean, FALSE)
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
      -- Double normalisation lors de l'insertion : s'assurer que c'est toujours un booléen strict
      CASE 
        WHEN force_weekend_ferie IS NULL THEN FALSE
        WHEN force_weekend_ferie::text = '' THEN FALSE
        WHEN force_weekend_ferie::text IN ('true', 't', '1') THEN TRUE
        WHEN force_weekend_ferie::text IN ('false', 'f', '0') THEN FALSE
        ELSE COALESCE(force_weekend_ferie::boolean, FALSE)
      END AS force_weekend_ferie
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

-- Étape 4: Mettre à jour la fonction trigger pour utiliser la protection contre la récursion
CREATE OR REPLACE FUNCTION consolidate_periodes_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
BEGIN
  -- Vérifier si on est déjà en train de consolider pour éviter la récursion
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

  -- Appeler la fonction de consolidation pour cette combinaison affaire/site/compétence
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Vérifier que les triggers existent et sont correctement configurés
-- (Les triggers devraient déjà exister, mais on les recrée pour être sûr)
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_insert ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_update ON periodes_charge;
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_delete ON periodes_charge;

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
     OR OLD.competence IS DISTINCT FROM NEW.competence
     OR OLD.force_weekend_ferie IS DISTINCT FROM NEW.force_weekend_ferie)
  EXECUTE FUNCTION consolidate_periodes_charge();

CREATE TRIGGER trigger_consolidate_periodes_charge_delete
  AFTER DELETE ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_periodes_charge();

