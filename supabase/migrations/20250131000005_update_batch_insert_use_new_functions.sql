-- ============================================================================
-- MISE À JOUR DE batch_insert_periodes_charge POUR UTILISER LES NOUVELLES FONCTIONS
-- ============================================================================
-- Description: Utilise disable_consolidation_triggers() et enable_consolidation_triggers()
-- et déclenche la consolidation manuelle à la fin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.batch_insert_periodes_charge(
  p_periodes jsonb,
  p_affaire_id text,
  p_site text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_affaire_uuid UUID;
  v_site_normalized TEXT;
  v_periode jsonb;
  v_competence TEXT;
  v_date_debut DATE;
  v_date_fin DATE;
  v_nb_ressources INTEGER;
BEGIN
  -- Normaliser le site en majuscules
  v_site_normalized := UPPER(TRIM(p_site));
  
  -- Récupérer l'UUID de l'affaire depuis le numéro de compte
  SELECT id INTO v_affaire_uuid
  FROM affaires
  WHERE affaire_id = p_affaire_id
    AND site = v_site_normalized;
  
  IF v_affaire_uuid IS NULL THEN
    RAISE EXCEPTION 'Affaire % / % introuvable', p_affaire_id, v_site_normalized;
  END IF;
  
  -- Désactiver les triggers de consolidation pour éviter les consolidations multiples
  PERFORM disable_consolidation_triggers();
  
  -- Insérer toutes les périodes en une seule requête
  -- Utiliser un INSERT ... ON CONFLICT DO UPDATE en une seule requête
  -- NOTE: force_weekend_ferie n'est plus inclus, le trigger BEFORE INSERT le calculera automatiquement
  INSERT INTO periodes_charge (
    affaire_id,
    site,
    competence,
    date_debut,
    date_fin,
    nb_ressources
  )
  SELECT 
    v_affaire_uuid,
    v_site_normalized,
    (periode->>'competence')::TEXT,
    (periode->>'date_debut')::DATE,
    (periode->>'date_fin')::DATE,
    COALESCE((periode->>'nb_ressources')::INTEGER, 0)
  FROM jsonb_array_elements(p_periodes) AS periode
  WHERE (periode->>'competence')::TEXT IS NOT NULL
    AND (periode->>'date_debut')::DATE IS NOT NULL
    AND (periode->>'date_fin')::DATE IS NOT NULL
  ON CONFLICT (affaire_id, site, competence, date_debut, date_fin) 
  DO UPDATE SET
    nb_ressources = EXCLUDED.nb_ressources,
    updated_at = NOW();
  
  -- Réactiver les triggers
  PERFORM enable_consolidation_triggers();
  
  -- Déclencher la consolidation manuelle pour toutes les compétences de cette affaire/site
  -- Cela va consolider toutes les périodes en une seule fois au lieu de le faire pour chaque insertion
  PERFORM trigger_consolidation_after_batch(v_affaire_uuid, v_site_normalized);
  
  RAISE NOTICE 'batch_insert_periodes_charge terminé - % période(s) insérée(s) pour affaire_id: %, site: %', 
    jsonb_array_length(p_periodes), p_affaire_id, v_site_normalized;

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, réactiver les triggers avant de relancer l'erreur
    PERFORM enable_consolidation_triggers();
    RAISE;
END;
$function$;

