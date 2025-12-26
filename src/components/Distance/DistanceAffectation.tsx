'use client'

import { useEffect, useState } from 'react'
import { useDistanceRessourceSite } from '@/hooks/useDistance'
import { MapPin, Navigation, Clock } from 'lucide-react'

interface DistanceAffectationProps {
  /** Adresse du domicile de la ressource */
  adresseDomicile?: string
  /** Adresse du site d'affectation */
  adresseSite?: string
  /** Afficher uniquement la distance (masque la durée) */
  distanceOnly?: boolean
}

/**
 * Composant pour afficher la distance et la durée entre le domicile d'une ressource et un site
 * 
 * @example
 * ```tsx
 * <DistanceAffectation 
 *   adresseDomicile="123 Rue Example, 75001 Paris, France"
 *   adresseSite="Centrale Nucléaire de Blayais, 33340 Blaye, France"
 * />
 * ```
 */
export function DistanceAffectation({
  adresseDomicile,
  adresseSite,
  distanceOnly = false,
}: DistanceAffectationProps) {
  const { calculateRessourceToSite, loading, formattedDistance, formattedDuration, error } =
    useDistanceRessourceSite()

  const [distanceInfo, setDistanceInfo] = useState<{
    distance: string
    duration: string
  } | null>(null)

  useEffect(() => {
    if (adresseDomicile && adresseSite) {
      calculateRessourceToSite(adresseDomicile, adresseSite).then((result) => {
        if (result.success && result.formattedDistance && result.formattedDuration) {
          setDistanceInfo({
            distance: result.formattedDistance,
            duration: result.formattedDuration,
          })
        }
      })
    } else {
      setDistanceInfo(null)
    }
  }, [adresseDomicile, adresseSite, calculateRessourceToSite])

  if (!adresseDomicile || !adresseSite) {
    return (
      <div className="text-sm text-gray-500 italic">
        Adresses manquantes pour calculer la distance
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <span>Calcul de la distance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
        <p className="font-semibold">Erreur de calcul</p>
        <p>{error}</p>
      </div>
    )
  }

  if (!distanceInfo) {
    return null
  }

  return (
    <div className="rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-blue-100 p-2">
          <MapPin className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="mb-2 text-sm font-semibold text-gray-900">
            Informations de trajet
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-gray-700">
                <span className="font-medium">Distance :</span> {distanceInfo.distance}
              </span>
            </div>
            {!distanceOnly && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">
                  <span className="font-medium">Durée estimée :</span>{' '}
                  {distanceInfo.duration}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Version compacte du composant (affichage minimaliste)
 */
export function DistanceAffectationCompact({
  adresseDomicile,
  adresseSite,
}: DistanceAffectationProps) {
  const { calculateRessourceToSite, loading, formattedDistance, error } =
    useDistanceRessourceSite()

  const [distance, setDistance] = useState<string | null>(null)

  useEffect(() => {
    if (adresseDomicile && adresseSite) {
      calculateRessourceToSite(adresseDomicile, adresseSite).then((result) => {
        if (result.success && result.formattedDistance) {
          setDistance(result.formattedDistance)
        }
      })
    } else {
      setDistance(null)
    }
  }, [adresseDomicile, adresseSite, calculateRessourceToSite])

  if (!adresseDomicile || !adresseSite) {
    return null
  }

  if (loading) {
    return <span className="text-sm text-gray-500">Calcul...</span>
  }

  if (error || !distance) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-700">
      <MapPin className="h-3 w-3" />
      {distance}
    </span>
  )
}

