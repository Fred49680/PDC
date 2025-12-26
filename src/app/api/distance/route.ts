import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Route API pour calculer la distance entre deux adresses
 * Utilise Google Maps Distance Matrix API côté serveur pour éviter les problèmes CORS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adresseOrigine, adresseDestination } = body

    if (!adresseOrigine || !adresseDestination) {
      return NextResponse.json(
        { error: 'Adresses manquantes' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Google Maps non configurée' },
        { status: 500 }
      )
    }

    // Appel à l'API Google Maps Distance Matrix
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

        return NextResponse.json({
          distanceKm: Math.round(distance * 100) / 100,
          durationMinutes: Math.round(duration),
          success: true,
          route: {
            distance: element.distance.value, // en mètres
            duration: element.duration.value, // en secondes
          },
        })
      }

      return NextResponse.json(
        {
          distanceKm: 0,
          durationMinutes: 0,
          success: false,
          error: `Impossible de calculer la distance: ${element.status}`,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        distanceKm: 0,
        durationMinutes: 0,
        success: false,
        error: `Erreur API Google: ${data.status}`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur route API distance:', error)
    return NextResponse.json(
      {
        distanceKm: 0,
        durationMinutes: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

