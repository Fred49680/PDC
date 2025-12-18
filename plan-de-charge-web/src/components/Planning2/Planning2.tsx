'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Loader2,
  Sparkles
} from 'lucide-react'
import { normalizeDateToUTC } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import type { Precision } from '@/types/charge'
import type { Affaire } from '@/types/charge'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import type { Absence } from '@/types/absences'
import { createClient } from '@/lib/supabase/client'
import type { Affectation } from '@/types/affectations'

interface Planning2Props {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  affaires: Affaire[]
  onDateChange?: (newDateDebut: Date, newDateFin: Date) => void
  onPrecisionChange?: (newPrecision: Precision) => void
}

interface ColonneDate {
  date: Date
  label: string
  shortLabel: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
}

interface CompetenceData {
  competence: string
  totalBesoin: number
  totalAffecte: number
  ressources: Array<{
    id: string
    nom: string
    isPrincipale: boolean
    affectations: Map<number, boolean> // Map<colIndex, isAffecte>
  }>
  colonnes: Map<number, number> // Map<colIndex, besoin>
}

// ========================================
// UTILITIES
// ========================================
const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())

const getDatesBetween = (start: Date, end: Date): Date[] => {
  const dates: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

const formatSemaineISO = (date: Date): string => {
  const year = date.getFullYear()
  const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `S${week.toString().padStart(2, '0')}`
}

const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

const subWeeks = (date: Date, weeks: number): Date => addWeeks(date, -weeks)

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export default function Planning2({
  affaireId,
  site,
  dateDebut: propDateDebut,
  dateFin: propDateFin,
  precision: propPrecision,
  affaires,
  onDateChange,
  onPrecisionChange,
}: Planning2Props) {
  const [precision, setPrecision] = useState<Precision>(propPrecision)
  const [dateDebut, setDateDebut] = useState(propDateDebut)
  const [dateFin, setDateFin] = useState(propDateFin)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedCompetences, setSelectedCompetences] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  
  // Synchroniser avec les props
  useEffect(() => {
    if (propPrecision !== precision) setPrecision(propPrecision)
    if (propDateDebut.getTime() !== dateDebut.getTime()) setDateDebut(propDateDebut)
    if (propDateFin.getTime() !== dateFin.getTime()) setDateFin(propDateFin)
  }, [propPrecision, propDateDebut, propDateFin])
  
  // Chargement des données
  const { periodes, loading: loadingCharge, savePeriode, deletePeriode, consolidate } = useCharge({
    affaireId,
    site,
    autoRefresh,
  })

  const { affectations, loading: loadingAffectations, saveAffectation, deleteAffectation, consolidate: consolidateAffectations } = useAffectations({
    affaireId,
    site,
    autoRefresh,
  })

  const { absences } = useAbsences({})
  const { ressources, competences: competencesMap, loading: loadingRessources } = useRessources({
    site,
    actif: true,
  })

  // État pour toutes les affectations (toutes affaires)
  const [toutesAffectationsRessources, setToutesAffectationsRessources] = useState<Map<string, Affectation[]>>(new Map())
  const [affairesDetails, setAffairesDetails] = useState<Map<string, { affaire_id: string; site: string; libelle: string }>>(new Map())

  useEffect(() => {
    const loadAllAffectations = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('affectations')
          .select(`
            *,
            affaires!inner(affaire_id, site, libelle)
          `)
          .order('date_debut', { ascending: true })

        if (error) {
          console.error('[Planning2] Erreur chargement toutes affectations:', error)
          return
        }

        const affectationsMap = new Map<string, Affectation[]>()
        const affairesMap = new Map<string, { affaire_id: string; site: string; libelle: string }>()

        if (data) {
          data.forEach((a: any) => {
            const ressourceId = a.ressource_id
            if (!affectationsMap.has(ressourceId)) {
              affectationsMap.set(ressourceId, [])
            }
            
            if (a.affaires && !affairesMap.has(a.affaire_id)) {
              affairesMap.set(a.affaire_id, {
                affaire_id: a.affaires.affaire_id || '',
                site: a.affaires.site || '',
                libelle: a.affaires.libelle || '',
              })
            }
            
            const affectation: Affectation = {
              id: a.id,
              affaire_id: a.affaire_id,
              site: a.site,
              ressource_id: a.ressource_id,
              competence: a.competence,
              date_debut: new Date(a.date_debut),
              date_fin: new Date(a.date_fin),
              charge: a.charge,
              created_at: new Date(a.created_at),
              updated_at: new Date(a.updated_at),
              created_by: a.created_by,
              updated_by: a.updated_by,
            }
            
            affectationsMap.get(ressourceId)!.push(affectation)
          })
        }

        setToutesAffectationsRessources(affectationsMap)
        setAffairesDetails(affairesMap)
      } catch (err) {
        console.error('[Planning2] Erreur chargement toutes affectations:', err)
      }
    }

    loadAllAffectations()
  }, [])

  // Colonnes générées
  const colonnes = useMemo(() => {
    const cols: ColonneDate[] = []
    
    if (precision === 'JOUR') {
      const dates = getDatesBetween(dateDebut, dateFin)
      dates.forEach((date) => {
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })
        const day = date.getDate().toString().padStart(2, '0')
        const month = date.toLocaleDateString('fr-FR', { month: 'short' })
        cols.push({
          date,
          label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          shortLabel: `${dayName} ${day} ${month}`,
          isWeekend: isWeekend(date),
          isHoliday: isFrenchHoliday(date),
          semaineISO: formatSemaineISO(date),
        })
      })
    } else if (precision === 'SEMAINE') {
      let currentDate = new Date(dateDebut)
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentDate.setDate(currentDate.getDate() - daysToMonday)
      
      while (currentDate <= dateFin) {
        const weekStart = new Date(currentDate)
        const weekEnd = new Date(currentDate)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        cols.push({
          date: weekStart,
          label: `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
          shortLabel: `S${formatSemaineISO(weekStart).replace('S', '')}`,
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(weekStart),
        })
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      let currentDate = new Date(dateDebut)
      currentDate.setDate(1)
      
      while (currentDate <= dateFin) {
        const monthStart = new Date(currentDate)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        if (monthEnd > dateFin) monthEnd.setTime(dateFin.getTime())
        
        cols.push({
          date: monthStart,
          label: monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          shortLabel: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(monthStart),
        })
        
        currentDate.setMonth(currentDate.getMonth() + 1)
        currentDate.setDate(1)
      }
    }
    
    return cols
  }, [dateDebut, dateFin, precision])

  // Liste des compétences
  const competencesList = useMemo(() => {
    const compSet = new Set<string>()
    periodes.forEach(p => { if (p.competence) compSet.add(p.competence) })
    competencesMap.forEach((comps) => {
      comps.forEach(comp => { if (comp.competence) compSet.add(comp.competence) })
    })
    const list = Array.from(compSet).sort()
    
    // Auto-sélectionner celles avec des données
    if (selectedCompetences.size === 0) {
      const avecDonnees = new Set<string>()
      periodes.forEach(p => {
        if (p.competence) {
          const pDateDebut = normalizeDateToUTC(new Date(p.date_debut))
          const pDateFin = normalizeDateToUTC(new Date(p.date_fin))
          const dateDebutUTC = normalizeDateToUTC(dateDebut)
          const dateFinUTC = normalizeDateToUTC(dateFin)
          if (pDateDebut <= dateFinUTC && pDateFin >= dateDebutUTC) {
            avecDonnees.add(p.competence)
          }
        }
      })
      affectations.forEach(aff => {
        if (aff.competence) {
          const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
          const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
          const dateDebutUTC = normalizeDateToUTC(dateDebut)
          const dateFinUTC = normalizeDateToUTC(dateFin)
          if (affDateDebut <= dateFinUTC && affDateFin >= dateDebutUTC) {
            avecDonnees.add(aff.competence)
          }
        }
      })
      if (avecDonnees.size > 0) {
        setSelectedCompetences(avecDonnees)
      }
    }
    
    return list
  }, [periodes, competencesMap, dateDebut, dateFin, affectations, selectedCompetences.size])

  // Grilles de données
  const grilleCharge = useMemo(() => {
    const grille = new Map<string, number>()
    periodes.forEach((periode) => {
      const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
      const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
      
      colonnes.forEach((col, idx) => {
        const colDate = normalizeDateToUTC(col.date)
        let correspond = false
        
        if (precision === 'JOUR') {
          correspond = periodeDateDebut <= colDate && periodeDateFin >= colDate
          if (correspond && (col.isWeekend || col.isHoliday)) {
            if (periode.force_weekend_ferie !== true) return
          }
        } else if (precision === 'SEMAINE') {
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(col.date)
          weekStart.setDate(weekStart.getDate() - daysToMonday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          const weekStartUTC = normalizeDateToUTC(weekStart)
          const weekEndUTC = normalizeDateToUTC(weekEnd)
          correspond = periodeDateDebut <= weekEndUTC && periodeDateFin >= weekStartUTC
        } else if (precision === 'MOIS') {
          const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          const monthStartUTC = normalizeDateToUTC(monthStart)
          const monthEndUTC = normalizeDateToUTC(monthEnd)
          correspond = periodeDateDebut <= monthEndUTC && periodeDateFin >= monthStartUTC
        }
        
        if (correspond) {
          const cellKey = `${periode.competence}|${idx}`
          grille.set(cellKey, periode.nb_ressources)
        }
      })
    })
    return grille
  }, [periodes, colonnes, precision])

  const grilleAffectations = useMemo(() => {
    const grille = new Map<string, Set<string>>()
    affectations.forEach((affectation) => {
      const affDateDebut = normalizeDateToUTC(new Date(affectation.date_debut))
      const affDateFin = normalizeDateToUTC(new Date(affectation.date_fin))
      
      colonnes.forEach((col, idx) => {
        const colDate = normalizeDateToUTC(col.date)
        let correspond = false
        
        if (precision === 'JOUR') {
          correspond = affDateDebut <= colDate && affDateFin >= colDate
          if (correspond && (col.isWeekend || col.isHoliday)) {
            if (affectation.force_weekend_ferie !== true) return
          }
        } else if (precision === 'SEMAINE') {
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(col.date)
          weekStart.setDate(weekStart.getDate() - daysToMonday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          const weekStartUTC = normalizeDateToUTC(weekStart)
          const weekEndUTC = normalizeDateToUTC(weekEnd)
          correspond = affDateDebut <= weekEndUTC && affDateFin >= weekStartUTC
        } else if (precision === 'MOIS') {
          const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          const monthStartUTC = normalizeDateToUTC(monthStart)
          const monthEndUTC = normalizeDateToUTC(monthEnd)
          correspond = affDateDebut <= monthEndUTC && affDateFin >= monthStartUTC
        }
        
        if (correspond) {
          const cellKey = `${affectation.competence}|${idx}`
          if (!grille.has(cellKey)) grille.set(cellKey, new Set<string>())
          grille.get(cellKey)!.add(affectation.ressource_id)
        }
      })
    })
    return grille
  }, [affectations, colonnes, precision])

  // Ressources par compétence
  const ressourcesParCompetence = useMemo(() => {
    const map = new Map<string, typeof ressources>()
    competencesList.forEach((comp) => {
      const ressourcesComp = ressources.filter((r) => {
        const competencesRessource = competencesMap.get(r.id) || []
        return competencesRessource.some((c) => c.competence === comp)
      })
      map.set(comp, ressourcesComp)
    })
    return map
  }, [ressources, competencesMap, competencesList])

  // Données organisées par compétence
  const competencesData = useMemo(() => {
    const data: CompetenceData[] = []
    
    selectedCompetences.forEach((comp) => {
      const colonnesData = new Map<number, number>()
      const ressourcesData = (ressourcesParCompetence.get(comp) || []).map(r => ({
        id: r.id,
        nom: r.nom,
        isPrincipale: (competencesMap.get(r.id) || []).some(c => c.competence === comp && c.type_comp === 'P'),
        affectations: new Map<number, boolean>(),
      }))

      // Remplir les besoins
      colonnes.forEach((col, idx) => {
        const cellKey = `${comp}|${idx}`
        const besoin = grilleCharge.get(cellKey) || 0
        colonnesData.set(idx, besoin)
      })

      // Remplir les affectations
      colonnes.forEach((col, idx) => {
        const cellKey = `${comp}|${idx}`
        const affectees = grilleAffectations.get(cellKey) || new Set<string>()
        ressourcesData.forEach(ressource => {
          ressource.affectations.set(idx, affectees.has(ressource.id))
        })
      })

      const totalBesoin = Array.from(colonnesData.values()).reduce((sum, v) => sum + v, 0)
      const totalAffecte = Array.from(grilleAffectations.entries())
        .filter(([key]) => key.startsWith(`${comp}|`))
        .reduce((sum, [, set]) => sum + set.size, 0)

      data.push({
        competence: comp,
        totalBesoin,
        totalAffecte,
        ressources: ressourcesData,
        colonnes: colonnesData,
      })
    })

    return data
  }, [selectedCompetences, ressourcesParCompetence, competencesMap, colonnes, grilleCharge, grilleAffectations])

  // États de sauvegarde
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const saveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Modal de confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'error' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'OK',
    cancelText: 'Annuler',
    type: 'warning'
  })

  const pendingConfirmResolver = useRef<((value: boolean) => void) | null>(null)

  const confirmAsync = useCallback((
    title: string,
    message: string,
    options?: {
      confirmText?: string
      cancelText?: string
      type?: 'warning' | 'error' | 'info'
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      pendingConfirmResolver.current = resolve
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          if (pendingConfirmResolver.current) {
            pendingConfirmResolver.current(true)
            pendingConfirmResolver.current = null
          }
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          if (pendingConfirmResolver.current) {
            pendingConfirmResolver.current(false)
            pendingConfirmResolver.current = null
          }
        },
        confirmText: options?.confirmText || 'OK',
        cancelText: options?.cancelText || 'Annuler',
        type: options?.type || 'warning'
      })
    })
  }, [])

  const showAlert = useCallback((
    title: string,
    message: string,
    type: 'error' | 'info' = 'error'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      confirmText: 'Compris',
      cancelText: '',
      type
    })
  }, [])

  // Handlers
  const handleChargeChange = useCallback(async (competence: string, colIndex: number, value: number) => {
    const col = colonnes[colIndex]
    if (!col) return

    const cellKey = `${competence}|${colIndex}`
    const nbRessources = Math.max(0, Math.floor(value))
    
    setSavingCells(prev => new Set(prev).add(cellKey))
    
    if (saveTimeoutRef.current.has(cellKey)) {
      clearTimeout(saveTimeoutRef.current.get(cellKey)!)
    }
    
    const timeout = setTimeout(async () => {
      try {
        let dateDebutPeriode: Date
        let dateFinPeriode: Date
        let forceWeekendFerie = false
        
        if (precision === 'JOUR') {
          dateDebutPeriode = normalizeDateToUTC(col.date)
          dateFinPeriode = normalizeDateToUTC(col.date)
          
          if (nbRessources > 0 && (col.isWeekend || col.isHoliday)) {
            const confirme = await confirmAsync(
              'Attention',
              `Vous souhaitez enregistrer une charge un ${col.isWeekend ? 'week-end' : 'jour férié'} (${col.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}).\n\nVoulez-vous continuer ?`,
              { type: 'warning' }
            )
            if (!confirme) {
              setSavingCells(prev => {
                const newSet = new Set(prev)
                newSet.delete(cellKey)
                return newSet
              })
              saveTimeoutRef.current.delete(cellKey)
              return
            }
            forceWeekendFerie = true
          }
        } else if (precision === 'SEMAINE') {
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          dateDebutPeriode = new Date(col.date)
          dateDebutPeriode.setDate(dateDebutPeriode.getDate() - daysToMonday)
          dateFinPeriode = new Date(dateDebutPeriode)
          dateFinPeriode.setDate(dateFinPeriode.getDate() + 6)
          dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
          dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
        } else if (precision === 'MOIS') {
          dateDebutPeriode = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          dateFinPeriode = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          if (dateFinPeriode > dateFin) dateFinPeriode = new Date(dateFin)
          dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
          dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
        } else {
          dateDebutPeriode = normalizeDateToUTC(col.date)
          dateFinPeriode = normalizeDateToUTC(col.date)
        }
        
        const periodeExistante = periodes.find(
          (p) => {
            const pDateDebut = normalizeDateToUTC(new Date(p.date_debut))
            const pDateFin = normalizeDateToUTC(new Date(p.date_fin))
            return p.competence === competence && 
                   dateDebutPeriode <= pDateFin && 
                   dateFinPeriode >= pDateDebut
          }
        )
        
        if (nbRessources === 0 && periodeExistante) {
          await deletePeriode(periodeExistante.id)
        } else if (nbRessources > 0) {
          await savePeriode({
            id: periodeExistante?.id,
            competence,
            date_debut: dateDebutPeriode,
            date_fin: dateFinPeriode,
            nb_ressources: nbRessources,
            force_weekend_ferie: forceWeekendFerie
          })
          
          if (precision === 'JOUR' && autoRefresh) {
            setTimeout(() => {
              consolidate(competence).catch(err => console.error('[Planning2] Erreur consolidation:', err))
            }, 1000)
          }
        }
      } catch (err) {
        console.error('[Planning2] Erreur savePeriode:', err)
      } finally {
        setSavingCells(prev => {
          const newSet = new Set(prev)
          newSet.delete(cellKey)
          return newSet
        })
        saveTimeoutRef.current.delete(cellKey)
      }
    }, 500)
    
    saveTimeoutRef.current.set(cellKey, timeout)
  }, [periodes, savePeriode, deletePeriode, consolidate, precision, autoRefresh, dateFin, colonnes, confirmAsync])

  const handleAffectationChange = useCallback(async (competence: string, ressourceId: string, colIndex: number, checked: boolean) => {
    const col = colonnes[colIndex]
    if (!col) return

    let dateDebutAffectation: Date
    let dateFinAffectation: Date
    let forceWeekendFerie = false
    
    if (precision === 'JOUR') {
      dateDebutAffectation = normalizeDateToUTC(col.date)
      dateFinAffectation = normalizeDateToUTC(col.date)
      
      if (checked && (col.isWeekend || col.isHoliday)) {
        const confirme = await confirmAsync(
          'Attention',
          `Vous souhaitez affecter cette ressource un ${col.isWeekend ? 'week-end' : 'jour férié'} (${col.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}).\n\nVoulez-vous continuer ?`,
          { type: 'warning' }
        )
        if (!confirme) return
        forceWeekendFerie = true
      }
    } else if (precision === 'SEMAINE') {
      const dayOfWeek = col.date.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      dateDebutAffectation = new Date(col.date)
      dateDebutAffectation.setDate(dateDebutAffectation.getDate() - daysToMonday)
      dateFinAffectation = new Date(dateDebutAffectation)
      dateFinAffectation.setDate(dateFinAffectation.getDate() + 6)
      dateDebutAffectation = normalizeDateToUTC(dateDebutAffectation)
      dateFinAffectation = normalizeDateToUTC(dateFinAffectation)
    } else if (precision === 'MOIS') {
      dateDebutAffectation = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
      dateFinAffectation = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
      if (dateFinAffectation > dateFin) dateFinAffectation = new Date(dateFin)
      dateDebutAffectation = normalizeDateToUTC(dateDebutAffectation)
      dateFinAffectation = normalizeDateToUTC(dateFinAffectation)
    } else {
      dateDebutAffectation = normalizeDateToUTC(col.date)
      dateFinAffectation = normalizeDateToUTC(col.date)
    }
    
    try {
      if (checked) {
        // Vérifier absences
        const dateDebutStr = dateDebutAffectation.toISOString().split('T')[0]
        const dateFinStr = dateFinAffectation.toISOString().split('T')[0]

        const absenceConflit = absences.find((abs) => {
          if (abs.ressource_id !== ressourceId) return false
          const absDateDebut = abs.date_debut instanceof Date 
            ? abs.date_debut.toISOString().split('T')[0]
            : new Date(abs.date_debut).toISOString().split('T')[0]
          const absDateFin = abs.date_fin instanceof Date 
            ? abs.date_fin.toISOString().split('T')[0]
            : new Date(abs.date_fin).toISOString().split('T')[0]
          return absDateDebut <= dateFinStr && absDateFin >= dateDebutStr
        })

        if (absenceConflit && !forceWeekendFerie) {
          const absDateDebut = absenceConflit.date_debut instanceof Date 
            ? absenceConflit.date_debut
            : new Date(absenceConflit.date_debut)
          const absDateFin = absenceConflit.date_fin instanceof Date 
            ? absenceConflit.date_fin
            : new Date(absenceConflit.date_fin)
          
          showAlert(
            'Affectation impossible',
            `Impossible d'affecter : la ressource est absente (${absenceConflit.type}) du ${absDateDebut.toLocaleDateString('fr-FR')} au ${absDateFin.toLocaleDateString('fr-FR')}`,
            'error'
          )
          return
        }

        // Vérifier sur-affectations
        const affectationsRessource = toutesAffectationsRessources.get(ressourceId) || []
        const dateDebutUTC = normalizeDateToUTC(dateDebutAffectation)
        const dateFinUTC = normalizeDateToUTC(dateFinAffectation)
        
        const affectationsConflit = affectationsRessource.filter((aff) => {
          const affDateDebut = normalizeDateToUTC(aff.date_debut)
          const affDateFin = normalizeDateToUTC(aff.date_fin)
          const chevauche = affDateDebut <= dateFinUTC && affDateFin >= dateDebutUTC
          const autreAffaire = aff.affaire_id !== affaireId || aff.competence !== competence
          return chevauche && autreAffaire
        })

        if (affectationsConflit.length > 0) {
          const details: string[] = []
          affectationsConflit.forEach((aff) => {
            const affaireDetails = affairesDetails.get(aff.affaire_id)
            const affaireLabel = affaireDetails
              ? `${affaireDetails.affaire_id}${affaireDetails.libelle ? ' - ' + affaireDetails.libelle : ''}`
              : 'Affaire inconnue'
            details.push(
              `• ${affaireLabel} / ${aff.site} / ${aff.competence} (${new Date(aff.date_debut).toLocaleDateString('fr-FR')} - ${new Date(aff.date_fin).toLocaleDateString('fr-FR')})`
            )
          })
          
          showAlert(
            'Affectation impossible',
            `Impossible d'affecter : la ressource est déjà affectée sur cette période :\n\n${details.join('\n')}\n\nUne ressource ne peut pas être affectée à plusieurs affaires en même temps.`,
            'error'
          )
          return
        }

        await saveAffectation({
          ressource_id: ressourceId,
          competence,
          date_debut: dateDebutAffectation,
          date_fin: dateFinAffectation,
          charge: 1,
          force_weekend_ferie: forceWeekendFerie,
        })
        
        if (precision === 'JOUR' && autoRefresh) {
          setTimeout(() => {
            consolidateAffectations(competence).catch(err => console.error('[Planning2] Erreur consolidation affectations:', err))
          }, 1000)
        }
      } else {
        const affectationASupprimer = affectations.find(a => {
          const aDateDebut = normalizeDateToUTC(new Date(a.date_debut))
          const aDateFin = normalizeDateToUTC(new Date(a.date_fin))
          return a.ressource_id === ressourceId && 
                 a.competence === competence &&
                 aDateDebut <= dateFinAffectation &&
                 aDateFin >= dateDebutAffectation
        })
        
        if (affectationASupprimer?.id) {
          await deleteAffectation(affectationASupprimer.id)
        }
      }
    } catch (err) {
      console.error('[Planning2] Erreur saveAffectation/deleteAffectation:', err)
    }
  }, [affectations, saveAffectation, deleteAffectation, consolidateAffectations, precision, dateFin, absences, toutesAffectationsRessources, affairesDetails, affaireId, colonnes, confirmAsync, showAlert, autoRefresh])

  // Navigation
  const handlePreviousPeriod = () => {
    setDateDebut(prev => subWeeks(prev, 1))
    setDateFin(prev => subWeeks(prev, 1))
  }

  const handleNextPeriod = () => {
    setDateDebut(prev => addWeeks(prev, 1))
    setDateFin(prev => addWeeks(prev, 1))
  }

  const toggleCompetence = useCallback((comp: string) => {
    setSelectedCompetences(prev => {
      const newSet = new Set(prev)
      if (newSet.has(comp)) {
        newSet.delete(comp)
      } else {
        newSet.add(comp)
      }
      return newSet
    })
  }, [])

  // Composant interne pour gérer les cellules de ressources avec tooltip
  const RessourceCell = React.memo(({
    ressource,
    isAffecte,
    absence,
    absenceColorClass,
    isOver,
    totalAffecteCol,
    besoin,
    competence,
    colIndex,
    onAffectationChange
  }: {
    ressource: { id: string; nom: string; isPrincipale: boolean }
    isAffecte: boolean
    absence: Absence | null
    absenceColorClass: string
    isOver: boolean
    totalAffecteCol: number
    besoin: number
    competence: string
    colIndex: number
    onAffectationChange: (competence: string, ressourceId: string, colIndex: number, checked: boolean) => void
  }) => {
    const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number } | null>(null)
    const [showTooltip, setShowTooltip] = React.useState(false)
    const cellRef = React.useRef<HTMLDivElement>(null)
    
    const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (absence || isAffecte) {
        // Positionner le tooltip au niveau du curseur avec un petit offset
        setTooltipPos({
          top: e.clientY + 10,
          left: e.clientX
        })
        setShowTooltip(true)
      }
    }, [absence, isAffecte])
    
    const handleMouseEnter = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (absence || isAffecte) {
        // Initialiser la position au niveau du curseur
        setTooltipPos({
          top: e.clientY + 10,
          left: e.clientX
        })
        setShowTooltip(true)
      }
    }, [absence, isAffecte])
    
    const handleMouseLeave = React.useCallback(() => {
      setShowTooltip(false)
      setTooltipPos(null)
    }, [])
    
    return (
      <>
        <div
          ref={cellRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`relative isolate z-10 group p-2 rounded-lg border-2 transition-all ${
            isAffecte
              ? 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-600 shadow-md'
              : absence
              ? `${absenceColorClass} border-opacity-50 cursor-not-allowed opacity-70`
              : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAffecte}
              onChange={(e) => onAffectationChange(competence, ressource.id, colIndex, e.target.checked)}
              disabled={!!absence}
              className={`w-4 h-4 rounded accent-green-600 cursor-pointer ${
                absence ? 'cursor-not-allowed opacity-50' : ''
              }`}
            />
            <span className={`text-xs font-medium truncate flex-1 ${
              isAffecte ? 'text-white' : 'text-gray-700'
            }`}>
              {ressource.isPrincipale && <span className="text-indigo-600">★ </span>}
              {ressource.nom}
            </span>
          </div>
        </div>
        
        {/* Tooltip avec position fixed */}
        {(absence || isAffecte) && showTooltip && tooltipPos && (
          <div
            className="fixed z-[99999] opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-2 whitespace-pre-line max-w-xs pointer-events-none"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: 'translateY(-100%) translateX(-50%)'
            }}
          >
            {absence ? (
              <>
                <div className="font-semibold mb-1 text-yellow-300">⚠️ Absence</div>
                <div>{absence.type}</div>
              </>
            ) : isAffecte ? (
              <>
                {isOver ? (
                  <>
                    <div className="font-semibold mb-1 text-red-300">⚠️ Sur-affectation</div>
                    <div>
                      {totalAffecteCol} personne(s) affectée(s)<br />
                      pour {besoin} besoin(s)
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold mb-1 text-green-300">✓ Affectation</div>
                    <div>{ressource.nom} est affecté(e)</div>
                  </>
                )}
              </>
            ) : null}
            {/* Flèche du tooltip */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}
      </>
    )
  })
  RessourceCell.displayName = 'RessourceCell'

  const getAbsenceForDate = useCallback((ressourceId: string, date: Date): Absence | null => {
    const dateStr = normalizeDateToUTC(date).toISOString().split('T')[0]
    return absences.find((abs) => {
      if (abs.ressource_id !== ressourceId) return false
      const absDateDebut = abs.date_debut instanceof Date 
        ? abs.date_debut.toISOString().split('T')[0]
        : new Date(abs.date_debut).toISOString().split('T')[0]
      const absDateFin = abs.date_fin instanceof Date 
        ? abs.date_fin.toISOString().split('T')[0]
        : new Date(abs.date_fin).toISOString().split('T')[0]
      return absDateDebut <= dateStr && absDateFin >= dateStr
    }) || null
  }, [absences])

  const getAbsenceColor = useCallback((typeAbsence: string): string => {
    const typeUpper = typeAbsence.toUpperCase().trim()
    if (typeUpper.includes('MALADIE') || typeUpper.includes('ARRET') || typeUpper.includes('ARRÊT')) {
      return 'bg-yellow-100 border-yellow-400'
    }
    if (typeUpper.includes('FORMATION') || typeUpper.includes('TRAINING')) {
      return 'bg-pink-100 border-pink-400'
    }
    if (typeUpper.includes('CP') || typeUpper.includes('CONGÉ') || typeUpper.includes('CONGE') || typeUpper.includes('PAYÉ') || typeUpper.includes('PAYE')) {
      return 'bg-blue-100 border-blue-400'
    }
    return 'bg-purple-100 border-purple-400'
  }, [])

  const loading = loadingCharge || loadingAffectations || loadingRessources

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header moderne avec glassmorphism */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Planning 2.0
                </h1>
                <p className="text-sm text-gray-600">Vue moderne et intuitive</p>
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center gap-3">
              {/* Navigation */}
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-xl p-1 shadow-md">
                <button
                  onClick={handlePreviousPeriod}
                  className="p-2 hover:bg-indigo-100 rounded-lg transition-all text-indigo-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 text-center min-w-[200px]">
                  <div className="font-semibold text-gray-800">
                    {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatSemaineISO(dateDebut)}
                  </div>
                </div>
                <button
                  onClick={handleNextPeriod}
                  className="p-2 hover:bg-indigo-100 rounded-lg transition-all text-indigo-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Précision */}
              <div className="flex items-center gap-1 bg-white/60 backdrop-blur rounded-xl p-1 shadow-md">
                {(['JOUR', 'SEMAINE', 'MOIS'] as Precision[]).map((prec) => (
                  <button
                    key={prec}
                    onClick={() => {
                      setPrecision(prec)
                      if (onPrecisionChange) onPrecisionChange(prec)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      precision === prec
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {prec.charAt(0) + prec.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Auto-refresh */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-xl font-medium text-sm shadow-md transition-all ${
                  autoRefresh 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {autoRefresh ? '🔄 Auto' : '⏸️ Manuel'}
              </button>
            </div>
          </div>

          {/* Filtres compétences */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-700">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Compétences ({selectedCompetences.size}/{competencesList.length})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCompetences(new Set(competencesList))}
                  className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  Tout
                </button>
                <button
                  onClick={() => setSelectedCompetences(new Set())}
                  className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
                >
                  Aucune
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {competencesList.map((comp) => {
                const isSelected = selectedCompetences.has(comp)
                const hasData = periodes.some(p => p.competence === comp) || 
                               affectations.some(a => a.competence === comp)
                
                return (
                  <button
                    key={comp}
                    onClick={() => toggleCompetence(comp)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    {comp}
                    {hasData && (
                      <span className={`ml-2 w-2 h-2 rounded-full inline-block ${isSelected ? 'bg-yellow-300' : 'bg-indigo-500'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </div>
        ) : selectedCompetences.size === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-400 mb-2">
              Aucune compétence sélectionnée
            </p>
            <p className="text-gray-400">
              Sélectionnez des compétences pour afficher le planning
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {competencesData.map((compData) => {
              const totalAffecte = compData.totalAffecte
              const totalBesoin = compData.totalBesoin
              const isSurAffecte = totalAffecte > totalBesoin
              const isSousAffecte = totalAffecte < totalBesoin && totalBesoin > 0
              
              return (
                <div
                  key={compData.competence}
                  className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                >
                  {/* En-tête de compétence */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">{compData.competence}</h2>
                          <div className="flex items-center gap-4 mt-1 text-sm opacity-90">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              Besoin: {totalBesoin}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Affecté: {totalAffecte}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Indicateurs */}
                      <div className="flex items-center gap-3">
                        {isSurAffecte && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 backdrop-blur rounded-lg">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Sur-affectation</span>
                          </div>
                        )}
                        {isSousAffecte && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 backdrop-blur rounded-lg">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-sm font-medium">Sous-affectation</span>
                          </div>
                        )}
                        {!isSurAffecte && !isSousAffecte && totalBesoin > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 backdrop-blur rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">OK</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grille de dates avec scroll horizontal */}
                  <div className="p-6">
                    <div className="overflow-x-auto pb-4">
                      <div className="inline-flex gap-2 min-w-full">
                        {/* Colonnes de dates */}
                        <div className="flex gap-2 flex-1">
                          {colonnes.map((col, idx) => {
                            const besoin = compData.colonnes.get(idx) || 0
                            const affectees = grilleAffectations.get(`${compData.competence}|${idx}`) || new Set<string>()
                            const totalAffecteCol = affectees.size
                            const isOver = totalAffecteCol > besoin
                            const isUnder = totalAffecteCol < besoin && besoin > 0
                            const cellKey = `${compData.competence}|${idx}`
                            const isSaving = savingCells.has(cellKey)

                            return (
                              <div
                                key={idx}
                                className="flex-shrink-0 w-32"
                              >
                                {/* En-tête date */}
                                <div className={`mb-2 rounded-xl p-3 text-center border-2 ${
                                  col.isWeekend ? 'bg-blue-100 border-blue-400' :
                                  col.isHoliday ? 'bg-pink-100 border-pink-400' :
                                  'bg-gray-100 border-gray-300'
                                }`}>
                                  <div className="text-xs font-semibold text-gray-600">
                                    {col.shortLabel}
                                  </div>
                                </div>

                                {/* Cellule Affecté */}
                                <div className={`rounded-xl p-3 mb-2 border-2 ${
                                  isOver ? 'bg-red-100 border-red-400' :
                                  isUnder ? 'bg-orange-100 border-orange-400' :
                                  'bg-green-100 border-green-400'
                                }`}>
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-lg font-bold text-gray-800">{totalAffecteCol}</span>
                                      <span className="text-xs text-gray-600">Affecté</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cellule Besoin */}
                                <div className="relative">
                                  {isSaving && (
                                    <div className="absolute -top-1 -right-1 z-10">
                                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                    </div>
                                  )}
                                  <div className="rounded-xl p-3 mb-2 border-2 bg-yellow-50 border-yellow-300">
                                    <div className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={besoin}
                                          onChange={(e) => handleChargeChange(compData.competence, idx, parseInt(e.target.value) || 0)}
                                          className="w-12 px-2 py-1 border-2 border-yellow-400 rounded text-center text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        />
                                        <span className="text-xs text-gray-600">Besoin</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Ressources - Affichées uniquement si besoin > 0 */}
                                {besoin > 0 && (
                                  <div className={`space-y-1.5 max-h-[400px] overflow-y-auto overflow-x-hidden rounded-xl p-2 ${
                                    col.isWeekend ? 'bg-blue-50' :
                                    col.isHoliday ? 'bg-pink-50' :
                                    ''
                                  }`}>
                                    {compData.ressources.map((ressource) => {
                                      const isAffecte = ressource.affectations.get(idx) || false
                                      const absence = precision === 'JOUR' ? getAbsenceForDate(ressource.id, col.date) : null
                                      const absenceColorClass = absence ? getAbsenceColor(absence.type) : ''
                                      
                                      return (
                                        <RessourceCell
                                          key={ressource.id}
                                          ressource={ressource}
                                          isAffecte={isAffecte}
                                          absence={absence}
                                          absenceColorClass={absenceColorClass}
                                          isOver={isOver}
                                          totalAffecteCol={totalAffecteCol}
                                          besoin={besoin}
                                          competence={compData.competence}
                                          colIndex={idx}
                                          onAffectationChange={handleAffectationChange}
                                        />
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
      />
    </div>
  )
}
