import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Géocode une adresse avec OpenRouteService
 */
async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  if (!address || !address.trim()) {
    return null
  }

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/geocoding/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=FR`
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
 * Calcule la distance avec OpenRouteService
 */
async function calculateDistanceOpenRouteService(
  adresseOrigine: string,
  adresseDestination: string,
  apiKey: string
): Promise<{ distanceKm: number; durationMinutes: number; success: boolean; error?: string; distanceMeters?: number; durationSeconds?: number }> {
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
      `https://api.openrouteservice.org/v2/directions/driving-car`,
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
          units: 'm',
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
      const distanceMeters = route.summary?.distance || 0
      const duration = route.summary?.duration || 0

      return {
        distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
        durationMinutes: Math.round(duration / 60),
        success: true,
        distanceMeters: distanceMeters,
        durationSeconds: duration,
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
 * Calcule la distance avec Google Maps Distance Matrix API
 */
async function calculateDistanceGoogle(
  adresseOrigine: string,
  adresseDestination: string,
  apiKey: string
): Promise<{ distanceKm: number; durationMinutes: number; success: boolean; error?: string; distanceMeters?: number; durationSeconds?: number }> {
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
        const distanceMeters = element.distance.value
        const durationSeconds = element.duration.value
        const distance = distanceMeters / 1000
        const duration = durationSeconds / 60

        return {
          distanceKm: Math.round(distance * 100) / 100,
          durationMinutes: Math.round(duration),
          success: true,
          distanceMeters: distanceMeters,
          durationSeconds: durationSeconds,
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[calculate-transfert-distance] Début de la fonction')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    console.log('[calculate-transfert-distance] Configuration:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl.length,
      keyLength: supabaseServiceKey.length
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Configuration manquante: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non définis'
      console.error('[calculate-transfert-distance]', errorMsg, {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const body = await req.json()
    console.log('[calculate-transfert-distance] Body reçu:', {
      hasTransfertId: !!body.transfert_id,
      hasAdresseOrigine: !!body.adresse_origine,
      hasAdresseDestination: !!body.adresse_destination
    })
    
    const { transfert_id, adresse_origine, adresse_destination } = body

    if (!transfert_id || !adresse_origine || !adresse_destination) {
      const errorMsg = 'transfert_id, adresse_origine et adresse_destination sont requis'
      console.error('[calculate-transfert-distance]', errorMsg, body)
      return new Response(
        JSON.stringify({ error: errorMsg }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    console.log('[calculate-transfert-distance] Paramètres:', {
      transfert_id,
      adresse_origine: adresse_origine.substring(0, 50) + '...',
      adresse_destination: adresse_destination.substring(0, 50) + '...'
    })

    // Vérifier que le transfert existe
    const { data: transfert, error: transfertError } = await supabaseClient
      .from('transferts')
      .select('id')
      .eq('id', transfert_id)
      .single()

    if (transfertError || !transfert) {
      return new Response(
        JSON.stringify({ error: `Transfert ${transfert_id} introuvable` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // 1. Vérifier d'abord le cache
    console.log('[calculate-transfert-distance] Vérification du cache...')
    const adresseOrigineTrim = adresse_origine.trim()
    const adresseDestinationTrim = adresse_destination.trim()
    const profile = 'driving-car' // Mode de transport par défaut
    
    const { data: cachedDistance, error: cacheError } = await supabaseClient
      .from('distances_cache')
      .select('*')
      .eq('adresse_origine', adresseOrigineTrim)
      .eq('adresse_destination', adresseDestinationTrim)
      .eq('profile', profile)
      .maybeSingle()
    
    if (cachedDistance && !cacheError) {
      console.log('[calculate-transfert-distance] ✅ Distance trouvée dans le cache')
      // Utiliser les valeurs du cache
      const result = {
        distanceKm: parseFloat(cachedDistance.distance_km),
        durationMinutes: cachedDistance.duration_minutes,
        success: true,
        fromCache: true,
      }
      
      // Mettre à jour le transfert avec les valeurs du cache
      const { error: updateError } = await supabaseClient
        .from('transferts')
        .update({
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
        })
        .eq('id', transfert_id)
      
      if (updateError) {
        console.error('[calculate-transfert-distance] Erreur mise à jour transfert:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Erreur lors de la mise à jour du transfert',
            details: updateError.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          transfert_id,
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
          from_cache: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // 2. Si pas dans le cache, calculer via l'API
    console.log('[calculate-transfert-distance] Distance non trouvée dans le cache, calcul via API...')
    
    // Déterminer quelle API utiliser (Google Maps en priorité si disponible)
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    const openRouteApiKey = Deno.env.get('OPENROUTESERVICE_API_KEY') || Deno.env.get('NEXT_PUBLIC_OPENROUTESERVICE_API_KEY')

    console.log('[calculate-transfert-distance] Clés API:', {
      hasGoogleKey: !!googleApiKey,
      hasOpenRouteKey: !!openRouteApiKey,
    })

    let result: { 
      distanceKm: number
      durationMinutes: number
      success: boolean
      error?: string
      distanceMeters?: number
      durationSeconds?: number
      apiProvider?: string
    }

    if (googleApiKey) {
      console.log('[calculate-transfert-distance] Utilisation de Google Maps')
      const googleResult = await calculateDistanceGoogle(adresse_origine, adresse_destination, googleApiKey)
      result = {
        ...googleResult,
        apiProvider: 'google',
      }
      console.log('[calculate-transfert-distance] Résultat Google Maps:', result.success ? 'SUCCÈS' : 'ÉCHEC', result.error || '')
    } else if (openRouteApiKey) {
      console.log('[calculate-transfert-distance] Utilisation d\'OpenRouteService')
      const openRouteResult = await calculateDistanceOpenRouteService(adresse_origine, adresse_destination, openRouteApiKey)
      result = {
        ...openRouteResult,
        apiProvider: 'openrouteservice',
      }
      console.log('[calculate-transfert-distance] Résultat OpenRouteService:', result.success ? 'SUCCÈS' : 'ÉCHEC', result.error || '')
    } else {
      const errorMsg = 'Aucune clé API configurée (Google Maps ou OpenRouteService)'
      console.error('[calculate-transfert-distance]', errorMsg)
      return new Response(
        JSON.stringify({ error: errorMsg }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
    
    // 3. Si le calcul a réussi, sauvegarder dans le cache
    if (result.success) {
      // Récupérer distance_meters et duration_seconds depuis le résultat de l'API
      // Pour Google Maps, on doit les calculer
      const distanceMeters = result.distanceMeters || Math.round(result.distanceKm * 1000)
      const durationSeconds = result.durationSeconds || result.durationMinutes * 60
      
      console.log('[calculate-transfert-distance] Sauvegarde dans le cache...')
      const { error: cacheSaveError } = await supabaseClient
        .from('distances_cache')
        .upsert({
          adresse_origine: adresseOrigineTrim,
          adresse_destination: adresseDestinationTrim,
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
          distance_meters: distanceMeters,
          duration_seconds: durationSeconds,
          api_provider: result.apiProvider || 'google',
          profile: profile,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'adresse_origine,adresse_destination,profile',
        })
      
      if (cacheSaveError) {
        console.warn('[calculate-transfert-distance] Erreur sauvegarde cache (non bloquant):', cacheSaveError)
      } else {
        console.log('[calculate-transfert-distance] ✅ Distance sauvegardée dans le cache')
      }
    }

    // Mettre à jour le transfert avec la distance et la durée
    if (result.success) {
      const { error: updateError } = await supabaseClient
        .from('transferts')
        .update({
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
        })
        .eq('id', transfert_id)

      if (updateError) {
        console.error('Erreur lors de la mise à jour du transfert:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Erreur lors de la mise à jour du transfert',
            details: updateError.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          transfert_id,
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      // Le calcul a échoué, mais on ne bloque pas (on retourne juste un warning)
      console.warn(`Échec du calcul de distance pour le transfert ${transfert_id}:`, result.error)
      return new Response(
        JSON.stringify({
          success: false,
          transfert_id,
          error: result.error || 'Erreur inconnue lors du calcul de distance',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // On retourne 200 même en cas d'erreur pour ne pas bloquer le trigger
        }
      )
    }
  } catch (error: any) {
    console.error('Erreur Edge Function calculate-transfert-distance:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

