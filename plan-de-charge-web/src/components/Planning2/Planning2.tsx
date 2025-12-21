'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
  Loader2,
  Sparkles
} from 'lucide-react'
import { normalizeDateToUTC, isBusinessDay } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import type { Precision } from '@/types/charge'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import type { Absence } from '@/types/absences'
import { createClient } from '@/lib/supabase/client'
import type { Affectation, RessourceCompetence } from '@/types/affectations'
import { useToast } from '@/components/UI/Toast'

interface Planning2Props {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  onPrecisionChange?: (newPrecision: Precision) => void
  onDateDebutChange?: (newDateDebut: Date) => void
  onDateFinChange?: (newDateFin: Date) => void
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

// Fonction pour obtenir le format semaine ISO avec année : "01-2026"
const getSemaineISOWithYear = (date: Date): string => {
  // Calculer le lundi de la semaine ISO
  const dayOfWeek = date.getDay() || 7 // 0 = dimanche -> 7
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOfWeek + 1)
  
  // Calculer l'année ISO (année du jeudi de cette semaine)
  const thursday = new Date(weekStart)
  thursday.setDate(weekStart.getDate() + 3)
  const isoYear = thursday.getFullYear()
  
  // Calculer le numéro de semaine ISO
  // La semaine ISO 1 est la semaine qui contient le 4 janvier
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - jan4Day + 1)
  
  // Calculer le nombre de semaines depuis le début de l'année ISO
  const diffTime = weekStart.getTime() - jan4WeekStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  
  // Gérer les semaines de fin d'année (peuvent être semaine 52/53 de l'année précédente)
  // et les semaines de début d'année (peuvent être semaine 1 de l'année suivante)
  if (weekNumber < 1) {
    // Semaine de l'année précédente
    const prevJan4 = new Date(isoYear - 1, 0, 4)
    const prevJan4Day = prevJan4.getDay() || 7
    const prevJan4WeekStart = new Date(prevJan4)
    prevJan4WeekStart.setDate(prevJan4.getDate() - prevJan4Day + 1)
    const prevDiffTime = weekStart.getTime() - prevJan4WeekStart.getTime()
    const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24))
    const prevWeekNumber = Math.floor(prevDiffDays / 7) + 1
    return `${prevWeekNumber.toString().padStart(2, '0')}-${isoYear - 1}`
  } else if (weekNumber > 52) {
    // Vérifier si c'est vraiment la semaine 53 ou la semaine 1 de l'année suivante
    const nextJan4 = new Date(isoYear + 1, 0, 4)
    const nextJan4Day = nextJan4.getDay() || 7
    const nextJan4WeekStart = new Date(nextJan4)
    nextJan4WeekStart.setDate(nextJan4.getDate() - nextJan4Day + 1)
    
    if (weekStart >= nextJan4WeekStart) {
      return `01-${isoYear + 1}`
    }
    // Sinon, c'est vraiment la semaine 53
    return `53-${isoYear}`
  }
  
  return `${weekNumber.toString().padStart(2, '0')}-${isoYear}`
}

const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

const subWeeks = (date: Date, weeks: number): Date => addWeeks(date, -weeks)

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const subDays = (date: Date, days: number): Date => addDays(date, -days)

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

const subMonths = (date: Date, months: number): Date => addMonths(date, -months)

const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export default function Planning2({
  affaireId,
  site,
  dateDebut: propDateDebut,
  dateFin: propDateFin,
  precision: propPrecision,
  onPrecisionChange,
  onDateDebutChange,
  onDateFinChange,
}: Planning2Props) {
  const [precision, setPrecision] = useState<Precision>(propPrecision)
  const [dateDebut, setDateDebut] = useState(propDateDebut)
  const [dateFin, setDateFin] = useState(propDateFin)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedCompetences, setSelectedCompetences] = useState<Set<string>>(new Set())
  const { addToast } = useToast()
  
  // Synchroniser avec les props (uniquement si les props ont vraiment changé)
  useEffect(() => {
    if (propPrecision !== precision) setPrecision(propPrecision)
    // Ne synchroniser les dates que si la différence est significative (> 1 jour) pour éviter les conflits avec la navigation
    const dateDebutDiff = Math.abs(propDateDebut.getTime() - dateDebut.getTime())
    const dateFinDiff = Math.abs(propDateFin.getTime() - dateFin.getTime())
    if (dateDebutDiff > 24 * 60 * 60 * 1000) setDateDebut(propDateDebut) // Différence > 1 jour
    if (dateFinDiff > 24 * 60 * 60 * 1000) setDateFin(propDateFin) // Différence > 1 jour
  }, [propPrecision, propDateDebut, propDateFin, precision, dateDebut, dateFin])
  
  // Chargement des données
  const { periodes, loading: loadingCharge, savePeriode, deletePeriode, consolidate: consolidateCharge, refresh: refreshCharge } = useCharge({
    affaireId,
    site,
    autoRefresh,
  })

  const { affectations, loading: loadingAffectations, saveAffectation, deleteAffectation, consolidate: consolidateAffectations, refresh: refreshAffectations } = useAffectations({
    affaireId,
    site,
    autoRefresh,
  })

  const { absences } = useAbsences({})
  
  // Charger les ressources actives du site
  const { ressources: ressourcesActives, competences: competencesMapActives, loading: loadingRessourcesActives } = useRessources({
    site,
    actif: true,
  })
  
  // Charger les ressources avec transfert actif vers ce site
  const [ressourcesTransferees, setRessourcesTransferees] = useState<typeof ressourcesActives>([])
  const [competencesMapTransferees, setCompetencesMapTransferees] = useState<typeof competencesMapActives>(new Map())
  const [loadingRessourcesTransferees, setLoadingRessourcesTransferees] = useState(false)

  // Charger toutes les ressources (pour sélection externe)
  const [toutesRessources, setToutesRessources] = useState<typeof ressourcesActives>([])
  const [competencesMapToutes, setCompetencesMapToutes] = useState<typeof competencesMapActives>(new Map())
  const [loadingToutesRessources, setLoadingToutesRessources] = useState(false)
  
  useEffect(() => {
    const loadRessourcesTransferees = async () => {
      if (!site) {
        setRessourcesTransferees([])
        setCompetencesMapTransferees(new Map())
        return
      }
      
      try {
        setLoadingRessourcesTransferees(true)
        const supabase = createClient()
        const aujourdhui = new Date().toISOString().split('T')[0]
        
        // Récupérer les transferts actifs vers ce site
        const { data: transfertsData, error: transfertsError } = await supabase
          .from('transferts')
          .select('ressource_id')
          .eq('site_destination', site.toUpperCase())
          .eq('statut', 'Appliqué')
          .gte('date_fin', aujourdhui)
          .lte('date_debut', aujourdhui)
        
        if (transfertsError) throw transfertsError
        
        if (!transfertsData || transfertsData.length === 0) {
          setRessourcesTransferees([])
          setCompetencesMapTransferees(new Map())
          return
        }
        
        // Récupérer les ressources correspondantes
        const ressourceIds = transfertsData.map((t) => t.ressource_id)
        const { data: ressourcesData, error: ressourcesError } = await supabase
          .from('ressources')
          .select('*')
          .in('id', ressourceIds)
          .order('nom', { ascending: true })
        
        if (ressourcesError) throw ressourcesError
        
        const ressourcesList = (ressourcesData || []).map((item) => ({
          id: item.id,
          nom: item.nom,
          site: item.site,
          type_contrat: item.type_contrat,
          responsable: item.responsable,
          adresse_domicile: item.adresse_domicile || undefined,
          date_debut_contrat: item.date_debut_contrat ? new Date(item.date_debut_contrat) : undefined,
          date_fin_contrat: item.date_fin_contrat ? new Date(item.date_fin_contrat) : undefined,
          actif: item.actif ?? true,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
        }))
        
        setRessourcesTransferees(ressourcesList)
        
        // Charger les compétences de ces ressources
        if (ressourcesList.length > 0) {
          const { data: competencesData, error: competencesError } = await supabase
            .from('ressources_competences')
            .select('*')
            .in('ressource_id', ressourceIds)
          
          if (competencesError) throw competencesError
          
          const competencesMap = new Map<string, RessourceCompetence[]>()
          ;(competencesData || []).forEach((comp) => {
            const resId = comp.ressource_id
            if (!competencesMap.has(resId)) {
              competencesMap.set(resId, [])
            }
            competencesMap.get(resId)!.push({
              id: comp.id,
              ressource_id: comp.ressource_id,
              competence: comp.competence,
              niveau: comp.niveau,
              type_comp: comp.type_comp || 'S',
              created_at: new Date(comp.created_at),
            })
          })
          
          setCompetencesMapTransferees(competencesMap)
        }
      } catch (err) {
        console.error('[Planning2] Erreur chargement ressources transférées:', err)
        setRessourcesTransferees([])
        setCompetencesMapTransferees(new Map())
      } finally {
        setLoadingRessourcesTransferees(false)
      }
    }
    
    loadRessourcesTransferees()
  }, [site])

  // Charger toutes les ressources actives (pour sélection externe)
  useEffect(() => {
    const loadToutesRessources = async () => {
      try {
        setLoadingToutesRessources(true)
        const supabase = createClient()
        
        // Récupérer toutes les ressources actives
        const { data: ressourcesData, error: ressourcesError } = await supabase
          .from('ressources')
          .select('*')
          .eq('actif', true)
          .order('nom', { ascending: true })
        
        if (ressourcesError) throw ressourcesError
        
        const ressourcesList = (ressourcesData || []).map((item) => ({
          id: item.id,
          nom: item.nom,
          site: item.site,
          type_contrat: item.type_contrat,
          responsable: item.responsable,
          adresse_domicile: item.adresse_domicile || undefined,
          date_debut_contrat: item.date_debut_contrat ? new Date(item.date_debut_contrat) : undefined,
          date_fin_contrat: item.date_fin_contrat ? new Date(item.date_fin_contrat) : undefined,
          actif: item.actif ?? true,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
        }))
        
        setToutesRessources(ressourcesList)
        
        // Charger les compétences de toutes les ressources
        if (ressourcesList.length > 0) {
          const ressourceIds = ressourcesList.map(r => r.id)
          const { data: competencesData, error: competencesError } = await supabase
            .from('ressources_competences')
            .select('*')
            .in('ressource_id', ressourceIds)
          
          if (competencesError) throw competencesError
          
          const competencesMap = new Map<string, RessourceCompetence[]>()
          ;(competencesData || []).forEach((comp) => {
            const resId = comp.ressource_id
            if (!competencesMap.has(resId)) {
              competencesMap.set(resId, [])
            }
            competencesMap.get(resId)!.push({
              id: comp.id,
              ressource_id: comp.ressource_id,
              competence: comp.competence,
              niveau: comp.niveau,
              type_comp: comp.type_comp || 'S',
              created_at: new Date(comp.created_at),
            })
          })
          
          setCompetencesMapToutes(competencesMap)
        }
      } catch (err) {
        console.error('[Planning2] Erreur chargement toutes ressources:', err)
        setToutesRessources([])
        setCompetencesMapToutes(new Map())
      } finally {
        setLoadingToutesRessources(false)
      }
    }
    
    loadToutesRessources()
  }, [])
  
  // Fusionner les ressources actives et les ressources transférées (sans doublons)
  const ressources = useMemo(() => {
    const ressourcesMap = new Map<string, typeof ressourcesActives[0]>()
    
    // Ajouter toutes les ressources actives
    ressourcesActives.forEach((r) => {
      ressourcesMap.set(r.id, r)
    })
    
    // Ajouter les ressources transférées (si pas déjà présentes)
    ressourcesTransferees.forEach((r) => {
      if (!ressourcesMap.has(r.id)) {
        ressourcesMap.set(r.id, r)
      }
    })
    
    return Array.from(ressourcesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [ressourcesActives, ressourcesTransferees])
  
  // Fusionner les compétences
  const competencesMap = useMemo(() => {
    const competencesMapMerged = new Map(competencesMapActives)
    
    // Ajouter les compétences des ressources transférées
    competencesMapTransferees.forEach((comps, resId) => {
      competencesMapMerged.set(resId, comps)
    })
    
    return competencesMapMerged
  }, [competencesMapActives, competencesMapTransferees])
  
  const loadingRessources = loadingRessourcesActives || loadingRessourcesTransferees

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
          data.forEach((a: {
            ressource_id: string
            affaire_id: string
            site: string
            competence: string
            date_debut: string
            date_fin: string
            charge: number
            id: string
            created_at: string
            updated_at: string
            created_by: string | null
            updated_by: string | null
            affaires?: {
              affaire_id: string
              site: string
              libelle: string
            }
          }) => {
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
              created_by: a.created_by ?? undefined,
              updated_by: a.updated_by ?? undefined,
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
      const currentDate = new Date(dateDebut)
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
          shortLabel: getSemaineISOWithYear(weekStart),
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(weekStart),
        })
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      // Pour MOIS, toujours afficher 12 mois glissants à partir de dateDebut
      const monthStart = new Date(dateDebut)
      monthStart.setDate(1)
      
      for (let i = 0; i < 12; i++) {
        const currentMonth = new Date(monthStart)
        currentMonth.setMonth(monthStart.getMonth() + i)
        
        const monthShort = currentMonth.toLocaleDateString('fr-FR', { month: 'short' })
        // Retirer le point final du mois court (ex: "janv." -> "janv")
        const monthShortClean = monthShort.replace(/\.$/, '')
        const year = currentMonth.getFullYear()
        
        cols.push({
          date: currentMonth,
          label: currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          shortLabel: `${monthShortClean}.${year}`,
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(currentMonth),
        })
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
  
  // État pour suivre les opérations de masse (affectations)
  const [isGeneratingAffectations, setIsGeneratingAffectations] = useState(false)

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

  // Utilitaires de dialogue
  const confirmAsync = useCallback(
    (
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
    },
    []
  )


  // Modal de charge de masse
  const [chargeMasseModal, setChargeMasseModal] = useState<{
    isOpen: boolean
    competence: string
    dateDebut: Date | null
    dateFinInput: string
    dateFin: Date | null
    nbRessourcesInput: string
    isGenerating: boolean
  }>({
    isOpen: false,
    competence: '',
    dateDebut: null,
    dateFinInput: '',
    dateFin: null,
    nbRessourcesInput: '1',
    isGenerating: false
  })

  // Modal de sélection de ressources externes
  const [ressourceExterneModal, setRessourceExterneModal] = useState<{
    isOpen: boolean
    competence: string
    colIndex: number
    ressourcesSelectionnees: Array<{ ressourceId: string; ressourceNom: string; ressourceSite: string }>
  }>({
    isOpen: false,
    competence: '',
    colIndex: -1,
    ressourcesSelectionnees: []
  })

  const pendingChargeMasseResolver = useRef<((value: { dateFin: Date; nbRessources: number } | null) => void) | null>(null)

  const openChargeMasseModal = useCallback((
    competence: string,
    dateDebut: Date
  ): Promise<{ dateFin: Date; nbRessources: number } | null> => {
    return new Promise((resolve) => {
      pendingChargeMasseResolver.current = resolve
      // Initialiser avec dateFin par défaut (dateFin globale ou dateDebut + 7 jours)
      const defaultDateFin = dateFin > dateDebut ? dateFin : new Date(dateDebut.getTime() + 7 * 24 * 60 * 60 * 1000)
      setChargeMasseModal({
        isOpen: true,
        competence,
        dateDebut,
        dateFinInput: defaultDateFin.toISOString().split('T')[0], // Format YYYY-MM-DD pour input date
        dateFin: defaultDateFin,
        nbRessourcesInput: '1',
        isGenerating: false
      })
    })
  }, [dateFin])

  const handleChargeMasseModalConfirm = useCallback(() => {
    if (!chargeMasseModal.dateDebut || chargeMasseModal.isGenerating) {
      return
    }

    // Parser la date de fin depuis l'input date (format YYYY-MM-DD)
    let dateFin: Date
    if (chargeMasseModal.dateFin) {
      dateFin = chargeMasseModal.dateFin
    } else if (chargeMasseModal.dateFinInput) {
      // Si format YYYY-MM-DD (input date)
      dateFin = normalizeDateToUTC(new Date(chargeMasseModal.dateFinInput + 'T00:00:00'))
    } else {
      // Fallback : parser format JJ/MM/AAAA
      const [jour, mois, annee] = chargeMasseModal.dateFinInput.split('/').map(Number)
      if (!jour || !mois || !annee || isNaN(jour) || isNaN(mois) || isNaN(annee)) {
        addToast('Format de date invalide. Utilisez le calendrier ou JJ/MM/AAAA', 'error', 5000)
        return
      }
      dateFin = normalizeDateToUTC(new Date(annee, mois - 1, jour))
    }
    
    if (dateFin < chargeMasseModal.dateDebut) {
      addToast('La date de fin doit être postérieure à la date de début', 'error', 5000)
      return
    }

    // Parser le nombre de ressources
    const nbRessources = parseInt(chargeMasseModal.nbRessourcesInput, 10)
    if (isNaN(nbRessources) || nbRessources < 0) {
      addToast('Le nombre de ressources doit être un nombre positif', 'error', 5000)
      return
    }

    // Ne pas fermer le modal ici - il sera fermé après la génération réussie
    // Juste résoudre la promesse pour déclencher handleChargeMasse
    if (pendingChargeMasseResolver.current) {
      pendingChargeMasseResolver.current({ dateFin, nbRessources })
      pendingChargeMasseResolver.current = null
    }
    // Le modal reste ouvert avec isGenerating = true pendant la génération
  }, [chargeMasseModal, addToast])

  const handleChargeMasseModalCancel = useCallback(() => {
    if (chargeMasseModal.isGenerating) {
      return // Empêcher la fermeture pendant la génération
    }
    if (pendingChargeMasseResolver.current) {
      pendingChargeMasseResolver.current(null)
      pendingChargeMasseResolver.current = null
    }
    setChargeMasseModal(prev => ({ ...prev, isOpen: false, isGenerating: false }))
  }, [chargeMasseModal.isGenerating])

  // Handlers
  const handleChargeChange = useCallback(async (competence: string, colIndex: number, value: number) => {
    // Désactiver l'enregistrement automatique pendant la génération de masse
    if (chargeMasseModal.isGenerating) {
      return
    }
    
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
          // En mode JOUR, découper la période au lieu de la supprimer entièrement
          if (precision === 'JOUR') {
            const pDateDebut = normalizeDateToUTC(new Date(periodeExistante.date_debut))
            const pDateFin = normalizeDateToUTC(new Date(periodeExistante.date_fin))
            
            // Si la période ne couvre qu'un seul jour, la supprimer complètement
            if (pDateDebut.getTime() === pDateFin.getTime() && 
                pDateDebut.getTime() === dateDebutPeriode.getTime()) {
              await deletePeriode(periodeExistante.id)
            } else {
              // Découper la période : recréer toutes les périodes pour tous les jours SAUF celui à supprimer
              // Supprimer la période existante
              await deletePeriode(periodeExistante.id)
              
              // Recréer des périodes pour tous les jours de l'ancienne période SAUF le jour à supprimer
              const currentDate = new Date(pDateDebut)
              while (currentDate <= pDateFin) {
                const currentDateUTC = normalizeDateToUTC(currentDate)
                
                // Ignorer le jour à supprimer
                if (currentDateUTC.getTime() !== dateDebutPeriode.getTime()) {
                  // Si force_weekend_ferie était activé, recréer tous les jours (y compris week-ends/fériés)
                  // Sinon, recréer seulement les jours ouvrés
                  if (isBusinessDay(currentDate) || periodeExistante.force_weekend_ferie) {
                    await savePeriode({
                      competence,
                      date_debut: currentDateUTC,
                      date_fin: currentDateUTC,
                      nb_ressources: periodeExistante.nb_ressources,
                      force_weekend_ferie: periodeExistante.force_weekend_ferie || false
                    })
                  }
                }
                
                currentDate.setDate(currentDate.getDate() + 1)
              }
              
              // La consolidation se fait automatiquement via le trigger PostgreSQL
              // Plus besoin d'appeler consolidate() manuellement
            }
          } else {
            // Pour SEMAINE/MOIS, supprimer la période entière
            await deletePeriode(periodeExistante.id)
          }
        } else if (nbRessources > 0) {
          // En mode JOUR, si on modifie une journée dans une période multi-jours, découper d'abord
          if (precision === 'JOUR' && periodeExistante) {
            const pDateDebut = normalizeDateToUTC(new Date(periodeExistante.date_debut))
            const pDateFin = normalizeDateToUTC(new Date(periodeExistante.date_fin))
            
            // Si la période couvre plusieurs jours et qu'on modifie un jour spécifique
            if (pDateDebut.getTime() !== pDateFin.getTime()) {
              // Découper la période : supprimer l'ancienne et créer des périodes pour chaque jour
              await deletePeriode(periodeExistante.id)
              
              // Recréer les périodes pour tous les jours de l'ancienne période
              const currentDate = new Date(pDateDebut)
              while (currentDate <= pDateFin) {
                const currentDateUTC = normalizeDateToUTC(currentDate)
                
                if (currentDateUTC.getTime() === dateDebutPeriode.getTime()) {
                  // Jour modifié : créer avec la nouvelle valeur
                  await savePeriode({
                    competence,
                    date_debut: currentDateUTC,
                    date_fin: currentDateUTC,
                    nb_ressources: nbRessources,
                    force_weekend_ferie: forceWeekendFerie
                  })
                } else {
                  // Autres jours : recréer avec l'ancienne valeur
                  // Si force_weekend_ferie était activé, recréer tous les jours (y compris week-ends/fériés)
                  // Sinon, recréer seulement les jours ouvrés
                  if (isBusinessDay(currentDate) || periodeExistante.force_weekend_ferie) {
                    await savePeriode({
                      competence,
                      date_debut: currentDateUTC,
                      date_fin: currentDateUTC,
                      nb_ressources: periodeExistante.nb_ressources,
                      force_weekend_ferie: periodeExistante.force_weekend_ferie || false
                    })
                  }
                }
                
                currentDate.setDate(currentDate.getDate() + 1)
              }
              
              // La consolidation se fait automatiquement via le trigger PostgreSQL
              // Plus besoin d'appeler consolidate() manuellement
              return // Sortir car on a déjà géré la création
            }
          }
          
          // Cas normal : créer/mettre à jour la période
          await savePeriode({
            id: periodeExistante?.id,
            competence,
            date_debut: dateDebutPeriode,
            date_fin: dateFinPeriode,
            nb_ressources: nbRessources,
            force_weekend_ferie: forceWeekendFerie
          })
          
          // La consolidation se fait automatiquement via le trigger PostgreSQL
          // Plus besoin d'appeler consolidate() manuellement
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
  }, [periodes, savePeriode, deletePeriode, precision, dateFin, colonnes, confirmAsync, chargeMasseModal.isGenerating])

  const handleAffectationChange = useCallback(async (competence: string, ressourceId: string, colIndex: number, checked: boolean) => {
    // Désactiver l'enregistrement automatique pendant la génération de masse d'affectations
    if (isGeneratingAffectations) {
      return
    }
    
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
          
          addToast(
            `Impossible d'affecter : la ressource est absente (${absenceConflit.type}) du ${absDateDebut.toLocaleDateString('fr-FR')} au ${absDateFin.toLocaleDateString('fr-FR')}`,
            'error',
            5000
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
          
          addToast(
            `Impossible d'affecter : la ressource est déjà affectée sur cette période. Une ressource ne peut pas être affectée à plusieurs affaires en même temps.`,
            'error',
            5000
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
        
        // La consolidation se fait automatiquement via le trigger PostgreSQL
        // Plus besoin d'appeler consolidateAffectations() manuellement
      } else {
        // Décocher : supprimer l'affectation pour cette période
        const affectationASupprimer = affectations.find(a => {
          const aDateDebut = normalizeDateToUTC(new Date(a.date_debut))
          const aDateFin = normalizeDateToUTC(new Date(a.date_fin))
          return a.ressource_id === ressourceId && 
                 a.competence === competence &&
                 aDateDebut <= dateFinAffectation &&
                 aDateFin >= dateDebutAffectation
        })
        
        if (affectationASupprimer?.id) {
          // En mode JOUR, découper la période au lieu de la supprimer entièrement
          if (precision === 'JOUR') {
            const aDateDebut = normalizeDateToUTC(new Date(affectationASupprimer.date_debut))
            const aDateFin = normalizeDateToUTC(new Date(affectationASupprimer.date_fin))
            
            // Si la période ne couvre qu'un seul jour, la supprimer complètement
            if (aDateDebut.getTime() === aDateFin.getTime() && 
                aDateDebut.getTime() === dateDebutAffectation.getTime()) {
              await deleteAffectation(affectationASupprimer.id)
            } else {
              // Découper la période : créer des affectations pour les jours avant et après
              // Supprimer la période existante
              await deleteAffectation(affectationASupprimer.id)
              
              // Créer des affectations pour tous les jours de l'ancienne période sauf celui à supprimer
              const currentDate = new Date(aDateDebut)
              while (currentDate <= aDateFin) {
                const currentDateUTC = normalizeDateToUTC(currentDate)
                
                // Ignorer le jour à supprimer
                if (currentDateUTC.getTime() !== dateDebutAffectation.getTime()) {
                  // Vérifier si c'est un jour ouvré ou si force_weekend_ferie était activé
                  if (isBusinessDay(currentDate) || affectationASupprimer.force_weekend_ferie) {
                    await saveAffectation({
                      ressource_id: ressourceId,
                      competence,
                      date_debut: currentDateUTC,
                      date_fin: currentDateUTC,
                      charge: affectationASupprimer.charge || 1,
                      force_weekend_ferie: affectationASupprimer.force_weekend_ferie || false,
                    })
                  }
                }
                
                currentDate.setDate(currentDate.getDate() + 1)
              }
              
              // La consolidation se fait automatiquement via le trigger PostgreSQL
              // Plus besoin d'appeler consolidateAffectations() manuellement
            }
          } else {
            // Pour SEMAINE/MOIS, supprimer la période entière
            await deleteAffectation(affectationASupprimer.id)
          }
        }
      }
    } catch (err) {
      console.error('[Planning2] Erreur saveAffectation/deleteAffectation:', err)
    }
  }, [affectations, saveAffectation, deleteAffectation, precision, dateFin, absences, toutesAffectationsRessources, affairesDetails, affaireId, colonnes, confirmAsync, addToast, isGeneratingAffectations])

  // Fonction pour créer un transfert
  const creerTransfert = useCallback(async (
    ressourceId: string,
    siteOrigine: string,
    siteDestination: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<boolean> => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('transferts')
        .insert({
          ressource_id: ressourceId,
          site_origine: siteOrigine.toUpperCase(),
          site_destination: siteDestination.toUpperCase(),
          date_debut: dateDebut.toISOString().split('T')[0],
          date_fin: dateFin.toISOString().split('T')[0],
          statut: 'Planifié'
        })
      
      if (error) {
        console.error('[Planning2] Erreur création transfert:', error)
        addToast(`Erreur lors de la création du transfert: ${error.message}`, 'error', 5000)
        return false
      }
      
      return true
    } catch (err) {
      console.error('[Planning2] Erreur création transfert:', err)
      addToast('Erreur lors de la création du transfert', 'error', 5000)
      return false
    }
  }, [addToast])

  // Fonction pour obtenir les ressources externes par compétence
  const getRessourcesExternesParCompetence = useCallback((competence: string) => {
    return toutesRessources.filter((r) => {
      // Filtrer les ressources qui ne sont pas sur le site actuel
      if (r.site.toUpperCase() === site.toUpperCase()) {
        return false
      }
      
      // Filtrer par compétence
      const competencesRessource = competencesMapToutes.get(r.id) || []
      return competencesRessource.some((c) => c.competence === competence)
    })
  }, [toutesRessources, competencesMapToutes, site])

  // Fonction pour ouvrir le modal de sélection de ressources externes
  const ouvrirModalRessourceExterne = useCallback((competence: string, colIndex: number) => {
    setRessourceExterneModal({
      isOpen: true,
      competence,
      colIndex,
      ressourcesSelectionnees: []
    })
  }, [])

  // Fonction pour gérer la sélection d'une ressource externe
  const handleSelectionRessourceExterne = useCallback(async (
    ressourceId: string,
    ressourceNom: string,
    ressourceSite: string
  ) => {
    const col = colonnes[ressourceExterneModal.colIndex]
    if (!col) return

    let dateDebutAffectation: Date
    let dateFinAffectation: Date
    
    if (precision === 'JOUR') {
      dateDebutAffectation = normalizeDateToUTC(col.date)
      dateFinAffectation = normalizeDateToUTC(col.date)
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

      if (absenceConflit) {
        const absDateDebut = absenceConflit.date_debut instanceof Date 
          ? absenceConflit.date_debut
          : new Date(absenceConflit.date_debut)
        const absDateFin = absenceConflit.date_fin instanceof Date 
          ? absenceConflit.date_fin
          : new Date(absenceConflit.date_fin)
        
        addToast(
          `Impossible d'affecter : la ressource est absente (${absenceConflit.type}) du ${absDateDebut.toLocaleDateString('fr-FR')} au ${absDateFin.toLocaleDateString('fr-FR')}`,
          'error',
          5000
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
        const autreAffaire = aff.affaire_id !== affaireId || aff.competence !== ressourceExterneModal.competence
        return chevauche && autreAffaire
      })

      if (affectationsConflit.length > 0) {
        addToast(
          `Impossible d'affecter : la ressource est déjà affectée sur cette période. Une ressource ne peut pas être affectée à plusieurs affaires en même temps.`,
          'error',
          5000
        )
        return
      }

      // Si la ressource est externe, créer le transfert
      if (ressourceSite.toUpperCase() !== site.toUpperCase()) {
        // Calculer les dates de transfert : date au plus tôt et date fin au plus tard des affectations
        // Récupérer toutes les affectations futures de cette ressource sur ce site (toutes compétences)
        const supabaseClient = createClient()
        const aujourdhui = new Date().toISOString().split('T')[0]
        const { data: affectationsExistentes } = await supabaseClient
          .from('affectations')
          .select('date_debut, date_fin')
          .eq('ressource_id', ressourceId)
          .eq('site', site.toUpperCase())
          .gte('date_fin', aujourdhui)
        
        // Calculer la date au plus tôt et la date fin au plus tard
        let dateDebutTransfert = dateDebutAffectation
        let dateFinTransfert = dateFinAffectation
        
        if (affectationsExistentes && affectationsExistentes.length > 0) {
          affectationsExistentes.forEach((aff) => {
            const affDateDebut = new Date(aff.date_debut)
            const affDateFin = new Date(aff.date_fin)
            
            if (affDateDebut < dateDebutTransfert) {
              dateDebutTransfert = affDateDebut
            }
            if (affDateFin > dateFinTransfert) {
              dateFinTransfert = affDateFin
            }
          })
        }
        
        // Vérifier si un transfert existe déjà pour cette ressource et ces sites
        const { data: transfertsExistant } = await supabaseClient
          .from('transferts')
          .select('id, date_debut, date_fin, statut')
          .eq('ressource_id', ressourceId)
          .eq('site_origine', ressourceSite.toUpperCase())
          .eq('site_destination', site.toUpperCase())
        
        let transfertExiste = false
        if (transfertsExistant && transfertsExistant.length > 0) {
          // Chercher un transfert qui chevauche ou est proche de la période
          for (const t of transfertsExistant) {
            const tDateDebut = new Date(t.date_debut)
            const tDateFin = new Date(t.date_fin)
            
            // Si le transfert existant chevauche la période (même partiellement), on l'étend
            if (tDateDebut <= dateFinTransfert && tDateFin >= dateDebutTransfert) {
              // Étendre le transfert existant pour couvrir toute la période
              const nouvelleDateDebut = tDateDebut < dateDebutTransfert ? tDateDebut : dateDebutTransfert
              const nouvelleDateFin = tDateFin > dateFinTransfert ? tDateFin : dateFinTransfert
              
              // Mettre à jour le transfert existant
              const { error: updateError } = await supabaseClient
                .from('transferts')
                .update({
                  date_debut: nouvelleDateDebut.toISOString().split('T')[0],
                  date_fin: nouvelleDateFin.toISOString().split('T')[0]
                })
                .eq('id', t.id)
              
              if (updateError) {
                console.error('[Planning2] Erreur mise à jour transfert existant:', updateError)
                addToast('Erreur lors de la mise à jour du transfert existant', 'error', 5000)
                return
              }
              
              transfertExiste = true
              break
            }
          }
          
          // Si aucun transfert ne chevauche, vérifier s'il y a un transfert très proche (à fusionner)
          if (!transfertExiste) {
            for (const t of transfertsExistant) {
              const tDateDebut = new Date(t.date_debut)
              const tDateFin = new Date(t.date_fin)
              
              // Si les périodes sont adjacentes (moins de 7 jours d'écart), fusionner
              const joursAvant = Math.abs((dateDebutTransfert.getTime() - tDateFin.getTime()) / (1000 * 60 * 60 * 24))
              const joursApres = Math.abs((dateFinTransfert.getTime() - tDateDebut.getTime()) / (1000 * 60 * 60 * 24))
              
              if (joursAvant <= 7 || joursApres <= 7) {
                // Fusionner les périodes
                const nouvelleDateDebut = tDateDebut < dateDebutTransfert ? tDateDebut : dateDebutTransfert
                const nouvelleDateFin = tDateFin > dateFinTransfert ? tDateFin : dateFinTransfert
                
                const { error: updateError } = await supabaseClient
                  .from('transferts')
                  .update({
                    date_debut: nouvelleDateDebut.toISOString().split('T')[0],
                    date_fin: nouvelleDateFin.toISOString().split('T')[0]
                  })
                  .eq('id', t.id)
                
                if (updateError) {
                  console.error('[Planning2] Erreur fusion transfert:', updateError)
                  addToast('Erreur lors de la fusion du transfert', 'error', 5000)
                  return
                }
                
                transfertExiste = true
                break
              }
            }
          }
        }
        
        if (!transfertExiste) {
          const transfertCree = await creerTransfert(
            ressourceId,
            ressourceSite,
            site,
            dateDebutTransfert,
            dateFinTransfert
          )
          
          if (!transfertCree) {
            return
          }
        }
      }

      // Créer l'affectation
      await saveAffectation({
        ressource_id: ressourceId,
        competence: ressourceExterneModal.competence,
        date_debut: dateDebutAffectation,
        date_fin: dateFinAffectation,
        charge: 1,
        force_weekend_ferie: false,
      })

      // Ajouter la ressource à la liste des sélectionnées
      setRessourceExterneModal(prev => ({
        ...prev,
        ressourcesSelectionnees: [
          ...prev.ressourcesSelectionnees,
          { ressourceId, ressourceNom, ressourceSite }
        ]
      }))

      addToast(
        `Ressource ${ressourceNom} affectée${ressourceSite.toUpperCase() !== site.toUpperCase() ? ' (transfert créé)' : ''}`,
        'success',
        3000
      )
    } catch (err) {
      console.error('[Planning2] Erreur affectation ressource externe:', err)
      addToast('Erreur lors de l\'affectation de la ressource', 'error', 5000)
    }
  }, [ressourceExterneModal, colonnes, precision, dateFin, absences, toutesAffectationsRessources, affaireId, site, creerTransfert, saveAffectation, addToast])

  // Charge de masse : créer des périodes de charge entre dateDebut et dateFin (uniquement jours ouvrés)
  const handleChargeMasse = useCallback(async (competence: string, colIndex: number) => {
    try {
      const col = colonnes[colIndex]
      if (!col) return

      // Date de début = date de la colonne cliquée
      let dateDebutMasse: Date
      if (precision === 'JOUR') {
        dateDebutMasse = normalizeDateToUTC(col.date)
      } else if (precision === 'SEMAINE') {
        const dayOfWeek = col.date.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        dateDebutMasse = new Date(col.date)
        dateDebutMasse.setDate(dateDebutMasse.getDate() - daysToMonday)
        dateDebutMasse = normalizeDateToUTC(dateDebutMasse)
      } else if (precision === 'MOIS') {
        dateDebutMasse = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
        dateDebutMasse = normalizeDateToUTC(dateDebutMasse)
      } else {
        dateDebutMasse = normalizeDateToUTC(col.date)
      }

      // Ouvrir le modal pour demander date de fin et nombre de ressources
      const modalResult = await openChargeMasseModal(competence, dateDebutMasse)
      if (!modalResult) return // Annulé

      const { dateFin: dateFinMasse, nbRessources } = modalResult

      // Préparer toutes les périodes à créer (uniquement jours ouvrés pour précision JOUR)
      const periodesACreer: Array<{
        competence: string
        date_debut: Date
        date_fin: Date
        nb_ressources: number
        force_weekend_ferie: boolean
      }> = []
      
      if (precision === 'JOUR') {
        // *** OPTIMISATION : Si la période est grande (> 90 jours), utiliser le mode MOIS pour accélérer ***
        const joursTotal = Math.ceil((dateFinMasse.getTime() - dateDebutMasse.getTime()) / (1000 * 60 * 60 * 24))
        const seuilOptimisation = 90 // Seuil en jours pour basculer automatiquement en mode MOIS
        
        if (joursTotal > seuilOptimisation) {
          // Utiliser le mode MOIS pour accélérer (beaucoup moins de périodes à créer)
          const currentDate = new Date(dateDebutMasse)
          while (currentDate <= dateFinMasse) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            let monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
            
            // Limiter à dateFinMasse
            if (monthEnd > dateFinMasse) {
              monthEnd = new Date(dateFinMasse)
            }
            
            // Vérifier qu'il y a au moins un jour ouvré dans ce mois
            let hasBusinessDay = false
            const checkDate = new Date(monthStart)
            while (checkDate <= monthEnd) {
              if (isBusinessDay(checkDate)) {
                hasBusinessDay = true
                break
              }
              checkDate.setDate(checkDate.getDate() + 1)
            }
            
            if (hasBusinessDay) {
              const dateDebutNorm = normalizeDateToUTC(monthStart)
              const dateFinNorm = normalizeDateToUTC(monthEnd)
              periodesACreer.push({
                competence,
                date_debut: dateDebutNorm,
                date_fin: dateFinNorm,
                nb_ressources: nbRessources,
                force_weekend_ferie: false
              })
            }
            
            // Passer au mois suivant
            currentDate.setMonth(currentDate.getMonth() + 1)
            currentDate.setDate(1)
          }
        } else {
          // Créer une période uniquement pour les jours ouvrés (lundi-vendredi, pas fériés)
          const currentDate = new Date(dateDebutMasse)
          while (currentDate <= dateFinMasse) {
            // Vérifier si c'est un jour ouvré (exclut week-ends et fériés)
            if (isBusinessDay(currentDate)) {
              const dateNorm = normalizeDateToUTC(currentDate)
              periodesACreer.push({
                competence,
                date_debut: dateNorm,
                date_fin: dateNorm,
                nb_ressources: nbRessources,
                force_weekend_ferie: false // Toujours false car on filtre les jours ouvrés
              })
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }
      } else if (precision === 'SEMAINE') {
        // Pour SEMAINE, créer des périodes mais seulement pour les semaines contenant au moins un jour ouvré
        // On crée la période complète (lundi-dimanche) mais avec uniquement les jours ouvrés comptés
        const currentDate = new Date(dateDebutMasse)
        while (currentDate <= dateFinMasse) {
          const weekStart = new Date(currentDate)
          let weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          
          // Limiter à dateFinMasse
          if (weekEnd > dateFinMasse) {
            weekEnd = new Date(dateFinMasse)
          }
          
          // Vérifier qu'il y a au moins un jour ouvré dans cette semaine
          let hasBusinessDay = false
          const checkDate = new Date(weekStart)
          while (checkDate <= weekEnd) {
            if (isBusinessDay(checkDate)) {
              hasBusinessDay = true
              break
            }
            checkDate.setDate(checkDate.getDate() + 1)
          }
          
          if (hasBusinessDay) {
            const dateDebutNorm = normalizeDateToUTC(weekStart)
            const dateFinNorm = normalizeDateToUTC(weekEnd)
            periodesACreer.push({
              competence,
              date_debut: dateDebutNorm,
              date_fin: dateFinNorm,
              nb_ressources: nbRessources,
              force_weekend_ferie: false
            })
          }
          
          // Passer à la semaine suivante
          currentDate.setDate(currentDate.getDate() + 7)
        }
      } else if (precision === 'MOIS') {
        // Pour MOIS, créer des périodes pour chaque mois contenant au moins un jour ouvré
        const currentDate = new Date(dateDebutMasse)
        while (currentDate <= dateFinMasse) {
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          let monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          
          // Limiter à dateFinMasse
          if (monthEnd > dateFinMasse) {
            monthEnd = new Date(dateFinMasse)
          }
          
          // Vérifier qu'il y a au moins un jour ouvré dans ce mois
          let hasBusinessDay = false
          const checkDate = new Date(monthStart)
          while (checkDate <= monthEnd) {
            if (isBusinessDay(checkDate)) {
              hasBusinessDay = true
              break
            }
            checkDate.setDate(checkDate.getDate() + 1)
          }
          
          if (hasBusinessDay) {
            const dateDebutNorm = normalizeDateToUTC(monthStart)
            const dateFinNorm = normalizeDateToUTC(monthEnd)
            periodesACreer.push({
              competence,
              date_debut: dateDebutNorm,
              date_fin: dateFinNorm,
              nb_ressources: nbRessources,
              force_weekend_ferie: false
            })
          }
          
          // Passer au mois suivant
          currentDate.setMonth(currentDate.getMonth() + 1)
          currentDate.setDate(1)
        }
      }

      if (periodesACreer.length === 0) {
        addToast(
          'Aucune période de jours ouvrés trouvée entre ces dates.',
          'info',
          5000
        )
        return
      }

      // Confirmation finale
      const joursTotal = Math.ceil((dateFinMasse.getTime() - dateDebutMasse.getTime()) / (1000 * 60 * 60 * 24))
      const seuilOptimisation = 90
      const modeUtilise = (precision === 'JOUR' && joursTotal > seuilOptimisation) ? 'MOIS (optimisé automatiquement)' : precision
      
      const confirme = await confirmAsync(
        'Charge de masse',
        `Créer ${periodesACreer.length} période(s) avec ${nbRessources} ressource(s) nécessaire(s) pour "${competence}"\n\nDu ${dateDebutMasse.toLocaleDateString('fr-FR')} au ${dateFinMasse.toLocaleDateString('fr-FR')}\n\nMode: ${modeUtilise}\n(Uniquement jours ouvrés : lundi-vendredi)\n\nConfirmer ?`,
        { type: 'info' }
      )
      
      if (!confirme) return

      // Désactiver temporairement l'auto-refresh et l'enregistrement auto pour éviter les scintillements
      const autoRefreshAvant = autoRefresh
      setAutoRefresh(false)
      
      // Marquer le modal comme en cours de génération pour éviter les interactions
      // Le modal reste ouvert pendant la génération pour montrer la progression
      setChargeMasseModal(prev => ({ ...prev, isGenerating: true }))

      try {
        // Enregistrer toutes les périodes d'un coup (batch) sans re-render intermédiaire
        let nbPeriodesCreees = 0
        const batchSize = 20 // Traiter par lots plus grands pour être plus rapide
        
        // Traitement par lots avec feedback visuel
        for (let i = 0; i < periodesACreer.length; i += batchSize) {
          const batch = periodesACreer.slice(i, i + batchSize)
          await Promise.all(
            batch.map(async (periode) => {
              try {
                await savePeriode(periode)
                nbPeriodesCreees++
              } catch (err) {
                console.error(`[Planning2] Erreur création période ${periode.date_debut.toLocaleDateString('fr-FR')}:`, err)
              }
            })
          )
        }
        
        // Consolider les périodes pour cette compétence (fusionne les périodes consécutives)
        // Cela doit être fait APRÈS tous les INSERT pour éviter que le trigger ne supprime les INSERT en cours
        // Note: Realtime gère automatiquement les mises à jour, mais on garde un refresh après consolidation
        // car c'est une opération complexe (DELETE puis INSERT) qui modifie beaucoup de lignes
        if (nbPeriodesCreees > 0) {
          try {
            await consolidateCharge(competence)
            console.log(`[Planning2] Consolidation effectuée pour compétence ${competence}`)
            
            // Refresh unique après consolidation (Realtime gère les INSERT individuels, mais consolidation = opération complexe)
            await refreshCharge()
          } catch (consolidateErr) {
            console.error(`[Planning2] Erreur lors de la consolidation pour ${competence}:`, consolidateErr)
            // Ne pas bloquer si la consolidation échoue, les données sont quand même enregistrées
            // Realtime a déjà mis à jour l'interface pour les INSERT individuels
          }
        }

        // Afficher le message de succès
        addToast(
          `${nbPeriodesCreees} période(s) créée(s) avec ${nbRessources} ressource(s) nécessaire(s)`,
          'success',
          5000
        )
        
        // Fermer le modal après succès
        if (pendingChargeMasseResolver.current) {
          pendingChargeMasseResolver.current({ dateFin: dateFinMasse, nbRessources })
          pendingChargeMasseResolver.current = null
        }
        setChargeMasseModal(prev => ({ ...prev, isOpen: false, isGenerating: false }))
      } catch (err) {
        console.error('[Planning2] Erreur lors de la génération de masse:', err)
        addToast(
          'Erreur lors de la création des périodes. Veuillez réessayer.',
          'error',
          5000
        )
        setChargeMasseModal(prev => ({ ...prev, isGenerating: false }))
      } finally {
        // Réactiver l'auto-refresh à son état précédent
        setAutoRefresh(autoRefreshAvant)
      }
      } catch (err) {
        console.error('[Planning2] Erreur charge de masse:', err)
        addToast(
          `Erreur lors de la création de la charge de masse : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
          'error',
          5000
        )
      }
    }, [colonnes, precision, savePeriode, consolidateCharge, refreshCharge, openChargeMasseModal, confirmAsync, addToast, autoRefresh, setAutoRefresh])

  // Affectation de masse : affecter sur toutes les colonnes avec besoin (uniquement jours ouvrés)
  const handleAffectationMasse = useCallback(async (competence: string, ressourceId: string) => {
    try {
      // Préparer toutes les affectations à créer (uniquement jours ouvrés)
      const affectationsACreer: Array<{
        dateDebut: Date
        dateFin: Date
        colIndex: number
      }> = []
      
      competencesData.forEach(compData => {
        if (compData.competence === competence) {
          compData.colonnes.forEach((besoin, colIndex) => {
            if (besoin > 0) {
              // Vérifier si la ressource n'est pas déjà affectée sur cette colonne
              const ressource = compData.ressources.find(r => r.id === ressourceId)
              if (ressource && !ressource.affectations.get(colIndex)) {
                const col = colonnes[colIndex]
                if (!col) return
                
                // Filtrer uniquement les jours ouvrés (uniquement pour précision JOUR)
                if (precision === 'JOUR') {
                  // Vérifier si c'est un jour ouvré
                  if (isBusinessDay(col.date)) {
                    affectationsACreer.push({
                      dateDebut: normalizeDateToUTC(col.date),
                      dateFin: normalizeDateToUTC(col.date),
                      colIndex
                    })
                  }
                } else if (precision === 'SEMAINE') {
                  // Pour SEMAINE, vérifier qu'il y a au moins un jour ouvré dans la semaine
                  const dayOfWeek = col.date.getDay()
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                  const weekStart = new Date(col.date)
                  weekStart.setDate(weekStart.getDate() - daysToMonday)
                  const weekEnd = new Date(weekStart)
                  weekEnd.setDate(weekEnd.getDate() + 6)
                  
                  let hasBusinessDay = false
                  const checkDate = new Date(weekStart)
                  while (checkDate <= weekEnd) {
                    if (isBusinessDay(checkDate)) {
                      hasBusinessDay = true
                      break
                    }
                    checkDate.setDate(checkDate.getDate() + 1)
                  }
                  
                  if (hasBusinessDay) {
                    affectationsACreer.push({
                      dateDebut: normalizeDateToUTC(weekStart),
                      dateFin: normalizeDateToUTC(weekEnd),
                      colIndex
                    })
                  }
                } else if (precision === 'MOIS') {
                  // Pour MOIS, vérifier qu'il y a au moins un jour ouvré dans le mois
                  const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
                  const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
                  
                  let hasBusinessDay = false
                  const checkDate = new Date(monthStart)
                  while (checkDate <= monthEnd) {
                    if (isBusinessDay(checkDate)) {
                      hasBusinessDay = true
                      break
                    }
                    checkDate.setDate(checkDate.getDate() + 1)
                  }
                  
                  if (hasBusinessDay) {
                    affectationsACreer.push({
                      dateDebut: normalizeDateToUTC(monthStart),
                      dateFin: normalizeDateToUTC(monthEnd),
                      colIndex
                    })
                  }
                }
              }
            }
          })
        }
      })

      if (affectationsACreer.length === 0) {
        addToast(
          'Aucune période de jours ouvrés avec besoin disponible pour cette ressource.',
          'info',
          5000
        )
        return
      }

      // Demander confirmation
      const confirme = await confirmAsync(
        'Affectation de masse',
        `Voulez-vous affecter cette ressource sur ${affectationsACreer.length} période(s) de jours ouvrés avec besoin ?\n\nCela va créer ${affectationsACreer.length} affectation(s).\n\n(Uniquement jours ouvrés : lundi-vendredi, hors fériés)`,
        { type: 'info' }
      )
      
      if (!confirme) return

      // Désactiver temporairement l'auto-refresh et l'enregistrement auto pour éviter les scintillements
      const autoRefreshAvant = autoRefresh
      setAutoRefresh(false)
      
      // Marquer comme en cours de génération pour désactiver handleAffectationChange
      setIsGeneratingAffectations(true)

      try {
        // Vérifier absences et conflits pour chaque affectation, puis créer celles qui sont valides
        const affectationsValides: Array<{
          ressource_id: string
          competence: string
          date_debut: Date
          date_fin: Date
          charge: number
          force_weekend_ferie: boolean
        }> = []
        
        for (const affectation of affectationsACreer) {
          // Vérifier absences
          const dateDebutStr = affectation.dateDebut.toISOString().split('T')[0]
          const dateFinStr = affectation.dateFin.toISOString().split('T')[0]

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

          if (absenceConflit) {
            // Ignorer cette affectation (ressource absente)
            continue
          }

          // Vérifier conflits avec autres affectations
          const affectationsRessource = toutesAffectationsRessources.get(ressourceId) || []
          const dateDebutUTC = normalizeDateToUTC(affectation.dateDebut)
          const dateFinUTC = normalizeDateToUTC(affectation.dateFin)
          
          const affectationsConflit = affectationsRessource.filter((aff) => {
            const affDateDebut = normalizeDateToUTC(aff.date_debut)
            const affDateFin = normalizeDateToUTC(aff.date_fin)
            const chevauche = affDateDebut <= dateFinUTC && affDateFin >= dateDebutUTC
            const autreAffaire = aff.affaire_id !== affaireId || aff.competence !== competence
            return chevauche && autreAffaire
          })

          if (affectationsConflit.length > 0) {
            // Ignorer cette affectation (conflit avec autre affectation)
            continue
          }

          // Affectation valide, l'ajouter à la liste
          affectationsValides.push({
            ressource_id: ressourceId,
            competence,
            date_debut: affectation.dateDebut,
            date_fin: affectation.dateFin,
            charge: 1,
            force_weekend_ferie: false // Toujours false car on filtre les jours ouvrés
          })
        }

        if (affectationsValides.length === 0) {
          addToast(
            'Aucune affectation valide (toutes bloquées par absences ou conflits).',
            'info',
            5000
          )
          return
        }

        // Créer toutes les affectations valides en batch (sans refresh intermédiaire)
        let nbAffectationsCreees = 0
        const batchSize = 20 // Traiter par lots pour éviter de bloquer l'UI
        
        // Traitement par lots avec feedback visuel
        for (let i = 0; i < affectationsValides.length; i += batchSize) {
          const batch = affectationsValides.slice(i, i + batchSize)
          await Promise.all(
            batch.map(async (affectation) => {
              try {
                await saveAffectation(affectation)
                nbAffectationsCreees++
              } catch (err) {
                console.error(`[Planning2] Erreur création affectation ${affectation.date_debut.toLocaleDateString('fr-FR')}:`, err)
              }
            })
          )
        }
        
        // Consolider les affectations pour cette compétence (fusionne les périodes consécutives pour toutes les ressources)
        // Cela doit être fait APRÈS tous les INSERT pour éviter que le trigger ne supprime les INSERT en cours
        // Note: Realtime gère automatiquement les mises à jour, mais on garde un refresh après consolidation
        // car c'est une opération complexe (DELETE puis INSERT) qui modifie beaucoup de lignes
        if (nbAffectationsCreees > 0) {
          try {
            await consolidateAffectations(competence)
            console.log(`[Planning2] Consolidation affectations effectuée pour compétence ${competence}`)
            
            // Refresh unique après consolidation (Realtime gère les INSERT individuels, mais consolidation = opération complexe)
            await refreshAffectations()
          } catch (consolidateErr) {
            console.error(`[Planning2] Erreur lors de la consolidation affectations pour ${competence}:`, consolidateErr)
            // Ne pas bloquer si la consolidation échoue, les données sont quand même enregistrées
            // Realtime a déjà mis à jour l'interface pour les INSERT individuels
          }
        }

        const nbBloquees = affectationsACreer.length - affectationsValides.length
        const messageFinal = nbBloquees > 0
          ? `${nbAffectationsCreees} affectation(s) créée(s) sur ${affectationsACreer.length} période(s) de jours ouvrés.\n\n${nbBloquees} période(s) ont été bloquées (absences ou conflits).`
          : `${nbAffectationsCreees} affectation(s) créée(s) sur ${affectationsACreer.length} période(s) de jours ouvrés.\n\n(Uniquement jours ouvrés : lundi-vendredi, hors fériés)`

        addToast(
          messageFinal.replace(/\n/g, ' '),
          'success',
          5000
        )
      } catch (err) {
        console.error('[Planning2] Erreur lors de la génération de masse d\'affectations:', err)
        addToast(
          'Erreur lors de la création des affectations. Veuillez réessayer.',
          'error',
          5000
        )
      } finally {
        // Réactiver l'auto-refresh à son état précédent
        setAutoRefresh(autoRefreshAvant)
        setIsGeneratingAffectations(false)
      }
      } catch (err) {
        console.error('[Planning2] Erreur affectation de masse:', err)
        addToast(
          `Erreur lors de l&apos;affectation de masse : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
          'error',
          5000
        )
        setIsGeneratingAffectations(false)
      }
    }, [competencesData, colonnes, precision, absences, toutesAffectationsRessources, affaireId, saveAffectation, consolidateAffectations, refreshAffectations, confirmAsync, addToast, autoRefresh, setAutoRefresh])

  // Navigation (adaptée selon la précision)
  const handlePreviousPeriod = () => {
    let newDateDebut: Date
    let newDateFin: Date
    
    if (precision === 'JOUR') {
      // Navigation par semaine pour le mode JOUR (plus pratique)
      const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
      newDateDebut = subDays(dateDebut, diffDays + 1)
      newDateFin = subDays(dateFin, diffDays + 1)
    } else if (precision === 'SEMAINE') {
      // Navigation par mois : reculer de 1 mois
      // Trouver le mois actuel à partir de dateDebut
      const currentMonthStart = startOfMonth(dateDebut)
      // Reculer de 1 mois
      const previousMonthStart = subMonths(currentMonthStart, 1)
      // Trouver le lundi de la semaine contenant le début du mois précédent
      const dayOfWeekNew = previousMonthStart.getDay()
      const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
      newDateDebut = new Date(previousMonthStart)
      newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
      // Calculer dateFin comme la fin du mois précédent (sans restriction d'année)
      newDateFin = endOfMonth(previousMonthStart)
    } else if (precision === 'MOIS') {
      // Navigation par mois : reculer de 1 mois
      const monthStart = startOfMonth(dateDebut)
      newDateDebut = subMonths(monthStart, 1)
      newDateFin = endOfMonth(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
    } else {
      // Par défaut, navigation par semaine
      newDateDebut = subWeeks(dateDebut, 1)
      newDateFin = subWeeks(dateFin, 1)
    }
    
    setDateDebut(newDateDebut)
    setDateFin(newDateFin)
    // Remonter les changements au parent
    if (onDateDebutChange) onDateDebutChange(newDateDebut)
    if (onDateFinChange) onDateFinChange(newDateFin)
  }

  const handleNextPeriod = () => {
    let newDateDebut: Date
    let newDateFin: Date
    
    if (precision === 'JOUR') {
      // Navigation par semaine pour le mode JOUR (plus pratique)
      const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
      newDateDebut = addDays(dateDebut, diffDays + 1)
      newDateFin = addDays(dateFin, diffDays + 1)
    } else if (precision === 'SEMAINE') {
      // Navigation par mois : avancer de 1 mois
      // Trouver le mois actuel à partir de dateFin (pour être sûr d'avancer depuis la fin actuelle)
      const currentMonthEnd = endOfMonth(dateFin)
      // Avancer de 1 mois à partir de la fin du mois actuel
      const nextMonthStart = addMonths(startOfMonth(currentMonthEnd), 1)
      // Trouver le lundi de la semaine contenant le début du mois suivant
      const dayOfWeekNew = nextMonthStart.getDay()
      const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
      newDateDebut = new Date(nextMonthStart)
      newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
      // Calculer dateFin comme la fin du mois suivant (sans restriction d'année)
      newDateFin = endOfMonth(nextMonthStart)
    } else if (precision === 'MOIS') {
      // Navigation par mois : avancer de 1 mois
      const monthStart = startOfMonth(dateDebut)
      newDateDebut = addMonths(monthStart, 1)
      newDateFin = endOfMonth(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
    } else {
      // Par défaut, navigation par semaine
      newDateDebut = addWeeks(dateDebut, 1)
      newDateFin = addWeeks(dateFin, 1)
    }
    
    // Vérifier que les dates sont valides avant de les appliquer
    if (isNaN(newDateDebut.getTime()) || isNaN(newDateFin.getTime())) {
      console.error('[handleNextPeriod] Dates invalides calculées', { newDateDebut, newDateFin })
      return
    }
    
    setDateDebut(newDateDebut)
    setDateFin(newDateFin)
    // Remonter les changements au parent (appeler AVANT setDate pour éviter les conflits)
    if (onDateDebutChange) onDateDebutChange(newDateDebut)
    if (onDateFinChange) onDateFinChange(newDateFin)
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
    onAffectationChange,
    onAffectationMasse
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
    onAffectationMasse?: (competence: string, ressourceId: string) => void
  }) => {
    const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number } | null>(null)
    const [showTooltip, setShowTooltip] = React.useState(false)
    const shouldShowTooltip = React.useRef(false)

    // Event listener global pour suivre le curseur
    React.useEffect(() => {
      if (!shouldShowTooltip.current) return

      const handleGlobalMouseMove = (e: MouseEvent) => {
        // léger décalage sous le curseur
        setTooltipPos({
          top: e.clientY + 12,
          left: e.clientX,
        })
      }

      window.addEventListener('mousemove', handleGlobalMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
      }
    })

    const handleMouseEnter = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (absence || isAffecte) {
        shouldShowTooltip.current = true
        setTooltipPos({
          top: e.clientY + 12,
          left: e.clientX,
        })
        setShowTooltip(true)
      }
    }, [absence, isAffecte])

    const handleMouseLeave = React.useCallback(() => {
      shouldShowTooltip.current = false
      setShowTooltip(false)
      setTooltipPos(null)
    }, [])

    // Double-clic pour affectation de masse
    const handleDoubleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!absence && onAffectationMasse && besoin > 0) {
        onAffectationMasse(competence, ressource.id)
      }
    }, [absence, onAffectationMasse, competence, ressource.id, besoin])

    return (
      <>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          title={!absence && besoin > 0 ? "Double-clic pour affecter sur toute la période avec besoin" : undefined}
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

        {(absence || isAffecte) && showTooltip && tooltipPos && (
          <div
            className="fixed z-[99999] opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-2 whitespace-pre-line max-w-xs pointer-events-none -translate-x-1/2"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
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

            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
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
              <motion.button
                onClick={handlePreviousPeriod}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 hover:bg-indigo-100 rounded-lg transition-all text-indigo-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
                <div className="px-4 py-2 text-center min-w-[200px] relative group">
                  <div className="font-semibold text-gray-800 pointer-events-none">
                    {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1 pointer-events-none">
                    <Calendar className="w-3 h-3" />
                    {formatSemaineISO(dateDebut)}
                  </div>
                  {/* Input date pour permettre la sélection */}
                  <input
                    type="date"
                    value={dateDebut.toISOString().split('T')[0]}
                    onChange={(e) => {
                      if (e.target.value) {
                        // Créer la date en UTC pour éviter les problèmes de fuseau horaire
                        const dateStr = e.target.value
                        const newDateDebut = new Date(dateStr + 'T12:00:00')
                        // Vérifier que la date est valide
                        if (isNaN(newDateDebut.getTime())) return
                        
                        setDateDebut(newDateDebut)
                        // Ajuster dateFin selon la précision
                        let newDateFin: Date
                        if (precision === 'SEMAINE') {
                          // Pour SEMAINE, afficher 1 mois complet à partir du début du mois contenant newDateDebut
                          const monthStart = startOfMonth(newDateDebut)
                          const weekStart = new Date(monthStart)
                          const dayOfWeek = weekStart.getDay() || 7
                          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                          weekStart.setDate(weekStart.getDate() - daysToMonday)
                          // Calculer la fin du mois (pas de la semaine)
                          newDateFin = endOfMonth(monthStart)
                          // Ajuster dateDebut pour commencer au lundi de la semaine contenant le début du mois
                          setDateDebut(weekStart)
                        } else if (precision === 'MOIS') {
                          const monthStart = startOfMonth(newDateDebut)
                          newDateFin = endOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1))
                        } else {
                          // Pour JOUR, garder la différence actuelle
                          const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                          newDateFin = new Date(newDateDebut.getTime() + diffDays * 24 * 60 * 60 * 1000)
                        }
                        setDateFin(newDateFin)
                        if (onDateDebutChange) onDateDebutChange(newDateDebut)
                        if (onDateFinChange) onDateFinChange(newDateFin)
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ fontSize: '16px' }}
                    title="Cliquez pour modifier la date de début"
                  />
                </div>
                <motion.button
                  onClick={handleNextPeriod}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 hover:bg-indigo-100 rounded-lg transition-all text-indigo-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Précision */}
              <div className="flex items-center gap-1 bg-white/60 backdrop-blur rounded-xl p-1 shadow-md">
                {(['JOUR', 'SEMAINE', 'MOIS'] as Precision[]).map((prec) => (
                  <motion.button
                    key={prec}
                    onClick={() => {
                      setPrecision(prec)
                      if (onPrecisionChange) onPrecisionChange(prec)
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      precision === prec
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {prec.charAt(0) + prec.slice(1).toLowerCase()}
                  </motion.button>
                ))}
              </div>

              {/* Auto-refresh */}
              <motion.button
                onClick={() => setAutoRefresh(!autoRefresh)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-xl font-medium text-sm shadow-md transition-all ${
                  autoRefresh 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {autoRefresh ? '🔄 Auto' : '⏸️ Manuel'}
              </motion.button>
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
                  <motion.button
                    key={comp}
                    onClick={() => toggleCompetence(comp)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    {comp}
                    {hasData && (
                      <motion.span 
                        className={`ml-2 w-2 h-2 rounded-full inline-block ${isSelected ? 'bg-yellow-300' : 'bg-indigo-500'}`}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
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
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="popLayout">
              {competencesData.map((compData, index) => {
              const totalAffecte = compData.totalAffecte
              const totalBesoin = compData.totalBesoin
              const isSurAffecte = totalAffecte > totalBesoin
              const isSousAffecte = totalAffecte < totalBesoin && totalBesoin > 0
              
              return (
                <motion.div
                  key={compData.competence}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
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
                                  <div 
                                    onDoubleClick={() => handleChargeMasse(compData.competence, idx)}
                                    onClick={(e) => {
                                      // Clic simple pour sélectionner une ressource externe
                                      if (e.detail === 1 && besoin > 0) {
                                        ouvrirModalRessourceExterne(compData.competence, idx)
                                      }
                                    }}
                                    title="Clic pour affecter une ressource externe | Double-clic pour créer une charge de masse"
                                    className="rounded-xl p-3 mb-2 border-2 bg-yellow-50 border-yellow-300 cursor-pointer hover:bg-yellow-100 transition-colors"
                                  >
                                    <div className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={besoin}
                                          onChange={(e) => handleChargeChange(compData.competence, idx, parseInt(e.target.value) || 0)}
                                          onClick={(e) => e.stopPropagation()}
                                          onDoubleClick={(e) => e.stopPropagation()}
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
                                          onAffectationMasse={handleAffectationMasse}
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
                </motion.div>
              )
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modal de charge de masse */}
      {chargeMasseModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay avec backdrop blur */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={chargeMasseModal.isGenerating ? undefined : handleChargeMasseModalCancel}
            style={{ cursor: chargeMasseModal.isGenerating ? 'not-allowed' : 'pointer' }}
          />
          
          {/* Modal */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-blue-200 w-full max-w-md p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-1">Charge de masse</h3>
                <p className="text-gray-600 text-sm">
                  Compétence : <span className="font-semibold">{chargeMasseModal.competence}</span>
                </p>
                {chargeMasseModal.dateDebut && (
                  <p className="text-gray-600 text-sm mt-1">
                    Date de début : <span className="font-semibold">{chargeMasseModal.dateDebut.toLocaleDateString('fr-FR')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Champs de saisie */}
            <div className="space-y-4 mb-6">
              {/* Date de fin avec calendrier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={chargeMasseModal.dateFinInput}
                    onChange={(e) => {
                      const newDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null
                      setChargeMasseModal(prev => ({ 
                        ...prev, 
                        dateFinInput: e.target.value,
                        dateFin: newDate
                      }))
                    }}
                    min={chargeMasseModal.dateDebut ? chargeMasseModal.dateDebut.toISOString().split('T')[0] : undefined}
                    disabled={chargeMasseModal.isGenerating}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !chargeMasseModal.isGenerating) {
                        handleChargeMasseModalConfirm()
                      }
                    }}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Cliquez sur l&apos;icône calendrier ou utilisez le format YYYY-MM-DD
                </p>
              </div>

              {/* Nombre de ressources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de ressources nécessaires <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={chargeMasseModal.nbRessourcesInput}
                  onChange={(e) => setChargeMasseModal(prev => ({ ...prev, nbRessourcesInput: e.target.value }))}
                  placeholder="1"
                  disabled={chargeMasseModal.isGenerating}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !chargeMasseModal.isGenerating) {
                      handleChargeMasseModalConfirm()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Uniquement jours ouvrés (lundi-vendredi, hors fériés)</p>
              </div>
              
              {/* Indicateur de génération */}
              {chargeMasseModal.isGenerating && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération en cours... Veuillez patienter</span>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleChargeMasseModalCancel}
                disabled={chargeMasseModal.isGenerating}
                className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleChargeMasseModalConfirm}
                disabled={chargeMasseModal.isGenerating}
                className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {chargeMasseModal.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de sélection de ressources externes */}
      {ressourceExterneModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setRessourceExterneModal(prev => ({ ...prev, isOpen: false, ressourcesSelectionnees: [] }))}
          />
          
          {/* Modal */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-indigo-200 w-full max-w-2xl max-h-[80vh] p-6 transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-1">Sélectionner une ressource externe</h3>
                <p className="text-gray-600 text-sm">
                  Compétence : <span className="font-semibold">{ressourceExterneModal.competence}</span>
                </p>
                {colonnes[ressourceExterneModal.colIndex] && (
                  <p className="text-gray-600 text-sm mt-1">
                    Date : <span className="font-semibold">{colonnes[ressourceExterneModal.colIndex].date.toLocaleDateString('fr-FR')}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setRessourceExterneModal(prev => ({ ...prev, isOpen: false, ressourcesSelectionnees: [] }))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            {/* Liste des ressources externes */}
            <div className="flex-1 overflow-y-auto mb-4">
              {loadingToutesRessources ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {getRessourcesExternesParCompetence(ressourceExterneModal.competence).map((ressource) => {
                    const estDejaSelectionnee = ressourceExterneModal.ressourcesSelectionnees.some(
                      r => r.ressourceId === ressource.id
                    )
                    const competencesRessource = competencesMapToutes.get(ressource.id) || []
                    const competenceInfo = competencesRessource.find(c => c.competence === ressourceExterneModal.competence)
                    
                    return (
                      <div
                        key={ressource.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          estDejaSelectionnee
                            ? 'bg-green-50 border-green-400'
                            : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!estDejaSelectionnee) {
                            handleSelectionRessourceExterne(ressource.id, ressource.nom, ressource.site)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{ressource.nom}</span>
                              {competenceInfo?.type_comp === 'P' && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Principale</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Site : {ressource.site}
                            </div>
                          </div>
                          {estDejaSelectionnee && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {getRessourcesExternesParCompetence(ressourceExterneModal.competence).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Aucune ressource externe disponible pour cette compétence</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Liste des ressources sélectionnées */}
            {ressourceExterneModal.ressourcesSelectionnees.length > 0 && (
              <div className="border-t pt-4 mt-4 flex-shrink-0">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ressources sélectionnées :</h4>
                <div className="space-y-1">
                  {ressourceExterneModal.ressourcesSelectionnees.map((r, idx) => (
                    <div key={idx} className="text-sm text-gray-600 bg-green-50 p-2 rounded">
                      ✓ {r.ressourceNom} ({r.ressourceSite})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton fermer */}
            <div className="flex items-center justify-end gap-3 mt-4 flex-shrink-0">
              <button
                onClick={() => setRessourceExterneModal(prev => ({ ...prev, isOpen: false, ressourcesSelectionnees: [] }))}
                className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
