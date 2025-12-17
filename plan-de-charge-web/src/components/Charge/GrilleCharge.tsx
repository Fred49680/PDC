'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCharge } from '@/hooks/useCharge'
import { useRealtime } from '@/hooks/useRealtime'
import { businessDaysBetween, getDatesBetween, formatSemaineISO } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { format, startOfWeek, addDays, addWeeks, startOfMonth, addMonths, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  })

  const [grille, setGrille] = useState<Map<string, number>>(new Map())
  const [competences, setCompetences] = useState<string[]>([])

  // Écouter les changements en temps réel
  useRealtime({
    table: 'periodes_charge',
    filter: `affaire_id=eq.${affaireId}`,
    callback: (payload) => {
      console.log('[GrilleCharge] Changement temps réel:', payload)
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
        // Recharger la grille sera fait automatiquement par useCharge
      }
    },
  })

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

  // Extraire les compétences uniques
  useEffect(() => {
    const comps = new Set<string>()
    periodes.forEach((p) => comps.add(p.competence))
    setCompetences(Array.from(comps).sort())
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

  const handleCellChange = async (competence: string, col: typeof colonnes[0], value: number) => {
    try {
      const dateDebutPeriode = col.weekStart || col.date
      const dateFinPeriode = col.weekEnd || col.date

      await savePeriode({
        competence,
        date_debut: dateDebutPeriode,
        date_fin: dateFinPeriode,
        nb_ressources: value,
      })
    } catch (err) {
      console.error('[GrilleCharge] Erreur savePeriode:', err)
    }
  }

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

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => consolidate()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Consolider
        </button>
      </div>
    </div>
  )
}
