# 🌐 SOLUTION WEB MODERNE - SUPABASE + REACT

## 🎯 POURQUOI QUITTER EXCEL ?

### Problèmes actuels avec Excel
- ❌ **Performance** : Fichier partagé = très lent
- ❌ **Concurrence** : Conflits de verrous, pertes de données
- ❌ **Accessibilité** : Nécessite Excel installé, pas mobile
- ❌ **Maintenance** : Code VBA difficile à maintenir
- ❌ **Scalabilité** : Limite à ~10-20 utilisateurs simultanés
- ❌ **Coût** : Licences Excel + serveur

### Avantages d'une solution web
- ✅ **Performance** : Base de données optimisée, requêtes rapides
- ✅ **Concurrence** : Transactions ACID, pas de conflits
- ✅ **Accessibilité** : Navigateur web, mobile-friendly
- ✅ **Maintenance** : Code moderne, versioning Git
- ✅ **Scalabilité** : Supporte des centaines d'utilisateurs
- ✅ **Coût** : Supabase gratuit jusqu'à 500MB, puis ~25€/mois

---

## 🏗️ ARCHITECTURE PROPOSÉE

### Stack technologique

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND : React + TypeScript + Tailwind CSS           │
│  - Interface utilisateur moderne                        │
│  - Responsive (mobile/tablette/desktop)                 │
│  - Temps réel avec Supabase Realtime                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ (API REST + WebSocket)
                       │
┌──────────────────────▼──────────────────────────────────┐
│  BACKEND : Supabase (PostgreSQL + Auth + Storage)      │
│  - Base de données PostgreSQL                          │
│  - Authentification intégrée                            │
│  - Row Level Security (RLS)                             │
│  - Storage pour fichiers                                │
│  - Realtime pour synchronisation                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  SERVICES SUPPLÉMENTAIRES                              │
│  - Vercel/Netlify : Hébergement frontend               │
│  - GitHub Actions : CI/CD                              │
│  - Sentry : Monitoring erreurs                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 STRUCTURE DE LA BASE DE DONNÉES

### Schéma PostgreSQL (Supabase)

```sql
-- ============================================
-- TABLE : affaires
-- ============================================
CREATE TABLE affaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id TEXT NOT NULL UNIQUE,
    site TEXT NOT NULL,
    libelle TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW(),
    actif BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TABLE : ressources
-- ============================================
CREATE TABLE ressources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    site TEXT NOT NULL,
    type_contrat TEXT, -- 'CDI', 'CDD', 'ETT', etc.
    date_debut_contrat DATE,
    date_fin_contrat DATE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : ressources_competences
-- ============================================
CREATE TABLE ressources_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    competence TEXT NOT NULL,
    niveau TEXT, -- 'Junior', 'Senior', etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : periodes_charge (besoins)
-- ============================================
CREATE TABLE periodes_charge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site TEXT NOT NULL,
    competence TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    nb_ressources INTEGER NOT NULL CHECK (nb_ressources > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_periode UNIQUE (affaire_id, site, competence, date_debut, date_fin)
);

-- ============================================
-- TABLE : affectations
-- ============================================
CREATE TABLE affectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site TEXT NOT NULL,
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    competence TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    charge DECIMAL(5,2) NOT NULL, -- Jours ouvrés
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_affectations_ressource ON affectations(ressource_id, date_debut, date_fin);
CREATE INDEX idx_affectations_affaire ON affectations(affaire_id, date_debut, date_fin);

-- ============================================
-- TABLE : absences
-- ============================================
CREATE TABLE absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type TEXT NOT NULL, -- 'Formation', 'Congés payés', 'Maladie', etc.
    competence TEXT, -- Optionnel
    commentaire TEXT,
    validation_saisie TEXT DEFAULT 'Non', -- 'Oui' / 'Non'
    saisi_par UUID REFERENCES auth.users(id),
    date_saisie TIMESTAMP DEFAULT NOW(),
    valide_par UUID REFERENCES auth.users(id),
    date_validation TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : transferts
-- ============================================
CREATE TABLE transferts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site_origine TEXT NOT NULL,
    site_destination TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut TEXT NOT NULL DEFAULT 'Planifié', -- 'Planifié' / 'Appliqué'
    date_creation TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT check_dates CHECK (date_fin >= date_debut)
);

-- ============================================
-- TABLE : interims
-- ============================================
CREATE TABLE interims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ressource_id UUID REFERENCES ressources(id) ON DELETE CASCADE,
    site TEXT NOT NULL,
    date_debut_contrat DATE NOT NULL,
    date_fin_contrat DATE NOT NULL,
    a_renouveler TEXT DEFAULT 'A renouveler', -- 'A renouveler' / 'Oui' / 'Non'
    date_mise_a_jour TIMESTAMP DEFAULT NOW(),
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : chantiers
-- ============================================
CREATE TABLE chantiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chantier_id TEXT NOT NULL UNIQUE,
    affaire_id UUID REFERENCES affaires(id) ON DELETE CASCADE,
    site TEXT NOT NULL,
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

-- ============================================
-- TABLE : etats_chantiers (historique)
-- ============================================
CREATE TABLE etats_chantiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chantier_id UUID REFERENCES chantiers(id) ON DELETE CASCADE,
    etat TEXT NOT NULL,
    date_changement TIMESTAMP DEFAULT NOW(),
    nombre_jours INTEGER,
    commentaire TEXT,
    changed_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TABLE : alertes
-- ============================================
CREATE TABLE alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prise_en_compte TEXT DEFAULT 'Non', -- 'Oui' / 'Non'
    courrier_statut TEXT DEFAULT 'A envoyer', -- 'A envoyer' / 'Envoyé'
    date_action TIMESTAMP,
    type_alerte TEXT NOT NULL,
    ressource_id UUID REFERENCES ressources(id) ON DELETE SET NULL,
    affaire_id UUID REFERENCES affaires(id) ON DELETE SET NULL,
    site TEXT,
    competence TEXT,
    date_debut DATE,
    date_fin DATE,
    action TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE : calendrier (jours ouvrés)
-- ============================================
CREATE TABLE calendrier (
    date DATE PRIMARY KEY,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    is_business_day BOOLEAN NOT NULL,
    week_start DATE,
    iso_week INTEGER,
    iso_year INTEGER,
    semaine_iso TEXT
);

-- Index pour performance
CREATE INDEX idx_calendrier_date ON calendrier(date);
CREATE INDEX idx_calendrier_business ON calendrier(is_business_day, date);

-- ============================================
-- FONCTIONS ET TRIGGERS
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
CREATE TRIGGER update_periodes_charge_updated_at
    BEFORE UPDATE ON periodes_charge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affectations_updated_at
    BEFORE UPDATE ON affectations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_absences_updated_at
    BEFORE UPDATE ON absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chantiers_updated_at
    BEFORE UPDATE ON chantiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour calculer les jours ouvrés entre deux dates
CREATE OR REPLACE FUNCTION business_days_between(date_start DATE, date_end DATE)
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
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier les conflits d'affectation
CREATE OR REPLACE FUNCTION check_affectation_conflict(
    p_ressource_id UUID,
    p_date_debut DATE,
    p_date_fin DATE,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM affectations a
    WHERE a.ressource_id = p_ressource_id
      AND a.date_debut <= p_date_fin
      AND a.date_fin >= p_date_debut
      AND (p_exclude_id IS NULL OR a.id != p_exclude_id);
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si une ressource est absente
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
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE affaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodes_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interims ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;

-- Politique : Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Users can read all data"
    ON affaires FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read all data"
    ON ressources FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read all data"
    ON periodes_charge FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read all data"
    ON affectations FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read all data"
    ON absences FOR SELECT
    USING (auth.role() = 'authenticated');

-- Politique : Tous les utilisateurs authentifiés peuvent modifier
CREATE POLICY "Users can modify data"
    ON affaires FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can modify data"
    ON periodes_charge FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can modify data"
    ON affectations FOR ALL
    USING (auth.role() = 'authenticated');

-- Note : Ajuster les politiques selon vos besoins de sécurité
```

---

## 💻 FRONTEND : React + TypeScript

### Structure du projet

```
plan-de-charge-web/
├── src/
│   ├── components/
│   │   ├── Charge/
│   │   │   ├── GrilleCharge.tsx
│   │   │   ├── SaisieCharge.tsx
│   │   │   └── Consolidation.tsx
│   │   ├── Affectations/
│   │   │   ├── GrilleAffectations.tsx
│   │   │   ├── BlocCompetence.tsx
│   │   │   └── ValidationConflits.tsx
│   │   ├── Absences/
│   │   │   ├── ListeAbsences.tsx
│   │   │   ├── FormulaireAbsence.tsx
│   │   │   └── ValidationAbsence.tsx
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Graphiques.tsx
│   │   │   └── Tableaux.tsx
│   │   └── Common/
│   │       ├── Layout.tsx
│   │       ├── Navigation.tsx
│   │       └── Loading.tsx
│   ├── hooks/
│   │   ├── useCharge.ts
│   │   ├── useAffectations.ts
│   │   ├── useAbsences.ts
│   │   └── useRealtime.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── api.ts
│   │   └── cache.ts
│   ├── types/
│   │   ├── charge.ts
│   │   ├── affectations.ts
│   │   └── ressources.ts
│   ├── utils/
│   │   ├── calendar.ts
│   │   ├── validation.ts
│   │   └── consolidation.ts
│   └── App.tsx
├── package.json
└── tsconfig.json
```

### Exemple de composant React

```typescript
// src/components/Charge/GrilleCharge.tsx
import React, { useState, useEffect } from 'react';
import { useCharge } from '../../hooks/useCharge';
import { useRealtime } from '../../hooks/useRealtime';
import { Affaire, Competence, PeriodeCharge } from '../../types/charge';

interface GrilleChargeProps {
  affaireId: string;
  site: string;
  dateDebut: Date;
  dateFin: Date;
  precision: 'JOUR' | 'SEMAINE' | 'MOIS';
}

export const GrilleCharge: React.FC<GrilleChargeProps> = ({
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision
}) => {
  const { periodes, loading, error, savePeriode, consolidate } = useCharge(affaireId, site);
  const [grille, setGrille] = useState<Map<string, number>>(new Map());

  // Écouter les changements en temps réel
  useRealtime('periodes_charge', {
    filter: `affaire_id=eq.${affaireId}`,
    callback: (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        // Rafraîchir la grille
        loadGrille();
      }
    }
  });

  const loadGrille = async () => {
    // Charger les périodes et construire la grille
    // ...
  };

  const handleCellChange = async (competence: string, date: Date, value: number) => {
    try {
      await savePeriode({
        affaire_id: affaireId,
        site,
        competence,
        date_debut: date,
        date_fin: date,
        nb_ressources: value
      });
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div className="grille-charge">
      <table>
        <thead>
          <tr>
            <th>Compétence</th>
            {/* Colonnes de dates */}
          </tr>
        </thead>
        <tbody>
          {/* Lignes de compétences avec cellules éditables */}
        </tbody>
      </table>
      <button onClick={consolidate}>Consolider</button>
    </div>
  );
};
```

### Hook personnalisé pour Supabase

```typescript
// src/hooks/useCharge.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { PeriodeCharge } from '../types/charge';

export const useCharge = (affaireId: string, site: string) => {
  const [periodes, setPeriodes] = useState<PeriodeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadPeriodes();
  }, [affaireId, site]);

  const loadPeriodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .order('date_debut', { ascending: true });

      if (error) throw error;
      setPeriodes(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const savePeriode = async (periode: Partial<PeriodeCharge>) => {
    try {
      const { data, error } = await supabase
        .from('periodes_charge')
        .upsert(periode, { onConflict: 'unique_periode' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const consolidate = async () => {
    // Logique de consolidation
    // Appeler une fonction PostgreSQL ou un endpoint API
  };

  return { periodes, loading, error, savePeriode, consolidate, refresh: loadPeriodes };
};
```

---

## 🔐 AUTHENTIFICATION

### Configuration Supabase Auth

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Hook d'authentification
export const useAuth = () => {
  const [user, setUser] = useState(supabase.auth.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signIn, signOut };
};
```

---

## ⚡ OPTIMISATIONS PERFORMANCE

### 1. Cache côté client

```typescript
// src/services/cache.ts
import { PeriodeCharge } from '../types/charge';

class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new CacheService();
```

### 2. Requêtes optimisées avec pagination

```typescript
// Pagination pour grandes listes
const loadPeriodesPaginated = async (page: number = 0, pageSize: number = 100) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('periodes_charge')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('date_debut', { ascending: true });

  return { data, count, hasMore: (count || 0) > to };
};
```

### 3. Temps réel optimisé

```typescript
// src/hooks/useRealtime.ts
export const useRealtime = (
  table: string,
  options: { filter?: string; callback: (payload: any) => void }
) => {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: options.filter
        },
        options.callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, options.filter]);
};
```

---

## 📱 RESPONSIVE DESIGN

### Tailwind CSS pour le design

```typescript
// Exemple de composant responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-white p-4 rounded-lg shadow">
    {/* Contenu */}
  </div>
</div>
```

---

## 🚀 DÉPLOIEMENT

### 1. Hébergement Frontend (Vercel)

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "react",
  "env": {
    "REACT_APP_SUPABASE_URL": "@supabase-url",
    "REACT_APP_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 2. Configuration Supabase

- Créer un projet sur [supabase.com](https://supabase.com)
- Configurer l'authentification (email/password)
- Importer le schéma SQL
- Configurer les politiques RLS
- Activer Realtime sur les tables nécessaires

### 3. Migration des données Excel

```typescript
// Script de migration
import { readExcel } from './utils/excel-reader';
import { supabase } from './services/supabase';

const migrateFromExcel = async (excelFile: File) => {
  const data = await readExcel(excelFile);
  
  // Migrer affaires
  await supabase.from('affaires').insert(data.affaires);
  
  // Migrer ressources
  await supabase.from('ressources').insert(data.ressources);
  
  // Migrer périodes de charge
  await supabase.from('periodes_charge').insert(data.periodes);
  
  // etc.
};
```

---

## 💰 COÛTS

### Supabase
- **Gratuit** : Jusqu'à 500MB base de données, 1GB bande passante
- **Pro** : 25€/mois - 8GB base, 50GB bande passante
- **Team** : 599€/mois - Illimité

### Vercel (Frontend)
- **Gratuit** : Pour projets personnels
- **Pro** : 20€/mois - Pour équipes

### Total estimé
- **Petite équipe (< 10 users)** : **GRATUIT**
- **Équipe moyenne (10-50 users)** : **~45€/mois**
- **Grande équipe (50+ users)** : **~600€/mois**

---

## 📊 COMPARAISON AVEC EXCEL

| Critère | Excel Partagé | Solution Web Supabase |
|---------|--------------|----------------------|
| **Performance** | ⚠️ Lent (réseau) | ✅ Rapide (base optimisée) |
| **Concurrence** | ❌ Conflits fréquents | ✅ Transactions ACID |
| **Accessibilité** | ❌ Windows + Excel requis | ✅ Navigateur web |
| **Mobile** | ❌ Non | ✅ Oui (responsive) |
| **Temps réel** | ❌ Non | ✅ Oui (WebSocket) |
| **Maintenance** | ⚠️ VBA complexe | ✅ Code moderne |
| **Scalabilité** | ❌ ~10-20 users max | ✅ Centaines d'users |
| **Coût** | 💰 Licences Excel | 💰 Gratuit à 45€/mois |
| **Backup** | ⚠️ Manuel | ✅ Automatique |
| **Versioning** | ❌ Non | ✅ Git + Supabase |

---

## 🎯 PLAN DE MIGRATION

### Phase 1 : Setup (Semaine 1-2)
1. ✅ Créer projet Supabase
2. ✅ Importer schéma SQL
3. ✅ Setup projet React
4. ✅ Configuration authentification

### Phase 2 : Développement Core (Semaine 3-6)
1. ✅ Module Charge
2. ✅ Module Affectations
3. ✅ Module Absences
4. ✅ Dashboard de base

### Phase 3 : Fonctionnalités avancées (Semaine 7-10)
1. ✅ Transferts
2. ✅ Intérims
3. ✅ Chantiers
4. ✅ Alertes

### Phase 4 : Migration données (Semaine 11-12)
1. ✅ Script de migration Excel → Supabase
2. ✅ Validation des données
3. ✅ Tests utilisateurs

### Phase 5 : Déploiement (Semaine 13-14)
1. ✅ Déploiement production
2. ✅ Formation utilisateurs
3. ✅ Support

---

## 🛠️ OUTILS DE DÉVELOPPEMENT

### Stack recommandée
- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS + Headless UI
- **State** : React Query (pour cache)
- **Forms** : React Hook Form
- **Charts** : Recharts ou Chart.js
- **Date** : date-fns
- **Testing** : Vitest + Testing Library

### Packages essentiels

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-query": "^3.39.3",
    "react-hook-form": "^7.48.2",
    "date-fns": "^2.30.0",
    "recharts": "^2.8.0",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## 📚 RESSOURCES

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Exemples de code
- [Supabase React Examples](https://github.com/supabase/supabase/tree/master/examples)
- [React Admin Dashboard](https://github.com/marmelab/react-admin)

---

## ✅ AVANTAGES FINAUX

1. **Performance** : 10-100x plus rapide qu'Excel partagé
2. **Fiabilité** : Transactions ACID, pas de pertes de données
3. **Accessibilité** : Fonctionne sur tous les appareils
4. **Maintenance** : Code moderne, facile à maintenir
5. **Évolutivité** : Facile d'ajouter des fonctionnalités
6. **Coût** : Gratuit pour petites équipes, abordable pour grandes

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Architecture proposée

