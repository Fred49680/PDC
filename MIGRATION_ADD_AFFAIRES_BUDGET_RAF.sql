-- ============================================
-- MIGRATION : Ajout des colonnes Budget, RAF et Date MAJ du RAF à la table affaires
-- ============================================
-- Ces colonnes sont nécessaires pour le suivi budgétaire des affaires
--
-- IMPORTANT :
-- - budget_heures : Budget en heures pour l'affaire
-- - raf_heures : Reste À Faire en heures
-- - date_maj_raf : Date de mise à jour du RAF

-- ============================================
-- Ajout des colonnes
-- ============================================

-- Budget en heures
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS budget_heures DECIMAL(10,2) DEFAULT 0;

-- Reste À Faire en heures
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS raf_heures DECIMAL(10,2) DEFAULT 0;

-- Date de mise à jour du RAF
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS date_maj_raf DATE;

-- Index pour performance (si besoin de filtrer par ces colonnes)
CREATE INDEX IF NOT EXISTS idx_affaires_budget_heures ON affaires(budget_heures);
CREATE INDEX IF NOT EXISTS idx_affaires_raf_heures ON affaires(raf_heures);
CREATE INDEX IF NOT EXISTS idx_affaires_date_maj_raf ON affaires(date_maj_raf);

-- Commentaires pour documentation
COMMENT ON COLUMN affaires.budget_heures IS 'Budget en heures pour l''affaire';
COMMENT ON COLUMN affaires.raf_heures IS 'Reste À Faire en heures';
COMMENT ON COLUMN affaires.date_maj_raf IS 'Date de mise à jour du RAF';

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
AND column_name IN ('budget_heures', 'raf_heures', 'date_maj_raf')
ORDER BY column_name;
