/**
 * Types pour le module Charge (besoins)
 */

export interface Affaire {
  id: string
  affaire_id: string | null // Peut être NULL si statut ≠ "Ouverte" ou "Prévisionnelle"
  site: string
  libelle: string
  date_creation: Date
  date_modification: Date
  actif: boolean
  created_by?: string
  updated_by?: string
  // Colonnes pour génération automatique de l'affaire_id
  tranche?: string // Tranche/Segment (ex: "TOUTE", "1", "2", etc.)
  statut?: string // Statut (ex: "Ouverte", "Prévisionnelle", "Clôturé")
  // Colonnes budgétaires
  budget_heures?: number // Budget en heures
  raf_heures?: number // Reste À Faire en heures
  date_maj_raf?: Date // Date de mise à jour du RAF
  // Responsable
  responsable?: string // Responsable de l'affaire
  // Numéro de compte (facultatif)
  compte?: string // Numéro de compte (peut contenir des chiffres et des lettres)
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
  force_weekend_ferie?: boolean // Indique si cette période de charge a été forcée (confirmée) pour un week-end ou jour férié
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
}

export type Precision = 'JOUR' | 'SEMAINE' | 'MOIS'
