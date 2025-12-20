-- ============================================
-- MIGRATION : Table de cache pour les distances calculées
-- ============================================
-- Cette migration crée une table pour stocker les distances calculées
-- afin d'éviter de recalculer les mêmes trajets

CREATE TABLE IF NOT EXISTS distances_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adresse_origine TEXT NOT NULL,
    adresse_destination TEXT NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_meters INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    api_provider TEXT NOT NULL DEFAULT 'google', -- 'google' ou 'openrouteservice'
    profile TEXT, -- Mode de transport (driving-car, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Index unique pour éviter les doublons
    CONSTRAINT unique_distance_cache UNIQUE (adresse_origine, adresse_destination, profile)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_distances_cache_origine ON distances_cache(adresse_origine);
CREATE INDEX IF NOT EXISTS idx_distances_cache_destination ON distances_cache(adresse_destination);
CREATE INDEX IF NOT EXISTS idx_distances_cache_created ON distances_cache(created_at);

-- Commentaires
COMMENT ON TABLE distances_cache IS 'Cache des distances calculées entre adresses pour éviter les recalculs';
COMMENT ON COLUMN distances_cache.adresse_origine IS 'Adresse de départ (normalisée)';
COMMENT ON COLUMN distances_cache.adresse_destination IS 'Adresse d''arrivée (normalisée)';
COMMENT ON COLUMN distances_cache.distance_km IS 'Distance en kilomètres';
COMMENT ON COLUMN distances_cache.duration_minutes IS 'Durée du trajet en minutes';
COMMENT ON COLUMN distances_cache.api_provider IS 'API utilisée pour le calcul (google ou openrouteservice)';
COMMENT ON COLUMN distances_cache.profile IS 'Mode de transport utilisé (driving-car, etc.)';

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_distances_cache_updated_at
    BEFORE UPDATE ON distances_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour nettoyer les anciens caches (optionnel, à exécuter périodiquement)
-- Supprime les entrées de plus de 90 jours
CREATE OR REPLACE FUNCTION cleanup_old_distances_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM distances_cache
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

