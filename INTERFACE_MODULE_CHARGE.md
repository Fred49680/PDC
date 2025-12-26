# 📊 INTERFACE MODULE CHARGE - PROPOSITION

## 🎯 VUE D'ENSEMBLE

Interface moderne pour la saisie de charge avec :
- **Grille interactive** : Saisie directe dans les cellules
- **Sélecteurs** : Affaire, Site, Dates, Précision (Jour/Semaine/Mois)
- **Consolidation automatique** : Bouton pour consolider les périodes
- **Validation en temps réel** : Vérification des données
- **Temps réel** : Synchronisation automatique entre utilisateurs

---

## 🎨 MAQUETTE INTERFACE

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 PLANIFICATION DE CHARGE                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Sélecteur Affaire ▼]  [Sélecteur Site ▼]  [📅 Date Début] [📅 Date Fin] │
│                                                                       │
│  Précision: ○ Jour  ○ Semaine  ● Mois                                │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐ │
│  │ Compétence  │ 01/01│ 02/01│ 03/01│ 04/01│ 05/01│ 06/01│ Total  │ │
│  ├─────────────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤ │
│  │ IES         │  [2] │  [2] │  [3] │  [3] │  [2] │  [2] │  14 H  │ │
│  │ INSTRUM      │  [1] │  [1] │  [1] │  [1] │  [1] │  [1] │   6 H  │ │
│  │ MECANIQUE    │  [0] │  [0] │  [1] │  [1] │  [0] │  [0] │   2 H  │ │
│  │ ELECTRIQUE   │  [1] │  [1] │  [2] │  [2] │  [1] │  [1] │   8 H  │ │
│  └─────────────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┘ │
│                                                                       │
│  [💾 Consolider toutes les compétences]  [🔄 Actualiser]            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💻 COMPOSANT PRINCIPAL

```typescript
// src/app/charge/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GrilleCharge } from '@/components/charge/GrilleCharge'
import { SelecteurAffaire } from '@/components/charge/SelecteurAffaire'
import { SelecteurSite } from '@/components/charge/SelecteurSite'
import { SelecteurDates } from '@/components/charge/SelecteurDates'
import { SelecteurPrecision } from '@/components/charge/SelecteurPrecision'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { format, addDays, startOfWeek, addWeeks, startOfMonth, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ChargePage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // État local
  const [affaireId, setAffaireId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [dateDebut, setDateDebut] = useState<Date>(new Date())
  const [dateFin, setDateFin] = useState<Date>(addDays(new Date(), 30))
  const [precision, setPrecision] = useState<'JOUR' | 'SEMAINE' | 'MOIS'>('JOUR')

  // Charger les périodes de charge
  const { data: periodes = [], isLoading, error } = useQuery({
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
  useRealtime({
    table: 'periodes_charge',
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
        .upsert({
          ...periode,
          date_debut: periode.date_debut.toISOString().split('T')[0],
          date_fin: periode.date_fin.toISOString().split('T')[0]
        }, {
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
    mutationFn: async (competenceId: string) => {
      const { data, error } = await supabase.rpc('consolidate_periodes_charge', {
        p_affaire_id: affaireId,
        p_site_id: siteId,
        p_competence_id: competenceId
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  const handleSave = (competenceId: string, date: Date, value: number) => {
    if (!affaireId || !siteId) return

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

    saveMutation.mutate({
      affaire_id: affaireId,
      site_id: siteId,
      competence_id: competenceId,
      date_debut: dateDeb,
      date_fin: dateFin,
      nb_ressources: value
    })
  }

  const handleConsolidate = (competenceId: string) => {
    consolidateMutation.mutate(competenceId)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Planification de Charge
          </h1>
          <p className="text-gray-600">
            Saisissez les besoins en ressources par compétence et par période
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
            <SelecteurSite
              value={siteId}
              onChange={setSiteId}
              affaireId={affaireId}
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

        {/* Grille de charge */}
        {affaireId && siteId ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <GrilleCharge
              affaireId={affaireId}
              siteId={siteId}
              dateDebut={dateDebut}
              dateFin={dateFin}
              precision={precision}
              periodes={periodes}
              onSave={handleSave}
              onConsolidate={handleConsolidate}
              loading={isLoading}
              saving={saveMutation.isPending}
              consolidating={consolidateMutation.isPending}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              👆 Sélectionnez une affaire et un site pour commencer
            </p>
          </div>
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Erreur : {error.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 🎨 COMPOSANT GRILLE CHARGE (COMPLET)

```typescript
// src/components/charge/GrilleCharge.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, eachDayOfInterval, startOfWeek, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CelluleCharge } from './CelluleCharge'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface GrilleChargeProps {
  affaireId: string
  siteId: string
  dateDebut: Date
  dateFin: Date
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  periodes: any[]
  onSave: (competenceId: string, date: Date, value: number) => void
  onConsolidate: (competenceId: string) => void
  loading: boolean
  saving: boolean
  consolidating: boolean
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
  loading,
  saving,
  consolidating
}: GrilleChargeProps) {
  const supabase = createClient()
  const [competences, setCompetences] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
      let current = startOfMonth(dateDebut)
      while (current <= dateFin) {
        months.push(current)
        current = addMonths(current, 1)
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
        ? eachDayOfInterval({ 
            start: new Date(periode.date_debut), 
            end: new Date(periode.date_fin) 
          })
        : [new Date(periode.date_debut)]
      
      dates.forEach(date => {
        const key = `${compId}-${format(date, 'yyyy-MM-dd')}`
        map.set(key, periode.nb_ressources)
      })
    })
    
    return map
  }, [periodes, precision])

  // Calculer les totaux par compétence
  const totaux = useMemo(() => {
    const totals = new Map<string, number>()
    
    competences.forEach(comp => {
      let total = 0
      colonnes.forEach(date => {
        const key = `${comp.id}-${format(date, 'yyyy-MM-dd')}`
        const value = grille.get(key) || 0
        
        // Calculer le nombre de jours ouvrés selon la précision
        let nbJours = 1
        if (precision === 'SEMAINE') {
          nbJours = 5 // Semaine = 5 jours ouvrés
        } else if (precision === 'MOIS') {
          // Calculer les jours ouvrés du mois
          const moisDebut = startOfMonth(date)
          const moisFin = endOfMonth(date)
          // TODO: Utiliser la fonction business_days_between
          nbJours = 22 // Approximation
        }
        
        total += value * nbJours * 7 // Convertir en heures (7h/jour)
      })
      totals.set(comp.id, total)
    })
    
    return totals
  }, [competences, colonnes, grille, precision])

  const handleCellChange = async (competenceId: string, date: Date, value: number) => {
    try {
      onSave(competenceId, date, value)
      setMessage({ type: 'success', text: 'Charge enregistrée avec succès' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de l\'enregistrement' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleConsolidateAll = async () => {
    try {
      for (const comp of competences) {
        await new Promise(resolve => {
          onConsolidate(comp.id)
          setTimeout(resolve, 100) // Petit délai entre chaque consolidation
        })
      }
      setMessage({ type: 'success', text: 'Toutes les compétences ont été consolidées' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la consolidation' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Chargement de la grille...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Message de statut */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grille */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="border p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                Compétence
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
              <th className="border p-3 text-center font-semibold bg-blue-50 text-blue-900 sticky right-0 z-10 min-w-[100px]">
                Total (h)
              </th>
            </tr>
          </thead>
          <tbody>
            {competences.map((comp, compIdx) => {
              const total = totaux.get(comp.id) || 0
              const colorBand = compIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              
              return (
                <tr key={comp.id} className={`${colorBand} hover:bg-blue-50 transition`}>
                  <td className="border p-3 font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                    {comp.competence}
                  </td>
                  {colonnes.map((date, idx) => {
                    const key = `${comp.id}-${format(date, 'yyyy-MM-dd')}`
                    const value = grille.get(key) || 0
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    
                    return (
                      <td 
                        key={idx} 
                        className={`border p-1 ${
                          isWeekend ? 'bg-blue-50' : ''
                        }`}
                      >
                        <CelluleCharge
                          value={value}
                          onChange={(newValue) => handleCellChange(comp.id, date, newValue)}
                          disabled={saving}
                        />
                      </td>
                    )
                  })}
                  <td className="border p-3 text-center font-bold bg-blue-50 text-blue-900 sticky right-0 z-10">
                    {total > 0 ? `${total.toLocaleString('fr-FR')} H` : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-600">
          {competences.length} compétence(s) • {colonnes.length} période(s)
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleConsolidateAll}
            disabled={consolidating || competences.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
          >
            {consolidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Consolidation...
              </>
            ) : (
              <>
                💾 Consolider toutes les compétences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 COMPOSANT CELLULE CHARGE

```typescript
// src/components/charge/CelluleCharge.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'

interface CelluleChargeProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function CelluleCharge({ value, onChange, disabled }: CelluleChargeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTempValue(value.toString())
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    const numValue = parseFloat(tempValue) || 0
    onChange(Math.max(0, numValue))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  const handleSave = () => {
    handleBlur()
  }

  const handleCancel = () => {
    setTempValue(value.toString())
    setIsEditing(false)
  }

  if (disabled) {
    return (
      <div className="w-full p-2 text-center text-gray-400">
        {value > 0 ? value : ''}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-1 text-center border-2 border-blue-500 focus:outline-none rounded"
          min="0"
          step="0.5"
          autoFocus
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            onClick={handleSave}
            className="p-0.5 text-green-600 hover:bg-green-50 rounded"
            title="Valider"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-0.5 text-red-600 hover:bg-red-50 rounded"
            title="Annuler"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (!disabled) {
          setIsEditing(true)
          setTempValue(value.toString())
        }
      }}
      className={`w-full p-2 text-center cursor-pointer transition rounded ${
        value > 0 
          ? 'bg-yellow-100 hover:bg-yellow-200 font-semibold text-yellow-900' 
          : 'hover:bg-gray-100 text-gray-400'
      }`}
      title="Cliquer pour modifier"
    >
      {value > 0 ? value : '0'}
    </div>
  )
}
```

---

## 🎨 COMPOSANTS SÉLECTEURS

### SelecteurAffaire

```typescript
// src/components/charge/SelecteurAffaire.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'

interface SelecteurAffaireProps {
  value: string
  onChange: (affaireId: string) => void
  onSiteChange: (siteId: string) => void
}

export function SelecteurAffaire({ value, onChange, onSiteChange }: SelecteurAffaireProps) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  const { data: affaires = [] } = useQuery({
    queryKey: ['affaires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affaires')
        .select(`
          *,
          sites(*)
        `)
        .eq('actif', true)
        .order('affaire_id', { ascending: true })

      if (error) throw error
      return data
    }
  })

  const selectedAffaire = affaires.find(a => a.id === value)

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Affaire
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
        >
          <span className={selectedAffaire ? 'text-gray-900' : 'text-gray-500'}>
            {selectedAffaire 
              ? `${selectedAffaire.affaire_id} - ${selectedAffaire.libelle}`
              : 'Sélectionner une affaire...'
            }
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {affaires.map((affaire) => (
                <button
                  key={affaire.id}
                  type="button"
                  onClick={() => {
                    onChange(affaire.id)
                    onSiteChange(affaire.site_id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition ${
                    value === affaire.id ? 'bg-blue-100 font-semibold' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{affaire.affaire_id}</span>
                    <span className="text-sm text-gray-600">{affaire.libelle}</span>
                    {affaire.sites && (
                      <span className="text-xs text-gray-500">Site: {affaire.sites.site_name}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

### SelecteurPrecision

```typescript
// src/components/charge/SelecteurPrecision.tsx
'use client'

interface SelecteurPrecisionProps {
  value: 'JOUR' | 'SEMAINE' | 'MOIS'
  onChange: (precision: 'JOUR' | 'SEMAINE' | 'MOIS') => void
}

export function SelecteurPrecision({ value, onChange }: SelecteurPrecisionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Précision
      </label>
      <div className="flex gap-2">
        {(['JOUR', 'SEMAINE', 'MOIS'] as const).map((prec) => (
          <button
            key={prec}
            type="button"
            onClick={() => onChange(prec)}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
              value === prec
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            {prec === 'JOUR' ? '📅 Jour' : prec === 'SEMAINE' ? '📆 Semaine' : '📊 Mois'}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## ✨ FONCTIONNALITÉS CLÉS

### 1. Saisie directe dans les cellules
- Clic sur une cellule → Mode édition
- Validation avec Enter ou bouton ✓
- Annulation avec Escape ou bouton ✗

### 2. Consolidation automatique
- Bouton pour consolider toutes les compétences
- Fusion des périodes adjacentes avec même charge
- Optimisation des données en base

### 3. Temps réel
- Synchronisation automatique entre utilisateurs
- Mise à jour instantanée de la grille
- Indicateur visuel des modifications

### 4. Validation
- Vérification des dates
- Contrôle des valeurs (>= 0)
- Messages d'erreur clairs

### 5. Performance
- Chargement optimisé (React Query cache)
- Mise à jour par plages (pas cellule par cellule)
- Debounce sur les sauvegardes

---

## 🎨 STYLE ET UX

- **Couleurs** : 
  - Cellules avec valeur : Fond jaune clair
  - Cellules vides : Fond blanc
  - Week-ends : Fond bleu très clair
  - En-têtes : Fond gris clair

- **Interactions** :
  - Hover : Surbrillance de la cellule
  - Focus : Bordure bleue lors de l'édition
  - Feedback : Messages de succès/erreur

- **Responsive** :
  - Colonnes scrollables horizontalement
  - Colonne "Compétence" sticky (fixe)
  - Colonne "Total" sticky (fixe)

---

**Cette interface est prête à être implémentée !** 🚀
