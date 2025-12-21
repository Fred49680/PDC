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
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Informations principales */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {format(besoin.dateDebut, 'dd/MM/yyyy', { locale: fr })} →{' '}
              {format(besoin.dateFin, 'dd/MM/yyyy', { locale: fr })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Besoin: <strong>{besoin.nbRessources}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Affecté: <strong>{besoin.couverture.affecte}</strong>
              </span>
            </div>
          </div>

          {/* Indicateur de statut */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-lg ${statut.color}`}>{statut.emoji}</span>
            <span className={`text-sm font-medium ${statut.color}`}>
              {statut.status === 'ok' && 'OK'}
              {statut.status === 'sous-affecte' && `Manque ${besoin.couverture.manque} ressource(s)`}
              {statut.status === 'sur-affecte' && `Sur-affecté de ${besoin.couverture.surplus} ressource(s)`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAffecter(besoin)}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Affecter
          </button>
          <button
            onClick={() => onModifier(besoin)}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSupprimer(besoin)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

