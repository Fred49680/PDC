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

