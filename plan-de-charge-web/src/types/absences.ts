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
  competence?: string | null // Accepte string, undefined ou null
  commentaire?: string | null // Accepte string, undefined ou null
  validation_saisie: 'Oui' | 'Non'
  saisi_par?: string | null // Accepte string, undefined ou null
  date_saisie: Date | string // Accepte Date ou string ISO
  valide_par?: string | null // Accepte string, undefined ou null
  date_validation?: Date | string | null // Accepte Date, string ISO ou null
  statut?: 'Actif' | 'Clôturé' // Statut de l'absence (Actif/Clôturé)
  type_arret_maladie?: 'Initial' | 'Prolongation' | null // Type d'arrêt maladie (optionnel, seulement pour arrêts maladie)
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
