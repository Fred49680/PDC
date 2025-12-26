'use client'

import React, { useState, useMemo } from 'react'
import { Target, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { BesoinCard } from './BesoinCard'
import { grouperBesoinsParCompetence, grouperBesoinsParPeriode, getStatutIndicateur } from '@/utils/planning/planning.compute'
import type { Precision } from '@/types/charge'

interface BesoinsListProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onAffecterMasse?: (besoins: BesoinPeriode[]) => void
  showExternesGlobal?: boolean // Toggle pour ressources externes
  precision?: Precision // Précision pour le groupement
  dateDebut?: Date // Date de début pour le filtrage
  dateFin?: Date // Date de fin pour le filtrage
}

export function BesoinsList({ 
  besoins, 
  onAffecter, 
  onAffecterMasse,
  showExternesGlobal = false,
  precision = 'JOUR',
  dateDebut,
  dateFin
}: BesoinsListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedBesoins, setSelectedBesoins] = useState<Set<string>>(new Set())
  
  // Grouper par période si precision, dateDebut et dateFin sont fournis
  const besoinsParCompetenceEtPeriode = useMemo(() => {
    if (precision && dateDebut && dateFin) {
      return grouperBesoinsParPeriode(besoins, precision, dateDebut, dateFin)
    }
    // Sinon, grouper uniquement par compétence
    const besoinsParCompetence = grouperBesoinsParCompetence(besoins)
    const result = new Map<string, Array<{ cle: string; label: string; dateDebut: Date; dateFin: Date; besoins: BesoinPeriode[] }>>()
    besoinsParCompetence.forEach((periodes, competence) => {
      result.set(competence, [{
        cle: 'all',
        label: 'Toutes les périodes',
        dateDebut: new Date(Math.min(...periodes.map(p => p.dateDebut.getTime()))),
        dateFin: new Date(Math.max(...periodes.map(p => p.dateFin.getTime()))),
        besoins: periodes
      }])
    })
    return result
  }, [besoins, precision, dateDebut, dateFin])
  
  const besoinsParCompetence = grouperBesoinsParCompetence(besoins)
  
  // État pour gérer l'expansion/réduction de chaque compétence (par défaut toutes réduites)
  const [expandedCompetences, setExpandedCompetences] = useState<Set<string>>(new Set())
  
  // Calculer le statut global de chaque compétence
  const statutParCompetence = useMemo(() => {
    const statuts = new Map<string, 'ok' | 'sous-affecte' | 'sur-affecte'>()
    besoinsParCompetence.forEach((periodes, competence) => {
      // Si toutes les périodes sont OK, le statut global est OK
      const tousOk = periodes.every((p) => {
        const statut = getStatutIndicateur(p.couverture)
        return statut.status === 'ok'
      })
      if (tousOk) {
        statuts.set(competence, 'ok')
      } else {
        // Sinon, on vérifie s'il y a au moins un sur-affecté ou sous-affecté
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

      {Array.from(besoinsParCompetenceEtPeriode.entries()).map(([competence, groupes]) => {
        const isExpanded = expandedCompetences.has(competence)
        const statutGlobal = statutParCompetence.get(competence)
        const isOk = statutGlobal === 'ok'
        
        return (
          <div key={competence} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            {/* En-tête avec nom, statut et flèche */}
            <div 
              className="flex items-center gap-3 p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => toggleCompetence(competence)}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full flex-shrink-0"></div>
              <div className="flex items-center gap-3 flex-1">
                <h3 className="text-xl font-bold text-gray-800">{competence}</h3>
                {isOk && (
                  <div className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    OK
                  </div>
                )}
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

            {/* Contenu (groupes de périodes) - affiché seulement si expandé */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-6">
                {groupes.map((groupe) => (
                  <div key={`${competence}-${groupe.cle}`} className="space-y-3">
                    {/* En-tête du groupe de période */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700">{groupe.label}</h4>
                      <span className="text-xs text-gray-500">
                        ({groupe.besoins.length} période{groupe.besoins.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    {/* Grille de tuiles pour ce groupe */}
                    {/* Pour jour/semaine : 5 colonnes par ligne (5 semaines), pour mois : 4 colonnes max */}
                    <div className={`grid gap-3 ${
                      precision === 'MOIS' 
                        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5'
                    }`}>
                      {groupe.besoins.map((besoin) => (
                        <BesoinCard
                          key={besoin.id}
                          besoin={besoin}
                          onAffecter={onAffecter}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedBesoins.has(besoin.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

