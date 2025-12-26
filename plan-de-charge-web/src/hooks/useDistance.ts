'use client'

import { useState, useCallback } from 'react'
import {
  calculateDistance,
  geocodeAddress,
  type DistanceResult,
  type DistanceOptions,
  formatDistance,
  formatDuration,
} from '@/utils/distance'

interface UseDistanceOptions extends DistanceOptions {
  /**
   * Cache les résultats par défaut (évite les appels multiples pour les mêmes adresses)
   */
  enableCache?: boolean
  /**
   * Valide les adresses avant de calculer (défaut: true)
   */
  validateAddresses?: boolean
}

/**
 * Hook pour calculer la distance entre deux adresses
 * Utile pour calculer les kilomètres entre le domicile d'une ressource et un site
 */
export function useDistance(options: UseDistanceOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DistanceResult | null>(null)

  // Cache simple en mémoire (clef: "adresse1|adresse2")
  const cacheRef = useState<Map<string, DistanceResult>>(new Map())[0]
  const { enableCache = true, validateAddresses = true, ...distanceOptions } = options

  /**
   * Calcule la distance entre deux adresses
   */
  const calculate = useCallback(
    async (adresseOrigine: string, adresseDestination: string) => {
      if (!adresseOrigine || !adresseDestination) {
        setError('Les deux adresses sont requises')
        setResult(null)
        return null
      }

      // Vérifier le cache
      const cacheKey = `${adresseOrigine}|${adresseDestination}`
      if (enableCache && cacheRef.has(cacheKey)) {
        const cachedResult = cacheRef.get(cacheKey)!
        setResult(cachedResult)
        setError(cachedResult.success ? null : cachedResult.error || 'Erreur inconnue')
        return cachedResult
      }

      try {
        setLoading(true)
        setError(null)

        const distanceResult = await calculateDistance(
          adresseOrigine,
          adresseDestination,
          distanceOptions,
          validateAddresses
        )

        // Mettre en cache si succès
        if (enableCache && distanceResult.success) {
          cacheRef.set(cacheKey, distanceResult)
        }

        setResult(distanceResult)

        if (!distanceResult.success) {
          setError(distanceResult.error || 'Erreur lors du calcul de distance')
        }

        return distanceResult
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
        setError(errorMessage)
        setResult({
          distanceKm: 0,
          durationMinutes: 0,
          success: false,
          error: errorMessage,
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [distanceOptions, enableCache, validateAddresses, cacheRef]
  )

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setResult(null)
    if (enableCache) {
      cacheRef.clear()
    }
  }, [enableCache, cacheRef])

  /**
   * Formate la distance pour l'affichage
   */
  const formattedDistance = result?.success ? formatDistance(result.distanceKm) : null

  /**
   * Formate la durée pour l'affichage
   */
  const formattedDuration = result?.success
    ? formatDuration(result.durationMinutes)
    : null

  return {
    calculate,
    reset,
    loading,
    error,
    result,
    distanceKm: result?.success ? result.distanceKm : null,
    durationMinutes: result?.success ? result.durationMinutes : null,
    formattedDistance,
    formattedDuration,
    success: result?.success || false,
  }
}

/**
 * Hook spécialisé pour calculer la distance entre une ressource et un site
 * Prend directement les objets Ressource et Site en paramètre
 */
export function useDistanceRessourceSite() {
  const distanceHook = useDistance({ enableCache: true })

  const calculateRessourceToSite = useCallback(
    async (
      adresseDomicile: string | undefined,
      adresseSite: string | undefined
    ) => {
      if (!adresseDomicile || !adresseSite) {
        return {
          success: false,
          error: 'Adresses manquantes. Veuillez renseigner l\'adresse du domicile de la ressource et l\'adresse du site.',
          distanceKm: null,
          durationMinutes: null,
        }
      }

      const result = await distanceHook.calculate(adresseDomicile, adresseSite)
      return {
        success: result?.success || false,
        error: result?.error,
        distanceKm: result?.distanceKm || null,
        durationMinutes: result?.durationMinutes || null,
        formattedDistance: result?.success ? formatDistance(result.distanceKm) : null,
        formattedDuration: result?.success
          ? formatDuration(result.durationMinutes)
          : null,
      }
    },
    [distanceHook]
  )

  return {
    ...distanceHook,
    calculateRessourceToSite,
  }
}

/**
 * Hook pour géocoder une adresse (convertir adresse en coordonnées)
 */
export function useGeocode() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(
    null
  )

  const geocode = useCallback(async (address: string, apiKey?: string) => {
    if (!address || !address.trim()) {
      setError('Adresse manquante')
      setCoordinates(null)
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const coords = await geocodeAddress(address, apiKey)

      if (coords) {
        setCoordinates(coords)
        return coords
      } else {
        setError('Impossible de géocoder cette adresse')
        setCoordinates(null)
        return null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      setCoordinates(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setCoordinates(null)
  }, [])

  return {
    geocode,
    reset,
    loading,
    error,
    coordinates,
  }
}

