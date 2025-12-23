'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { useValidateAddress } from '@/hooks/useValidateAddress'
import { getVillesByCodePostal, type Ville } from '@/services/postalCode'
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface AdresseFormProps {
  /** Valeur actuelle de l'adresse (complète) */
  value?: string
  /** Callback appelé quand l'adresse change (adresse complète formatée) */
  onChange: (adresse: string) => void
  /** Label du champ */
  label?: string
  /** Placeholder */
  placeholder?: string
  /** Validation automatique activée */
  autoValidate?: boolean
}

/**
 * Composant de formulaire d'adresse avec validation et suggestions de villes par code postal
 */
export function AdresseForm({
  value = '',
  onChange,
  label = 'Adresse du domicile',
  placeholder = 'Ex: 123 Rue Example, 75001 Paris, France',
  autoValidate = true,
}: AdresseFormProps) {
  // État pour les champs détaillés
  const [rue, setRue] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [villesDisponibles, setVillesDisponibles] = useState<Ville[]>([])
  const [loadingVilles, setLoadingVilles] = useState(false)

  // Hook de validation
  const { validate, loading: validating, isValid, error: validationError, formattedAddress } =
    useValidateAddress()

  // Parser l'adresse existante au montage (une seule fois)
  useEffect(() => {
    if (value && !rue && !codePostal && !ville) {
      parseAdresseExistante(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]) // Ne pas inclure rue, codePostal, ville dans les dépendances pour éviter les boucles

  // Formater l'adresse complète
  const formatAdresse = useCallback((): string => {
    const parts: string[] = []
    if (rue) parts.push(rue)
    if (codePostal && ville) {
      parts.push(`${codePostal} ${ville}`)
    } else if (codePostal) {
      parts.push(codePostal)
    } else if (ville) {
      parts.push(ville)
    }
    parts.push('France')
    return parts.join(', ')
  }, [rue, codePostal, ville])

  // Parser une adresse existante (format: "rue, codePostal ville, pays")
  const parseAdresseExistante = useCallback((adresse: string) => {
    // Format attendu: "123 Rue Example, 75001 Paris, France"
    const parts = adresse.split(',').map((p) => p.trim())

    if (parts.length >= 2) {
      setRue(parts[0] || '')

      // Partie code postal + ville (ex: "75001 Paris")
      const codePostalVille = parts[1] || ''
      const match = codePostalVille.match(/^(\d{5})\s+(.+)$/)
      if (match) {
        setCodePostal(match[1])
        setVille(match[2])
      } else {
        // Si pas de code postal, mettre tout dans ville
        setVille(codePostalVille)
      }
    } else if (parts.length === 1) {
      // Si une seule partie, c'est probablement juste la rue
      setRue(parts[0])
    }
  }, [])

  // Charger les villes quand le code postal change
  const loadVilles = useCallback(async (cp: string) => {
    setLoadingVilles(true)
    try {
      const villes = await getVillesByCodePostal(cp)
      setVillesDisponibles(villes)

      // Si une seule ville, la sélectionner automatiquement
      if (villes.length === 1 && !ville) {
        setVille(villes[0].nom)
      }
    } catch (error) {
      console.error('Erreur chargement villes:', error)
    } finally {
      setLoadingVilles(false)
    }
  }, [ville])

  useEffect(() => {
    if (codePostal && /^\d{5}$/.test(codePostal)) {
      loadVilles(codePostal)
    } else {
      setVillesDisponibles([])
    }
  }, [codePostal, loadVilles])

  // Formater l'adresse complète et appeler onChange (uniquement si les champs changent)
  useEffect(() => {
    // Éviter les appels initiaux si les champs sont vides
    if (!rue && !codePostal && !ville) {
      return
    }

    const adresseComplete = formatAdresse()
    if (adresseComplete && adresseComplete !== value) {
      onChange(adresseComplete)
    }
  }, [formatAdresse, onChange, rue, codePostal, ville, value])

  // Valider l'adresse
  const handleValidate = async () => {
    const adresseComplete = formatAdresse()
    if (adresseComplete) {
      await validate(adresseComplete)
    }
  }

  // Adresse formatée depuis la validation - utiliser l'adresse vérifiée
  useEffect(() => {
    if (formattedAddress && autoValidate && isValid) {
      // Si la validation retourne une adresse formatée différente, l'utiliser
      const currentFormatted = formatAdresse()
      if (formattedAddress !== currentFormatted) {
        // Mettre à jour avec l'adresse formatée par l'API de vérification
        parseAdresseExistante(formattedAddress)
        // Appeler onChange avec l'adresse formatée vérifiée
        onChange(formattedAddress)
      }
    }
  }, [formattedAddress, isValid, autoValidate, formatAdresse, onChange, parseAdresseExistante])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>

        {/* Champ Rue */}
        <div className="mb-4">
          <Input
            label="Rue et numéro"
            type="text"
            value={rue}
            onChange={(e) => setRue(e.target.value)}
            placeholder="Ex: 123 Rue Example"
          />
        </div>

        {/* Code postal et Ville sur la même ligne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Input
              label="Code postal"
              type="text"
              value={codePostal}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                setCodePostal(value)
              }}
              placeholder="75001"
              maxLength={5}
            />
            {loadingVilles && codePostal.length === 5 && (
              <div className="absolute right-3 top-9">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          <div>
            {villesDisponibles.length > 0 ? (
              <Select
                label="Ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                options={[
                  { value: '', label: 'Sélectionner une ville...' },
                  ...villesDisponibles.map((v) => ({
                    value: v.nom,
                    label: v.nom,
                  })),
                ]}
              />
            ) : (
              <Input
                label="Ville"
                type="text"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="Ex: Paris"
                disabled={loadingVilles && codePostal.length === 5}
              />
            )}
          </div>
        </div>

        {/* Adresse complète formatée (lecture seule) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Adresse complète
          </label>
          <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
            {formatAdresse() || <span className="text-gray-400 italic">Adresse incomplète</span>}
          </div>
        </div>

        {/* Bouton de validation */}
        {autoValidate && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || !formatAdresse()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validation en cours...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Valider l'adresse
                </>
              )}
            </button>
          </div>
        )}

        {/* Message de validation */}
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Adresse invalide</p>
                <p className="text-sm text-red-700 mt-1">{validationError}</p>
                <p className="text-xs text-red-600 mt-2">
                  Vérifiez l'orthographe et la complétude de l'adresse (rue, code postal, ville).
                </p>
              </div>
            </div>
          </div>
        )}

        {isValid && formattedAddress && (
          <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Adresse valide</p>
                <p className="text-sm text-green-700 mt-1">{formattedAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* Aide */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Astuce :</strong> Saisissez d'abord le code postal pour voir les villes disponibles.
            L'adresse sera automatiquement formatée et validée.
          </p>
        </div>
      </div>
    </div>
  )
}

