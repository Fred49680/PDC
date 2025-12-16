/**
 * Types pour le module Absences
 */

export interface Absence {
  id: string
  ressource_id: string
  site: string
  date_debut: Date
  date_fin: Date
  type: string
  competence?: string
  commentaire?: string
  validation_saisie: 'Oui' | 'Non'
  saisi_par?: string
  date_saisie: Date
  valide_par?: string
  date_validation?: Date
  created_at: Date
  updated_at: Date
}

export type TypeAbsence = 
  | 'Formation'
  | 'Congés payés'
  | 'Maladie'
  | 'Paternité'
  | 'Maternité'
  | 'Parental'
  | 'Autre'
