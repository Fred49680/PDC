pousse sur git
# ✅ Résumé : Trigger de Consolidation - Fonctionnement et Test

## 🎯 Objectif

Le trigger de consolidation automatise la fusion des périodes de charge qui se chevauchent ou sont adjacentes, **pour une même combinaison affaire/site/compétence**, si elles ont :
- La même charge (`nb_ressources`)
- Le même flag `force_weekend_ferie`

## 🔄 Comment ça marche (en 5 étapes)

```
1️⃣ DÉCOMPOSITION
   └─> Chaque période (ex: 01/12 → 05/12) est transformée en jours individuels
       Exemple: 01/12, 02/12, 03/12, 04/12, 05/12

2️⃣ AGGREGATION PAR JOUR
   └─> Si plusieurs périodes couvrent le même jour, on prend:
       - MAX(nb_ressources) pour la charge
       - BOOL_OR(force_weekend_ferie) pour le flag

3️⃣ SUPPRESSION DES ANCIENNES PÉRIODES
   └─> On supprime toutes les périodes existantes pour cette combinaison

4️⃣ REGROUPEMENT CONSECUTIF
   └─> On regroupe les jours consécutifs qui ont les mêmes valeurs
       Technique: ROW_NUMBER() pour identifier les "îles" consécutives

5️⃣ RECONSTRUCTION
   └─> On recrée les périodes consolidées avec calcul des jours ouvrés
```

## 📊 Exemple réel (test sur vos données)

### AVANT consolidation
```
SAVIGNY / ENCADREMENT = 15 périodes
├─ 01/12 → 02/12 (1 ressource)
├─ 03/12 (1 ressource)
├─ 04/12 (1 ressource)
├─ 05/12 (1 ressource)
├─ 05/01 → 09/01 (2 ressources) - 5 périodes séparées
├─ 12/01 → 16/01 (2 ressources) - 5 périodes séparées
└─ 31/01 (2 ressources)
```

### APRÈS consolidation
```
SAVIGNY / ENCADREMENT = 4 périodes
├─ 01/12 → 05/12 (1 ressource, 5 jours ouvrés) ✅ Fusionné!
├─ 05/01 → 09/01 (2 ressources, 5 jours ouvrés) ✅ Fusionné!
├─ 12/01 → 16/01 (2 ressources, 5 jours ouvrés) ✅ Fusionné!
└─ 31/01 (2 ressources, 0 jours ouvrés = week-end)
```

**Réduction : 15 → 4 périodes !**

## ✅ Test réussi : Insertion automatique

J'ai testé en insérant une nouvelle période `2026-01-17` (adjacente à `2026-01-12` → `2026-01-16`).

**Résultat** : La période a été **automatiquement fusionnée** en `2026-01-12` → `2026-01-17` !

## 🛡️ Protection contre les problèmes

1. **Récursion infinie** : Flag `app.consolidating` empêche le trigger de se déclencher pendant la consolidation
2. **Transactions** : Tout se fait dans la même transaction (ROLLBACK en cas d'erreur)
3. **Performance** : Le trigger UPDATE a une condition `WHEN` pour éviter les déclenchements inutiles

## 🎯 Cas d'usage

### ✅ Fusion automatique
- Périodes adjacentes avec même charge → **Fusionnées**
- Périodes qui se chevauchent → **Fusionnées** (charge max prise)

### ❌ Pas de fusion
- Charge différente → **Restent séparées**
- `force_weekend_ferie` différent → **Restent séparées**
- Gap de plusieurs jours → **Restent séparées**

## 📝 Calcul des jours ouvrés

Le trigger calcule automatiquement `jours_ouvres` :
- Si `force_weekend_ferie = TRUE` : compte **tous les jours** (week-ends inclus)
- Si `force_weekend_ferie = FALSE` : compte uniquement les **jours ouvrés** depuis la table `calendrier`

## 🔍 Commandes utiles

### Voir les périodes consolidées
```sql
SELECT * FROM periodes_charge
WHERE affaire_id = 'uuid' AND site = 'SAVIGNY' AND competence = 'ENCADREMENT'
ORDER BY date_debut;
```

### Forcer une consolidation manuelle
```sql
SELECT consolidate_periodes_charge_for_competence(
  'uuid-affaire'::UUID,
  'SAVIGNY',
  'ENCADREMENT'
);
```

## ✨ Résultat

**Le trigger fonctionne parfaitement !** Il consolide automatiquement vos périodes dès qu'une INSERT/UPDATE/DELETE est effectuée, réduisant significativement le nombre de périodes et améliorant la lisibilité des données.

