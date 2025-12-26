/**
 * Service de validation d'adresses
 * Vérifie qu'une adresse existe et peut être géocodée
 */

export interface AddressValidationResult {
  valid: boolean
  error?: string
  coordinates?: { lat: number; lon: number }
  formattedAddress?: string
}

/**
 * Valide une adresse en la géocodant
 * Retourne true si l'adresse peut être trouvée
 */
export async function validateAddress(
  address: string,
  useGoogle: boolean = true
): Promise<AddressValidationResult> {
  if (!address || !address.trim()) {
    return {
      valid: false,
      error: 'Adresse vide',
    }
  }

  try {
    if (useGoogle) {
      return await validateAddressGoogle(address)
    } else {
      return await validateAddressOpenRouteService(address)
    }
  } catch (error) {
    console.error('Erreur lors de la validation d\'adresse:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la validation',
    }
  }
}

/**
 * Valide une adresse avec Google Maps Geocoding API
 */
async function validateAddressGoogle(address: string): Promise<AddressValidationResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return {
      valid: false,
      error: 'Clé API Google Maps non configurée',
    }
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=fr&region=fr`
    )

    if (!response.ok) {
      throw new Error(`Erreur API Google: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        valid: true,
        coordinates: {
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
      }
    } else if (data.status === 'ZERO_RESULTS') {
      return {
        valid: false,
        error: 'Adresse introuvable. Vérifiez l\'orthographe et la complétude de l\'adresse.',
      }
    } else {
      return {
        valid: false,
        error: `Erreur de géocodage: ${data.status}`,
      }
    }
  } catch (error) {
    console.error('Erreur validation Google:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la validation',
    }
  }
}

/**
 * Valide une adresse avec OpenRouteService
 */
async function validateAddressOpenRouteService(address: string): Promise<AddressValidationResult> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY

  if (!apiKey) {
    return {
      valid: false,
      error: 'Clé API OpenRouteService non configurée',
    }
  }

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/geocoding/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=FR`
    )

    if (!response.ok) {
      throw new Error(`Erreur API OpenRouteService: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const [lon, lat] = feature.geometry.coordinates
      return {
        valid: true,
        coordinates: { lat, lon },
        formattedAddress: feature.properties.label || address,
      }
    }

    return {
      valid: false,
      error: 'Adresse introuvable. Vérifiez l\'orthographe et la complétude de l\'adresse.',
    }
  } catch (error) {
    console.error('Erreur validation OpenRouteService:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la validation',
    }
  }
}

/**
 * Normalise une adresse pour le cache (enlève les espaces multiples, met en minuscules, etc.)
 */
export function normalizeAddress(address: string): string {
  if (!address) return ''
  return address
    .trim()
    .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlève les accents pour normalisation
}

