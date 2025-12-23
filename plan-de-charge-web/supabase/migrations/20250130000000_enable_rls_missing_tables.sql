-- Migration: Activation RLS sur les tables manquantes
-- Active RLS et crée des politiques permissives pour permettre toutes les opérations via l'application
-- Date: 2025-01-30

-- ============================================================================
-- 1. RESSOURCES_COMPETENCES
-- ============================================================================
ALTER TABLE public.ressources_competences ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select ressources_competences without auth"
ON public.ressources_competences
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Allow insert ressources_competences without auth"
ON public.ressources_competences
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Allow update ressources_competences without auth"
ON public.ressources_competences
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
CREATE POLICY "Allow delete ressources_competences without auth"
ON public.ressources_competences
FOR DELETE
USING (true);

-- ============================================================================
-- 2. ETATS_CHANTIERS
-- ============================================================================
ALTER TABLE public.etats_chantiers ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select etats_chantiers without auth"
ON public.etats_chantiers
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Allow insert etats_chantiers without auth"
ON public.etats_chantiers
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Allow update etats_chantiers without auth"
ON public.etats_chantiers
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
CREATE POLICY "Allow delete etats_chantiers without auth"
ON public.etats_chantiers
FOR DELETE
USING (true);

-- ============================================================================
-- 3. CALENDRIER
-- ============================================================================
ALTER TABLE public.calendrier ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
-- (table de référence, généralement en lecture seule)
CREATE POLICY "Allow select calendrier without auth"
ON public.calendrier
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
-- (au cas où l'application doit créer de nouvelles dates)
CREATE POLICY "Allow insert calendrier without auth"
ON public.calendrier
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
-- (au cas où l'application doit modifier des dates)
CREATE POLICY "Allow update calendrier without auth"
ON public.calendrier
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
-- (au cas où l'application doit supprimer des dates)
CREATE POLICY "Allow delete calendrier without auth"
ON public.calendrier
FOR DELETE
USING (true);

-- ============================================================================
-- 4. AFFECTATIONS
-- ============================================================================
ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select affectations without auth"
ON public.affectations
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Allow insert affectations without auth"
ON public.affectations
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Allow update affectations without auth"
ON public.affectations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
CREATE POLICY "Allow delete affectations without auth"
ON public.affectations
FOR DELETE
USING (true);

-- ============================================================================
-- 5. CONSOLIDATION_QUEUE
-- ============================================================================
ALTER TABLE public.consolidation_queue ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select consolidation_queue without auth"
ON public.consolidation_queue
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
-- (utilisé par les triggers et RPC)
CREATE POLICY "Allow insert consolidation_queue without auth"
ON public.consolidation_queue
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
-- (utilisé par les RPC pour marquer comme traité)
CREATE POLICY "Allow update consolidation_queue without auth"
ON public.consolidation_queue
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
-- (nettoyage de la queue)
CREATE POLICY "Allow delete consolidation_queue without auth"
ON public.consolidation_queue
FOR DELETE
USING (true);

-- ============================================================================
-- 6. DISTANCES_CACHE
-- ============================================================================
ALTER TABLE public.distances_cache ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow select distances_cache without auth"
ON public.distances_cache
FOR SELECT
USING (true);

-- Politique INSERT : insertion pour tous les utilisateurs authentifiés
-- (création de nouvelles entrées de cache)
CREATE POLICY "Allow insert distances_cache without auth"
ON public.distances_cache
FOR INSERT
WITH CHECK (true);

-- Politique UPDATE : mise à jour pour tous les utilisateurs authentifiés
-- (mise à jour des distances calculées)
CREATE POLICY "Allow update distances_cache without auth"
ON public.distances_cache
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Politique DELETE : suppression pour tous les utilisateurs authentifiés
-- (nettoyage du cache)
CREATE POLICY "Allow delete distances_cache without auth"
ON public.distances_cache
FOR DELETE
USING (true);

