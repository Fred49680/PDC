'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Users, CheckCircle2, AlertCircle, XCircle, MapPin } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import { useToast } from '@/components/UI/Toast'
import { applyAffectationsBatch } from '@/utils/planning/planning.api'
import { isDisponible, hasConflitAffaire, isAbsente } from '@/utils/planning/planning.rules'

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

        for (const besoin of besoins) {
          const abs = isAbsente(ressource.id, besoin.dateDebut, besoin.dateFin, absences)
          const conflit = hasConflitAffaire(
            ressource.id,
            besoin.dateDebut,
            besoin.dateFin,
            affectations,
            affaireUuid
          )

          if (abs) isAbs = true
          if (conflit) hasConflit = true
          if (abs || conflit) {
            isDispo = false
            break
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
          necessiteTransfert,
          selectable: hasCompetence && isDispo,
        }
      })
      .filter((r) => r.selectable || r.necessiteTransfert) // Afficher aussi celles nécessitant transfert
  }, [besoins, ressources, competences, affectations, absences, affaireUuid, competencesUniques, sitesUniques])

  const candidatsDisponibles = ressourcesCandidates.filter((c) => c.selectable && !c.necessiteTransfert)
  const candidatsNecessitantTransfert = ressourcesCandidates.filter((c) => c.selectable && c.necessiteTransfert)
  const candidatsIndisponibles = ressourcesCandidates.filter((c) => !c.selectable)

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

  const handleValider = async () => {
    if (selectedRessourceIds.size === 0) {
      addToast('Veuillez sélectionner au moins une ressource', 'error')
      return
    }

    if (competencesUniques.length !== 1) {
      addToast('Toutes les périodes doivent avoir la même compétence', 'error')
      return
    }

    setLoading(true)
    try {
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
        for (const besoin of besoins) {
          affectationsToCreate.push({
            ressourceId,
            competence,
            dateDebut: besoin.dateDebut,
            dateFin: besoin.dateFin,
            charge: 1,
          })
        }
      }

      // Fournir les ressources pour éviter les requêtes supplémentaires lors de la création des transferts
      const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))

      await applyAffectationsBatch(affaireId, site, affectationsToCreate, ressourcesMap)

      const nbTransferts = Array.from(selectedRessourceIds).filter(
        (id) => ressourcesCandidates.find((c) => c.id === id)?.necessiteTransfert
      ).length

      let message = `${affectationsToCreate.length} affectation(s) créée(s) avec succès`
      if (nbTransferts > 0) {
        message += ` (${nbTransferts} transfert(s) créé(s) automatiquement)`
      }

      addToast(message, 'success')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'affectation de masse:', error)
      addToast(error.message || 'Erreur lors de l\'affectation de masse', 'error')
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
                    {besoin.dateFin.toLocaleDateString('fr-FR')} (Besoin: {besoin.nbRessources})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sélection de la ressource */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Sélectionner des ressources ({selectedRessourceIds.size} sélectionnée(s)) :
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
            disabled={loading || selectedRessourceIds.size === 0 || competencesUniques.length !== 1}
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
                Valider ({selectedRessourceIds.size * besoins.length} affectation(s))
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

