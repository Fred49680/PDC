# ✅ Correction du Build Vercel

## 🐛 Problème identifié

**Erreur lors du build Vercel :**
```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
Error occurred prerendering page "/absences"
```

## 🔍 Cause

Le client Supabase était créé au niveau du module dans les hooks (`useCharge`, `useAbsences`, `useAffectations`), ce qui signifie qu'il était exécuté lors du chargement du module, même pendant le build statique de Next.js.

À ce moment-là :
- Les variables d'environnement peuvent ne pas être disponibles
- Le code s'exécute côté serveur (prerendering)
- Le client Supabase ne peut pas être créé sans URL valide

## ✅ Solution appliquée

### 1. **Création lazy du client Supabase**
Modification de tous les hooks pour créer le client de manière lazy (seulement quand nécessaire, côté client) :

```typescript
// AVANT (❌ Créé au niveau du module)
const supabase = createClient()

// APRÈS (✅ Créé de manière lazy)
const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be created on the client side')
  }
  return createClient()
}

// Utilisation dans les fonctions
const supabase = getSupabaseClient()
```

### 2. **Pages dynamiques**
Ajout de `export const dynamic = 'force-dynamic'` dans toutes les pages client pour éviter le pré-rendu statique :

```typescript
'use client'

export const dynamic = 'force-dynamic'

export default function Page() {
  // ...
}
```

### 3. **Validation des variables d'environnement**
Amélioration de `client.ts` pour valider les variables avant de créer le client :

```typescript
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
```

## 📝 Fichiers modifiés

### Hooks
- ✅ `src/hooks/useCharge.ts` - Création lazy du client
- ✅ `src/hooks/useAbsences.ts` - Création lazy du client
- ✅ `src/hooks/useAffectations.ts` - Création lazy du client

### Pages
- ✅ `src/app/absences/page.tsx` - Ajout `export const dynamic = 'force-dynamic'`
- ✅ `src/app/charge/page.tsx` - Ajout `export const dynamic = 'force-dynamic'`
- ✅ `src/app/affectations/page.tsx` - Ajout `export const dynamic = 'force-dynamic'`
- ✅ `src/app/dashboard/page.tsx` - Création lazy du client + `export const dynamic = 'force-dynamic'`

### Client Supabase
- ✅ `src/lib/supabase/client.ts` - Validation des variables d'environnement

## ✅ Résultat

- ✅ Build local réussi
- ✅ Aucune erreur TypeScript
- ✅ Pages marquées comme dynamiques
- ✅ Client Supabase créé uniquement côté client

## 🚀 Prochaines étapes

1. **Vérifier les variables d'environnement dans Vercel** :
   - Aller dans Vercel → Settings → Environment Variables
   - Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont définies

2. **Redéployer sur Vercel** :
   - Le build devrait maintenant fonctionner
   - Les pages seront rendues dynamiquement côté serveur

3. **Tester l'application** :
   - Accéder à l'URL Vercel
   - Vérifier que toutes les pages se chargent
   - Tester la connexion Supabase

---

**Date de correction :** 2025-01-27
