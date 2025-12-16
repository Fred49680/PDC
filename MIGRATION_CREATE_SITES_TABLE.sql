-- ============================================
-- MIGRATION : Création de la table sites
-- ============================================
-- Cette migration crée la table sites pour gérer les sites des centrales françaises
-- avec leurs régions et centres géographiques

CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site TEXT NOT NULL UNIQUE,
    site_key TEXT NOT NULL UNIQUE,
    site_map TEXT NOT NULL UNIQUE,
    region TEXT,
    centre_ouest TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_sites_site_key ON sites(site_key);
CREATE INDEX IF NOT EXISTS idx_sites_region ON sites(region);
CREATE INDEX IF NOT EXISTS idx_sites_centre_ouest ON sites(centre_ouest);
CREATE INDEX IF NOT EXISTS idx_sites_actif ON sites(actif);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE sites IS 'Table des sites (centrales françaises) avec leurs régions et centres géographiques';
COMMENT ON COLUMN sites.site IS 'Nom du site (ex: Blayais)';
COMMENT ON COLUMN sites.site_key IS 'Clé unique du site en majuscules (ex: BLAYAIS)';
COMMENT ON COLUMN sites.site_map IS 'Code court du site (ex: BLA)';
COMMENT ON COLUMN sites.region IS 'Région géographique (ex: Sud Ouest, Val de Loire, etc.)';
COMMENT ON COLUMN sites.centre_ouest IS 'Centre géographique (Centre Ouest, Nord Ouest, Centre Est)';
COMMENT ON COLUMN sites.actif IS 'Indique si le site est actif ou non';

-- ============================================
-- INSERTION DES SITES PAR DÉFAUT
-- ============================================
-- Les sites peuvent être initialisés via l'interface d'administration
-- ou via cette requête SQL

-- Note: Cette insertion est optionnelle car l'interface d'administration
-- permet d'initialiser les sites via le bouton "Initialiser sites par défaut"
