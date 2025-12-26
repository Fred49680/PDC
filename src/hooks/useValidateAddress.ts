'use client'

import { useState, useCallback } from 'react'
import { validateAddress, type AddressValidationResult } from '@/utils/validateAddress'

/**
 * Hook pour valider une adresse
 * Vérifie qu'une adresse existe et peut être géocodée
 */
export function useValidateAddress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null)

  /**
   * Valide une adresse
   */
  const validate = useCallback(async (address: string, useGoogle: boolean = true) => {
    if (!address || !address.trim()) {
      setError('Adresse vide')
      setValidationResult({ valid: false, error: 'Adresse vide' })
      return { valid: false, error: 'Adresse vide' }
    }

    try {
      setLoading(true)
      setError(null)

      const result = await validateAddress(address, useGoogle)
      setValidationResult(result)

      if (!result.valid) {
        setError(result.error || 'Adresse invalide')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      const result: AddressValidationResult = { valid: false, error: errorMessage }
      setValidationResult(result)
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Réinitialise l'état
   */
  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setValidationResult(null)
  }, [])

  return {
    validate,
    reset,
    loading,
    error,
    validationResult,
    isValid: validationResult?.valid || false,
    coordinates: validationResult?.coordinates,
    formattedAddress: validationResult?.formattedAddress,
  }
}

