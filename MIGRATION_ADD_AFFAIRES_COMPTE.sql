-- ============================================
-- MIGRATION : Ajouter la colonne "compte" à la table affaires
-- ============================================
-- Description : Ajoute un champ "compte" facultatif pour stocker le numéro de compte
-- Format : Texte (chiffres et lettres acceptés)
-- ============================================

-- Ajouter la colonne "compte" si elle n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'affaires' 
        AND column_name = 'compte'
    ) THEN
        ALTER TABLE affaires 
        ADD COLUMN compte TEXT;
        
        -- Ajouter un commentaire pour documenter la colonne
        COMMENT ON COLUMN affaires.compte IS 'Numéro de compte (facultatif, peut contenir des chiffres et des lettres)';
        
        RAISE NOTICE 'Colonne "compte" ajoutée à la table affaires';
    ELSE
        RAISE NOTICE 'Colonne "compte" existe déjà dans la table affaires';
    END IF;
END $$;

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'affaires' 
AND column_name = 'compte';
