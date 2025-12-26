-- Migration: Normalisation automatique des colonnes site en majuscules
-- Date: 2025-01-XX
-- Description: Crée des triggers pour convertir automatiquement toutes les colonnes 'site' en majuscules
--              lors des INSERT et UPDATE, garantissant une cohérence dans l'affichage des sites

-- Fonction générique pour normaliser les colonnes site en majuscules
CREATE OR REPLACE FUNCTION normalize_site_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  -- Normaliser la colonne 'site' si elle existe et n'est pas NULL
  IF TG_TABLE_NAME = 'transferts' THEN
    -- Pour la table transferts, normaliser site_origine et site_destination
    IF NEW.site_origine IS NOT NULL THEN
      NEW.site_origine := UPPER(TRIM(NEW.site_origine));
    END IF;
    IF NEW.site_destination IS NOT NULL THEN
      NEW.site_destination := UPPER(TRIM(NEW.site_destination));
    END IF;
  ELSIF TG_TABLE_NAME = 'sites' THEN
    -- Pour la table sites, normaliser site, site_key et site_map
    IF NEW.site IS NOT NULL THEN
      NEW.site := UPPER(TRIM(NEW.site));
    END IF;
    IF NEW.site_key IS NOT NULL THEN
      NEW.site_key := UPPER(TRIM(NEW.site_key));
    END IF;
    IF NEW.site_map IS NOT NULL THEN
      NEW.site_map := UPPER(TRIM(NEW.site_map));
    END IF;
  ELSE
    -- Pour toutes les autres tables avec une colonne 'site'
    IF NEW.site IS NOT NULL THEN
      NEW.site := UPPER(TRIM(NEW.site));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour toutes les tables avec une colonne site
CREATE TRIGGER trg_normalize_site_absences
  BEFORE INSERT OR UPDATE ON absences
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_affaires
  BEFORE INSERT OR UPDATE ON affaires
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_affectations
  BEFORE INSERT OR UPDATE ON affectations
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_alertes
  BEFORE INSERT OR UPDATE ON alertes
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_chantiers
  BEFORE INSERT OR UPDATE ON chantiers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_interims
  BEFORE INSERT OR UPDATE ON interims
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_periodes_charge
  BEFORE INSERT OR UPDATE ON periodes_charge
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_ressources
  BEFORE INSERT OR UPDATE ON ressources
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

CREATE TRIGGER trg_normalize_site_sites
  BEFORE INSERT OR UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

-- Trigger spécial pour transferts (site_origine et site_destination)
CREATE TRIGGER trg_normalize_site_transferts
  BEFORE INSERT OR UPDATE ON transferts
  FOR EACH ROW
  EXECUTE FUNCTION normalize_site_uppercase();

-- Normaliser les données existantes
UPDATE absences SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE affaires SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE affectations SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE alertes SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE chantiers SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE interims SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE periodes_charge SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE ressources SET site = UPPER(TRIM(site)) WHERE site IS NOT NULL;
UPDATE sites SET site = UPPER(TRIM(site)), site_key = UPPER(TRIM(site_key)), site_map = UPPER(TRIM(site_map)) WHERE site IS NOT NULL OR site_key IS NOT NULL OR site_map IS NOT NULL;
UPDATE transferts SET site_origine = UPPER(TRIM(site_origine)), site_destination = UPPER(TRIM(site_destination)) WHERE site_origine IS NOT NULL OR site_destination IS NOT NULL;

