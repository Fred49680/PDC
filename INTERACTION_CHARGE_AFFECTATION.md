# 🔄 INTERACTION CHARGE ↔ AFFECTATION

## 🎯 PRINCIPE DE FONCTIONNEMENT

Les modules **Charge** et **Affectation** sont **étroitement liés** :

1. **Module Charge** : Définit les **besoins** (combien de ressources par compétence)
2. **Module Affectation** : **Répond aux besoins** en affectant des ressources spécifiques

---

## 📊 FLUX DE DONNÉES

```
┌─────────────────────────────────────────────────────────────┐
│  MODULE CHARGE                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Saisie des besoins par compétence                   │   │
│  │ Ex: IES = 2 ressources du 01/01 au 05/01           │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Consolidation automatique                            │   │
│  │ Fusion des périodes adjacentes                       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Table: periodes_charge                               │   │
│  │ (AffaireID, Site, Compétence, Dates, NbRessources)  │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          │ (Lecture des besoins)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  MODULE AFFECTATION                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Affichage des besoins par compétence                │   │
│  │ Ligne "Besoin" = Somme des periodes_charge          │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Saisie des affectations                              │   │
│  │ Clic sur cellule = Affecter/Désaffecter ressource    │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Validation automatique                               │   │
│  │ - Vérifier conflits                                 │   │
│  │ - Vérifier absences                                 │   │
│  │ - Vérifier formations                               │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Consolidation automatique                            │   │
│  │ Fusion des périodes adjacentes                       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Table: affectations                                  │   │
│  │ (AffaireID, Site, Ressource, Compétence, Dates,      │   │
│  │  Charge)                                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 COMPOSANT DE LIAISON

```typescript
// src/components/shared/ChargeAffectationLink.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ChargeAffectationLinkProps {
  affaireId: string
  siteId: string
  competenceId: string
  date: Date
}

export function ChargeAffectationLink({
  affaireId,
  siteId,
  competenceId,
  date
}: ChargeAffectationLinkProps) {
  const supabase = createClient()

  // Charger le besoin (charge)
  const { data: besoin = 0 } = useQuery({
    queryKey: ['besoin', affaireId, siteId, competenceId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodes_charge')
        .select('nb_ressources')
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)
        .eq('competence_id', competenceId)
        .lte('date_debut', date.toISOString().split('T')[0])
        .gte('date_fin', date.toISOString().split('T')[0])
        .single()

      if (error) return 0
      return data?.nb_ressources || 0
    }
  })

  // Charger le total affecté
  const { data: affecte = 0 } = useQuery({
    queryKey: ['affecte', affaireId, siteId, competenceId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affectations')
        .select('charge')
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)
        .eq('competence_id', competenceId)
        .lte('date_debut', date.toISOString().split('T')[0])
        .gte('date_fin', date.toISOString().split('T')[0])

      if (error) return 0
      return data?.reduce((sum, a) => sum + (a.charge || 0), 0) || 0
    }
  })

  const ratio = besoin > 0 ? (affecte / besoin) : 0
  const isOK = affecte >= besoin
  const isSurAffecte = affecte > besoin

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Besoin: {besoin}</span>
      <span className="text-gray-400">|</span>
      <span className={`font-semibold ${isOK ? 'text-green-600' : 'text-red-600'}`}>
        Affecté: {affecte.toFixed(1)}
      </span>
      {isSurAffecte && (
        <AlertCircle className="w-4 h-4 text-orange-500" title="Sur-affectation" />
      )}
      {isOK && !isSurAffecte && (
        <CheckCircle2 className="w-4 h-4 text-green-500" title="Besoins couverts" />
      )}
    </div>
  )
}
```

---

## 📊 VUE COMPARATIVE

### Composant pour comparer Charge vs Affectation

```typescript
// src/components/shared/ComparaisonChargeAffectation.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ComparaisonChargeAffectationProps {
  affaireId: string
  siteId: string
  competenceId: string
  dateDebut: Date
  dateFin: Date
}

export function ComparaisonChargeAffectation({
  affaireId,
  siteId,
  competenceId,
  dateDebut,
  dateFin
}: ComparaisonChargeAffectationProps) {
  const supabase = createClient()

  // Charger les données agrégées
  const { data: comparaison = [] } = useQuery({
    queryKey: ['comparaison_charge_affectation', affaireId, siteId, competenceId],
    queryFn: async () => {
      // Requête SQL pour comparer charge vs affectation par semaine
      const { data, error } = await supabase.rpc('get_comparaison_charge_affectation', {
        p_affaire_id: affaireId,
        p_site_id: siteId,
        p_competence_id: competenceId,
        p_date_debut: dateDebut.toISOString().split('T')[0],
        p_date_fin: dateFin.toISOString().split('T')[0]
      })

      if (error) throw error
      return data
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Comparaison Besoin vs Affecté</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={comparaison}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semaine" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="besoin" fill="#fbbf24" name="Besoin" />
          <Bar dataKey="affecte" fill="#3b82f6" name="Affecté" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 🔄 SYNCHRONISATION AUTOMATIQUE

### Hook pour synchroniser Charge → Affectation

```typescript
// src/lib/hooks/useChargeToAffectation.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useChargeToAffectation(affaireId: string, siteId: string) {
  const queryClient = useQueryClient()

  // Quand la charge change, invalider les affectations pour recharger les besoins
  useEffect(() => {
    if (affaireId && siteId) {
      // Invalider les affectations pour forcer le rechargement des besoins
      queryClient.invalidateQueries({ 
        queryKey: ['affectations', affaireId, siteId] 
      })
    }
  }, [affaireId, siteId, queryClient])
}
```

---

## 📋 RÈGLES DE VALIDATION

### 1. Affectation ne peut pas dépasser le besoin
- ✅ **OK** : Besoin = 2, Affecté = 2
- ✅ **OK** : Besoin = 2, Affecté = 1 (sous-affectation)
- ⚠️ **ALERTE** : Besoin = 2, Affecté = 3 (sur-affectation)

### 2. Besoin peut exister sans affectation
- ✅ **OK** : Besoin = 2, Affecté = 0 (pas encore affecté)

### 3. Affectation sans besoin = inutile
- ⚠️ **ALERTE** : Besoin = 0, Affecté = 1 (affectation inutile)

---

## 🎨 INDICATEURS VISUELS

### Dans le module Affectation

```typescript
// Indicateur de couverture des besoins
const couverture = (affecte / besoin) * 100

// Couleurs :
// - Vert : 100% (affecte >= besoin)
// - Orange : 50-99% (affecte < besoin)
// - Rouge : < 50% (affecte << besoin)
// - Rouge foncé : Sur-affectation (affecte > besoin)
```

---

## 🔄 WORKFLOW COMPLET

1. **Utilisateur saisit la charge** (Module Charge)
   - Sélectionne Affaire + Site
   - Saisit les besoins par compétence et par période
   - Consolide les périodes

2. **Système enregistre dans `periodes_charge`**
   - Table PostgreSQL
   - Synchronisation temps réel

3. **Utilisateur passe au module Affectation**
   - Même Affaire + Site
   - Le système charge automatiquement les besoins
   - Affiche la ligne "Besoin" par compétence

4. **Utilisateur affecte les ressources**
   - Clic sur les cellules pour affecter/désaffecter
   - Validation automatique (conflits, absences)
   - Enregistrement dans `affectations`

5. **Système compare en temps réel**
   - Ligne "Affecté" = Somme des affectations
   - Comparaison avec ligne "Besoin"
   - Alertes visuelles si déséquilibre

6. **Consolidation automatique**
   - Fusion des périodes adjacentes
   - Optimisation des données

---

## 📊 EXEMPLE CONCRET

### Scénario
- **Affaire** : PROJET_A
- **Site** : BLAYAIS
- **Compétence** : IES
- **Période** : 01/01/2026 - 05/01/2026

### Module Charge
```
IES | 01/01 | 02/01 | 03/01 | 04/01 | 05/01
    |   2   |   2   |   3   |   3   |   2
```
→ Enregistré dans `periodes_charge`

### Module Affectation
```
IES
Besoin:    2   2   3   3   2
Affecté:   2   2   3   3   2  ✅
Dupont:    1   1   1   1   1
Martin:    1   1   2   2   1
```
→ Enregistré dans `affectations`
→ Ligne "Affecté" = Somme(Dupont + Martin)

---

**Les deux modules sont parfaitement synchronisés !** 🔄
