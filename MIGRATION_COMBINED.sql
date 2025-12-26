-- Migration combinée: Fix Boolean + Disable Triggers Batch
-- Générée automatiquement le 2025-12-21T21:23:56.267Z

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



-- Migration: Fonctions pour désactiver/réactiver les triggers de consolidation
-- Description: Permet de désactiver temporairement les triggers pendant les opérations en lot,
-- puis de les réactiver et consolider une seule fois à la fin

-- Fonction pour désactiver les triggers de consolidation
CREATE OR REPLACE FUNCTION disable_consolidation_triggers()
RETURNS VOID AS $$
BEGIN
  -- Désactiver les triggers en utilisant ALTER TABLE ... DISABLE TRIGGER
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_delete;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réactiver les triggers de consolidation
CREATE OR REPLACE FUNCTION enable_consolidation_triggers()
RETURNS VOID AS $$
BEGIN
  -- Réactiver les triggers
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour consolider toutes les périodes d'une affaire/site après un batch
-- Cette fonction consolide toutes les compétences pour une affaire/site donnée
CREATE OR REPLACE FUNCTION consolidate_periodes_after_batch(
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

-- Fonction RPC pour effectuer un batch insert avec désactivation des triggers
-- Cette fonction prend un tableau JSON de périodes et les insère toutes en une seule transaction
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
      
      -- Normaliser force_weekend_ferie : s'assurer que c'est toujours un boolean strict
      v_force_weekend_ferie := COALESCE(
        CASE 
          WHEN v_periode->>'force_weekend_ferie' IS NULL THEN FALSE
          WHEN v_periode->>'force_weekend_ferie' = '' THEN FALSE
          WHEN v_periode->>'force_weekend_ferie' IN ('true', 't', '1') THEN TRUE
          WHEN v_periode->>'force_weekend_ferie' IN ('false', 'f', '0') THEN FALSE
          ELSE (v_periode->>'force_weekend_ferie')::boolean
        END,
        FALSE
      );

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

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION disable_consolidation_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION enable_consolidation_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION consolidate_periodes_after_batch(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_insert_periodes_charge(JSONB, TEXT, TEXT) TO authenticated;


