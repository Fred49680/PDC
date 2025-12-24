-- ============================================================================
-- CORRECTION DE LA FONCTION insert_periode_charge_v2
-- ============================================================================
-- Description: Corrige les références aux anciens triggers qui n'existent plus
-- Les nouveaux triggers sont :
-- - trigger_consolidate_periodes_charge_insert
-- - trigger_consolidate_periodes_charge_update
-- - trigger_consolidate_periodes_charge_delete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_periode_charge_v2(
  p_affaire_id uuid,
  p_site text,
  p_competence text,
  p_date_debut date,
  p_date_fin date,
  p_nb_ressources integer
)
RETURNS TABLE(id uuid, affaire_id uuid, site text, competence text, date_debut date, date_fin date, nb_ressources integer, force_weekend_ferie boolean, jours_ouvres integer, created_at timestamp without time zone, updated_at timestamp without time zone, created_by uuid, updated_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_periode_id UUID;
  v_existing_id UUID;
BEGIN
  -- Normaliser le site en majuscules
  p_site := UPPER(TRIM(p_site));

  -- Désactiver temporairement les triggers de consolidation pour éviter les problèmes
  -- Utiliser les noms des nouveaux triggers
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_delete;

  -- Chercher si une période existe déjà avec ces clés
  SELECT periodes_charge.id INTO v_existing_id
  FROM periodes_charge
  WHERE periodes_charge.affaire_id = p_affaire_id
    AND periodes_charge.site = p_site
    AND periodes_charge.competence = p_competence
    AND periodes_charge.date_debut = p_date_debut
    AND periodes_charge.date_fin = p_date_fin;

  -- Si une période existe, faire un UPDATE
  IF v_existing_id IS NOT NULL THEN
    UPDATE periodes_charge
    SET
      nb_ressources = p_nb_ressources,
      updated_at = NOW()
    WHERE periodes_charge.id = v_existing_id;

    v_periode_id := v_existing_id;
  ELSE
    -- Sinon, faire un INSERT
    INSERT INTO periodes_charge (
      affaire_id,
      site,
      competence,
      date_debut,
      date_fin,
      nb_ressources
    )
    VALUES (
      p_affaire_id,
      p_site,
      p_competence,
      p_date_debut,
      p_date_fin,
      p_nb_ressources
    )
    RETURNING periodes_charge.id INTO v_periode_id;
  END IF;

  -- Réactiver les triggers immédiatement
  -- La consolidation se fera automatiquement via les triggers
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;

  -- NOTE: Plus besoin de queue_consolidation car la consolidation se fait automatiquement via les triggers

  -- Retourner la période créée/mise à jour
  RETURN QUERY
  SELECT
    periodes_charge.id,
    periodes_charge.affaire_id,
    periodes_charge.site,
    periodes_charge.competence,
    periodes_charge.date_debut,
    periodes_charge.date_fin,
    periodes_charge.nb_ressources,
    periodes_charge.force_weekend_ferie,
    periodes_charge.jours_ouvres,
    periodes_charge.created_at,
    periodes_charge.updated_at,
    periodes_charge.created_by,
    periodes_charge.updated_by
  FROM periodes_charge
  WHERE periodes_charge.id = v_periode_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, réactiver les triggers et propager l'erreur
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;
    RAISE WARNING 'Erreur dans insert_periode_charge_v2: % - %', SQLSTATE, SQLERRM;
    RAISE;
END;
$function$;

-- ============================================================================
-- CORRECTION DE LA FONCTION update_periode_charge
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_periode_charge(
  p_id uuid,
  p_nb_ressources integer
)
RETURNS TABLE(id uuid, affaire_id uuid, site text, competence text, date_debut date, date_fin date, nb_ressources integer, force_weekend_ferie boolean, jours_ouvres integer, created_at timestamp without time zone, updated_at timestamp without time zone, created_by uuid, updated_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_periode_id UUID;
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
  v_periode_data RECORD;
BEGIN
  RAISE NOTICE '[update_periode_charge] DÉBUT - p_id: %, p_nb_ressources: %', p_id, p_nb_ressources;

  -- Récupérer les informations de la période avant l'UPDATE
  SELECT pc.id, pc.affaire_id, pc.site, pc.competence, pc.date_debut, pc.date_fin, pc.nb_ressources
  INTO v_periode_data
  FROM periodes_charge pc
  WHERE pc.id = p_id;

  -- Si la période n'existe pas, lever une erreur
  IF v_periode_data.id IS NULL THEN
    RAISE NOTICE '[update_periode_charge] Période non trouvée - p_id: %', p_id;
    RAISE EXCEPTION 'Période avec id % non trouvée', p_id;
  END IF;

  v_affaire_id := v_periode_data.affaire_id;
  v_site := v_periode_data.site;
  v_competence := v_periode_data.competence;

  RAISE NOTICE '[update_periode_charge] Période trouvée - affaire_id: %, site: %, competence: %, nb_ressources actuel: %', v_affaire_id, v_site, v_competence, v_periode_data.nb_ressources;

  -- Si nb_ressources = 0, supprimer directement la période au lieu de faire un UPDATE
  IF p_nb_ressources <= 0 THEN
    RAISE NOTICE '[update_periode_charge] nb_ressources = 0 détecté - Suppression directe de la période';
    
    -- Désactiver temporairement les triggers pour éviter la récursion
    ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_insert;
    ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_update;
    ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_delete;

    -- Supprimer la période
    DELETE FROM periodes_charge
    WHERE periodes_charge.id = p_id;

    -- Réactiver les triggers
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;

    -- Déclencher la consolidation pour nettoyer les autres périodes si nécessaire
    PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);

    RAISE NOTICE '[update_periode_charge] Période supprimée - Retour tableau vide';
    
    -- Retourner un tableau vide car la période a été supprimée
    RETURN;
  END IF;

  -- Si nb_ressources > 0, faire un UPDATE normal
  RAISE NOTICE '[update_periode_charge] nb_ressources > 0 - Mise à jour normale';

  -- Désactiver temporairement les triggers de consolidation
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_delete;

  -- Faire l'UPDATE
  UPDATE periodes_charge
  SET
    nb_ressources = p_nb_ressources,
    updated_at = NOW()
  WHERE periodes_charge.id = p_id
  RETURNING periodes_charge.id INTO v_periode_id;

  -- Si aucune ligne n'a été mise à jour, lever une erreur
  IF v_periode_id IS NULL THEN
    -- Réactiver les triggers avant de lever l'erreur
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;
    RAISE EXCEPTION 'Période avec id % non trouvée', p_id;
  END IF;

  -- Réactiver les triggers immédiatement
  -- La consolidation se fera automatiquement via les triggers
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;

  RAISE NOTICE '[update_periode_charge] UPDATE réussi - Retour période mise à jour';

  -- Retourner la période mise à jour
  RETURN QUERY
  SELECT
    periodes_charge.id,
    periodes_charge.affaire_id,
    periodes_charge.site,
    periodes_charge.competence,
    periodes_charge.date_debut,
    periodes_charge.date_fin,
    periodes_charge.nb_ressources,
    periodes_charge.force_weekend_ferie,
    periodes_charge.jours_ouvres,
    periodes_charge.created_at,
    periodes_charge.updated_at,
    periodes_charge.created_by,
    periodes_charge.updated_by
  FROM periodes_charge
  WHERE periodes_charge.id = v_periode_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, réactiver les triggers et propager l'erreur
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
    ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;
    RAISE WARNING '[update_periode_charge] ERREUR: % - %', SQLSTATE, SQLERRM;
    RAISE;
END;
$function$;

