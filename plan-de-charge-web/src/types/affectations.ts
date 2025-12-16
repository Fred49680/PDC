/**
 * Types pour le module Affectations
 */

export interface Ressource {
  id: string
  nom: string
  site: string
  type_contrat?: string
  date_debut_contrat?: Date
  date_fin_contrat?: Date
  actif: boolean
  created_at: Date
  updated_at: Date
}

export interface RessourceCompetence {
  id: string
  ressource_id: string
  competence: string
  niveau?: string
  created_at: Date
}

export interface Affectation {
  id: string
  affaire_id: string
  site: string
  ressource_id: string
  competence: string
  date_debut: Date
  date_fin: Date
  charge: number
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
}
