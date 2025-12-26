# 🚀 GUIDE DE DÉMARRAGE RAPIDE - SUPABASE

## 📋 PRÉREQUIS

- Node.js 18+ installé
- Compte GitHub (pour déploiement)
- Compte Supabase (gratuit) : [supabase.com](https://supabase.com)

---

## ⚡ DÉMARRAGE EN 30 MINUTES

### Étape 1 : Créer le projet Supabase (5 min)

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte (gratuit)
3. Créer un nouveau projet
   - Nom : `plan-de-charge`
   - Mot de passe : (noter quelque part)
   - Région : Choisir la plus proche (Europe pour la France)

### Étape 2 : Importer le schéma SQL (10 min)

1. Dans Supabase, aller dans **SQL Editor**
2. Copier-coller le schéma SQL depuis `SOLUTION_WEB_SUPABASE.md`
3. Exécuter le script
4. Vérifier que les tables sont créées dans **Table Editor**

### Étape 3 : Créer le projet React (5 min)

```bash
# Créer le projet
npm create vite@latest plan-de-charge-web -- --template react-ts

# Aller dans le dossier
cd plan-de-charge-web

# Installer les dépendances
npm install

# Installer Supabase et autres packages
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install react-hook-form
npm install date-fns
npm install recharts
npm install tailwindcss postcss autoprefixer
npm install -D @types/node

# Initialiser Tailwind
npx tailwindcss init -p
```

### Étape 4 : Configuration (5 min)

#### 1. Fichier `.env`

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

**Où trouver ces valeurs** :
- Dans Supabase : **Settings** → **API**
- `URL` = Project URL
- `anon key` = anon/public key

#### 2. Configuration Tailwind (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### 3. Ajouter Tailwind dans `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Étape 5 : Code de base (5 min)

#### Créer `src/services/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

#### Créer `src/types/charge.ts`

```typescript
export interface Affaire {
  id: string;
  affaire_id: string;
  site: string;
  libelle: string;
  actif: boolean;
  date_creation: string;
  date_modification: string;
}

export interface PeriodeCharge {
  id: string;
  affaire_id: string;
  site: string;
  competence: string;
  date_debut: string;
  date_fin: string;
  nb_ressources: number;
  created_at: string;
  updated_at: string;
}
```

#### Créer `src/hooks/useCharge.ts`

```typescript
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
        .upsert(periode)
        .select()
        .single();

      if (error) throw error;
      await loadPeriodes(); // Recharger
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { periodes, loading, error, savePeriode, refresh: loadPeriodes };
};
```

#### Créer un composant simple `src/App.tsx`

```typescript
import { useState } from 'react';
import { useCharge } from './hooks/useCharge';

function App() {
  const [affaireId, setAffaireId] = useState('AFF001');
  const [site, setSite] = useState('Site1');
  const { periodes, loading, error, savePeriode } = useCharge(affaireId, site);

  if (loading) return <div className="p-4">Chargement...</div>;
  if (error) return <div className="p-4 text-red-500">Erreur: {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Plan de Charge</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Affaire ID</label>
        <input
          type="text"
          value={affaireId}
          onChange={(e) => setAffaireId(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2">Site</label>
        <input
          type="text"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Périodes de charge</h2>
        <ul>
          {periodes.map((periode) => (
            <li key={periode.id} className="mb-2 p-2 bg-gray-100 rounded">
              {periode.competence} : {periode.nb_ressources} ressources
              <br />
              Du {new Date(periode.date_debut).toLocaleDateString()} au{' '}
              {new Date(periode.date_fin).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
```

### Étape 6 : Tester (5 min)

```bash
# Démarrer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

---

## 🎨 EXEMPLE COMPLET : Formulaire de saisie

### Composant `src/components/Charge/FormulaireCharge.tsx`

```typescript
import React, { useState } from 'react';
import { useCharge } from '../../hooks/useCharge';
import { PeriodeCharge } from '../../types/charge';

interface FormulaireChargeProps {
  affaireId: string;
  site: string;
}

export const FormulaireCharge: React.FC<FormulaireChargeProps> = ({
  affaireId,
  site,
}) => {
  const { savePeriode } = useCharge(affaireId, site);
  const [formData, setFormData] = useState({
    competence: '',
    date_debut: '',
    date_fin: '',
    nb_ressources: 1,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await savePeriode({
        affaire_id: affaireId,
        site,
        ...formData,
      });

      // Réinitialiser le formulaire
      setFormData({
        competence: '',
        date_debut: '',
        date_fin: '',
        nb_ressources: 1,
      });

      alert('Période enregistrée avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'enregistrement : ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Nouvelle période de charge</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Compétence</label>
        <input
          type="text"
          value={formData.competence}
          onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
          required
          className="w-full border rounded p-2"
          placeholder="IES, IEG, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date début</label>
          <input
            type="date"
            value={formData.date_debut}
            onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date fin</label>
          <input
            type="date"
            value={formData.date_fin}
            onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nombre de ressources</label>
        <input
          type="number"
          min="1"
          value={formData.nb_ressources}
          onChange={(e) =>
            setFormData({ ...formData, nb_ressources: parseInt(e.target.value) })
          }
          required
          className="w-full border rounded p-2"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
};
```

---

## 🔐 AUTHENTIFICATION

### Créer `src/hooks/useAuth.ts`

```typescript
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

### Composant de connexion `src/components/Auth/Login.tsx`

```typescript
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Login = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6">Connexion</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
};
```

---

## 📊 TEMPS RÉEL

### Hook pour écouter les changements en temps réel

```typescript
// src/hooks/useRealtime.ts
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useRealtime = (
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  filter?: string
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
          filter,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, callback]);
};
```

### Utilisation dans un composant

```typescript
import { useRealtime } from '../hooks/useRealtime';
import { useCharge } from '../hooks/useCharge';

export const GrilleCharge = ({ affaireId, site }: Props) => {
  const { periodes, refresh } = useCharge(affaireId, site);

  // Écouter les changements en temps réel
  useRealtime(
    'periodes_charge',
    (payload) => {
      if (payload.new.affaire_id === affaireId && payload.new.site === site) {
        refresh(); // Recharger les données
      }
    },
    `affaire_id=eq.${affaireId}`
  );

  // ... reste du composant
};
```

**Important** : Activer Realtime dans Supabase
1. Aller dans **Database** → **Replication**
2. Activer la réplication pour les tables nécessaires

---

## 🚀 DÉPLOIEMENT SUR VERCEL

### 1. Préparer le projet

```bash
# Build du projet
npm run build
```

### 2. Créer un compte Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Importer le projet depuis GitHub

### 3. Configurer les variables d'environnement

Dans Vercel :
- **Settings** → **Environment Variables**
- Ajouter :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 4. Déployer

Vercel détecte automatiquement Vite et déploie. Le site sera disponible sur `votre-projet.vercel.app`

---

## 📦 MIGRATION DES DONNÉES EXCEL

### Script de migration Node.js

```typescript
// scripts/migrate-excel.ts
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Utiliser service key pour migration
);

async function migrateExcel(filePath: string) {
  // Lire le fichier Excel
  const workbook = XLSX.readFile(filePath);
  
  // Migrer les affaires
  const affairesSheet = workbook.Sheets['tblAffaires'];
  const affaires = XLSX.utils.sheet_to_json(affairesSheet);
  
  for (const affaire of affaires) {
    await supabase.from('affaires').upsert({
      affaire_id: affaire['AffaireID'],
      site: affaire['Site'],
      libelle: affaire['Libelle'],
      actif: affaire['Actif'] === 'OUI',
    });
  }
  
  // Répéter pour les autres tables...
  console.log('Migration terminée !');
}

migrateExcel('./donnees.xlsx');
```

---

## 🐛 DÉPANNAGE

### Erreur : "Invalid API key"

- Vérifier que les variables d'environnement sont correctes
- Vérifier que vous utilisez la clé `anon` (pas la `service_role`)

### Erreur : "Row Level Security policy violation"

- Vérifier que les politiques RLS sont correctement configurées
- Pour le développement, désactiver temporairement RLS :
  ```sql
  ALTER TABLE periodes_charge DISABLE ROW LEVEL SECURITY;
  ```

### Erreur : "Realtime not working"

- Vérifier que Realtime est activé dans Supabase
- Vérifier que vous êtes abonné au bon canal
- Vérifier les filtres dans `useRealtime`

---

## 📚 PROCHAINES ÉTAPES

1. ✅ Ajouter l'authentification complète
2. ✅ Créer les composants pour Affectations
3. ✅ Créer les composants pour Absences
4. ✅ Créer le Dashboard avec graphiques
5. ✅ Ajouter la validation des conflits
6. ✅ Implémenter la consolidation automatique
7. ✅ Ajouter les notifications
8. ✅ Créer les rapports PDF

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Guide de démarrage

