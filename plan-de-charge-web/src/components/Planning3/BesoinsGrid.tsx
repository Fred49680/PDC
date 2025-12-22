'use client'

import React, { useState, useMemo } from 'react'
import { Target, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { getDatesBetween, normalizeDateToUTC } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import type { Precision } from '@/types/charge'

interface BesoinsGridProps {
  besoins: BesoinPeriode[]
  onAffecter: (besoin: BesoinPeriode) => void
  onAffecterMasse?: (besoins: BesoinPeriode[]) => void
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
}

interface ColonneDate {
  date: Date
  label: string
  shortLabel: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
  weekStart?: Date
  weekEnd?: Date
}

const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())

// Fonction pour obtenir le format semaine ISO avec année : "01-2026"
const getSemaineISOWithYear = (date: Date): string => {
  const dayOfWeek = date.getDay() || 7
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOfWeek + 1)
  
  const thursday = new Date(weekStart)
  thursday.setDate(weekStart.getDate() + 3)
  const isoYear = thursday.getFullYear()
  
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - jan4Day + 1)
  
  const diffTime = weekStart.getTime() - jan4WeekStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  
  if (weekNumber < 1) {
    const prevJan4 = new Date(isoYear - 1, 0, 4)
    const prevJan4Day = prevJan4.getDay() || 7
    const prevJan4WeekStart = new Date(prevJan4)
    prevJan4WeekStart.setDate(prevJan4.getDate() - prevJan4Day + 1)
    const prevDiffTime = weekStart.getTime() - prevJan4WeekStart.getTime()
    const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24))
    const prevWeekNumber = Math.floor(prevDiffDays / 7) + 1
    return `${prevWeekNumber.toString().padStart(2, '0')}-${isoYear - 1}`
  } else if (weekNumber > 52) {
    const nextJan4 = new Date(isoYear + 1, 0, 4)
    const nextJan4Day = nextJan4.getDay() || 7
    const nextJan4WeekStart = new Date(nextJan4)
    nextJan4WeekStart.setDate(nextJan4.getDate() - nextJan4Day + 1)
    
    if (weekStart >= nextJan4WeekStart) {
      return `01-${isoYear + 1}`
    }
    return `53-${isoYear}`
  }
  
  return `${weekNumber.toString().padStart(2, '0')}-${isoYear}`
}

export function BesoinsGrid({ 
  besoins, 
  onAffecter, 
  onAffecterMasse,
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision
}: BesoinsGridProps) {
  const { affectations, loading: loadingAffectations } = useAffectations({
    affaireId,
    site,
    autoRefresh: true,
    enableRealtime: true,
  })

  const { ressources, competences, loading: loadingRessources } = useRessources({
    site,
    actif: true,
    enableRealtime: true,
  })

  // État pour gérer l'expansion/réduction de chaque compétence (par défaut toutes réduites)
  const [expandedCompetences, setExpandedCompetences] = useState<Set<string>>(new Set())

  // Grouper les ressources par compétence
  const ressourcesParCompetence = useMemo(() => {
    const map = new Map<string, typeof ressources>()
    
    ressources.forEach((ressource) => {
      const ressourceCompetences = competences.get(ressource.id) || []
      ressourceCompetences.forEach((comp) => {
        if (!map.has(comp.competence)) {
          map.set(comp.competence, [])
        }
        map.get(comp.competence)!.push(ressource)
      })
    })
    
    // Trier les compétences et les ressources dans chaque groupe
    const sortedMap = new Map<string, typeof ressources>()
    Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([competence, ressources]) => {
        sortedMap.set(competence, ressources.sort((a, b) => a.nom.localeCompare(b.nom)))
      })
    
    return sortedMap
  }, [ressources, competences])

  // Générer les colonnes de dates selon la précision
  const colonnes = useMemo(() => {
    const cols: ColonneDate[] = []
    
    if (precision === 'JOUR') {
      const dates = getDatesBetween(dateDebut, dateFin)
      dates.forEach((date) => {
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })
        const day = date.getDate().toString().padStart(2, '0')
        const month = date.toLocaleDateString('fr-FR', { month: 'short' })
        cols.push({
          date,
          label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          shortLabel: `${dayName} ${day} ${month}`,
          isWeekend: isWeekend(date),
          isHoliday: isFrenchHoliday(date),
          semaineISO: getSemaineISOWithYear(date),
        })
      })
    } else if (precision === 'SEMAINE') {
      const currentDate = new Date(dateDebut)
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentDate.setDate(currentDate.getDate() - daysToMonday)
      
      while (currentDate <= dateFin) {
        const weekStart = new Date(currentDate)
        const weekEnd = new Date(currentDate)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        cols.push({
          date: weekStart,
          label: `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
          shortLabel: getSemaineISOWithYear(weekStart),
          isWeekend: false,
          isHoliday: false,
          semaineISO: getSemaineISOWithYear(weekStart),
          weekStart,
          weekEnd,
        })
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      const monthStart = new Date(dateDebut)
      monthStart.setDate(1)
      
      for (let i = 0; i < 12; i++) {
        const currentMonth = new Date(monthStart)
        currentMonth.setMonth(monthStart.getMonth() + i)
        
        const monthShort = currentMonth.toLocaleDateString('fr-FR', { month: 'short' })
        const monthShortClean = monthShort.replace(/\.$/, '')
        const year = currentMonth.getFullYear()
        const monthEnd = new Date(year, currentMonth.getMonth() + 1, 0)
        
        cols.push({
          date: currentMonth,
          label: currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          shortLabel: `${monthShortClean}.${year}`,
          isWeekend: false,
          isHoliday: false,
          semaineISO: getSemaineISOWithYear(currentMonth),
          weekStart: currentMonth,
          weekEnd: monthEnd,
        })
      }
    }
    
    return cols
  }, [dateDebut, dateFin, precision])

  // Construire la grille : pour chaque ressource (ligne) et chaque date (colonne), vérifier si affectée
  const grille = useMemo(() => {
    const grid = new Map<string, boolean>() // Clé: "ressourceId|dateIndex", Valeur: true si affectée
    
    ressources.forEach((ressource) => {
      colonnes.forEach((col, colIndex) => {
        const cellKey = `${ressource.id}|${colIndex}`
        
        // Vérifier si cette ressource a une affectation pour cette date/colonne
        const isAffectee = affectations.some((aff) => {
          const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
          const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
          const colDate = normalizeDateToUTC(col.date)
          
          if (aff.ressource_id !== ressource.id) return false
          
          if (precision === 'JOUR') {
            return affDateDebut <= colDate && affDateFin >= colDate
          } else if (precision === 'SEMAINE') {
            if (!col.weekStart || !col.weekEnd) return false
            const weekStartUTC = normalizeDateToUTC(col.weekStart)
            const weekEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= weekEndUTC && affDateFin >= weekStartUTC
          } else if (precision === 'MOIS') {
            if (!col.weekStart || !col.weekEnd) return false
            const monthStartUTC = normalizeDateToUTC(col.weekStart)
            const monthEndUTC = normalizeDateToUTC(col.weekEnd)
            return affDateDebut <= monthEndUTC && affDateFin >= monthStartUTC
          }
          
          return false
        })
        
        grid.set(cellKey, isAffectee)
      })
    })
    
    return grid
  }, [colonnes, ressources, affectations, precision])

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

  const loading = loadingAffectations || loadingRessources

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
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
      {Array.from(ressourcesParCompetence.entries()).map(([competence, ressourcesComp]) => {
        const isExpanded = expandedCompetences.has(competence)
        
        return (
          <div key={competence} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            {/* En-tête avec nom de compétence et flèche */}
            <div 
              className="flex items-center gap-3 p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => toggleCompetence(competence)}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full flex-shrink-0"></div>
              <div className="flex items-center gap-3 flex-1">
                <h3 className="text-xl font-bold text-gray-800">{competence}</h3>
                <span className="text-sm text-gray-500">({ressourcesComp.length} ressource{ressourcesComp.length > 1 ? 's' : ''})</span>
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

            {/* Contenu (grille) - affiché seulement si expandé */}
            {isExpanded && (
              <div className="px-6 pb-6 overflow-x-auto">
                <div className="rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th className="border-b border-r border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
                          Ressource
                        </th>
                        {colonnes.map((col, idx) => (
                          <th
                            key={idx}
                            className={`border-b border-r border-gray-300 px-3 py-2 text-center min-w-[90px] text-xs font-semibold ${
                              col.isWeekend ? 'bg-blue-100 text-blue-800' :
                              col.isHoliday ? 'bg-rose-100 text-rose-800' :
                              'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="font-medium">{col.shortLabel}</div>
                            {precision === 'SEMAINE' && (
                              <div className="text-[10px] text-gray-500 mt-0.5">{col.semaineISO}</div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ressourcesComp.map((ressource, ressourceIdx) => {
                        const isEven = ressourceIdx % 2 === 0
                        
                        return (
                          <tr key={ressource.id} className={isEven ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className={`border-b border-r border-gray-300 px-4 py-3 font-semibold text-sm text-gray-800 sticky left-0 z-10 ${
                              isEven ? 'bg-white' : 'bg-gray-50/50'
                            }`}>
                              <div className="font-medium">{ressource.nom}</div>
                              <div className="text-xs text-gray-500">{ressource.site}</div>
                            </td>
                            {colonnes.map((col, colIndex) => {
                              const cellKey = `${ressource.id}|${colIndex}`
                              const isAffectee = grille.get(cellKey) || false
                              
                              return (
                                <td 
                                  key={colIndex}
                                  className={`border-b border-r border-gray-300 px-2 py-2 text-center ${
                                    col.isWeekend ? 'bg-blue-50/50' :
                                    col.isHoliday ? 'bg-rose-50/50' :
                                    ''
                                  }`}
                                >
                                  <div className={`w-full h-8 flex items-center justify-center rounded ${
                                    isAffectee 
                                      ? 'bg-green-500 text-white font-semibold' 
                                      : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    {isAffectee ? '✓' : ''}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
