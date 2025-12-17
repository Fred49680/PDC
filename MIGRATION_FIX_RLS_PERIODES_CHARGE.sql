-- ============================================
-- MIGRATION : Correction des politiques RLS pour la table periodes_charge
-- ============================================
-- Cette migration corrige l'erreur 401 (Unauthorized) 
-- en permettant l'accès sans authentification (pour le développement)
-- OU en ajoutant des politiques pour les utilisateurs authentifiés

-- ============================================
-- OPTION 1 : Permettre l'accès sans authentification (DÉVELOPPEMENT UNIQUEMENT)
-- ============================================
-- ⚠️ ATTENTION : Cette option désactive la sécurité RLS pour le développement
-- Ne pas utiliser en production !

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Authenticated users can read periodes_charge" ON periodes_charge;
DROP POLICY IF EXISTS "Users can read all data" ON periodes_charge;
DROP POLICY IF EXISTS "Users can modify data" ON periodes_charge;
DROP POLICY IF EXISTS "Authenticated users can insert periodes_charge" ON periodes_charge;
DROP POLICY IF EXISTS "Authenticated users can update periodes_charge" ON periodes_charge;
DROP POLICY IF EXISTS "Authenticated users can delete periodes_charge" ON periodes_charge;

-- Créer une politique qui permet la lecture sans authentification
CREATE POLICY "Allow select periodes_charge without auth"
    ON periodes_charge FOR SELECT
    USING (true);

-- Créer une politique qui permet l'insertion sans authentification
CREATE POLICY "Allow insert periodes_charge without auth"
    ON periodes_charge FOR INSERT
    WITH CHECK (true);

-- Créer une politique qui permet la mise à jour sans authentification
CREATE POLICY "Allow update periodes_charge without auth"
    ON periodes_charge FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Créer une politique qui permet la suppression sans authentification
CREATE POLICY "Allow delete periodes_charge without auth"
    ON periodes_charge FOR DELETE
    USING (true);

-- ============================================
-- OPTION 2 : Politiques avec authentification (PRODUCTION)
-- ============================================
-- Décommenter cette section si vous avez un système d'authentification en place

/*
-- Supprimer les politiques sans authentification
DROP POLICY IF EXISTS "Allow select periodes_charge without auth" ON periodes_charge;
DROP POLICY IF EXISTS "Allow insert periodes_charge without auth" ON periodes_charge;
DROP POLICY IF EXISTS "Allow update periodes_charge without auth" ON periodes_charge;
DROP POLICY IF EXISTS "Allow delete periodes_charge without auth" ON periodes_charge;

-- Politique de lecture pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read periodes_charge"
    ON periodes_charge FOR SELECT
    USING (auth.role() = 'authenticated');

-- Politique d'insertion pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert periodes_charge"
    ON periodes_charge FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de mise à jour pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can update periodes_charge"
    ON periodes_charge FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique de suppression pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete periodes_charge"
    ON periodes_charge FOR DELETE
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
WHERE tablename = 'periodes_charge'
ORDER BY policyname;
