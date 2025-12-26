-- Migration: Ajout des colonnes distance_km et duration_minutes à la table transferts
-- Date: 2025-01-XX
-- Description: Permet de stocker la distance en kilomètres et la durée en minutes
--              du trajet entre l'adresse du domicile de la ressource et le site de destination

ALTER TABLE transferts
ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

COMMENT ON COLUMN transferts.distance_km IS 'Distance en kilomètres entre l''adresse du domicile de la ressource et le site de destination';
COMMENT ON COLUMN transferts.duration_minutes IS 'Durée du trajet en minutes entre l''adresse du domicile de la ressource et le site de destination';

-- Les valeurs peuvent être NULL si l'adresse de la ressource ou du site n'est pas renseignée

