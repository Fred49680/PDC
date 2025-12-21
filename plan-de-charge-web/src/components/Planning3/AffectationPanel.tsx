'use client'

import React, { useState, useEffect } from 'react'
import { X, Users, CheckCircle2, AlertCircle, XCircle, MapPin } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import type { RessourceCandidat } from '@/utils/planning/planning.compute'
import { getRessourcesCandidates } from '@/utils/planning/planning.compute'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import { useToast } from '@/components/UI/Toast'
import { applyAffectationsBatch } from '@/utils/planning/planning.api'

interface AffectationPanelProps {
  besoin: BesoinPeriode | null
  affaireId: string // Numéro de compte (affaire_id)
  affaireUuid: string // UUID de l'affaire dans la base
  ressources: Ressource[]
  competences: Map<string, RessourceCompetence[]>
  affectations: Affectation[]
  absences: Absence[]
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
  onClose,
  onSuccess,
}: AffectationPanelProps) {
  const [candidats, setCandidats] = useState<RessourceCandidat[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
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

  const handleValider = async () => {
    if (!besoin || selectedIds.size === 0) {
      addToast('Veuillez sélectionner au moins une ressource', 'error')
      return
    }

    setLoading(true)
    try {
      const affectationsToCreate = Array.from(selectedIds).map((ressourceId) => ({
        ressourceId,
        competence: besoin.competence,
        dateDebut: besoin.dateDebut,
        dateFin: besoin.dateFin,
        charge: 1,
      }))

      await applyAffectationsBatch(affaireId, besoin.site, affectationsToCreate)

      addToast(`${selectedIds.size} ressource(s) affectée(s) avec succès`, 'success')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'affectation:', error)
      addToast(error.message || 'Erreur lors de l\'affectation', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!besoin) return null

  const candidatsDisponibles = candidats.filter((c) => c.selectable)
  const candidatsIndisponibles = candidats.filter((c) => !c.selectable)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Compteur de sélection */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              {selectedIds.size} / {besoin.nbRessources} ressource(s) sélectionnée(s)
            </p>
          </div>

          {/* Ressources disponibles */}
          {candidatsDisponibles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Ressources disponibles ({candidatsDisponibles.length})
              </h3>
              <div className="space-y-2">
                {candidatsDisponibles.map((candidat) => {
                  const isSelected = selectedIds.has(candidat.id)
                  return (
                    <div
                      key={candidat.id}
                      onClick={() => handleToggle(candidat.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggle(candidat.id)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">{candidat.nom}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {candidat.site}
                              </span>
                              {candidat.isPrincipale && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                  Principale
                                </span>
                              )}
                              {candidat.necessiteTransfert && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                  Transfert requis
                                </span>
                              )}
                            </div>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Ressources indisponibles ({candidatsIndisponibles.length})
              </h3>
              <div className="space-y-2">
                {candidatsIndisponibles.map((candidat) => (
                  <div
                    key={candidat.id}
                    className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled
                          className="w-5 h-5 text-gray-400 rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-600">{candidat.nom}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            {candidat.isAbsente && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Absente
                              </span>
                            )}
                            {candidat.hasConflit && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Conflit avec autre affaire
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {candidats.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Aucune ressource disponible pour cette compétence</p>
            </div>
          )}
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
            disabled={loading || selectedIds.size === 0}
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
                Valider ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

