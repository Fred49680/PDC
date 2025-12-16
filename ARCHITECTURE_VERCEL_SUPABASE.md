# 🌐 ARCHITECTURE COMPLÈTE - VERCEL + SUPABASE

## 🎯 VUE D'ENSEMBLE

Migration de votre application Excel VBA vers une **application web moderne** avec :
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hébergement** : Vercel (frontend) + Supabase (backend)
- **Temps réel** : Synchronisation automatique entre utilisateurs

---

## 🏗️ ARCHITECTURE TECHNIQUE

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND : Next.js 14 (Vercel)                         │
│  - App Router (React Server Components)                 │
│  - TypeScript strict                                    │
│  - Tailwind CSS + shadcn/ui                             │
│  - React Query (cache + synchronisation)                │
│  - Zustand (state management)                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ (Supabase Client)
                       │
┌──────────────────────▼──────────────────────────────────┐
│  BACKEND : Supabase                                     │
│  - PostgreSQL (base de données)                       │
│  - Row Level Security (RLS)                            │
│  - Auth (email/password + OAuth)                       │
│  - Realtime (WebSocket)                                │
│  - Storage (fichiers)                                  │
│  - Edge Functions (serverless)                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 SCHÉMA BASE DE DONNÉES COMPLET

### Tables principales

```sql
-- ============================================
-- TABLE : sites
-- ============================================
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_key TEXT NOT NULL UNIQUE,
    site_name TEXT NOT NULL,
    site_map TEXT,
    region TEXT,
    centre_ouest TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : affaires
-- ============================================
CREATE TABLE affaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id TEXT NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    libelle TEXT NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_affaire_site UNIQUE (affaire_id, site_id)
);

-- Index pour performance
CREATE INDEX idx_affaires_affaire_id ON affaires(affaire_id);
CREATE INDEX idx_affaires_site_id ON affaires(site_id);

-- ============================================
-- TABLE : competences
-- ============================================
CREATE TABLE competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competence TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : ressources
-- ============================================
CREATE TABLE ressources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_prenom TEXT NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    type_contrat TEXT, -- 'CDI', 'CDD', 'ETT', etc.
    responsable TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_fin DATE, -- Date de fin de contrat (pour ETT)
    email TEXT,
    telephone TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_ressource UNIQUE (nom_prenom)
);

-- Index pour performance
CREATE INDEX idx_ressources_site_id ON ressources(site_id);
CREATE INDEX idx_ressources_actif ON ressources(actif);

-- ============================================
-- TABLE : ressources_competences
-- ============================================
CREATE TABLE ressources_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id) ON DELETE CASCADE,
    type_comp TEXT NOT NULL DEFAULT 'P', -- 'P' = Principale, 'S' = Secondaire
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_ressource_competence UNIQUE (ressource_id, competence_id)
);

-- Index pour performance
CREATE INDEX idx_ressources_comp_ressource ON ressources_competences(ressource_id);
CREATE INDEX idx_ressources_comp_competence ON ressources_competences(competence_id);
CREATE INDEX idx_ressources_comp_type ON ressources_competences(type_comp);

-- ============================================
-- TABLE : calendrier
-- ============================================
CREATE TABLE calendrier (
    date DATE PRIMARY KEY,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    is_business_day BOOLEAN NOT NULL,
    week_start DATE NOT NULL,
    iso_week INTEGER NOT NULL,
    iso_year INTEGER NOT NULL,
    semaine_iso TEXT NOT NULL,
    mois_num INTEGER,
    annee INTEGER
);

-- Index pour performance
CREATE INDEX idx_calendrier_date ON calendrier(date);
CREATE INDEX idx_calendrier_business ON calendrier(is_business_day, date);
CREATE INDEX idx_calendrier_semaine ON calendrier(semaine_iso);
CREATE INDEX idx_calendrier_week_start ON calendrier(week_start);

-- ============================================
-- TABLE : periodes_charge
-- ============================================
CREATE TABLE periodes_charge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    nb_ressources DECIMAL(5,2) NOT NULL CHECK (nb_ressources > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT check_dates_charge CHECK (date_fin >= date_debut)
);

-- Index pour performance
CREATE INDEX idx_periodes_charge_affaire ON periodes_charge(affaire_id, site_id, competence_id);
CREATE INDEX idx_periodes_charge_dates ON periodes_charge(date_debut, date_fin);
CREATE INDEX idx_periodes_charge_competence ON periodes_charge(competence_id);

-- ============================================
-- TABLE : affectations
-- ============================================
CREATE TABLE affectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    charge DECIMAL(5,2) NOT NULL, -- Jours ouvrés
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT check_dates_affectation CHECK (date_fin >= date_debut)
);

-- Index pour performance
CREATE INDEX idx_affectations_affaire ON affectations(affaire_id, site_id);
CREATE INDEX idx_affectations_ressource ON affectations(ressource_id, date_debut, date_fin);
CREATE INDEX idx_affectations_dates ON affectations(date_debut, date_fin);
CREATE INDEX idx_affectations_competence ON affectations(competence_id);

-- ============================================
-- TABLE : absences
-- ============================================
CREATE TABLE absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type TEXT NOT NULL, -- 'Formation', 'Congés payés', 'Maladie', etc.
    competence_id UUID REFERENCES competences(id) ON DELETE SET NULL,
    commentaire TEXT,
    validation_saisie TEXT DEFAULT 'Non', -- 'Oui' / 'Non'
    saisi_par UUID REFERENCES auth.users(id),
    date_saisie TIMESTAMP DEFAULT NOW(),
    valide_par UUID REFERENCES auth.users(id),
    date_validation TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_dates_absence CHECK (date_fin >= date_debut)
);

-- Index pour performance
CREATE INDEX idx_absences_ressource ON absences(ressource_id, date_debut, date_fin);
CREATE INDEX idx_absences_dates ON absences(date_debut, date_fin);
CREATE INDEX idx_absences_type ON absences(type);
CREATE INDEX idx_absences_validation ON absences(validation_saisie);

-- ============================================
-- TABLE : transferts
-- ============================================
CREATE TABLE transferts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site_origine_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    site_destination_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut TEXT NOT NULL DEFAULT 'Planifié', -- 'Planifié' / 'Appliqué'
    date_creation TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT check_dates_transfert CHECK (date_fin >= date_debut)
);

-- Index pour performance
CREATE INDEX idx_transferts_ressource ON transferts(ressource_id, date_debut, date_fin);
CREATE INDEX idx_transferts_statut ON transferts(statut);
CREATE INDEX idx_transferts_dates ON transferts(date_debut, date_fin);

-- ============================================
-- TABLE : interims
-- ============================================
CREATE TABLE interims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    date_debut_contrat DATE,
    date_fin_contrat DATE NOT NULL,
    a_renouveler TEXT DEFAULT 'A renouveler', -- 'A renouveler' / 'Oui' / 'Non'
    date_mise_a_jour TIMESTAMP DEFAULT NOW(),
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_interims_ressource ON interims(ressource_id);
CREATE INDEX idx_interims_date_fin ON interims(date_fin_contrat);
CREATE INDEX idx_interims_renouveler ON interims(a_renouveler);

-- ============================================
-- TABLE : chantiers
-- ============================================
CREATE TABLE chantiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chantier_id TEXT NOT NULL UNIQUE,
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    libelle TEXT NOT NULL,
    date_debut DATE,
    date_fin_prevue DATE,
    date_fin_reelle DATE,
    avancement DECIMAL(5,2) DEFAULT 0 CHECK (avancement >= 0 AND avancement <= 100),
    etat_actuel TEXT DEFAULT 'Lancer', -- 'Lancer', 'Reporter', 'Prolonger', 'Terminer', 'Suspendre'
    responsable TEXT,
    priorite TEXT,
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_chantiers_affaire ON chantiers(affaire_id);
CREATE INDEX idx_chantiers_etat ON chantiers(etat_actuel);
CREATE INDEX idx_chantiers_date_fin ON chantiers(date_fin_prevue);

-- ============================================
-- TABLE : etats_chantiers (historique)
-- ============================================
CREATE TABLE etats_chantiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,
    etat TEXT NOT NULL,
    date_changement TIMESTAMP DEFAULT NOW(),
    avancement DECIMAL(5,2),
    commentaire TEXT,
    changed_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_etats_chantiers_chantier ON etats_chantiers(chantier_id);
CREATE INDEX idx_etats_chantiers_date ON etats_chantiers(date_changement);

-- ============================================
-- TABLE : alertes
-- ============================================
CREATE TABLE alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prise_en_compte TEXT DEFAULT 'Non', -- 'Oui' / 'Non'
    courrier_statut TEXT DEFAULT 'A envoyer', -- 'A envoyer' / 'Envoyé'
    date_action TIMESTAMP DEFAULT NOW(),
    type_alerte TEXT NOT NULL,
    ressource_id UUID REFERENCES ressources(id) ON DELETE SET NULL,
    affaire_id UUID REFERENCES affaires(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    competence_id UUID REFERENCES competences(id) ON DELETE SET NULL,
    date_debut DATE,
    date_fin DATE,
    action TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_alertes_type ON alertes(type_alerte);
CREATE INDEX idx_alertes_prise_en_compte ON alertes(prise_en_compte);
CREATE INDEX idx_alertes_courrier ON alertes(courrier_statut);
CREATE INDEX idx_alertes_date ON alertes(date_action);

-- ============================================
-- TABLE : feries
-- ============================================
CREATE TABLE feries (
    date DATE PRIMARY KEY,
    libelle TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : parametres
-- ============================================
CREATE TABLE parametres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annee_debut INTEGER NOT NULL DEFAULT 2026,
    annee_fin INTEGER NOT NULL DEFAULT 2030,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);
```

---

## 🔧 FONCTIONS ET TRIGGERS POSTGRESQL

```sql
-- ============================================
-- FONCTION : Mise à jour automatique updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur toutes les tables avec updated_at
CREATE TRIGGER update_affaires_updated_at
    BEFORE UPDATE ON affaires
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ressources_updated_at
    BEFORE UPDATE ON ressources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periodes_charge_updated_at
    BEFORE UPDATE ON periodes_charge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affectations_updated_at
    BEFORE UPDATE ON affectations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_absences_updated_at
    BEFORE UPDATE ON absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interims_updated_at
    BEFORE UPDATE ON interims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chantiers_updated_at
    BEFORE UPDATE ON chantiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FONCTION : Calculer jours ouvrés entre deux dates
-- ============================================
CREATE OR REPLACE FUNCTION business_days_between(
    date_start DATE,
    date_end DATE
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM calendrier
        WHERE date >= date_start
          AND date <= date_end
          AND is_business_day = TRUE
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FONCTION : Vérifier conflits d'affectation
-- ============================================
CREATE OR REPLACE FUNCTION check_affectation_conflict(
    p_ressource_id UUID,
    p_affaire_id UUID,
    p_site_id UUID,
    p_date_debut DATE,
    p_date_fin DATE,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflict_id UUID,
    conflict_affaire_id UUID,
    conflict_site_id UUID,
    conflict_competence_id UUID,
    conflict_date_debut DATE,
    conflict_date_fin DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.affaire_id,
        a.site_id,
        a.competence_id,
        a.date_debut,
        a.date_fin
    FROM affectations a
    WHERE a.ressource_id = p_ressource_id
      AND a.date_debut <= p_date_fin
      AND a.date_fin >= p_date_debut
      AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
      AND NOT (a.affaire_id = p_affaire_id AND a.site_id = p_site_id); -- Exclure la même affaire/site
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION : Vérifier si ressource absente
-- ============================================
CREATE OR REPLACE FUNCTION is_ressource_absent(
    p_ressource_id UUID,
    p_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM absences
        WHERE ressource_id = p_ressource_id
          AND date_debut <= p_date
          AND date_fin >= p_date
          AND validation_saisie = 'Oui'
          AND type NOT ILIKE '%FORMATION%'
          AND type NOT ILIKE '%TRAINING%'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FONCTION : Vérifier si ressource en formation
-- ============================================
CREATE OR REPLACE FUNCTION is_ressource_en_formation(
    p_ressource_id UUID,
    p_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM absences
        WHERE ressource_id = p_ressource_id
          AND date_debut <= p_date
          AND date_fin >= p_date
          AND (type ILIKE '%FORMATION%' OR type ILIKE '%TRAINING%')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FONCTION : Consolider périodes de charge
-- ============================================
CREATE OR REPLACE FUNCTION consolidate_periodes_charge(
    p_affaire_id UUID,
    p_site_id UUID,
    p_competence_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_date DATE;
    v_charge DECIMAL(5,2);
    v_start_date DATE;
    v_end_date DATE;
    v_current_charge DECIMAL(5,2);
BEGIN
    -- Créer une table temporaire pour stocker les jours consolidés
    CREATE TEMP TABLE temp_consolidation (
        date_jour DATE,
        charge DECIMAL(5,2)
    ) ON COMMIT DROP;

    -- Collecter tous les jours ouvrés avec leur charge
    INSERT INTO temp_consolidation (date_jour, charge)
    SELECT 
        c.date,
        pc.nb_ressources
    FROM periodes_charge pc
    CROSS JOIN calendrier c
    WHERE pc.affaire_id = p_affaire_id
      AND pc.site_id = p_site_id
      AND pc.competence_id = p_competence_id
      AND c.date >= pc.date_debut
      AND c.date <= pc.date_fin
      AND c.is_business_day = TRUE;

    -- Supprimer les périodes existantes
    DELETE FROM periodes_charge
    WHERE affaire_id = p_affaire_id
      AND site_id = p_site_id
      AND competence_id = p_competence_id;

    -- Reconstruire les périodes consolidées
    v_start_date := NULL;
    v_end_date := NULL;
    v_current_charge := NULL;

    FOR v_date, v_charge IN 
        SELECT date_jour, charge 
        FROM temp_consolidation 
        ORDER BY date_jour
    LOOP
        IF v_start_date IS NULL THEN
            -- Première date
            v_start_date := v_date;
            v_end_date := v_date;
            v_current_charge := v_charge;
        ELSIF v_date = v_end_date + INTERVAL '1 day' 
              AND v_charge = v_current_charge THEN
            -- Continuer la période
            v_end_date := v_date;
        ELSE
            -- Nouvelle période : sauvegarder l'ancienne
            INSERT INTO periodes_charge (
                affaire_id, site_id, competence_id,
                date_debut, date_fin, nb_ressources
            ) VALUES (
                p_affaire_id, p_site_id, p_competence_id,
                v_start_date, v_end_date, v_current_charge
            );

            -- Commencer une nouvelle période
            v_start_date := v_date;
            v_end_date := v_date;
            v_current_charge := v_charge;
        END IF;
    END LOOP;

    -- Sauvegarder la dernière période
    IF v_start_date IS NOT NULL THEN
        INSERT INTO periodes_charge (
            affaire_id, site_id, competence_id,
            date_debut, date_fin, nb_ressources
        ) VALUES (
            p_affaire_id, p_site_id, p_competence_id,
            v_start_date, v_end_date, v_current_charge
        );
    END IF;

    DROP TABLE temp_consolidation;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION : Consolider affectations
-- ============================================
CREATE OR REPLACE FUNCTION consolidate_affectations(
    p_affaire_id UUID,
    p_site_id UUID,
    p_ressource_id UUID,
    p_competence_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_date DATE;
    v_charge DECIMAL(5,2);
    v_start_date DATE;
    v_end_date DATE;
    v_current_charge DECIMAL(5,2);
BEGIN
    -- Créer une table temporaire pour stocker les jours consolidés
    CREATE TEMP TABLE temp_consolidation_aff (
        date_jour DATE,
        charge DECIMAL(5,2)
    ) ON COMMIT DROP;

    -- Collecter tous les jours ouvrés avec leur charge
    INSERT INTO temp_consolidation_aff (date_jour, charge)
    SELECT 
        c.date,
        a.charge
    FROM affectations a
    CROSS JOIN calendrier c
    WHERE a.affaire_id = p_affaire_id
      AND a.site_id = p_site_id
      AND a.ressource_id = p_ressource_id
      AND a.competence_id = p_competence_id
      AND c.date >= a.date_debut
      AND c.date <= a.date_fin
      AND c.is_business_day = TRUE;

    -- Supprimer les affectations existantes
    DELETE FROM affectations
    WHERE affaire_id = p_affaire_id
      AND site_id = p_site_id
      AND ressource_id = p_ressource_id
      AND competence_id = p_competence_id;

    -- Reconstruire les affectations consolidées
    v_start_date := NULL;
    v_end_date := NULL;
    v_current_charge := NULL;

    FOR v_date, v_charge IN 
        SELECT date_jour, charge 
        FROM temp_consolidation_aff 
        ORDER BY date_jour
    LOOP
        IF v_start_date IS NULL THEN
            -- Première date
            v_start_date := v_date;
            v_end_date := v_date;
            v_current_charge := v_charge;
        ELSIF v_date = (
            SELECT date 
            FROM calendrier 
            WHERE date > v_end_date 
              AND is_business_day = TRUE 
            ORDER BY date 
            LIMIT 1
        ) AND v_charge = v_current_charge THEN
            -- Continuer la période (prochain jour ouvré)
            v_end_date := v_date;
        ELSE
            -- Nouvelle période : sauvegarder l'ancienne
            INSERT INTO affectations (
                affaire_id, site_id, ressource_id, competence_id,
                date_debut, date_fin, charge
            ) VALUES (
                p_affaire_id, p_site_id, p_ressource_id, p_competence_id,
                v_start_date, v_end_date, v_current_charge
            );

            -- Commencer une nouvelle période
            v_start_date := v_date;
            v_end_date := v_date;
            v_current_charge := v_charge;
        END IF;
    END LOOP;

    -- Sauvegarder la dernière période
    IF v_start_date IS NOT NULL THEN
        INSERT INTO affectations (
            affaire_id, site_id, ressource_id, competence_id,
            date_debut, date_fin, charge
        ) VALUES (
            p_affaire_id, p_site_id, p_ressource_id, p_competence_id,
            v_start_date, v_end_date, v_current_charge
        );
    END IF;

    DROP TABLE temp_consolidation_aff;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION : Générer calendrier
-- ============================================
CREATE OR REPLACE FUNCTION generate_calendrier(
    p_annee_debut INTEGER,
    p_annee_fin INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_date DATE;
    v_week_start DATE;
    v_iso_week INTEGER;
    v_iso_year INTEGER;
    v_semaine_iso TEXT;
    v_is_weekend BOOLEAN;
    v_is_holiday BOOLEAN;
    v_is_business_day BOOLEAN;
BEGIN
    -- Supprimer les dates existantes dans la plage
    DELETE FROM calendrier
    WHERE date >= DATE(p_annee_debut || '-01-01')
      AND date <= DATE(p_annee_fin || '-12-31');

    -- Générer toutes les dates
    v_date := DATE(p_annee_debut || '-01-01');
    
    WHILE v_date <= DATE(p_annee_fin || '-12-31') LOOP
        -- Calculer week_start (lundi de la semaine)
        v_week_start := v_date - (EXTRACT(DOW FROM v_date)::INTEGER - 1);
        IF EXTRACT(DOW FROM v_date) = 0 THEN
            v_week_start := v_date - 6; -- Dimanche -> lundi précédent
        END IF;

        -- Calculer ISO week et year
        v_iso_week := EXTRACT(WEEK FROM v_date);
        v_iso_year := EXTRACT(YEAR FROM v_date);
        
        -- Ajuster pour ISO (semaine commence lundi)
        IF EXTRACT(MONTH FROM v_date) = 1 AND v_iso_week >= 52 THEN
            v_iso_year := v_iso_year - 1;
        ELSIF EXTRACT(MONTH FROM v_date) = 12 AND v_iso_week = 1 THEN
            v_iso_year := v_iso_year + 1;
        END IF;

        v_semaine_iso := v_iso_year || '-' || LPAD(v_iso_week::TEXT, 2, '0');

        -- Vérifier week-end
        v_is_weekend := EXTRACT(DOW FROM v_date) IN (0, 6); -- Dimanche = 0, Samedi = 6

        -- Vérifier férié
        v_is_holiday := EXISTS (
            SELECT 1 FROM feries WHERE date = v_date
        );

        -- Calculer jour ouvré
        v_is_business_day := NOT v_is_weekend AND NOT v_is_holiday;

        -- Insérer dans le calendrier
        INSERT INTO calendrier (
            date, is_weekend, is_holiday, is_business_day,
            week_start, iso_week, iso_year, semaine_iso,
            mois_num, annee
        ) VALUES (
            v_date, v_is_weekend, v_is_holiday, v_is_business_day,
            v_week_start, v_iso_week, v_iso_year, v_semaine_iso,
            EXTRACT(MONTH FROM v_date), EXTRACT(YEAR FROM v_date)
        )
        ON CONFLICT (date) DO UPDATE SET
            is_weekend = EXCLUDED.is_weekend,
            is_holiday = EXCLUDED.is_holiday,
            is_business_day = EXCLUDED.is_business_day,
            week_start = EXCLUDED.week_start,
            iso_week = EXCLUDED.iso_week,
            iso_year = EXCLUDED.iso_year,
            semaine_iso = EXCLUDED.semaine_iso,
            mois_num = EXCLUDED.mois_num,
            annee = EXCLUDED.annee;

        v_date := v_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 ROW LEVEL SECURITY (RLS)

```sql
-- ============================================
-- Activer RLS sur toutes les tables
-- ============================================
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources_competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodes_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interims ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feries ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Politiques : Lecture (tous les utilisateurs authentifiés)
-- ============================================
CREATE POLICY "Authenticated users can read sites"
    ON sites FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read affaires"
    ON affaires FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read competences"
    ON competences FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ressources"
    ON ressources FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ressources_competences"
    ON ressources_competences FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read calendrier"
    ON calendrier FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read periodes_charge"
    ON periodes_charge FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read affectations"
    ON affectations FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read absences"
    ON absences FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read transferts"
    ON transferts FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read interims"
    ON interims FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read chantiers"
    ON chantiers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read etats_chantiers"
    ON etats_chantiers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read alertes"
    ON alertes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read feries"
    ON feries FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read parametres"
    ON parametres FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- Politiques : Écriture (tous les utilisateurs authentifiés)
-- ============================================
CREATE POLICY "Authenticated users can insert sites"
    ON sites FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sites"
    ON sites FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sites"
    ON sites FOR DELETE
    USING (auth.role() = 'authenticated');

-- Répéter pour toutes les tables...
-- (Pour simplifier, on peut créer une fonction générique)

-- ============================================
-- Fonction générique pour créer les politiques
-- ============================================
CREATE OR REPLACE FUNCTION create_rls_policies_for_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE POLICY "Authenticated users can insert %s"
            ON %I FOR INSERT
            WITH CHECK (auth.role() = ''authenticated'');
    ', table_name, table_name);

    EXECUTE format('
        CREATE POLICY "Authenticated users can update %s"
            ON %I FOR UPDATE
            USING (auth.role() = ''authenticated'');
    ', table_name, table_name);

    EXECUTE format('
        CREATE POLICY "Authenticated users can delete %s"
            ON %I FOR DELETE
            USING (auth.role() = ''authenticated'');
    ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur toutes les tables
SELECT create_rls_policies_for_table('affaires');
SELECT create_rls_policies_for_table('competences');
SELECT create_rls_policies_for_table('ressources');
SELECT create_rls_policies_for_table('ressources_competences');
SELECT create_rls_policies_for_table('periodes_charge');
SELECT create_rls_policies_for_table('affectations');
SELECT create_rls_policies_for_table('absences');
SELECT create_rls_policies_for_table('transferts');
SELECT create_rls_policies_for_table('interims');
SELECT create_rls_policies_for_table('chantiers');
SELECT create_rls_policies_for_table('etats_chantiers');
SELECT create_rls_policies_for_table('alertes');
SELECT create_rls_policies_for_table('feries');
SELECT create_rls_policies_for_table('parametres');
```

---

## 💻 STRUCTURE PROJET NEXT.JS

```
plan-de-charge-web/
├── .env.local                    # Variables d'environnement
├── .gitignore
├── next.config.js                # Configuration Next.js
├── tailwind.config.js            # Configuration Tailwind
├── tsconfig.json                 # Configuration TypeScript
├── package.json
├── vercel.json                   # Configuration Vercel
│
├── public/                       # Assets statiques
│   ├── images/
│   └── icons/
│
├── src/
│   ├── app/                      # App Router (Next.js 14)
│   │   ├── layout.tsx           # Layout principal
│   │   ├── page.tsx              # Page d'accueil
│   │   ├── login/
│   │   │   └── page.tsx          # Page de connexion
│   │   ├── charge/
│   │   │   └── page.tsx          # Page de saisie charge
│   │   ├── affectations/
│   │   │   └── page.tsx          # Page affectations
│   │   ├── absences/
│   │   │   └── page.tsx          # Page absences
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Dashboard
│   │   ├── gantt/
│   │   │   └── page.tsx          # Planning Gantt
│   │   └── api/                  # API Routes (si nécessaire)
│   │       ├── consolidate/
│   │       │   └── route.ts
│   │       └── migrate/
│   │           └── route.ts
│   │
│   ├── components/               # Composants React
│   │   ├── ui/                   # Composants UI (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── calendar.tsx
│   │   │   └── dialog.tsx
│   │   │
│   │   ├── charge/
│   │   │   ├── GrilleCharge.tsx
│   │   │   ├── CelluleCharge.tsx
│   │   │   ├── SelecteurAffaire.tsx
│   │   │   └── SelecteurPrecision.tsx
│   │   │
│   │   ├── affectations/
│   │   │   ├── GrilleAffectations.tsx
│   │   │   ├── BlocCompetence.tsx
│   │   │   ├── ListeRessources.tsx
│   │   │   └── ValidationConflits.tsx
│   │   │
│   │   ├── absences/
│   │   │   ├── ListeAbsences.tsx
│   │   │   ├── FormulaireAbsence.tsx
│   │   │   └── ValidationAbsence.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GraphiqueCharge.tsx
│   │   │   ├── TableauAffectations.tsx
│   │   │   └── Indicateurs.tsx
│   │   │
│   │   ├── gantt/
│   │   │   ├── GanttChart.tsx
│   │   │   ├── LigneRessource.tsx
│   │   │   └── Legende.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   │
│   ├── lib/                      # Utilitaires
│   │   ├── supabase/
│   │   │   ├── client.ts         # Client Supabase (browser)
│   │   │   ├── server.ts         # Client Supabase (server)
│   │   │   └── middleware.ts    # Middleware auth
│   │   │
│   │   ├── hooks/                # Hooks personnalisés
│   │   │   ├── useCharge.ts
│   │   │   ├── useAffectations.ts
│   │   │   ├── useAbsences.ts
│   │   │   ├── useRealtime.ts
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── calendar.ts       # Fonctions calendrier
│   │   │   ├── validation.ts     # Validation données
│   │   │   ├── consolidation.ts  # Consolidation
│   │   │   └── format.ts         # Formatage
│   │   │
│   │   └── types/                 # Types TypeScript
│   │       ├── database.ts        # Types générés Supabase
│   │       ├── charge.ts
│   │       ├── affectations.ts
│   │       └── ressources.ts
│   │
│   └── store/                     # State management (Zustand)
│       ├── chargeStore.ts
│       ├── affectationsStore.ts
│       └── authStore.ts
│
└── scripts/                       # Scripts utilitaires
    ├── migrate-excel.ts           # Migration Excel → Supabase
    ├── generate-calendar.ts       # Génération calendrier
    └── seed-data.ts               # Données de test
```

---

## 📦 PACKAGE.JSON

```json
{
  "name": "plan-de-charge-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "generate-types": "supabase gen types typescript --local > src/lib/types/database.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.3",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "date-fns": "^3.0.6",
    "recharts": "^2.10.3",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.309.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-calendar": "^1.0.0",
    "react-day-picker": "^8.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.33",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.1.0"
  }
}
```

---

## 🔧 CONFIGURATION SUPABASE CLIENT

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

---

## 🎨 EXEMPLE COMPOSANT CHARGE

```typescript
// src/app/charge/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GrilleCharge } from '@/components/charge/GrilleCharge'
import { SelecteurAffaire } from '@/components/charge/SelecteurAffaire'
import { SelecteurPrecision } from '@/components/charge/SelecteurPrecision'
import { useRealtime } from '@/lib/hooks/useRealtime'

export default function ChargePage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [affaireId, setAffaireId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [dateDebut, setDateDebut] = useState<Date>(new Date())
  const [dateFin, setDateFin] = useState<Date>(new Date())
  const [precision, setPrecision] = useState<'JOUR' | 'SEMAINE' | 'MOIS'>('JOUR')

  // Charger les périodes de charge
  const { data: periodes, isLoading } = useQuery({
    queryKey: ['periodes_charge', affaireId, siteId],
    queryFn: async () => {
      if (!affaireId || !siteId) return []
      
      const { data, error } = await supabase
        .from('periodes_charge')
        .select(`
          *,
          affaires(*),
          competences(*)
        `)
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)
        .order('date_debut', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!affaireId && !!siteId
  })

  // Écouter les changements en temps réel
  useRealtime('periodes_charge', {
    filter: `affaire_id=eq.${affaireId}`,
    callback: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  // Mutation pour sauvegarder une période
  const saveMutation = useMutation({
    mutationFn: async (periode: {
      affaire_id: string
      site_id: string
      competence_id: string
      date_debut: Date
      date_fin: Date
      nb_ressources: number
    }) => {
      const { data, error } = await supabase
        .from('periodes_charge')
        .upsert(periode, {
          onConflict: 'affaire_id,site_id,competence_id,date_debut,date_fin'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  // Mutation pour consolider
  const consolidateMutation = useMutation({
    mutationFn: async (params: {
      affaire_id: string
      site_id: string
      competence_id: string
    }) => {
      const { data, error } = await supabase.rpc('consolidate_periodes_charge', params)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Planification de Charge</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SelecteurAffaire
          value={affaireId}
          onChange={setAffaireId}
          onSiteChange={setSiteId}
        />
        <SelecteurPrecision
          value={precision}
          onChange={setPrecision}
        />
        {/* Sélecteurs de dates */}
      </div>

      {affaireId && siteId && (
        <GrilleCharge
          affaireId={affaireId}
          siteId={siteId}
          dateDebut={dateDebut}
          dateFin={dateFin}
          precision={precision}
          periodes={periodes || []}
          onSave={saveMutation.mutate}
          onConsolidate={consolidateMutation.mutate}
          loading={isLoading}
        />
      )}
    </div>
  )
}
```

---

## 🎨 COMPOSANT GRILLE CHARGE

```typescript
// src/components/charge/GrilleCharge.tsx
'use client'

import { useState, useMemo } from 'react'
import { format, eachDayOfInterval, startOfWeek, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CelluleCharge } from './CelluleCharge'
import { createClient } from '@/lib/supabase/client'
import { businessDaysBetween } from '@/lib/utils/calendar'

interface GrilleChargeProps {
  affaireId: string
  siteId: string
  dateDebut: Date
  dateFin: Date
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  periodes: any[]
  onSave: (periode: any) => void
  onConsolidate: (params: any) => void
  loading: boolean
}

export function GrilleCharge({
  affaireId,
  siteId,
  dateDebut,
  dateFin,
  precision,
  periodes,
  onSave,
  onConsolidate,
  loading
}: GrilleChargeProps) {
  const supabase = createClient()
  const [competences, setCompetences] = useState<any[]>([])

  // Charger les compétences
  useEffect(() => {
    const loadCompetences = async () => {
      const { data, error } = await supabase
        .from('competences')
        .select('*')
        .order('competence', { ascending: true })

      if (!error && data) {
        setCompetences(data)
      }
    }
    loadCompetences()
  }, [])

  // Générer les colonnes selon la précision
  const colonnes = useMemo(() => {
    if (precision === 'JOUR') {
      return eachDayOfInterval({ start: dateDebut, end: dateFin })
    } else if (precision === 'SEMAINE') {
      const weeks: Date[] = []
      let current = startOfWeek(dateDebut, { weekStartsOn: 1 })
      while (current <= dateFin) {
        weeks.push(current)
        current = addDays(current, 7)
      }
      return weeks
    } else {
      // MOIS
      const months: Date[] = []
      let current = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 1)
      while (current <= dateFin) {
        months.push(current)
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      }
      return months
    }
  }, [dateDebut, dateFin, precision])

  // Construire la grille depuis les périodes
  const grille = useMemo(() => {
    const map = new Map<string, number>()
    
    periodes.forEach(periode => {
      const compId = periode.competence_id
      const dates = precision === 'JOUR'
        ? eachDayOfInterval({ start: new Date(periode.date_debut), end: new Date(periode.date_fin) })
        : [new Date(periode.date_debut)]
      
      dates.forEach(date => {
        const key = `${compId}-${format(date, 'yyyy-MM-dd')}`
        map.set(key, periode.nb_ressources)
      })
    })
    
    return map
  }, [periodes, precision])

  const handleCellChange = async (competenceId: string, date: Date, value: number) => {
    if (value === 0) {
      // Supprimer la période
      // TODO: Implémenter suppression
      return
    }

    // Sauvegarder la période
    onSave({
      affaire_id: affaireId,
      site_id: siteId,
      competence_id: competenceId,
      date_debut: date,
      date_fin: date,
      nb_ressources: value
    })
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-100">Compétence</th>
            {colonnes.map((date, idx) => (
              <th key={idx} className="border p-2 bg-gray-100 text-center">
                {format(date, precision === 'JOUR' ? 'dd/MM' : 'dd MMM', { locale: fr })}
              </th>
            ))}
            <th className="border p-2 bg-gray-100">Total</th>
          </tr>
        </thead>
        <tbody>
          {competences.map(comp => (
            <tr key={comp.id}>
              <td className="border p-2 font-medium">{comp.competence}</td>
              {colonnes.map((date, idx) => {
                const key = `${comp.id}-${format(date, 'yyyy-MM-dd')}`
                const value = grille.get(key) || 0
                
                return (
                  <td key={idx} className="border p-1">
                    <CelluleCharge
                      value={value}
                      onChange={(newValue) => handleCellChange(comp.id, date, newValue)}
                    />
                  </td>
                )
              })}
              <td className="border p-2 text-center font-bold">
                {Array.from(grille.entries())
                  .filter(([key]) => key.startsWith(`${comp.id}-`))
                  .reduce((sum, [, val]) => sum + val, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            competences.forEach(comp => {
              onConsolidate({
                affaire_id: affaireId,
                site_id: siteId,
                competence_id: comp.id
              })
            })
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Consolider toutes les compétences
        </button>
      </div>
    </div>
  )
}
```

---

## 🔄 HOOK REALTIME

```typescript
// src/lib/hooks/useRealtime.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
}

export function useRealtime({ table, filter, callback }: UseRealtimeOptions) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, callback])
}
```

---

## 🚀 DÉPLOIEMENT VERCEL

### Configuration Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

---

## 📊 MIGRATION DES DONNÉES EXCEL

```typescript
// scripts/migrate-excel.ts
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key pour bypass RLS
)

async function migrateFromExcel(filePath: string) {
  // Lire le fichier Excel
  const workbook = XLSX.readFile(filePath)
  
  // Migrer les sites
  const sitesSheet = workbook.Sheets['Sites']
  if (sitesSheet) {
    const sites = XLSX.utils.sheet_to_json(sitesSheet)
    for (const site of sites) {
      await supabase.from('sites').upsert({
        site_key: site.SiteKey,
        site_name: site.Site,
        site_map: site.SiteMap,
        region: site.Region,
        centre_ouest: site.CentreOuest
      })
    }
  }

  // Migrer les affaires
  const affairesSheet = workbook.Sheets['Affaires']
  if (affairesSheet) {
    const affaires = XLSX.utils.sheet_to_json(affairesSheet)
    for (const affaire of affaires) {
      // Récupérer le site_id
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('site_key', affaire.Site)
        .single()

      if (site) {
        await supabase.from('affaires').upsert({
          affaire_id: affaire.AffaireID,
          site_id: site.id,
          libelle: affaire.Libelle
        })
      }
    }
  }

  // Migrer les ressources
  const ressourcesSheet = workbook.Sheets['Ressources']
  if (ressourcesSheet) {
    const ressources = XLSX.utils.sheet_to_json(ressourcesSheet)
    for (const ressource of ressources) {
      // Récupérer le site_id
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('site_key', ressource.Site)
        .single()

      if (site) {
        const { data: res } = await supabase
          .from('ressources')
          .insert({
            nom_prenom: ressource.NomPrenom,
            site_id: site.id,
            type_contrat: ressource.TypeContrat,
            actif: ressource.Actif === 'OUI',
            date_fin: ressource.DateFin || null
          })
          .select()
          .single()

        // Migrer les compétences
        if (res) {
          const competences = Object.keys(ressource)
            .filter(key => !['NomPrenom', 'TypeContrat', 'Site', 'Responsable', 'Actif', 'DateFin'].includes(key))
            .filter(key => ressource[key] === 'P' || ressource[key] === 'X')

          for (const compName of competences) {
            // Récupérer ou créer la compétence
            let { data: comp } = await supabase
              .from('competences')
              .select('id')
              .eq('competence', compName)
              .single()

            if (!comp) {
              const { data: newComp } = await supabase
                .from('competences')
                .insert({ competence: compName })
                .select()
                .single()
              comp = newComp
            }

            if (comp) {
              await supabase.from('ressources_competences').insert({
                ressource_id: res.id,
                competence_id: comp.id,
                type_comp: ressource[compName] === 'P' ? 'P' : 'S'
              })
            }
          }
        }
      }
    }
  }

  // Migrer les périodes de charge
  const periodesSheet = workbook.Sheets['PériodesAffaire']
  if (periodesSheet) {
    const periodes = XLSX.utils.sheet_to_json(periodesSheet)
    for (const periode of periodes) {
      // Récupérer les IDs
      const { data: affaire } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', periode.AffaireID)
        .single()

      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('site_key', periode.Site)
        .single()

      const { data: comp } = await supabase
        .from('competences')
        .select('id')
        .eq('competence', periode.Comp)
        .single()

      if (affaire && site && comp) {
        await supabase.from('periodes_charge').insert({
          affaire_id: affaire.id,
          site_id: site.id,
          competence_id: comp.id,
          date_debut: new Date(periode.DateDébut),
          date_fin: new Date(periode.DateFin),
          nb_ressources: periode.NbRessources
        })
      }
    }
  }

  // Répéter pour affectations, absences, etc.
  console.log('Migration terminée!')
}

// Exécuter
migrateFromExcel('./PlanDeCharge.xlsm')
```

---

## 📋 CHECKLIST DE MIGRATION

### Phase 1 : Setup (Semaine 1-2)
- [ ] Créer projet Supabase
- [ ] Exécuter le schéma SQL complet
- [ ] Configurer l'authentification
- [ ] Créer projet Next.js
- [ ] Configurer Tailwind CSS + shadcn/ui
- [ ] Setup Supabase client

### Phase 2 : Core Features (Semaine 3-6)
- [ ] Page de connexion
- [ ] Module Charge (grille + saisie)
- [ ] Module Affectations (grille + validation)
- [ ] Module Absences (liste + formulaire)
- [ ] Dashboard de base

### Phase 3 : Features Avancées (Semaine 7-10)
- [ ] Transferts
- [ ] Intérims
- [ ] Chantiers
- [ ] Alertes
- [ ] Gantt

### Phase 4 : Migration Données (Semaine 11-12)
- [ ] Script de migration Excel → Supabase
- [ ] Validation des données
- [ ] Tests utilisateurs

### Phase 5 : Déploiement (Semaine 13-14)
- [ ] Déploiement Vercel
- [ ] Configuration production
- [ ] Formation utilisateurs

---

## 💰 COÛTS ESTIMÉS

### Supabase
- **Gratuit** : Jusqu'à 500MB DB, 1GB bande passante
- **Pro** : 25€/mois - 8GB DB, 50GB bande passante
- **Team** : 599€/mois - Illimité

### Vercel
- **Gratuit** : 100GB bande passante/mois
- **Pro** : 20€/mois - 1TB bande passante

### Total
- **Petite équipe (< 10 users)** : **GRATUIT**
- **Équipe moyenne (10-50 users)** : **~45€/mois**
- **Grande équipe (50+ users)** : **~600€/mois**

---

## ✅ AVANTAGES

1. **Performance** : 10-100x plus rapide qu'Excel partagé
2. **Temps réel** : Synchronisation automatique entre utilisateurs
3. **Mobile** : Interface responsive, fonctionne sur tous les appareils
4. **Maintenance** : Code moderne TypeScript, facile à maintenir
5. **Scalabilité** : Supporte des centaines d'utilisateurs simultanés
6. **Coût** : Gratuit pour petites équipes, abordable pour grandes
7. **Sécurité** : Row Level Security, authentification intégrée
8. **Backup** : Sauvegardes automatiques Supabase

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Architecture complète prête à implémenter
