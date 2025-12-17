/**
 * Utilitaires pour le calendrier (jours ouvrés)
 */

import { startOfWeek, addDays, format, isWeekend, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getFrenchHolidaysBetween, isFrenchHoliday } from './holidays'

/**
 * Obtenir le lundi d'une semaine
 */
export function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Calculer le numéro de semaine ISO
 */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Obtenir l'année ISO
 */
export function getISOYear(date: Date): number {
  const week = getISOWeek(date)
  const year = date.getFullYear()
  
  // Si on est en janvier et que la semaine est >= 52, c'est l'année précédente
  if (date.getMonth() === 0 && week >= 52) {
    return year - 1
  }
  
  // Si on est en décembre et que la semaine est 1, c'est l'année suivante
  if (date.getMonth() === 11 && week === 1) {
    return year + 1
  }
  
  return year
}

/**
 * Formater une semaine ISO (ex: "2026-01")
 */
export function formatSemaineISO(date: Date): string {
  const year = getISOYear(date)
  const week = getISOWeek(date)
  return `${year}-${week.toString().padStart(2, '0')}`
}

/**
 * Générer toutes les dates entre deux dates
 */
export function getDatesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  let current = new Date(start)
  
  while (current <= end) {
    dates.push(new Date(current))
    current = addDays(current, 1)
  }
  
  return dates
}

/**
 * Vérifier si une date est un jour ouvré (pas week-end, pas férié)
 * Utilise les fériés français par défaut
 */
export function isBusinessDay(date: Date, holidays: Date[] | null = null): boolean {
  // Vérifier week-end
  if (isWeekend(date)) {
    return false
  }
  
  // Vérifier jours fériés (utiliser fériés français si holidays non fourni)
  if (holidays === null) {
    return !isFrenchHoliday(date)
  }
  
  return !holidays.some(holiday => isSameDay(holiday, date))
}

/**
 * Calculer le nombre de jours ouvrés entre deux dates
 * Utilise les fériés français par défaut
 */
export function businessDaysBetween(start: Date, end: Date, holidays: Date[] | null = null): number {
  const dates = getDatesBetween(start, end)
  return dates.filter(date => isBusinessDay(date, holidays)).length
}

/**
 * Trouver le prochain jour ouvré après une date donnée
 * Utilise les fériés français par défaut
 */
export function nextBusinessDay(date: Date, holidays: Date[] | null = null): Date {
  let nextDate = addDays(date, 1)
  let attempts = 0
  // Chercher jusqu'à 30 jours à l'avance pour éviter les boucles infinies
  while (!isBusinessDay(nextDate, holidays) && attempts < 30) {
    nextDate = addDays(nextDate, 1)
    attempts++
  }
  return nextDate
}
