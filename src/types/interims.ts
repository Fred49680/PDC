/**
 * Types pour les intérims
 */

export interface Interim {
  id: string
  ressource_id: string
  site: string
  date_debut_contrat: Date
  date_fin_contrat: Date
  a_renouveler: string // 'A renouveler' | 'Oui' | 'Non' | ''
  date_mise_a_jour: Date
  commentaire?: string
  created_at: Date
  updated_at: Date
}
