'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useCharge } from '@/hooks/useCharge'
import { useRessources } from '@/hooks/useRessources'
import { businessDaysBetween, getDatesBetween, formatSemaineISO } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { format, startOfWeek, addDays, addWeeks, startOfMonth, addMonths, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus } from 'lucide-react'

interface GrilleChargeProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
}

export function GrilleCharge({
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision,
}: GrilleChargeProps) {
  const { periodes, loading, error, savePeriode, consolidate } = useCharge({
    affaireId,
    site,
    enableRealtime: true, // Realtime géré directement dans useCharge
  })

  const { competences: competencesRessources } = useRessources({
    site,
    actif: true,
  })

  const [grille, setGrille] = useState<Map<string, number>>(new Map())
  const [competences, setCompetences] = useState<string[]>([])
  const [showAddCompetence, setShowAddCompetence] = useState(false)
  const [newCompetence, setNewCompetence] = useState('')
  
  // Debounce pour les sauvegardes (éviter trop de requêtes)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSavesRef = useRef<Map<string, { competence: string; col: typeof colonnes[0]; value: number }>>(new Map())

  // Générer les colonnes selon la précision
  const colonnes = useMemo(() => {
    const cols: { date: Date; label: string; weekStart?: Date; weekEnd?: Date }[] = []

    switch (precision) {
      case 'JOUR':
        const dates = getDatesBetween(dateDebut, dateFin)
        dates.forEach((date) => {
          cols.push({
            date,
            label: format(date, 'dd/MM', { locale: fr }),
          })
        })
        break

      case 'SEMAINE':
        let currentWeek = startOfWeek(dateDebut, { weekStartsOn: 1 })
        while (currentWeek <= dateFin) {
          const weekEnd = addDays(currentWeek, 6)
          cols.push({
            date: currentWeek,
            label: `${format(currentWeek, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
            weekStart: currentWeek,
            weekEnd,
          })
          currentWeek = addWeeks(currentWeek, 1)
        }
        break

      case 'MOIS':
        let currentMonth = startOfMonth(dateDebut)
        while (currentMonth <= dateFin) {
          const monthEnd = endOfMonth(currentMonth)
          cols.push({
            date: currentMonth,
            label: format(currentMonth, 'MMMM yyyy', { locale: fr }),
            weekStart: currentMonth,
            weekEnd: monthEnd,
          })
          currentMonth = addMonths(currentMonth, 1)
        }
        break
    }

    return cols
  }, [dateDebut, dateFin, precision])

  // Extraire les compétences disponibles depuis les ressources
  const competencesDisponibles = useMemo(() => {
    const comps = new Set<string>()
    // Ajouter les compétences des ressources (competencesRessources est une Map<string, RessourceCompetence[]>)
    competencesRessources.forEach((compsRessource) => {
      compsRessource.forEach((comp) => {
        comps.add(comp.competence)
      })
    })
    // Ajouter les compétences déjà utilisées dans les périodes
    periodes.forEach((p) => comps.add(p.competence))
    return Array.from(comps).sort()
  }, [competencesRessources, periodes])

  // Extraire les compétences affichées dans la grille (celles qui ont des périodes + celles ajoutées manuellement)
  useEffect(() => {
    setCompetences((prevCompetences) => {
      const comps = new Set<string>(prevCompetences) // Garder les compétences déjà ajoutées manuellement
      periodes.forEach((p) => comps.add(p.competence)) // Ajouter celles des périodes
      return Array.from(comps).sort()
    })
  }, [periodes])

  // Construire la grille depuis les périodes
  useEffect(() => {
    const newGrille = new Map<string, number>()

    periodes.forEach((periode) => {
      const key = `${periode.competence}|${periode.date_debut}|${periode.date_fin}`
      newGrille.set(key, periode.nb_ressources)

      // Pour chaque colonne, vérifier si la période chevauche
      colonnes.forEach((col) => {
        const colDate = col.weekStart || col.date
        const colEnd = col.weekEnd || col.date

        if (
          new Date(periode.date_debut) <= colEnd &&
          new Date(periode.date_fin) >= colDate
        ) {
          const cellKey = `${periode.competence}|${col.date.getTime()}`
          newGrille.set(cellKey, periode.nb_ressources)
        }
      })
    })

    setGrille(newGrille)
  }, [periodes, colonnes])

  // Mise à jour optimiste de la grille locale
  const updateGrilleLocal = useCallback((competence: string, col: typeof colonnes[0], value: number) => {
    setGrille((prev) => {
      const newGrille = new Map(prev)
      const cellKey = `${competence}|${col.date.getTime()}`
      newGrille.set(cellKey, value)
      return newGrille
    })
  }, [])

  // Sauvegarde avec debounce et batch
  const handleCellChange = useCallback((competence: string, col: typeof colonnes[0], value: number) => {
    // Mise à jour optimiste immédiate
    updateGrilleLocal(competence, col, value)

    // Stocker la sauvegarde en attente
    const cellKey = `${competence}|${col.date.getTime()}`
    pendingSavesRef.current.set(cellKey, { competence, col, value })

    // Annuler le timeout précédent
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Programmer la sauvegarde après 500ms d'inactivité
    saveTimeoutRef.current = setTimeout(async () => {
      const saves = Array.from(pendingSavesRef.current.values())
      pendingSavesRef.current.clear()

      // Sauvegarder toutes les modifications en batch
      try {
        await Promise.all(
          saves.map(({ competence, col, value }) => {
            const dateDebutPeriode = col.weekStart || col.date
            const dateFinPeriode = col.weekEnd || col.date

            return savePeriode({
              competence,
              date_debut: dateDebutPeriode,
              date_fin: dateFinPeriode,
              nb_ressources: value,
            })
          })
        )
      } catch (err) {
        console.error('[GrilleCharge] Erreur batch save:', err)
        // En cas d'erreur, recharger depuis le serveur
        // (useCharge se chargera du rechargement via Realtime)
      }
    }, 500)
  }, [savePeriode, updateGrilleLocal])

  // Nettoyage du timeout au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Erreur: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
              Compétence
            </th>
            {colonnes.map((col, idx) => (
              <th
                key={idx}
                className="border border-gray-300 p-2 bg-gray-100 font-semibold text-center min-w-[100px]"
              >
                {col.label}
              </th>
            ))}
            <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
              Total (h)
            </th>
          </tr>
        </thead>
        <tbody>
          {competences.map((comp) => {
            const total = colonnes.reduce((sum, col) => {
              const cellKey = `${comp}|${col.date.getTime()}`
              return sum + (grille.get(cellKey) || 0)
            }, 0)

            return (
              <tr key={comp}>
                <td className="border border-gray-300 p-2 font-medium">{comp}</td>
                {colonnes.map((col, idx) => {
                  const cellKey = `${comp}|${col.date.getTime()}`
                  const value = grille.get(cellKey) || 0

                  return (
                    <td key={idx} className="border border-gray-300 p-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={value}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0
                          handleCellChange(comp, col, newValue)
                        }}
                        className="w-full text-center border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )
                })}
                <td className="border border-gray-300 p-2 text-center font-semibold">
                  {total.toFixed(1)} H
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Bouton pour ajouter une compétence */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {!showAddCompetence ? (
            <button
              onClick={() => setShowAddCompetence(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter une compétence
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={newCompetence}
                onChange={(e) => setNewCompetence(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCompetence) {
                    if (!competences.includes(newCompetence)) {
                      setCompetences([...competences, newCompetence].sort())
                    }
                    setNewCompetence('')
                    setShowAddCompetence(false)
                  }
                }}
              >
                <option value="">Sélectionner une compétence...</option>
                {competencesDisponibles
                  .filter((comp) => !competences.includes(comp))
                  .map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                value={newCompetence}
                onChange={(e) => setNewCompetence(e.target.value)}
                placeholder="Ou saisir une nouvelle compétence"
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCompetence.trim()) {
                    const comp = newCompetence.trim()
                    if (!competences.includes(comp)) {
                      setCompetences([...competences, comp].sort())
                    }
                    setNewCompetence('')
                    setShowAddCompetence(false)
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newCompetence.trim()) {
                    const comp = newCompetence.trim()
                    if (!competences.includes(comp)) {
                      setCompetences([...competences, comp].sort())
                    }
                    setNewCompetence('')
                    setShowAddCompetence(false)
                  }
                }}
                disabled={!newCompetence.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Ajouter
              </button>
              <button
                onClick={() => {
                  setShowAddCompetence(false)
                  setNewCompetence('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => consolidate()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Consolider
        </button>
      </div>
    </div>
  )
}
