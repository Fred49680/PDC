# 🔐 CONFIGURATION SUPABASE - VOS CLÉS

## ✅ VOS INFORMATIONS SUPABASE

Vos clés Supabase ont été configurées :

- **URL** : `https://dkfkkpddityvxjuxtugp.supabase.co`
- **Anon Key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 📁 FICHIER .ENV.LOCAL

Le fichier `.env.local` a été créé avec vos clés.

**⚠️ IMPORTANT** : Ce fichier contient des informations sensibles. Ne le commitez **JAMAIS** dans Git !

Ajoutez-le au `.gitignore` :

```gitignore
# .gitignore
.env.local
.env*.local
```

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Créer le projet Next.js

```bash
npx create-next-app@latest plan-de-charge-web --typescript --tailwind --app --yes
cd plan-de-charge-web
```

### 2. Copier le fichier .env.local

Copiez le fichier `.env.local` créé dans le dossier du projet :

```bash
# Depuis le dossier "plan de charge"
cp .env.local ../plan-de-charge-web/.env.local
```

### 3. Installer les dépendances

```bash
cd plan-de-charge-web
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand date-fns react-hook-form zod clsx tailwind-merge lucide-react
npm install -D @types/node @types/react @types/react-dom
```

### 4. Créer le client Supabase

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 5. Tester la connexion

```typescript
// src/app/test-supabase/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('Test en cours...')
  const [tables, setTables] = useState<string[]>([])

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient()
        
        // Tester la connexion
        const { data, error } = await supabase.from('sites').select('count').limit(1)
        
        if (error) {
          setStatus(`❌ Erreur : ${error.message}`)
        } else {
          setStatus('✅ Connexion Supabase réussie !')
          
          // Lister les tables disponibles
          // Note: Supabase ne permet pas de lister les tables directement
          // Il faut les connaître à l'avance
          setTables(['sites', 'affaires', 'competences', 'ressources', 'periodes_charge', 'affectations'])
        }
      } catch (err: any) {
        setStatus(`❌ Erreur : ${err.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Connexion Supabase</h1>
      <p className="mb-4">{status}</p>
      {tables.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Tables disponibles :</h2>
          <ul className="list-disc list-inside">
            {tables.map(table => (
              <li key={table}>{table}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

---

## 📊 EXÉCUTER LE SCHÉMA SQL

### Étape 1 : Accéder à l'éditeur SQL Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet : `dkfkkpddityvxjuxtugp`
3. Cliquer sur "SQL Editor" dans le menu de gauche

### Étape 2 : Exécuter le schéma

1. Ouvrir le fichier `ARCHITECTURE_VERCEL_SUPABASE.md`
2. Copier toute la section SQL (tables, fonctions, triggers, RLS)
3. Coller dans l'éditeur SQL de Supabase
4. Cliquer sur "Run" ou `Ctrl+Enter`

### Étape 3 : Vérifier les tables

Dans Supabase Dashboard > Table Editor, vous devriez voir :
- ✅ `sites`
- ✅ `affaires`
- ✅ `competences`
- ✅ `ressources`
- ✅ `ressources_competences`
- ✅ `calendrier`
- ✅ `periodes_charge`
- ✅ `affectations`
- ✅ `absences`
- ✅ `transferts`
- ✅ `interims`
- ✅ `chantiers`
- ✅ `etats_chantiers`
- ✅ `alertes`
- ✅ `feries`
- ✅ `parametres`

---

## 🔐 RÉCUPÉRER LA SERVICE KEY (optionnel)

Pour les migrations et scripts avancés, vous aurez besoin de la **Service Key** :

1. Aller dans Supabase Dashboard > Settings > API
2. Copier la **service_role key** (⚠️ SECRÈTE, ne jamais exposer côté client)
3. Ajouter dans `.env.local` :

```bash
SUPABASE_SERVICE_KEY=votre-service-key-ici
```

**⚠️ ATTENTION** : Cette clé a tous les droits. Ne l'utilisez **QUE** côté serveur (API routes, migrations).

---

## ✅ VÉRIFICATION

### Test rapide de connexion

```typescript
// Créer un fichier test : src/app/test/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestPage() {
  const [result, setResult] = useState<string>('Chargement...')

  useEffect(() => {
    const test = async () => {
      const supabase = createClient()
      
      // Test simple : lire une table (même vide)
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .limit(1)

      if (error) {
        setResult(`❌ Erreur : ${error.message}`)
      } else {
        setResult('✅ Connexion Supabase OK !')
      }
    }

    test()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Supabase</h1>
      <p>{result}</p>
    </div>
  )
}
```

Accéder à `http://localhost:3000/test` pour vérifier.

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ **Configuration Supabase** : Fait (vos clés sont configurées)
2. ⏳ **Exécuter le schéma SQL** : À faire dans Supabase Dashboard
3. ⏳ **Créer les composants** : Utiliser les exemples dans `INTERFACE_MODULE_CHARGE.md`
4. ⏳ **Tester localement** : `npm run dev`
5. ⏳ **Déployer sur Vercel** : Connecter le repo Git

---

## 📝 NOTES IMPORTANTES

### Sécurité

- ✅ **Anon Key** : Peut être exposée côté client (c'est son rôle)
- ❌ **Service Key** : JAMAIS côté client, uniquement serveur/API

### Variables d'environnement

- `.env.local` : Variables locales (non commitées)
- `.env.production` : Variables pour production (à configurer dans Vercel)

### Vercel

Lors du déploiement sur Vercel, ajouter les variables dans :
- Vercel Dashboard > Project > Settings > Environment Variables

---

**Votre configuration Supabase est prête !** 🚀

Prochaine étape : Exécuter le schéma SQL dans Supabase Dashboard.
