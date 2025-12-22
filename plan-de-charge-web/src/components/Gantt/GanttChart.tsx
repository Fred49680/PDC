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
import type { Site } from '@/types/sites'

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
  sitesList?: Site[]
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

// Fonction pour générer une couleur déterministe à partir d'une chaîne
function generateColorFromString(str: string): string {
  // Hash simple pour générer un nombre à partir de la chaîne
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Palette de couleurs prédéfinie (couleurs distinctes et visibles)
  const palette = [
    '#3B82F6', // Bleu
    '#10B981', // Vert
    '#F59E0B', // Orange
    '#EF4444', // Rouge
    '#8B5CF6', // Violet
    '#EC4899', // Rose
    '#06B6D4', // Cyan
    '#84CC16', // Vert lime
    '#F97316', // Orange foncé
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F43F5E', // Rose foncé
    '#A855F7', // Violet foncé
    '#22C55E', // Vert émeraude
    '#EAB308', // Jaune
    '#0EA5E9', // Bleu ciel
  ]
  
  // Utiliser le hash pour sélectionner une couleur de la palette
  const index = Math.abs(hash) % palette.length
  return palette[index]
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
  sitesList = [],
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

  // Générer un mapping des couleurs par site depuis la liste des sites
  const siteColors = useMemo(() => {
    const colors: Record<string, string> = {}
    
    // Créer un mapping depuis la liste des sites
    sitesList.forEach((siteItem) => {
      const siteKey = siteItem.site_key || siteItem.site
      if (siteKey) {
        colors[siteKey.toUpperCase()] = generateColorFromString(siteKey)
      }
    })
    
    return colors
  }, [sitesList])

  // Créer les barres Gantt
  const bars = useMemo(() => {
    const ganttBars: GanttBar[] = []

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
      const siteKey = periode.site.toUpperCase()
      const siteColor = siteColors[siteKey] || generateColorFromString(siteKey) // Générer une couleur si non trouvée
      
      // Normaliser les dates pour éviter les problèmes de timezone
      let dateDebut: Date
      let dateFin: Date
      
      if (periode.date_debut instanceof Date) {
        dateDebut = new Date(periode.date_debut.getFullYear(), periode.date_debut.getMonth(), periode.date_debut.getDate())
      } else {
        const dateStr = typeof periode.date_debut === 'string' ? periode.date_debut : String(periode.date_debut)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateDebut = new Date(year, month - 1, day)
      }
      
      if (periode.date_fin instanceof Date) {
        dateFin = new Date(periode.date_fin.getFullYear(), periode.date_fin.getMonth(), periode.date_fin.getDate())
      } else {
        const dateStr = typeof periode.date_fin === 'string' ? periode.date_fin : String(periode.date_fin)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateFin = new Date(year, month - 1, day)
      }
      
      ganttBars.push({
        id: `besoin-${periode.id}`,
        type: 'besoin',
        competence: periode.competence,
        dateDebut,
        dateFin,
        nbRessources: periode.nb_ressources,
        color: viewMode === 'site' ? siteColor : '#FBBF24', // Jaune pour les besoins
      })
    })

    // Ajouter les affectations
    affectations.forEach((affectation) => {
      const ressource = ressources.find((r) => r.id === affectation.ressource_id)
      const ressourceNom = ressource?.nom || 'Ressource inconnue'
      const siteKey = affectation.site.toUpperCase()
      const siteColor = siteColors[siteKey] || generateColorFromString(siteKey) // Générer une couleur si non trouvée
      
      // Normaliser les dates pour éviter les problèmes de timezone
      // Si c'est déjà un Date, l'utiliser, sinon convertir depuis string ISO
      let dateDebut: Date
      let dateFin: Date
      
      if (affectation.date_debut instanceof Date) {
        dateDebut = new Date(affectation.date_debut.getFullYear(), affectation.date_debut.getMonth(), affectation.date_debut.getDate())
      } else {
        const dateStr = typeof affectation.date_debut === 'string' ? affectation.date_debut : String(affectation.date_debut)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateDebut = new Date(year, month - 1, day)
      }
      
      if (affectation.date_fin instanceof Date) {
        dateFin = new Date(affectation.date_fin.getFullYear(), affectation.date_fin.getMonth(), affectation.date_fin.getDate())
      } else {
        const dateStr = typeof affectation.date_fin === 'string' ? affectation.date_fin : String(affectation.date_fin)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateFin = new Date(year, month - 1, day)
      }
      
      ganttBars.push({
        id: `affectation-${affectation.id}`,
        type: 'affectation',
        ressourceId: affectation.ressource_id,
        ressourceNom,
        competence: affectation.competence,
        dateDebut,
        dateFin,
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
      
      // Normaliser les dates pour éviter les problèmes de timezone
      let dateDebut: Date
      let dateFin: Date
      
      if (absence.date_debut instanceof Date) {
        dateDebut = new Date(absence.date_debut.getFullYear(), absence.date_debut.getMonth(), absence.date_debut.getDate())
      } else {
        const dateStr = typeof absence.date_debut === 'string' ? absence.date_debut : String(absence.date_debut)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateDebut = new Date(year, month - 1, day)
      }
      
      if (absence.date_fin instanceof Date) {
        dateFin = new Date(absence.date_fin.getFullYear(), absence.date_fin.getMonth(), absence.date_fin.getDate())
      } else {
        const dateStr = typeof absence.date_fin === 'string' ? absence.date_fin : String(absence.date_fin)
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
        dateFin = new Date(year, month - 1, day)
      }
      
      ganttBars.push({
        id: `absence-${absence.id}`,
        type: 'absence',
        ressourceId: absence.ressource_id,
        ressourceNom: ressource.nom,
        dateDebut,
        dateFin,
        absenceType,
        color: absenceColor,
      })
    })

    return ganttBars
  }, [periodes, affectations, absences, ressources, viewMode, siteColors])

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
    // Normaliser les dates de la barre (sans heures)
    const startDate = new Date(bar.dateDebut.getFullYear(), bar.dateDebut.getMonth(), bar.dateDebut.getDate())
    const endDate = new Date(bar.dateFin.getFullYear(), bar.dateFin.getMonth(), bar.dateFin.getDate())
    
    // Normaliser les dates de la plage visible
    const dateDebutNorm = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate())
    const dateFinNorm = new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate())
    
    // S'assurer que les dates sont dans la plage visible
    const visibleStart = startDate < dateDebutNorm ? dateDebutNorm : startDate
    const visibleEnd = endDate > dateFinNorm ? dateFinNorm : endDate

    let left = 0
    let width = 0

    if (precision === 'JOUR') {
      // Trouver la colonne correspondant à la date de début
      const startIndex = columns.findIndex((col) => {
        const colDate = new Date(col.getFullYear(), col.getMonth(), col.getDate())
        return colDate.getTime() === visibleStart.getTime()
      })
      
      // Trouver la colonne correspondant à la date de fin
      const endIndex = columns.findIndex((col) => {
        const colDate = new Date(col.getFullYear(), col.getMonth(), col.getDate())
        return colDate.getTime() === visibleEnd.getTime()
      })
      
      if (startIndex >= 0 && endIndex >= 0) {
        left = startIndex * columnWidth
        width = (endIndex - startIndex + 1) * columnWidth
      } else if (startIndex >= 0) {
        // Si on trouve seulement le début, utiliser la largeur minimale
        left = startIndex * columnWidth
        width = columnWidth
      }
    } else if (precision === 'SEMAINE') {
      const startWeek = startOfWeek(visibleStart, { weekStartsOn: 1 })
      const endWeek = endOfWeek(visibleEnd, { weekStartsOn: 1 })
      
      const startIndex = columns.findIndex((col) => {
        const colWeek = startOfWeek(col, { weekStartsOn: 1 })
        return colWeek.getTime() === startWeek.getTime()
      })
      const endIndex = columns.findIndex((col) => {
        const colWeek = startOfWeek(col, { weekStartsOn: 1 })
        return colWeek.getTime() === endWeek.getTime()
      })
      
      if (startIndex >= 0 && endIndex >= 0) {
        left = startIndex * columnWidth
        width = (endIndex - startIndex + 1) * columnWidth
      } else if (startIndex >= 0) {
        left = startIndex * columnWidth
        width = columnWidth
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
      } else if (startIndex >= 0) {
        left = startIndex * columnWidth
        width = columnWidth
      }
    }

    return { left, width: Math.max(width, columnWidth) }
  }

  // Filtrer les ressources à afficher
  // Si des ressources sont fournies (filtrées), les utiliser, sinon afficher celles avec des affectations/absences
  const ressourcesAffichees = useMemo(() => {
    // Si des ressources sont déjà filtrées (via le filtre ressource), les utiliser
    if (ressources.length > 0) {
      const ressourceIds = new Set<string>()
      
      bars.forEach((bar) => {
        if (bar.ressourceId) {
          ressourceIds.add(bar.ressourceId)
        }
      })

      // Retourner les ressources filtrées qui ont des barres
      return ressources.filter((r) => ressourceIds.has(r.id))
    }
    
    // Sinon, afficher toutes les ressources avec des affectations/absences
    const ressourceIds = new Set<string>()
    
    bars.forEach((bar) => {
      if (bar.ressourceId) {
        ressourceIds.add(bar.ressourceId)
      }
    })

    return ressources.filter((r) => ressourceIds.has(r.id))
  }, [ressources, bars])

  // Extraire les sites uniques et leurs couleurs pour la légende
  const sitesAvecCouleurs = useMemo(() => {
    const sitesSet = new Set<string>()
    ressourcesAffichees.forEach((r) => {
      if (r.site) {
        sitesSet.add(r.site.toUpperCase())
      }
    })
    
    return Array.from(sitesSet)
      .sort()
      .map((site) => {
        const siteKey = site.toUpperCase()
        return {
          site,
          color: siteColors[siteKey] || generateColorFromString(siteKey),
        }
      })
  }, [ressourcesAffichees, siteColors])

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full">
        {/* En-tête avec les dates */}
        <div className="flex border-b-2 border-gray-300 sticky top-0 bg-white z-10">
          <div className="min-w-[200px] max-w-[400px] p-3 font-semibold text-gray-700 border-r-2 border-gray-300 bg-gray-50">
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
                    <div className="min-w-[200px] max-w-[400px] p-3 font-medium text-gray-800 border-r-2 border-gray-300 bg-gray-50 flex-shrink-0">
                      <div className="font-semibold whitespace-nowrap">{ressource.nom}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{ressource.site}</div>
                    </div>

                    {/* Zone des barres */}
                    <div className="flex-1 relative h-full">
                      {/* Fond pour week-ends et jours fériés (en arrière-plan) */}
                      {precision === 'JOUR' && columns.map((col, colIndex) => {
                        const isWeekendDay = isWeekend(col)
                        const isHoliday = !isBusinessDay(col) && !isWeekendDay
                        
                        if (!isWeekendDay && !isHoliday) return null
                        
                        return (
                          <div
                            key={`bg-${colIndex}`}
                            className="absolute top-0 bottom-0"
                            style={{
                              left: `${colIndex * columnWidth}px`,
                              width: `${columnWidth}px`,
                              backgroundColor: isWeekendDay ? '#F3F4F6' : '#DBEAFE', // Gris clair pour week-end, bleu clair pour férié
                              zIndex: 0,
                            }}
                          />
                        )
                      })}
                      
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
                              zIndex: 10,
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
        <div className="space-y-3">
          {/* Légende des types */}
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
                <span className="text-sm text-gray-700">Affectation</span>
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
          
          {/* Légende des sites */}
          {sitesAvecCouleurs.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Couleurs par site :</div>
              <div className="flex flex-wrap gap-3">
                {sitesAvecCouleurs.map(({ site, color }) => (
                  <div key={site} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm text-gray-700">{site}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Légende week-ends et fériés */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Fonds :</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100"></div>
                <span className="text-sm text-gray-700">Week-end</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-50"></div>
                <span className="text-sm text-gray-700">Jour férié</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

