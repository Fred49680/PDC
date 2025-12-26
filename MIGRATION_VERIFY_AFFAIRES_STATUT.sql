-- ============================================
-- MIGRATION : Vérifier et corriger les statuts des affaires existantes
-- ============================================
-- Cette migration vérifie que toutes les affaires ont un statut valide
-- et met à jour les affaires sans statut avec "Ouverte" par défaut

-- ============================================
-- VÉRIFICATION : Afficher les affaires sans statut ou avec statut NULL
-- ============================================
SELECT 
    id,
    affaire_id,
    site,
    libelle,
    statut,
    actif,
    date_creation
FROM affaires
WHERE statut IS NULL 
   OR statut = ''
   OR statut NOT IN ('Ouverte', 'Prévisionnelle', 'Fermée')
ORDER BY date_creation DESC;

-- ============================================
-- CORRECTION : Mettre à jour les affaires sans statut
-- ============================================
-- Mettre "Ouverte" par défaut pour les affaires sans statut
UPDATE affaires
SET statut = 'Ouverte',
    date_modification = NOW()
WHERE statut IS NULL 
   OR statut = '';

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
-- Vérifier que toutes les affaires ont maintenant un statut valide
SELECT 
    statut,
    COUNT(*) as nombre_affaires
FROM affaires
GROUP BY statut
ORDER BY statut;

-- Afficher les affaires avec leur affaire_id et statut
SELECT 
    affaire_id,
    site,
    libelle,
    statut,
    CASE 
        WHEN statut IN ('Ouverte', 'Prévisionnelle') THEN 'Devrait avoir affaire_id'
        ELSE 'affaire_id vide (normal)'
    END as commentaire
FROM affaires
ORDER BY date_creation DESC
LIMIT 10;
