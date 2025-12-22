'use client'

import React, { useState, useMemo } from 'react'
import { X, Users, CheckCircle2, AlertCircle, XCircle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import { useToast } from '@/components/UI/Toast'
import { applyAffectationsBatch } from '@/utils/planning/planning.api'
import { hasConflitAffaire, isAbsente, getJoursConflits, getJoursDisponibles } from '@/utils/planning/planning.rules'
import { getISOWeek, getISOYear } from '@/utils/calendar'

interface AffectationMassePanelProps {
  besoins: BesoinPeriode[]
  affaireId: string
  affaireUuid: string
  ressources: Ressource[]
  competences: Map<string, RessourceCompetence[]>
  affectations: Affectation[]
  absences: Absence[]
  onClose: () => void
  onSuccess: () => void
}

export function AffectationMassePanel({
  besoins,
  affaireId,
  affaireUuid,
  ressources,
  competences,
  affectations,
  absences,
  onClose,
  onSuccess,
}: AffectationMassePanelProps) {
  const [selectedRessourceIds, setSelectedRessourceIds] = useState<Set<string>>(new Set())
  const [idsToRemove, setIdsToRemove] = useState<Set<string>>(new Set()) // IDs des affectations à supprimer
  const [selectedPeriodes, setSelectedPeriodes] = useState<Map<string, Map<string, { dateDebut: Date; dateFin: Date }>>>(new Map()) // Périodes partielles par ressource × besoin
  const [showPeriodSelector, setShowPeriodSelector] = useState<{ ressourceId: string; besoinId: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  // Vérifier que tous les besoins ont la même compétence
  const competencesUniques = useMemo(() => {
    const comps = new Set(besoins.map((b) => b.competence))
    return Array.from(comps)
  }, [besoins])

  // Vérifier que tous les besoins ont le même site
  const sitesUniques = useMemo(() => {
    const sites = new Set(besoins.map((b) => b.site))
    return Array.from(sites)
  }, [besoins])

  // Filtrer les ressources candidates : doivent avoir la compétence de tous les besoins
  const ressourcesCandidates = useMemo(() => {
    if (competencesUniques.length !== 1) {
      return [] // Si plusieurs compétences, pas de candidats
    }

    const competence = competencesUniques[0]
    const site = sitesUniques[0] || ''

    return ressources
      .map((ressource) => {
        const ressourceCompetences = competences.get(ressource.id) || []
        const hasCompetence = ressourceCompetences.some((comp) => comp.competence === competence)
        const isPrincipale = ressourceCompetences.some(
          (comp) => comp.competence === competence && comp.type_comp === 'P'
        )

        // Vérifier la disponibilité sur TOUTES les périodes
        let isDispo = true
        let isAbs = false
        let hasConflit = false
        let hasConflitPartiel = false
        const joursDisponiblesParBesoin = new Map<string, Date[]>() // Besoin ID → jours disponibles

        for (const besoin of besoins) {
          const abs = isAbsente(ressource.id, besoin.dateDebut, besoin.dateFin, absences)
          const conflit = hasConflitAffaire(
            ressource.id,
            besoin.dateDebut,
            besoin.dateFin,
            affectations,
            affaireUuid
          )
          
          // Obtenir les jours spécifiques
          const joursConflits = getJoursConflits(
            ressource.id,
            besoin.dateDebut,
            besoin.dateFin,
            affectations,
            affaireUuid
          )
          const joursDisponibles = getJoursDisponibles(
            ressource.id,
            besoin.dateDebut,
            besoin.dateFin,
            affectations,
            absences,
            affaireUuid
          )
          
          joursDisponiblesParBesoin.set(besoin.id, joursDisponibles)
          
          // Conflit partiel si au moins une période a des jours disponibles ET des conflits
          if (joursConflits.length > 0 && joursDisponibles.length > 0) {
            hasConflitPartiel = true
          }

          if (abs) isAbs = true
          if (conflit) hasConflit = true
          if (abs || conflit) {
            // Si conflit partiel, on garde isDispo à true si au moins un jour est disponible
            if (!hasConflitPartiel || joursDisponibles.length === 0) {
              isDispo = false
            }
          }
        }

        const necessiteTransfert = ressource.site.toUpperCase() !== site.toUpperCase()

        return {
          id: ressource.id,
          nom: ressource.nom,
          site: ressource.site,
          isPrincipale,
          isAbsente: isAbs,
          hasConflit,
          hasConflitPartiel,
          joursDisponiblesParBesoin,
          necessiteTransfert,
          selectable: hasCompetence && (isDispo || hasConflitPartiel),
          hasCompetence,
        }
      })
      // Afficher toutes les ressources qui ont la compétence (disponibles, nécessitant transfert, ou indisponibles)
      .filter((r) => r.hasCompetence)
  }, [besoins, ressources, competences, affectations, absences, affaireUuid, competencesUniques, sitesUniques])

  const candidatsDisponibles = ressourcesCandidates.filter((c) => c.selectable && !c.necessiteTransfert && !c.hasConflitPartiel)
  const candidatsNecessitantTransfert = ressourcesCandidates.filter((c) => c.selectable && c.necessiteTransfert && !c.hasConflitPartiel)
  const candidatsConflitPartiel = ressourcesCandidates.filter((c) => c.hasConflitPartiel)
  // Filtrer les indisponibles : seulement celles qui ont la compétence (absentes ou en conflit complet)
  const candidatsIndisponibles = ressourcesCandidates.filter(
    (c) => !c.selectable && (c.isAbsente || c.hasConflit) && !c.hasConflitPartiel
  )

  // Identifier les ressources déjà affectées à cette affaire pour ces périodes
  const ressourcesDejaAffectees = useMemo(() => {
    if (besoins.length === 0 || competencesUniques.length !== 1) return []
    
    const competence = competencesUniques[0]
    
    return affectations
      .filter((aff) => {
        // Vérifier que l'affectation correspond à au moins une période et la compétence
        const chevaucheAvecAuMoinsUnePeriode = besoins.some(
          (besoin) =>
            aff.date_debut <= besoin.dateFin &&
            aff.date_fin >= besoin.dateDebut &&
            aff.competence === competence
        )
        return chevaucheAvecAuMoinsUnePeriode
      })
      .map((aff) => {
        const ressource = ressources.find((r) => r.id === aff.ressource_id)
        const ressourceCompetences = competences.get(aff.ressource_id) || []
        const isPrincipale = ressourceCompetences.some(
          (comp) => comp.competence === competence && comp.type_comp === 'P'
        )
        const necessiteTransfert = ressource
          ? ressource.site.toUpperCase() !== sitesUniques[0]?.toUpperCase()
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
  }, [besoins, affectations, ressources, competences, competencesUniques, sitesUniques])

  const handleToggleRessource = (ressourceId: string) => {
    setSelectedRessourceIds((prev) => {
      const next = new Set(prev)
      if (next.has(ressourceId)) {
        next.delete(ressourceId)
      } else {
        next.add(ressourceId)
      }
      return next
    })
  }

  const handleSelectAll = (candidats: typeof ressourcesCandidates) => {
    const selectableIds = candidats.filter((c) => c.selectable).map((c) => c.id)
    if (selectableIds.every((id) => selectedRessourceIds.has(id))) {
      // Tout désélectionner
      setSelectedRessourceIds((prev) => {
        const next = new Set(prev)
        selectableIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      // Tout sélectionner
      setSelectedRessourceIds((prev) => {
        const next = new Set(prev)
        selectableIds.forEach((id) => next.add(id))
        return next
      })
    }
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

  const handleValider = async () => {
    if (selectedRessourceIds.size === 0 && idsToRemove.size === 0) {
      addToast('Veuillez sélectionner au moins une ressource ou en désélectionner une', 'error')
      return
    }

    if (competencesUniques.length !== 1) {
      addToast('Toutes les périodes doivent avoir la même compétence', 'error')
      return
    }

    setLoading(true)
    try {
      // Supprimer les affectations désélectionnées
      if (idsToRemove.size > 0) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        for (const affectationId of idsToRemove) {
          const { error } = await supabase.from('affectations').delete().eq('id', affectationId)
          if (error) {
            console.error('Erreur suppression affectation:', error)
            throw new Error(`Erreur lors de la suppression: ${error.message}`)
          }
        }
      }

      // Créer les nouvelles affectations
      if (selectedRessourceIds.size > 0) {
        const competence = competencesUniques[0]
        const site = sitesUniques[0] || besoins[0].site

        // Créer une affectation pour chaque combinaison ressource × période
        const affectationsToCreate: Array<{
          ressourceId: string
          competence: string
          dateDebut: Date
          dateFin: Date
          charge: number
        }> = []

        for (const ressourceId of selectedRessourceIds) {
          const periodesRessource = selectedPeriodes.get(ressourceId)
          for (const besoin of besoins) {
            // Utiliser la période partielle si définie pour ce besoin, sinon la période complète
            const periodePartielle = periodesRessource?.get(besoin.id)
            affectationsToCreate.push({
              ressourceId,
              competence,
              dateDebut: periodePartielle?.dateDebut || besoin.dateDebut,
              dateFin: periodePartielle?.dateFin || besoin.dateFin,
              charge: 1,
            })
          }
        }

        // Fournir les ressources pour éviter les requêtes supplémentaires lors de la création des transferts
        const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))

        await applyAffectationsBatch(affaireId, site, affectationsToCreate, ressourcesMap)
      }

      const nbTransferts = Array.from(selectedRessourceIds).filter(
        (id) => ressourcesCandidates.find((c) => c.id === id)?.necessiteTransfert
      ).length

      let message = ''
      if (selectedRessourceIds.size > 0) {
        message += `${selectedRessourceIds.size * besoins.length} affectation(s) créée(s)`
      }
      if (idsToRemove.size > 0) {
        if (message) message += ' • '
        message += `${idsToRemove.size} affectation(s) supprimée(s)`
      }
      message += ' avec succès'
      if (nbTransferts > 0) {
        message += ` (${nbTransferts} transfert(s) créé(s) automatiquement)`
      }

      addToast(message, 'success')
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Erreur lors de l\'affectation de masse:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'affectation de masse'
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Calculer la période globale (min/max des dates)
  const periodeGlobale = useMemo(() => {
    if (besoins.length === 0) return null
    const dates = besoins.flatMap((b) => [b.dateDebut, b.dateFin])
    return {
      dateDebut: new Date(Math.min(...dates.map((d) => d.getTime()))),
      dateFin: new Date(Math.max(...dates.map((d) => d.getTime()))),
    }
  }, [besoins])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Affectation de masse</h2>
            <p className="text-sm text-gray-600 mt-1">
              {besoins.length} période(s) sélectionnée(s) • {competencesUniques[0] || 'Compétences multiples'}
            </p>
            {periodeGlobale && (
              <p className="text-xs text-gray-500 mt-1">
                Du {periodeGlobale.dateDebut.toLocaleDateString('fr-FR')} au{' '}
                {periodeGlobale.dateFin.toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avertissement si plusieurs compétences */}
          {competencesUniques.length > 1 && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Les périodes sélectionnées ont des compétences différentes. Veuillez sélectionner des périodes avec la
                  même compétence.
                </p>
              </div>
            </div>
          )}

          {/* Liste des périodes sélectionnées */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Périodes sélectionnées :</h3>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {besoins.map((besoin) => (
                  <div key={besoin.id} className="text-xs text-gray-600">
                    • {besoin.competence} : {besoin.dateDebut.toLocaleDateString('fr-FR')} →{' '}
                    {besoin.dateFin.toLocaleDateString('fr-FR')}{' '}
                    <span className="text-gray-400">
                      (S{String(getISOWeek(besoin.dateDebut)).padStart(2, '0')}-{getISOYear(besoin.dateDebut)})
                    </span>{' '}
                    (Besoin: {besoin.nbRessources})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ressources déjà affectées */}
          {ressourcesDejaAffectees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Ressources déjà affectées ({ressourcesDejaAffectees.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Décochez pour désaffecter ces ressources de l&apos;affaire
              </p>
              <div className="space-y-2">
                {ressourcesDejaAffectees.map((ressource) => {
                  const isToRemove = idsToRemove.has(ressource.affectationId)
                  return (
                    <div
                      key={ressource.affectationId}
                      onClick={() => handleToggleDejaAffectee(ressource.affectationId)}
                      className={`
                        p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          isToRemove
                            ? 'border-red-500 bg-red-50'
                            : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!isToRemove}
                          onChange={() => handleToggleDejaAffectee(ressource.affectationId)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{ressource.nom}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600 flex items-center gap-1">
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
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sélection de la ressource */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Sélectionner des ressources ({selectedRessourceIds.size} sélectionnée(s)
                {idsToRemove.size > 0 ? ` • ${idsToRemove.size} à désaffecter` : ''}) :
              </h3>
              {candidatsDisponibles.length > 0 && (
                <button
                  onClick={() => handleSelectAll(candidatsDisponibles)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {candidatsDisponibles.every((c) => selectedRessourceIds.has(c.id))
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>
              )}
            </div>

            {/* Ressources disponibles du même site */}
            {candidatsDisponibles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Ressources disponibles ({candidatsDisponibles.length})
                </h4>
                <div className="space-y-2">
                  {candidatsDisponibles.map((candidat) => {
                    const isSelected = selectedRessourceIds.has(candidat.id)
                    return (
                      <div
                        key={candidat.id}
                        onClick={() => handleToggleRessource(candidat.id)}
                        className={`
                          p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRessource(candidat.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{candidat.nom}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {candidat.site}
                              </span>
                              {candidat.isPrincipale && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                  ⭐ Principale
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ressources avec conflit partiel */}
            {candidatsConflitPartiel.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Ressources partiellement indisponibles ({candidatsConflitPartiel.length})
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  Ces ressources ont des conflits sur certains jours mais sont disponibles sur d&apos;autres. Vous pouvez les affecter sur les jours disponibles uniquement.
                </p>
                <div className="space-y-2">
                  {candidatsConflitPartiel.map((candidat) => {
                    const isSelected = selectedRessourceIds.has(candidat.id)
                    return (
                      <div
                        key={candidat.id}
                        className="p-3 rounded-lg border-2 border-orange-200 bg-orange-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRessource(candidat.id)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{candidat.nom}</p>
                            <div className="mt-1 space-y-1">
                              {besoins.map((besoin) => {
                                const joursDisponibles = candidat.joursDisponiblesParBesoin?.get(besoin.id) || []
                                const joursDisponiblesStr = joursDisponibles
                                  .map((d) => format(d, 'dd/MM', { locale: fr }))
                                  .join(', ')
                                const periodePartielle = selectedPeriodes.get(candidat.id)?.get(besoin.id)
                                return (
                                  <div key={besoin.id} className="text-xs">
                                    <p className="text-gray-600">
                                      {format(besoin.dateDebut, 'dd/MM', { locale: fr })} → {format(besoin.dateFin, 'dd/MM', { locale: fr })}: {joursDisponiblesStr || 'Aucun jour disponible'}
                                    </p>
                                    {isSelected && joursDisponibles.length > 0 && (
                                      <div className="mt-1 space-y-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const joursDisponibles = candidat.joursDisponiblesParBesoin?.get(besoin.id) || []
                                            if (joursDisponibles.length > 0) {
                                              const sorted = joursDisponibles.sort((a, b) => a.getTime() - b.getTime())
                                              const dateDebut = sorted[0]
                                              const dateFin = sorted[sorted.length - 1]
                                              setSelectedPeriodes((prev) => {
                                                const next = new Map(prev)
                                                if (!next.has(candidat.id)) {
                                                  next.set(candidat.id, new Map())
                                                }
                                                next.get(candidat.id)!.set(besoin.id, { dateDebut, dateFin })
                                                return next
                                              })
                                            }
                                          }}
                                          className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                        >
                                          Affecter jours disponibles
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setShowPeriodSelector(
                                              showPeriodSelector?.ressourceId === candidat.id && showPeriodSelector?.besoinId === besoin.id
                                                ? null
                                                : { ressourceId: candidat.id, besoinId: besoin.id }
                                            )
                                          }}
                                          className="text-xs px-2 py-0.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors ml-1"
                                        >
                                          {periodePartielle
                                            ? `Période: ${format(periodePartielle.dateDebut, 'dd/MM', { locale: fr })} → ${format(periodePartielle.dateFin, 'dd/MM', { locale: fr })}`
                                            : 'Choisir période'}
                                        </button>
                                        {showPeriodSelector?.ressourceId === candidat.id && showPeriodSelector?.besoinId === besoin.id && (
                                          <div className="mt-1 p-2 bg-white rounded border border-gray-300">
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
                                                setSelectedPeriodes((prev) => {
                                                  const next = new Map(prev)
                                                  if (!next.has(candidat.id)) {
                                                    next.set(candidat.id, new Map())
                                                  }
                                                  next.get(candidat.id)!.set(besoin.id, { dateDebut, dateFin })
                                                  return next
                                                })
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
                                                periodePartielle
                                                  ? format(periodePartielle.dateFin, 'yyyy-MM-dd')
                                                  : format(besoin.dateFin, 'yyyy-MM-dd')
                                              }
                                              onChange={(e) => {
                                                const dateFin = new Date(e.target.value)
                                                const dateDebut = periodePartielle?.dateDebut || besoin.dateDebut
                                                setSelectedPeriodes((prev) => {
                                                  const next = new Map(prev)
                                                  if (!next.has(candidat.id)) {
                                                    next.set(candidat.id, new Map())
                                                  }
                                                  next.get(candidat.id)!.set(besoin.id, { dateDebut, dateFin })
                                                  return next
                                                })
                                              }}
                                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ressources nécessitant transfert */}
            {candidatsNecessitantTransfert.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Ressources nécessitant transfert ({candidatsNecessitantTransfert.length})
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  Ces ressources ont la compétence mais sont sur un autre site. Un transfert sera créé automatiquement.
                </p>
                <div className="space-y-2">
                  {candidatsNecessitantTransfert.map((candidat) => {
                    const isSelected = selectedRessourceIds.has(candidat.id)
                    return (
                      <div
                        key={candidat.id}
                        onClick={() => handleToggleRessource(candidat.id)}
                        className={`
                          p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRessource(candidat.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{candidat.nom}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {candidat.site} → {sitesUniques[0]}
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ressources indisponibles */}
            {candidatsIndisponibles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Ressources indisponibles ({candidatsIndisponibles.length})
                </h4>
                <div className="space-y-2">
                  {candidatsIndisponibles.map((candidat) => (
                    <div
                      key={candidat.id}
                      className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" disabled className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-600">{candidat.nom}</p>
                          <div className="flex items-center gap-2 mt-1">
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

            {ressourcesCandidates.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune ressource disponible pour toutes les périodes sélectionnées</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleValider}
            disabled={loading || (selectedRessourceIds.size === 0 && idsToRemove.size === 0) || competencesUniques.length !== 1}
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
                Valider ({selectedRessourceIds.size > 0 ? `+${selectedRessourceIds.size * besoins.length}` : ''}{idsToRemove.size > 0 ? ` -${idsToRemove.size}` : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

