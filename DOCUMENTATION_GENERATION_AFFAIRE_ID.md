# 📝 Génération automatique de l'Affaire ID

## 🔄 Fonctionnement

L'`affaire_id` est généré **automatiquement** selon la formule Excel :

```
=SI(ET([@Statut]<>"Ouverte";[@Statut]<>"Prévisionnelle");"";"["&[@Tranche]&"]["&[@SiteMap]&"]["&[@Affaire]&"]")
```

### Logique de génération

1. **Si le statut est "Ouverte" ou "Prévisionnelle"** :
   - Format : `[Tranche][SiteMap][Affaire]`
   - Exemple : `[TOUTE][BEL][PACK TEM]`

2. **Si le statut est autre chose (ex: "Fermée")** :
   - L'`affaire_id` est **vide (NULL)** dans la base de données

## 📋 Champs du formulaire

Le formulaire d'ajout/modification d'une affaire contient :

- ✅ **Tranche** (obligatoire) - Ex: "TOUTE", "T1", "T2"
- ✅ **Site** (obligatoire) - Ex: "Belleville", "Blayais", etc.
- ✅ **Statut** (obligatoire) - "Ouverte", "Prévisionnelle", "Fermée"
- ✅ **Libellé (Affaire)** (obligatoire) - Ex: "PACK TEM"
- ✅ **Actif** (optionnel, défaut: true)
- ✅ **Affaire ID** (lecture seule, généré automatiquement)

## 🔧 Conversion Site → SiteMap

La fonction `getSiteMap()` convertit le nom du site en code abrégé :

| Site | SiteMap |
|------|---------|
| Belleville | BEL |
| Blayais | BLA |
| Golfech | GOL |
| Bugey | BUG |
| Cruas | CRU |
| Tricastin | TRI |
| Saint Alban | SAL |
| Civaux | CIV |
| Chinon | CHI |
| Dampierre | DAM |
| Saint-Laurent | SLB |
| Autre Site | ASI |
| Savigny | SVG |
| Flamanville | FLA |
| Penly | PEN |
| Paluel | PAL |
| Gravelines | GRA |
| Cattenom | CAT |
| Fessenheim | FES |
| Nogent | NOG |

**Note** : Si un site n'est pas dans la liste, les 3 premières lettres en majuscules sont utilisées comme fallback.

## 💻 Code implémenté

### Fichiers modifiés

1. **`plan-de-charge-web/src/utils/siteMap.ts`** (nouveau)
   - Fonction `getSiteMap(siteName: string)` : Convertit site → SiteMap
   - Fonction `generateAffaireId(tranche, site, affaire, statut)` : Génère l'ID selon la formule Excel

2. **`plan-de-charge-web/src/types/charge.ts`**
   - Ajout de `tranche?: string` et `statut?: string` dans l'interface `Affaire`
   - `affaire_id` est maintenant `string | null` (peut être NULL)

3. **`plan-de-charge-web/src/app/affaires/page.tsx`**
   - Ajout des champs `tranche` et `statut` dans le formulaire
   - Génération automatique de l'`affaire_id` via `useEffect`
   - Champ `affaire_id` en lecture seule (généré automatiquement)

4. **`plan-de-charge-web/src/hooks/useAffaires.ts`**
   - Mapping des colonnes `tranche` et `statut` lors de la lecture
   - Envoi de `affaire_id` comme `null` si vide lors de l'écriture

### Migrations SQL

1. **`MIGRATION_ADD_AFFAIRES_TRANCHE_STATUT.sql`**
   - Ajoute les colonnes `tranche` et `statut` à la table `affaires`
   - Crée des index pour performance

2. **`MIGRATION_MAKE_AFFAIRE_ID_NULLABLE.sql`**
   - Rend `affaire_id` nullable (peut être NULL)
   - Supprime la contrainte NOT NULL
   - Recrée un index unique partiel (permet plusieurs NULL)

## ✅ Comportement attendu

### Création d'une nouvelle affaire

1. L'utilisateur remplit :
   - Tranche : "TOUTE"
   - Site : "Belleville"
   - Statut : "Ouverte"
   - Libellé : "PACK TEM"

2. L'`affaire_id` est généré automatiquement : `[TOUTE][BEL][PACK TEM]`

3. Si l'utilisateur change le statut en "Fermée" :
   - L'`affaire_id` devient vide (NULL)

### Modification d'une affaire existante

1. Si l'utilisateur modifie `tranche`, `site`, `libelle` ou `statut` :
   - L'`affaire_id` est régénéré automatiquement

2. Si le statut passe à "Fermée" :
   - L'`affaire_id` devient vide (NULL)

## 🐛 Dépannage

### L'affaire_id ne se génère pas

1. Vérifier que tous les champs sont remplis :
   - ✅ Tranche
   - ✅ Site
   - ✅ Statut
   - ✅ Libellé

2. Vérifier que le statut est "Ouverte" ou "Prévisionnelle"

3. Vérifier la console du navigateur pour d'éventuelles erreurs

### L'affaire_id est toujours vide

1. Vérifier que le statut est bien "Ouverte" ou "Prévisionnelle"
2. Vérifier que le site existe dans le mapping `SITE_MAP`
3. Vérifier que tous les champs sont bien remplis

## 📝 Notes importantes

- L'`affaire_id` est **généré automatiquement** et ne doit **pas** être saisi manuellement
- Si le statut n'est pas "Ouverte" ou "Prévisionnelle", l'ID est **vide (NULL)**
- Le format de l'ID est : `[Tranche][SiteMap][Affaire]`
- La conversion Site → SiteMap est automatique via la fonction `getSiteMap()`
