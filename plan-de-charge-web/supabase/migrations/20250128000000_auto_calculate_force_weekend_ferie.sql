-- Migration pour calculer automatiquement force_weekend_ferie dans le trigger
-- Si la date n'est pas un jour ouvré (week-end/férié), alors force_weekend_ferie = true
-- Sinon, force_weekend_ferie = false

-- Modifier la fonction calculate_jours_ouvres_periode pour aussi calculer force_weekend_ferie
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
    
    -- Si au moins une des dates n'est pas un jour ouvré, alors force_weekend_ferie = true
    -- Sinon, force_weekend_ferie = false
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
sinon force_weekend_ferie = false.';

