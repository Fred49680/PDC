# 📊 Colonnes calculées de la table affaires

## 🔄 Colonnes automatiques

Les colonnes suivantes de la table `affaires` sont **calculées automatiquement** lors de l'enregistrement des charges et **ne doivent PAS** être dans le formulaire d'ajout/modification d'une affaire :

### Colonnes calculées

1. **`date_debut_demande`** (DATE)
   - **Calcul** : `MIN(date_debut)` des périodes de charge pour cette affaire/site
   - **Source** : Table `periodes_charge`
   - **Mise à jour** : Automatique via trigger lors de l'insertion/modification/suppression de charges

2. **`date_fin_demande`** (DATE)
   - **Calcul** : `MAX(date_fin)` des périodes de charge pour cette affaire/site
   - **Source** : Table `periodes_charge`
   - **Mise à jour** : Automatique via trigger lors de l'insertion/modification/suppression de charges

3. **`total_planifie`** (DECIMAL)
   - **Calcul** : `SUM(nb_ressources * jours_ouvres * 7h)` des périodes de charge pour cette affaire/site
   - **Source** : Table `periodes_charge` + Table `calendrier` (pour compter les jours ouvrés)
   - **Mise à jour** : Automatique via trigger lors de l'insertion/modification/suppression de charges

## ✅ Formulaire d'ajout/modification

Le formulaire d'ajout/modification d'une affaire doit contenir **UNIQUEMENT** :
- ✅ `affaire_id` (obligatoire)
- ✅ `site` (obligatoire)
- ✅ `libelle` (obligatoire)
- ✅ `actif` (optionnel, défaut: true)

**Ne PAS inclure** :
- ❌ `date_debut_demande`
- ❌ `date_fin_demande`
- ❌ `total_planifie`

## 🔧 Mise en place

### 1. Exécuter la migration SQL

Exécuter le fichier `MIGRATION_ADD_AFFAIRES_CALCULATED_FIELDS.sql` dans Supabase Dashboard → SQL Editor.

Cette migration :
- ✅ Ajoute les 3 colonnes à la table `affaires`
- ✅ Crée les triggers pour mise à jour automatique
- ✅ Crée une fonction de recalcul pour maintenance

### 2. Vérifier le code TypeScript

Le type `Affaire` dans `plan-de-charge-web/src/types/charge.ts` inclut ces colonnes en **lecture seule** (optionnelles) :

```typescript
export interface Affaire {
  // ... autres champs ...
  // Colonnes calculées automatiquement (remplies lors de l'enregistrement des charges)
  // Ne pas inclure dans le formulaire d'ajout/modification
  date_debut_demande?: Date
  date_fin_demande?: Date
  total_planifie?: number
}
```

### 3. Vérifier le hook useAffaires

Le hook `useAffaires` mappe ces colonnes lors de la **lecture** mais ne les envoie **jamais** lors de l'écriture :

```typescript
// ✅ Lecture : mapper les colonnes calculées
date_debut_demande: item.date_debut_demande ? new Date(item.date_debut_demande) : undefined,
date_fin_demande: item.date_fin_demande ? new Date(item.date_fin_demande) : undefined,
total_planifie: item.total_planifie ? Number(item.total_planifie) : undefined,

// ✅ Écriture : ne PAS inclure ces colonnes dans affaireData
const affaireData: any = {
  affaire_id: affaire.affaire_id,
  site: affaire.site,
  libelle: affaire.libelle,
  actif: affaire.actif ?? true,
  date_modification: new Date().toISOString(),
  // ❌ Ne PAS inclure date_debut_demande, date_fin_demande, total_planifie
}
```

## 📋 Affichage (optionnel)

Ces colonnes peuvent être **affichées en lecture seule** dans le tableau des affaires pour information :

```tsx
{affaire.date_debut_demande && (
  <td>{format(affaire.date_debut_demande, 'dd/MM/yyyy')}</td>
)}
{affaire.date_fin_demande && (
  <td>{format(affaire.date_fin_demande, 'dd/MM/yyyy')}</td>
)}
{affaire.total_planifie !== undefined && (
  <td>{affaire.total_planifie.toFixed(1)} H</td>
)}
```

## 🔄 Recalcul manuel

Si nécessaire, recalculer toutes les affaires :

```sql
SELECT recalculate_all_affaires_fields();
```

## ⚠️ Notes importantes

1. **Ces colonnes sont en lecture seule** : Ne jamais les modifier manuellement
2. **Calcul automatique** : Les triggers se déclenchent à chaque modification de `periodes_charge`
3. **Performance** : Les index sont créés pour optimiser les requêtes de calcul
4. **Cohérence** : Si les données semblent incorrectes, exécuter `recalculate_all_affaires_fields()`

## 🐛 Dépannage

### Les colonnes ne se mettent pas à jour

1. Vérifier que les triggers sont bien créés :
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE event_object_table = 'periodes_charge';
   ```

2. Vérifier que la table `calendrier` est bien remplie (nécessaire pour le calcul de `total_planifie`)

3. Recalculer manuellement :
   ```sql
   SELECT recalculate_all_affaires_fields();
   ```

### Les colonnes n'existent pas

Exécuter la migration `MIGRATION_ADD_AFFAIRES_CALCULATED_FIELDS.sql` dans Supabase Dashboard.
