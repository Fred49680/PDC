-- Migration: Fix erreur boolean dans la consolidation
-- Description: S'assure que force_weekend_ferie est toujours un boolean valide lors de la consolidation

-- Fonction de consolidation pour une compétence spécifique (corrigée pour boolean)
CREATE OR REPLACE FUNCTION consolidate_periodes_charge_for_competence(
  p_affaire_id UUID,
  p_site TEXT,
  p_competence TEXT
)
RETURNS VOID AS $$
DECLARE
  v_periodes_consolidees RECORD;
BEGIN
  -- Créer une table temporaire pour stocker les jours avec leurs charges
  CREATE TEMP TABLE IF NOT EXISTS temp_periodes_consolidation (
    date_jour DATE,
    nb_ressources NUMERIC,
    force_weekend_ferie BOOLEAN
  ) ON COMMIT DROP;

  -- Récupérer toutes les périodes et les décomposer en jours
  -- IMPORTANT : Normaliser force_weekend_ferie pour s'assurer que c'est toujours un boolean valide
  INSERT INTO temp_periodes_consolidation (date_jour, nb_ressources, force_weekend_ferie)
  SELECT 
    generate_series(date_debut::date, date_fin::date, '1 day'::interval)::date AS date_jour,
    nb_ressources,
    -- Normaliser force_weekend_ferie : si NULL ou chaîne vide, utiliser false
    COALESCE(
      CASE 
        WHEN force_weekend_ferie::text = '' THEN false
        WHEN force_weekend_ferie::text = 'true' THEN true
        WHEN force_weekend_ferie::text = 'false' THEN false
        ELSE COALESCE(force_weekend_ferie::boolean, false)
      END,
      false
    ) AS force_weekend_ferie
  FROM periodes_charge
  WHERE affaire_id = p_affaire_id
    AND site = UPPER(p_site)
    AND competence = p_competence;

  -- Supprimer les périodes existantes pour cette combinaison
  -- Le trigger ne se déclenchera pas car app.consolidating = true
  DELETE FROM periodes_charge
  WHERE affaire_id = p_affaire_id
    AND site = UPPER(p_site)
    AND competence = p_competence;

  -- Regrouper les jours consécutifs avec la même charge et force_weekend_ferie
  WITH periodes_grouped AS (
    SELECT 
      date_jour,
      nb_ressources,
      force_weekend_ferie,
      date_jour - ROW_NUMBER() OVER (PARTITION BY nb_ressources, force_weekend_ferie ORDER BY date_jour)::integer AS grp
    FROM temp_periodes_consolidation
  ),
  periodes_consolidees AS (
    SELECT 
      MIN(date_jour) AS date_debut,
      MAX(date_jour) AS date_fin,
      nb_ressources,
      force_weekend_ferie
    FROM periodes_grouped
    GROUP BY grp, nb_ressources, force_weekend_ferie
  )
  INSERT INTO periodes_charge (affaire_id, site, competence, date_debut, date_fin, nb_ressources, force_weekend_ferie)
  SELECT 
    p_affaire_id,
    UPPER(p_site),
    p_competence,
    date_debut,
    date_fin,
    nb_ressources,
    -- Double vérification : s'assurer que force_weekend_ferie est un boolean strict
    COALESCE(force_weekend_ferie::boolean, false) AS force_weekend_ferie
  FROM periodes_consolidees
  ORDER BY date_debut;

  -- Nettoyer la table temporaire
  DROP TABLE IF EXISTS temp_periodes_consolidation;
END;
$$ LANGUAGE plpgsql;

-- Nettoyer les données existantes avec des valeurs invalides
UPDATE periodes_charge 
SET force_weekend_ferie = false 
WHERE force_weekend_ferie IS NULL 
   OR force_weekend_ferie::text = '';

