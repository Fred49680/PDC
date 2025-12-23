'use client'

import React from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Users, CheckCircle2 } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { getStatutIndicateur } from '@/utils/planning/planning.compute'
import { getISOWeek, getISOYear } from '@/utils/calendar'

interface BesoinCardProps {
  besoin: BesoinPeriode
  onAffecter: (besoin: BesoinPeriode) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (besoin: BesoinPeriode) => void
}

export function BesoinCard({ 
  besoin, 
  onAffecter, 
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect
}: BesoinCardProps) {
  const statut = getStatutIndicateur(besoin.couverture)

  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(besoin)
    }
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border-2 p-2.5 hover:shadow-lg transition-all flex flex-col h-full cursor-pointer ${
        isSelectionMode 
          ? isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-blue-300'
          : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      {/* En-tête avec dates */}
      <div className="flex items-center gap-1.5 mb-2">
        {isSelectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(besoin)}
            onClick={(e) => e.stopPropagation()}
            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
          />
        )}
        <Calendar className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-gray-700 truncate">
            {format(besoin.dateDebut, 'dd/MM', { locale: fr })} → {format(besoin.dateFin, 'dd/MM', { locale: fr })}
          </div>
          <div className="text-[9px] text-gray-500">
            {format(besoin.dateDebut, 'yyyy', { locale: fr })}{' '}
            <span className="text-gray-400">
              (S{String(getISOWeek(besoin.dateDebut)).padStart(2, '0')}-{getISOYear(besoin.dateDebut)})
            </span>
          </div>
        </div>
      </div>

      {/* Informations ressources */}
      <div className="space-y-1.5 mb-2 flex-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">Besoin:</span>
          </div>
          <strong className="text-gray-800">{besoin.nbRessources}</strong>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">Affecté:</span>
          </div>
          <strong className="text-gray-800">{besoin.couverture.affecte}</strong>
        </div>
      </div>

      {/* Indicateur de statut */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`text-sm ${statut.color}`}>{statut.emoji}</span>
        <span className={`text-[10px] font-medium ${statut.color} truncate`}>
          {statut.status === 'ok' && 'OK'}
          {statut.status === 'sous-affecte' && `Manque ${besoin.couverture.manque}`}
          {statut.status === 'sur-affecte' && `+${besoin.couverture.surplus}`}
        </span>
      </div>

      {/* Actions */}
      {!isSelectionMode && (
        <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAffecter(besoin)
            }}
            className="flex-1 px-1.5 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-[10px] font-medium flex items-center justify-center gap-0.5"
          >
            <Users className="w-3 h-3" />
            Affecter
          </button>
        </div>
      )}
    </div>
  )
}

