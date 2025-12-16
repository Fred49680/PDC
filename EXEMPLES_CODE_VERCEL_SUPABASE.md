# 💻 EXEMPLES DE CODE - VERCEL + SUPABASE

## 📦 HOOKS PERSONNALISÉS

### useCharge - Gestion de la charge

```typescript
// src/lib/hooks/useCharge.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { useRealtime } from './useRealtime'

interface PeriodeCharge {
  id: string
  affaire_id: string
  site_id: string
  competence_id: string
  date_debut: Date
  date_fin: Date
  nb_ressources: number
}

export function useCharge(affaireId: string, siteId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Charger les périodes
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
      return data as PeriodeCharge[]
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

  // Sauvegarder une période
  const saveMutation = useMutation({
    mutationFn: async (periode: Partial<PeriodeCharge>) => {
      const { data, error } = await supabase
        .from('periodes_charge')
        .upsert({
          ...periode,
          affaire_id: affaireId,
          site_id: siteId
        } as any)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodes_charge'] })
    }
  })

  // Consolider les périodes
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

  return {
    periodes,
    isLoading,
    error,
    save: saveMutation.mutate,
    consolidate: consolidateMutation.mutate,
    isSaving: saveMutation.isPending,
    isConsolidating: consolidateMutation.isPending
  }
}
```

### useAffectations - Gestion des affectations

```typescript
// src/lib/hooks/useAffectations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { useRealtime } from './useRealtime'

interface Affectation {
  id: string
  affaire_id: string
  site_id: string
  ressource_id: string
  competence_id: string
  date_debut: Date
  date_fin: Date
  charge: number
}

export function useAffectations(affaireId: string, siteId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: affectations = [], isLoading, error } = useQuery({
    queryKey: ['affectations', affaireId, siteId],
    queryFn: async () => {
      if (!affaireId || !siteId) return []
      
      const { data, error } = await supabase
        .from('affectations')
        .select(`
          *,
          ressources(*),
          competences(*)
        `)
        .eq('affaire_id', affaireId)
        .eq('site_id', siteId)
        .order('date_debut', { ascending: true })

      if (error) throw error
      return data as Affectation[]
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

  // Sauvegarder une affectation
  const saveMutation = useMutation({
    mutationFn: async (affectation: Partial<Affectation>) => {
      // Vérifier les conflits avant de sauvegarder
      const { data: conflicts } = await supabase.rpc('check_affectation_conflict', {
        p_ressource_id: affectation.ressource_id,
        p_affaire_id: affectation.affaire_id,
        p_site_id: affectation.site_id,
        p_date_debut: affectation.date_debut,
        p_date_fin: affectation.date_fin,
        p_exclude_id: affectation.id || null
      })

      if (conflicts && conflicts.length > 0) {
        throw new Error('Conflit d\'affectation détecté')
      }

      const { data, error } = await supabase
        .from('affectations')
        .upsert({
          ...affectation,
          affaire_id: affaireId,
          site_id: siteId
        } as any)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] })
    }
  })

  // Consolider les affectations
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

  return {
    affectations,
    isLoading,
    error,
    save: saveMutation.mutate,
    consolidate: consolidateMutation.mutate,
    isSaving: saveMutation.isPending,
    isConsolidating: consolidateMutation.isPending
  }
}
```

### useAbsences - Gestion des absences

```typescript
// src/lib/hooks/useAbsences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { useRealtime } from './useRealtime'

interface Absence {
  id: string
  ressource_id: string
  site_id: string
  date_debut: Date
  date_fin: Date
  type: string
  competence_id?: string
  commentaire?: string
  validation_saisie: 'Oui' | 'Non'
  saisi_par?: string
  date_saisie?: Date
}

export function useAbsences(ressourceId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: absences = [], isLoading, error } = useQuery({
    queryKey: ['absences', ressourceId],
    queryFn: async () => {
      let query = supabase
        .from('absences')
        .select(`
          *,
          ressources(*),
          competences(*)
        `)
        .order('date_debut', { ascending: false })

      if (ressourceId) {
        query = query.eq('ressource_id', ressourceId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Absence[]
    }
  })

  // Temps réel
  useRealtime({
    table: 'absences',
    filter: ressourceId ? `ressource_id=eq.${ressourceId}` : undefined,
    callback: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] })
    }
  })

  // Sauvegarder une absence
  const saveMutation = useMutation({
    mutationFn: async (absence: Partial<Absence>) => {
      // Vérifier si la ressource est absente
      const { data: isAbsent } = await supabase.rpc('is_ressource_absent', {
        p_ressource_id: absence.ressource_id,
        p_date: absence.date_debut
      })

      if (isAbsent) {
        throw new Error('Ressource déjà absente sur cette période')
      }

      // Initialiser la validation si ce n'est pas une formation
      const isFormation = absence.type?.toUpperCase().includes('FORMATION') || 
                         absence.type?.toUpperCase().includes('TRAINING')

      const absenceData: any = {
        ...absence,
        validation_saisie: isFormation ? 'Oui' : 'Non',
        saisi_par: absence.saisi_par || (await supabase.auth.getUser()).data.user?.id,
        date_saisie: isFormation ? null : new Date()
      }

      if (!isFormation && !absence.commentaire) {
        absenceData.commentaire = 'En attente validation'
      }

      const { data, error } = await supabase
        .from('absences')
        .upsert(absenceData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] })
    }
  })

  // Valider une absence
  const validateMutation = useMutation({
    mutationFn: async (absenceId: string) => {
      const user = (await supabase.auth.getUser()).data.user
      
      const { data, error } = await supabase
        .from('absences')
        .update({
          validation_saisie: 'Oui',
          valide_par: user?.id,
          date_validation: new Date(),
          commentaire: `Validé par ${user?.email} le ${new Date().toLocaleDateString('fr-FR')}`
        })
        .eq('id', absenceId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] })
    }
  })

  return {
    absences,
    isLoading,
    error,
    save: saveMutation.mutate,
    validate: validateMutation.mutate,
    isSaving: saveMutation.isPending,
    isValidating: validateMutation.isPending
  }
}
```

---

## 🎨 COMPOSANTS REACT

### GrilleCharge - Composant principal

```typescript
// src/components/charge/GrilleCharge.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, eachDayOfInterval, startOfWeek, addDays, addMonths, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CelluleCharge } from './CelluleCharge'
import { createClient } from '@/lib/supabase/client'

interface GrilleChargeProps {
  affaireId: string
  siteId: string
  dateDebut: Date
  dateFin: Date
  precision: 'JOUR' | 'SEMAINE' | 'MOIS'
  periodes: any[]
  onSave: (periode: any) => void
  onConsolidate: (competenceId: string) => void
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

  const handleCellChange = async (competenceId: string, date: Date, value: number) => {
    if (value === 0) {
      // TODO: Implémenter suppression
      return
    }

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
    return <div className="text-center p-8">Chargement...</div>
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-3 text-left font-semibold">Compétence</th>
            {colonnes.map((date, idx) => (
              <th key={idx} className="border p-2 text-center text-sm font-semibold min-w-[80px]">
                {format(date, precision === 'JOUR' ? 'dd/MM' : precision === 'SEMAINE' ? 'dd MMM' : 'MMM yyyy', { locale: fr })}
              </th>
            ))}
            <th className="border p-3 text-center font-semibold bg-blue-50">Total</th>
          </tr>
        </thead>
        <tbody>
          {competences.map(comp => {
            const total = Array.from(grille.entries())
              .filter(([key]) => key.startsWith(`${comp.id}-`))
              .reduce((sum, [, val]) => sum + val, 0)

            return (
              <tr key={comp.id} className="hover:bg-gray-50">
                <td className="border p-3 font-medium">{comp.competence}</td>
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
                <td className="border p-3 text-center font-bold bg-blue-50">
                  {total}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      
      <div className="mt-4 flex gap-2 justify-end">
        <button
          onClick={() => {
            competences.forEach(comp => {
              onConsolidate(comp.id)
            })
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Consolider toutes les compétences
        </button>
      </div>
    </div>
  )
}
```

### CelluleCharge - Cellule éditable

```typescript
// src/components/charge/CelluleCharge.tsx
'use client'

import { useState } from 'react'

interface CelluleChargeProps {
  value: number
  onChange: (value: number) => void
}

export function CelluleCharge({ value, onChange }: CelluleChargeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

  const handleBlur = () => {
    const numValue = parseFloat(tempValue) || 0
    onChange(Math.max(0, numValue))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        type="number"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full p-1 text-center border-2 border-blue-500 focus:outline-none"
        autoFocus
        min="0"
        step="0.5"
      />
    )
  }

  return (
    <div
      onClick={() => {
        setIsEditing(true)
        setTempValue(value.toString())
      }}
      className="w-full p-2 text-center cursor-pointer hover:bg-blue-50 transition"
    >
      {value > 0 ? value : ''}
    </div>
  )
}
```

---

## 🔐 AUTHENTIFICATION

### Page de connexion

```typescript
// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      router.push('/charge')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Middleware d'authentification

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protéger les routes nécessitant une authentification
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/charge', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 📊 DASHBOARD

### Composant Dashboard

```typescript
// src/components/dashboard/Dashboard.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GraphiqueCharge } from './GraphiqueCharge'
import { TableauAffectations } from './TableauAffectations'
import { Indicateurs } from './Indicateurs'

export function Dashboard() {
  const supabase = createClient()

  // Charger les données agrégées
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      // Utiliser une vue ou fonction PostgreSQL pour les stats
      const { data, error } = await supabase
        .from('v_dashboard_stats') // Vue à créer dans Supabase
        .select('*')
        .single()

      if (error) throw error
      return data
    }
  })

  if (isLoading) {
    return <div>Chargement du dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <Indicateurs stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraphiqueCharge />
        <TableauAffectations />
      </div>
    </div>
  )
}
```

---

## 🎨 GANTT

### Composant Gantt

```typescript
// src/components/gantt/GanttChart.tsx
'use client'

import { useMemo } from 'react'
import { format, eachDayOfInterval } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface GanttChartProps {
  dateDebut: Date
  dateFin: Date
}

export function GanttChart({ dateDebut, dateFin }: GanttChartProps) {
  const supabase = createClient()

  // Charger les affectations et absences
  const { data: affectations = [] } = useQuery({
    queryKey: ['affectations_gantt', dateDebut, dateFin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affectations')
        .select(`
          *,
          ressources(*),
          affaires(*),
          competences(*)
        `)
        .gte('date_fin', dateDebut.toISOString())
        .lte('date_debut', dateFin.toISOString())

      if (error) throw error
      return data
    }
  })

  const { data: absences = [] } = useQuery({
    queryKey: ['absences_gantt', dateDebut, dateFin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select(`
          *,
          ressources(*)
        `)
        .gte('date_fin', dateDebut.toISOString())
        .lte('date_debut', dateFin.toISOString())

      if (error) throw error
      return data
    }
  })

  // Construire la grille Gantt
  const dates = useMemo(() => {
    return eachDayOfInterval({ start: dateDebut, end: dateFin })
  }, [dateDebut, dateFin])

  // Grouper par ressource
  const ressourcesMap = useMemo(() => {
    const map = new Map<string, any[]>()
    
    affectations.forEach(aff => {
      const resName = aff.ressources?.nom_prenom || 'Inconnu'
      if (!map.has(resName)) {
        map.set(resName, [])
      }
      map.get(resName)!.push(aff)
    })

    return map
  }, [affectations])

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10">Ressource</th>
            {dates.map((date, idx) => (
              <th key={idx} className="border p-1 text-center text-xs min-w-[30px]">
                {format(date, 'dd')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(ressourcesMap.entries()).map(([ressource, affs]) => (
            <tr key={ressource}>
              <td className="border p-2 sticky left-0 bg-white z-10 font-medium">
                {ressource}
              </td>
              {dates.map((date, idx) => {
                const aff = affs.find(a => 
                  new Date(a.date_debut) <= date && 
                  new Date(a.date_fin) >= date
                )
                const abs = absences.find(a => 
                  a.ressources?.nom_prenom === ressource &&
                  new Date(a.date_debut) <= date && 
                  new Date(a.date_fin) >= date
                )

                let color = 'transparent'
                if (abs) {
                  color = abs.type?.includes('Formation') ? '#FFC000' : '#C0C0C0'
                } else if (aff) {
                  // Couleur par site
                  color = getSiteColor(aff.affaires?.site_id || '')
                }

                return (
                  <td
                    key={idx}
                    className="border p-1"
                    style={{ backgroundColor: color }}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getSiteColor(siteId: string): string {
  // Palette de couleurs par site
  const colors = [
    '#FFBC79', '#7CC5A9', '#92A8D1', '#FFD67C',
    '#6ECEDA', '#F4A7A4', '#B39CC8', '#8CCFA9'
  ]
  const index = parseInt(siteId) % colors.length
  return colors[index] || '#E0E0E0'
}
```

---

## 🔧 UTILITAIRES

### Fonctions calendrier

```typescript
// src/lib/utils/calendar.ts
import { format, eachDayOfInterval, isWeekend, addDays } from 'date-fns'

export function businessDaysBetween(dateStart: Date, dateFin: Date): number {
  const dates = eachDayOfInterval({ start: dateStart, end: dateFin })
  return dates.filter(date => !isWeekend(date)).length
}

export function nextBusinessDay(date: Date): Date {
  let next = addDays(date, 1)
  while (isWeekend(next)) {
    next = addDays(next, 1)
  }
  return next
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date)
}
```

---

## 🚀 DÉPLOIEMENT

### Configuration Vercel

1. Connecter votre repo GitHub à Vercel
2. Ajouter les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Déployer !

### Commandes utiles

```bash
# Développement local
npm run dev

# Build production
npm run build

# Générer les types TypeScript depuis Supabase
npm run generate-types
```

---

**Ces exemples sont prêts à être utilisés !** Adaptez-les selon vos besoins spécifiques.
