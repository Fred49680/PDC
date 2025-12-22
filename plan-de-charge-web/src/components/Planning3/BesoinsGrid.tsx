'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Target, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { getDatesBetween, normalizeDateToUTC } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import { createClient } from '@/lib/supabase/client'
import type { Precision } from '@/types/charge'
import { useToast } from '@/components/UI/Toast'
import type { Affectation } from '@/types/affectations'

interface BesoinsGridProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onAffecterMasse?: (besoins: BesoinPeriode[]) => void
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  showExternesGlobal?: boolean // Toggle global pour toutes les compétences
}

interface ColonneDate {
  date: Date
  label: string
  shortLabel: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
  weekStart?: Date
  weekEnd?: Date
}

interface CelluleInfo {
  isAffectee: boolean
  hasConflitAutreAffaire: boolean
  hasConflitAutreCompetence: boolean
  hasAbsence: boolean
  affectationId?: string
  conflitAffaireId?: string // AffaireID où la ressource est affectée
  absenceCommentaire?: string // Commentaire de l'absence
}

const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())

// Fonction pour obtenir le format semaine ISO avec année : "01-2026"
const getSemaineISOWithYear = (date: Date): string => {
  const dayOfWeek = date.getDay() || 7
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOfWeek + 1)
  
  const thursday = new Date(weekStart)
  thursday.setDate(weekStart.getDate() + 3)
  const isoYear = thursday.getFullYear()
  
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - jan4Day + 1)
  
  const diffTime = weekStart.getTime() - jan4WeekStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  
  if (weekNumber < 1) {
    const prevJan4 = new Date(isoYear - 1, 0, 4)
    const prevJan4Day = prevJan4.getDay() || 7
    const prevJan4WeekStart = new Date(prevJan4)
    prevJan4WeekStart.setDate(prevJan4.getDate() - prevJan4Day + 1)
    const prevDiffTime = weekStart.getTime() - prevJan4WeekStart.getTime()
    const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24))
    const prevWeekNumber = Math.floor(prevDiffDays / 7) + 1
    return `${prevWeekNumber.toString().padStart(2, '0')}-${isoYear - 1}`
  } else if (weekNumber > 52) {
    const nextJan4 = new Date(isoYear + 1, 0, 4)
    const nextJan4Day = nextJan4.getDay() || 7
    const nextJan4WeekStart = new Date(nextJan4)
    nextJan4WeekStart.setDate(nextJan4.getDate() - nextJan4Day + 1)
    
    if (weekStart >= nextJan4WeekStart) {
      return `01-${isoYear + 1}`
    }
    return `53-${isoYear}`
  }
  
  return `${weekNumber.toString().padStart(2, '0')}-${isoYear}`
}

export function BesoinsGrid({ 
  besoins, 
  onAffecter, 
  onAffecterMasse,
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision,
  showExternesGlobal = false
}: BesoinsGridProps) {
  const { affectations, loading: loadingAffectations, saveAffectation, deleteAffectation, refresh: refreshAffectations } = useAffectations({
    affaireId,
    site,
    autoRefresh: true,
    enableRealtime: true,
  })

  const [expandedCompetences, setExpandedCompetences] = useState<Set<string>>(new Set())

  // Utiliser le toggle global passé en prop
  const hasExternes = showExternesGlobal
  
  const { ressources: ressourcesSite, competences: competencesSite, loading: loadingRessourcesSite } = useRessources({
    site,
    actif: true,
    enableRealtime: true,
  })

  // Charger toutes les ressources seulement si ressources externes activées (lazy loading)
  // Note: useRessources charge toujours, mais on ne l'utilise que si hasExternes est true
  const { ressources: ressourcesAll, competences: competencesAll, loading: loadingRessourcesAll } = useRessources({
    actif: true,
    enableRealtime: hasExternes, // Activer Realtime seulement si nécessaire pour optimiser
  })

  // Utiliser les ressources du site par défaut, toutes si ressources externes activées
  const ressources = useMemo(() => {
    return hasExternes ? ressourcesAll : ressourcesSite
  }, [hasExternes, ressourcesSite, ressourcesAll])

  const competences = useMemo(() => {
    return hasExternes ? competencesAll : competencesSite
  }, [hasExternes, competencesSite, competencesAll])

  const loadingRessources = useMemo(() => {
    return hasExternes ? loadingRessourcesAll : loadingRessourcesSite
  }, [hasExternes, loadingRessourcesAll, loadingRessourcesSite])

  const { absences, loading: loadingAbsences } = useAbsences({
    enableRealtime: true,
  })

  const [allAffectations, setAllAffectations] = useState<Affectation[]>([]) // Toutes les affectations pour détecter les conflits
  const [affairesMap, setAffairesMap] = useState<Map<string, string>>(new Map()) // Map UUID -> affaire_id
  const [loadingAllAffectations, setLoadingAllAffectations] = useState(true)
  const [affaireUuid, setAffaireUuid] = useState<string | null>(null)
  const { addToast } = useToast()

  // Charger l'UUID de l'affaire, toutes les affectations et les affaires pour détecter les conflits
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingAllAffectations(true)
        const supabase = createClient()
        
        // Récupérer l'UUID de l'affaire
        const { data: affaireData } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireId)
          .eq('site', site)
          .maybeSingle()
        
        if (affaireData) {
          setAffaireUuid(affaireData.id)
          
          // Charger TOUTES les affectations avec les affaires (pour avoir l'affaire_id)
          const { data: allAff, error } = await supabase
            .from('affectations')
            .select(`
              *,
              affaires (
                id,
                affaire_id
              )
            `)
            .order('date_debut', { ascending: true })
          
          if (!error && allAff) {
            const affectationsAvecDates = allAff.map((a: any) => ({
              ...a,
              date_debut: a.date_debut ? new Date(a.date_debut) : new Date(),
              date_fin: a.date_fin ? new Date(a.date_fin) : new Date(),
            })) as any[]
            setAllAffectations(affectationsAvecDates)
            
            // Créer une map UUID -> affaire_id
            const map = new Map<string, string>()
            affectationsAvecDates.forEach((aff: any) => {
              if (aff.affaires && Array.isArray(aff.affaires) && aff.affaires.length > 0) {
                const affaire = aff.affaires[0]
                if (affaire.id && affaire.affaire_id) {
                  map.set(affaire.id, affaire.affaire_id)
                }
              } else if (aff.affaires && aff.affaires.id && aff.affaires.affaire_id) {
                map.set(aff.affaires.id, aff.affaires.affaire_id)
              }
            })
            setAffairesMap(map)
          }
        }
      } catch (err) {
        console.error('[BesoinsGrid] Erreur chargement affectations:', err)
      } finally {
        setLoadingAllAffectations(false)
      }
    }
    
    loadData()
  }, [affaireId, site])

  // Filtrer les compétences pour n'afficher que celles qui ont des besoins
  const competencesAvecBesoins = useMemo(() => {
    const compSet = new Set<string>()
    besoins.forEach((besoin) => compSet.add(besoin.competence))
    return Array.from(compSet).sort()
  }, [besoins])

  // Grouper les ressources par compétence (uniquement pour les compétences avec besoins)
  // IMPORTANT : Toujours afficher toutes les compétences avec besoins, même si elles n'ont pas de ressources
  const ressourcesParCompetence = useMemo(() => {
    const map = new Map<string, typeof ressources>()
    
    // Initialiser toutes les compétences avec besoins (même sans ressources)
    competencesAvecBesoins.forEach((comp) => {
      map.set(comp, [])
    })
    
    ressources.forEach((ressource) => {
      const ressourceCompetences = competences.get(ressource.id) || []
      ressourceCompetences.forEach((comp) => {
        // Ne garder que les compétences qui ont des besoins
        if (!competencesAvecBesoins.includes(comp.competence)) return
        
        if (!map.has(comp.competence)) {
          map.set(comp.competence, [])
        }
        map.get(comp.competence)!.push(ressource)
      })
    })
    
    // Si mode ressources externes activé globalement, ajouter les ressources d'autres sites
    if (showExternesGlobal) {
      ressources.forEach((ressource) => {
        if (ressource.site === site) return // Déjà inclus
        
        const ressourceCompetences = competences.get(ressource.id) || []
        ressourceCompetences.forEach((comp) => {
          if (!competencesAvecBesoins.includes(comp.competence)) return
          
          if (!map.has(comp.competence)) {
            map.set(comp.competence, [])
          }
          // Vérifier si pas déjà présent
          if (!map.get(comp.competence)!.some(r => r.id === ressource.id)) {
            map.get(comp.competence)!.push(ressource)
          }
        })
      })
    }
    
    // Trier les compétences et les ressources dans chaque groupe
    // Priorité 1 : ressources affectées (triées alphabétiquement)
    // Priorité 2 : ressources non affectées (triées alphabétiquement)
    const sortedMap = new Map<string, typeof ressources>()
    Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([competence, ressourcesComp]) => {
        // Identifier les ressources affectées pour cette compétence
        const ressourcesAffecteesIds = new Set<string>()
        affectations.forEach((aff) => {
          if (aff.competence === competence) {
            ressourcesAffecteesIds.add(aff.ressource_id)
          }
        })
        
        // Séparer affectées et non affectées
        const affectees = ressourcesComp.filter((r) => ressourcesAffecteesIds.has(r.id))
        const nonAffectees = ressourcesComp.filter((r) => !ressourcesAffecteesIds.has(r.id))
        
        // Trier chaque groupe par ordre alphabétique
        const triees = [
          ...affectees.sort((a, b) => a.nom.localeCompare(b.nom)),
          ...nonAffectees.sort((a, b) => a.nom.localeCompare(b.nom)),
        ]
        
        sortedMap.set(competence, triees)
      })
    
    return sortedMap
  }, [ressources, competences, competencesAvecBesoins, site, showExternesGlobal, affectations])

  // Générer les colonnes de dates selon la précision
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
          semaineISO: getSemaineISOWithYear(date),
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
          semaineISO: getSemaineISOWithYear(weekStart),
          weekStart,
          weekEnd,
        })
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      const monthStart = new Date(dateDebut)
      monthStart.setDate(1)
      
      for (let i = 0; i < 12; i++) {
        const currentMonth = new Date(monthStart)
        currentMonth.setMonth(monthStart.getMonth() + i)
        
        const monthShort = currentMonth.toLocaleDateString('fr-FR', { month: 'short' })
        const monthShortClean = monthShort.replace(/\.$/, '')
        const year = currentMonth.getFullYear()
        const monthEnd = new Date(year, currentMonth.getMonth() + 1, 0)
        
        cols.push({
          date: currentMonth,
          label: currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          shortLabel: `${monthShortClean}.${year}`,
          isWeekend: false,
          isHoliday: false,
          semaineISO: getSemaineISOWithYear(currentMonth),
          weekStart: currentMonth,
          weekEnd: monthEnd,
        })
      }
    }
    
    return cols
  }, [dateDebut, dateFin, precision])

  // Calculer la charge totale (besoin) par colonne de date
  const chargeParColonne = useMemo(() => {
    const charges = new Map<number, number>() // Index colonne -> charge totale
    
    colonnes.forEach((col, colIndex) => {
      let totalCharge = 0
      
      besoins.forEach((besoin) => {
        const besoinDateDebut = normalizeDateToUTC(new Date(besoin.dateDebut))
        const besoinDateFin = normalizeDateToUTC(new Date(besoin.dateFin))
        const colDate = normalizeDateToUTC(col.date)
        
        let correspond = false
        if (precision === 'JOUR') {
          correspond = besoinDateDebut <= colDate && besoinDateFin >= colDate
        } else if (precision === 'SEMAINE') {
          if (col.weekStart && col.weekEnd) {
            const weekStartUTC = normalizeDateToUTC(col.weekStart)
            const weekEndUTC = normalizeDateToUTC(col.weekEnd)
            correspond = besoinDateDebut <= weekEndUTC && besoinDateFin >= weekStartUTC
          }
        } else if (precision === 'MOIS') {
          if (col.weekStart && col.weekEnd) {
            const monthStartUTC = normalizeDateToUTC(col.weekStart)
            const monthEndUTC = normalizeDateToUTC(col.weekEnd)
            correspond = besoinDateDebut <= monthEndUTC && besoinDateFin >= monthStartUTC
          }
        }
        
        if (correspond) {
          totalCharge += besoin.nbRessources
        }
      })
      
      charges.set(colIndex, totalCharge)
    })
    
    return charges
  }, [colonnes, besoins, precision])

  // Construire la grille avec informations sur conflits et absences
  const grille = useMemo(() => {
    const grid = new Map<string, CelluleInfo>() // Clé: "ressourceId|dateIndex", Valeur: info cellule
    
    ressources.forEach((ressource) => {
      colonnes.forEach((col, colIndex) => {
        const cellKey = `${ressource.id}|${colIndex}`
        
        // Vérifier si cette ressource a une affectation pour cette date/colonne (dans cette affaire)
        const affectationActuelle = affectations.find((aff) => {
          if (aff.ressource_id !== ressource.id) return false
          
          const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
          const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
          const colDate = normalizeDateToUTC(col.date)
          
          if (precision === 'JOUR') {
            return affDateDebut <= colDate && affDateFin >= colDate
          } else if (precision === 'SEMAINE') {
            if (!col.weekStart || !col.weekEnd) return false
            const weekStartUTC = normalizeDateToUTC(col.weekStart)
            const weekEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= weekEndUTC && affDateFin >= weekStartUTC
          } else if (precision === 'MOIS') {
            if (!col.weekStart || !col.weekEnd) return false
            const monthStartUTC = normalizeDateToUTC(col.weekStart)
            const monthEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= monthEndUTC && affDateFin >= monthStartUTC
          }
          
          return false
        })
        
        const isAffectee = !!affectationActuelle
        
        // Vérifier conflit autre affaire (même ressource, même date, autre affaire)
        const conflitAutreAffaireData = affaireUuid ? allAffectations.find((aff: any) => {
          if (aff.ressource_id !== ressource.id) return false
          if (aff.affaire_id === affaireUuid) return false // Même affaire, pas un conflit
          
          const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
          const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
          const colDate = normalizeDateToUTC(col.date)
          
          if (precision === 'JOUR') {
            return affDateDebut <= colDate && affDateFin >= colDate
          } else if (precision === 'SEMAINE') {
            if (!col.weekStart || !col.weekEnd) return false
            const weekStartUTC = normalizeDateToUTC(col.weekStart)
            const weekEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= weekEndUTC && affDateFin >= weekStartUTC
          } else if (precision === 'MOIS') {
            if (!col.weekStart || !col.weekEnd) return false
            const monthStartUTC = normalizeDateToUTC(col.weekStart)
            const monthEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= monthEndUTC && affDateFin >= monthStartUTC
          }
          
          return false
        }) : null
        const conflitAutreAffaire = !!conflitAutreAffaireData
        let conflitAffaireId: string | undefined = undefined
        if (conflitAutreAffaireData && conflitAutreAffaireData.affaire_id) {
          // Récupérer l'affaire_id depuis la map ou depuis la structure de l'affectation
          conflitAffaireId = affairesMap.get(conflitAutreAffaireData.affaire_id)
          if (!conflitAffaireId && (conflitAutreAffaireData as any).affaires) {
            const affaires = (conflitAutreAffaireData as any).affaires
            if (Array.isArray(affaires) && affaires.length > 0) {
              conflitAffaireId = affaires[0].affaire_id
            } else if (affaires && affaires.affaire_id) {
              conflitAffaireId = affaires.affaire_id
            }
          }
        }
        
        // Vérifier conflit autre compétence (même ressource, même date, même affaire, autre compétence)
        const conflitAutreCompetence = affaireUuid ? allAffectations.some((aff) => {
          if (aff.ressource_id !== ressource.id) return false
          if (aff.affaire_id !== affaireUuid) return false // Pas la même affaire
          
          const ressourceCompetences = competences.get(ressource.id) || []
          const competencesRessource = ressourceCompetences.map(c => c.competence)
          if (competencesRessource.includes(aff.competence)) return false // Même compétence, pas un conflit
          
          const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
          const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
          const colDate = normalizeDateToUTC(col.date)
          
          if (precision === 'JOUR') {
            return affDateDebut <= colDate && affDateFin >= colDate
          } else if (precision === 'SEMAINE') {
            if (!col.weekStart || !col.weekEnd) return false
            const weekStartUTC = normalizeDateToUTC(col.weekStart)
            const weekEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= weekEndUTC && affDateFin >= weekStartUTC
          } else if (precision === 'MOIS') {
            if (!col.weekStart || !col.weekEnd) return false
            const monthStartUTC = normalizeDateToUTC(col.weekStart)
            const monthEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= monthEndUTC && affDateFin >= monthStartUTC
          }
          
          return false
        }) : false
        
        // Vérifier absence
        const absenceData = absences.find((abs) => {
          if (abs.ressource_id !== ressource.id) return false
          
          const absDateDebut = normalizeDateToUTC(new Date(abs.date_debut))
          const absDateFin = normalizeDateToUTC(new Date(abs.date_fin))
          const colDate = normalizeDateToUTC(col.date)
          
          return absDateDebut <= colDate && absDateFin >= colDate
        })
        const hasAbsence = !!absenceData
        
        grid.set(cellKey, {
          isAffectee,
          hasConflitAutreAffaire: conflitAutreAffaire,
          hasConflitAutreCompetence: conflitAutreCompetence,
          hasAbsence,
          affectationId: affectationActuelle?.id,
          conflitAffaireId,
          absenceCommentaire: absenceData?.commentaire || undefined,
        })
      })
    })
    
    return grid
  }, [colonnes, ressources, affectations, allAffectations, absences, precision, affaireUuid, competences, affairesMap])

  const toggleCompetence = (competence: string) => {
    setExpandedCompetences((prev) => {
      const next = new Set(prev)
      if (next.has(competence)) {
        next.delete(competence)
      } else {
        next.add(competence)
      }
      return next
    })
  }


  // Gérer le clic sur une cellule pour ajouter/supprimer une affectation
  const handleCellClick = useCallback(async (ressourceId: string, competence: string, col: ColonneDate) => {
    if (!affaireUuid) {
      addToast('Affaire introuvable', 'error')
      return
    }

    const cellKey = `${ressourceId}|${colonnes.findIndex(c => c.date.getTime() === col.date.getTime())}`
    const cellInfo = grille.get(cellKey)
    
    if (!cellInfo) return

    // Si déjà affectée, supprimer l'affectation
    if (cellInfo.isAffectee && cellInfo.affectationId) {
      try {
        await deleteAffectation(cellInfo.affectationId)
        addToast('Affectation supprimée', 'success')
        await refreshAffectations()
      } catch (err) {
        console.error('[BesoinsGrid] Erreur suppression affectation:', err)
        addToast('Erreur lors de la suppression', 'error')
      }
      return
    }

    // Vérifier les conflits avant d'ajouter
    if (cellInfo.hasConflitAutreAffaire) {
      addToast('Ressource déjà affectée sur une autre affaire', 'error')
      return
    }

    if (cellInfo.hasAbsence) {
      addToast('Ressource absente sur cette période', 'error')
      return
    }

    // Ajouter l'affectation
    try {
      let dateDebutPeriode: Date
      let dateFinPeriode: Date
      
      if (precision === 'JOUR') {
        dateDebutPeriode = normalizeDateToUTC(col.date)
        dateFinPeriode = normalizeDateToUTC(col.date)
      } else if (precision === 'SEMAINE') {
        if (!col.weekStart || !col.weekEnd) return
        dateDebutPeriode = normalizeDateToUTC(col.weekStart)
        dateFinPeriode = normalizeDateToUTC(col.weekEnd)
      } else if (precision === 'MOIS') {
        if (!col.weekStart || !col.weekEnd) return
        dateDebutPeriode = normalizeDateToUTC(col.weekStart)
        dateFinPeriode = normalizeDateToUTC(col.weekEnd)
      } else {
        return
      }

      await saveAffectation({
        ressource_id: ressourceId,
        competence,
        date_debut: dateDebutPeriode,
        date_fin: dateFinPeriode,
        charge: 1,
      })
      
      addToast('Affectation ajoutée', 'success')
      await refreshAffectations()
    } catch (err) {
      console.error('[BesoinsGrid] Erreur ajout affectation:', err)
      addToast('Erreur lors de l\'ajout', 'error')
    }
  }, [affaireUuid, colonnes, grille, precision, saveAffectation, deleteAffectation, refreshAffectations, addToast])

  const loading = loadingAffectations || loadingRessources || loadingAbsences || loadingAllAffectations

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (besoins.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
        <div className="text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Aucun besoin défini pour cette affaire</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from(ressourcesParCompetence.entries()).map(([competence, ressourcesComp]) => {
        const isExpanded = expandedCompetences.has(competence)
        
        return (
          <div key={competence} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            {/* En-tête avec nom de compétence et flèche */}
            <div className="flex items-center gap-3 p-6">
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-50/50 transition-colors rounded p-2 -m-2"
                onClick={() => toggleCompetence(competence)}
              >
                <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full flex-shrink-0"></div>
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{competence}</h3>
                  <span className="text-sm text-gray-500">({ressourcesComp.length} ressource{ressourcesComp.length > 1 ? 's' : ''})</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCompetence(competence)
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                aria-label={isExpanded ? 'Réduire' : 'Développer'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>

            {/* Contenu (grille) - affiché seulement si expandé */}
            {isExpanded && (
              <div className="px-6 pb-6 overflow-x-auto">
                <div className="rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th className="border-b border-r border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
                          Ressource
                        </th>
                        {colonnes.map((col, idx) => (
                          <th
                            key={idx}
                            className={`border-b border-r border-gray-300 px-3 py-2 text-center min-w-[90px] text-xs font-semibold ${
                              col.isWeekend ? 'bg-blue-100 text-blue-800' :
                              col.isHoliday ? 'bg-rose-100 text-rose-800' :
                              'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="font-medium">{col.shortLabel}</div>
                            {precision === 'SEMAINE' && (
                              <div className="text-[10px] text-gray-500 mt-0.5">{col.semaineISO}</div>
                            )}
                          </th>
                        ))}
                      </tr>
                      {/* Ligne de rappel de charge - UNIQUEMENT pour cette compétence */}
                      <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                        <th className="border-b border-r border-gray-300 px-4 py-2 text-left text-xs font-bold text-indigo-800 sticky left-0 z-10 bg-gradient-to-r from-indigo-50 to-purple-50">
                          Charge ({competence})
                        </th>
                        {colonnes.map((col, idx) => {
                          // Calculer la charge UNIQUEMENT pour cette compétence
                          let charge = 0
                          besoins.forEach((besoin) => {
                            if (besoin.competence !== competence) return
                            
                            const besoinDateDebut = normalizeDateToUTC(new Date(besoin.dateDebut))
                            const besoinDateFin = normalizeDateToUTC(new Date(besoin.dateFin))
                            const colDate = normalizeDateToUTC(col.date)
                            
                            let correspond = false
                            if (precision === 'JOUR') {
                              correspond = besoinDateDebut <= colDate && besoinDateFin >= colDate
                            } else if (precision === 'SEMAINE') {
                              if (col.weekStart && col.weekEnd) {
                                const weekStartUTC = normalizeDateToUTC(col.weekStart)
                                const weekEndUTC = normalizeDateToUTC(col.weekEnd)
                                correspond = besoinDateDebut <= weekEndUTC && besoinDateFin >= weekStartUTC
                              }
                            } else if (precision === 'MOIS') {
                              if (col.weekStart && col.weekEnd) {
                                const monthStartUTC = normalizeDateToUTC(col.weekStart)
                                const monthEndUTC = normalizeDateToUTC(col.weekEnd)
                                correspond = besoinDateDebut <= monthEndUTC && besoinDateFin >= monthStartUTC
                              }
                            }
                            
                            if (correspond) {
                              charge += besoin.nbRessources
                            }
                          })
                          
                          return (
                            <th
                              key={idx}
                              className={`border-b border-r border-gray-300 px-2 py-2 text-center text-xs font-bold text-indigo-700 ${
                                col.isWeekend ? 'bg-blue-100' :
                                col.isHoliday ? 'bg-rose-100' :
                                ''
                              }`}
                            >
                              {charge > 0 ? charge : '-'}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {ressourcesComp.map((ressource, ressourceIdx) => {
                        const isEven = ressourceIdx % 2 === 0
                        const isExterne = ressource.site !== site
                        
                        return (
                          <tr key={ressource.id} className={isEven ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className={`border-b border-r border-gray-300 px-4 py-3 font-semibold text-sm text-gray-800 sticky left-0 z-10 ${
                              isEven ? 'bg-white' : 'bg-gray-50/50'
                            }`}>
                              <div className="font-medium">{ressource.nom}</div>
                              <div className={`text-xs ${isExterne ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                                {ressource.site} {isExterne && '(Transfert)'}
                              </div>
                            </td>
                            {colonnes.map((col, colIndex) => {
                              const cellKey = `${ressource.id}|${colIndex}`
                              const cellInfo = grille.get(cellKey) || {
                                isAffectee: false,
                                hasConflitAutreAffaire: false,
                                hasConflitAutreCompetence: false,
                                hasAbsence: false,
                              }
                              
                              // Déterminer la couleur selon l'état
                              let bgColor = 'bg-gray-100 text-gray-400'
                              if (cellInfo.isAffectee) {
                                bgColor = 'bg-green-500 text-white font-semibold'
                              } else if (cellInfo.hasAbsence) {
                                bgColor = 'bg-red-500 text-white font-semibold'
                              } else if (cellInfo.hasConflitAutreAffaire) {
                                bgColor = 'bg-orange-500 text-white font-semibold'
                              } else if (cellInfo.hasConflitAutreCompetence) {
                                bgColor = 'bg-yellow-500 text-white font-semibold'
                              }
                              
                              return (
                                <td 
                                  key={colIndex}
                                  className={`border-b border-r border-gray-300 px-2 py-2 text-center cursor-pointer hover:opacity-80 transition-opacity ${
                                    col.isWeekend ? 'bg-blue-50/50' :
                                    col.isHoliday ? 'bg-rose-50/50' :
                                    ''
                                  }`}
                                  onClick={() => handleCellClick(ressource.id, competence, col)}
                                  title={
                                    cellInfo.isAffectee ? 'Cliquer pour supprimer l\'affectation' :
                                    cellInfo.hasAbsence 
                                      ? `Ressource absente${cellInfo.absenceCommentaire ? `: ${cellInfo.absenceCommentaire}` : ''}` :
                                    cellInfo.hasConflitAutreAffaire 
                                      ? `Ressource affectée sur une autre affaire${cellInfo.conflitAffaireId ? ` (${cellInfo.conflitAffaireId})` : ''}` :
                                    cellInfo.hasConflitAutreCompetence ? 'Ressource affectée sur une autre compétence' :
                                    'Cliquer pour ajouter une affectation'
                                  }
                                >
                                  <div className={`w-full h-8 flex items-center justify-center rounded ${bgColor}`}>
                                    {cellInfo.isAffectee ? '✓' : 
                                     cellInfo.hasAbsence ? 'A' :
                                     cellInfo.hasConflitAutreAffaire ? '!' :
                                     cellInfo.hasConflitAutreCompetence ? '⚠' : ''}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
