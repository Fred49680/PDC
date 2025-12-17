'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import { businessDaysBetween, getDatesBetween, isBusinessDay, formatSemaineISO } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import type { Precision } from '@/types/charge'
import { format, startOfWeek, addDays, addWeeks, startOfMonth, addMonths, endOfMonth, isWeekend, subMonths, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2, XCircle, Info, Users, Target, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface GrilleChargeAffectationProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  onDateChange?: (dateDebut: Date, dateFin: Date) => void
}

// Liste des compétences (à adapter selon vos besoins)
const COMPETENCES_LIST = [
  'ADMIN',
  'AUTO',
  'BE_IES',
  'ENCADREMENT',
  'ESSAIS',
  'FIBRE OPTIQUE',
  'HSE_CRP',
  'IEG',
  'IES',
  'INSTRUM',
  'MAGASIN',
  'PACK',
  'PREPA',
  'REDACTION_RA',
  'RELEVE',
  'ROB',
  'SERVITUDE',
  'SS4',
  'TRACAGE',
]

// Types pour les états de disponibilité
type DisponibiliteStatus = 
  | 'disponible'
  | 'absente'
  | 'formation'
  | 'conflit'
  | 'indisponible_transfert'
  | 'date_fin_depassee'

interface DisponibiliteInfo {
  status: DisponibiliteStatus
  message?: string
}

export function GrilleChargeAffectation({
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision,
  onDateChange,
}: GrilleChargeAffectationProps) {
  // État pour les compétences filtrées (toggles) - Par défaut, toutes désactivées
  const [competencesFiltrees, setCompetencesFiltrees] = useState<Set<string>>(
    new Set()
  )
  const { periodes, loading: loadingCharge, savePeriode, deletePeriode } = useCharge({
    affaireId,
    site,
  })

  // *** NOUVEAU : Ajuster automatiquement les dates pour couvrir les périodes existantes ***
  // Utiliser une ref pour éviter les boucles infinies
  const hasAdjustedDates = useRef(false)
  const lastPeriodesHash = useRef<string>('')
  
  useEffect(() => {
    // Ne s'exécuter que si les périodes ont changé (éviter les boucles)
    if (periodes.length === 0 || !onDateChange) return

    // Créer un hash des périodes pour détecter les changements réels
    const periodesHash = periodes.map(p => `${p.id || 'new'}-${p.date_debut}-${p.date_fin}`).join('|')
    if (periodesHash === lastPeriodesHash.current && hasAdjustedDates.current) {
      return // Déjà ajusté pour ces périodes
    }
    lastPeriodesHash.current = periodesHash

    // Trouver la date min et max des périodes
    let minDate: Date | null = null
    let maxDate: Date | null = null

    periodes.forEach((periode) => {
      const pDeb = periode.date_debut instanceof Date ? periode.date_debut : new Date(periode.date_debut)
      const pFin = periode.date_fin instanceof Date ? periode.date_fin : new Date(periode.date_fin)

      if (!minDate || pDeb < minDate) minDate = pDeb
      if (!maxDate || pFin > maxDate) maxDate = pFin
    })

    // Vérifier que minDate et maxDate sont définis avant de les utiliser
    if (minDate === null || maxDate === null) return

    // Utiliser des variables locales avec assertion de type pour garantir le type narrowing
    const minDateValue: Date = minDate as Date
    const maxDateValue: Date = maxDate as Date

    // Vérifier si les dates actuelles ne couvrent pas les périodes
    // Utiliser les props directement (pas besoin de dépendances)
    const currentStart = dateDebut
    const currentEnd = dateFin

    // Si les périodes sont en dehors de la plage actuelle, ajuster
    if (minDateValue < currentStart || maxDateValue > currentEnd) {
      // Ajuster pour couvrir toutes les périodes avec une marge
      let newDateDebut: Date
      let newDateFin: Date

      if (precision === 'JOUR') {
        newDateDebut = minDateValue
        newDateFin = maxDateValue
      } else if (precision === 'SEMAINE') {
        newDateDebut = startOfWeek(minDateValue, { weekStartsOn: 1 })
        const weekEnd = startOfWeek(maxDateValue, { weekStartsOn: 1 })
        newDateFin = addDays(weekEnd, 6)
      } else {
        // MOIS
        newDateDebut = startOfMonth(minDateValue)
        newDateFin = endOfMonth(maxDateValue)
      }

      // Ajuster seulement si nécessaire (éviter les boucles infinies)
      if (
        newDateDebut.getTime() !== currentStart.getTime() ||
        newDateFin.getTime() !== currentEnd.getTime()
      ) {
        console.log(`[GrilleChargeAffectation] Ajustement automatique des dates pour couvrir les périodes: ${format(newDateDebut, 'dd/MM/yyyy')} -> ${format(newDateFin, 'dd/MM/yyyy')}`)
        hasAdjustedDates.current = true // Marquer comme ajusté pour éviter les boucles
        onDateChange(newDateDebut, newDateFin)
      }
    } else {
      // Les dates couvrent déjà les périodes, marquer comme ajusté quand même
      hasAdjustedDates.current = true
    }
  }, [periodes, precision, onDateChange]) // Retirer dateDebut/dateFin des dépendances pour éviter les boucles
  
  // Réinitialiser le flag quand l'affaire ou le site change
  useEffect(() => {
    hasAdjustedDates.current = false
    lastPeriodesHash.current = ''
  }, [affaireId, site])

  const { affectations, ressources, loading: loadingAffectations, saveAffectation, deleteAffectation } = useAffectations({
    affaireId,
    site,
  })

  const { ressources: allRessources, competences: competencesMap } = useRessources({ site, actif: true })
  const { absences } = useAbsences({ site })

  const [grilleCharge, setGrilleCharge] = useState<Map<string, number>>(new Map())
  const [grilleAffectations, setGrilleAffectations] = useState<Map<string, Set<string>>>(new Map())
  const [absencesMap, setAbsencesMap] = useState<Map<string, { type: string; isFormation: boolean }>>(new Map())
  const [conflitsMap, setConflitsMap] = useState<Map<string, string>>(new Map())
  const [transfertsMap, setTransfertsMap] = useState<Map<string, DisponibiliteInfo>>(new Map())
  const [dateFinRessourcesMap, setDateFinRessourcesMap] = useState<Map<string, Date>>(new Map())
  const [saving, setSaving] = useState(false)
  // État pour les modifications en cours (pour éviter que le rechargement écrase les valeurs optimistes)
  const [pendingChargeChanges, setPendingChargeChanges] = useState<Map<string, number>>(new Map())
  // Ref pour accéder à la valeur actuelle de pendingChargeChanges sans déclencher de re-render
  const pendingChargeChangesRef = useRef<Map<string, number>>(new Map())
  
  // Synchroniser la ref avec l'état
  useEffect(() => {
    pendingChargeChangesRef.current = new Map(pendingChargeChanges)
  }, [pendingChargeChanges])
  
  // État local pour chaque input (pour éviter que le re-render réinitialise la valeur)
  const [localInputValues, setLocalInputValues] = useState<Map<string, number>>(new Map())

  // Générer les colonnes selon la précision (avec fériés et semaine ISO)
  const colonnes = useMemo(() => {
    const cols: { 
      date: Date
      label: string
      weekStart?: Date
      weekEnd?: Date
      isWeekend?: boolean
      isHoliday?: boolean
      semaineISO?: string
    }[] = []

    switch (precision) {
      case 'JOUR':
        const dates = getDatesBetween(dateDebut, dateFin)
        dates.forEach((date) => {
          const semaineISO = formatSemaineISO(date)
          cols.push({
            date,
            label: format(date, 'dd/MM', { locale: fr }),
            isWeekend: isWeekend(date),
            isHoliday: isFrenchHoliday(date),
            semaineISO,
          })
        })
        break

      case 'SEMAINE':
        let currentWeek = startOfWeek(dateDebut, { weekStartsOn: 1 })
        while (currentWeek <= dateFin) {
          const weekEnd = addDays(currentWeek, 6)
          const semaineISO = formatSemaineISO(currentWeek)
          cols.push({
            date: currentWeek,
            label: `${format(currentWeek, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
            weekStart: currentWeek,
            weekEnd,
            semaineISO,
          })
          currentWeek = addWeeks(currentWeek, 1)
        }
        break

      case 'MOIS':
        let currentMonth = startOfMonth(dateDebut)
        while (currentMonth <= dateFin) {
          const monthEnd = endOfMonth(currentMonth)
          const semaineISO = formatSemaineISO(currentMonth)
          cols.push({
            date: currentMonth,
            label: format(currentMonth, 'MMMM yyyy', { locale: fr }),
            weekStart: currentMonth,
            weekEnd: monthEnd,
            semaineISO,
          })
          currentMonth = addMonths(currentMonth, 1)
        }
        break
    }

    return cols
  }, [dateDebut, dateFin, precision])

  // Construire la grille de charge depuis les périodes
  useEffect(() => {
    const newGrille = new Map<string, number>()

    // Debug : Afficher les dates des colonnes et des périodes
    if (periodes.length > 0 && colonnes.length > 0) {
      console.log(`[GrilleChargeAffectation] DEBUG - ${periodes.length} période(s), ${colonnes.length} colonne(s)`)
      console.log(`[GrilleChargeAffectation] DEBUG - Plage colonnes: ${format(colonnes[0].date, 'dd/MM/yyyy')} -> ${format(colonnes[colonnes.length - 1].date, 'dd/MM/yyyy')}`)
      periodes.forEach((p, idx) => {
        const pDeb = p.date_debut instanceof Date ? p.date_debut : new Date(p.date_debut)
        const pFin = p.date_fin instanceof Date ? p.date_fin : new Date(p.date_fin)
        console.log(`[GrilleChargeAffectation] DEBUG - Période ${idx + 1}: ${p.competence} du ${format(pDeb, 'dd/MM/yyyy')} au ${format(pFin, 'dd/MM/yyyy')}`)
      })
    }

    periodes.forEach((periode) => {
      // Normaliser les dates (s'assurer qu'elles sont des objets Date valides)
      const periodeDebut = periode.date_debut instanceof Date 
        ? periode.date_debut 
        : new Date(periode.date_debut)
      const periodeFin = periode.date_fin instanceof Date 
        ? periode.date_fin 
        : new Date(periode.date_fin)
      
      let matchCount = 0
      colonnes.forEach((col) => {
        const colDate = col.weekStart || col.date
        const colEnd = col.weekEnd || col.date

        // Vérifier si la période chevauche avec la colonne
        // La période chevauche si : periodeDebut <= colEnd ET periodeFin >= colDate
        if (
          periodeDebut <= colEnd &&
          periodeFin >= colDate
        ) {
          const cellKey = `${periode.competence}|${col.date.getTime()}`
          // Si plusieurs périodes correspondent à la même cellule, prendre la dernière (ou la somme selon la logique métier)
          // Pour l'instant, on écrase (la consolidation devrait être faite côté serveur)
          newGrille.set(cellKey, periode.nb_ressources)
          matchCount++
        }
      })
      
      // Debug : Afficher si une période a trouvé des correspondances
      if (matchCount === 0 && periodes.length > 0) {
        console.warn(`[GrilleChargeAffectation] ATTENTION - Période ${periode.competence} (${format(periodeDebut, 'dd/MM/yyyy')} - ${format(periodeFin, 'dd/MM/yyyy')}) n'a trouvé aucune correspondance avec les colonnes`)
      }
    })
    
    // Debug : Afficher le nombre de périodes chargées et le nombre de cellules créées
    if (periodes.length > 0) {
      console.log(`[GrilleChargeAffectation] ${periodes.length} période(s) chargée(s) -> ${newGrille.size} cellule(s) dans la grille`)
    }

    // *** FUSION : Préserver les modifications en cours (pendingChargeChanges) ***
    // Cela évite que le rechargement écrase les valeurs optimistes
    // Utiliser la ref pour éviter les dépendances qui créent des boucles
    pendingChargeChangesRef.current.forEach((value, key) => {
      newGrille.set(key, value)
    })

    setGrilleCharge(newGrille)
    
    // *** NETTOYAGE : Nettoyer pendingChargeChanges et localInputValues qui correspondent aux données rechargées ***
    // Cela évite les incohérences et permet de libérer la mémoire
    // IMPORTANT : Ne nettoyer que si la valeur dans newGrille correspond exactement à pendingValue
    // Cela garantit que les données sont bien chargées depuis la BDD avant de nettoyer
    setPendingChargeChanges((prev) => {
      if (prev.size === 0) return prev // Pas de nettoyage si vide
      
      const newPending = new Map(prev)
      let cleanedCount = 0
      newPending.forEach((pendingValue, key) => {
        const gridValue = newGrille.get(key) || 0
        // Si la valeur pending correspond EXACTEMENT à la valeur dans la grille (chargée depuis la BDD), on peut la nettoyer
        if (pendingValue === gridValue && gridValue > 0) {
          newPending.delete(key)
          cleanedCount++
        }
      })
      
      if (cleanedCount > 0) {
        console.log(`[GrilleChargeAffectation] Nettoyage de ${cleanedCount} entrée(s) de pendingChargeChanges (valeurs confirmées dans la BDD)`)
      }
      
      return newPending
    })
    
    // *** NETTOYAGE localInputValues : Ne nettoyer QUE si la valeur correspond exactement ET qu'elle n'est pas en cours de modification ***
    // IMPORTANT : Ne pas nettoyer si pendingChargeChanges contient encore cette clé (modification en cours)
    // Utiliser une fonction de callback pour accéder à la valeur actuelle de pendingChargeChanges
    setLocalInputValues((prev) => {
      if (prev.size === 0) return prev // Pas de nettoyage si vide
      
      const newLocal = new Map(prev)
      let cleanedCount = 0
      
      // Récupérer la valeur actuelle de pendingChargeChanges via la ref (évite les dépendances)
      const currentPending = new Map(pendingChargeChangesRef.current)
      
      newLocal.forEach((localValue, key) => {
        // Ne pas nettoyer si la modification est encore en cours (dans pendingChargeChanges)
        if (currentPending.has(key)) {
          // La modification est en cours, garder la valeur locale
          return
        }
        
        const gridValue = newGrille.get(key) || 0
        // Si la valeur locale correspond EXACTEMENT à la valeur dans la grille (chargée depuis la BDD), on peut la nettoyer
        if (localValue === gridValue && gridValue > 0) {
          newLocal.delete(key)
          cleanedCount++
        }
      })
      
      if (cleanedCount > 0) {
        console.log(`[GrilleChargeAffectation] Nettoyage de ${cleanedCount} entrée(s) de localInputValues (valeurs confirmées dans la BDD)`)
      }
      
      return newLocal
    })
  }, [periodes, colonnes]) // Retirer pendingChargeChanges des dépendances pour éviter les boucles infinies (utiliser la ref à la place)

  // Construire la grille d'affectations
  useEffect(() => {
    const newGrille = new Map<string, Set<string>>()

    affectations.forEach((affectation) => {
      colonnes.forEach((col) => {
        const colDate = col.weekStart || col.date
        const colEnd = col.weekEnd || col.date

        if (
          new Date(affectation.date_debut) <= colEnd &&
          new Date(affectation.date_fin) >= colDate
        ) {
          const cellKey = `${affectation.competence}|${col.date.getTime()}`
          if (!newGrille.has(cellKey)) {
            newGrille.set(cellKey, new Set())
          }
          newGrille.get(cellKey)!.add(affectation.ressource_id)
        }
      })
    })

    setGrilleAffectations(newGrille)
  }, [affectations, colonnes])

  // Construire la map des absences (distinguer formations et autres absences)
  useEffect(() => {
    const newAbsences = new Map<string, { type: string; isFormation: boolean }>()

    absences.forEach((absence) => {
      const dates = getDatesBetween(
        new Date(absence.date_debut),
        new Date(absence.date_fin)
      )
      const typeAbs = (absence.type || '').toUpperCase()
      const isFormation = typeAbs.includes('FORMATION') || typeAbs.includes('TRAINING')
      
      dates.forEach((date) => {
        const key = `${absence.ressource_id}|${date.getTime()}`
        newAbsences.set(key, { type: absence.type || '', isFormation })
      })
    })

    setAbsencesMap(newAbsences)
  }, [absences])

  // Charger les dates de fin des ressources
  useEffect(() => {
    const newDateFinMap = new Map<string, Date>()
    
    allRessources.forEach((ressource) => {
      if (ressource.date_fin_contrat) {
        newDateFinMap.set(ressource.id, ressource.date_fin_contrat)
      }
    })
    
    setDateFinRessourcesMap(newDateFinMap)
  }, [allRessources])

  // Construire la map des conflits (ressource affectée sur une autre affaire)
  useEffect(() => {
    const loadConflits = async () => {
      try {
        const supabase = createClient()
        
        // Récupérer l'ID de l'affaire
        const { data: affaireData } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireId)
          .eq('site', site)
          .single()

        if (!affaireData) return

        const newConflits = new Map<string, string>()

        // Pour chaque ressource, vérifier si elle est affectée sur d'autres affaires
        for (const ressource of allRessources) {
          const { data: autresAffectations } = await supabase
            .from('affectations')
            .select('affaire_id, date_debut, date_fin, competence')
            .eq('ressource_id', ressource.id)
            .neq('affaire_id', affaireData.id)

          if (autresAffectations) {
            autresAffectations.forEach((autreAff) => {
              const dates = getDatesBetween(
                new Date(autreAff.date_debut),
                new Date(autreAff.date_fin)
              )
              dates.forEach((date) => {
                const key = `${ressource.id}|${date.getTime()}`
                if (!newConflits.has(key)) {
                  newConflits.set(key, `Autre affaire - ${autreAff.competence}`)
                }
              })
            })
          }
        }

        setConflitsMap(newConflits)
      } catch (err) {
        console.error('[GrilleChargeAffectation] Erreur chargement conflits:', err)
      }
    }

    if (affaireId && site && allRessources.length > 0) {
      loadConflits()
    }
  }, [affectations, affaireId, site, allRessources])

  // Charger les transferts pour vérifier les indisponibilités (optionnel - table peut ne pas exister)
  useEffect(() => {
    const loadTransferts = async () => {
      try {
        const supabase = createClient()
        const newTransferts = new Map<string, DisponibiliteInfo>()

        // Vérifier si la table existe (gestion d'erreur silencieuse)
        const { data: transferts, error } = await supabase
          .from('transferts')
          .select('*')
          .eq('statut', 'Appliqué')
          .or(`site_origine.eq.${site},site_destination.eq.${site}`)

        // Si la table n'existe pas, ignorer silencieusement
        if (error && error.code === 'PGRST116') {
          // Table n'existe pas, on continue sans transferts
          return
        }

        if (error) {
          console.warn('[GrilleChargeAffectation] Erreur chargement transferts:', error)
          return
        }

        if (transferts) {
          transferts.forEach((transfert: any) => {
            const dates = getDatesBetween(
              new Date(transfert.date_debut),
              new Date(transfert.date_fin)
            )
            
            dates.forEach((date) => {
              // Si site d'origine : indisponible pendant le transfert
              if (transfert.site_origine === site) {
                const key = `${transfert.ressource_id}|${date.getTime()}`
                newTransferts.set(key, {
                  status: 'indisponible_transfert',
                  message: `Transfert vers ${transfert.site_destination}`
                })
              }
              // Si site de destination : indisponible avant date_debut et après date_fin
              else if (transfert.site_destination === site) {
                if (date < new Date(transfert.date_debut)) {
                  const key = `${transfert.ressource_id}|${date.getTime()}`
                  newTransferts.set(key, {
                    status: 'indisponible_transfert',
                    message: `Transfert en attente (à partir du ${format(new Date(transfert.date_debut), 'dd/MM/yyyy')})`
                  })
                } else if (date > new Date(transfert.date_fin)) {
                  const key = `${transfert.ressource_id}|${date.getTime()}`
                  newTransferts.set(key, {
                    status: 'indisponible_transfert',
                    message: `Transfert terminé (jusqu'au ${format(new Date(transfert.date_fin), 'dd/MM/yyyy')})`
                  })
                }
              }
            })
          })
        }

        setTransfertsMap(newTransferts)
      } catch (err) {
        // Erreur silencieuse si la table n'existe pas
        console.warn('[GrilleChargeAffectation] Table transferts non disponible:', err)
      }
    }

    if (site) {
      loadTransferts()
    }
  }, [site])

  // Vérifier la disponibilité d'une ressource pour une date
  const checkDisponibilite = useCallback((
    ressourceId: string,
    col: typeof colonnes[0]
  ): DisponibiliteInfo => {
    const date = col.weekStart || col.date
    const key = `${ressourceId}|${date.getTime()}`

    // 1. Vérifier formation (priorité 1 - BLOQUE)
    const absenceInfo = absencesMap.get(key)
    if (absenceInfo?.isFormation) {
      return {
        status: 'formation',
        message: `Formation : ${absenceInfo.type}`
      }
    }

    // 2. Vérifier absence (priorité 2 - BLOQUE)
    if (absenceInfo && !absenceInfo.isFormation) {
      return {
        status: 'absente',
        message: `Absent(e) : ${absenceInfo.type}`
      }
    }

    // 3. Vérifier date de fin de contrat
    const dateFin = dateFinRessourcesMap.get(ressourceId)
    if (dateFin && date > dateFin) {
      return {
        status: 'date_fin_depassee',
        message: `Contrat terminé le ${format(dateFin, 'dd/MM/yyyy')}`
      }
    }

    // 4. Vérifier transfert
    const transfertInfo = transfertsMap.get(key)
    if (transfertInfo) {
      return transfertInfo
    }

    // 5. Vérifier conflit (ressource affectée ailleurs)
    const conflitInfo = conflitsMap.get(key)
    if (conflitInfo) {
      return {
        status: 'conflit',
        message: conflitInfo
      }
    }

    return { status: 'disponible' }
  }, [absencesMap, dateFinRessourcesMap, transfertsMap, conflitsMap])

  // Gérer le changement de charge
  const handleChargeChange = useCallback(
    async (competence: string, col: typeof colonnes[0], value: number) => {
      if (saving) return
      
      try {
        setSaving(true)
        const dateDebutPeriode = col.weekStart || col.date
        const dateFinPeriode = col.weekEnd || col.date

        // Convertir en nombre entier (arrondir vers le bas)
        const nbRessources = Math.max(0, Math.floor(value))

        // *** MISE À JOUR OPTIMISTE : Mettre à jour l'état local immédiatement ***
        const cellKey = `${competence}|${col.date.getTime()}`
        
        // Mettre à jour l'état des modifications en cours (persiste pendant le rechargement)
        setPendingChargeChanges((prev) => {
          const newPending = new Map(prev)
          if (nbRessources === 0) {
            newPending.delete(cellKey)
          } else {
            newPending.set(cellKey, nbRessources)
          }
          return newPending
        })

        // Mettre à jour aussi grilleCharge immédiatement pour l'affichage
        setGrilleCharge((prev) => {
          const newGrille = new Map(prev)
          if (nbRessources === 0) {
            newGrille.delete(cellKey)
          } else {
            newGrille.set(cellKey, nbRessources)
          }
          return newGrille
        })

        if (nbRessources === 0) {
          // Supprimer la période si elle existe
          // Chercher une période qui chevauche avec cette colonne
          const periodeExistante = periodes.find(
            (p) => {
              if (p.competence !== competence) return false
              const pDebut = new Date(p.date_debut)
              const pFin = new Date(p.date_fin)
              // Vérifier chevauchement : la période chevauche si pDebut <= dateFinPeriode ET pFin >= dateDebutPeriode
              return pDebut <= dateFinPeriode && pFin >= dateDebutPeriode
            }
          )
          if (periodeExistante) {
            await deletePeriode(periodeExistante.id)
            // NE PAS retirer de pendingChargeChanges immédiatement
            // Le useEffect va nettoyer automatiquement quand les nouvelles periodes seront chargées
          }
        } else {
          await savePeriode({
            competence,
            date_debut: dateDebutPeriode,
            date_fin: dateFinPeriode,
            nb_ressources: nbRessources,
          })
          // NE PAS retirer de pendingChargeChanges immédiatement
          // Le useEffect qui construit grilleCharge va fusionner les nouvelles periodes
          // et pendingChargeChanges sera nettoyé automatiquement quand les données correspondront
        }
      } catch (err) {
        console.error('[GrilleChargeAffectation] Erreur savePeriode:', err)
        alert('Erreur lors de la sauvegarde de la charge')
        // En cas d'erreur, retirer de pendingChargeChanges pour restaurer l'état depuis periodes
        const cellKey = `${competence}|${col.date.getTime()}`
        setPendingChargeChanges((prev) => {
          const newPending = new Map(prev)
          newPending.delete(cellKey)
          return newPending
        })
      } finally {
        setSaving(false)
      }
    },
    [savePeriode, deletePeriode, periodes, colonnes, saving]
  )

  // Gérer le changement d'affectation avec validation complète
  const handleAffectationChange = useCallback(
    async (
      competence: string,
      ressourceId: string,
      col: typeof colonnes[0],
      checked: boolean
    ) => {
      if (saving) return
      
      try {
        setSaving(true)
        const dateDebutPeriode = col.weekStart || col.date
        const dateFinPeriode = col.weekEnd || col.date

        // Vérifier si la ressource a la compétence
        const ressource = allRessources.find((r) => r.id === ressourceId)
        if (!ressource) {
          alert('Ressource introuvable')
          return
        }

        const competencesRessource = competencesMap.get(ressourceId) || []
        const hasCompetence = competencesRessource.some(
          (c) => c.competence === competence
        )

        if (!hasCompetence) {
          alert(
            `❌ La ressource ${ressource.nom} n'a pas la compétence ${competence}`
          )
          return
        }

        // Si on coche, vérifier la disponibilité
        if (checked) {
          // Vérifier toutes les dates de la période
          const dates = getDatesBetween(dateDebutPeriode, dateFinPeriode)
          const joursOuvres = dates.filter((d) => isBusinessDay(d))
          
          for (const date of joursOuvres) {
            // Créer une colonne temporaire pour cette date
            const tempCol = { ...col, date, weekStart: date, weekEnd: date }
            const disponibilite = checkDisponibilite(ressourceId, tempCol)
            
            if (disponibilite.status !== 'disponible') {
              alert(
                `❌ ${ressource.nom} n'est pas disponible :\n\n${disponibilite.message || disponibilite.status}`
              )
              return
            }
          }

          // Calculer les jours ouvrés
          let nbJoursOuvres = 0
          
          if (precision === 'JOUR') {
            if (isBusinessDay(col.date)) {
              nbJoursOuvres = 1
            }
          } else {
            nbJoursOuvres = businessDaysBetween(dateDebutPeriode, dateFinPeriode)
          }
          
          await saveAffectation({
            ressource_id: ressourceId,
            competence,
            date_debut: dateDebutPeriode,
            date_fin: dateFinPeriode,
            charge: nbJoursOuvres,
          })
        } else {
          // Supprimer l'affectation
          const affectationsAvecRessource = affectations.filter(
            (a) =>
              a.ressource_id === ressourceId &&
              a.competence === competence &&
              new Date(a.date_debut) <= dateFinPeriode &&
              new Date(a.date_fin) >= dateDebutPeriode
          )
          
          for (const affectation of affectationsAvecRessource) {
            await deleteAffectation(affectation.id)
          }
        }
      } catch (err) {
        console.error('[GrilleChargeAffectation] Erreur saveAffectation:', err)
        alert('Erreur lors de la sauvegarde de l\'affectation')
      } finally {
        setSaving(false)
      }
    },
    [
      saveAffectation,
      deleteAffectation,
      affectations,
      allRessources,
      competencesMap,
      colonnes,
      precision,
      checkDisponibilite,
      saving,
    ]
  )

  // Calculer le total affecté pour une compétence/date
  const getTotalAffecte = useCallback(
    (competence: string, col: typeof colonnes[0]) => {
      const cellKey = `${competence}|${col.date.getTime()}`
      const affectees = grilleAffectations.get(cellKey) || new Set()
      return affectees.size
    },
    [grilleAffectations]
  )

  // Obtenir les ressources disponibles pour une compétence
  const getRessourcesForCompetence = useCallback(
    (competence: string) => {
      return allRessources.filter((r) => {
        const competencesRessource = competencesMap.get(r.id) || []
        return competencesRessource.some((c) => c.competence === competence)
      })
    },
    [allRessources, competencesMap]
  )

  // Navigation temporelle
  const handlePreviousPeriod = useCallback(() => {
    let newDateDebut: Date
    let newDateFin: Date

    if (precision === 'JOUR') {
      // Navigation par semaine en mode jour
      newDateDebut = subWeeks(dateDebut, 1)
      newDateFin = subWeeks(dateFin, 1)
    } else if (precision === 'SEMAINE') {
      newDateDebut = subWeeks(dateDebut, 4)
      newDateFin = subWeeks(dateFin, 4)
    } else {
      // MOIS
      newDateDebut = subMonths(dateDebut, 1)
      newDateFin = endOfMonth(newDateDebut)
    }

    if (onDateChange) {
      onDateChange(newDateDebut, newDateFin)
    }
  }, [dateDebut, dateFin, precision, onDateChange])

  const handleNextPeriod = useCallback(() => {
    let newDateDebut: Date
    let newDateFin: Date

    if (precision === 'JOUR') {
      // Navigation par semaine en mode jour
      newDateDebut = addWeeks(dateDebut, 1)
      newDateFin = addWeeks(dateFin, 1)
    } else if (precision === 'SEMAINE') {
      newDateDebut = addWeeks(dateDebut, 4)
      newDateFin = addWeeks(dateFin, 4)
    } else {
      // MOIS
      newDateDebut = addMonths(dateDebut, 1)
      newDateFin = endOfMonth(newDateDebut)
    }

    if (onDateChange) {
      onDateChange(newDateDebut, newDateFin)
    }
  }, [dateDebut, dateFin, precision, onDateChange])

  // Toggle compétence
  const toggleCompetence = useCallback((competence: string) => {
    setCompetencesFiltrees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(competence)) {
        newSet.delete(competence)
      } else {
        newSet.add(competence)
      }
      return newSet
    })
  }, [])

  // Compétences avec charge > 0
  const competencesAvecCharge = useMemo(() => {
    return COMPETENCES_LIST.filter((comp) => {
      const totalCharge = colonnes.reduce((sum, col) => {
        const cellKey = `${comp}|${col.date.getTime()}`
        return sum + (grilleCharge.get(cellKey) || 0)
      }, 0)
      return totalCharge > 0
    })
  }, [colonnes, grilleCharge])

  // *** NOUVEAU : Activer automatiquement les toggles des compétences qui ont une charge dans la BDD ***
  // Utiliser un ref pour éviter de réactiver les toggles à chaque rechargement (seulement au chargement initial)
  const togglesInitialises = useRef(false)
  
  useEffect(() => {
    // Ne s'exécuter qu'une seule fois au chargement initial (quand periodes est chargé pour la première fois)
    // Les toggles ne doivent pas être réactivés lors de la saisie, seulement au chargement initial depuis la BDD
    if (togglesInitialises.current || periodes.length === 0) return

    // Récupérer les compétences uniques qui ont une charge dans periodes
    const competencesAvecChargeBDD = new Set<string>()
    periodes.forEach((periode) => {
      if (periode.nb_ressources > 0) {
        competencesAvecChargeBDD.add(periode.competence)
      }
    })

    // Activer les toggles pour ces compétences uniquement au chargement initial
    if (competencesAvecChargeBDD.size > 0) {
      setCompetencesFiltrees(new Set(competencesAvecChargeBDD))
      togglesInitialises.current = true
    }
  }, [periodes]) // Se déclenche uniquement quand periodes change (chargement initial depuis la BDD)
  
  // Réinitialiser le flag si l'affaire ou le site change (pour permettre la réinitialisation des toggles)
  useEffect(() => {
    togglesInitialises.current = false
  }, [affaireId, site])

  if (loadingCharge || loadingAffectations) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Légende */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Légende</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span className="text-gray-700">Besoin (charge)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
            <span className="text-gray-700">Affecté</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border-2 border-gray-500 rounded"></div>
            <span className="text-gray-700">Absence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-200 border-2 border-orange-500 rounded"></div>
            <span className="text-gray-700">Conflit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-200 border-2 border-purple-500 rounded"></div>
            <span className="text-gray-700">Formation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 border-2 border-red-500 rounded"></div>
            <span className="text-gray-700">Sur-affectation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-200 border-2 border-pink-500 rounded"></div>
            <span className="text-gray-700">Férié</span>
          </div>
        </div>

        {/* Toggles compétences - Toujours visible */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-800 text-sm">Filtrer les compétences</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Tout sélectionner
                  setCompetencesFiltrees(new Set(COMPETENCES_LIST))
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Tout sélectionner
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => {
                  // Tout désélectionner
                  setCompetencesFiltrees(new Set())
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPETENCES_LIST.map((comp) => {
              const hasCharge = competencesAvecCharge.includes(comp)
              const isActive = competencesFiltrees.has(comp)
              return (
                <button
                  key={comp}
                  onClick={() => toggleCompetence(comp)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                      : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  } ${hasCharge ? 'ring-2 ring-yellow-400' : ''}`}
                  title={hasCharge ? 'Cette compétence a une charge affectée' : 'Cliquez pour afficher/masquer cette compétence'}
                >
                  {comp}
                  {hasCharge && (
                    <span className="ml-1.5 text-xs font-bold">●</span>
                  )}
                </button>
              )
            })}
          </div>
          {competencesFiltrees.size === 0 && (
            <div className="mt-2 text-xs text-amber-600 italic">
              ⚠️ Aucune compétence sélectionnée - Sélectionnez au moins une compétence pour afficher la grille
            </div>
          )}
        </div>
      </div>

      {/* Navigation temporelle */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
        <button
          onClick={handlePreviousPeriod}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          title={`Précédent (${precision === 'JOUR' ? 'semaine' : precision === 'SEMAINE' ? '4 semaines' : 'mois'})`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden md:inline">Précédent</span>
        </button>
        
        <div className="text-center">
          <div className="font-semibold text-gray-800">
            {precision === 'JOUR' && (
              <span>
                {format(dateDebut, 'dd/MM/yyyy', { locale: fr })} - {format(dateFin, 'dd/MM/yyyy', { locale: fr })}
              </span>
            )}
            {precision === 'SEMAINE' && (
              <span>
                Semaines {formatSemaineISO(dateDebut)} à {formatSemaineISO(dateFin)}
              </span>
            )}
            {precision === 'MOIS' && (
              <span>
                {format(dateDebut, 'MMMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
          {precision === 'JOUR' && (
            <div className="text-xs text-gray-500 mt-1">
              Semaine ISO : {formatSemaineISO(dateDebut)}
            </div>
          )}
        </div>

        <button
          onClick={handleNextPeriod}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          title={`Suivant (${precision === 'JOUR' ? 'semaine' : precision === 'SEMAINE' ? '4 semaines' : 'mois'})`}
        >
          <span className="hidden md:inline">Suivant</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grille */}
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-lg">
        <table className="min-w-full border-collapse bg-white">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0 z-20">
            <tr>
              <th className="border border-gray-300 p-3 text-white font-bold sticky left-0 z-30 bg-gradient-to-r from-blue-600 to-indigo-600 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Compétence / Ressource</span>
                </div>
              </th>
              {colonnes.map((col, idx) => (
                <th
                  key={idx}
                  className={`border border-gray-300 p-2 text-white font-semibold text-center min-w-[100px] ${
                    col.isWeekend ? 'bg-blue-500' : col.isHoliday ? 'bg-pink-500' : ''
                  }`}
                >
                  <div className="text-xs font-bold">{col.label}</div>
                  {col.semaineISO && (
                    <div className="text-xs opacity-90 mt-1 font-mono">
                      {col.semaineISO}
                    </div>
                  )}
                  {col.isWeekend && (
                    <div className="text-xs opacity-75 mt-0.5">WE</div>
                  )}
                  {col.isHoliday && !col.isWeekend && (
                    <div className="text-xs opacity-75 mt-0.5">Férié</div>
                  )}
                </th>
              ))}
              <th className="border border-gray-300 p-3 text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {competencesFiltrees.size === 0 ? (
              <tr>
                <td colSpan={colonnes.length + 2} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Filter className="w-12 h-12 text-gray-400" />
                    <p className="text-lg font-semibold text-gray-600">
                      Aucune compétence sélectionnée
                    </p>
                    <p className="text-sm text-gray-500">
                      Utilisez les toggles ci-dessus pour sélectionner les compétences à afficher
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              COMPETENCES_LIST.filter((comp) => competencesFiltrees.has(comp)).map((comp) => {
              const ressourcesComp = getRessourcesForCompetence(comp)
              const totalCharge = colonnes.reduce((sum, col) => {
                const cellKey = `${comp}|${col.date.getTime()}`
                return sum + (grilleCharge.get(cellKey) || 0)
              }, 0)

              // Afficher les ressources seulement si charge > 0
              const hasCharge = totalCharge > 0

              return (
                <React.Fragment key={comp}>
                  {/* Ligne Besoin */}
                  <tr className="bg-yellow-50 hover:bg-yellow-100 transition-colors">
                    <td className="border border-gray-300 p-3 font-semibold italic sticky left-0 z-10 bg-yellow-50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-yellow-700" />
                        <span className="text-yellow-900">Besoin ({comp})</span>
                      </div>
                    </td>
                    {colonnes.map((col, idx) => {
                      const cellKey = `${comp}|${col.date.getTime()}`
                      // Utiliser la valeur locale si elle existe, sinon la valeur de la grille
                      const localValue = localInputValues.get(cellKey)
                      const gridValue = grilleCharge.get(cellKey) || 0
                      const value = localValue !== undefined ? localValue : gridValue

                      return (
                        <td
                          key={idx}
                          className={`border border-gray-300 p-1 ${
                            col.isWeekend ? 'bg-blue-50' : col.isHoliday ? 'bg-pink-50' : ''
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={value}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0
                              // Mettre à jour la valeur locale immédiatement (pour l'affichage)
                              setLocalInputValues((prev) => {
                                const newMap = new Map(prev)
                                newMap.set(cellKey, newValue)
                                return newMap
                              })
                              // Sauvegarder dans Supabase
                              handleChargeChange(comp, col, newValue)
                            }}
                            onBlur={(e) => {
                              // S'assurer que la valeur est sauvegardée même si l'utilisateur clique ailleurs
                              const newValue = parseInt(e.target.value) || 0
                              const currentValue = grilleCharge.get(cellKey) || 0
                              if (newValue !== currentValue) {
                                handleChargeChange(comp, col, newValue)
                              }
                              // Nettoyer la valeur locale après le blur (la grille sera à jour)
                              setLocalInputValues((prev) => {
                                const newMap = new Map(prev)
                                newMap.delete(cellKey)
                                return newMap
                              })
                            }}
                            className="w-full text-center border-2 border-yellow-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white font-semibold text-gray-800"
                            placeholder="0"
                          />
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 p-3 text-center font-bold text-yellow-900 bg-yellow-100">
                      {totalCharge}
                    </td>
                  </tr>

                  {/* Ligne Affecté */}
                  <tr className="bg-green-50 hover:bg-green-100 transition-colors">
                    <td className="border border-gray-300 p-3 font-semibold italic sticky left-0 z-10 bg-green-50">
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
                          className={`border border-gray-300 p-2 text-center font-bold ${
                            col.isWeekend ? 'bg-blue-50' : col.isHoliday ? 'bg-pink-50' : ''
                          } ${isOver ? 'bg-red-200 text-red-900' : ''} ${
                            isUnder ? 'bg-orange-100 text-orange-900' : 'text-green-900'
                          }`}
                          title={
                            isOver
                              ? `⚠️ Sur-affectation : ${totalAffecte} > ${besoin}`
                              : isUnder
                              ? `⚠️ Sous-affectation : ${totalAffecte} < ${besoin}`
                              : `✅ Affectation OK : ${totalAffecte} = ${besoin}`
                          }
                        >
                          {totalAffecte}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 p-3 text-center font-bold text-green-900 bg-green-100">
                      {colonnes.reduce(
                        (sum, col) => sum + getTotalAffecte(comp, col),
                        0
                      )}
                    </td>
                  </tr>

                  {/* Ressources - Afficher seulement si charge > 0 */}
                  {!hasCharge ? (
                    <tr>
                      <td colSpan={colonnes.length + 2} className="p-4 text-center text-gray-400 italic bg-gray-50">
                        Aucune charge définie - Définissez une charge pour afficher les ressources disponibles
                      </td>
                    </tr>
                  ) : ressourcesComp.length === 0 ? (
                    <tr>
                      <td colSpan={colonnes.length + 2} className="p-4 text-center text-gray-500 italic">
                        Aucune ressource disponible pour cette compétence
                      </td>
                    </tr>
                  ) : (
                    ressourcesComp.map((ressource) => {
                      const competencesRessource = competencesMap.get(ressource.id) || []
                      const competenceInfo = competencesRessource.find(
                        (c) => c.competence === comp
                      )
                      const isPrincipale = competenceInfo?.type_comp === 'P'

                      return (
                        <tr key={ressource.id} className="hover:bg-gray-50 transition-colors">
                          <td
                            className={`border border-gray-300 p-2 sticky left-0 z-10 bg-white ${
                              isPrincipale ? 'font-semibold text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isPrincipale && (
                                <span className="text-blue-600 font-bold">★</span>
                              )}
                              <span>{ressource.nom}</span>
                            </div>
                          </td>
                          {colonnes.map((col, idx) => {
                            const cellKey = `${comp}|${col.date.getTime()}`
                            const affectees = grilleAffectations.get(cellKey) || new Set()
                            const isAffecte = affectees.has(ressource.id)
                            const disponibilite = checkDisponibilite(ressource.id, col)

                            // Déterminer la couleur de fond selon le statut
                            let bgColor = ''
                            let borderColor = ''
                            let tooltip = ''

                            if (disponibilite.status === 'formation') {
                              bgColor = 'bg-purple-200'
                              borderColor = 'border-purple-500'
                              tooltip = `❌ ${disponibilite.message}`
                            } else if (disponibilite.status === 'absente') {
                              bgColor = 'bg-gray-300'
                              borderColor = 'border-gray-500'
                              tooltip = `❌ ${disponibilite.message}`
                            } else if (disponibilite.status === 'conflit') {
                              bgColor = 'bg-orange-200'
                              borderColor = 'border-orange-500'
                              tooltip = `⚠️ ${disponibilite.message}`
                            } else if (disponibilite.status === 'indisponible_transfert') {
                              bgColor = 'bg-gray-200'
                              borderColor = 'border-gray-400'
                              tooltip = `❌ ${disponibilite.message}`
                            } else if (disponibilite.status === 'date_fin_depassee') {
                              bgColor = 'bg-gray-300'
                              borderColor = 'border-gray-500'
                              tooltip = `❌ ${disponibilite.message}`
                            } else if (col.isHoliday) {
                              bgColor = 'bg-pink-50'
                              borderColor = 'border-pink-300'
                              tooltip = 'Jour férié'
                            } else if (col.isWeekend) {
                              bgColor = 'bg-blue-50'
                              borderColor = 'border-blue-200'
                              tooltip = 'Week-end'
                            } else {
                              bgColor = 'bg-white'
                              borderColor = isAffecte ? 'border-green-400' : 'border-gray-200'
                              tooltip = isAffecte ? '✅ Affecté(e) - Cliquer pour retirer' : 'Disponible - Cliquer pour affecter'
                            }

                            const isDisabled = disponibilite.status !== 'disponible' && !isAffecte

                            return (
                              <td
                                key={idx}
                                className={`border-2 ${borderColor} p-1 text-center ${bgColor} ${
                                  col.isWeekend ? 'bg-blue-50' : col.isHoliday ? 'bg-pink-50' : ''
                                }`}
                                title={tooltip}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAffecte}
                                  disabled={isDisabled}
                                  onChange={(e) =>
                                    handleAffectationChange(
                                      comp,
                                      ressource.id,
                                      col,
                                      e.target.checked
                                    )
                                  }
                                  className={`w-5 h-5 cursor-pointer ${
                                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                />
                              </td>
                            )
                          })}
                          <td className="border border-gray-300 p-2 text-center font-medium bg-gray-50">
                            {colonnes.reduce((sum, col) => {
                              const cellKey = `${comp}|${col.date.getTime()}`
                              const affectees = grilleAffectations.get(cellKey) || new Set()
                              return sum + (affectees.has(ressource.id) ? 1 : 0)
                            }, 0)}
                          </td>
                        </tr>
                      )
                    })
                  )}

                  {/* Espacement entre compétences */}
                  <tr>
                    <td colSpan={colonnes.length + 2} className="h-4 bg-transparent border-0"></td>
                  </tr>
                </React.Fragment>
              )
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-2">Instructions :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>La <strong>charge</strong> est saisie en nombre entier (ex: 2 = 2 ressources nécessaires)</li>
              <li>Les <strong>affectations</strong> se font via les cases à cocher (une case = 1 ressource)</li>
              <li>Les ressources <strong>absentes</strong> ou en <strong>formation</strong> sont automatiquement bloquées</li>
              <li>Les <strong>conflits</strong> (ressource déjà affectée ailleurs) sont signalés en orange</li>
              <li>Les ressources avec compétence <strong>principale</strong> sont marquées d'une étoile ★</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
