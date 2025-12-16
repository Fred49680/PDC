# 🗺️ Guide d'Administration des Sites

## 📋 Vue d'ensemble

Une page d'administration a été créée pour gérer les sites (centrales françaises) avec leurs régions et centres géographiques.

## 🗄️ Structure de la base de données

### Table `sites`

La table `sites` contient les informations suivantes :

- **id** (UUID) : Identifiant unique
- **site** (TEXT) : Nom du site (ex: "Blayais")
- **site_key** (TEXT) : Clé unique en majuscules (ex: "BLAYAIS")
- **site_map** (TEXT) : Code court (ex: "BLA")
- **region** (TEXT) : Région géographique (ex: "Sud Ouest", "Val de Loire", etc.)
- **centre_ouest** (TEXT) : Centre géographique ("Centre Ouest", "Nord Ouest", "Centre Est")
- **actif** (BOOLEAN) : Indique si le site est actif
- **created_at** (TIMESTAMP) : Date de création
- **updated_at** (TIMESTAMP) : Date de modification

## 🚀 Installation

### 1. Appliquer la migration SQL

Exécutez le fichier `MIGRATION_CREATE_SITES_TABLE.sql` dans Supabase :

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `MIGRATION_CREATE_SITES_TABLE.sql`
4. Exécutez la requête

### 2. Initialiser les sites par défaut

Deux options :

#### Option A : Via l'interface web (recommandé)

1. Accédez à `/admin/sites`
2. Cliquez sur le bouton **"Initialiser sites par défaut"**
3. Confirmez l'action
4. Les 22 sites des centrales françaises seront ajoutés automatiquement

#### Option B : Via SQL

Vous pouvez également insérer les sites directement via SQL si nécessaire.

## 📍 Accès à la page d'administration

- **URL** : `/admin/sites`
- **Navigation** : Lien "Sites" dans le menu principal
- **Page d'accueil** : Carte "Sites" dans la section "Navigation rapide"

## ✨ Fonctionnalités

### Gestion des sites

- ✅ **Créer** un nouveau site
- ✅ **Modifier** un site existant
- ✅ **Supprimer** un site
- ✅ **Filtrer** par région, centre ouest, et statut actif
- ✅ **Initialiser** automatiquement les 22 sites par défaut

### Liste des sites par défaut

Les sites suivants seront ajoutés lors de l'initialisation :

#### Sud Ouest
- Blayais (BLAYAIS / BLA)
- Golfech (GOLFECH / GOL)
- Civaux (CIVAUX / CIV)

#### Val de Rhône
- Bugey (BUGEY / BUG)
- Cruas (CRUAS / CRU)
- Tricastin (TRICASTIN / TRI)
- Saint Alban (SAINT ALBAN / SAL)

#### Val de Loire
- Chinon (CHINON / CHI)
- Dampierre (DAMPIERRE / DAM)
- Belleville (BELLEVILLE / BEL)
- Saint-Laurent (SAINT-LAURENT / SLB)
- Autre Site (AUTRE SITE / ASI)
- Savigny (SAVIGNY / SVG)
- Creys-Malville (CREYS-MALVILLE / CRE)

#### Manche / Normandie
- Flamanville (FLAMANVILLE / FLA)
- Penly (PENLY / PEN)
- Paluel (PALUEL / PAL)

#### Nord
- Gravelines (GRAVELINES / GRA)

#### Nord Est
- Cattenom (CATTENOM / CAT)
- Fessenheim (FESSENHEIM / FES)
- Nogent (NOGENT / NOG)

## 🎨 Interface utilisateur

### Design moderne

- **Couleurs** : Dégradé bleu/cyan pour différencier des autres pages
- **Icône** : `MapPin` de lucide-react
- **Layout** : Cohérent avec le reste de l'application (glassmorphism, gradients, animations)

### Formulaire de saisie

- Champs obligatoires : Site, Site Key, Site Map
- Champs optionnels : Région, Centre Ouest
- Validation automatique (Site Key et Site Map en majuscules)
- Checkbox pour activer/désactiver un site

### Filtres

- **Par région** : Recherche textuelle
- **Par centre ouest** : Liste déroulante (Centre Ouest, Nord Ouest, Centre Est)
- **Par statut** : Afficher uniquement les sites actifs

### Tableau de visualisation

- Colonnes : Site, Site Key, Site Map, Région, Centre Ouest, Statut, Actions
- Actions : Modifier, Supprimer
- Badges colorés pour le statut (Active/Inactive)

## 🔧 Utilisation dans l'application

### Hook `useSites`

Le hook `useSites` est disponible pour utiliser les sites dans d'autres composants :

```typescript
import { useSites } from '@/hooks/useSites'

function MyComponent() {
  const { sites, loading, error } = useSites({
    region: 'Sud Ouest',
    actif: true
  })
  
  // Utiliser les sites...
}
```

### Type `Site`

Le type TypeScript est exporté depuis `@/types/sites` :

```typescript
import type { Site } from '@/types/sites'
```

## 📝 Notes importantes

1. **Unicité** : Les colonnes `site`, `site_key`, et `site_map` sont uniques
2. **Initialisation** : L'initialisation vérifie si des sites existent déjà pour éviter les doublons
3. **Suppression** : La suppression d'un site peut affecter les affaires et ressources qui y sont liées (à gérer selon vos besoins)

## 🔄 Prochaines étapes

- [ ] Ajouter des validations supplémentaires (format Site Key, etc.)
- [ ] Implémenter l'export/import des sites
- [ ] Ajouter des statistiques par site dans le Dashboard
- [ ] Intégrer les sites dans les formulaires de sélection (Affaires, Ressources)

---

**Date de création :** 2025-01-27
