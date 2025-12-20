# 🗺️ Guide : Calcul de Distance entre Domicile et Site

Ce guide explique comment utiliser la fonctionnalité de calcul de distance pour les Ordres d'Affectation (OA), permettant de calculer automatiquement les kilomètres entre l'adresse du domicile d'une ressource et le site d'affectation.

## 📋 Vue d'ensemble

La solution permet de :
- Stocker l'adresse du domicile de chaque ressource
- Stocker l'adresse de chaque site
- **Valider les adresses** avant de calculer (vérifie qu'elles existent)
- **Cache en base de données** pour éviter de recalculer les mêmes trajets
- Calculer automatiquement la distance en kilomètres entre ces deux adresses
- Afficher la distance et la durée du trajet dans l'interface

## 🚀 Installation

### 1. Appliquer la migration SQL

Exécutez la migration `MIGRATION_ADD_ADRESSES_RESSOURCES_SITES.sql` dans Supabase :

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `MIGRATION_ADD_ADRESSES_RESSOURCES_SITES.sql`
4. Exécutez la requête

Cette migration ajoute :
- La colonne `adresse_domicile` à la table `ressources`
- La colonne `adresse` à la table `sites`

### 2. Configurer la clé API

Vous devez obtenir une clé API pour utiliser le service de calcul de distance. Deux options sont disponibles :

#### Option A : OpenRouteService (Gratuit - Recommandé pour commencer)

1. Créez un compte gratuit sur [OpenRouteService.org](https://openrouteservice.org/)
2. Obtenez votre clé API gratuite (2000 requêtes/jour)
3. Ajoutez la variable d'environnement dans votre projet :

```env
NEXT_PUBLIC_OPENROUTESERVICE_API_KEY=votre_cle_api_ici
```

**Avantages :**
- ✅ Gratuit (2000 requêtes/jour)
- ✅ Pas de carte bancaire requise
- ✅ Service fiable

**Inconvénients :**
- ⚠️ Limité à 2000 requêtes/jour
- ⚠️ Moins précis que Google Maps dans certains cas

#### Option B : Google Maps Distance Matrix API (Payant mais plus précis)

1. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API "Distance Matrix API"
3. Créez une clé API
4. Ajoutez la variable d'environnement :

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_google_ici
```

**Avantages :**
- ✅ Très précis
- ✅ Jusqu'à $200 de crédit gratuit par mois
- ✅ Service très fiable

**Inconvénients :**
- ⚠️ Nécessite une carte bancaire (mais crédit gratuit)
- ⚠️ Payant au-delà du crédit gratuit

### 3. Variables d'environnement locales

Pour le développement local, le fichier `.env.local` dans `plan-de-charge-web/` contient déjà la clé Google Maps :

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDY57ZffE7f8Homq8E8wybjOi9k21sMsU0
```

**Important :** Pour Vercel (production), vous devez également ajouter cette variable dans **Settings** → **Environment Variables** de votre projet Vercel.

### 4. Appliquer la migration du cache

Exécutez la migration `MIGRATION_CREATE_DISTANCES_CACHE.sql` dans Supabase pour créer la table de cache des distances :

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `MIGRATION_CREATE_DISTANCES_CACHE.sql`
4. Exécutez la requête

Cette migration crée la table `distances_cache` qui stocke les distances calculées pour éviter les recalculs.

## 💾 Saisie des adresses

### Validation automatique

Les adresses sont **automatiquement validées** avant le calcul de distance :
- ✅ Vérification que l'adresse existe (géocodage)
- ✅ Message d'erreur clair si l'adresse est invalide
- ✅ Suggestion de l'adresse formatée si disponible
- ✅ Évite les erreurs de calcul sur des adresses inexistantes

### Pour les ressources

L'adresse du domicile peut être saisie dans le formulaire de création/édition de ressource. Format recommandé :

```
123 Rue Example, 75001 Paris, France
```

### Pour les sites

L'adresse du site peut être saisie dans l'interface d'administration des sites (`/admin/sites`). Format recommandé :

```
Centrale Nucléaire de Blayais, 33340 Blaye, France
```

## 💻 Utilisation dans le code

### Exemple 1 : Valider une adresse avant de calculer

```typescript
import { useValidateAddress } from '@/hooks/useValidateAddress'

function AdresseInput() {
  const { validate, loading, error, isValid, formattedAddress } = useValidateAddress()
  const [adresse, setAdresse] = useState('')
  
  const handleValidate = async () => {
    const result = await validate(adresse)
    if (result.valid) {
      console.log('Adresse valide:', result.formattedAddress)
      console.log('Coordonnées:', result.coordinates)
    } else {
      console.error('Adresse invalide:', result.error)
    }
  }
  
  return (
    <div>
      <input 
        value={adresse}
        onChange={(e) => setAdresse(e.target.value)}
        placeholder="Entrez une adresse"
      />
      <button onClick={handleValidate} disabled={loading}>
        {loading ? 'Validation...' : 'Valider l\'adresse'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {isValid && formattedAddress && (
        <p className="text-green-500">✓ {formattedAddress}</p>
      )}
    </div>
  )
}
```

### Exemple 2 : Calculer la distance entre une ressource et un site

```typescript
import { useDistanceRessourceSite } from '@/hooks/useDistance'

function AffectationDistance({ ressourceId, siteId }) {
  const { ressources } = useRessources({ ressourceId })
  const { sites } = useSites()
  
  const ressource = ressources[0]
  const site = sites.find(s => s.id === siteId)
  
  const { 
    calculateRessourceToSite, 
    loading, 
    distanceKm, 
    formattedDistance,
    formattedDuration,
    error 
  } = useDistanceRessourceSite()
  
  useEffect(() => {
    if (ressource?.adresse_domicile && site?.adresse) {
      calculateRessourceToSite(ressource.adresse_domicile, site.adresse)
    }
  }, [ressource?.adresse_domicile, site?.adresse])
  
  if (loading) return <div>Calcul de la distance...</div>
  if (error) return <div className="text-red-500">Erreur: {error}</div>
  
  return (
    <div>
      <p>Distance: {formattedDistance}</p>
      <p>Durée: {formattedDuration}</p>
    </div>
  )
}
```

### Exemple 2 : Calculer la distance avec options personnalisées

```typescript
import { useDistance } from '@/hooks/useDistance'

function CalculDistancePersonnalise() {
  const { calculate, loading, distanceKm, durationMinutes, formattedDistance } = useDistance({
    profile: 'driving-car', // ou 'driving-hgv', 'foot-walking', etc.
    apiProvider: 'openrouteservice', // ou 'google'
    enableCache: true // Cache les résultats pour éviter les appels multiples
  })
  
  const handleCalculate = async () => {
    const result = await calculate(
      '123 Rue Example, Paris, France',
      'Centrale Nucléaire de Blayais, Blaye, France'
    )
    
    if (result?.success) {
      console.log(`Distance: ${result.distanceKm} km`)
      console.log(`Durée: ${result.durationMinutes} minutes`)
    }
  }
  
  return (
    <button onClick={handleCalculate} disabled={loading}>
      {loading ? 'Calcul...' : 'Calculer la distance'}
    </button>
  )
}
```

### Exemple 3 : Utilisation directe du service

```typescript
import { calculateDistance, formatDistance, formatDuration } from '@/utils/distance'

async function calculerDistanceManuelle() {
  const result = await calculateDistance(
    '123 Rue Example, Paris, France',
    'Centrale Nucléaire de Blayais, Blaye, France',
    {
      profile: 'driving-car',
      apiProvider: 'openrouteservice'
    }
  )
  
  if (result.success) {
    console.log(`Distance: ${formatDistance(result.distanceKm)}`)
    console.log(`Durée: ${formatDuration(result.durationMinutes)}`)
  } else {
    console.error(`Erreur: ${result.error}`)
  }
}
```

## 🎨 Intégration dans les affectations

Pour afficher automatiquement la distance lors de la création d'une affectation :

```typescript
import { useDistanceRessourceSite } from '@/hooks/useDistance'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'

function FormulaireAffectation({ ressourceId, siteId }) {
  const { ressources } = useRessources({ ressourceId })
  const { sites } = useSites()
  const { calculateRessourceToSite, loading, formattedDistance, formattedDuration } = useDistanceRessourceSite()
  
  const [distanceInfo, setDistanceInfo] = useState<{
    distance: string | null
    duration: string | null
  } | null>(null)
  
  useEffect(() => {
    const ressource = ressources[0]
    const site = sites.find(s => s.site_key === siteId)
    
    if (ressource?.adresse_domicile && site?.adresse) {
      calculateRessourceToSite(ressource.adresse_domicile, site.adresse)
        .then(result => {
          if (result.success) {
            setDistanceInfo({
              distance: result.formattedDistance,
              duration: result.formattedDuration
            })
          }
        })
    }
  }, [ressourceId, siteId])
  
  return (
    <div>
      {/* Autres champs du formulaire */}
      
      {distanceInfo && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Informations de trajet</h3>
          <p>Distance: {distanceInfo.distance}</p>
          <p>Durée estimée: {distanceInfo.duration}</p>
        </div>
      )}
    </div>
  )
}
```

## 📊 API disponible

### Fonctions utilitaires

#### `calculateDistance(adresseOrigine, adresseDestination, options?)`

Calcule la distance et la durée entre deux adresses.

**Paramètres :**
- `adresseOrigine` (string) : Adresse de départ
- `adresseDestination` (string) : Adresse d'arrivée
- `options` (DistanceOptions) : Options de calcul

**Retourne :** `Promise<DistanceResult>`

**Exemple :**
```typescript
const result = await calculateDistance(
  '123 Rue Example, Paris',
  'Centrale de Blayais, Blaye',
  { profile: 'driving-car', apiProvider: 'openrouteservice' }
)
```

#### `geocodeAddress(address, apiKey?)`

Convertit une adresse en coordonnées géographiques (lat/lon).

**Paramètres :**
- `address` (string) : Adresse à géocoder
- `apiKey` (string, optionnel) : Clé API (utilise la variable d'environnement par défaut)

**Retourne :** `Promise<{ lat: number; lon: number } | null>`

#### `formatDistance(distanceKm)`

Formate une distance en kilomètres pour l'affichage.

**Exemple :**
```typescript
formatDistance(5.5) // "5.5 km"
formatDistance(0.5) // "500 m"
formatDistance(150) // "150 km"
```

#### `formatDuration(durationMinutes)`

Formate une durée en minutes pour l'affichage.

**Exemple :**
```typescript
formatDuration(45) // "45 min"
formatDuration(90) // "1h30"
formatDuration(120) // "2h"
```

### Hooks React

#### `useDistance(options?)`

Hook générique pour calculer la distance entre deux adresses.

**Exemple :**
```typescript
const { calculate, loading, distanceKm, formattedDistance } = useDistance({
  profile: 'driving-car',
  enableCache: true
})
```

#### `useDistanceRessourceSite()`

Hook spécialisé pour calculer la distance entre une ressource et un site.

**Exemple :**
```typescript
const { calculateRessourceToSite, loading, formattedDistance } = useDistanceRessourceSite()

const result = await calculateRessourceToSite(
  ressource.adresse_domicile,
  site.adresse
)
```

#### `useGeocode()`

Hook pour géocoder une adresse.

**Exemple :**
```typescript
const { geocode, loading, coordinates } = useGeocode()

const coords = await geocode('123 Rue Example, Paris')
// coords = { lat: 48.8566, lon: 2.3522 }
```

#### `useValidateAddress()`

Hook pour valider une adresse (vérifier qu'elle existe).

**Exemple :**
```typescript
const { validate, loading, isValid, error, formattedAddress } = useValidateAddress()

const result = await validate('123 Rue Example, Paris')
if (result.valid) {
  console.log('Adresse valide:', result.formattedAddress)
  console.log('Coordonnées:', result.coordinates)
}
```

## ⚙️ Options de configuration

### Profils de transport (OpenRouteService)

- `driving-car` : Voiture (défaut)
- `driving-hgv` : Poids lourd
- `foot-walking` : À pied
- `cycling-regular` : Vélo
- `cycling-road` : Vélo route
- `cycling-mountain` : Vélo tout-terrain

### Fournisseurs d'API

- `openrouteservice` : OpenRouteService (gratuit) - Utilisé par défaut si aucune clé Google n'est configurée
- `google` : Google Maps Distance Matrix API (payant mais plus précis) - **Utilisé par défaut actuellement** car la clé API est configurée

**Note :** La clé API Google Maps est déjà configurée dans le fichier `.env.local`. Le service détecte automatiquement la clé et utilise Google Maps par défaut pour des résultats plus précis.

## 🔍 Dépannage

### Erreur : "Clé API non configurée"

Vérifiez que la variable d'environnement est bien définie :
- Pour OpenRouteService : `NEXT_PUBLIC_OPENROUTESERVICE_API_KEY`
- Pour Google : `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Erreur : "Impossible de géocoder cette adresse"

1. Vérifiez que l'adresse est complète et correcte
2. Essayez d'ajouter le pays (ex: ", France")
3. Vérifiez que votre clé API est valide

### Erreur : "Limite de requêtes dépassée"

Si vous utilisez OpenRouteService gratuit :
- Vous avez atteint la limite de 2000 requêtes/jour
- Attendez le lendemain ou passez à un compte payant

### Les distances ne sont pas précises

- Les distances sont calculées en suivant les routes réelles
- La distance peut varier selon le mode de transport choisi
- Pour des calculs très précis, utilisez Google Maps API

## 📝 Notes importantes

1. **Cache en base de données** : Les distances calculées sont automatiquement stockées dans la table `distances_cache`. Si une distance a déjà été calculée pour un couple d'adresses, elle sera réutilisée sans appel API supplémentaire. Cela réduit considérablement l'utilisation de votre quota API.

2. **Validation des adresses** : Les adresses sont automatiquement validées avant le calcul :
   - Vérification que l'adresse existe via géocodage
   - Message d'erreur clair si l'adresse est invalide
   - Évite les erreurs de calcul sur des adresses inexistantes

3. **Double cache** : 
   - **Cache en base** : Persistant, partagé entre tous les utilisateurs
   - **Cache en mémoire** : Dans le hook React, pour éviter les appels multiples dans la même session

4. **Format des adresses** : Pour de meilleurs résultats, utilisez des adresses complètes incluant :
   - Numéro et nom de rue
   - Code postal et ville
   - Pays (optionnel mais recommandé)

5. **Performance** : 
   - Si la distance est en cache : récupération instantanée (pas d'appel API)
   - Si non en cache : validation des adresses + calcul (2-3 appels API)
   - Les résultats sont automatiquement mis en cache pour les prochaines fois

6. **Coûts** : 
   - OpenRouteService gratuit : 2000 requêtes/jour
   - Google Maps : $200 de crédit gratuit/mois, puis $5 pour 1000 requêtes
   - **Le cache réduit drastiquement les coûts** car les mêmes trajets ne sont calculés qu'une seule fois

## 🔄 Prochaines étapes

- [ ] Ajouter la distance calculée dans les exportations
- [ ] Créer un rapport de kilomètres par ressource
- [ ] Ajouter la possibilité de calculer plusieurs itinéraires (plusieurs sites)
- [ ] Intégrer dans les ordres d'affectation (OA) pour afficher automatiquement les kilomètres

---

**Date de création :** 2025-01-27

