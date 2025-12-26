# Documentation : Trigger de Consolidation des Périodes de Charge

## 📋 Vue d'ensemble

Le trigger de consolidation automatique pour la table `periodes_charge` permet de fusionner automatiquement les périodes qui se chevauchent ou sont adjacentes, à condition qu'elles aient la même charge (`nb_ressources`) et le même flag `force_weekend_ferie`.

## 🔧 Comment ça fonctionne

### Architecture

Le système se compose de **deux fonctions principales** et **trois triggers** :

1. **`consolidate_periodes_charge_for_competence(UUID, TEXT, TEXT)`**
   - Fonction principale qui effectue la consolidation pour une combinaison affaire/site/compétence
   - Peut être appelée manuellement si besoin

2. **`consolidate_periodes_charge()`**
   - Fonction trigger appelée automatiquement par les triggers
   - Détermine quelles valeurs utiliser (NEW ou OLD selon l'opération)
   - Appelle la fonction principale

3. **Triggers** :
   - `trigger_consolidate_periodes_charge_insert` : Après INSERT
   - `trigger_consolidate_periodes_charge_update` : Après UPDATE (si colonnes pertinentes changent)
   - `trigger_consolidate_periodes_charge_delete` : Après DELETE

### Processus de consolidation (5 étapes)

```
ÉTAPE 1: Créer une table temporaire
  └─> Stocke les jours individuels avec leurs charges

ÉTAPE 2: Décomposer toutes les périodes en jours
  └─> generate_series() crée un jour par période
  └─> Groupe par date_jour (MAX pour nb_ressources, BOOL_OR pour force_weekend_ferie)

ÉTAPE 3: Supprimer toutes les périodes existantes
  └─> Pour la combinaison affaire/site/compétence concernée

ÉTAPE 4: Regrouper les jours consécutifs
  └─> Utilise ROW_NUMBER() avec PARTITION BY pour identifier les séquences consécutives
  └─> Les jours consécutifs avec mêmes nb_ressources et force_weekend_ferie = même groupe

ÉTAPE 5: Reconstruire les périodes consolidées
  └─> MIN(date_jour) = date_debut
  └─> MAX(date_jour) = date_fin
  └─> Calcule jours_ouvres depuis la table calendrier
```

### Algorithme de regroupement consécutif

Le regroupement utilise la technique du "gap and islands" avec `ROW_NUMBER()` :

```sql
date_jour - ROW_NUMBER() OVER (PARTITION BY nb_ressources, force_weekend_ferie ORDER BY date_jour) AS groupe
```

**Exemple** :
- Jours: 2025-12-01, 2025-12-02, 2025-12-03 (tous avec nb_ressources=1, force_weekend_ferie=FALSE)
- ROW_NUMBER: 1, 2, 3
- groupe: 2025-12-01-1 = 2025-11-30, 2025-12-02-2 = 2025-11-30, 2025-12-03-3 = 2025-11-30
- **→ Même groupe → fusionné en une seule période**

### Protection contre la récursion

Le trigger utilise un flag de session pour éviter la récursion infinie :

```sql
-- Vérifier si déjà en cours
IF current_setting('app.consolidating', true) = 'true' THEN
  RETURN;
END IF;

-- Marquer comme en cours
PERFORM set_config('app.consolidating', 'true', true);

-- ... faire la consolidation ...

-- Réinitialiser
PERFORM set_config('app.consolidating', 'false', true);
```

## 📊 Exemple concret

### Avant consolidation

| date_debut | date_fin | nb_ressources |
|------------|----------|---------------|
| 2025-12-01 | 2025-12-02 | 1 |
| 2025-12-03 | 2025-12-03 | 1 |
| 2025-12-04 | 2025-12-04 | 1 |
| 2025-12-05 | 2025-12-05 | 1 |
| 2026-01-05 | 2026-01-05 | 2 |
| 2026-01-06 | 2026-01-06 | 2 |
| 2026-01-07 | 2026-01-07 | 2 |

**= 7 périodes**

### Après consolidation

| date_debut | date_fin | nb_ressources | jours_ouvres |
|------------|----------|---------------|--------------|
| 2025-12-01 | 2025-12-05 | 1 | 5 |
| 2026-01-05 | 2026-01-07 | 2 | 3 |

**= 2 périodes**

## 🎯 Règles de consolidation

### ✅ Périodes fusionnées

Les périodes sont **fusionnées** si :
1. Elles sont **adjacentes** (date_fin + 1 = date_debut suivante) **OU** se **chevauchent**
2. Elles ont le **même `nb_ressources`**
3. Elles ont le **même `force_weekend_ferie`**

### ❌ Périodes non fusionnées

Les périodes **ne sont PAS fusionnées** si :
- `nb_ressources` différent
- `force_weekend_ferie` différent
- Gap de plus d'un jour entre les périodes

### Cas spécial : `force_weekend_ferie`

- Si `force_weekend_ferie = TRUE` : compte **tous les jours** (y compris week-ends/fériés)
- Si `force_weekend_ferie = FALSE` : compte uniquement les **jours ouvrés** depuis `calendrier.is_business_day`

## 🔍 Calcul des jours ouvrés

```sql
CASE 
  WHEN force_weekend_ferie = TRUE THEN
    -- Tous les jours calendaires
    (date_fin - date_debut)::INTEGER + 1
  ELSE
    -- Uniquement jours ouvrés depuis le calendrier
    COUNT(*) FROM calendrier 
    WHERE date BETWEEN date_debut AND date_fin 
      AND is_business_day = TRUE
END
```

## 🧪 Test du trigger

### Test manuel

```sql
-- Consolider manuellement pour une combinaison
SELECT consolidate_periodes_charge_for_competence(
  'uuid-affaire'::UUID,
  'SAVIGNY',
  'ENCADREMENT'
);
```

### Test automatique (via INSERT)

```sql
-- Insérer une période adjacente (sera automatiquement consolidée)
INSERT INTO periodes_charge (
  affaire_id, site, competence,
  date_debut, date_fin, nb_ressources, force_weekend_ferie
) VALUES (
  'uuid-affaire'::UUID, 'SAVIGNY', 'ENCADREMENT',
  '2026-01-17'::DATE, '2026-01-17'::DATE, 2, FALSE
);
-- Si une période 2026-01-12 à 2026-01-16 existe avec nb_ressources=2,
-- elle sera automatiquement fusionnée en 2026-01-12 à 2026-01-17
```

## ⚠️ Points d'attention

1. **Performance** : La consolidation est effectuée **après chaque INSERT/UPDATE/DELETE**
   - Pour des opérations en lot, utilisez `disable_consolidation_triggers()` puis `enable_consolidation_triggers()`

2. **Transactions** : La consolidation se fait **dans la même transaction**
   - En cas d'erreur, tout est annulé (ROLLBACK)

3. **Récursion** : Le flag `app.consolidating` protège contre la récursion infinie
   - Si le trigger se déclenche pendant la consolidation, il retourne immédiatement

4. **Données temporaires** : La table temporaire `temp_jours_charge` est automatiquement supprimée
   - `ON COMMIT DROP` garantit le nettoyage

## 📝 Notes techniques

- Les triggers sont **AFTER** (pas BEFORE) pour avoir accès aux données finales
- Le trigger UPDATE a une condition `WHEN` pour éviter les déclenchements inutiles
- La normalisation du `site` en `UPPER()` garantit la cohérence
- `COALESCE(force_weekend_ferie, FALSE)` garantit qu'on n'a jamais NULL

