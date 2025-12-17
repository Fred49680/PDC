-- ============================================
-- MIGRATION : Ajout des colonnes tranche et statut à la table affaires
-- ============================================
-- Ces colonnes sont nécessaires pour la génération automatique de l'affaire_id
-- selon la formule Excel : [Tranche][SiteMap][Affaire]
--
-- IMPORTANT :
-- - tranche : Tranche/Segment de l'affaire (ex: "TOUTE", "T1", "T2", etc.)
-- - statut : Statut de l'affaire (ex: "Ouverte", "Prévisionnelle", "Fermée", etc.)
-- - L'affaire_id sera généré automatiquement si statut = "Ouverte" ou "Prévisionnelle"
-- - Format de l'affaire_id : [Tranche][SiteMap][Affaire] (ex: [TOUTE][BEL][PACK TEM])

-- ============================================
-- Ajout des colonnes
-- ============================================

-- Tranche/Segment de l'affaire
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS tranche TEXT;

-- Statut de l'affaire
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'Ouverte';

-- Index pour performance (si besoin de filtrer par statut)
CREATE INDEX IF NOT EXISTS idx_affaires_statut ON affaires(statut);
CREATE INDEX IF NOT EXISTS idx_affaires_tranche ON affaires(tranche);

-- Commentaires pour documentation
COMMENT ON COLUMN affaires.tranche IS 'Tranche/Segment de l''affaire (ex: "TOUTE", "T1", "T2") - Utilisé pour générer l''affaire_id';
COMMENT ON COLUMN affaires.statut IS 'Statut de l''affaire (ex: "Ouverte", "Prévisionnelle", "Fermée") - L''affaire_id est généré uniquement si statut = "Ouverte" ou "Prévisionnelle"';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que les colonnes sont bien ajoutées
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'affaires'
AND column_name IN ('tranche', 'statut')
ORDER BY column_name;
