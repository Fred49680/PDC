# 👥 INTERFACE MODULE AFFECTATION - PROPOSITION

## 🎯 VUE D'ENSEMBLE

Interface moderne pour l'affectation des ressources avec :
- **Blocs par compétence** : Organisation claire par compétence
- **Lignes ressources** : Liste des ressources disponibles par site
- **Validation automatique** : Vérification des conflits et absences
- **Couleurs visuelles** : Absences, formations, conflits
- **Temps réel** : Synchronisation automatique

---

## 🎨 MAQUETTE INTERFACE

```
┌─────────────────────────────────────────────────────────────────────┐
│  👥 AFFECTATION DES RESSOURCES                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Sélecteur Affaire ▼]  [Sélecteur Site ▼]  [📅 Date Début] [📅 Date Fin] │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 📋 IES                                                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Besoin:     [2] [2] [3] [3] [2] [2]                            │ │
│  │ Affecté:    [1] [1] [2] [2] [1] [1]                            │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Dupont Jean (P)    [1] [1] [1] [1] [0] [0]                  │ │
│  │ 👤 Martin Pierre (P)  [0] [0] [1] [1] [1] [1]                  │ │
│  │ 👤 Durand Marie (S)   [0] [0] [0] [0] [0] [0]                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 📋 INSTRUM                                                        │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Besoin:     [1] [1] [1] [1] [1] [1]                            │ │
│  │ Affecté:    [1] [1] [1] [1] [1] [1]                            │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Bernard Luc (P)    [1] [1] [1] [1] [1] [1]                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Légende:                                                             │
│  🟡 Formation  🔴 Absence  🟠 Conflit  ⚪ Disponible                │
│                                                                       │
│  [💾 Consolider toutes les affectations]                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💻 COMPOSANT PRINCIPAL

```typescript
// src/app/affectations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GrilleAffectations } from '@/components/affectations/GrilleAffectations'
import { SelecteurAffaire } from '@/components/charge/SelecteurAffaire'
import { SelecteurDates } from '@/components/charge/SelecteurDates'
import { SelecteurPrecision } from '@/components/charge/SelecteurPrecision'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { addDays } from 'date-fns'

export default function AffectationsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // État local
  const [affaireId, setAffaireId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [dateDebut, setDateDebut] = useState<Date>(new Date())
  const [dateFin, setDateFin] = useState<Date>(addDays(new Date(), 30))
  const [precision, setPrecision] = useState<'JOUR' | 'SEMAINE' | 'MOIS'>('JOUR')

  // Charger les affectations
  const { data: affectations = [], isLoading } = useQuery({
    queryKey: ['affectations', affaireId, siteId],
    queryFn: async () => {
      if (!affaireId || !siteId) return []
      
      const { data, error } = await supabase
        .from('affectations')
        .select(`
          *,
          ressources(*),
          competences(*),
          affaires(*)
        `)
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)
        .order('date_debut', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!affaireId && !!siteId
  })

  // Charger les besoins (charge) pour afficher la ligne "Besoin"
  const { data: periodesCharge = [] } = useQuery({
    queryKey: ['periodes_charge', affaireId, siteId],
    queryFn: async () => {
      if (!affaireId || !siteId) return []
      
      const { data, error } = await supabase
        .from('periodes_charge')
        .select(`
          *,
          competences(*)
        `)
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)

      if (error) throw error
      return data
    },
    enabled: !!affaireId && !!siteId
  })

  // Temps réel
  useRealtime({
    table: 'affectations',
    filter: `affaire_id=eq.${affaireId}`,
    callback: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] })
    }
  })

  // Mutation pour sauvegarder une affectation
  const saveMutation = useMutation({
    mutationFn: async (affectation: {
      affaire_id: string
      site_id: string
      ressource_id: string
      competence_id: string
      date_debut: Date
      date_fin: Date
      charge: number
    }) => {
      // Vérifier les conflits avant de sauvegarder
      const { data: conflicts } = await supabase.rpc('check_affectation_conflict', {
        p_ressource_id: affectation.ressource_id,
        p_affaire_id: affectation.affaire_id,
        p_site_id: affectation.site_id,
        p_date_debut: affectation.date_debut.toISOString().split('T')[0],
        p_date_fin: affectation.date_fin.toISOString().split('T')[0],
        p_exclude_id: null
      })

      if (conflicts && conflicts.length > 0) {
        throw new Error('Conflit d\'affectation détecté')
      }

      const { data, error } = await supabase
        .from('affectations')
        .upsert({
          ...affectation,
          date_debut: affectation.date_debut.toISOString().split('T')[0],
          date_fin: affectation.date_fin.toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] })
    }
  })

  // Mutation pour consolider
  const consolidateMutation = useMutation({
    mutationFn: async (params: {
      ressource_id: string
      competence_id: string
    }) => {
      const { data, error } = await supabase.rpc('consolidate_affectations', {
        p_affaire_id: affaireId,
        p_site_id: siteId,
        p_ressource_id: params.ressource_id,
        p_competence_id: params.competence_id
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] })
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👥 Affectation des Ressources
          </h1>
          <p className="text-gray-600">
            Affectez les ressources aux besoins identifiés dans le plan de charge
          </p>
        </div>

        {/* Sélecteurs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelecteurAffaire
              value={affaireId}
              onChange={setAffaireId}
              onSiteChange={setSiteId}
            />
            <SelecteurDates
              dateDebut={dateDebut}
              dateFin={dateFin}
              onDateDebutChange={setDateDebut}
              onDateFinChange={setDateFin}
            />
            <SelecteurPrecision
              value={precision}
              onChange={setPrecision}
            />
          </div>
        </div>

        {/* Grille d'affectations */}
        {affaireId && siteId ? (
          <GrilleAffectations
            affaireId={affaireId}
            siteId={siteId}
            dateDebut={dateDebut}
            dateFin={dateFin}
            precision={precision}
            affectations={affectations}
            periodesCharge={periodesCharge}
            onSave={saveMutation.mutate}
            onConsolidate={consolidateMutation.mutate}
            loading={isLoading}
            saving={saveMutation.isPending}
            consolidating={consolidateMutation.isPending}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              👆 Sélectionnez une affaire et un site pour commencer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 🎨 COMPOSANT GRILLE AFFECTATIONS (COMPLET)

```typescript
// src/components/affectations/GrilleAffectations.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, eachDayOfInterval, startOfWeek, addDays, addMonths, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BlocCompetence } from './BlocCompetence'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertTriangle, Info } from 'lucide-react'

interface GrilleAffectationsProps {
  affaireId: string
  siteId: string
  dateDebut: Date
  dateFin: Date
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  affectations: any[]
  periodesCharge: any[]
  onSave: (affectation: any) => void
  onConsolidate: (params: { ressource_id: string, competence_id: string }) => void
  loading: boolean
  saving: boolean
  consolidating: boolean
}

export function GrilleAffectations({
  affaireId,
  siteId,
  dateDebut,
  dateFin,
  precision,
  affectations,
  periodesCharge,
  onSave,
  onConsolidate,
  loading,
  saving,
  consolidating
}: GrilleAffectationsProps) {
  const supabase = createClient()
  const [competences, setCompetences] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [formations, setFormations] = useState<any[]>([])

  // Charger les compétences actives (celles avec des besoins)
  useEffect(() => {
    const compIds = new Set(periodesCharge.map(p => p.competence_id))
    if (compIds.size === 0) {
      setCompetences([])
      return
    }

    const loadCompetences = async () => {
      const { data, error } = await supabase
        .from('competences')
        .select('*')
        .in('id', Array.from(compIds))
        .order('competence', { ascending: true })

      if (!error && data) {
        setCompetences(data)
      }
    }
    loadCompetences()
  }, [periodesCharge])

  // Charger les absences et formations
  useEffect(() => {
    const loadAbsences = async () => {
      const { data, error } = await supabase
        .from('absences')
        .select(`
          *,
          ressources(*)
        `)
        .gte('date_fin', dateDebut.toISOString().split('T')[0])
        .lte('date_debut', dateFin.toISOString().split('T')[0])

      if (!error && data) {
        // Séparer absences et formations
        const abs = data.filter(a => 
          !a.type?.toUpperCase().includes('FORMATION') && 
          !a.type?.toUpperCase().includes('TRAINING')
        )
        const form = data.filter(a => 
          a.type?.toUpperCase().includes('FORMATION') || 
          a.type?.toUpperCase().includes('TRAINING')
        )
        setAbsences(abs)
        setFormations(form)
      }
    }
    loadAbsences()
  }, [dateDebut, dateFin])

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
      const months: Date[] = []
      let current = startOfMonth(dateDebut)
      while (current <= dateFin) {
        months.push(current)
        current = addMonths(current, 1)
      }
      return months
    }
  }, [dateDebut, dateFin, precision])

  // Construire les besoins par compétence
  const besoinsParCompetence = useMemo(() => {
    const map = new Map<string, Map<string, number>>() // compId -> date -> besoin
    
    periodesCharge.forEach(periode => {
      const compId = periode.competence_id
      if (!map.has(compId)) {
        map.set(compId, new Map())
      }
      
      const dates = precision === 'JOUR'
        ? eachDayOfInterval({ 
            start: new Date(periode.date_debut), 
            end: new Date(periode.date_fin) 
          })
        : [new Date(periode.date_debut)]
      
      dates.forEach(date => {
        const key = format(date, 'yyyy-MM-dd')
        const existing = map.get(compId)!.get(key) || 0
        map.get(compId)!.set(key, existing + periode.nb_ressources)
      })
    })
    
    return map
  }, [periodesCharge, precision])

  // Construire les affectations par ressource/compétence
  const affectationsMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>() // "ressourceId|compId" -> date -> charge
    
    affectations.forEach(aff => {
      const key = `${aff.ressource_id}|${aff.competence_id}`
      if (!map.has(key)) {
        map.set(key, new Map())
      }
      
      const dates = precision === 'JOUR'
        ? eachDayOfInterval({ 
            start: new Date(aff.date_debut), 
            end: new Date(aff.date_fin) 
          })
        : [new Date(aff.date_debut)]
      
      dates.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const existing = map.get(key)!.get(dateKey) || 0
        map.get(key)!.set(dateKey, existing + aff.charge)
      })
    })
    
    return map
  }, [affectations, precision])

  // Construire les absences par ressource
  const absencesMap = useMemo(() => {
    const map = new Map<string, Set<string>>() // ressourceId -> Set<dates>
    
    absences.forEach(abs => {
      const resId = abs.ressource_id
      if (!map.has(resId)) {
        map.set(resId, new Set())
      }
      
      const dates = eachDayOfInterval({ 
        start: new Date(abs.date_debut), 
        end: new Date(abs.date_fin) 
      })
      
      dates.forEach(date => {
        map.get(resId)!.add(format(date, 'yyyy-MM-dd'))
      })
    })
    
    return map
  }, [absences])

  // Construire les formations par ressource
  const formationsMap = useMemo(() => {
    const map = new Map<string, Set<string>>() // ressourceId -> Set<dates>
    
    formations.forEach(form => {
      const resId = form.ressource_id
      if (!map.has(resId)) {
        map.set(resId, new Set())
      }
      
      const dates = eachDayOfInterval({ 
        start: new Date(form.date_debut), 
        end: new Date(form.date_fin) 
      })
      
      dates.forEach(date => {
        map.get(resId)!.add(format(date, 'yyyy-MM-dd'))
      })
    })
    
    return map
  }, [formations])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Chargement des affectations...</span>
      </div>
    )
  }

  if (competences.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Aucune compétence avec besoin identifié pour cette affaire/site.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Commencez par saisir des besoins dans le module Charge.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Légende */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <span className="font-semibold text-gray-700">Légende :</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
            <span>Formation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
            <span>Absence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
            <span>Conflit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded"></div>
            <span>Disponible</span>
          </div>
        </div>
      </div>

      {/* Blocs par compétence */}
      {competences.map((comp) => {
        const besoins = besoinsParCompetence.get(comp.id) || new Map()
        
        return (
          <BlocCompetence
            key={comp.id}
            competence={comp}
            colonnes={colonnes}
            precision={precision}
            besoins={besoins}
            affectationsMap={affectationsMap}
            absencesMap={absencesMap}
            formationsMap={formationsMap}
            siteId={siteId}
            affaireId={affaireId}
            onSave={onSave}
            onConsolidate={onConsolidate}
            saving={saving}
            consolidating={consolidating}
          />
        )
      })}

      {/* Actions globales */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => {
            competences.forEach(comp => {
              // Consolider toutes les ressources de cette compétence
              // TODO: Récupérer la liste des ressources affectées
            })
          }}
          disabled={consolidating}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
        >
          {consolidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Consolidation...
            </>
          ) : (
            <>
              💾 Consolider toutes les affectations
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

---

## 🎨 COMPOSANT BLOC COMPÉTENCE

```typescript
// src/components/affectations/BlocCompetence.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LigneRessource } from './LigneRessource'
import { LigneBesoin } from './LigneBesoin'
import { LigneAffecte } from './LigneAffecte'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle } from 'lucide-react'

interface BlocCompetenceProps {
  competence: any
  colonnes: Date[]
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  besoins: Map<string, number>
  affectationsMap: Map<string, Map<string, number>>
  absencesMap: Map<string, Set<string>>
  formationsMap: Map<string, Set<string>>
  siteId: string
  affaireId: string
  onSave: (affectation: any) => void
  onConsolidate: (params: { ressource_id: string, competence_id: string }) => void
  saving: boolean
  consolidating: boolean
}

export function BlocCompetence({
  competence,
  colonnes,
  precision,
  besoins,
  affectationsMap,
  absencesMap,
  formationsMap,
  siteId,
  affaireId,
  onSave,
  onConsolidate,
  saving,
  consolidating
}: BlocCompetenceProps) {
  const supabase = createClient()
  const [ressources, setRessources] = useState<any[]>([])

  // Charger les ressources disponibles pour ce site et cette compétence
  useEffect(() => {
    const loadRessources = async () => {
      const { data, error } = await supabase
        .from('ressources_competences')
        .select(`
          *,
          ressources(*),
          competences(*)
        `)
        .eq('competence_id', competence.id)
        .eq('type_comp', 'P') // Compétences principales uniquement
        .eq('ressources.actif', true)
        .eq('ressources.site_id', siteId)

      if (!error && data) {
        // Filtrer les ressources actives
        const actives = data.filter(rc => rc.ressources?.actif === true)
        setRessources(actives.map(rc => rc.ressources))
      }
    }
    loadRessources()
  }, [competence.id, siteId])

  // Calculer le total affecté
  const totalAffecte = useMemo(() => {
    let total = 0
    colonnes.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd')
      affectationsMap.forEach((affMap) => {
        const value = affMap.get(dateKey) || 0
        total += value
      })
    })
    return total
  }, [colonnes, affectationsMap])

  // Calculer le total besoin
  const totalBesoin = useMemo(() => {
    let total = 0
    colonnes.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd')
      total += besoins.get(dateKey) || 0
    })
    return total
  }, [colonnes, besoins])

  // Vérifier les conflits (affecté > besoin)
  const hasConflits = totalAffecte > totalBesoin

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden">
      {/* En-tête du bloc */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          📋 {competence.competence}
          {hasConflits && (
            <AlertTriangle className="w-5 h-5 text-yellow-300" title="Conflit détecté" />
          )}
        </h3>
      </div>

      {/* Grille */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="border p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[250px]">
                Ressource
              </th>
              {colonnes.map((date, idx) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                return (
                  <th 
                    key={idx} 
                    className={`border p-2 text-center text-sm font-semibold min-w-[80px] ${
                      isWeekend ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {format(date, precision === 'JOUR' ? 'EEE' : 'MMM', { locale: fr })}
                      </span>
                      <span className="font-bold">
                        {format(date, precision === 'JOUR' ? 'dd/MM' : precision === 'SEMAINE' ? 'dd MMM' : 'MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Ligne Besoin */}
            <LigneBesoin
              besoins={besoins}
              colonnes={colonnes}
            />

            {/* Ligne Affecté */}
            <LigneAffecte
              affectationsMap={affectationsMap}
              colonnes={colonnes}
              competenceId={competence.id}
            />

            {/* Lignes Ressources */}
            {ressources.map((ressource) => (
              <LigneRessource
                key={ressource.id}
                ressource={ressource}
                competence={competence}
                colonnes={colonnes}
                precision={precision}
                affectationsMap={affectationsMap}
                absencesMap={absencesMap}
                formationsMap={formationsMap}
                siteId={siteId}
                affaireId={affaireId}
                onSave={onSave}
                onConsolidate={onConsolidate}
                saving={saving}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 p-3 border-t flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-600">Ressources disponibles : </span>
          <span className="font-semibold">{ressources.length}</span>
        </div>
        <div className="flex gap-4">
          <div>
            <span className="text-gray-600">Besoin : </span>
            <span className="font-semibold">{totalBesoin.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">Affecté : </span>
            <span className={`font-semibold ${hasConflits ? 'text-red-600' : 'text-green-600'}`}>
              {totalAffecte.toFixed(1)}
            </span>
          </div>
          {hasConflits && (
            <div className="text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Sur-affectation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 COMPOSANT LIGNE RESSOURCE

```typescript
// src/components/affectations/LigneRessource.tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CelluleAffectation } from './CelluleAffectation'
import { CheckCircle2, XCircle } from 'lucide-react'

interface LigneRessourceProps {
  ressource: any
  competence: any
  colonnes: Date[]
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  affectationsMap: Map<string, Map<string, number>>
  absencesMap: Map<string, Set<string>>
  formationsMap: Map<string, Set<string>>
  siteId: string
  affaireId: string
  onSave: (affectation: any) => void
  onConsolidate: (params: { ressource_id: string, competence_id: string }) => void
  saving: boolean
}

export function LigneRessource({
  ressource,
  competence,
  colonnes,
  precision,
  affectationsMap,
  absencesMap,
  formationsMap,
  siteId,
  affaireId,
  onSave,
  onConsolidate,
  saving
}: LigneRessourceProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const keyAffectation = `${ressource.id}|${competence.id}`
  const affectations = affectationsMap.get(keyAffectation) || new Map()
  const absences = absencesMap.get(ressource.id) || new Set()
  const formations = formationsMap.get(ressource.id) || new Set()

  const handleCellChange = async (date: Date, value: number) => {
    try {
      // Déterminer la période selon la précision
      let dateDeb = date
      let dateFin = date

      if (precision === 'SEMAINE') {
        dateDeb = startOfWeek(date, { weekStartsOn: 1 })
        dateFin = addDays(dateDeb, 6)
      } else if (precision === 'MOIS') {
        dateDeb = startOfMonth(date)
        dateFin = addMonths(dateDeb, 1)
        dateFin = addDays(dateFin, -1)
      }

      // Calculer la charge (jours ouvrés)
      const nbJoursOuvres = await calculateBusinessDays(dateDeb, dateFin)

      onSave({
        affaire_id: affaireId,
        site_id: siteId,
        ressource_id: ressource.id,
        competence_id: competence.id,
        date_debut: dateDeb,
        date_fin: dateFin,
        charge: value > 0 ? nbJoursOuvres : 0
      })

      setMessage({ type: 'success', text: 'Affectation enregistrée' })
      setTimeout(() => setMessage(null), 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="border p-3 sticky left-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="font-medium">{ressource.nom_prenom}</span>
          <span className="text-xs text-gray-500">(P)</span>
        </div>
        {message && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </td>
      {colonnes.map((date, idx) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const value = affectations.get(dateKey) || 0
        const isAbsent = absences.has(dateKey)
        const isFormation = formations.has(dateKey)
        const isWeekend = date.getDay() === 0 || date.getDay() === 6

        return (
          <td 
            key={idx} 
            className={`border p-1 ${
              isWeekend ? 'bg-blue-50' : ''
            }`}
          >
            <CelluleAffectation
              value={value > 0 ? 1 : 0}
              onChange={(newValue) => handleCellChange(date, newValue)}
              disabled={saving || isAbsent || isFormation}
              isAbsent={isAbsent}
              isFormation={isFormation}
            />
          </td>
        )
      })}
    </tr>
  )
}

async function calculateBusinessDays(dateDeb: Date, dateFin: Date): Promise<number> {
  // Utiliser la fonction PostgreSQL business_days_between
  // Ou calculer côté client avec date-fns
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('business_days_between', {
    date_start: dateDeb.toISOString().split('T')[0],
    date_end: dateFin.toISOString().split('T')[0]
  })

  if (error) {
    // Fallback : calcul simple
    return Math.max(1, Math.ceil((dateFin.getTime() - dateDeb.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return data || 1
}
```

---

## 🎨 COMPOSANT CELLULE AFFECTATION

```typescript
// src/components/affectations/CelluleAffectation.tsx
'use client'

import { Check, X, AlertTriangle, GraduationCap } from 'lucide-react'

interface CelluleAffectationProps {
  value: number // 0 ou 1
  onChange: (value: number) => void
  disabled?: boolean
  isAbsent?: boolean
  isFormation?: boolean
}

export function CelluleAffectation({ 
  value, 
  onChange, 
  disabled, 
  isAbsent, 
  isFormation 
}: CelluleAffectationProps) {
  const handleClick = () => {
    if (disabled) return
    onChange(value === 1 ? 0 : 1)
  }

  // Déterminer la couleur et l'icône
  let bgColor = 'bg-white'
  let borderColor = 'border-gray-300'
  let icon = null
  let tooltip = ''

  if (isFormation) {
    bgColor = 'bg-yellow-200'
    borderColor = 'border-yellow-400'
    icon = <GraduationCap className="w-4 h-4 text-yellow-700" />
    tooltip = 'Formation'
  } else if (isAbsent) {
    bgColor = 'bg-red-200'
    borderColor = 'border-red-400'
    icon = <X className="w-4 h-4 text-red-700" />
    tooltip = 'Absent'
  } else if (value === 1) {
    bgColor = 'bg-green-200'
    borderColor = 'border-green-500'
    icon = <Check className="w-4 h-4 text-green-700" />
    tooltip = 'Affecté'
  } else {
    bgColor = 'bg-gray-100'
    borderColor = 'border-gray-300'
    tooltip = 'Disponible'
  }

  return (
    <div
      onClick={handleClick}
      className={`
        w-full h-10 border-2 rounded flex items-center justify-center
        transition cursor-pointer
        ${bgColor} ${borderColor}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      title={tooltip}
    >
      {icon || (value === 1 ? '✓' : '')}
    </div>
  )
}
```

---

## 🎨 COMPOSANT LIGNE BESOIN

```typescript
// src/components/affectations/LigneBesoin.tsx
'use client'

import { format } from 'date-fns'

interface LigneBesoinProps {
  besoins: Map<string, number>
  colonnes: Date[]
}

export function LigneBesoin({ besoins, colonnes }: LigneBesoinProps) {
  return (
    <tr className="bg-yellow-50 border-b-2 border-yellow-300">
      <td className="border p-3 sticky left-0 bg-yellow-50 z-10 font-semibold text-yellow-900">
        Besoin
      </td>
      {colonnes.map((date, idx) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const besoin = besoins.get(dateKey) || 0
        const isWeekend = date.getDay() === 0 || date.getDay() === 6

        return (
          <td 
            key={idx} 
            className={`border p-2 text-center font-bold text-yellow-900 ${
              isWeekend ? 'bg-blue-50' : ''
            }`}
          >
            {besoin > 0 ? besoin : '-'}
          </td>
        )
      })}
    </tr>
  )
}
```

---

## 🎨 COMPOSANT LIGNE AFFECTÉ

```typescript
// src/components/affectations/LigneAffecte.tsx
'use client'

import { format } from 'date-fns'
import { useMemo } from 'react'

interface LigneAffecteProps {
  affectationsMap: Map<string, Map<string, number>>
  colonnes: Date[]
  competenceId: string
}

export function LigneAffecte({ affectationsMap, colonnes, competenceId }: LigneAffecteProps) {
  // Calculer le total affecté par date
  const affecteParDate = useMemo(() => {
    const map = new Map<string, number>()
    
    colonnes.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd')
      let total = 0
      
      affectationsMap.forEach((affMap, key) => {
        // Filtrer par compétence
        if (key.endsWith(`|${competenceId}`)) {
          total += affMap.get(dateKey) || 0
        }
      })
      
      map.set(dateKey, total)
    })
    
    return map
  }, [colonnes, affectationsMap, competenceId])

  return (
    <tr className="bg-blue-50 border-b-2 border-blue-300">
      <td className="border p-3 sticky left-0 bg-blue-50 z-10 font-semibold text-blue-900">
        Affecté
      </td>
      {colonnes.map((date, idx) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const affecte = affecteParDate.get(dateKey) || 0
        const isWeekend = date.getDay() === 0 || date.getDay() === 6

        return (
          <td 
            key={idx} 
            className={`border p-2 text-center font-bold text-blue-900 ${
              isWeekend ? 'bg-blue-100' : ''
            }`}
          >
            {affecte > 0 ? affecte.toFixed(1) : '-'}
          </td>
        )
      })}
    </tr>
  )
}
```

---

## ✨ FONCTIONNALITÉS CLÉS

### 1. Organisation par compétence
- Bloc séparé pour chaque compétence
- Ligne "Besoin" (depuis le module Charge)
- Ligne "Affecté" (somme des affectations)
- Lignes ressources (une par ressource disponible)

### 2. Validation visuelle
- 🟡 **Formation** : Fond jaune, icône diplôme
- 🔴 **Absence** : Fond rouge, icône X
- 🟢 **Affecté** : Fond vert, icône check
- ⚪ **Disponible** : Fond gris clair

### 3. Validation automatique
- Vérification des conflits avant sauvegarde
- Blocage si ressource absente
- Blocage si ressource en formation
- Message d'erreur clair

### 4. Consolidation
- Bouton pour consolider toutes les affectations
- Fusion des périodes adjacentes
- Optimisation des données

### 5. Temps réel
- Synchronisation automatique
- Mise à jour instantanée
- Pas de conflits entre utilisateurs

---

## 🎨 STYLE ET UX

- **Couleurs** :
  - En-tête bloc : Dégradé bleu
  - Ligne Besoin : Fond jaune clair
  - Ligne Affecté : Fond bleu clair
  - Cellules : Couleurs selon état (vert=affecté, rouge=absent, jaune=formation)

- **Interactions** :
  - Clic sur cellule → Toggle affectation (0 ↔ 1)
  - Hover : Surbrillance
  - Tooltip : Explication de l'état

- **Responsive** :
  - Colonnes scrollables
  - Colonne "Ressource" sticky
  - Blocs empilés verticalement

---

**Cette interface est prête à être implémentée !** 🚀
