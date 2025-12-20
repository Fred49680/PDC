/**
 * Service de cache des distances en base de données
 * Permet de stocker et récupérer les distances calculées pour éviter les recalculs
 */

import { createClient } from '@/lib/supabase/client'

export interface CachedDistance {
  id: string
  adresse_origine: string
  adresse_destination: string
  distance_km: number
  duration_minutes: number
  distance_meters: number
  duration_seconds: number
  api_provider: string
  profile?: string
  created_at: Date
  updated_at: Date
}

/**
 * Récupère une distance depuis le cache
 */
export async function getCachedDistance(
  adresseOrigine: string,
  adresseDestination: string,
  profile: string = 'driving-car'
): Promise<CachedDistance | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('distances_cache')
      .select('*')
      .eq('adresse_origine', adresseOrigine.trim())
      .eq('adresse_destination', adresseDestination.trim())
      .eq('profile', profile)
      .maybeSingle()

    if (error) {
      console.error('[distanceCache] Erreur récupération cache:', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      adresse_origine: data.adresse_origine,
      adresse_destination: data.adresse_destination,
      distance_km: parseFloat(data.distance_km),
      duration_minutes: data.duration_minutes,
      distance_meters: data.distance_meters,
      duration_seconds: data.duration_seconds,
      api_provider: data.api_provider,
      profile: data.profile || undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    }
  } catch (error) {
    console.error('[distanceCache] Erreur:', error)
    return null
  }
}

/**
 * Sauvegarde une distance dans le cache
 */
export async function saveCachedDistance(
  adresseOrigine: string,
  adresseDestination: string,
  distanceKm: number,
  durationMinutes: number,
  distanceMeters: number,
  durationSeconds: number,
  apiProvider: string,
  profile: string = 'driving-car'
): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('distances_cache')
      .upsert(
        {
          adresse_origine: adresseOrigine.trim(),
          adresse_destination: adresseDestination.trim(),
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          distance_meters: distanceMeters,
          duration_seconds: durationSeconds,
          api_provider: apiProvider,
          profile: profile,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'adresse_origine,adresse_destination,profile',
        }
      )

    if (error) {
      console.error('[distanceCache] Erreur sauvegarde cache:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[distanceCache] Erreur:', error)
    return false
  }
}

/**
 * Supprime une entrée du cache (utile pour forcer le recalcul)
 */
export async function deleteCachedDistance(
  adresseOrigine: string,
  adresseDestination: string,
  profile: string = 'driving-car'
): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('distances_cache')
      .delete()
      .eq('adresse_origine', adresseOrigine.trim())
      .eq('adresse_destination', adresseDestination.trim())
      .eq('profile', profile)

    if (error) {
      console.error('[distanceCache] Erreur suppression cache:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[distanceCache] Erreur:', error)
    return false
  }
}

