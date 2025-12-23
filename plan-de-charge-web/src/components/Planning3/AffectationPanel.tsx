'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Users, CheckCircle2, AlertCircle, XCircle, MapPin, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getISOWeek, getISOYear } from '@/utils/calendar'
import { isWeekend } from 'date-fns'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import type { RessourceCandidat } from '@/utils/planning/planning.compute'
import { getRessourcesCandidates, getStatutIndicateur } from '@/utils/planning/planning.compute'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import type { PeriodeCharge } from '@/types/charge'
import { useToast } from '@/components/UI/Toast'
import { applyAffectationsBatch } from '@/utils/planning/planning.api'
import { normalizeDateToUTC } from '@/utils/calendar'
import { addDays, subDays, isBefore, isAfter } from 'date-fns'

interface AffectationPanelProps {
  besoin: BesoinPeriode | null
  affaireId: string // Numéro de compte (affaire_id)
  affaireUuid: string // UUID de l'affaire dans la base
  ressources: Ressource[]
  competences: Map<string, RessourceCompetence[]>
  affectations: Affectation[]
  absences: Absence[]
  periodesCharge?: PeriodeCharge[] // Périodes de charge pour afficher les besoins
  onClose: () => void
  onSuccess: () => void
}

export function AffectationPanel({
  besoin,
  affaireId,
  affaireUuid,
  ressources,
  competences,
  affectations,
  absences,
  periodesCharge = [],
  onClose,
  onSuccess,
}: AffectationPanelProps) {
  const [candidats, setCandidats] = useState<RessourceCandidat[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [idsToRemove, setIdsToRemove] = useState<Set<string>>(new Set()) // IDs des affectations à supprimer
  const [selectedPeriodes, setSelectedPeriodes] = useState<Map<string, { dateDebut: Date; dateFin: Date }>>(new Map()) // Périodes partielles par ressource
  const [modifiedPeriodes, setModifiedPeriodes] = useState<Map<string, { dateDebut: Date; dateFin: Date }>>(new Map()) // Périodes modifiées pour les affectations existantes (par affectationId)
  const [periodesDejaModifiees, setPeriodesDejaModifiees] = useState<Set<string>>(new Set()) // IDs des affectations déjà modifiées automatiquement
  const [showPeriodSelector, setShowPeriodSelector] = useState<string | null>(null) // ID de la ressource pour laquelle afficher le sélecteur
  const [showPeriodModifier, setShowPeriodModifier] = useState<string | null>(null) // ID de l'affectation pour laquelle afficher le modificateur
  const [loading, setLoading] = useState(false)
  const [showConfirmSurplus, setShowConfirmSurplus] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (!besoin) {
      setCandidats([])
      setSelectedIds(new Set())
      return
    }

    const candidatsList = getRessourcesCandidates(
      besoin,
      ressources,
      competences,
      affectations,
      absences,
      affaireUuid
    )

    setCandidats(candidatsList)
    setSelectedIds(new Set())
  }, [besoin, ressources, competences, affectations, absences, affaireUuid])

  const handleToggle = (ressourceId: string) => {
    const candidat = candidats.find((c) => c.id === ressourceId)
    if (!candidat || !candidat.selectable) return

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(ressourceId)) {
        next.delete(ressourceId)
      } else {
        next.add(ressourceId)
      }
      return next
    })
  }

  const handleToggleDejaAffectee = (affectationId: string) => {
    setIdsToRemove((prev) => {
      const next = new Set(prev)
      if (next.has(affectationId)) {
        next.delete(affectationId)
      } else {
        next.add(affectationId)
      }
      return next
    })
  }

  const handleSetPeriodePartielle = (ressourceId: string, dateDebut: Date, dateFin: Date) => {
    setSelectedPeriodes((prev) => {
      const next = new Map(prev)
      next.set(ressourceId, { dateDebut, dateFin })
      return next
    })
    setShowPeriodSelector(null)
  }

  const handleModifyPeriodeExistante = async (affectationId: string, dateDebut: Date, dateFin: Date) => {
    // Mettre à jour l'état local immédiatement
    setModifiedPeriodes((prev) => {
      const next = new Map(prev)
      next.set(affectationId, { dateDebut, dateFin })
      return next
    })
    setShowPeriodModifier(null)

    // Déclencher la mise à jour automatiquement
    if (!besoin) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const affectationOriginale = affectations.find((aff) => aff.id === affectationId)
      if (!affectationOriginale) return

      const dateDebutOrig = new Date(affectationOriginale.date_debut)
      const dateFinOrig = new Date(affectationOriginale.date_fin)
      const dateDebutNouv = new Date(dateDebut)
      const dateFinNouv = new Date(dateFin)

      // Supprimer l'affectation originale
      const { error: deleteError } = await supabase
        .from('affectations')
        .delete()
        .eq('id', affectationId)
      if (deleteError) {
        console.error('Erreur suppression affectation:', deleteError)
        return
      }

      // Créer les nouvelles affectations (casser en deux si nécessaire)
      const affectationsACreer: Array<{
        ressourceId: string
        competence: string
        dateDebut: Date
        dateFin: Date
        charge: number
      }> = []

      // Période avant (si elle existe et est valide)
      if (isBefore(dateDebutOrig, dateDebutNouv)) {
        const dateFinAvant = subDays(dateDebutNouv, 1)
        if (!isAfter(dateDebutOrig, dateFinAvant)) {
          affectationsACreer.push({
            ressourceId: affectationOriginale.ressource_id,
            competence: affectationOriginale.competence,
            dateDebut: dateDebutOrig,
            dateFin: dateFinAvant,
            charge: affectationOriginale.charge,
          })
        }
      }

      // Période modifiée (si elle est valide)
      if (!isAfter(dateDebutNouv, dateFinNouv)) {
        affectationsACreer.push({
          ressourceId: affectationOriginale.ressource_id,
          competence: affectationOriginale.competence,
          dateDebut: dateDebutNouv,
          dateFin: dateFinNouv,
          charge: affectationOriginale.charge,
        })
      }

      // Période après (si elle existe et est valide)
      if (isAfter(dateFinOrig, dateFinNouv)) {
        const dateDebutApres = addDays(dateFinNouv, 1)
        if (!isAfter(dateDebutApres, dateFinOrig)) {
          affectationsACreer.push({
            ressourceId: affectationOriginale.ressource_id,
            competence: affectationOriginale.competence,
            dateDebut: dateDebutApres,
            dateFin: dateFinOrig,
            charge: affectationOriginale.charge,
          })
        }
      }

      // Créer les nouvelles affectations
      if (affectationsACreer.length > 0) {
        const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))
        await applyAffectationsBatch(
          affaireId,
          besoin.site,
          affectationsACreer,
          ressourcesMap
        )
      }

      // Marquer cette affectation comme déjà modifiée
      setPeriodesDejaModifiees((prev) => {
        const next = new Set(prev)
        next.add(affectationId)
        return next
      })

      // Rafraîchir les données
      onSuccess()
    } catch (err) {
      console.error('[AffectationPanel] Erreur lors de la modification de période:', err)
    }
  }

  const handleAffecterJoursDisponibles = (ressourceId: string) => {
    const candidat = candidats.find((c) => c.id === ressourceId)
    if (!candidat || candidat.joursDisponibles.length === 0) return

    const joursDisponibles = candidat.joursDisponibles.sort((a, b) => a.getTime() - b.getTime())
    const dateDebut = joursDisponibles[0]
    const dateFin = joursDisponibles[joursDisponibles.length - 1]

    handleSetPeriodePartielle(ressourceId, dateDebut, dateFin)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.add(ressourceId)
      return next
    })
  }

  const handleValider = async (forceConfirm = false) => {
    if (!besoin || (selectedIds.size === 0 && idsToRemove.size === 0 && modifiedPeriodes.size === 0)) {
      addToast('Veuillez sélectionner au moins une ressource, en désélectionner une ou modifier une période', 'error')
      return
    }

    // Vérifier si on dépasse le besoin et demander confirmation
    if (depasseBesoin && !forceConfirm) {
      setShowConfirmSurplus(true)
      return
    }

    setLoading(true)
    try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
      // Traiter les affectations modifiées (périodes cassées)
      // Ignorer celles qui ont déjà été modifiées automatiquement
      for (const [affectationId, nouvellePeriode] of modifiedPeriodes.entries()) {
        // Ignorer si déjà modifiée automatiquement
        if (periodesDejaModifiees.has(affectationId)) continue
        
        const affectationOriginale = affectations.find((aff) => aff.id === affectationId)
        if (!affectationOriginale) continue

        const dateDebutOrig = new Date(affectationOriginale.date_debut)
        const dateFinOrig = new Date(affectationOriginale.date_fin)
        const dateDebutNouv = new Date(nouvellePeriode.dateDebut)
        const dateFinNouv = new Date(nouvellePeriode.dateFin)

        // Supprimer l'affectation originale
        const { error: deleteError } = await supabase
          .from('affectations')
          .delete()
          .eq('id', affectationId)
        if (deleteError) {
          console.error('Erreur suppression affectation:', deleteError)
          throw new Error(`Erreur lors de la suppression: ${deleteError.message}`)
        }

        // Créer les nouvelles affectations (casser en deux si nécessaire)
        const affectationsACreer: Array<{
          ressourceId: string
          competence: string
          dateDebut: Date
          dateFin: Date
          charge: number
        }> = []

        // Période avant (si elle existe et est valide)
        if (isBefore(dateDebutOrig, dateDebutNouv)) {
          const dateFinAvant = subDays(dateDebutNouv, 1)
          if (!isAfter(dateDebutOrig, dateFinAvant)) {
            affectationsACreer.push({
              ressourceId: affectationOriginale.ressource_id,
              competence: affectationOriginale.competence,
              dateDebut: dateDebutOrig,
              dateFin: dateFinAvant,
              charge: affectationOriginale.charge,
            })
          }
        }

        // Période modifiée (si elle est valide)
        if (!isAfter(dateDebutNouv, dateFinNouv)) {
          affectationsACreer.push({
            ressourceId: affectationOriginale.ressource_id,
            competence: affectationOriginale.competence,
            dateDebut: dateDebutNouv,
            dateFin: dateFinNouv,
            charge: affectationOriginale.charge,
          })
        }

        // Période après (si elle existe et est valide)
        if (isAfter(dateFinOrig, dateFinNouv)) {
          const dateDebutApres = addDays(dateFinNouv, 1)
          if (!isAfter(dateDebutApres, dateFinOrig)) {
            affectationsACreer.push({
              ressourceId: affectationOriginale.ressource_id,
              competence: affectationOriginale.competence,
              dateDebut: dateDebutApres,
              dateFin: dateFinOrig,
              charge: affectationOriginale.charge,
            })
          }
        }

        // Créer les nouvelles affectations
        if (affectationsACreer.length > 0) {
          const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))
          await applyAffectationsBatch(
            affaireId,
            besoin.site,
            affectationsACreer,
            ressourcesMap
          )
        }
      }

      // Supprimer les affectations désélectionnées (qui ne sont pas modifiées)
      const idsToRemoveFinal = Array.from(idsToRemove).filter(
        (id) => !modifiedPeriodes.has(id)
      )
      if (idsToRemoveFinal.length > 0) {
        for (const affectationId of idsToRemoveFinal) {
          const { error } = await supabase.from('affectations').delete().eq('id', affectationId)
          if (error) {
            console.error('Erreur suppression affectation:', error)
            throw new Error(`Erreur lors de la suppression: ${error.message}`)
          }
        }
      }

      // Créer les nouvelles affectations
      if (selectedIds.size > 0) {
        const affectationsToCreate = Array.from(selectedIds).map((ressourceId) => {
          // Utiliser la période partielle si définie, sinon la période complète
          const periodePartielle = selectedPeriodes.get(ressourceId)
          return {
            ressourceId,
            competence: besoin.competence,
            dateDebut: periodePartielle?.dateDebut || besoin.dateDebut,
            dateFin: periodePartielle?.dateFin || besoin.dateFin,
            charge: 1,
          }
        })

        // Fournir les ressources pour éviter les requêtes supplémentaires lors de la création des transferts
        // IMPORTANT : Inclure toutes les ressources (y compris externes) pour permettre la création des transferts
        console.log('[AffectationPanel] Création ressourcesMap', {
          nbRessources: ressources.length,
          selectedIds: Array.from(selectedIds),
          besoinSite: besoin.site,
        })
        
        const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))
        
        // Vérifier que toutes les ressources sélectionnées sont dans la map
        const ressourcesManquantes = Array.from(selectedIds).filter(
          (id) => !ressourcesMap.some((r) => r.id === id)
        )
        if (ressourcesManquantes.length > 0) {
          console.warn('[AffectationPanel] ⚠️ Ressources manquantes dans ressourcesMap:', ressourcesManquantes)
        }

        // Log détaillé pour chaque ressource sélectionnée
        console.log('[AffectationPanel] Détail ressources sélectionnées', {
          affectationsToCreate: affectationsToCreate.map(aff => {
            const ressource = ressourcesMap.find(r => r.id === aff.ressourceId)
            return {
              ressourceId: aff.ressourceId,
              ressourceSite: ressource?.site || 'NON TROUVÉ',
              besoinSite: besoin.site,
              necessiteTransfert: ressource ? ressource.site.toUpperCase() !== besoin.site.toUpperCase() : 'INCONNU',
              ressourceDansMap: !!ressource,
            }
          }),
        })

        console.log('[AffectationPanel] Appel applyAffectationsBatch', {
          affaireId,
          site: besoin.site,
          nbAffectations: affectationsToCreate.length,
          ressourcesMapSize: ressourcesMap.length,
          ressourcesMap: ressourcesMap.map(r => ({ id: r.id, site: r.site })),
        })

        await applyAffectationsBatch(affaireId, besoin.site, affectationsToCreate, ressourcesMap)
      }

      const nbTransferts = candidats.filter(
        (c) => selectedIds.has(c.id) && c.necessiteTransfert
      ).length

      let message = ''
      if (selectedIds.size > 0) {
        message += `${selectedIds.size} ressource(s) affectée(s)`
      }
      if (modifiedPeriodes.size > 0) {
        if (message) message += ' • '
        message += `${modifiedPeriodes.size} période(s) modifiée(s)`
      }
      if (idsToRemove.size > 0) {
        if (message) message += ' • '
        message += `${idsToRemove.size} ressource(s) désaffectée(s)`
      }
      message += ' avec succès'
      if (nbTransferts > 0) {
        message += ` (${nbTransferts} transfert(s) créé(s) automatiquement)`
      }

      addToast(message, 'success')
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Erreur lors de l\'affectation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'affectation'
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Identifier les ressources déjà affectées à cette affaire pour cette période
  const ressourcesDejaAffectees = useMemo(() => {
    if (!besoin) return []
    
    return affectations
      .filter((aff) => {
        // Vérifier que l'affectation correspond à la période et la compétence
        const chevauche =
          aff.date_debut <= besoin.dateFin && aff.date_fin >= besoin.dateDebut
        return chevauche && aff.competence === besoin.competence
      })
      .map((aff) => {
        const ressource = ressources.find((r) => r.id === aff.ressource_id)
        const ressourceCompetences = competences.get(aff.ressource_id) || []
        const isPrincipale = ressourceCompetences.some(
          (comp) => comp.competence === besoin.competence && comp.type_comp === 'P'
        )
        const necessiteTransfert = ressource
          ? ressource.site.toUpperCase() !== besoin.site.toUpperCase()
          : false

        return {
          affectationId: aff.id,
          ressourceId: aff.ressource_id,
          nom: ressource?.nom || 'Ressource inconnue',
          site: ressource?.site || '',
          isPrincipale,
          necessiteTransfert,
          dateDebut: aff.date_debut,
          dateFin: aff.date_fin,
        }
      })
  }, [besoin, affectations, ressources, competences])

  // Identifier les IDs des ressources déjà affectées pour les exclure des listes disponibles
  const ressourcesDejaAffecteesIds = useMemo(() => {
    return new Set(ressourcesDejaAffectees.map((r) => r.ressourceId))
  }, [ressourcesDejaAffectees])

  // Calculer les besoins par compétence pour la période
  // IMPORTANT : Exclure les week-ends sauf si force_weekend_ferie = true
  // Ce useMemo se met à jour automatiquement quand periodesCharge change (via Realtime)
  const besoinsParCompetence = useMemo(() => {
    if (!besoin || !periodesCharge || periodesCharge.length === 0) return new Map<string, number>()
    
    const besoins = new Map<string, number>()
    const besoinDateDebut = normalizeDateToUTC(besoin.dateDebut)
    const besoinDateFin = normalizeDateToUTC(besoin.dateFin)
    
    // Vérifier si le besoin est sur un week-end (date début ET date fin sont des week-ends)
    const besoinIsWeekend = isWeekend(besoinDateDebut) && isWeekend(besoinDateFin)
    
    // Parcourir toutes les périodes de charge pour détecter les nouvelles compétences
    periodesCharge.forEach((periode: PeriodeCharge) => {
      const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
      const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
      
      // Vérifier si la période chevauche avec le besoin
      if (periodeDateDebut <= besoinDateFin && periodeDateFin >= besoinDateDebut) {
        // Si le besoin est sur un week-end, ne compter que si la période a force_weekend_ferie = true
        if (besoinIsWeekend && !periode.force_weekend_ferie) {
          // Le besoin est sur un week-end et la période n'est pas forcée, ne pas l'inclure
          return
        }
        
        const competence = periode.competence
        const nbRessources = periode.nb_ressources || 0
        
        // Prendre le maximum entre la valeur actuelle et la nouvelle valeur
        // Cela permet d'afficher correctement les nouvelles compétences avec charge > 1
        const current = besoins.get(competence) || 0
        besoins.set(competence, Math.max(current, nbRessources))
      }
    })
    
    return besoins
  }, [besoin, periodesCharge])

  // Calculer le nombre total de ressources qui seront affectées (sélectionnées - désélectionnées)
  // IMPORTANT : Ne compter que les ressources avec la compétence du besoin
  const nbRessourcesAffectees = useMemo(() => {
    if (!besoin) return 0
    
    // Compter les ressources déjà affectées à cette compétence (qui ne sont pas désélectionnées)
    const nbDejaAffectees = ressourcesDejaAffectees.filter(r => !idsToRemove.has(r.affectationId)).length
    
    // Compter les ressources sélectionnées qui ont la compétence du besoin
    // Les candidats sont déjà filtrés par compétence dans getRessourcesCandidates,
    // mais on vérifie explicitement pour être sûr
    const nbNouvellesSelectionnees = Array.from(selectedIds).filter((ressourceId) => {
      const ressourceCompetences = competences.get(ressourceId) || []
      return ressourceCompetences.some((comp) => comp.competence === besoin.competence)
    }).length
    
    return nbDejaAffectees + nbNouvellesSelectionnees
  }, [besoin, selectedIds, idsToRemove, ressourcesDejaAffectees, competences])

  // Vérifier si on dépasse le besoin
  const depasseBesoin = useMemo(() => {
    if (!besoin) return false
    const besoinNb = besoin.nbRessources || 0
    return nbRessourcesAffectees > besoinNb
  }, [besoin, nbRessourcesAffectees])

  // Séparer les candidats :
  // - Disponibles du même site (selectable && !necessiteTransfert) - EXCLURE celles déjà affectées
  // - Disponibles nécessitant transfert (selectable && necessiteTransfert) - EXCLURE celles déjà affectées
  // - Indisponibles (absents ou en conflit) - non sélectionnables, mais uniquement celles qui ont la compétence
  const candidatsDisponiblesMemeSiteRaw = useMemo(() => {
    if (!besoin) return []
    return candidats.filter(
    (c) => c.selectable && !c.necessiteTransfert && !ressourcesDejaAffecteesIds.has(c.id)
  )
  }, [besoin, candidats, ressourcesDejaAffecteesIds])

  const candidatsNecessitantTransfertRaw = useMemo(() => {
    if (!besoin) return []
    return candidats.filter(
    (c) => c.selectable && c.necessiteTransfert && !ressourcesDejaAffecteesIds.has(c.id)
  )
  }, [besoin, candidats, ressourcesDejaAffecteesIds])

  // Filtrer les indisponibles : celles qui ont la compétence mais sont complètement indisponibles
  // OU celles avec conflit partiel (seront affichées mais avec option d'affectation partielle)
  const candidatsIndisponiblesRaw = useMemo(() => {
    if (!besoin) return []
    return candidats.filter(
    (c) => !c.selectable && (c.isAbsente || c.hasConflit) && !c.hasConflitPartiel
  )
  }, [besoin, candidats])
  
  // Trier les indisponibles par ordre alphabétique
  const candidatsIndisponibles = useMemo(() => {
    return [...candidatsIndisponiblesRaw].sort((a, b) => a.nom.localeCompare(b.nom))
  }, [candidatsIndisponiblesRaw])
  
  // Ressources avec conflit partiel (affichées dans une section séparée)
  const candidatsConflitPartielRaw = useMemo(() => {
    if (!besoin) return []
    return candidats.filter(
    (c) => c.hasConflitPartiel && c.joursDisponibles.length > 0
  )
  }, [besoin, candidats])

  // Trier les listes : ressources sélectionnées en premier, puis par ordre alphabétique
  const candidatsDisponiblesMemeSite = useMemo(() => {
    const selected = candidatsDisponiblesMemeSiteRaw.filter((c) => selectedIds.has(c.id))
    const unselected = candidatsDisponiblesMemeSiteRaw.filter((c) => !selectedIds.has(c.id))
    return [
      ...selected.sort((a, b) => a.nom.localeCompare(b.nom)),
      ...unselected.sort((a, b) => a.nom.localeCompare(b.nom)),
    ]
  }, [candidatsDisponiblesMemeSiteRaw, selectedIds])

  const candidatsNecessitantTransfert = useMemo(() => {
    const selected = candidatsNecessitantTransfertRaw.filter((c) => selectedIds.has(c.id))
    const unselected = candidatsNecessitantTransfertRaw.filter((c) => !selectedIds.has(c.id))
    return [
      ...selected.sort((a, b) => a.nom.localeCompare(b.nom)),
      ...unselected.sort((a, b) => a.nom.localeCompare(b.nom)),
    ]
  }, [candidatsNecessitantTransfertRaw, selectedIds])

  const candidatsConflitPartiel = useMemo(() => {
    const selected = candidatsConflitPartielRaw.filter((c) => selectedIds.has(c.id))
    const unselected = candidatsConflitPartielRaw.filter((c) => !selectedIds.has(c.id))
    return [
      ...selected.sort((a, b) => a.nom.localeCompare(b.nom)),
      ...unselected.sort((a, b) => a.nom.localeCompare(b.nom)),
    ]
  }, [candidatsConflitPartielRaw, selectedIds])

  // Trier les ressources déjà affectées : celles qui restent affectées en premier, puis par ordre alphabétique
  const ressourcesDejaAffecteesTriees = useMemo(() => {
    const keepAffected = ressourcesDejaAffectees.filter((r) => !idsToRemove.has(r.affectationId))
    const toRemove = ressourcesDejaAffectees.filter((r) => idsToRemove.has(r.affectationId))
    return [
      ...keepAffected.sort((a, b) => a.nom.localeCompare(b.nom)),
      ...toRemove.sort((a, b) => a.nom.localeCompare(b.nom)),
    ]
  }, [ressourcesDejaAffectees, idsToRemove])

  if (!besoin) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-0" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white w-full h-full flex flex-col" style={{ pointerEvents: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Affecter des ressources</h2>
            <p className="text-sm text-gray-600 mt-1">
              {besoin.competence} • {besoin.nbRessources} ressource(s) requise(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Compteur de sélection */}
          <div className={`mb-4 p-3 rounded-lg border ${
            depasseBesoin 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${
              depasseBesoin ? 'text-orange-800' : 'text-blue-800'
            }`}>
              {nbRessourcesAffectees} ressource(s) affectée(s) / {besoin.nbRessources} requise(s)
              {depasseBesoin && (
                <span className="ml-2 text-orange-600 font-bold">
                  ⚠️ Surplus de {nbRessourcesAffectees - besoin.nbRessources} ressource(s)
                </span>
              )}
            </p>
          </div>

          {/* Affichage des besoins par compétence */}
          {besoinsParCompetence.size > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Besoins en charge pour la période</h3>
              <div className="space-y-1">
                {Array.from(besoinsParCompetence.entries()).map(([competence, nbRessources]) => {
                  // Calculer la couverture pour cette compétence
                  const affectationsCompetence = affectations.filter(
                    (aff) => aff.competence === competence &&
                      aff.date_debut <= besoin.dateFin &&
                      aff.date_fin >= besoin.dateDebut
                  )
                  const affecte = affectationsCompetence.length
                  const manque = Math.max(0, nbRessources - affecte)
                  const surplus = Math.max(0, affecte - nbRessources)
                  const couverture = { affecte, manque, surplus }
                  const statut = getStatutIndicateur(couverture)
                  
                  return (
                  <div key={competence} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-base ${statut.color}`}>{statut.emoji}</span>
                    <span className="text-gray-600">{competence}:</span>
                      </div>
                    <span className={`font-medium ${
                      competence === besoin.competence ? 'text-blue-600' : 'text-gray-800'
                    }`}>
                        {nbRessources} ressource{nbRessources > 1 ? 's' : ''} ({affecte} affectée{affecte > 1 ? 's' : ''})
                    </span>
                  </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Période: {format(besoin.dateDebut, 'dd/MM/yyyy', { locale: fr })} → {format(besoin.dateFin, 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
          )}

          {/* Ressources déjà affectées */}
          {ressourcesDejaAffecteesTriees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Ressources déjà affectées ({ressourcesDejaAffecteesTriees.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Décochez pour désaffecter ces ressources de l&apos;affaire
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ressourcesDejaAffecteesTriees.map((ressource) => {
                  const isToRemove = idsToRemove.has(ressource.affectationId)
                  return (
                    <div
                      key={ressource.affectationId}
                      onClick={() => handleToggleDejaAffectee(ressource.affectationId)}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md
                        ${
                          isToRemove
                            ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 shadow-md'
                            : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!isToRemove}
                          onChange={() => handleToggleDejaAffectee(ressource.affectationId)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isToRemove ? 'text-red-900' : 'text-gray-800'} truncate`}>
                            {ressource.nom}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {ressource.site}
                            </span>
                            {ressource.isPrincipale && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                ⭐ Principale
                              </span>
                            )}
                            {ressource.necessiteTransfert && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                🔄 Transfert
                              </span>
                            )}
                            {isToRemove && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                ⚠️ À désaffecter
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {ressource.dateDebut.toLocaleDateString('fr-FR')} →{' '}
                            {ressource.dateFin.toLocaleDateString('fr-FR')}
                            {' '}
                            <span className="text-gray-400">
                              (S{String(getISOWeek(ressource.dateDebut)).padStart(2, '0')}-{getISOYear(ressource.dateDebut)})
                            </span>
                          </p>
                          {!isToRemove && (
                            <div className="mt-2 space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowPeriodModifier(showPeriodModifier === ressource.affectationId ? null : ressource.affectationId)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                {modifiedPeriodes.has(ressource.affectationId)
                                  ? `Période: ${format(modifiedPeriodes.get(ressource.affectationId)!.dateDebut, 'dd/MM', { locale: fr })} → ${format(modifiedPeriodes.get(ressource.affectationId)!.dateFin, 'dd/MM', { locale: fr })}`
                                  : 'Modifier période'}
                              </button>
                              {showPeriodModifier === ressource.affectationId && (
                                <div className="mt-1 p-2 bg-white rounded border border-gray-300">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date début:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      modifiedPeriodes.has(ressource.affectationId)
                                        ? format(modifiedPeriodes.get(ressource.affectationId)!.dateDebut, 'yyyy-MM-dd')
                                        : format(ressource.dateDebut, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateDebut = new Date(e.target.value)
                                      const dateFin = modifiedPeriodes.get(ressource.affectationId)?.dateFin || ressource.dateFin
                                      handleModifyPeriodeExistante(ressource.affectationId, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                  <label className="block text-xs font-medium text-gray-700 mb-1 mt-1">
                                    Date fin:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      modifiedPeriodes.has(ressource.affectationId)
                                        ? format(modifiedPeriodes.get(ressource.affectationId)!.dateFin, 'yyyy-MM-dd')
                                        : format(ressource.dateFin, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateFin = new Date(e.target.value)
                                      const dateDebut = modifiedPeriodes.get(ressource.affectationId)?.dateDebut || ressource.dateDebut
                                      handleModifyPeriodeExistante(ressource.affectationId, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                        </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ressources disponibles du même site - En tuiles */}
          {candidatsDisponiblesMemeSite.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Ressources disponibles ({candidatsDisponiblesMemeSite.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {candidatsDisponiblesMemeSite.map((candidat) => {
                  const isSelected = selectedIds.has(candidat.id)
                  return (
                    <div
                      key={candidat.id}
                      onClick={() => handleToggle(candidat.id)}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md
                        ${
                          isSelected
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(candidat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-800'} truncate`}>
                            {candidat.nom}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {candidat.site}
                            </span>
                            {candidat.isPrincipale && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                ⭐ Principale
                              </span>
                            )}
                            {candidat.necessiteTransfert && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                🔄 Transfert
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="mt-2 space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowPeriodSelector(showPeriodSelector === candidat.id ? null : candidat.id)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                {selectedPeriodes.has(candidat.id)
                                  ? `Période: ${format(selectedPeriodes.get(candidat.id)!.dateDebut, 'dd/MM', { locale: fr })} → ${format(selectedPeriodes.get(candidat.id)!.dateFin, 'dd/MM', { locale: fr })}`
                                  : 'Choisir période partielle'}
                              </button>
                              {showPeriodSelector === candidat.id && (
                                <div className="mt-1 p-2 bg-white rounded border border-gray-300">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date début:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      selectedPeriodes.has(candidat.id)
                                        ? format(selectedPeriodes.get(candidat.id)!.dateDebut, 'yyyy-MM-dd')
                                        : format(besoin.dateDebut, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateDebut = new Date(e.target.value)
                                      const dateFin = selectedPeriodes.get(candidat.id)?.dateFin || besoin.dateFin
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                  <label className="block text-xs font-medium text-gray-700 mb-1 mt-1">
                                    Date fin:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      selectedPeriodes.has(candidat.id)
                                        ? format(selectedPeriodes.get(candidat.id)!.dateFin, 'yyyy-MM-dd')
                                        : format(besoin.dateFin, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateFin = new Date(e.target.value)
                                      const dateDebut = selectedPeriodes.get(candidat.id)?.dateDebut || besoin.dateDebut
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ressources nécessitant transfert (autres sites) - En tuiles */}
          {candidatsNecessitantTransfert.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                Ressources nécessitant transfert ({candidatsNecessitantTransfert.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Ces ressources ont la compétence mais sont sur un autre site. Un transfert sera créé automatiquement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {candidatsNecessitantTransfert.map((candidat) => {
                  const isSelected = selectedIds.has(candidat.id)
                  return (
                    <div
                      key={candidat.id}
                      onClick={() => handleToggle(candidat.id)}
                      className={`
                        p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md
                        ${
                          isSelected
                            ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-md'
                            : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(candidat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 mt-0.5 text-amber-600 rounded focus:ring-amber-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${isSelected ? 'text-amber-900' : 'text-gray-800'} truncate`}>
                            {candidat.nom}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {candidat.site} → {besoin.site}
                            </span>
                            {candidat.isPrincipale && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                ⭐ Principale
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              🔄 Transfert auto
                            </span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowPeriodSelector(showPeriodSelector === candidat.id ? null : candidat.id)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                {selectedPeriodes.has(candidat.id)
                                  ? `Période: ${format(selectedPeriodes.get(candidat.id)!.dateDebut, 'dd/MM', { locale: fr })} → ${format(selectedPeriodes.get(candidat.id)!.dateFin, 'dd/MM', { locale: fr })}`
                                  : 'Choisir période partielle'}
                              </button>
                              {showPeriodSelector === candidat.id && (
                                <div className="mt-1 p-2 bg-white rounded border border-gray-300">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date début:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      selectedPeriodes.has(candidat.id)
                                        ? format(selectedPeriodes.get(candidat.id)!.dateDebut, 'yyyy-MM-dd')
                                        : format(besoin.dateDebut, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateDebut = new Date(e.target.value)
                                      const dateFin = selectedPeriodes.get(candidat.id)?.dateFin || besoin.dateFin
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                  <label className="block text-xs font-medium text-gray-700 mb-1 mt-1">
                                    Date fin:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      selectedPeriodes.has(candidat.id)
                                        ? format(selectedPeriodes.get(candidat.id)!.dateFin, 'yyyy-MM-dd')
                                        : format(besoin.dateFin, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateFin = new Date(e.target.value)
                                      const dateDebut = selectedPeriodes.get(candidat.id)?.dateDebut || besoin.dateDebut
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ressources avec conflit partiel (disponibles sur certains jours) */}
          {candidatsConflitPartiel.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Ressources partiellement indisponibles ({candidatsConflitPartiel.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Ces ressources ont des conflits sur certains jours mais sont disponibles sur d&apos;autres. Vous pouvez les affecter sur les jours disponibles uniquement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {candidatsConflitPartiel.map((candidat) => {
                  const isSelected = selectedIds.has(candidat.id)
                  const periodePartielle = selectedPeriodes.get(candidat.id)
                  const joursDisponiblesStr = candidat.joursDisponibles
                    .map((d) => format(d, 'dd/MM', { locale: fr }))
                    .join(', ')
                  return (
                    <div
                      key={candidat.id}
                      className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(candidat.id)}
                          className="w-5 h-5 mt-0.5 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{candidat.nom}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              ⚠️ Conflit partiel
                            </span>
                            {candidat.isPrincipale && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                ⭐ Principale
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Jours disponibles: {joursDisponiblesStr}
                          </p>
                          {isSelected && (
                            <div className="mt-2 space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAffecterJoursDisponibles(candidat.id)
                                }}
                                className="w-full text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                Affecter jours disponibles
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowPeriodSelector(showPeriodSelector === candidat.id ? null : candidat.id)
                                }}
                                className="w-full text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              >
                                {periodePartielle
                                  ? `Période: ${format(periodePartielle.dateDebut, 'dd/MM', { locale: fr })} → ${format(periodePartielle.dateFin, 'dd/MM', { locale: fr })}`
                                  : 'Choisir période partielle'}
                              </button>
                              {showPeriodSelector === candidat.id && (
                                <div className="mt-2 p-2 bg-white rounded border border-gray-300">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date début:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      periodePartielle
                                        ? format(periodePartielle.dateDebut, 'yyyy-MM-dd')
                                        : format(besoin.dateDebut, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateDebut = new Date(e.target.value)
                                      const dateFin = periodePartielle?.dateFin || besoin.dateFin
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                  <label className="block text-xs font-medium text-gray-700 mb-1 mt-2">
                                    Date fin:
                                  </label>
                                  <input
                                    type="date"
                                    min={format(besoin.dateDebut, 'yyyy-MM-dd')}
                                    max={format(besoin.dateFin, 'yyyy-MM-dd')}
                                    defaultValue={
                                      periodePartielle
                                        ? format(periodePartielle.dateFin, 'yyyy-MM-dd')
                                        : format(besoin.dateFin, 'yyyy-MM-dd')
                                    }
                                    onChange={(e) => {
                                      const dateFin = new Date(e.target.value)
                                      const dateDebut = periodePartielle?.dateDebut || besoin.dateDebut
                                      handleSetPeriodePartielle(candidat.id, dateDebut, dateFin)
                                    }}
                                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ressources indisponibles (absentes ou en conflit complet) - En tuiles */}
          {candidatsIndisponibles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Ressources indisponibles ({candidatsIndisponibles.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {candidatsIndisponibles.map((candidat) => (
                  <div
                    key={candidat.id}
                    className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        disabled
                        className="w-5 h-5 mt-0.5 text-gray-400 rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-600 truncate">{candidat.nom}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {candidat.isAbsente && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              ⚠️ Absente
                            </span>
                          )}
                          {candidat.hasConflit && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              ⚠️ Conflit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {candidatsDisponiblesMemeSite.length === 0 &&
            candidatsNecessitantTransfert.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune ressource disponible pour cette compétence</p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => handleValider()}
            disabled={loading || (selectedIds.size === 0 && idsToRemove.size === 0 && modifiedPeriodes.size === 0)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Valider ({selectedIds.size > 0 ? `+${selectedIds.size}` : ''}{modifiedPeriodes.size > 0 ? ` ~${modifiedPeriodes.size}` : ''}{idsToRemove.size > 0 ? ` -${idsToRemove.size}` : ''})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de confirmation si surplus */}
      {showConfirmSurplus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Affecter plus de ressources que le besoin ?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vous êtes sur le point d&apos;affecter <strong>{nbRessourcesAffectees} ressource(s)</strong> alors que le besoin est de <strong>{besoin.nbRessources} ressource(s)</strong>.
                  <br />
                  <br />
                  Voulez-vous continuer ?
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmSurplus(false)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmSurplus(false)
                      handleValider(true)
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    Oui, affecter quand même
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

