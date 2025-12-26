-- ============================================
-- MIGRATION : Correction des politiques RLS pour la table affaires
-- ============================================
-- Cette migration corrige l'erreur "new row violates row-level security policy"
-- en permettant l'insertion sans authentification (pour le développement)
-- OU en ajoutant des politiques pour les utilisateurs authentifiés

-- ============================================
-- OPTION 1 : Permettre l'accès sans authentification (DÉVELOPPEMENT UNIQUEMENT)
-- ============================================
-- ⚠️ ATTENTION : Cette option désactive la sécurité RLS pour le développement
-- Ne pas utiliser en production !

-- Supprimer les politiques existantes pour INSERT
DROP POLICY IF EXISTS "Authenticated users can insert affaires" ON affaires;
DROP POLICY IF EXISTS "Users can modify data" ON affaires;

-- Créer une politique qui permet l'insertion sans authentification
CREATE POLICY "Allow insert affaires without auth"
    ON affaires FOR INSERT
    WITH CHECK (true);

-- Créer une politique qui permet la mise à jour sans authentification
CREATE POLICY "Allow update affaires without auth"
    ON affaires FOR UPDATE
    USING (true);

-- Créer une politique qui permet la suppression sans authentification
CREATE POLICY "Allow delete affaires without auth"
    ON affaires FOR DELETE
    USING (true);

-- Créer une politique qui permet la lecture sans authentification
DROP POLICY IF EXISTS "Authenticated users can read affaires" ON affaires;
DROP POLICY IF EXISTS "Users can read all data" ON affaires;

CREATE POLICY "Allow select affaires without auth"
    ON affaires FOR SELECT
    USING (true);

-- ============================================
-- OPTION 2 : Politiques avec authentification (PRODUCTION)
-- ============================================
-- Décommenter cette section si vous avez un système d'authentification en place

/*
-- Supprimer les politiques sans authentification
DROP POLICY IF EXISTS "Allow insert affaires without auth" ON affaires;
DROP POLICY IF EXISTS "Allow update affaires without auth" ON affaires;
DROP POLICY IF EXISTS "Allow delete affaires without auth" ON affaires;
DROP POLICY IF EXISTS "Allow select affaires without auth" ON affaires;

-- Politique de lecture pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read affaires"
    ON affaires FOR SELECT
    USING (auth.role() = 'authenticated');

-- Politique d'insertion pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert affaires"
    ON affaires FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de mise à jour pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can update affaires"
    ON affaires FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de suppression pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete affaires"
    ON affaires FOR DELETE
    USING (auth.role() = 'authenticated');
*/

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que les politiques sont bien créées
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
WHERE tablename = 'affaires'
ORDER BY policyname;
