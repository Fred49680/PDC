-- ============================================
-- MIGRATION : Corriger la structure de la table affaires
-- S'assurer que libelle existe et gérer le conflit avec affaire_nom
-- Version 2 : Gère les triggers qui dépendent de affaire_nom
-- ============================================

-- ============================================
-- ÉTAPE 1 : Créer la colonne libelle si elle n'existe pas
-- ============================================
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS libelle TEXT;

-- ============================================
-- ÉTAPE 2 : Si affaire_nom existe et libelle est vide, copier les données
-- ============================================
-- Copier les données de affaire_nom vers libelle si libelle est NULL ou vide
UPDATE affaires
SET libelle = affaire_nom
WHERE (libelle IS NULL OR libelle = '')
  AND affaire_nom IS NOT NULL
  AND affaire_nom != '';

-- ============================================
-- ÉTAPE 3 : Supprimer les triggers qui dépendent de affaire_nom
-- ============================================
-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_affaire_id ON affaires;

-- Supprimer la fonction associée si elle existe
DROP FUNCTION IF EXISTS update_affaire_id_from_affaire_nom();

-- ============================================
-- ÉTAPE 4 : Supprimer affaire_nom si elle existe
-- ============================================
-- Vérifier d'abord qu'il n'y a pas de données perdues, puis supprimer
DO $$
DECLARE
    total_affaires INTEGER;
    avec_affaire_nom INTEGER;
    avec_libelle INTEGER;
    perte_potentielle INTEGER;
    colonne_affaire_nom_exists BOOLEAN;
BEGIN
    -- Vérifier si la colonne affaire_nom existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'affaires' 
        AND column_name = 'affaire_nom'
    ) INTO colonne_affaire_nom_exists;
    
    IF colonne_affaire_nom_exists THEN
        -- Compter les données
        SELECT 
            COUNT(*),
            COUNT(affaire_nom),
            COUNT(libelle),
            COUNT(CASE WHEN affaire_nom IS NOT NULL AND (libelle IS NULL OR libelle = '') THEN 1 END)
        INTO total_affaires, avec_affaire_nom, avec_libelle, perte_potentielle
        FROM affaires;
        
        RAISE NOTICE 'Total affaires: %, Avec affaire_nom: %, Avec libelle: %, Perte potentielle: %', 
            total_affaires, avec_affaire_nom, avec_libelle, perte_potentielle;
        
        -- Si aucune perte potentielle, supprimer affaire_nom
        IF perte_potentielle = 0 THEN
            -- Supprimer la colonne avec CASCADE pour supprimer aussi les dépendances
            ALTER TABLE affaires DROP COLUMN IF EXISTS affaire_nom CASCADE;
            RAISE NOTICE 'Colonne affaire_nom supprimée avec succès';
        ELSE
            RAISE WARNING 'Colonne affaire_nom conservée car % données seraient perdues', perte_potentielle;
        END IF;
    ELSE
        RAISE NOTICE 'Colonne affaire_nom n''existe pas, aucune action nécessaire';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 5 : Vérification finale
-- ============================================
-- Vérifier que libelle existe et contient des données
SELECT 
    COUNT(*) as total,
    COUNT(libelle) as avec_libelle,
    COUNT(CASE WHEN libelle IS NULL OR libelle = '' THEN 1 END) as libelle_vide
FROM affaires;
