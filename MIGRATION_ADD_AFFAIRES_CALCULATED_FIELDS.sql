-- ============================================
-- MIGRATION : Ajout des colonnes calculées à la table affaires
-- ============================================
-- Ces colonnes seront remplies automatiquement lors de l'enregistrement des charges
-- Elles ne doivent PAS être dans le formulaire d'ajout/modification d'une affaire
--
-- IMPORTANT :
-- - date_debut_demande : MIN(date_debut) des periodes_charge pour cette affaire/site
-- - date_fin_demande : MAX(date_fin) des periodes_charge pour cette affaire/site
-- - total_planifie : SUM(nb_ressources * jours_ouvres * 7h) des periodes_charge pour cette affaire/site
--
-- Ces valeurs sont calculées automatiquement via des triggers lors de l'insertion/modification
-- des périodes de charge dans la table periodes_charge

-- ============================================
-- Ajout des colonnes calculées
-- ============================================

-- Date de début de la demande (MIN des dates de début des périodes de charge)
ALTER TABLE affaires 
ADD COLUMN IF NOT EXISTS date_debut_demande DATE;

-- Date de fin de la demande (MAX des dates de fin des périodes de charge)
ALTER TABLE affaires 
ADD COLUMN IF NOT EXISTS date_fin_demande DATE;

-- Total planifié (somme des charges en heures)
ALTER TABLE affaires 
ADD COLUMN IF NOT EXISTS total_planifie DECIMAL(10,2) DEFAULT 0;

-- Index pour performance (si besoin de filtrer par ces colonnes)
CREATE INDEX IF NOT EXISTS idx_affaires_date_debut_demande ON affaires(date_debut_demande);
CREATE INDEX IF NOT EXISTS idx_affaires_date_fin_demande ON affaires(date_fin_demande);

-- Commentaires pour documentation
COMMENT ON COLUMN affaires.date_debut_demande IS 'Date de début de la demande (calculée automatiquement depuis les périodes de charge)';
COMMENT ON COLUMN affaires.date_fin_demande IS 'Date de fin de la demande (calculée automatiquement depuis les périodes de charge)';
COMMENT ON COLUMN affaires.total_planifie IS 'Total planifié en heures (calculé automatiquement depuis les périodes de charge)';

-- ============================================
-- Fonction pour mettre à jour automatiquement ces colonnes
-- ============================================
-- Cette fonction sera appelée lors de l'enregistrement/modification des charges

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
    -- Utiliser la jointure avec affaires via l'UUID
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
            SELECT COALESCE(SUM(pc.nb_ressources * 
                (SELECT COUNT(*)::DECIMAL
                 FROM calendrier c
                 WHERE c.date >= pc.date_debut 
                 AND c.date <= pc.date_fin 
                 AND c.is_business_day = true) * 7), 0)
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
-- Trigger pour mettre à jour automatiquement lors de l'insertion/modification de charges
-- ============================================

-- Trigger sur INSERT
DROP TRIGGER IF EXISTS trigger_update_affaire_on_charge_insert ON periodes_charge;
CREATE TRIGGER trigger_update_affaire_on_charge_insert
    AFTER INSERT ON periodes_charge
    FOR EACH ROW
    EXECUTE FUNCTION update_affaire_calculated_fields();

-- Trigger sur UPDATE
DROP TRIGGER IF EXISTS trigger_update_affaire_on_charge_update ON periodes_charge;
CREATE TRIGGER trigger_update_affaire_on_charge_update
    AFTER UPDATE ON periodes_charge
    FOR EACH ROW
    EXECUTE FUNCTION update_affaire_calculated_fields();

-- Trigger sur DELETE
DROP TRIGGER IF EXISTS trigger_update_affaire_on_charge_delete ON periodes_charge;
CREATE TRIGGER trigger_update_affaire_on_charge_delete
    AFTER DELETE ON periodes_charge
    FOR EACH ROW
    EXECUTE FUNCTION update_affaire_calculated_fields();

-- ============================================
-- Fonction pour recalculer toutes les affaires (maintenance)
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
            SELECT COALESCE(SUM(pc.nb_ressources * 
                (SELECT COUNT(*)::DECIMAL
                 FROM calendrier c
                 WHERE c.date >= pc.date_debut 
                 AND c.date <= pc.date_fin 
                 AND c.is_business_day = true) * 7), 0)
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
-- Vérifier que les colonnes sont bien ajoutées
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'affaires'
AND column_name IN ('date_debut_demande', 'date_fin_demande', 'total_planifie')
ORDER BY column_name;

-- Vérifier que les triggers sont bien créés
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'periodes_charge'
AND trigger_name LIKE '%affaire%'
ORDER BY trigger_name;
