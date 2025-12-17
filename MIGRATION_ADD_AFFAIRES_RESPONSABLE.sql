-- ============================================
-- MIGRATION : Ajout de la colonne Responsable à la table affaires
-- ============================================

-- Ajouter la colonne responsable
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS responsable TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN affaires.responsable IS 'Responsable de l''affaire';

-- Index pour performance (si besoin de filtrer par responsable)
CREATE INDEX IF NOT EXISTS idx_affaires_responsable ON affaires(responsable);

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'affaires'
AND column_name = 'responsable';
