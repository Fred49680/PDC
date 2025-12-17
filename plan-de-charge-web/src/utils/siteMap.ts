/**
 * Utilitaire pour convertir un nom de site en SiteMap (code abrégé)
 * Basé sur la règle Dim_Site
 */

const SITE_MAP: Record<string, string> = {
  // Sud Ouest
  'Blayais': 'BLA',
  'Golfech': 'GOL',
  
  // Rhône-Alpes
  'Bugey': 'BUG',
  'Cruas': 'CRU',
  'Tricastin': 'TRI',
  'Saint Alban': 'SAL',
  
  // Centre-Ouest
  'Civaux': 'CIV',
  
  // Val de Loire
  'Chinon': 'CHI',
  'Dampierre': 'DAM',
  'Belleville': 'BEL',
  'Saint-Laurent': 'SLB',
  'Autre Site': 'ASI',
  'Savigny': 'SVG',
  
  // Manche / Normandie
  'Flamanville': 'FLA',
  'Penly': 'PEN',
  'Paluel': 'PAL',
  
  // Nord
  'Gravelines': 'GRA',
  
  // Est
  'Cattenom': 'CAT',
  'Fessenheim': 'FES',
  
  // Champagne
  'Nogent': 'NOG',
}

/**
 * Convertit un nom de site en SiteMap (code abrégé)
 * @param siteName - Nom du site (ex: "Belleville")
 * @returns Code SiteMap (ex: "BEL") ou le nom original si non trouvé
 */
export function getSiteMap(siteName: string): string {
  if (!siteName) return ''
  
  const normalized = siteName.trim()
  
  // Recherche exacte (insensible à la casse)
  for (const [site, map] of Object.entries(SITE_MAP)) {
    if (site.toLowerCase() === normalized.toLowerCase()) {
      return map
    }
  }
  
  // Si non trouvé, retourner les 3 premières lettres en majuscules
  // comme fallback
  if (normalized.length >= 3) {
    return normalized.substring(0, 3).toUpperCase()
  }
  
  return normalized.toUpperCase()
}

/**
 * Génère l'affaire_id selon la formule Excel
 * Format : [Tranche][SiteMap][Affaire]
 * 
 * @param tranche - Tranche/Segment (ex: "TOUTE")
 * @param site - Nom du site (ex: "Belleville")
 * @param affaire - Nom de l'affaire/libellé (ex: "PACK TEM")
 * @param statut - Statut de l'affaire (ex: "Ouverte", "Prévisionnelle")
 * @returns L'affaire_id généré ou une chaîne vide si statut invalide
 */
export function generateAffaireId(
  tranche: string,
  site: string,
  affaire: string,
  statut: string
): string {
  // Si le statut n'est pas "Ouverte" ou "Prévisionnelle", retourner vide
  const statutNormalized = statut?.trim() || ''
  if (
    statutNormalized.toLowerCase() !== 'ouverte' &&
    statutNormalized.toLowerCase() !== 'prévisionnelle' &&
    statutNormalized.toLowerCase() !== 'previsionnelle'
  ) {
    return ''
  }
  
  // Générer l'affaire_id au format [Tranche][SiteMap][Affaire]
  const siteMap = getSiteMap(site)
  const trancheClean = (tranche || '').trim()
  const affaireClean = (affaire || '').trim()
  
  if (!trancheClean || !siteMap || !affaireClean) {
    return ''
  }
  
  return `[${trancheClean}][${siteMap}][${affaireClean}]`
}
