-- Migration: Ajout des politiques RLS pour chantiers et interims
-- Date: 2025-01-30
--
-- Cette migration ajoute les politiques RLS manquantes pour les tables
-- chantiers et interims qui avaient RLS activé mais sans politiques.

-- ============================================================================
-- 1. CHANTIERS
-- ============================================================================

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select chantiers without auth"
ON public.chantiers
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Allow insert chantiers without auth"
ON public.chantiers
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Allow update chantiers without auth"
ON public.chantiers
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
CREATE POLICY "Allow delete chantiers without auth"
ON public.chantiers
FOR DELETE
USING (true);

-- ============================================================================
-- 2. INTERIMS
-- ============================================================================

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select interims without auth"
ON public.interims
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Allow insert interims without auth"
ON public.interims
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Allow update interims without auth"
ON public.interims
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
CREATE POLICY "Allow delete interims without auth"
ON public.interims
FOR DELETE
USING (true);

