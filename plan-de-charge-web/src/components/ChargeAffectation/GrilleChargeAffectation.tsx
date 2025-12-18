'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { CheckCircle2, Info, Users, Target, ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react'
import { normalizeDateToUTC } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import type { Affaire } from '@/types/charge'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'

interface GrilleChargeAffectationProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  affaires: Affaire[]
  responsable?: string
  tranche?: string
  onDateChange?: (newDateDebut: Date, newDateFin: Date) => void
  onPrecisionChange?: (newPrecision: Precision) => void
  onAffaireChange?: (affaireId: string, site: string) => void
  onResponsableChange?: (responsable: string) => void
  onSiteChange?: (site: string) => void
  onTrancheChange?: (tranche: string) => void
}

interface ColonneDate {
  date: Date
  label: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
}

// ========================================
// UTILITIES
// ========================================

// Utility functions simplifiées
const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())
const isFrenchHoliday = (_date: Date): boolean => false // Simplification

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
// COMPOSANT PRINCIPAL OPTIMISÉ
// ========================================

export default function GrilleChargeAffectation({
  affaireId,
  site,
  dateDebut: propDateDebut,
  dateFin: propDateFin,
  precision: propPrecision,
  affaires,
  responsable: propResponsable,
  tranche: propTranche,
  onDateChange,
  onPrecisionChange,
  onAffaireChange,
  onResponsableChange,
  onSiteChange,
  onTrancheChange,
}: GrilleChargeAffectationProps) {
  const [precision, setPrecision] = useState<Precision>(propPrecision)
  const [dateDebut, setDateDebut] = useState(propDateDebut)
  const [dateFin, setDateFin] = useState(propDateFin)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [responsable, setResponsable] = useState(propResponsable || '')
  const [tranche, setTranche] = useState(propTranche || '')
  
  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les responsables uniques depuis les affaires
  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable sélectionné
  const affairesFiltreesParResponsable = responsable
    ? affairesActives.filter((a) => a.responsable === responsable)
    : affairesActives

  // Extraire les sites uniques depuis les affaires filtrées par responsable
  const sitesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsable.map((a) => a.site).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable et le site sélectionnés
  const affairesFiltreesParResponsableEtSite = site
    ? affairesFiltreesParResponsable.filter((a) => a.site === site)
    : affairesFiltreesParResponsable

  // Extraire les tranches uniques depuis les affaires filtrées
  const tranchesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsableEtSite.map((a) => a.tranche).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon responsable, site et tranche
  const affairesFiltreesFinales = tranche
    ? affairesFiltreesParResponsableEtSite.filter((a) => a.tranche === tranche)
    : affairesFiltreesParResponsableEtSite
  
  // Synchroniser avec les props si elles changent (mais ne pas écraser si l'utilisateur a changé localement)
  useEffect(() => {
    // Ne synchroniser que si la prop a vraiment changé (évite d'écraser les changements locaux)
    if (propPrecision !== precision) {
      console.log(`[GrilleChargeAffectation] Synchronisation précision depuis props: ${propPrecision}`)
      setPrecision(propPrecision)
    }
    if (propDateDebut.getTime() !== dateDebut.getTime()) {
      setDateDebut(propDateDebut)
    }
    if (propDateFin.getTime() !== dateFin.getTime()) {
      setDateFin(propDateFin)
    }
    if (propResponsable !== responsable) {
      setResponsable(propResponsable || '')
    }
    if (propTranche !== tranche) {
      setTranche(propTranche || '')
    }
  }, [propPrecision, propDateDebut, propDateFin, propResponsable, propTranche])

  // Utiliser des refs pour suivre les changements utilisateur (évite les boucles avec props)
  const prevResponsableRef = useRef(responsable)
  const prevSiteRef = useRef(site)
  const prevTrancheRef = useRef(tranche)

  // Réinitialiser les filtres en cascade quand l'utilisateur change le responsable
  useEffect(() => {
    // Seulement si c'est un changement utilisateur (pas une synchronisation depuis props)
    if (responsable !== prevResponsableRef.current && responsable) {
      prevResponsableRef.current = responsable
      if (onResponsableChange) {
        onResponsableChange(responsable)
      }
      // Réinitialiser site, tranche et affaire si le responsable change
      if (onSiteChange) onSiteChange('')
      if (onTrancheChange) onTrancheChange('')
      if (onAffaireChange) onAffaireChange('', '')
    } else if (responsable !== prevResponsableRef.current) {
      prevResponsableRef.current = responsable
    }
  }, [responsable, onResponsableChange, onSiteChange, onTrancheChange, onAffaireChange])

  // Réinitialiser tranche et affaire quand l'utilisateur change le site
  useEffect(() => {
    // Seulement si c'est un changement utilisateur (pas une synchronisation depuis props)
    if (site !== prevSiteRef.current && site) {
      prevSiteRef.current = site
      if (onSiteChange) {
        onSiteChange(site)
      }
      if (onTrancheChange) onTrancheChange('')
      if (onAffaireChange) onAffaireChange('', '')
    } else if (site !== prevSiteRef.current) {
      prevSiteRef.current = site
    }
  }, [site, onSiteChange, onTrancheChange, onAffaireChange])

  // Réinitialiser affaire quand l'utilisateur change la tranche
  useEffect(() => {
    // Seulement si c'est un changement utilisateur (pas une synchronisation depuis props)
    if (tranche !== prevTrancheRef.current && tranche) {
      prevTrancheRef.current = tranche
      if (onTrancheChange) {
        onTrancheChange(tranche)
      }
      if (onAffaireChange) onAffaireChange('', '')
    } else if (tranche !== prevTrancheRef.current) {
      prevTrancheRef.current = tranche
    }
  }, [tranche, onTrancheChange, onAffaireChange])
  
  // ========================================
  // CHARGEMENT DES DONNÉES RÉELLES
  // ========================================
  const { periodes, loading: loadingCharge, savePeriode, deletePeriode, consolidate } = useCharge({
    affaireId,
    site,
    autoRefresh,
  })
  
  const { affectations, loading: loadingAffectations, saveAffectation, deleteAffectation } = useAffectations({
    affaireId,
    site,
    autoRefresh,
  })
  
  const { ressources, competences: competencesMap, loading: loadingRessources } = useRessources({
    site,
    actif: true,
  })
  
  // Debug: Vérifier que les données sont bien chargées
  useEffect(() => {
    console.log(`[GrilleChargeAffectation] État chargement - Charge: ${loadingCharge ? 'en cours' : 'terminé'} (${periodes.length} périodes), Affectations: ${loadingAffectations ? 'en cours' : 'terminé'} (${affectations.length} affectations), Ressources: ${loadingRessources ? 'en cours' : 'terminé'} (${ressources.length} ressources)`)
    if (!loadingCharge && periodes.length > 0) {
      console.log(`[GrilleChargeAffectation] Exemple période chargée:`, periodes[0])
    }
    if (!loadingAffectations && affectations.length > 0) {
      console.log(`[GrilleChargeAffectation] Exemple affectation chargée:`, affectations[0])
    }
  }, [loadingCharge, loadingAffectations, loadingRessources, periodes, affectations, ressources])
  
  // États de filtres
  const [competencesFiltrees, setCompetencesFiltrees] = useState<Set<string>>(new Set<string>())
  const [competencesInitialisees, setCompetencesInitialisees] = useState(false) // Flag pour éviter réinitialisation après interaction utilisateur
  
  // Extraire la liste des compétences depuis les périodes et les ressources
  const competencesList = useMemo(() => {
    const compSet = new Set<string>()
    
    // Ajouter les compétences depuis les périodes
    periodes.forEach(p => {
      if (p.competence) compSet.add(p.competence)
    })
    
    // Ajouter les compétences depuis les ressources
    competencesMap.forEach((comps) => {
      comps.forEach(comp => {
        if (comp.competence) compSet.add(comp.competence)
      })
    })
    
    return Array.from(compSet).sort()
  }, [periodes, competencesMap])
  
  // Initialiser les compétences filtrées avec toutes les compétences disponibles au démarrage
  // (seulement une fois, au premier chargement terminé, si l'utilisateur n'a pas encore interagi)
  useEffect(() => {
    if (
      !competencesInitialisees &&
      !loadingCharge && 
      !loadingRessources && 
      competencesList.length > 0 && 
      competencesFiltrees.size === 0
    ) {
      console.log(`[GrilleChargeAffectation] Initialisation compétences: ${competencesList.length} compétence(s) sélectionnée(s)`)
      setCompetencesFiltrees(new Set(competencesList))
      setCompetencesInitialisees(true) // Marquer comme initialisé pour éviter réinitialisation future
    }
  }, [competencesList, loadingCharge, loadingRessources, competencesFiltrees.size, competencesInitialisees])
  
  // États de sauvegarde
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set<string>())
  const saveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map<string, NodeJS.Timeout>())

  // ========================================
  // COLONNES - Mémoïsées selon la précision
  // ========================================
  const colonnes = useMemo(() => {
    const cols: ColonneDate[] = []
    
    if (precision === 'JOUR') {
      // Mode JOUR : une colonne par jour
      const dates = getDatesBetween(dateDebut, dateFin)
      dates.forEach((date) => {
        cols.push({
          date,
          label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          isWeekend: isWeekend(date),
          isHoliday: isFrenchHoliday(date),
          semaineISO: formatSemaineISO(date),
        })
      })
    } else if (precision === 'SEMAINE') {
      // Mode SEMAINE : une colonne par semaine (lundi à dimanche)
      let currentDate = new Date(dateDebut)
      // Trouver le lundi de la semaine de début
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentDate.setDate(currentDate.getDate() - daysToMonday)
      
      while (currentDate <= dateFin) {
        const weekStart = new Date(currentDate)
        const weekEnd = new Date(currentDate)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        // Utiliser le lundi comme date de référence pour la colonne
        cols.push({
          date: weekStart,
          label: `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
          isWeekend: false, // Une semaine contient des week-ends, mais la colonne représente la semaine entière
          isHoliday: false,
          semaineISO: formatSemaineISO(weekStart),
        })
        
        // Passer à la semaine suivante
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      // Mode MOIS : une colonne par mois
      let currentDate = new Date(dateDebut)
      currentDate.setDate(1) // Premier jour du mois
      
      while (currentDate <= dateFin) {
        const monthStart = new Date(currentDate)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) // Dernier jour du mois
        
        // Limiter monthEnd à dateFin si nécessaire
        if (monthEnd > dateFin) {
          monthEnd.setTime(dateFin.getTime())
        }
        
        cols.push({
          date: monthStart,
          label: monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(monthStart),
        })
        
        // Passer au mois suivant
        currentDate.setMonth(currentDate.getMonth() + 1)
        currentDate.setDate(1)
      }
    }
    
    console.log(`[GrilleChargeAffectation] Colonnes générées: ${cols.length} colonne(s) pour précision ${precision}`)
    return cols
  }, [dateDebut, dateFin, precision])

  // ========================================
  // GRILLE DE CHARGE - Mémoïsée avec optimisation
  // ========================================
  const grilleCharge = useMemo(() => {
    const grille = new Map<string, number>()
    
    console.log(`[GrilleChargeAffectation] DEBUG - ${periodes.length} période(s), ${colonnes.length} colonne(s)`)
    if (periodes.length > 0 && colonnes.length > 0) {
      console.log(`[GrilleChargeAffectation] DEBUG - Plage colonnes: ${colonnes[0].label} -> ${colonnes[colonnes.length - 1].label}`)
    }
    
    let nbCellulesRemplies = 0
    let nbPeriodesSansCorrespondance = 0
    periodes.forEach((periode, idx) => {
      const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
      const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
      console.log(`[GrilleChargeAffectation] DEBUG - Période ${idx + 1}: ${periode.competence} du ${periodeDateDebut.toLocaleDateString('fr-FR')} au ${periodeDateFin.toLocaleDateString('fr-FR')}`)
      
      let trouvee = false
      colonnes.forEach((col) => {
        const colDate = normalizeDateToUTC(col.date)
        
        // Vérifier correspondance selon la précision
        let correspond = false
        if (precision === 'JOUR') {
          // Mode JOUR : la date de la colonne doit être dans la période
          correspond = periodeDateDebut <= colDate && periodeDateFin >= colDate
        } else if (precision === 'SEMAINE') {
          // Mode SEMAINE : la période doit chevaucher la semaine (lundi à dimanche)
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(col.date)
          weekStart.setDate(weekStart.getDate() - daysToMonday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          const weekStartUTC = normalizeDateToUTC(weekStart)
          const weekEndUTC = normalizeDateToUTC(weekEnd)
          // Chevauchement : (periodeDateDebut <= weekEndUTC) && (periodeDateFin >= weekStartUTC)
          correspond = periodeDateDebut <= weekEndUTC && periodeDateFin >= weekStartUTC
        } else if (precision === 'MOIS') {
          // Mode MOIS : la période doit chevaucher le mois
          const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          const monthStartUTC = normalizeDateToUTC(monthStart)
          const monthEndUTC = normalizeDateToUTC(monthEnd)
          // Chevauchement : (periodeDateDebut <= monthEndUTC) && (periodeDateFin >= monthStartUTC)
          correspond = periodeDateDebut <= monthEndUTC && periodeDateFin >= monthStartUTC
        }
        
        if (correspond) {
          const cellKey = `${periode.competence}|${col.date.getTime()}`
          grille.set(cellKey, periode.nb_ressources)
          nbCellulesRemplies++
          trouvee = true
        }
      })
      
      if (!trouvee) {
        nbPeriodesSansCorrespondance++
        console.log(`[GrilleChargeAffectation] ATTENTION - Période ${periode.competence} (${periodeDateDebut.toLocaleDateString('fr-FR')} - ${periodeDateFin.toLocaleDateString('fr-FR')}) n'a trouvé aucune correspondance avec les colonnes`)
      }
    })
    
    console.log(`[GrilleChargeAffectation] ${periodes.length} période(s) chargée(s) -> ${nbCellulesRemplies} cellule(s) dans la grille${nbPeriodesSansCorrespondance > 0 ? ` (${nbPeriodesSansCorrespondance} période(s) sans correspondance)` : ''}`)
    
    return grille
  }, [periodes, colonnes, precision])

  // ========================================
  // GRILLE D'AFFECTATIONS - Mémoïsée
  // ========================================
  const grilleAffectations = useMemo(() => {
    const grille = new Map<string, Set<string>>()
    
    console.log(`[GrilleChargeAffectation] DEBUG Affectations - ${affectations.length} affectation(s), ${colonnes.length} colonne(s)`)
    
    let nbCellulesRemplies = 0
    let nbAffectationsSansCorrespondance = 0
    affectations.forEach((affectation, idx) => {
      const affectationDateDebut = normalizeDateToUTC(new Date(affectation.date_debut))
      const affectationDateFin = normalizeDateToUTC(new Date(affectation.date_fin))
      console.log(`[GrilleChargeAffectation] DEBUG - Affectation ${idx + 1}: ${affectation.ressource_id} / ${affectation.competence} du ${affectationDateDebut.toLocaleDateString('fr-FR')} au ${affectationDateFin.toLocaleDateString('fr-FR')}`)
      
      let trouvee = false
      colonnes.forEach((col) => {
        const colDate = normalizeDateToUTC(col.date)
        
        // Vérifier correspondance selon la précision
        let correspond = false
        if (precision === 'JOUR') {
          // Mode JOUR : la date de la colonne doit être dans la période d'affectation
          correspond = affectationDateDebut <= colDate && affectationDateFin >= colDate
        } else if (precision === 'SEMAINE') {
          // Mode SEMAINE : l'affectation doit chevaucher la semaine (lundi à dimanche)
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(col.date)
          weekStart.setDate(weekStart.getDate() - daysToMonday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          const weekStartUTC = normalizeDateToUTC(weekStart)
          const weekEndUTC = normalizeDateToUTC(weekEnd)
          // Chevauchement : (affectationDateDebut <= weekEndUTC) && (affectationDateFin >= weekStartUTC)
          correspond = affectationDateDebut <= weekEndUTC && affectationDateFin >= weekStartUTC
        } else if (precision === 'MOIS') {
          // Mode MOIS : l'affectation doit chevaucher le mois
          const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          const monthStartUTC = normalizeDateToUTC(monthStart)
          const monthEndUTC = normalizeDateToUTC(monthEnd)
          // Chevauchement : (affectationDateDebut <= monthEndUTC) && (affectationDateFin >= monthStartUTC)
          correspond = affectationDateDebut <= monthEndUTC && affectationDateFin >= monthStartUTC
        }
        
        if (correspond) {
          const cellKey = `${affectation.competence}|${col.date.getTime()}`
          if (!grille.has(cellKey)) {
            grille.set(cellKey, new Set<string>())
          }
          const affectationsSet = grille.get(cellKey)
          if (affectationsSet) {
            affectationsSet.add(affectation.ressource_id)
            nbCellulesRemplies++
            trouvee = true
          }
        }
      })
      
      if (!trouvee) {
        nbAffectationsSansCorrespondance++
        console.log(`[GrilleChargeAffectation] ATTENTION - Affectation ${affectation.ressource_id} / ${affectation.competence} (${affectationDateDebut.toLocaleDateString('fr-FR')} - ${affectationDateFin.toLocaleDateString('fr-FR')}) n'a trouvé aucune correspondance avec les colonnes`)
      }
    })
    
    console.log(`[GrilleChargeAffectation] ${affectations.length} affectation(s) chargée(s) -> ${nbCellulesRemplies} cellule(s) dans la grille${nbAffectationsSansCorrespondance > 0 ? ` (${nbAffectationsSansCorrespondance} affectation(s) sans correspondance)` : ''}`)
    
    return grille
  }, [affectations, colonnes, precision])

  // ========================================
  // RESSOURCES PAR COMPÉTENCE - Mémoïsées
  // ========================================
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

  // ========================================
  // HANDLER CHARGE AVEC DEBOUNCING
  // ========================================
  const handleChargeChange = useCallback((competence: string, col: ColonneDate, value: number) => {
    const cellKey = `${competence}|${col.date.getTime()}`
    const nbRessources = Math.max(0, Math.floor(value))
    
    // *** CORRECTION : Normaliser les dates à minuit UTC ***
    const colDateNormalisee = normalizeDateToUTC(col.date)
    
    // Indicateur de sauvegarde
    setSavingCells(prev => new Set(prev).add(cellKey))
    
    // Debouncing - sauvegarde après 500ms
    if (saveTimeoutRef.current.has(cellKey)) {
      clearTimeout(saveTimeoutRef.current.get(cellKey))
    }
    
    const timeout = setTimeout(async () => {
      try {
        console.log(`💾 Sauvegarde ${competence} - ${col.label}: ${nbRessources} (précision: ${precision})`)
        
        // Calculer les dates de début et fin selon la précision
        let dateDebutPeriode: Date
        let dateFinPeriode: Date
        
        if (precision === 'JOUR') {
          // Mode JOUR : une seule date
          dateDebutPeriode = colDateNormalisee
          dateFinPeriode = colDateNormalisee
        } else if (precision === 'SEMAINE') {
          // Mode SEMAINE : lundi à dimanche de la semaine
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          dateDebutPeriode = new Date(col.date)
          dateDebutPeriode.setDate(dateDebutPeriode.getDate() - daysToMonday)
          dateFinPeriode = new Date(dateDebutPeriode)
          dateFinPeriode.setDate(dateFinPeriode.getDate() + 6)
          // Normaliser à UTC
          dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
          dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
        } else if (precision === 'MOIS') {
          // Mode MOIS : premier au dernier jour du mois
          dateDebutPeriode = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          dateFinPeriode = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          // Limiter à dateFin si nécessaire
          if (dateFinPeriode > dateFin) {
            dateFinPeriode = new Date(dateFin)
          }
          // Normaliser à UTC
          dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
          dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
        } else {
          // Par défaut : mode JOUR
          dateDebutPeriode = colDateNormalisee
          dateFinPeriode = colDateNormalisee
        }
        
        // Trouver la période existante pour cette compétence/période
        const periodeExistante = periodes.find(
          (p) => {
            const pDateDebut = normalizeDateToUTC(new Date(p.date_debut))
            const pDateFin = normalizeDateToUTC(new Date(p.date_fin))
            return p.competence === competence && 
                   // Vérifier chevauchement : (dateDebutPeriode <= pDateFin) && (dateFinPeriode >= pDateDebut)
                   dateDebutPeriode <= pDateFin && 
                   dateFinPeriode >= pDateDebut
          }
        )
        
        if (nbRessources === 0 && periodeExistante) {
          // Supprimer la période si elle existe et que la charge passe à 0
          await deletePeriode(periodeExistante.id)
        } else if (nbRessources > 0) {
          // Appel API réel savePeriode() (le hook gère la mise à jour optimiste)
          await savePeriode({
            id: periodeExistante?.id,
            competence,
            date_debut: dateDebutPeriode,
            date_fin: dateFinPeriode,
            nb_ressources: nbRessources,
          })
          
          // Si mode JOUR et autoRefresh activé, consolider après sauvegarde
          if (precision === 'JOUR' && autoRefresh) {
            setTimeout(() => {
              consolidate(competence).catch(err => {
                console.error('[GrilleChargeAffectation] Erreur consolidation:', err)
              })
            }, 1000)
          }
        }
      } catch (err) {
        console.error('[GrilleChargeAffectation] Erreur savePeriode:', err)
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
  }, [periodes, savePeriode, deletePeriode, consolidate, precision, autoRefresh, dateFin])

  // ========================================
  // HANDLER AFFECTATION
  // ========================================
  const handleAffectationChange = useCallback(async (competence: string, ressourceId: string, col: ColonneDate, checked: boolean) => {
    console.log(`✅ Affectation ${checked ? 'ajoutée' : 'retirée'}: ${ressourceId} - ${competence} - ${col.label} (précision: ${precision})`)
    
    // Calculer les dates de début et fin selon la précision
    let dateDebutAffectation: Date
    let dateFinAffectation: Date
    
    if (precision === 'JOUR') {
      // Mode JOUR : une seule date
      dateDebutAffectation = normalizeDateToUTC(col.date)
      dateFinAffectation = normalizeDateToUTC(col.date)
    } else if (precision === 'SEMAINE') {
      // Mode SEMAINE : lundi à dimanche de la semaine
      const dayOfWeek = col.date.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      dateDebutAffectation = new Date(col.date)
      dateDebutAffectation.setDate(dateDebutAffectation.getDate() - daysToMonday)
      dateFinAffectation = new Date(dateDebutAffectation)
      dateFinAffectation.setDate(dateFinAffectation.getDate() + 6)
      // Normaliser à UTC
      dateDebutAffectation = normalizeDateToUTC(dateDebutAffectation)
      dateFinAffectation = normalizeDateToUTC(dateFinAffectation)
    } else if (precision === 'MOIS') {
      // Mode MOIS : premier au dernier jour du mois
      dateDebutAffectation = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
      dateFinAffectation = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
      // Limiter à dateFin si nécessaire
      if (dateFinAffectation > dateFin) {
        dateFinAffectation = new Date(dateFin)
      }
      // Normaliser à UTC
      dateDebutAffectation = normalizeDateToUTC(dateDebutAffectation)
      dateFinAffectation = normalizeDateToUTC(dateFinAffectation)
    } else {
      // Par défaut : mode JOUR
      dateDebutAffectation = normalizeDateToUTC(col.date)
      dateFinAffectation = normalizeDateToUTC(col.date)
    }
    
    try {
      if (checked) {
        // Appel API réel saveAffectation() (le hook gère la mise à jour optimiste)
        await saveAffectation({
          ressource_id: ressourceId,
          competence,
          date_debut: dateDebutAffectation,
          date_fin: dateFinAffectation,
          charge: 1,
        })
      } else {
        // Trouver l'affectation à supprimer (chercher par chevauchement de période)
        const affectationASupprimer = affectations.find(a => {
          const aDateDebut = normalizeDateToUTC(new Date(a.date_debut))
          const aDateFin = normalizeDateToUTC(new Date(a.date_fin))
          return a.ressource_id === ressourceId && 
                 a.competence === competence &&
                 // Chevauchement : (aDateDebut <= dateFinAffectation) && (aDateFin >= dateDebutAffectation)
                 aDateDebut <= dateFinAffectation &&
                 aDateFin >= dateDebutAffectation
        })
        
        if (affectationASupprimer?.id) {
          await deleteAffectation(affectationASupprimer.id)
        }
      }
    } catch (err) {
      console.error('[GrilleChargeAffectation] Erreur saveAffectation/deleteAffectation:', err)
    }
  }, [affectations, saveAffectation, deleteAffectation, precision, dateFin])

  // ========================================
  // TOTAL AFFECTÉ - Mémoïsé
  // ========================================
  const getTotalAffecte = useCallback((competence: string, col: ColonneDate): number => {
    const cellKey = `${competence}|${col.date.getTime()}`
    return (grilleAffectations.get(cellKey) || new Set<string>()).size
  }, [grilleAffectations])

  // ========================================
  // NAVIGATION TEMPORELLE
  // ========================================
  const handlePreviousPeriod = () => {
    setDateDebut(prev => subWeeks(prev, 1))
    setDateFin(prev => subWeeks(prev, 1))
  }

  const handleNextPeriod = () => {
    setDateDebut(prev => addWeeks(prev, 1))
    setDateFin(prev => addWeeks(prev, 1))
  }

  // ========================================
  // TOGGLE COMPÉTENCE
  // ========================================
  const toggleCompetence = useCallback((competence: string): void => {
    setCompetencesFiltrees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(competence)) {
        newSet.delete(competence)
        console.log(`[GrilleChargeAffectation] Compétence "${competence}" désélectionnée`)
      } else {
        newSet.add(competence)
        console.log(`[GrilleChargeAffectation] Compétence "${competence}" sélectionnée`)
      }
      // Marquer que l'utilisateur a interagi (empêche la réinitialisation automatique)
      setCompetencesInitialisees(true)
      return newSet
    })
  }, [])

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Grille Charge & Affectations
          </h1>
          <p className="text-gray-600">Planifiez et affectez vos ressources en temps réel</p>
          {(loadingCharge || loadingAffectations || loadingRessources) && (
            <div className="mt-4 flex items-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement des données...</span>
            </div>
          )}
        </div>

        {/* SÉLECTION AFFAIRE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Sélection affaire
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Responsable */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Responsable
              </label>
              <select
                value={responsable}
                onChange={(e) => {
                  const newResponsable = e.target.value
                  setResponsable(newResponsable)
                  if (onResponsableChange) {
                    onResponsableChange(newResponsable)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Tous les responsables...</option>
                {responsablesDisponibles.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => {
                  const newSite = e.target.value
                  setSite(newSite)
                  if (onSiteChange) {
                    onSiteChange(newSite)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Sélectionner un site...</option>
                {sitesDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Tranche */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tranche
              </label>
              <select
                value={tranche}
                onChange={(e) => {
                  const newTranche = e.target.value
                  setTranche(newTranche)
                  if (onTrancheChange) {
                    onTrancheChange(newTranche)
                  }
                }}
                disabled={!site}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Toutes les tranches...</option>
                {tranchesDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Affaire */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Affaire <span className="text-red-500">*</span>
              </label>
              <select
                value={affaireId}
                onChange={(e) => {
                  const selectedAffaireId = e.target.value
                  if (selectedAffaireId && onAffaireChange) {
                    const affaire = affairesFiltreesFinales.find(
                      (a) => a.affaire_id === selectedAffaireId
                    )
                    if (affaire) {
                      onAffaireChange(selectedAffaireId, affaire.site)
                    }
                  }
                }}
                disabled={!site}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner une affaire...</option>
                {affairesFiltreesFinales.map((affaire) => (
                  <option key={affaire.id} value={affaire.affaire_id || ''}>
                    {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* FILTRES COMPÉTENCES */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Filtrer les compétences</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Bouton "Tout sélectionner" cliqué - ${competencesList.length} compétence(s)`)
                  setCompetencesFiltrees(new Set(competencesList))
                  setCompetencesInitialisees(true) // Marquer que l'utilisateur a interagi
                }}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Bouton "Tout désélectionner" cliqué`)
                  setCompetencesFiltrees(new Set<string>())
                  setCompetencesInitialisees(true) // Marquer que l'utilisateur a interagi
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {competencesList.map((comp) => {
              const isActive = competencesFiltrees.has(comp)
              const hasCharge = Array.from(grilleCharge.keys()).some(key => key.startsWith(comp))
              
              return (
                <button
                  key={comp}
                  onClick={() => toggleCompetence(comp)}
                  className={`
                    relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                      : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }
                  `}
                >
                  {comp}
                  {hasCharge && (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isActive ? 'bg-yellow-400' : 'bg-blue-500'} ring-2 ring-white`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* NAVIGATION TEMPORELLE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              onClick={handlePreviousPeriod}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Précédent</span>
            </button>
            
            <div className="text-center flex-1">
              <div className="font-bold text-gray-800 text-lg">
                {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
              </div>
              <div className="text-sm text-gray-500">
                Semaine {formatSemaineISO(dateDebut)}
              </div>
            </div>

            {/* SÉLECTEUR DE PRÉCISION */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Changement précision: JOUR (précédent: ${precision})`)
                  setPrecision('JOUR')
                  // Remonter le changement au parent si callback fourni
                  if (onPrecisionChange) {
                    onPrecisionChange('JOUR')
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${precision === 'JOUR'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                Jour
              </button>
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Changement précision: SEMAINE (précédent: ${precision})`)
                  setPrecision('SEMAINE')
                  // Remonter le changement au parent si callback fourni
                  if (onPrecisionChange) {
                    onPrecisionChange('SEMAINE')
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${precision === 'SEMAINE'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                Semaine
              </button>
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Changement précision: MOIS (précédent: ${precision})`)
                  setPrecision('MOIS')
                  // Remonter le changement au parent si callback fourni
                  if (onPrecisionChange) {
                    onPrecisionChange('MOIS')
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${precision === 'MOIS'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                Mois
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium transition-all text-sm
                  ${autoRefresh 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                    : 'bg-gray-300 text-gray-700'
                  }
                `}
              >
                {autoRefresh ? '🔄 Auto ON' : '⏸️ Auto OFF'}
              </button>
              
              <button
                onClick={handleNextPeriod}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
              >
                <span>Suivant</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* GRILLE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-30 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Compétence / Ressource
                    </div>
                  </th>
                  {colonnes.map((col, idx) => (
                    <th
                      key={idx}
                      className={`
                        px-3 py-3 text-center font-semibold min-w-[100px]
                        ${col.isWeekend ? 'bg-blue-500/90' : col.isHoliday ? 'bg-pink-500/90' : ''}
                      `}
                    >
                      <div className="text-sm">{col.label}</div>
                      <div className="text-xs opacity-80 mt-1">{col.semaineISO}</div>
                      {col.isWeekend && <div className="text-xs mt-0.5">WE</div>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold bg-gradient-to-r from-blue-600 to-indigo-600">
                    Total
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {competencesFiltrees.size === 0 ? (
                  <tr>
                    <td colSpan={colonnes.length + 2} className="p-12 text-center">
                      <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl font-semibold text-gray-400 mb-2">
                        Aucune compétence sélectionnée
                      </p>
                      <p className="text-gray-400">
                        Sélectionnez des compétences pour afficher la grille
                      </p>
                    </td>
                  </tr>
                ) : (
                  Array.from(competencesFiltrees).map((comp) => {
                    const ressourcesComp = ressourcesParCompetence.get(comp) || []
                    const totalCharge = colonnes.reduce((sum, col) => {
                      const cellKey = `${comp}|${col.date.getTime()}`
                      return sum + (grilleCharge.get(cellKey) || 0)
                    }, 0)

                    return (
                      <React.Fragment key={comp}>
                        {/* LIGNE BESOIN */}
                        <tr className="bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 transition-all">
                          <td className="px-4 py-3 font-semibold sticky left-0 bg-gradient-to-r from-yellow-50 to-amber-50 z-10 border-b-2 border-yellow-200">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-yellow-700" />
                              <span className="text-yellow-900">Besoin ({comp})</span>
                            </div>
                          </td>
                          {colonnes.map((col, idx) => {
                            const cellKey = `${comp}|${col.date.getTime()}`
                            const value = grilleCharge.get(cellKey) || 0
                            const isSaving = savingCells.has(cellKey)

                            return (
                              <td
                                key={idx}
                                className={`px-2 py-2 border-b-2 border-yellow-200 relative ${
                                  col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''
                                }`}
                              >
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={value}
                                    onChange={(e) => handleChargeChange(comp, col, parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-yellow-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white font-semibold transition-all"
                                  />
                                  {isSaving && (
                                    <div className="absolute -top-1 -right-1">
                                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center font-bold text-yellow-900 bg-yellow-100 border-b-2 border-yellow-200">
                            {totalCharge}
                          </td>
                        </tr>

                        {/* LIGNE AFFECTÉ */}
                        <tr className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all">
                          <td className="px-4 py-3 font-semibold sticky left-0 bg-gradient-to-r from-green-50 to-emerald-50 z-10 border-b-2 border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-700" />
                              <span className="text-green-900">Affecté ({comp})</span>
                            </div>
                          </td>
                          {colonnes.map((col, idx) => {
                            const totalAffecte = getTotalAffecte(comp, col)
                            const besoin = grilleCharge.get(`${comp}|${col.date.getTime()}`) || 0
                            const isOver = totalAffecte > besoin
                            const isUnder = totalAffecte < besoin && besoin > 0

                            return (
                              <td
                                key={idx}
                                className={`
                                  px-3 py-3 text-center font-bold border-b-2 border-green-200 transition-all
                                  ${col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''}
                                  ${isOver ? 'bg-red-200 text-red-900 ring-2 ring-red-400' : ''}
                                  ${isUnder ? 'bg-orange-100 text-orange-900' : ''}
                                  ${!isOver && !isUnder ? 'text-green-900' : ''}
                                `}
                              >
                                {totalAffecte}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center font-bold text-green-900 bg-green-100 border-b-2 border-green-200">
                            {colonnes.reduce((sum, col) => sum + getTotalAffecte(comp, col), 0)}
                          </td>
                        </tr>

                        {/* RESSOURCES */}
                        {loadingRessources ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                            </td>
                          </tr>
                        ) : totalCharge === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-400 italic bg-gray-50/50">
                              Définissez une charge pour voir les ressources
                            </td>
                          </tr>
                        ) : ressourcesComp.length === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-500 italic">
                              Aucune ressource disponible pour cette compétence
                            </td>
                          </tr>
                        ) : (
                          ressourcesComp.map((ressource) => {
                            const competencesRessource = competencesMap.get(ressource.id) || []
                            const competenceInfo = competencesRessource.find(c => c.competence === comp)
                            const isPrincipale = competenceInfo?.type_comp === 'P'

                            return (
                              <tr key={ressource.id} className="hover:bg-blue-50/30 transition-all">
                                <td className={`px-4 py-2 sticky left-0 bg-white z-10 ${isPrincipale ? 'font-semibold' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    {isPrincipale && <span className="text-blue-600 text-lg">★</span>}
                                    <span>{ressource.nom}</span>
                                  </div>
                                </td>
                                {colonnes.map((col, idx) => {
                                  const cellKey = `${comp}|${col.date.getTime()}`
                                  const affectees = grilleAffectations.get(cellKey) || new Set<string>()
                                  const isAffecte = affectees.has(ressource.id)

                                  return (
                                    <td
                                      key={idx}
                                      className={`px-2 py-2 text-center ${
                                        col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAffecte}
                                        onChange={(e) => handleAffectationChange(comp, ressource.id, col, e.target.checked)}
                                        className="w-5 h-5 cursor-pointer accent-green-500 rounded transition-all hover:scale-110"
                                      />
                                    </td>
                                  )
                                })}
                                <td className="px-4 py-2 text-center font-medium bg-gray-50">
                                  {colonnes.reduce((sum, col) => {
                                    const cellKey = `${comp}|${col.date.getTime()}`
                                    const affectees = grilleAffectations.get(cellKey) || new Set<string>()
                                    return sum + (affectees.has(ressource.id) ? 1 : 0)
                                  }, 0)}
                                </td>
                              </tr>
                            )
                          })
                        )}

                        <tr>
                          <td colSpan={colonnes.length + 2} className="h-4 bg-gradient-to-b from-gray-100 to-transparent"></td>
                        </tr>
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LÉGENDE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Légende & Instructions</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
              <span className="text-sm text-gray-700">Besoin (charge)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 border-2 border-green-400 rounded"></div>
              <span className="text-sm text-gray-700">Affecté</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-200 border-2 border-red-500 rounded"></div>
              <span className="text-sm text-gray-700">Sur-affectation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-100 border-2 border-orange-400 rounded"></div>
              <span className="text-sm text-gray-700">Sous-affectation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-sm text-gray-700">Week-end</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-pink-50 border-2 border-pink-300 rounded"></div>
              <span className="text-sm text-gray-700">Jour férié</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-lg">★</span>
              <span className="text-sm text-gray-700">Compétence principale</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">Sauvegarde en cours</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>La <strong>charge</strong> représente le nombre de ressources nécessaires</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Les <strong>affectations</strong> se font via les cases à cocher</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Les modifications sont <strong>sauvegardées automatiquement</strong> après 500ms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Utilisez les filtres pour afficher uniquement les compétences qui vous intéressent</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}