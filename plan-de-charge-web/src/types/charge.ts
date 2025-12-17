/**
 * Types pour le module Charge (besoins)
 */

export interface Affaire {
  id: string
  affaire_id: string
  site: string
  libelle: string
  date_creation: Date
  date_modification: Date
  actif: boolean
  created_by?: string
  updated_by?: string
  // Colonnes calculées automatiquement (remplies lors de l'enregistrement des charges)
  // Ne pas inclure dans le formulaire d'ajout/modification
  date_debut_demande?: Date
  date_fin_demande?: Date
  total_planifie?: number
}

export interface PeriodeCharge {
  id: string
  affaire_id: string
  site: string
  competence: string
  date_debut: Date
  date_fin: Date
  nb_ressources: number
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
}

export type Precision = 'JOUR' | 'SEMAINE' | 'MOIS'
