/**
 * Utilitaires pour les jours fériés français
 */

import { addDays, getDay, getYear, setMonth, setDate } from 'date-fns'

/**
 * Calculer la date de Pâques pour une année donnée (algorithme de Gauss)
 */
function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  
  return new Date(year, month - 1, day)
}

/**
 * Calculer le lundi de Pâques (Pâques + 1 jour)
 */
function getEasterMonday(year: number): Date {
  const easter = getEasterDate(year)
  return addDays(easter, 1)
}

/**
 * Calculer l'Ascension (Pâques + 39 jours)
 */
function getAscension(year: number): Date {
  const easter = getEasterDate(year)
  return addDays(easter, 39)
}

/**
 * Calculer le lundi de Pentecôte (Pâques + 50 jours)
 */
function getWhitMonday(year: number): Date {
  const easter = getEasterDate(year)
  return addDays(easter, 50)
}

/**
 * Obtenir tous les jours fériés français pour une année donnée
 */
export function getFrenchHolidays(year: number): Date[] {
  const holidays: Date[] = []
  
  // Fériés fixes
  holidays.push(new Date(year, 0, 1))   // Jour de l'An
  holidays.push(new Date(year, 4, 1))   // Fête du Travail (1er mai)
  holidays.push(new Date(year, 4, 8))   // Victoire 1945 (8 mai)
  holidays.push(new Date(year, 6, 14))  // Fête Nationale (14 juillet)
  holidays.push(new Date(year, 7, 15))  // Assomption (15 août)
  holidays.push(new Date(year, 10, 1))   // Toussaint (1er novembre)
  holidays.push(new Date(year, 10, 11)) // Armistice 1918 (11 novembre)
  holidays.push(new Date(year, 11, 25)) // Noël (25 décembre)
  
  // Fériés variables (basés sur Pâques)
  const easter = getEasterDate(year)
  holidays.push(easter)                    // Pâques
  holidays.push(getEasterMonday(year))     // Lundi de Pâques
  holidays.push(getAscension(year))        // Ascension
  holidays.push(getWhitMonday(year))       // Lundi de Pentecôte
  
  return holidays
}

/**
 * Obtenir tous les jours fériés français pour une plage de dates
 */
export function getFrenchHolidaysBetween(start: Date, end: Date): Date[] {
  const holidays: Date[] = []
  const startYear = getYear(start)
  const endYear = getYear(end)
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getFrenchHolidays(year)
    holidays.push(...yearHolidays.filter(h => h >= start && h <= end))
  }
  
  return holidays
}

/**
 * Vérifier si une date est un jour férié français
 * (Fériés français standards, hors Alsace-Lorraine)
 */
export function isFrenchHoliday(date: Date): boolean {
  // Normaliser la date à minuit pour la comparaison
  const dateNormalisee = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const year = getYear(dateNormalisee)
  const holidays = getFrenchHolidays(year)
  return holidays.some(h => {
    // Normaliser le jour férié à minuit pour la comparaison
    const hNormalise = new Date(h.getFullYear(), h.getMonth(), h.getDate())
    return hNormalise.getTime() === dateNormalisee.getTime()
  })
}
