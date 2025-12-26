# 🚀 GUIDE DE DÉMARRAGE RAPIDE - VERCEL + SUPABASE

## 📋 PRÉREQUIS

- Node.js 18+ installé
- Compte Supabase (gratuit) : https://supabase.com
- Compte Vercel (gratuit) : https://vercel.com
- Git installé

---

## ⚡ DÉMARRAGE EN 5 MINUTES

### Étape 1 : Créer le projet Next.js

```bash
npx create-next-app@latest plan-de-charge-web --typescript --tailwind --app
cd plan-de-charge-web
```

### Étape 2 : Installer les dépendances

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand date-fns react-hook-form zod
npm install -D @types/node @types/react @types/react-dom
```

### Étape 3 : Configurer Supabase

1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Copier l'URL et la clé anonyme
4. Créer `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

### Étape 4 : Exécuter le schéma SQL

1. Aller dans l'éditeur SQL de Supabase
2. Copier le contenu de `ARCHITECTURE_VERCEL_SUPABASE.md` (section SQL)
3. Exécuter le script

### Étape 5 : Créer les fichiers de base

Voir les exemples ci-dessous.

---

## 📁 FICHIERS ESSENTIELS À CRÉER

### 1. Configuration Supabase Client

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

### 2. Hook useCharge

```typescript
// src/lib/hooks/useCharge.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'

export function useCharge(affaireId: string, siteId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: periodes, isLoading, error } = useQuery({
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

  const saveMutation = useMutation({
    mutationFn: async (periode: any) => {
      const { data, error } = await supabase
        .from('periodes_charge')
        .upsert(periode)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  return {
    periodes: periodes || [],
    isLoading,
    error,
    save: saveMutation.mutate,
    consolidate: async (competenceId: string) => {
      const { error } = await supabase.rpc('consolidate_periodes_charge', {
        p_affaire_id: affaireId,
        p_site_id: siteId,
        p_competence_id: competenceId
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  }
}
```

### 3. Page Charge

```typescript
// src/app/charge/page.tsx
'use client'

import { useState } from 'react'
import { useCharge } from '@/lib/hooks/useCharge'
import { GrilleCharge } from '@/components/charge/GrilleCharge'

export default function ChargePage() {
  const [affaireId, setAffaireId] = useState('')
  const [siteId, setSiteId] = useState('')
  const { periodes, isLoading, save, consolidate } = useCharge(affaireId, siteId)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Planification de Charge</h1>
      
      {/* Sélecteurs */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Affaire ID"
          value={affaireId}
          onChange={(e) => setAffaireId(e.target.value)}
          className="border p-2 mr-4"
        />
        <input
          type="text"
          placeholder="Site ID"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="border p-2"
        />
      </div>

      {/* Grille */}
      {affaireId && siteId && (
        <GrilleCharge
          affaireId={affaireId}
          siteId={siteId}
          periodes={periodes}
          onSave={save}
          onConsolidate={consolidate}
          loading={isLoading}
        />
      )}
    </div>
  )
}
```

---

## 🎯 PROCHAINES ÉTAPES

1. Implémenter les autres modules (Affectations, Absences, etc.)
2. Ajouter l'authentification
3. Configurer le temps réel
4. Déployer sur Vercel

---

**Besoin d'aide ?** Consultez `ARCHITECTURE_VERCEL_SUPABASE.md` pour plus de détails.
