'use client'

import React from 'react'
import { Target } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { BesoinCard } from './BesoinCard'
import { grouperBesoinsParCompetence } from '@/utils/planning/planning.compute'

interface BesoinsListProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onModifier: (besoin: BesoinPeriode) => void
  onSupprimer: (besoin: BesoinPeriode) => void
}

export function BesoinsList({ besoins, onAffecter, onModifier, onSupprimer }: BesoinsListProps) {
  const besoinsParCompetence = grouperBesoinsParCompetence(besoins)

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
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

