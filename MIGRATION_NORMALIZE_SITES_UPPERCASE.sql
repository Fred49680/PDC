-- ============================================
-- MIGRATION : Normaliser tous les sites en majuscules
-- ============================================
-- Corriger les incohérences de casse dans les tables affaires et periodes_charge

-- Normaliser les sites dans affaires
UPDATE affaires
SET site = UPPER(TRIM(site))
WHERE site IS NOT NULL;

-- Normaliser les sites dans periodes_charge
UPDATE periodes_charge
SET site = UPPER(TRIM(site))
WHERE site IS NOT NULL;

-- Vérifier les résultats
SELECT DISTINCT site, COUNT(*) as count
FROM affaires
GROUP BY site
ORDER BY site;
