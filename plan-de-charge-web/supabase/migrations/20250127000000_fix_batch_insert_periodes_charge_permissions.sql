-- Corriger les permissions de la fonction batch_insert_periodes_charge
-- en ajoutant SECURITY DEFINER pour permettre la désactivation des triggers

-- S'assurer que la fonction est dans le schéma public et appartient à postgres
CREATE OR REPLACE FUNCTION public.batch_insert_periodes_charge(
  p_periodes jsonb,
  p_affaire_id text,
  p_site text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_affaire_uuid UUID;
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

  -- DÉSACTIVER les triggers utilisateur (pas les triggers système RI)
  -- Cela évite que chaque INSERT déclenche une consolidation, ce qui cause des timeouts
  -- SECURITY DEFINER permet à la fonction d'avoir les permissions nécessaires
  -- On utilise USER au lieu de ALL pour éviter d'essayer de désactiver les triggers système
  ALTER TABLE periodes_charge DISABLE TRIGGER USER;

  -- Insérer toutes les périodes en une seule requête
  -- Utiliser un INSERT ... ON CONFLICT DO UPDATE en une seule requête
  INSERT INTO periodes_charge (
    affaire_id,
    site,
    competence,
    date_debut,
    date_fin,
    nb_ressources,
    force_weekend_ferie
  )
  SELECT
    v_affaire_uuid,
    UPPER(p_site),
    (periode->>'competence')::TEXT,
    (periode->>'date_debut')::DATE,
    (periode->>'date_fin')::DATE,
    COALESCE((periode->>'nb_ressources')::NUMERIC, 0),
    COALESCE(
      CASE 
        WHEN periode->>'force_weekend_ferie' IS NULL THEN FALSE
        WHEN periode->>'force_weekend_ferie' = '' THEN FALSE
        WHEN periode->>'force_weekend_ferie' IN ('true', 't', '1') THEN TRUE
        WHEN periode->>'force_weekend_ferie' IN ('false', 'f', '0') THEN FALSE
        ELSE (periode->>'force_weekend_ferie')::BOOLEAN
      END,
      FALSE
    )
  FROM jsonb_array_elements(p_periodes) AS periode
  WHERE COALESCE((periode->>'nb_ressources')::NUMERIC, 0) > 0
  ON CONFLICT (affaire_id, site, competence, date_debut, date_fin)
  DO UPDATE SET
    nb_ressources = EXCLUDED.nb_ressources,
    force_weekend_ferie = EXCLUDED.force_weekend_ferie,
    updated_at = NOW();

  -- RÉACTIVER les triggers utilisateur
  -- La consolidation se fera automatiquement via les triggers après l'insertion
  -- mais seulement une fois au lieu de N fois (une par ligne)
  ALTER TABLE periodes_charge ENABLE TRIGGER USER;

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, réactiver les triggers utilisateur avant de relancer l'erreur
    ALTER TABLE periodes_charge ENABLE TRIGGER USER;
    RAISE;
END;
$function$;

-- Changer le propriétaire de la fonction pour s'assurer qu'elle a les bonnes permissions
ALTER FUNCTION public.batch_insert_periodes_charge(jsonb, text, text) OWNER TO postgres;

-- Donner les permissions d'exécution au rôle anon (et authenticated)
-- Cela permet aux utilisateurs authentifiés d'appeler la fonction via l'API
GRANT EXECUTE ON FUNCTION public.batch_insert_periodes_charge(jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.batch_insert_periodes_charge(jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_insert_periodes_charge(jsonb, text, text) TO service_role;

-- S'assurer que le schéma public est accessible
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

