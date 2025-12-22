'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAffectations } from '@/hooks/useAffectations'
import { useAbsences } from '@/hooks/useAbsences'
import { getDatesBetween } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { format, startOfWeek, addDays, addWeeks, startOfMonth, addMonths, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

interface GrilleAffectationsProps {
  affaireId: string
  site: string
  competence: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
}

export function GrilleAffectations({
  affaireId,
  site,
  competence,
  dateDebut,
  dateFin,
  precision,
}: GrilleAffectationsProps) {
  const { affectations, ressources, loading, error, saveAffectation, deleteAffectation } = useAffectations({
    affaireId,
    site,
    competence,
    enableRealtime: true, // Realtime géré directement dans useAffectations
  })

  // Debounce pour les sauvegardes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSavesRef = useRef<Map<string, { ressourceId: string; col: typeof colonnes[0]; value: boolean }>>(new Map())

  // Charger les absences pour cette compétence
  const { absences } = useAbsences({ site, enableRealtime: true })

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

  // Construire la grille de base depuis les affectations (calculée avec useMemo)
  const grilleBase = useMemo(() => {
    const newGrille = new Map<string, boolean>()

    affectations.forEach((affectation) => {
      const dateDebut = new Date(affectation.date_debut)
      const dateFin = new Date(affectation.date_fin)

      colonnes.forEach((col) => {
        const colDate = col.weekStart || col.date
        const colEnd = col.weekEnd || col.date

        if (dateDebut <= colEnd && dateFin >= colDate) {
          const cellKey = `${affectation.ressource_id}|${col.date.getTime()}`
          newGrille.set(cellKey, true)
        }
      })
    })

    return newGrille
  }, [affectations, colonnes])

  // État pour les modifications locales (mises à jour optimistes)
  const [grilleModifications, setGrilleModifications] = useState<Map<string, boolean>>(new Map())

  // Fusionner la grille de base avec les modifications locales
  const grille = useMemo(() => {
    const merged = new Map(grilleBase)
    grilleModifications.forEach((value, key) => {
      if (value) {
        merged.set(key, true)
      } else {
        merged.delete(key)
      }
    })
    return merged
  }, [grilleBase, grilleModifications])

  // Mise à jour optimiste de la grille locale
  const updateGrilleLocal = useCallback((ressourceId: string, col: typeof colonnes[0], value: boolean) => {
    const cellKey = `${ressourceId}|${col.date.getTime()}`
    setGrilleModifications((prev) => {
      const newModifications = new Map(prev)
      if (value) {
        newModifications.set(cellKey, true)
      } else {
        newModifications.delete(cellKey)
      }
      return newModifications
    })
  }, [])

  // Sauvegarde avec debounce et batch
  const handleCellChange = useCallback((ressourceId: string, col: typeof colonnes[0], value: boolean) => {
    // Mise à jour optimiste immédiate
    updateGrilleLocal(ressourceId, col, value)

    // Stocker la sauvegarde en attente
    const cellKey = `${ressourceId}|${col.date.getTime()}`
    pendingSavesRef.current.set(cellKey, { ressourceId, col, value })

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
          saves.map(async ({ ressourceId, col, value }) => {
            const dateDebutPeriode = col.weekStart || col.date
            const dateFinPeriode = col.weekEnd || col.date

            if (value) {
              return saveAffectation({
                ressource_id: ressourceId,
                competence,
                date_debut: dateDebutPeriode,
                date_fin: dateFinPeriode,
                charge: 1,
              })
            } else {
              // Trouver toutes les affectations qui chevauchent cette période
              const affectationsToDelete = affectations.filter(
                (a) =>
                  a.ressource_id === ressourceId &&
                  new Date(a.date_debut) <= dateFinPeriode &&
                  new Date(a.date_fin) >= dateDebutPeriode
              )
              
              // Supprimer toutes les affectations qui chevauchent
              if (affectationsToDelete.length > 0 && deleteAffectation) {
                return Promise.all(
                  affectationsToDelete.map(a => deleteAffectation(a.id))
                )
              }
            }
          })
        )
      } catch (err) {
        console.error('[GrilleAffectations] Erreur batch save:', err)
      }
    }, 500)
  }, [saveAffectation, deleteAffectation, competence, affectations, updateGrilleLocal])

  // Nettoyage du timeout au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Vérifier si une ressource est absente pour une date donnée
  const isRessourceAbsente = useCallback((ressourceId: string, date: Date) => {
    return absences.some(
      (absence) =>
        absence.ressource_id === ressourceId &&
        new Date(absence.date_debut) <= date &&
        new Date(absence.date_fin) >= date
    )
  }, [absences])

  // Trier les ressources : celles avec affectations en premier, puis par ordre alphabétique
  const ressourcesTriees = useMemo(() => {
    // Créer un Set des IDs de ressources affectées
    const ressourcesAffecteesIds = new Set<string>()
    affectations.forEach((affectation) => {
      ressourcesAffecteesIds.add(affectation.ressource_id)
    })

    // Séparer les ressources affectées et non affectées
    const affectees = ressources.filter((r) => ressourcesAffecteesIds.has(r.id))
    const nonAffectees = ressources.filter((r) => !ressourcesAffecteesIds.has(r.id))

    // Trier chaque groupe par ordre alphabétique
    const affecteesTriees = [...affectees].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    const nonAffecteesTriees = [...nonAffectees].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

    // Retourner les affectées en premier, puis les non affectées
    return [...affecteesTriees, ...nonAffecteesTriees]
  }, [ressources, affectations])

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
      <h3 className="text-lg font-semibold mb-4">{competence}</h3>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
              Ressource
            </th>
            {colonnes.map((col, idx) => (
              <th
                key={idx}
                className="border border-gray-300 p-2 bg-gray-100 font-semibold text-center min-w-[100px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ressourcesTriees.map((ressource) => (
            <tr key={ressource.id}>
              <td className="border border-gray-300 p-2 font-medium">{ressource.nom}</td>
              {colonnes.map((col, idx) => {
                const cellKey = `${ressource.id}|${col.date.getTime()}`
                const isAffecte = grille.get(cellKey) || false
                const isAbsent = isRessourceAbsente(ressource.id, col.date)

                return (
                  <td
                    key={idx}
                    className={`border border-gray-300 p-1 ${
                      isAbsent ? 'bg-gray-300 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAffecte}
                      disabled={isAbsent}
                      onChange={(e) => {
                        if (!isAbsent) {
                          handleCellChange(ressource.id, col, e.target.checked)
                        }
                      }}
                      className="w-full h-5 cursor-pointer disabled:cursor-not-allowed"
                      title={isAbsent ? 'Ressource absente' : ''}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
