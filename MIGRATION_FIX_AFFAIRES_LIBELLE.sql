-- ============================================
-- MIGRATION : Corriger la structure de la table affaires
-- S'assurer que libelle existe et gérer le conflit avec affaire_nom
-- ============================================

-- ============================================
-- ÉTAPE 1 : Vérifier la structure actuelle
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'affaires'
AND column_name IN ('libelle', 'affaire_nom', 'affaire_id', 'site')
ORDER BY column_name;

-- ============================================
-- ÉTAPE 2 : Créer la colonne libelle si elle n'existe pas
-- ============================================
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS libelle TEXT;

-- ============================================
-- ÉTAPE 3 : Si affaire_nom existe et libelle est vide, copier les données
-- ============================================
-- Copier les données de affaire_nom vers libelle si libelle est NULL ou vide
UPDATE affaires
SET libelle = affaire_nom
WHERE (libelle IS NULL OR libelle = '')
  AND affaire_nom IS NOT NULL
  AND affaire_nom != '';

-- ============================================
-- ÉTAPE 4 : Rendre libelle NOT NULL si nécessaire
-- ============================================
-- Vérifier d'abord qu'il n'y a pas de valeurs NULL
SELECT COUNT(*) as nb_libelle_null
FROM affaires
WHERE libelle IS NULL OR libelle = '';

-- Si le compte est 0, on peut rendre la colonne NOT NULL
-- (Décommenter si nécessaire)
-- ALTER TABLE affaires
-- ALTER COLUMN libelle SET NOT NULL;

-- ============================================
-- ÉTAPE 5 : Supprimer affaire_nom si elle existe (optionnel)
-- ============================================
-- ATTENTION : Ne supprimer que si vous êtes sûr que libelle contient toutes les données
-- Décommenter seulement après vérification

-- Vérifier d'abord qu'il n'y a pas de données perdues
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
            ALTER TABLE affaires DROP COLUMN IF EXISTS affaire_nom;
            RAISE NOTICE 'Colonne affaire_nom supprimée avec succès';
        ELSE
            RAISE WARNING 'Colonne affaire_nom conservée car % données seraient perdues', perte_potentielle;
        END IF;
    ELSE
        RAISE NOTICE 'Colonne affaire_nom n''existe pas, aucune action nécessaire';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 6 : Vérification finale
-- ============================================
-- Vérifier que libelle existe et contient des données
SELECT 
    COUNT(*) as total,
    COUNT(libelle) as avec_libelle,
    COUNT(CASE WHEN libelle IS NULL OR libelle = '' THEN 1 END) as libelle_vide
FROM affaires;

-- Afficher quelques exemples
SELECT 
    id,
    affaire_id,
    site,
    libelle,
    CASE WHEN affaire_nom IS NOT NULL THEN affaire_nom ELSE '(colonne absente)' END as affaire_nom,
    date_creation
FROM affaires
ORDER BY date_creation DESC
LIMIT 10;
