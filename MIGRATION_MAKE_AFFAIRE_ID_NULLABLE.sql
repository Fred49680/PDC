-- ============================================
-- MIGRATION : Rendre affaire_id nullable dans la table affaires
-- ============================================
-- Cette migration permet à affaire_id d'être NULL si le statut n'est pas "Ouverte" ou "Prévisionnelle"
-- selon la formule Excel : SI(ET([@Statut]<>"Ouverte";[@Statut]<>"Prévisionnelle");"";...)
--
-- IMPORTANT :
-- - L'affaire_id peut être NULL si le statut n'est pas "Ouverte" ou "Prévisionnelle"
-- - La contrainte UNIQUE doit être supprimée puis recréée pour permettre les NULL multiples

-- ============================================
-- Supprimer la contrainte UNIQUE existante
-- ============================================
DO $$
BEGIN
    -- Supprimer la contrainte UNIQUE si elle existe
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'affaires_affaire_id_key'
    ) THEN
        ALTER TABLE affaires DROP CONSTRAINT affaires_affaire_id_key;
    END IF;
END $$;

-- ============================================
-- Rendre affaire_id nullable
-- ============================================
ALTER TABLE affaires
ALTER COLUMN affaire_id DROP NOT NULL;

-- ============================================
-- Recréer une contrainte UNIQUE qui permet les NULL
-- ============================================
-- PostgreSQL permet plusieurs NULL dans une colonne UNIQUE
-- On crée un index unique partiel qui ignore les NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_affaires_affaire_id_unique 
ON affaires(affaire_id) 
WHERE affaire_id IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN affaires.affaire_id IS 'Identifiant de l''affaire au format [Tranche][SiteMap][Affaire]. Peut être NULL si le statut n''est pas "Ouverte" ou "Prévisionnelle"';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que la colonne est bien nullable
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'affaires'
AND column_name = 'affaire_id';

-- Vérifier que l'index unique est bien créé
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'affaires'
AND indexname = 'idx_affaires_affaire_id_unique';
