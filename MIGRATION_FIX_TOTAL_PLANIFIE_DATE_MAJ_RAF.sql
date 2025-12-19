-- ============================================
-- MIGRATION : Modifier le calcul de total_planifie pour tenir compte de date_maj_raf
-- ============================================
-- Le calcul de total_planifie doit maintenant commencer à partir de date_maj_raf
-- (si date_maj_raf est renseignée) jusqu'à la fin de la planification

-- ============================================
-- Mettre à jour la fonction update_affaire_calculated_fields
-- pour filtrer les périodes de charge selon date_maj_raf
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
    -- Filtrer selon date_maj_raf : ne compter que les périodes qui commencent après date_maj_raf
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
            -- Filtrer selon date_maj_raf : ne compter que les périodes qui commencent après date_maj_raf
            AND (a.date_maj_raf IS NULL OR pc.date_debut >= a.date_maj_raf)
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
-- pour utiliser date_maj_raf
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
            -- Filtrer selon date_maj_raf : ne compter que les périodes qui commencent après date_maj_raf
            AND (a.date_maj_raf IS NULL OR pc.date_debut >= a.date_maj_raf)
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
-- Créer un trigger pour recalculer total_planifie quand date_maj_raf change
-- ============================================
CREATE OR REPLACE FUNCTION update_total_planifie_on_date_maj_raf()
RETURNS TRIGGER AS $$
BEGIN
    -- Si date_maj_raf a changé, recalculer total_planifie
    IF (OLD.date_maj_raf IS DISTINCT FROM NEW.date_maj_raf) THEN
        NEW.total_planifie := (
            SELECT COALESCE(SUM(pc.nb_ressources * pc.jours_ouvres * 7), 0)
            FROM periodes_charge pc
            WHERE pc.affaire_id = NEW.id
            AND pc.site = NEW.site
            -- Filtrer selon date_maj_raf : ne compter que les périodes qui commencent après date_maj_raf
            AND (NEW.date_maj_raf IS NULL OR pc.date_debut >= NEW.date_maj_raf)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas déjà
DROP TRIGGER IF EXISTS trigger_update_total_planifie_on_date_maj_raf ON affaires;
CREATE TRIGGER trigger_update_total_planifie_on_date_maj_raf
    BEFORE UPDATE OF date_maj_raf ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION update_total_planifie_on_date_maj_raf();
