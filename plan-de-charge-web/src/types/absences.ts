/**
 * Types pour le module Absences
 */

export interface Absence {
  id: string
  ressource_id: string
  site: string
  date_debut: Date | string // Accepte Date ou string ISO (YYYY-MM-DD)
  date_fin: Date | string // Accepte Date ou string ISO (YYYY-MM-DD)
  type: string
  competence?: string
  commentaire?: string
  validation_saisie: 'Oui' | 'Non'
  saisi_par?: string
  date_saisie: Date | string // Accepte Date ou string ISO
  valide_par?: string
  date_validation?: Date | string // Accepte Date ou string ISO
  created_at: Date | string // Accepte Date ou string ISO
  updated_at: Date | string // Accepte Date ou string ISO
}

export type TypeAbsence = 
  | 'Formation'
  | 'Congés payés'
  | 'Maladie'
  | 'Paternité'
  | 'Maternité'
  | 'Parental'
  | 'Autre'
