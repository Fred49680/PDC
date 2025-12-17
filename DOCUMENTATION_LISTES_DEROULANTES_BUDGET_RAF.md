# 📋 Listes déroulantes et champs Budget/RAF

## 🎯 Fonctionnalités ajoutées

### 1. Liste déroulante pour le Site

Le champ **Site** est maintenant une **liste déroulante** avec tous les sites disponibles :

- Blayais
- Golfech
- Bugey
- Cruas
- Tricastin
- Saint Alban
- Civaux
- Chinon
- Dampierre
- Belleville
- Saint-Laurent
- Autre Site
- Savigny
- Flamanville
- Penly
- Paluel
- Gravelines
- Cattenom
- Fessenheim
- Nogent

**Avantage** : Évite les erreurs de saisie et garantit la cohérence des noms de sites.

### 2. Liste déroulante pour la Tranche

Le champ **Tranche** est maintenant une **liste déroulante** avec les options :

- TOUTE
- 1
- 2
- 3
- 4
- 5
- 6
- 7
- 8
- 9

**Avantage** : Standardise les valeurs de tranche et facilite la saisie.

### 3. Nouveaux champs budgétaires

Trois nouveaux champs ont été ajoutés au formulaire :

#### Budget (H)
- **Type** : Nombre décimal
- **Description** : Budget en heures pour l'affaire
- **Format** : Nombre avec 2 décimales (ex: 1000.00)
- **Valeur par défaut** : 0

#### RAF (H) - Reste À Faire
- **Type** : Nombre décimal
- **Description** : Reste À Faire en heures
- **Format** : Nombre avec 2 décimales (ex: 500.00)
- **Valeur par défaut** : 0
- **Comportement spécial** : Si une valeur > 0 est saisie, la **Date MAJ du RAF** est automatiquement mise à jour à la date du jour

#### Date MAJ du RAF
- **Type** : Date
- **Description** : Date de mise à jour du Reste À Faire
- **Format** : Date (format standard HTML5)
- **Comportement** : Se met à jour automatiquement lorsque le RAF est modifié

## 💻 Code implémenté

### Migrations SQL

1. **`MIGRATION_ADD_AFFAIRES_BUDGET_RAF.sql`**
   - Ajoute les colonnes `budget_heures`, `raf_heures`, `date_maj_raf` à la table `affaires`
   - Crée des index pour performance

### Fichiers modifiés

1. **`plan-de-charge-web/src/utils/siteMap.ts`**
   - Ajout de `SITES_LIST` : Liste des sites disponibles
   - Ajout de `TRANCHES_LIST` : Liste des tranches (1-9 + TOUTE)

2. **`plan-de-charge-web/src/types/charge.ts`**
   - Ajout de `budget_heures?: number`
   - Ajout de `raf_heures?: number`
   - Ajout de `date_maj_raf?: Date`

3. **`plan-de-charge-web/src/app/affaires/page.tsx`**
   - Remplacement du champ Site par une liste déroulante (`<select>`)
   - Remplacement du champ Tranche par une liste déroulante (`<select>`)
   - Ajout des champs Budget, RAF et Date MAJ du RAF
   - Mise à jour automatique de `date_maj_raf` lors de la modification du RAF
   - Ajout des colonnes dans le tableau d'affichage

4. **`plan-de-charge-web/src/hooks/useAffaires.ts`**
   - Mapping des nouveaux champs lors de la lecture
   - Envoi des nouveaux champs lors de l'écriture
   - Gestion des valeurs nulles/vides

## ✅ Comportement attendu

### Création d'une nouvelle affaire

1. L'utilisateur sélectionne :
   - **Site** : "Belleville" (liste déroulante)
   - **Tranche** : "TOUTE" (liste déroulante)
   - **Statut** : "Ouverte"
   - **Libellé** : "PACK TEM"

2. L'`affaire_id` est généré automatiquement : `[TOUTE][BEL][PACK TEM]`

3. L'utilisateur peut optionnellement remplir :
   - **Budget (H)** : 1000.00
   - **RAF (H)** : 500.00
   - **Date MAJ du RAF** : Se remplit automatiquement si RAF > 0

### Modification d'une affaire existante

1. Si l'utilisateur modifie le **RAF (H)** :
   - La **Date MAJ du RAF** est automatiquement mise à jour à la date du jour

2. Les champs **Budget** et **RAF** peuvent être modifiés indépendamment

## 📊 Affichage dans le tableau

Le tableau des affaires affiche maintenant :
- Affaire ID
- Site
- Libellé
- Date création
- Statut
- **Budget (H)** (nouveau)
- **RAF (H)** (nouveau)
- **Date MAJ RAF** (nouveau)
- Actions

## 🐛 Dépannage

### Les listes déroulantes ne s'affichent pas

1. Vérifier que `SITES_LIST` et `TRANCHES_LIST` sont bien importés depuis `@/utils/siteMap`
2. Vérifier la console du navigateur pour d'éventuelles erreurs

### La Date MAJ du RAF ne se met pas à jour

1. Vérifier que le champ RAF contient une valeur > 0
2. Vérifier que le format de date est correct dans le hook `useAffaires`

### Les valeurs Budget/RAF ne s'enregistrent pas

1. Vérifier que les colonnes existent dans la base de données (exécuter la migration SQL)
2. Vérifier la console du navigateur pour d'éventuelles erreurs
3. Vérifier que les valeurs sont bien converties en nombres (Number())

## 📝 Notes importantes

- Les listes déroulantes garantissent la cohérence des données
- Le champ **Date MAJ du RAF** se met à jour automatiquement lors de la modification du RAF
- Les valeurs **Budget** et **RAF** sont optionnelles (peuvent être 0 ou vides)
- Le format des nombres est avec 2 décimales pour l'affichage
