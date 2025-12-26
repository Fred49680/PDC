-- ============================================
-- MIGRATION : Ajout des colonnes d'adresse
-- ============================================
-- Cette migration ajoute les colonnes pour stocker les adresses :
-- - adresse_domicile dans la table ressources (adresse du domicile de la ressource)
-- - adresse dans la table sites (adresse du site)

-- Ajouter la colonne adresse_domicile à la table ressources
ALTER TABLE ressources
ADD COLUMN IF NOT EXISTS adresse_domicile TEXT;

-- Ajouter la colonne adresse à la table sites
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS adresse TEXT;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN ressources.adresse_domicile IS 'Adresse complète du domicile de la ressource (ex: "123 Rue Example, 75001 Paris, France")';
COMMENT ON COLUMN sites.adresse IS 'Adresse complète du site (ex: "Centrale Nucléaire de Blayais, 33340 Blaye, France")';

-- Optionnel : Ajouter des index pour faciliter les recherches
-- (Utile si vous prévoyez de faire des recherches par adresse)
-- CREATE INDEX IF NOT EXISTS idx_ressources_adresse_domicile ON ressources USING gin(to_tsvector('french', adresse_domicile));
-- CREATE INDEX IF NOT EXISTS idx_sites_adresse ON sites USING gin(to_tsvector('french', adresse));

