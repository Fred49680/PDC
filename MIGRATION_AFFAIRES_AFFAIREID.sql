-- ============================================
-- MIGRATION : Ajout colonnes affaires et génération automatique AffaireID
-- ============================================
-- Cette migration ajoute les colonnes nécessaires pour générer AffaireID
-- selon la formule Excel : [Tranche][SiteMap][Affaire]
-- Condition : uniquement si Statut = "Ouverte" ou "Prévisionnelle"

BEGIN;

-- ============================================
-- 1. AJOUT DES COLONNES MANQUANTES
-- ============================================

-- Ajouter les colonnes nécessaires pour la génération d'AffaireID
ALTER TABLE affaires
ADD COLUMN IF NOT EXISTS tranche TEXT,
ADD COLUMN IF NOT EXISTS affaire_nom TEXT, -- Nom de l'affaire (ex: "PACK TEM", "PNPE 3313")
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'Ouverte', -- 'Ouverte', 'Prévisionnelle', etc.
ADD COLUMN IF NOT EXISTS compte TEXT, -- Code compte (ex: "2VPBA0")
ADD COLUMN IF NOT EXISTS date_debut_dem DATE, -- Date début demande
ADD COLUMN IF NOT EXISTS date_fin_dem DATE, -- Date fin demande
ADD COLUMN IF NOT EXISTS responsable TEXT, -- Responsable de l'affaire
ADD COLUMN IF NOT EXISTS budget_heures NUMERIC(10,2), -- Budget en heures
ADD COLUMN IF NOT EXISTS raf NUMERIC(10,2), -- Reste À Faire
ADD COLUMN IF NOT EXISTS date_maj TIMESTAMP, -- Date dernière mise à jour
ADD COLUMN IF NOT EXISTS total_planifie NUMERIC(10,2); -- Total heures planifiées

-- Commentaires pour documentation
COMMENT ON COLUMN affaires.tranche IS 'Tranche ou segment de l''affaire (ex: "TOUTE", "1")';
COMMENT ON COLUMN affaires.affaire_nom IS 'Nom de l''affaire (ex: "PACK TEM", "PNPE 3313")';
COMMENT ON COLUMN affaires.statut IS 'Statut de l''affaire (ex: "Ouverte", "Prévisionnelle") - Détermine si AffaireID est généré';
COMMENT ON COLUMN affaires.compte IS 'Code compte interne (ex: "2VPBA0")';
COMMENT ON COLUMN affaires.date_debut_dem IS 'Date de début de la demande';
COMMENT ON COLUMN affaires.date_fin_dem IS 'Date de fin de la demande';
COMMENT ON COLUMN affaires.responsable IS 'Responsable de l''affaire';
COMMENT ON COLUMN affaires.budget_heures IS 'Budget en heures alloué à l''affaire';
COMMENT ON COLUMN affaires.raf IS 'Reste À Faire (heures)';
COMMENT ON COLUMN affaires.date_maj IS 'Date de dernière mise à jour';
COMMENT ON COLUMN affaires.total_planifie IS 'Total des heures planifiées';

-- ============================================
-- 2. FONCTION POUR OBTENIR SITEMAP DEPUIS SITE
-- ============================================
-- Cette fonction récupère le SiteMap depuis la table sites
-- basé sur le nom du site (comme dans Dim_Site)

CREATE OR REPLACE FUNCTION get_site_map(p_site TEXT)
RETURNS TEXT AS $$
DECLARE
    v_site_map TEXT;
BEGIN
    -- Chercher le SiteMap dans la table sites
    SELECT site_map INTO v_site_map
    FROM sites
    WHERE UPPER(TRIM(site)) = UPPER(TRIM(p_site))
       OR UPPER(TRIM(site_key)) = UPPER(TRIM(p_site))
    LIMIT 1;
    
    -- Si non trouvé, retourner le site en majuscules (fallback)
    IF v_site_map IS NULL THEN
        v_site_map := UPPER(TRIM(p_site));
    END IF;
    
    RETURN v_site_map;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_site_map(TEXT) IS 'Récupère le SiteMap depuis la table sites basé sur le nom du site';

-- ============================================
-- 3. FONCTION POUR GÉNÉRER AFFAIREID
-- ============================================
-- Réplique la formule Excel :
-- =SI(ET([@Statut]<>"Ouverte";[@Statut]<>"Prévisionnelle");"";"["&[@Tranche]&"]["&[@SiteMap]&"]["&[@Affaire]&"]")

CREATE OR REPLACE FUNCTION generate_affaire_id(
    p_tranche TEXT,
    p_site TEXT,
    p_affaire_nom TEXT,
    p_statut TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_site_map TEXT;
    v_affaire_id TEXT;
BEGIN
    -- Si Statut n'est ni "Ouverte" ni "Prévisionnelle", retourner vide
    IF p_statut IS NULL OR (UPPER(TRIM(p_statut)) NOT IN ('OUVERTE', 'PRÉVISIONNELLE', 'PREVISIONNELLE')) THEN
        RETURN '';
    END IF;
    
    -- Si Tranche, Site ou Affaire sont vides, retourner vide
    IF p_tranche IS NULL OR TRIM(p_tranche) = '' THEN
        RETURN '';
    END IF;
    
    IF p_site IS NULL OR TRIM(p_site) = '' THEN
        RETURN '';
    END IF;
    
    IF p_affaire_nom IS NULL OR TRIM(p_affaire_nom) = '' THEN
        RETURN '';
    END IF;
    
    -- Obtenir le SiteMap depuis la table sites
    v_site_map := get_site_map(p_site);
    
    -- Générer l'AffaireID au format [Tranche][SiteMap][Affaire]
    v_affaire_id := '[' || TRIM(p_tranche) || '][' || v_site_map || '][' || TRIM(p_affaire_nom) || ']';
    
    RETURN v_affaire_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_affaire_id(TEXT, TEXT, TEXT, TEXT) IS 'Génère l''AffaireID au format [Tranche][SiteMap][Affaire] si Statut = "Ouverte" ou "Prévisionnelle", sinon retourne vide';

-- ============================================
-- 4. TRIGGER POUR METTRE À JOUR AFFAIREID AUTOMATIQUEMENT
-- ============================================
-- Ce trigger met à jour AffaireID automatiquement lors de l'insertion ou modification

CREATE OR REPLACE FUNCTION update_affaire_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Générer l'AffaireID automatiquement
    NEW.affaire_id := generate_affaire_id(
        NEW.tranche,
        NEW.site,
        NEW.affaire_nom,
        NEW.statut
    );
    
    -- Mettre à jour date_modification
    NEW.date_modification := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_affaire_id() IS 'Met à jour automatiquement AffaireID lors de l''insertion ou modification d''une affaire';

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_affaire_id ON affaires;

CREATE TRIGGER trigger_update_affaire_id
    BEFORE INSERT OR UPDATE OF tranche, site, affaire_nom, statut ON affaires
    FOR EACH ROW
    EXECUTE FUNCTION update_affaire_id();

-- ============================================
-- 5. METTRE À JOUR LES AFFAIRES EXISTANTES
-- ============================================
-- Si des affaires existent déjà, mettre à jour leur AffaireID

UPDATE affaires
SET affaire_id = generate_affaire_id(tranche, site, affaire_nom, statut)
WHERE affaire_id IS NULL OR affaire_id = '';

-- ============================================
-- 6. CONTRAINTES ET INDEX
-- ============================================

-- Index pour performance sur les colonnes fréquemment utilisées
CREATE INDEX IF NOT EXISTS idx_affaires_statut ON affaires(statut);
CREATE INDEX IF NOT EXISTS idx_affaires_site ON affaires(site);
CREATE INDEX IF NOT EXISTS idx_affaires_tranche ON affaires(tranche);
CREATE INDEX IF NOT EXISTS idx_affaires_affaire_nom ON affaires(affaire_nom);
CREATE INDEX IF NOT EXISTS idx_affaires_responsable ON affaires(responsable);

-- Contrainte pour s'assurer que AffaireID est unique (même s'il peut être vide)
-- Note: PostgreSQL permet plusieurs valeurs NULL dans une colonne UNIQUE
-- Mais on veut s'assurer que les AffaireID non-vides sont uniques
CREATE UNIQUE INDEX IF NOT EXISTS idx_affaires_affaire_id_unique 
ON affaires(affaire_id) 
WHERE affaire_id IS NOT NULL AND affaire_id != '';

COMMIT;

-- ============================================
-- NOTES D'UTILISATION
-- ============================================
-- 
-- 1. Lors de l'insertion d'une nouvelle affaire :
--    INSERT INTO affaires (tranche, site, affaire_nom, statut, libelle, ...)
--    VALUES ('TOUTE', 'BELLEVILLE', 'PACK TEM', 'Ouverte', 'Description', ...);
--    -> AffaireID sera automatiquement généré : [TOUTE][BEL][PACK TEM]
--
-- 2. Si le statut change vers autre chose que "Ouverte" ou "Prévisionnelle" :
--    UPDATE affaires SET statut = 'Fermée' WHERE id = ...;
--    -> AffaireID sera automatiquement vidé
--
-- 3. Si Tranche, Site ou Affaire change :
--    UPDATE affaires SET tranche = '1' WHERE id = ...;
--    -> AffaireID sera automatiquement régénéré
--
-- 4. Le SiteMap est récupéré automatiquement depuis la table sites
--    en fonction du nom du site (ex: "BELLEVILLE" -> "BEL")
--
-- ============================================
