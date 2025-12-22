'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  const [idsToRemove, setIdsToRemove] = useState<Set<string>>(new Set()) // IDs des affectations à supprimer
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
    if (!besoin || (selectedIds.size === 0 && idsToRemove.size === 0)) {
      addToast('Veuillez sélectionner au moins une ressource ou en désélectionner une', 'error')
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
      if (selectedIds.size > 0) {
        const affectationsToCreate = Array.from(selectedIds).map((ressourceId) => ({
          ressourceId,
          competence: besoin.competence,
          dateDebut: besoin.dateDebut,
          dateFin: besoin.dateFin,
          charge: 1,
        }))

        // Fournir les ressources pour éviter les requêtes supplémentaires lors de la création des transferts
        const ressourcesMap = ressources.map((r) => ({ id: r.id, site: r.site }))

        await applyAffectationsBatch(affaireId, besoin.site, affectationsToCreate, ressourcesMap)
      }

      const nbTransferts = candidats.filter(
        (c) => selectedIds.has(c.id) && c.necessiteTransfert
      ).length

      let message = ''
      if (selectedIds.size > 0) {
        message += `${selectedIds.size} ressource(s) affectée(s)`
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
    } catch (error: any) {
      console.error('Erreur lors de l\'affectation:', error)
      addToast(error.message || 'Erreur lors de l\'affectation', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!besoin) return null

  // Séparer les candidats :
  // - Disponibles du même site (selectable && !necessiteTransfert)
  // - Disponibles nécessitant transfert (selectable && necessiteTransfert) - maintenant sélectionnables
  // - Indisponibles (absents ou en conflit) - non sélectionnables, mais uniquement celles qui ont la compétence
  const candidatsDisponiblesMemeSite = candidats.filter(
    (c) => c.selectable && !c.necessiteTransfert
  )
  const candidatsNecessitantTransfert = candidats.filter(
    (c) => c.selectable && c.necessiteTransfert
  )
  // Filtrer les indisponibles : seulement celles qui ont la compétence (absentes ou en conflit)
  // On vérifie qu'elles ont la compétence en vérifiant qu'elles sont absentes OU en conflit
  // mais pas simplement "pas sélectionnables" (car ça inclurait celles sans compétence)
  const candidatsIndisponibles = candidats.filter(
    (c) => !c.selectable && (c.isAbsente || c.hasConflit)
  )

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
              {selectedIds.size} ressource(s) sélectionnée(s) • {idsToRemove.size} ressource(s) à désaffecter
            </p>
          </div>

          {/* Ressources déjà affectées */}
          {ressourcesDejaAffectees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Ressources déjà affectées ({ressourcesDejaAffectees.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Décochez pour désaffecter ces ressources de l'affaire
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ressourcesDejaAffectees.map((ressource) => {
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
                          </p>
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
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ressources indisponibles (absentes ou en conflit) - En tuiles */}
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleValider}
            disabled={loading || (selectedIds.size === 0 && idsToRemove.size === 0)}
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
                Valider ({selectedIds.size > 0 ? `+${selectedIds.size}` : ''}{idsToRemove.size > 0 ? ` -${idsToRemove.size}` : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

