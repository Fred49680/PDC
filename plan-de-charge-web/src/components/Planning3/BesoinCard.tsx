'use client'

import React from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Users, CheckCircle2, AlertCircle, XCircle, Edit, Trash2 } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { getStatutIndicateur } from '@/utils/planning/planning.compute'

interface BesoinCardProps {
  besoin: BesoinPeriode
  onAffecter: (besoin: BesoinPeriode) => void
  onModifier: (besoin: BesoinPeriode) => void
  onSupprimer: (besoin: BesoinPeriode) => void
}

export function BesoinCard({ besoin, onAffecter, onModifier, onSupprimer }: BesoinCardProps) {
  const statut = getStatutIndicateur(besoin.couverture)

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-lg transition-all flex flex-col h-full">
      {/* En-tête avec dates */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-700 truncate">
            {format(besoin.dateDebut, 'dd/MM', { locale: fr })} → {format(besoin.dateFin, 'dd/MM', { locale: fr })}
          </div>
          <div className="text-xs text-gray-500">
            {format(besoin.dateDebut, 'yyyy', { locale: fr })}
          </div>
        </div>
      </div>

      {/* Informations ressources */}
      <div className="space-y-2 mb-3 flex-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-600">Besoin:</span>
          </div>
          <strong className="text-gray-800">{besoin.nbRessources}</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-600">Affecté:</span>
          </div>
          <strong className="text-gray-800">{besoin.couverture.affecte}</strong>
        </div>
      </div>

      {/* Indicateur de statut */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`text-base ${statut.color}`}>{statut.emoji}</span>
        <span className={`text-xs font-medium ${statut.color} truncate`}>
          {statut.status === 'ok' && 'OK'}
          {statut.status === 'sous-affecte' && `Manque ${besoin.couverture.manque}`}
          {statut.status === 'sur-affecte' && `+${besoin.couverture.surplus}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
        <button
          onClick={() => onAffecter(besoin)}
          className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center justify-center gap-1"
        >
          <Users className="w-3.5 h-3.5" />
          Affecter
        </button>
        <button
          onClick={() => onModifier(besoin)}
          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Modifier"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSupprimer(besoin)}
          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

