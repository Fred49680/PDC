/**
 * Types pour les transferts de ressources entre sites
 */

export interface Transfert {
  id: string
  ressource_id: string
  site_origine: string
  site_destination: string
  date_debut: Date
  date_fin: Date
  statut: 'Planifié' | 'Appliqué'
  date_creation: Date
  created_by?: string
  distance_km?: number // Distance en kilomètres entre l'adresse du domicile et le site de destination
  duration_minutes?: number // Durée du trajet en minutes
  // Relations
  ressource?: {
    id: string
    nom: string
    site: string
    actif: boolean
  }
}

export interface CreateTransfertInput {
  ressource_id: string
  site_origine: string
  site_destination: string
  date_debut: Date | string
  date_fin: Date | string
  statut?: 'Planifié' | 'Appliqué'
}

export interface UpdateTransfertInput {
  site_origine?: string
  site_destination?: string
  date_debut?: Date | string
  date_fin?: Date | string
  statut?: 'Planifié' | 'Appliqué'
}
