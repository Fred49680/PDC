/**
 * Calculs pour le planning v3
 * Couverture, candidats, etc.
 */

import type { PeriodeCharge } from '@/types/charge'
import type { Affectation } from '@/types/affectations'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import { isDisponible, hasConflitAffaire, isAbsente } from './planning.rules'
import { businessDaysBetween } from '@/utils/calendar'
import type { Absence } from '@/types/absences'

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
  necessiteTransfert: boolean
  selectable: boolean
}

/**
 * Calculer la couverture d'une période de besoin
 */
export function calculerCouverture(
  besoin: PeriodeCharge,
  affectations: Affectation[]
): BesoinPeriode['couverture'] {
  // Compter les affectations pour cette période et cette compétence
  const affectationsPeriode = affectations.filter((aff) => {
    return (
      aff.competence === besoin.competence &&
      aff.date_debut <= besoin.date_fin &&
      aff.date_fin >= besoin.date_debut
    )
  })

  const affecte = affectationsPeriode.length
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
 */
export function periodeToBesoin(
  periode: PeriodeCharge,
  affectations: Affectation[]
): BesoinPeriode {
  const couverture = calculerCouverture(periode, affectations)

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

    // Vérifier la disponibilité
    const isAbs = isAbsente(ressource.id, besoin.dateDebut, besoin.dateFin, absences)
    const hasConflit = hasConflitAffaire(
      ressource.id,
      besoin.dateDebut,
      besoin.dateFin,
      affectations,
      affaireId
    )

    // Vérifier si un transfert est nécessaire (ressource d'un autre site)
    const necessiteTransfert = ressource.site.toUpperCase() !== besoin.site.toUpperCase()

    // La ressource est sélectionnable si :
    // - Elle a la compétence
    // - Elle n'est pas absente
    // - Elle n'a pas de conflit
    // Note: Les ressources nécessitant un transfert sont maintenant sélectionnables
    // (le transfert sera créé automatiquement lors de l'affectation)
    const selectable = hasCompetence && !isAbs && !hasConflit

    return {
      id: ressource.id,
      nom: ressource.nom,
      site: ressource.site,
      isPrincipale,
      isAbsente: isAbs,
      hasConflit,
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

