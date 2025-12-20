/**
 * Service de calcul de distance entre deux adresses
 * Utilise OpenRouteService (gratuit) ou Google Maps Distance Matrix API
 */

export interface DistanceResult {
  distanceKm: number // Distance en kilomètres
  durationMinutes: number // Durée du trajet en minutes
  success: boolean
  error?: string
  route?: {
    distance: number // Distance en mètres
    duration: number // Durée en secondes
  }
}

export interface DistanceOptions {
  /**
   * Mode de transport (default: 'driving-car')
   * Options: 'driving-car', 'driving-hgv', 'foot-walking', 'cycling-regular', 'cycling-road', 'cycling-mountain'
   */
  profile?: string
  /**
   * Format des coordonnées (default: 'geojson')
   */
  format?: 'geojson' | 'json'
  /**
   * API à utiliser (default: 'openrouteservice')
   */
  apiProvider?: 'openrouteservice' | 'google'
}

/**
 * Convertit une adresse en coordonnées géographiques (géocodage)
 * Utilise l'API de géocodage d'OpenRouteService
 */
export async function geocodeAddress(
  address: string,
  apiKey?: string
): Promise<{ lat: number; lon: number } | null> {
  if (!address || !address.trim()) {
    return null
  }

  const key = apiKey || process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY

  if (!key) {
    console.warn('Clé API OpenRouteService non configurée')
    return null
  }

  try {
    // Utiliser l'API de géocodage d'OpenRouteService
    const response = await fetch(
      `https://api.openrouteservice.org/geocoding/autocomplete?api_key=${key}&text=${encodeURIComponent(address)}&boundary.country=FR`
    )

    if (!response.ok) {
      throw new Error(`Erreur géocodage: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates
      return { lat, lon }
    }

    return null
  } catch (error) {
    console.error('Erreur lors du géocodage:', error)
    return null
  }
}

/**
 * Calcule la distance et la durée entre deux adresses
 * Utilise OpenRouteService (gratuit, limité à 2000 requêtes/jour)
 * 
 * @param adresseOrigine Adresse de départ (ex: "123 Rue Example, 75001 Paris, France")
 * @param adresseDestination Adresse d'arrivée (ex: "Centrale Nucléaire de Blayais, 33340 Blaye, France")
 * @param options Options de calcul (mode de transport, etc.)
 * @returns Résultat avec distance en km et durée en minutes
 */
export async function calculateDistance(
  adresseOrigine: string,
  adresseDestination: string,
  options: DistanceOptions = {}
): Promise<DistanceResult> {
  if (!adresseOrigine || !adresseDestination) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: 'Adresses manquantes',
    }
  }

  // Utiliser Google Maps par défaut si la clé est disponible, sinon OpenRouteService
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const defaultProvider = googleApiKey ? 'google' : 'openrouteservice'
  const { profile = 'driving-car', apiProvider = defaultProvider } = options

  try {
    if (apiProvider === 'openrouteservice') {
      return await calculateDistanceOpenRouteService(
        adresseOrigine,
        adresseDestination,
        profile
      )
    } else if (apiProvider === 'google') {
      return await calculateDistanceGoogle(
        adresseOrigine,
        adresseDestination
      )
    }

    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: 'Fournisseur API non supporté',
    }
  } catch (error) {
    console.error('Erreur lors du calcul de distance:', error)
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Calcule la distance avec OpenRouteService (gratuit)
 */
async function calculateDistanceOpenRouteService(
  adresseOrigine: string,
  adresseDestination: string,
  profile: string = 'driving-car'
): Promise<DistanceResult> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY

  if (!apiKey) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: 'Clé API OpenRouteService non configurée. Ajoutez NEXT_PUBLIC_OPENROUTESERVICE_API_KEY dans vos variables d\'environnement.',
    }
  }

  try {
    // 1. Géocoder les adresses
    const coordsOrigine = await geocodeAddress(adresseOrigine, apiKey)
    const coordsDestination = await geocodeAddress(adresseDestination, apiKey)

    if (!coordsOrigine || !coordsDestination) {
      return {
        distanceKm: 0,
        durationMinutes: 0,
        success: false,
        error: 'Impossible de géocoder une ou plusieurs adresses',
      }
    }

    // 2. Calculer l'itinéraire
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [coordsOrigine.lon, coordsOrigine.lat],
            [coordsDestination.lon, coordsDestination.lat],
          ],
          format: 'json',
          units: 'm', // Utiliser les mètres (par défaut), on convertira ensuite en km
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Erreur OpenRouteService: ${response.statusText} - ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      // La distance retournée par OpenRouteService est en mètres par défaut
      const distanceMeters = route.summary?.distance || 0 // en mètres
      const duration = route.summary?.duration || 0 // en secondes

      return {
        distanceKm: Math.round((distanceMeters / 1000) * 100) / 100, // Convertir en km et arrondir à 2 décimales
        durationMinutes: Math.round(duration / 60), // Convertir en minutes
        success: true,
        route: {
          distance: distanceMeters, // en mètres
          duration: duration, // en secondes
        },
      }
    }

    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: 'Aucun itinéraire trouvé',
    }
  } catch (error) {
    console.error('Erreur OpenRouteService:', error)
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Erreur OpenRouteService',
    }
  }
}

/**
 * Calcule la distance avec Google Maps Distance Matrix API (payant mais plus précis)
 */
async function calculateDistanceGoogle(
  adresseOrigine: string,
  adresseDestination: string
): Promise<DistanceResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: 'Clé API Google Maps non configurée. Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY dans vos variables d\'environnement.',
    }
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(adresseOrigine)}&destinations=${encodeURIComponent(adresseDestination)}&key=${apiKey}&units=metric&language=fr`
    )

    if (!response.ok) {
      throw new Error(`Erreur Google Maps: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0]

      if (element.status === 'OK') {
        const distance = element.distance.value / 1000 // Convertir en km
        const duration = element.duration.value / 60 // Convertir en minutes

        return {
          distanceKm: Math.round(distance * 100) / 100,
          durationMinutes: Math.round(duration),
          success: true,
          route: {
            distance: element.distance.value, // en mètres
            duration: element.duration.value, // en secondes
          },
        }
      }

      return {
        distanceKm: 0,
        durationMinutes: 0,
        success: false,
        error: `Impossible de calculer la distance: ${element.status}`,
      }
    }

    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: `Erreur API Google: ${data.status}`,
    }
  } catch (error) {
    console.error('Erreur Google Maps:', error)
    return {
      distanceKm: 0,
      durationMinutes: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Erreur Google Maps',
    }
  }
}

/**
 * Formate une distance pour l'affichage
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm === 0) return '0 km'
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`
  return `${Math.round(distanceKm)} km`
}

/**
 * Formate une durée pour l'affichage
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) return `${durationMinutes} min`
  const heures = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (minutes === 0) return `${heures}h`
  return `${heures}h${minutes}`
}

