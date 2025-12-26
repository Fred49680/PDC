# Guide du Formulaire d'Adresse

## Vue d'ensemble

Le formulaire d'adresse pour les ressources permet de saisir une adresse complète avec :
- **Validation automatique** de l'existence de l'adresse
- **Suggestions de villes** basées sur le code postal
- **Formatage automatique** de l'adresse complète

## Fonctionnalités

### 1. Saisie structurée

Le formulaire propose 3 champs :
- **Rue et numéro** : Champ texte libre (ex: "123 Rue Example")
- **Code postal** : Champ numérique à 5 chiffres (ex: "75001")
- **Ville** : Champ texte ou liste déroulante selon le code postal

### 2. Suggestions de villes par code postal

Quand vous saisissez un code postal valide (5 chiffres), le système :
- Interroge automatiquement l'API Géo du gouvernement français
- Charge les villes associées à ce code postal
- Affiche une liste déroulante avec les villes disponibles
- Sélectionne automatiquement la ville si une seule est trouvée

**API utilisée** : [Géo API (gouvernement français)](https://geo.api.gouv.fr/communes) - gratuite, pas de clé requise

### 3. Validation d'adresse

Le bouton "Valider l'adresse" permet de :
- Vérifier que l'adresse existe réellement
- Obtenir les coordonnées géographiques
- Recevoir une adresse formatée normalisée

**API utilisée** :
- Par défaut : Google Maps Geocoding API (si clé configurée)
- Alternative : OpenRouteService (gratuit, nécessite une clé)

### 4. Formatage automatique

L'adresse complète est automatiquement formatée au format :
```
[rue], [codePostal] [ville], France
```

Exemple : `123 Rue Example, 75001 Paris, France`

## Utilisation dans l'application

### Intégration dans le modal de ressource

Le formulaire est intégré dans l'onglet "Adresse" du modal de modification de ressource.

```tsx
import { AdresseForm } from '@/components/Ressources/AdresseForm'

<AdresseForm
  value={formData.adresse_domicile}
  onChange={(adresse) => setFormData({ ...formData, adresse_domicile: adresse })}
  label="Adresse du domicile"
  autoValidate={true}
/>
```

### Props du composant

| Prop | Type | Description | Défaut |
|------|------|-------------|--------|
| `value` | `string?` | Adresse complète actuelle | `''` |
| `onChange` | `(adresse: string) => void` | Callback appelé quand l'adresse change | Requis |
| `label` | `string?` | Label du formulaire | `'Adresse du domicile'` |
| `placeholder` | `string?` | Placeholder (non utilisé actuellement) | `'Ex: 123 Rue Example, 75001 Paris, France'` |
| `autoValidate` | `boolean?` | Afficher le bouton de validation | `true` |

## Services et Hooks

### Service `postalCode.ts`

Fichier : `src/services/postalCode.ts`

Fonctions principales :
- `getVillesByCodePostal(codePostal: string): Promise<Ville[]>` - Récupère les villes par code postal
- `searchVilles(nom: string, limit?: number): Promise<Ville[]>` - Recherche de villes par nom
- `formatAdresseComplete(...)` - Formate une adresse complète

### Hook `useValidateAddress`

Fichier : `src/hooks/useValidateAddress.ts`

Hook React pour valider une adresse :
- `validate(address: string)` - Valide une adresse
- `loading` - État de chargement
- `isValid` - Adresse valide ou non
- `error` - Message d'erreur éventuel
- `formattedAddress` - Adresse formatée normalisée
- `coordinates` - Coordonnées GPS (lat, lng)

## Configuration

### Variables d'environnement

Pour la validation d'adresse, configurez (optionnel) :

```env
# Google Maps API Key (prioritaire si présent)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_google

# OpenRouteService API Key (alternative)
NEXT_PUBLIC_OPENROUTESERVICE_API_KEY=votre_cle_ors
```

**Note** : L'API Géo pour les codes postaux ne nécessite pas de clé API.

## Exemples

### Exemple 1 : Code postal avec une seule ville

1. Saisissez le code postal : `75001`
2. Le système charge automatiquement les villes
3. Si une seule ville (Paris), elle est sélectionnée automatiquement
4. Si plusieurs villes, une liste déroulante s'affiche

### Exemple 2 : Code postal avec plusieurs villes

1. Saisissez le code postal : `69000` (Lyon)
2. Le système charge les villes associées
3. Sélectionnez la ville souhaitée dans la liste
4. L'adresse complète se met à jour automatiquement

### Exemple 3 : Validation d'adresse

1. Saisissez l'adresse complète (rue, code postal, ville)
2. Cliquez sur "Valider l'adresse"
3. Le système vérifie l'existence de l'adresse
4. Si valide : affiche un message vert avec l'adresse formatée
5. Si invalide : affiche un message rouge avec des conseils

## Limites et considérations

### API Géo (codes postaux)

- **Gratuite** et sans limite de taux officielle
- **Couverture** : France métropolitaine et DROM-COM
- **Format** : Code postal à 5 chiffres uniquement

### Validation d'adresse

- **Google Maps** : Limite de 200$ de crédits gratuits/mois
- **OpenRouteService** : 2000 requêtes/jour gratuites

**Recommandation** : Utilisez le cache de distances pour éviter les appels répétés.

## Dépannage

### Les villes ne se chargent pas

1. Vérifiez que le code postal contient exactement 5 chiffres
2. Vérifiez votre connexion internet
3. Vérifiez dans la console du navigateur s'il y a des erreurs

### La validation échoue toujours

1. Vérifiez que l'adresse est complète (rue + code postal + ville)
2. Vérifiez que les variables d'environnement sont correctement configurées
3. Vérifiez les quotas de votre API (Google Maps ou OpenRouteService)

### L'adresse ne se met pas à jour

1. Vérifiez que le callback `onChange` est correctement connecté
2. Vérifiez dans la console s'il y a des erreurs JavaScript

## Améliorations futures possibles

- [ ] Autocomplétion de la rue (API Adresse du gouvernement)
- [ ] Carte interactive pour visualiser l'adresse
- [ ] Géolocalisation automatique (avec permission utilisateur)
- [ ] Support des adresses internationales
- [ ] Validation en temps réel pendant la saisie
- [ ] Suggestions d'adresses complètes pendant la saisie

