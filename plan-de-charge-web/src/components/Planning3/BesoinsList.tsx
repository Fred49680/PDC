'use client'

import React, { useState } from 'react'
import { Target, CheckSquare, Square } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { BesoinCard } from './BesoinCard'
import { grouperBesoinsParCompetence } from '@/utils/planning/planning.compute'

interface BesoinsListProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onModifier: (besoin: BesoinPeriode) => void
  onSupprimer: (besoin: BesoinPeriode) => void
  onAffecterMasse?: (besoins: BesoinPeriode[]) => void
}

export function BesoinsList({ 
  besoins, 
  onAffecter, 
  onModifier, 
  onSupprimer,
  onAffecterMasse 
}: BesoinsListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedBesoins, setSelectedBesoins] = useState<Set<string>>(new Set())
  const besoinsParCompetence = grouperBesoinsParCompetence(besoins)

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

      {Array.from(besoinsParCompetence.entries()).map(([competence, periodes]) => (
        <div key={competence} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-800">{competence}</h3>
          </div>

          {/* Grille de tuiles : 5 par ligne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {periodes.map((besoin) => (
              <BesoinCard
                key={besoin.id}
                besoin={besoin}
                onAffecter={onAffecter}
                onModifier={onModifier}
                onSupprimer={onSupprimer}
                isSelectionMode={isSelectionMode}
                isSelected={selectedBesoins.has(besoin.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

