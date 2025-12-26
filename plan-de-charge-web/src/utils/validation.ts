/**
 * Utilitaires de validation
 */

import type { PeriodeCharge, Affectation } from '@/types'

/**
 * Valider une période de charge
 */
export function validatePeriodeCharge(periode: Partial<PeriodeCharge>): string[] {
  const errors: string[] = []

  if (!periode.affaire_id) {
    errors.push('Affaire ID requis')
  }

  if (!periode.site) {
    errors.push('Site requis')
  }

  if (!periode.competence) {
    errors.push('Compétence requise')
  }

  if (!periode.date_debut) {
    errors.push('Date de début requise')
  }

  if (!periode.date_fin) {
    errors.push('Date de fin requise')
  }

  if (periode.date_debut && periode.date_fin) {
    if (periode.date_fin < periode.date_debut) {
      errors.push('La date de fin doit être postérieure à la date de début')
    }
  }

  if (periode.nb_ressources !== undefined && periode.nb_ressources <= 0) {
    errors.push('Le nombre de ressources doit être supérieur à 0')
  }

  return errors
}

/**
 * Valider une affectation
 */
export function validateAffectation(affectation: Partial<Affectation>): string[] {
  const errors: string[] = []

  if (!affectation.affaire_id) {
    errors.push('Affaire ID requis')
  }

  if (!affectation.site) {
    errors.push('Site requis')
  }

  if (!affectation.ressource_id) {
    errors.push('Ressource ID requise')
  }

  if (!affectation.competence) {
    errors.push('Compétence requise')
  }

  if (!affectation.date_debut) {
    errors.push('Date de début requise')
  }

  if (!affectation.date_fin) {
    errors.push('Date de fin requise')
  }

  if (affectation.date_debut && affectation.date_fin) {
    if (affectation.date_fin < affectation.date_debut) {
      errors.push('La date de fin doit être postérieure à la date de début')
    }
  }

  if (affectation.charge !== undefined && affectation.charge < 0) {
    errors.push('La charge doit être positive')
  }

  return errors
}
