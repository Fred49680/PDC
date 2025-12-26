-- Migration pour corriger le trigger calculate_jours_ouvres_periode
-- et s'assurer qu'il gère correctement les UPDATE sans recevoir de chaîne vide

-- D'abord, corriger toutes les valeurs invalides dans la base de données
UPDATE periodes_charge
SET force_weekend_ferie = CASE
  WHEN force_weekend_ferie::text = '' OR force_weekend_ferie IS NULL THEN
    -- Calculer la valeur correcte basée sur les dates
    NOT (
      EXISTS (
        SELECT 1 FROM calendrier 
        WHERE date = periodes_charge.date_debut AND is_business_day = TRUE
      ) AND
      EXISTS (
        SELECT 1 FROM calendrier 
        WHERE date = periodes_charge.date_fin AND is_business_day = TRUE
      )
    )
  ELSE
    force_weekend_ferie
  END
WHERE force_weekend_ferie::text = '' OR force_weekend_ferie IS NULL;

-- Améliorer le trigger pour qu'il soit plus robuste
CREATE OR REPLACE FUNCTION public.calculate_jours_ouvres_periode()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_date_debut_is_business BOOLEAN;
  v_date_fin_is_business BOOLEAN;
BEGIN
    -- Calculer le nombre de jours ouvrés entre date_debut et date_fin
    NEW.jours_ouvres := (
        SELECT COUNT(*)::INTEGER
        FROM calendrier c
        WHERE c.date >= NEW.date_debut 
        AND c.date <= NEW.date_fin 
        AND c.is_business_day = true
    );
    
    -- Calculer automatiquement force_weekend_ferie
    -- Si au moins une des dates n'est pas un jour ouvré, alors force_weekend_ferie = true
    -- Sinon, force_weekend_ferie = false
    
    -- Vérifier si date_debut est un jour ouvré
    SELECT EXISTS (
        SELECT 1 
        FROM calendrier 
        WHERE date = NEW.date_debut 
          AND is_business_day = TRUE
    ) INTO v_date_debut_is_business;
    
    -- Si la table calendrier n'existe pas ou n'a pas de données, utiliser le fallback
    IF v_date_debut_is_business IS NULL THEN
        v_date_debut_is_business := EXTRACT(DOW FROM NEW.date_debut) NOT IN (0, 6);
    END IF;
    
    -- Vérifier si date_fin est un jour ouvré
    SELECT EXISTS (
        SELECT 1 
        FROM calendrier 
        WHERE date = NEW.date_fin 
          AND is_business_day = TRUE
    ) INTO v_date_fin_is_business;
    
    -- Si la table calendrier n'existe pas ou n'a pas de données, utiliser le fallback
    IF v_date_fin_is_business IS NULL THEN
        v_date_fin_is_business := EXTRACT(DOW FROM NEW.date_fin) NOT IN (0, 6);
    END IF;
    
    -- TOUJOURS définir force_weekend_ferie explicitement, même lors d'un UPDATE
    -- Cela évite que Supabase essaie de mettre à jour avec une chaîne vide
    IF NOT v_date_debut_is_business OR NOT v_date_fin_is_business THEN
        NEW.force_weekend_ferie := TRUE;
    ELSE
        NEW.force_weekend_ferie := FALSE;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Commentaire pour expliquer la logique
COMMENT ON FUNCTION public.calculate_jours_ouvres_periode() IS 
'Calcule automatiquement jours_ouvres et force_weekend_ferie. 
force_weekend_ferie = true si au moins une des dates (debut ou fin) n''est pas un jour ouvré, 
sinon force_weekend_ferie = false.
TOUJOURS définit force_weekend_ferie explicitement, même lors d''un UPDATE, pour éviter les erreurs de type boolean.';

-- Modifier la fonction RPC insert_periode_charge pour ignorer complètement p_force_weekend_ferie
-- Le paramètre est conservé pour compatibilité mais ignoré (le trigger calcule automatiquement)
-- IMPORTANT : Le type est TEXT pour accepter n'importe quelle valeur (chaîne vide, NULL, etc.) sans erreur
CREATE OR REPLACE FUNCTION public.insert_periode_charge(
  p_affaire_id uuid,
  p_site text,
  p_competence text,
  p_date_debut date,
  p_date_fin date,
  p_nb_ressources integer,
  p_force_weekend_ferie text DEFAULT NULL -- Conservé pour compatibilité mais IGNORÉ (peut être NULL, chaîne vide, etc.)
)
RETURNS TABLE(id uuid, affaire_id uuid, site text, competence text, date_debut date, date_fin date, nb_ressources integer, force_weekend_ferie boolean, jours_ouvres integer, created_at timestamp without time zone, updated_at timestamp without time zone, created_by uuid, updated_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_periode_id UUID;
  v_existing_id UUID;
BEGIN
  -- Normaliser le site en majuscules
  p_site := UPPER(TRIM(p_site));
  
  -- Convertir p_force_weekend_ferie en NULL si c'est une chaîne vide ou NULL
  -- Cela évite les erreurs de type boolean lors de la validation des paramètres
  IF p_force_weekend_ferie IS NULL OR TRIM(p_force_weekend_ferie) = '' THEN
    p_force_weekend_ferie := NULL;
  END IF;

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
      -- force_weekend_ferie n'est PAS mis à jour ici, le trigger s'en chargera
      updated_at = NOW()
    WHERE periodes_charge.id = v_existing_id;

    v_periode_id := v_existing_id;
  ELSE
    -- Sinon, faire un INSERT
    -- force_weekend_ferie n'est PAS inclus, le trigger BEFORE INSERT le calculera automatiquement
    INSERT INTO periodes_charge (
      affaire_id,
      site,
      competence,
      date_debut,
      date_fin,
      nb_ressources
      -- force_weekend_ferie n'est PAS inclus, le trigger le calculera
    )
    VALUES (
      p_affaire_id,
      p_site,
      p_competence,
      p_date_debut,
      p_date_fin,
      p_nb_ressources
      -- force_weekend_ferie n'est PAS inclus, le trigger le calculera
    )
    RETURNING periodes_charge.id INTO v_periode_id;
  END IF;

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
END;
$function$;

-- Commentaire pour expliquer la logique
COMMENT ON FUNCTION public.insert_periode_charge(uuid, text, text, date, date, integer, text) IS 
'Insère ou met à jour une période de charge. 
Le paramètre p_force_weekend_ferie est ignoré (conservé pour compatibilité).
Le trigger calculate_jours_ouvres_periode calcule automatiquement force_weekend_ferie.';

