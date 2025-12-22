'use client'

import React, { useMemo } from 'react'
import { format, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval, isWeekend, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { isBusinessDay, getISOWeek } from '@/utils/calendar'
import type { PeriodeCharge } from '@/types/charge'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import type { Ressource } from '@/types/affectations'
import type { Precision } from '@/types/charge'

interface GanttChartProps {
  periodes: PeriodeCharge[]
  affectations: Affectation[]
  absences: Absence[]
  ressources: Ressource[]
  dateDebut: Date
  dateFin: Date
  precision: Precision
  viewMode: 'affaire' | 'site'
  affaireId?: string
  site: string
}

interface GanttBar {
  id: string
  type: 'besoin' | 'affectation' | 'absence'
  ressourceId?: string
  ressourceNom?: string
  competence?: string
  dateDebut: Date
  dateFin: Date
  charge?: number
  nbRessources?: number
  absenceType?: string
  color: string
}

export function GanttChart({
  periodes,
  affectations,
  absences,
  ressources,
  dateDebut,
  dateFin,
  precision,
  viewMode,
  affaireId,
  site,
}: GanttChartProps) {
  // Générer les colonnes selon la précision
  const columns = useMemo(() => {
    if (precision === 'JOUR') {
      return eachDayOfInterval({ start: dateDebut, end: dateFin })
    } else if (precision === 'SEMAINE') {
      return eachWeekOfInterval({ start: dateDebut, end: dateFin }, { weekStartsOn: 1 })
    } else {
      return eachMonthOfInterval({ start: dateDebut, end: dateFin })
    }
  }, [precision, dateDebut, dateFin])

  // Calculer la largeur des colonnes
  const columnWidth = useMemo(() => {
    if (precision === 'JOUR') return 40
    if (precision === 'SEMAINE') return 80
    return 120
  }, [precision])

  // Créer les barres Gantt
  const bars = useMemo(() => {
    const ganttBars: GanttBar[] = []

    // Couleurs pour les sites (si vue par site)
    const siteColors: Record<string, string> = {
      'PARIS': '#3B82F6', // Bleu
      'LYON': '#10B981', // Vert
      'MARSEILLE': '#F59E0B', // Orange
      'TOULOUSE': '#EF4444', // Rouge
      'NANTES': '#8B5CF6', // Violet
    }

    // Couleurs pour les types d'absence
    const absenceColors: Record<string, string> = {
      'Formation': '#CFA6FF', // Violet
      'Congés payés': '#99F5FF', // Cyan
      'Maladie': '#8080FF', // Bleu clair
      'Paternité': '#FFD8BD', // Orange clair
      'Parental': '#C8F0C4', // Vert clair
      'Maternité': '#E3CDFF', // Rose
      'Autre': '#A2A2A2', // Gris
    }

    // Ajouter les besoins (périodes de charge)
    periodes.forEach((periode) => {
      const affaire = periode.affaire_id // UUID de l'affaire
      const siteColor = siteColors[periode.site] || '#9AD3C7' // Turquoise par défaut
      
      ganttBars.push({
        id: `besoin-${periode.id}`,
        type: 'besoin',
        competence: periode.competence,
        dateDebut: new Date(periode.date_debut),
        dateFin: new Date(periode.date_fin),
        nbRessources: periode.nb_ressources,
        color: viewMode === 'site' ? siteColor : '#FBBF24', // Jaune pour les besoins
      })
    })

    // Ajouter les affectations
    affectations.forEach((affectation) => {
      const ressource = ressources.find((r) => r.id === affectation.ressource_id)
      const ressourceNom = ressource?.nom || 'Ressource inconnue'
      const siteColor = siteColors[affectation.site] || '#9AD3C7'
      
      ganttBars.push({
        id: `affectation-${affectation.id}`,
        type: 'affectation',
        ressourceId: affectation.ressource_id,
        ressourceNom,
        competence: affectation.competence,
        dateDebut: new Date(affectation.date_debut),
        dateFin: new Date(affectation.date_fin),
        charge: affectation.charge || 1,
        color: viewMode === 'site' ? siteColor : '#3B82F6', // Bleu pour les affectations
      })
    })

    // Ajouter les absences
    absences.forEach((absence) => {
      const ressource = ressources.find((r) => r.id === absence.ressource_id)
      if (!ressource) return
      
      const absenceType = absence.type || 'Autre'
      const absenceColor = absenceColors[absenceType] || absenceColors['Autre']
      
      ganttBars.push({
        id: `absence-${absence.id}`,
        type: 'absence',
        ressourceId: absence.ressource_id,
        ressourceNom: ressource.nom,
        dateDebut: new Date(absence.date_debut),
        dateFin: new Date(absence.date_fin),
        absenceType,
        color: absenceColor,
      })
    })

    return ganttBars
  }, [periodes, affectations, absences, ressources, viewMode])

  // Grouper les barres par ressource (pour l'affichage)
  const barsByRessource = useMemo(() => {
    const grouped: Record<string, GanttBar[]> = {}

    bars.forEach((bar) => {
      if (bar.ressourceId) {
        if (!grouped[bar.ressourceId]) {
          grouped[bar.ressourceId] = []
        }
        grouped[bar.ressourceId].push(bar)
      }
    })

    return grouped
  }, [bars])

  // Calculer la position et la largeur d'une barre
  const getBarStyle = (bar: GanttBar) => {
    const startDate = new Date(bar.dateDebut)
    const endDate = new Date(bar.dateFin)
    
    // S'assurer que les dates sont dans la plage visible
    const visibleStart = startDate < dateDebut ? dateDebut : startDate
    const visibleEnd = endDate > dateFin ? dateFin : endDate

    let left = 0
    let width = 0

    if (precision === 'JOUR') {
      const startIndex = columns.findIndex((col) => isSameDay(col, visibleStart))
      const endIndex = columns.findIndex((col) => isSameDay(col, visibleEnd))
      
      if (startIndex >= 0 && endIndex >= 0) {
        left = startIndex * columnWidth
        width = (endIndex - startIndex + 1) * columnWidth
      }
    } else if (precision === 'SEMAINE') {
      const startWeek = startOfWeek(visibleStart, { weekStartsOn: 1 })
      const endWeek = endOfWeek(visibleEnd, { weekStartsOn: 1 })
      
      const startIndex = columns.findIndex((col) => isSameDay(col, startWeek))
      const endIndex = columns.findIndex((col) => isSameDay(col, endWeek))
      
      if (startIndex >= 0 && endIndex >= 0) {
        left = startIndex * columnWidth
        width = (endIndex - startIndex + 1) * columnWidth
      }
    } else {
      const startMonth = new Date(visibleStart.getFullYear(), visibleStart.getMonth(), 1)
      const endMonth = new Date(visibleEnd.getFullYear(), visibleEnd.getMonth() + 1, 0)
      
      const startIndex = columns.findIndex((col) => 
        col.getFullYear() === startMonth.getFullYear() && col.getMonth() === startMonth.getMonth()
      )
      const endIndex = columns.findIndex((col) => 
        col.getFullYear() === endMonth.getFullYear() && col.getMonth() === endMonth.getMonth()
      )
      
      if (startIndex >= 0 && endIndex >= 0) {
        left = startIndex * columnWidth
        width = (endIndex - startIndex + 1) * columnWidth
      }
    }

    return { left, width: Math.max(width, columnWidth) }
  }

  // Filtrer les ressources à afficher (seulement celles avec des affectations/absences)
  const ressourcesAffichees = useMemo(() => {
    const ressourceIds = new Set<string>()
    
    bars.forEach((bar) => {
      if (bar.ressourceId) {
        ressourceIds.add(bar.ressourceId)
      }
    })

    return ressources.filter((r) => ressourceIds.has(r.id))
  }, [ressources, bars])

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full">
        {/* En-tête avec les dates */}
        <div className="flex border-b-2 border-gray-300 sticky top-0 bg-white z-10">
          <div className="w-64 p-3 font-semibold text-gray-700 border-r-2 border-gray-300 bg-gray-50">
            {viewMode === 'affaire' ? 'Ressource / Compétence' : 'Affaire / Ressource'}
          </div>
          <div className="flex-1 flex">
            {columns.map((col, index) => {
              let label = ''
              let subLabel = ''
              
              if (precision === 'JOUR') {
                label = format(col, 'dd/MM', { locale: fr })
                subLabel = format(col, 'EEE', { locale: fr })
                const isWeekendDay = isWeekend(col)
                const isHoliday = !isBusinessDay(col)
                return (
                  <div
                    key={index}
                    className={`flex-shrink-0 p-2 text-center border-r border-gray-200 ${
                      isWeekendDay ? 'bg-gray-100' : isHoliday ? 'bg-blue-50' : 'bg-white'
                    }`}
                    style={{ width: columnWidth }}
                  >
                    <div className="text-xs font-semibold text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500">{subLabel}</div>
                  </div>
                )
              } else if (precision === 'SEMAINE') {
                const weekStart = startOfWeek(col, { weekStartsOn: 1 })
                const weekEnd = endOfWeek(col, { weekStartsOn: 1 })
                label = `S${getISOWeek(weekStart)}`
                subLabel = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`
              } else {
                label = format(col, 'MMMM yyyy', { locale: fr })
                subLabel = format(col, 'yyyy-MM', { locale: fr })
              }
              
              return (
                <div
                  key={index}
                  className="flex-shrink-0 p-2 text-center border-r border-gray-200 bg-white"
                  style={{ width: columnWidth }}
                >
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  {subLabel && <div className="text-xs text-gray-500">{subLabel}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Corps du Gantt */}
        <div className="relative">
          {ressourcesAffichees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune ressource avec affectation ou absence dans cette période
            </div>
          ) : (
            ressourcesAffichees.map((ressource) => {
              const ressourceBars = barsByRessource[ressource.id] || []
              
              return (
                <div key={ressource.id} className="border-b border-gray-200">
                  <div className="flex items-center relative h-16">
                    {/* Label ressource */}
                    <div className="w-64 p-3 font-medium text-gray-800 border-r-2 border-gray-300 bg-gray-50 flex-shrink-0">
                      <div className="font-semibold">{ressource.nom}</div>
                      <div className="text-xs text-gray-500">{ressource.site}</div>
                    </div>

                    {/* Zone des barres */}
                    <div className="flex-1 relative h-full">
                      {ressourceBars.map((bar) => {
                        const style = getBarStyle(bar)
                        const tooltip = 
                          bar.type === 'besoin'
                            ? `Besoin: ${bar.competence} - ${bar.nbRessources} ressource(s)`
                            : bar.type === 'affectation'
                            ? `Affectation: ${bar.ressourceNom} - ${bar.competence}`
                            : `Absence: ${bar.ressourceNom} - ${bar.absenceType}`
                        
                        return (
                          <div
                            key={bar.id}
                            className="absolute h-8 rounded-md shadow-sm flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              left: `${style.left}px`,
                              width: `${style.width}px`,
                              backgroundColor: bar.color,
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                            title={tooltip}
                          >
                            {bar.type === 'besoin' && (
                              <span className="px-2 truncate">
                                {bar.competence} ({bar.nbRessources})
                              </span>
                            )}
                            {bar.type === 'affectation' && (
                              <span className="px-2 truncate">
                                {bar.competence}
                              </span>
                            )}
                            {bar.type === 'absence' && (
                              <span className="px-2 truncate">
                                {bar.absenceType}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Légende */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-3">Légende</div>
        <div className="flex flex-wrap gap-4">
          {viewMode === 'affaire' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                <span className="text-sm text-gray-700">Besoin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm text-gray-700">Affectation</span>
              </div>
            </>
          )}
          {viewMode === 'site' && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-700">Par site (couleur variable)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-300"></div>
            <span className="text-sm text-gray-700">Formation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-300"></div>
            <span className="text-sm text-gray-700">Congés payés</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-300"></div>
            <span className="text-sm text-gray-700">Maladie</span>
          </div>
        </div>
      </div>
    </div>
  )
}

