-- ============================================
-- MIGRATION : Ajouter colonne force_weekend_ferie à la table affectations
-- ============================================
-- Cette colonne permet de tracer les affectations qui ont été forcées
-- (confirmées par l'utilisateur) pour des week-ends ou jours fériés

ALTER TABLE affectations
ADD COLUMN IF NOT EXISTS force_weekend_ferie BOOLEAN DEFAULT FALSE;

-- Commentaire pour documentation
COMMENT ON COLUMN affectations.force_weekend_ferie IS 'Indique si cette affectation a été forcée (confirmée) pour un week-end ou jour férié';

-- Index pour faciliter les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_affectations_force_weekend_ferie 
ON affectations(force_weekend_ferie) 
WHERE force_weekend_ferie = TRUE;
