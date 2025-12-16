/**
 * Types pour le module Charge (besoins)
 */

export interface Affaire {
  id: string
  affaire_id: string // Généré automatiquement (lecture seule)
  site: string
  libelle: string
  // Nouveaux champs pour génération AffaireID
  tranche?: string // Tranche ou segment (ex: "TOUTE", "1")
  affaire_nom?: string // Nom de l'affaire (ex: "PACK TEM", "PNPE 3313")
  statut?: string // Statut (ex: "Ouverte", "Prévisionnelle", "Fermée")
  compte?: string // Code compte interne (ex: "2VPBA0")
  date_debut_dem?: Date // Date début demande
  date_fin_dem?: Date // Date fin demande
  responsable?: string // Responsable de l'affaire
  budget_heures?: number // Budget en heures
  raf?: number // Reste À Faire (heures)
  date_maj?: Date // Date dernière mise à jour
  total_planifie?: number // Total heures planifiées
  // Champs existants
  date_creation: Date
  date_modification: Date
  actif: boolean
  created_by?: string
  updated_by?: string
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
