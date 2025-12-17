-- ============================================
-- MIGRATION : Ajout statut et suivi arrêts maladie pour absences
-- ============================================
-- Cette migration ajoute :
-- 1. Colonne "statut" (Actif/Clôturé) pour suivre l'état de l'absence
-- 2. Colonne "type_arret_maladie" (Initial/Prolongation) pour le suivi des arrêts maladie
-- 3. Fonction/trigger pour mettre automatiquement le statut à 'Clôturé' quand date_fin < CURRENT_DATE
-- 4. Fonction/trigger pour créer une alerte automatique quand un arrêt maladie dépasse 30 jours

-- ============================================
-- 1. AJOUT DES COLONNES
-- ============================================

-- Ajouter la colonne "statut" (Actif/Clôturé)
ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Clôturé'));

-- Ajouter la colonne "type_arret_maladie" (Initial/Prolongation) - optionnel, seulement pour arrêts maladie
ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS type_arret_maladie TEXT CHECK (type_arret_maladie IS NULL OR type_arret_maladie IN ('Initial', 'Prolongation'));

-- Mettre à jour les absences existantes : statut = 'Clôturé' si date_fin < CURRENT_DATE
UPDATE absences 
SET statut = 'Clôturé' 
WHERE date_fin < CURRENT_DATE AND (statut IS NULL OR statut = 'Actif');

-- ============================================
-- 2. FONCTION POUR METTRE À JOUR LE STATUT AUTOMATIQUEMENT
-- ============================================

-- Fonction pour mettre à jour le statut selon la date de fin
CREATE OR REPLACE FUNCTION update_absence_statut()
RETURNS TRIGGER AS $$
BEGIN
    -- Si date_fin < CURRENT_DATE, mettre statut à 'Clôturé'
    IF NEW.date_fin < CURRENT_DATE THEN
        NEW.statut = 'Clôturé';
    -- Sinon, si date_fin >= CURRENT_DATE, mettre statut à 'Actif'
    ELSIF NEW.date_fin >= CURRENT_DATE THEN
        NEW.statut = 'Actif';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le statut automatiquement avant INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_update_absence_statut ON absences;
CREATE TRIGGER trigger_update_absence_statut
    BEFORE INSERT OR UPDATE OF date_fin ON absences
    FOR EACH ROW
    EXECUTE FUNCTION update_absence_statut();

-- ============================================
-- 3. FONCTION POUR CRÉER UNE ALERTE AUTOMATIQUE POUR ARRÊTS MALADIE > 30 JOURS
-- ============================================

-- Fonction pour créer une alerte si arrêt maladie > 30 jours
CREATE OR REPLACE FUNCTION check_arret_maladie_30j()
RETURNS TRIGGER AS $$
DECLARE
    duree_calendaire INTEGER;
    ressource_nom TEXT;
    alerte_existe BOOLEAN;
BEGIN
    -- Vérifier si c'est un arrêt maladie
    IF UPPER(NEW.type) LIKE '%MALADIE%' OR UPPER(NEW.type) LIKE '%ARRET%' THEN
        -- Calculer la durée calendaire
        duree_calendaire := (NEW.date_fin - NEW.date_debut) + 1;
        
        -- Si > 30 jours calendaires
        IF duree_calendaire > 30 THEN
            -- Récupérer le nom de la ressource
            SELECT nom_prenom INTO ressource_nom
            FROM ressources
            WHERE id = NEW.ressource_id;
            
            -- Vérifier si une alerte existe déjà pour cet arrêt maladie
            SELECT EXISTS (
                SELECT 1 
                FROM alertes 
                WHERE type_alerte = 'ARRET_MALADIE_30J'
                  AND ressource_id = NEW.ressource_id
                  AND date_debut = NEW.date_debut
                  AND date_fin = NEW.date_fin
            ) INTO alerte_existe;
            
            -- Si aucune alerte n'existe, en créer une
            IF NOT alerte_existe THEN
                INSERT INTO alertes (
                    prise_en_compte,
                    courrier_statut,
                    date_action,
                    type_alerte,
                    ressource_id,
                    site,
                    date_debut,
                    date_fin,
                    action
                ) VALUES (
                    'Non',
                    'A envoyer',
                    NOW(),
                    'ARRET_MALADIE_30J',
                    NEW.ressource_id,
                    NEW.site,
                    NEW.date_debut,
                    NEW.date_fin,
                    'Arrêt maladie de ' || duree_calendaire || ' jours calendaires (' || 
                    TO_CHAR(NEW.date_debut, 'DD/MM/YYYY') || ' - ' || 
                    TO_CHAR(NEW.date_fin, 'DD/MM/YYYY') || ') - Courrier à envoyer'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les arrêts maladie après INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_check_arret_maladie_30j ON absences;
CREATE TRIGGER trigger_check_arret_maladie_30j
    AFTER INSERT OR UPDATE OF type, date_debut, date_fin ON absences
    FOR EACH ROW
    EXECUTE FUNCTION check_arret_maladie_30j();

-- ============================================
-- 4. FONCTION POUR METTRE À JOUR LE STATUT DES ABSENCES EXISTANTES (JOB QUOTIDIEN)
-- ============================================

-- Fonction pour mettre à jour le statut de toutes les absences terminées
-- À appeler quotidiennement (via cron job ou fonction planifiée)
CREATE OR REPLACE FUNCTION update_absences_statut_quotidien()
RETURNS INTEGER AS $$
DECLARE
    nb_mises_a_jour INTEGER;
BEGIN
    UPDATE absences 
    SET statut = 'Clôturé', updated_at = NOW()
    WHERE date_fin < CURRENT_DATE 
      AND statut = 'Actif';
    
    GET DIAGNOSTICS nb_mises_a_jour = ROW_COUNT;
    
    RETURN nb_mises_a_jour;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. INDEX POUR PERFORMANCE
-- ============================================

-- Index pour les requêtes sur statut
CREATE INDEX IF NOT EXISTS idx_absences_statut ON absences(statut);
CREATE INDEX IF NOT EXISTS idx_absences_type ON absences(type);
CREATE INDEX IF NOT EXISTS idx_absences_date_fin ON absences(date_fin);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que les colonnes sont bien créées
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'absences'
  AND column_name IN ('statut', 'type_arret_maladie')
ORDER BY column_name;

-- Vérifier que les triggers sont bien créés
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'absences'
  AND trigger_name IN ('trigger_update_absence_statut', 'trigger_check_arret_maladie_30j')
ORDER BY trigger_name;
