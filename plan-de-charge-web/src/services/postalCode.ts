/**
 * Service pour récupérer les villes associées à un code postal français
 * Utilise l'API Géo (gouvernement français) ou une API alternative
 */

export interface Ville {
  nom: string
  codePostal: string
  codeCommune?: string
  departement?: string
}

/**
 * Récupère les villes associées à un code postal
 * Utilise l'API Géo du gouvernement français (gratuite, pas de clé requise)
 */
export async function getVillesByCodePostal(codePostal: string): Promise<Ville[]> {
  if (!codePostal || codePostal.trim().length !== 5 || !/^\d{5}$/.test(codePostal)) {
    return []
  }

  try {
    // Utiliser l'API Géo du gouvernement français
    // Documentation: https://geo.api.gouv.fr/adresse
    const response = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=nom,code,codesPostaux,codeDepartement&format=json`
    )

    if (!response.ok) {
      console.warn(`[postalCode] Erreur API Géo: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    // Transformer les données de l'API
    const villes: Ville[] = data.map((commune: any) => ({
      nom: commune.nom,
      codePostal: codePostal,
      codeCommune: commune.code,
      departement: commune.codeDepartement,
    }))

    // Trier par nom de ville
    villes.sort((a, b) => a.nom.localeCompare(b.nom))

    return villes
  } catch (error) {
    console.error('[postalCode] Erreur récupération villes:', error)
    return []
  }
}

/**
 * Recherche de villes par nom (autocomplétion)
 */
export async function searchVilles(nom: string, limit: number = 10): Promise<Ville[]> {
  if (!nom || nom.trim().length < 2) {
    return []
  }

  try {
    const response = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&fields=nom,code,codesPostaux,codeDepartement&format=json&limit=${limit}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    // Transformer les données (une commune peut avoir plusieurs codes postaux)
    const villes: Ville[] = []
    data.forEach((commune: any) => {
      const codesPostaux = commune.codesPostaux || []
      codesPostaux.forEach((cp: string) => {
        villes.push({
          nom: commune.nom,
          codePostal: cp,
          codeCommune: commune.code,
          departement: commune.codeDepartement,
        })
      })
    })

    // Trier par nom
    villes.sort((a, b) => a.nom.localeCompare(b.nom))

    return villes
  } catch (error) {
    console.error('[postalCode] Erreur recherche villes:', error)
    return []
  }
}

/**
 * Formate une adresse complète à partir des composants
 */
export function formatAdresseComplete(
  rue?: string,
  codePostal?: string,
  ville?: string,
  pays: string = 'France'
): string {
  const parts: string[] = []

  if (rue) parts.push(rue)
  if (codePostal && ville) {
    parts.push(`${codePostal} ${ville}`)
  } else if (codePostal) {
    parts.push(codePostal)
  } else if (ville) {
    parts.push(ville)
  }
  if (pays) parts.push(pays)

  return parts.join(', ')
}

