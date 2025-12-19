-- ============================================
-- MIGRATION : Ajout de la colonne jours_ouvres à periodes_charge
-- ============================================
-- Cette colonne stocke le nombre de jours ouvrés pour chaque période
-- Elle est calculée automatiquement lors de l'insertion/mise à jour
-- Cela simplifie le calcul de total_planifie dans le trigger

-- ============================================
-- Ajout de la colonne jours_ouvres
-- ============================================
ALTER TABLE periodes_charge 
ADD COLUMN IF NOT EXISTS jours_ouvres INTEGER DEFAULT 0;

COMMENT ON COLUMN periodes_charge.jours_ouvres IS 'Nombre de jours ouvrés dans la période (calculé automatiquement depuis le calendrier)';

-- ============================================
-- Fonction pour calculer et mettre à jour jours_ouvres
-- ============================================
CREATE OR REPLACE FUNCTION calculate_jours_ouvres_periode()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer le nombre de jours ouvrés entre date_debut et date_fin
    NEW.jours_ouvres := (
        SELECT COUNT(*)::INTEGER
        FROM calendrier c
        WHERE c.date >= NEW.date_debut 
        AND c.date <= NEW.date_fin 
        AND c.is_business_day = true
    );
    
    -- Si force_weekend_ferie = true, inclure aussi les week-ends et fériés
    -- (pour l'instant, on garde seulement les jours ouvrés, mais on peut étendre plus tard)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger pour calculer automatiquement jours_ouvres
-- ============================================
DROP TRIGGER IF EXISTS trigger_calculate_jours_ouvres ON periodes_charge;
CREATE TRIGGER trigger_calculate_jours_ouvres
    BEFORE INSERT OR UPDATE OF date_debut, date_fin ON periodes_charge
    FOR EACH ROW
    EXECUTE FUNCTION calculate_jours_ouvres_periode();

-- ============================================
-- Mettre à jour les jours_ouvres existants
-- ============================================
UPDATE periodes_charge pc
SET jours_ouvres = (
    SELECT COUNT(*)::INTEGER
    FROM calendrier c
    WHERE c.date >= pc.date_debut 
    AND c.date <= pc.date_fin 
    AND c.is_business_day = true
);

-- ============================================
-- Mettre à jour la fonction update_affaire_calculated_fields
-- pour utiliser jours_ouvres au lieu de recalculer
-- ============================================
CREATE OR REPLACE FUNCTION update_affaire_calculated_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_affaire_uuid UUID;
    v_site TEXT;
BEGIN
    -- Récupérer l'UUID de l'affaire et le site depuis la période de charge
    IF TG_OP = 'DELETE' THEN
        v_affaire_uuid := OLD.affaire_id;
        v_site := OLD.site;
    ELSE
        v_affaire_uuid := NEW.affaire_id;
        v_site := NEW.site;
    END IF;
    
    -- Mettre à jour les champs calculés pour l'affaire concernée
    -- Utiliser jours_ouvres directement au lieu de recalculer
    UPDATE affaires a
    SET 
        date_debut_demande = (
            SELECT MIN(pc.date_debut)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        date_fin_demande = (
            SELECT MAX(pc.date_fin)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        total_planifie = (
            SELECT COALESCE(SUM(pc.nb_ressources * pc.jours_ouvres * 7), 0)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        updated_at = NOW()
    WHERE a.id = v_affaire_uuid
    AND a.site = v_site;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Mettre à jour la fonction recalculate_all_affaires_fields
-- pour utiliser jours_ouvres
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_affaires_fields()
RETURNS VOID AS $$
BEGIN
    -- Recalculer pour toutes les affaires qui ont des périodes de charge
    UPDATE affaires a
    SET 
        date_debut_demande = (
            SELECT MIN(pc.date_debut)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        date_fin_demande = (
            SELECT MAX(pc.date_fin)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        total_planifie = (
            SELECT COALESCE(SUM(pc.nb_ressources * pc.jours_ouvres * 7), 0)
            FROM periodes_charge pc
            WHERE pc.affaire_id = a.id
            AND pc.site = a.site
        ),
        updated_at = NOW()
    WHERE EXISTS (
        SELECT 1 
        FROM periodes_charge pc 
        WHERE pc.affaire_id = a.id 
        AND pc.site = a.site
    );
    
    -- Mettre à NULL pour les affaires sans périodes de charge
    UPDATE affaires a
    SET 
        date_debut_demande = NULL,
        date_fin_demande = NULL,
        total_planifie = 0,
        updated_at = NOW()
    WHERE NOT EXISTS (
        SELECT 1 
        FROM periodes_charge pc 
        WHERE pc.affaire_id = a.id 
        AND pc.site = a.site
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que la colonne est bien ajoutée
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'periodes_charge'
AND column_name = 'jours_ouvres';

-- Vérifier que le trigger est bien créé
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'periodes_charge'
AND trigger_name = 'trigger_calculate_jours_ouvres';

-- Afficher quelques exemples de périodes avec jours_ouvres calculés
SELECT 
    id,
    date_debut,
    date_fin,
    nb_ressources,
    jours_ouvres,
    nb_ressources * jours_ouvres * 7 as heures_calculees
FROM periodes_charge
ORDER BY date_debut
LIMIT 10;
