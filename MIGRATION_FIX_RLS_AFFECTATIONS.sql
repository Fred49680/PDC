-- ============================================
-- MIGRATION : Correction RLS pour la table affectations
-- ============================================
-- Problème : Erreur 401 (Unauthorized) lors des opérations sur affectations
-- Cause : RLS policies trop restrictives nécessitant une authentification
-- Solution : Désactiver temporairement RLS ou créer des policies permissives pour le développement
-- ============================================

-- Option 1 : Désactiver complètement RLS (pour développement uniquement)
-- ATTENTION : À réactiver en production avec des policies appropriées
ALTER TABLE affectations DISABLE ROW LEVEL SECURITY;

-- Option 2 : Créer des policies permissives (alternative à la désactivation)
-- Décommenter cette section si vous préférez garder RLS activé avec des policies permissives

/*
-- Supprimer les policies existantes (si elles existent)
DROP POLICY IF EXISTS "Users can read all data" ON affectations;
DROP POLICY IF EXISTS "Users can modify data" ON affectations;
DROP POLICY IF EXISTS "Users can insert data" ON affectations;
DROP POLICY IF EXISTS "Users can update data" ON affectations;
DROP POLICY IF EXISTS "Users can delete data" ON affectations;

-- Réactiver RLS
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;

-- Policy permissive pour SELECT (lecture)
CREATE POLICY "Allow all SELECT on affectations"
    ON affectations FOR SELECT
    USING (true);

-- Policy permissive pour INSERT (insertion)
CREATE POLICY "Allow all INSERT on affectations"
    ON affectations FOR INSERT
    WITH CHECK (true);

-- Policy permissive pour UPDATE (modification)
CREATE POLICY "Allow all UPDATE on affectations"
    ON affectations FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy permissive pour DELETE (suppression)
CREATE POLICY "Allow all DELETE on affectations"
    ON affectations FOR DELETE
    USING (true);
*/

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que RLS est désactivé ou que les policies sont permissives
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'affectations';

-- Si RLS est activé, vérifier les policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'affectations';
