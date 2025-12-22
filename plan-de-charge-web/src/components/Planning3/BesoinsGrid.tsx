'use client'

import React, { useState, useMemo } from 'react'
import { Target, CheckSquare, Square, Calendar, Users, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { grouperBesoinsParCompetence, getStatutIndicateur } from '@/utils/planning/planning.compute'
import { getISOWeek, getISOYear } from '@/utils/calendar'

interface BesoinsGridProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onAffecterMasse?: (besoins: BesoinPeriode[]) => void
}

export function BesoinsGrid({ 
  besoins, 
  onAffecter, 
  onAffecterMasse 
}: BesoinsGridProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedBesoins, setSelectedBesoins] = useState<Set<string>>(new Set())
  const besoinsParCompetence = grouperBesoinsParCompetence(besoins)
  
  // Calculer le statut global de chaque compétence
  const statutParCompetence = useMemo(() => {
    const statuts = new Map<string, 'ok' | 'sous-affecte' | 'sur-affecte'>()
    besoinsParCompetence.forEach((periodes, competence) => {
      const tousOk = periodes.every((p) => {
        const statut = getStatutIndicateur(p.couverture)
        return statut.status === 'ok'
      })
      if (tousOk) {
        statuts.set(competence, 'ok')
      } else {
        const aSurAffecte = periodes.some((p) => {
          const statut = getStatutIndicateur(p.couverture)
          return statut.status === 'sur-affecte'
        })
        const aSousAffecte = periodes.some((p) => {
          const statut = getStatutIndicateur(p.couverture)
          return statut.status === 'sous-affecte'
        })
        if (aSurAffecte) {
          statuts.set(competence, 'sur-affecte')
        } else if (aSousAffecte) {
          statuts.set(competence, 'sous-affecte')
        }
      }
    })
    return statuts
  }, [besoinsParCompetence])

  const handleToggleSelect = (besoin: BesoinPeriode) => {
    setSelectedBesoins((prev) => {
      const next = new Set(prev)
      if (next.has(besoin.id)) {
        next.delete(besoin.id)
      } else {
        next.add(besoin.id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedBesoins.size === besoins.length) {
      setSelectedBesoins(new Set())
    } else {
      setSelectedBesoins(new Set(besoins.map((b) => b.id)))
    }
  }

  const handleAffecterMasse = () => {
    const selected = besoins.filter((b) => selectedBesoins.has(b.id))
    if (selected.length > 0 && onAffecterMasse) {
      onAffecterMasse(selected)
      setIsSelectionMode(false)
      setSelectedBesoins(new Set())
    }
  }

  const handleCancelSelection = () => {
    setIsSelectionMode(false)
    setSelectedBesoins(new Set())
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

  // Aplatir tous les besoins pour le tableau
  const allBesoins = Array.from(besoinsParCompetence.entries()).flatMap(([competence, periodes]) =>
    periodes.map((besoin) => ({ ...besoin, competence }))
  )

  return (
    <div className="space-y-6">
      {/* Barre d'outils pour le mode sélection */}
      {isSelectionMode && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedBesoins.size} période(s) sélectionnée(s)
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {selectedBesoins.size === besoins.length ? (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Tout désélectionner
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    Tout sélectionner
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAffecterMasse}
                disabled={selectedBesoins.size === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Affecter ({selectedBesoins.size})
              </button>
              <button
                onClick={handleCancelSelection}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton pour activer le mode sélection */}
      {!isSelectionMode && besoins.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsSelectionMode(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium flex items-center gap-2 shadow-md"
          >
            <CheckSquare className="w-4 h-4" />
            Mode sélection multiple
          </button>
        </div>
      )}

      {/* Tableau grille */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <tr>
                {isSelectionMode && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedBesoins.size === besoins.length && besoins.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Compétence
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Besoin
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Affecté
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                {!isSelectionMode && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allBesoins.map((besoin) => {
                const statut = getStatutIndicateur(besoin.couverture)
                const isSelected = selectedBesoins.has(besoin.id)
                const competenceStatut = statutParCompetence.get(besoin.competence)
                
                return (
                  <tr
                    key={besoin.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      isSelectionMode && isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    {isSelectionMode && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(besoin)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                        <span className="font-medium text-gray-900">{besoin.competence}</span>
                        {competenceStatut === 'ok' && (
                          <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-semibold">
                            OK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(besoin.dateDebut, 'dd/MM', { locale: fr })} → {format(besoin.dateFin, 'dd/MM', { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(besoin.dateDebut, 'yyyy', { locale: fr })}{' '}
                            <span className="text-gray-400">
                              (S{String(getISOWeek(besoin.dateDebut)).padStart(2, '0')}-{getISOYear(besoin.dateDebut)})
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-800">{besoin.nbRessources}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-800">{besoin.couverture.affecte}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-lg ${statut.color}`}>{statut.emoji}</span>
                        <span className={`text-sm font-medium ${statut.color}`}>
                          {statut.status === 'ok' && 'OK'}
                          {statut.status === 'sous-affecte' && `Manque ${besoin.couverture.manque}`}
                          {statut.status === 'sur-affecte' && `+${besoin.couverture.surplus}`}
                        </span>
                      </div>
                    </td>
                    {!isSelectionMode && (
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onAffecter(besoin)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Affecter
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

