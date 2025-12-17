-- ============================================
-- MIGRATION : Correction des politiques RLS pour la table absences
-- ============================================
-- Cette migration corrige l'erreur "new row violates row-level security policy"
-- en permettant l'insertion sans authentification (pour le développement)
-- OU en ajoutant des politiques pour les utilisateurs authentifiés

-- ============================================
-- OPTION 1 : Permettre l'accès sans authentification (DÉVELOPPEMENT UNIQUEMENT)
-- ============================================
-- ⚠️ ATTENTION : Cette option désactive la sécurité RLS pour le développement
-- Ne pas utiliser en production !

-- Supprimer les politiques existantes pour INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert absences" ON absences;
DROP POLICY IF EXISTS "Users can modify data" ON absences;
DROP POLICY IF EXISTS "Allow insert absences without auth" ON absences;
DROP POLICY IF EXISTS "Allow update absences without auth" ON absences;
DROP POLICY IF EXISTS "Allow delete absences without auth" ON absences;

-- Créer une politique qui permet l'insertion sans authentification
CREATE POLICY "Allow insert absences without auth"
    ON absences FOR INSERT
    WITH CHECK (true);

-- Créer une politique qui permet la mise à jour sans authentification
CREATE POLICY "Allow update absences without auth"
    ON absences FOR UPDATE
    USING (true);

-- Créer une politique qui permet la suppression sans authentification
CREATE POLICY "Allow delete absences without auth"
    ON absences FOR DELETE
    USING (true);

-- Créer une politique qui permet la lecture sans authentification
DROP POLICY IF EXISTS "Authenticated users can read absences" ON absences;
DROP POLICY IF EXISTS "Users can read all data" ON absences;
DROP POLICY IF EXISTS "Allow select absences without auth" ON absences;

CREATE POLICY "Allow select absences without auth"
    ON absences FOR SELECT
    USING (true);

-- ============================================
-- OPTION 2 : Politiques avec authentification (PRODUCTION)
-- ============================================
-- Décommenter cette section si vous avez un système d'authentification en place

/*
-- Supprimer les politiques sans authentification
DROP POLICY IF EXISTS "Allow insert absences without auth" ON absences;
DROP POLICY IF EXISTS "Allow update absences without auth" ON absences;
DROP POLICY IF EXISTS "Allow delete absences without auth" ON absences;
DROP POLICY IF EXISTS "Allow select absences without auth" ON absences;

-- Politique de lecture pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read absences"
    ON absences FOR SELECT
    USING (auth.role() = 'authenticated');

-- Politique d'insertion pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert absences"
    ON absences FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de mise à jour pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can update absences"
    ON absences FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de suppression pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete absences"
    ON absences FOR DELETE
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
WHERE tablename = 'absences'
ORDER BY policyname;
