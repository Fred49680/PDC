/**
 * Règles métier pour le planning v3
 * Gestion des jours ouvrés, conflits, absences
 */

import { isBusinessDay } from '@/utils/calendar'
import type { Affectation } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import { isWithinInterval } from 'date-fns'

/**
 * Vérifier si une date est un jour ouvré
 */
export function isJourOuvre(date: Date): boolean {
  return isBusinessDay(date)
}

/**
 * Vérifier si une ressource a un conflit avec une autre affaire sur une période
 */
export function hasConflitAffaire(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  affectations: Affectation[],
  affaireIdExclue?: string
): boolean {
  return affectations.some((aff) => {
    // Exclure l'affaire courante si spécifiée
    if (affaireIdExclue && aff.affaire_id === affaireIdExclue) {
      return false
    }

    // Vérifier si la ressource est affectée
    if (aff.ressource_id !== ressourceId) {
      return false
    }

    // Vérifier si les périodes se chevauchent
    return (
      isWithinInterval(dateDebut, { start: aff.date_debut, end: aff.date_fin }) ||
      isWithinInterval(dateFin, { start: aff.date_debut, end: aff.date_fin }) ||
      isWithinInterval(aff.date_debut, { start: dateDebut, end: dateFin }) ||
      isWithinInterval(aff.date_fin, { start: dateDebut, end: dateFin })
    )
  })
}

/**
 * Obtenir les jours où une ressource a un conflit avec une autre affaire
 * Retourne un tableau de dates en conflit
 */
export function getJoursConflits(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  affectations: Affectation[],
  affaireIdExclue?: string
): Date[] {
  const joursConflits: Date[] = []
  const currentDate = new Date(dateDebut)

  while (currentDate <= dateFin) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const hasConflict = affectations.some((aff) => {
      // Exclure l'affaire courante si spécifiée
      if (affaireIdExclue && aff.affaire_id === affaireIdExclue) {
        return false
      }

      // Vérifier si la ressource est affectée
      if (aff.ressource_id !== ressourceId) {
        return false
      }

      // Vérifier si la date est dans la période de conflit
      const affDebut = new Date(aff.date_debut)
      const affFin = new Date(aff.date_fin)
      return currentDate >= affDebut && currentDate <= affFin
    })

    if (hasConflict) {
      joursConflits.push(new Date(currentDate))
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return joursConflits
}

/**
 * Obtenir les jours où une ressource est absente
 * Retourne un tableau de dates d'absence
 */
export function getJoursAbsences(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  absences: Absence[]
): Date[] {
  const joursAbsences: Date[] = []
  const currentDate = new Date(dateDebut)

  while (currentDate <= dateFin) {
    const hasAbsence = absences.some((abs) => {
      if (abs.ressource_id !== ressourceId) {
        return false
      }

      const absDebut = new Date(abs.date_debut)
      const absFin = new Date(abs.date_fin)
      return currentDate >= absDebut && currentDate <= absFin
    })

    if (hasAbsence) {
      joursAbsences.push(new Date(currentDate))
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return joursAbsences
}

/**
 * Obtenir les jours disponibles d'une ressource sur une période
 * Retourne un tableau de dates disponibles (sans conflit ni absence)
 */
export function getJoursDisponibles(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  affectations: Affectation[],
  absences: Absence[],
  affaireIdExclue?: string
): Date[] {
  const joursDisponibles: Date[] = []
  const joursConflits = getJoursConflits(ressourceId, dateDebut, dateFin, affectations, affaireIdExclue)
  const joursAbsences = getJoursAbsences(ressourceId, dateDebut, dateFin, absences)

  const joursIndisponibles = new Set([
    ...joursConflits.map((d) => d.toISOString().split('T')[0]),
    ...joursAbsences.map((d) => d.toISOString().split('T')[0]),
  ])

  const currentDate = new Date(dateDebut)
  while (currentDate <= dateFin) {
    const dateStr = currentDate.toISOString().split('T')[0]
    if (!joursIndisponibles.has(dateStr)) {
      joursDisponibles.push(new Date(currentDate))
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return joursDisponibles
}

/**
 * Vérifier si une ressource est absente sur une période
 */
export function isAbsente(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  absences: Absence[]
): boolean {
  return absences.some((abs) => {
    if (abs.ressource_id !== ressourceId) {
      return false
    }

    // Vérifier si la période se chevauche avec l'absence
    return (
      isWithinInterval(dateDebut, { start: abs.date_debut, end: abs.date_fin }) ||
      isWithinInterval(dateFin, { start: abs.date_debut, end: abs.date_fin }) ||
      isWithinInterval(abs.date_debut, { start: dateDebut, end: dateFin }) ||
      isWithinInterval(abs.date_fin, { start: dateDebut, end: dateFin })
    )
  })
}

/**
 * Vérifier si une ressource est disponible sur une période
 */
export function isDisponible(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date,
  affectations: Affectation[],
  absences: Absence[],
  affaireIdExclue?: string
): boolean {
  // Vérifier les absences
  if (isAbsente(ressourceId, dateDebut, dateFin, absences)) {
    return false
  }

  // Vérifier les conflits avec d'autres affaires
  if (hasConflitAffaire(ressourceId, dateDebut, dateFin, affectations, affaireIdExclue)) {
    return false
  }

  return true
}

/**
 * Filtrer les dates pour ne garder que les jours ouvrés
 */
export function filterJoursOuvres(dates: Date[]): Date[] {
  return dates.filter((date) => isJourOuvre(date))
}

