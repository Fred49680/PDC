-- ============================================
-- MIGRATION : Ajouter la colonne updated_at à la table affaires
-- ============================================
-- Cette migration corrige l'erreur "column updated_at of relation affaires does not exist"
-- qui se produit lorsque le trigger update_affaires_updated_at essaie de mettre à jour
-- une colonne qui n'existe pas

-- ============================================
-- ÉTAPE 1 : Vérifier si la colonne existe déjà
-- ============================================
DO $$
BEGIN
    -- Ajouter la colonne updated_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'affaires' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE affaires 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        
        -- Mettre à jour les lignes existantes avec la valeur de date_modification si elle existe
        -- ou avec NOW() si date_modification n'existe pas
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'affaires' 
            AND column_name = 'date_modification'
        ) THEN
            UPDATE affaires 
            SET updated_at = COALESCE(date_modification, NOW())
            WHERE updated_at IS NULL;
        ELSE
            UPDATE affaires 
            SET updated_at = NOW()
            WHERE updated_at IS NULL;
        END IF;
        
        RAISE NOTICE 'Colonne updated_at ajoutée à la table affaires';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà dans la table affaires';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Vérifier si le trigger existe
-- ============================================
-- Supprimer le trigger existant s'il y a un problème
DROP TRIGGER IF EXISTS update_affaires_updated_at ON affaires;

-- Recréer le trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_affaires_updated_at
    BEFORE UPDATE ON affaires
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que la colonne existe
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'affaires'
  AND column_name = 'updated_at';

-- Vérifier que le trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'affaires'
  AND trigger_name = 'update_affaires_updated_at';
