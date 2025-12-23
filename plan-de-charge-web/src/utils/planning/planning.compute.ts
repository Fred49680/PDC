/**
 * Calculs pour le planning v3
 * Couverture, candidats, etc.
 */

import type { PeriodeCharge } from '@/types/charge'
import type { Affectation } from '@/types/affectations'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import { isDisponible, hasConflitAffaire, isAbsente, getJoursConflits, getJoursAbsences, getJoursDisponibles } from './planning.rules'
import { businessDaysBetween, getISOWeek, getISOYear } from '@/utils/calendar'
import type { Absence } from '@/types/absences'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Type pour une période de besoin avec couverture
 */
export interface BesoinPeriode {
  id: string
  affaireId: string
  site: string
  competence: string
  dateDebut: Date
  dateFin: Date
  nbRessources: number
  couverture: {
    affecte: number
    manque: number
    surplus: number
  }
}

/**
 * Type pour une ressource candidate
 */
export interface RessourceCandidat {
  id: string
  nom: string
  site: string
  isPrincipale: boolean
  isAbsente: boolean
  hasConflit: boolean
  hasConflitPartiel: boolean // Conflit sur une partie seulement de la période
  joursConflits: Date[] // Jours spécifiques en conflit
  joursAbsences: Date[] // Jours spécifiques d'absence
  joursDisponibles: Date[] // Jours disponibles (sans conflit ni absence)
  necessiteTransfert: boolean
  selectable: boolean
}

/**
 * Calculer la couverture d'une période de besoin
 * @param periodeFiltre Optionnel : période de filtrage pour ne compter que les affectations dans cette période
 */
export function calculerCouverture(
  besoin: PeriodeCharge,
  affectations: Affectation[],
  periodeFiltre?: { dateDebut: Date; dateFin: Date }
): BesoinPeriode['couverture'] {
  // Filtrer les affectations qui chevauchent avec la période de besoin
  let affectationsPeriode = affectations.filter((aff) => {
    return (
      aff.competence === besoin.competence &&
      aff.date_debut <= besoin.date_fin &&
      aff.date_fin >= besoin.date_debut
    )
  })

  // Si une période de filtrage est fournie, ne compter que les affectations qui chevauchent avec cette période
  if (periodeFiltre) {
    affectationsPeriode = affectationsPeriode.filter((aff) => {
      return (
        aff.date_debut <= periodeFiltre.dateFin &&
        aff.date_fin >= periodeFiltre.dateDebut
      )
    })
  }

  // Compter le nombre de ressources UNIQUES affectées (pas le nombre d'affectations)
  // Car une même ressource peut avoir plusieurs affectations sur la période
  const ressourcesUniques = new Set(affectationsPeriode.map(aff => aff.ressource_id))
  const affecte = ressourcesUniques.size
  
  const manque = Math.max(0, besoin.nb_ressources - affecte)
  const surplus = Math.max(0, affecte - besoin.nb_ressources)

  return {
    affecte,
    manque,
    surplus,
  }
}

/**
 * Convertir une PeriodeCharge en BesoinPeriode avec couverture
 * @param periodeFiltre Optionnel : période de filtrage pour ne compter que les affectations dans cette période
 */
export function periodeToBesoin(
  periode: PeriodeCharge,
  affectations: Affectation[],
  periodeFiltre?: { dateDebut: Date; dateFin: Date }
): BesoinPeriode {
  const couverture = calculerCouverture(periode, affectations, periodeFiltre)

  return {
    id: periode.id,
    affaireId: periode.affaire_id,
    site: periode.site,
    competence: periode.competence,
    dateDebut: periode.date_debut,
    dateFin: periode.date_fin,
    nbRessources: periode.nb_ressources,
    couverture,
  }
}

/**
 * Obtenir les ressources candidates pour une période de besoin
 */
export function getRessourcesCandidates(
  besoin: BesoinPeriode,
  ressources: Ressource[],
  competences: Map<string, RessourceCompetence[]>,
  affectations: Affectation[],
  absences: Absence[],
  affaireId: string
): RessourceCandidat[] {
  return ressources.map((ressource) => {
    // Vérifier si la ressource a la compétence requise
    const ressourceCompetences = competences.get(ressource.id) || []
    const hasCompetence = ressourceCompetences.some(
      (comp) => comp.competence === besoin.competence
    )
    const isPrincipale = ressourceCompetences.some(
      (comp) => comp.competence === besoin.competence && comp.type_comp === 'P'
    )

    // Vérifier la disponibilité globale
    const isAbs = isAbsente(ressource.id, besoin.dateDebut, besoin.dateFin, absences)
    const hasConflit = hasConflitAffaire(
      ressource.id,
      besoin.dateDebut,
      besoin.dateFin,
      affectations,
      affaireId
    )

    // Obtenir les jours spécifiques en conflit et absences
    const joursConflits = getJoursConflits(
      ressource.id,
      besoin.dateDebut,
      besoin.dateFin,
      affectations,
      affaireId
    )
    const joursAbsences = getJoursAbsences(
      ressource.id,
      besoin.dateDebut,
      besoin.dateFin,
      absences
    )
    const joursDisponibles = getJoursDisponibles(
      ressource.id,
      besoin.dateDebut,
      besoin.dateFin,
      affectations,
      absences,
      affaireId
    )

    // Conflit partiel = il y a des conflits mais aussi des jours disponibles
    const hasConflitPartiel = joursConflits.length > 0 && joursDisponibles.length > 0

    // Vérifier si un transfert est nécessaire (ressource d'un autre site)
    const necessiteTransfert = ressource.site.toUpperCase() !== besoin.site.toUpperCase()

    // La ressource est sélectionnable si :
    // - Elle a la compétence
    // - Elle a au moins un jour disponible (même si conflit partiel)
    // Note: Les ressources nécessitant un transfert sont maintenant sélectionnables
    // (le transfert sera créé automatiquement lors de l'affectation)
    const selectable = hasCompetence && joursDisponibles.length > 0

    return {
      id: ressource.id,
      nom: ressource.nom,
      site: ressource.site,
      isPrincipale,
      isAbsente: isAbs,
      hasConflit,
      hasConflitPartiel,
      joursConflits,
      joursAbsences,
      joursDisponibles,
      necessiteTransfert,
      selectable,
    }
  })
}

/**
 * Grouper les besoins par compétence
 */
export function grouperBesoinsParCompetence(
  besoins: BesoinPeriode[]
): Map<string, BesoinPeriode[]> {
  const groupes = new Map<string, BesoinPeriode[]>()

  besoins.forEach((besoin) => {
    if (!groupes.has(besoin.competence)) {
      groupes.set(besoin.competence, [])
    }
    groupes.get(besoin.competence)!.push(besoin)
  })

  return groupes
}

/**
 * Obtenir l'indicateur de statut pour une période
 */
export function getStatutIndicateur(couverture: BesoinPeriode['couverture']): {
  status: 'ok' | 'sous-affecte' | 'sur-affecte'
  emoji: string
  color: string
} {
  if (couverture.surplus > 0) {
    return { status: 'sur-affecte', emoji: '🔴', color: 'text-red-600' }
  }
  if (couverture.manque > 0) {
    return { status: 'sous-affecte', emoji: '🟠', color: 'text-orange-600' }
  }
  return { status: 'ok', emoji: '🟢', color: 'text-green-600' }
}

/**
 * Type pour un groupe de besoins par période
 */
export interface GroupeBesoinsPeriode {
  cle: string // Clé du groupe (ex: "S02-2026", "2026-01")
  label: string // Label affiché (ex: "Semaine 02 (2026)", "Janvier 2026")
  dateDebut: Date // Date de début du groupe
  dateFin: Date // Date de fin du groupe
  besoins: BesoinPeriode[]
}

/**
 * Grouper les besoins par période selon la précision
 */
export function grouperBesoinsParPeriode(
  besoins: BesoinPeriode[],
  precision: 'JOUR' | 'SEMAINE' | 'MOIS',
  dateDebut?: Date,
  dateFin?: Date
): Map<string, GroupeBesoinsPeriode[]> {
  
  // Créer un Map pour grouper par compétence puis par période
  const groupesParCompetence = new Map<string, Map<string, GroupeBesoinsPeriode>>()
  
  besoins.forEach((besoin) => {
    // Filtrer par date si fourni
    if (dateDebut && dateFin) {
      if (besoin.dateFin < dateDebut || besoin.dateDebut > dateFin) {
        return // Ignorer ce besoin s'il est en dehors de la période
      }
    }
    
    // Déterminer la clé et le label selon la précision
    let cle: string
    let label: string
    let periodeDebut: Date
    let periodeFin: Date
    
    if (precision === 'MOIS') {
      // Grouper par mois
      periodeDebut = startOfMonth(besoin.dateDebut)
      periodeFin = endOfMonth(besoin.dateDebut)
      const moisAnnee = format(periodeDebut, 'yyyy-MM', { locale: fr })
      cle = moisAnnee
      label = format(periodeDebut, 'MMMM yyyy', { locale: fr })
    } else {
      // Grouper par semaine (pour JOUR et SEMAINE)
      periodeDebut = startOfWeek(besoin.dateDebut, { weekStartsOn: 1 })
      periodeFin = endOfWeek(besoin.dateDebut, { weekStartsOn: 1 })
      const semaine = getISOWeek(besoin.dateDebut)
      const annee = getISOYear(besoin.dateDebut)
      cle = `S${String(semaine).padStart(2, '0')}-${annee}`
      label = `Semaine ${String(semaine).padStart(2, '0')} (${annee})`
    }
    
    // Initialiser la structure si nécessaire
    if (!groupesParCompetence.has(besoin.competence)) {
      groupesParCompetence.set(besoin.competence, new Map())
    }
    
    const groupesCompetence = groupesParCompetence.get(besoin.competence)!
    
    if (!groupesCompetence.has(cle)) {
      groupesCompetence.set(cle, {
        cle,
        label,
        dateDebut: periodeDebut,
        dateFin: periodeFin,
        besoins: [],
      })
    }
    
    groupesCompetence.get(cle)!.besoins.push(besoin)
  })
  
  // Convertir en Map<string, GroupeBesoinsPeriode[]> (par compétence)
  const result = new Map<string, GroupeBesoinsPeriode[]>()
  groupesParCompetence.forEach((groupes, competence) => {
    // Trier les groupes par date
    const groupesTries = Array.from(groupes.values()).sort((a, b) => 
      a.dateDebut.getTime() - b.dateDebut.getTime()
    )
    result.set(competence, groupesTries)
  })
  
  return result
}

