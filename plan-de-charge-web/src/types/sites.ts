/**
 * Types pour le module Sites
 */

export interface Site {
  id: string
  site: string
  site_key: string
  site_map: string
  region: string | null
  centre_ouest: string | null
  actif: boolean
  created_at: Date
  updated_at: Date
}
