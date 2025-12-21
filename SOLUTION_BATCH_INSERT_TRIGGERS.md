# Solution : Désactivation des triggers pendant les opérations en lot

## Problème

L'erreur `invalid input syntax for type boolean: ""` se produisait lors des opérations de charge de masse. Le problème venait du fait que :

1. **Chaque INSERT déclenchait le trigger de consolidation** : Lors d'une opération en lot (ex: création de 20 périodes), chaque `savePeriode()` déclenchait le trigger `consolidate_periodes_charge()`
2. **Conflits de triggers simultanés** : Plusieurs triggers s'exécutaient en parallèle, essayant de lire/écrire les mêmes données
3. **Valeurs booléennes invalides** : Le trigger de consolidation pouvait lire des données avec des valeurs booléennes invalides (chaînes vides) avant qu'elles ne soient normalisées

## Solution implémentée

### 1. Migration SQL : Fonctions de contrôle des triggers

**Fichier : `MIGRATION_DISABLE_TRIGGERS_BATCH.sql`**

Cette migration ajoute :
- `disable_consolidation_triggers()` : Désactive les triggers de consolidation
- `enable_consolidation_triggers()` : Réactive les triggers de consolidation
- `consolidate_periodes_after_batch()` : Consolide toutes les compétences d'une affaire/site après un batch
- `batch_insert_periodes_charge()` : Fonction RPC qui :
  1. Désactive les triggers
  2. Insère toutes les périodes en une seule transaction
  3. Normalise les booléens avant insertion
  4. Réactive les triggers
  5. Consolide une seule fois à la fin

### 2. Hook `useCharge.ts` : Fonction `savePeriodesBatch`

**Fichier : `plan-de-charge-web/src/hooks/useCharge.ts`**

Nouvelle fonction `savePeriodesBatch` qui :
- Normalise toutes les dates et booléens avant l'envoi
- Appelle la fonction RPC `batch_insert_periodes_charge`
- Recharge les périodes après le batch (si `autoRefresh` est activé)

### 3. Composant `GrilleCharge.tsx` : Utilisation du batch

**Fichier : `plan-de-charge-web/src/components/Charge/GrilleCharge.tsx`**

Modification de la fonction de charge de masse :
- **Avant** : `await Promise.all(periodesACreer.map((p) => savePeriode(p)))`
- **Après** : `await savePeriodesBatch(periodesACreer)`

## Avantages

1. **Performance** : Une seule consolidation au lieu de N consolidations (N = nombre de périodes)
2. **Fiabilité** : Pas de conflits entre triggers simultanés
3. **Normalisation garantie** : Les booléens sont normalisés avant insertion dans la fonction RPC
4. **Transaction atomique** : Toutes les insertions sont dans une seule transaction

## Utilisation

### Pour les opérations en lot (charge de masse)

```typescript
const { savePeriodesBatch } = useCharge({ affaireId, site })

const periodesACreer = [
  { competence: 'ENCADREMENT', date_debut: date1, date_fin: date1, nb_ressources: 3, force_weekend_ferie: false },
  { competence: 'ENCADREMENT', date_debut: date2, date_fin: date2, nb_ressources: 3, force_weekend_ferie: false },
  // ... plus de périodes
]

await savePeriodesBatch(periodesACreer)
```

### Pour les opérations unitaires

```typescript
const { savePeriode } = useCharge({ affaireId, site })

await savePeriode({
  competence: 'ENCADREMENT',
  date_debut: date1,
  date_fin: date1,
  nb_ressources: 3,
  force_weekend_ferie: false,
})
```

## Déploiement

1. **Exécuter la migration SQL** dans Supabase :
   ```sql
   -- Exécuter le contenu de MIGRATION_DISABLE_TRIGGERS_BATCH.sql
   ```

2. **Vérifier les permissions** : Les fonctions doivent être accessibles avec le rôle `authenticated`

3. **Tester** : Créer une charge de masse et vérifier qu'il n'y a plus d'erreur `invalid input syntax for type boolean: ""`

## Notes techniques

- La fonction RPC `batch_insert_periodes_charge` utilise `ON CONFLICT` pour gérer les doublons
- Les triggers sont désactivés au niveau de la table, pas au niveau de la session
- La consolidation se fait une seule fois à la fin, pour toutes les compétences de l'affaire/site
- La normalisation des booléens est faite à la fois côté client (TypeScript) et côté serveur (PostgreSQL) pour une double sécurité

