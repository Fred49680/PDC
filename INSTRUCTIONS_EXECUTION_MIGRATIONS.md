# Instructions pour exécuter les migrations SQL

## ✅ Migrations préparées

Les deux migrations suivantes ont été combinées dans le fichier **`MIGRATION_COMBINED.sql`** :

1. **MIGRATION_FIX_BOOLEAN_FINAL.sql** - Corrige l'erreur `invalid input syntax for type boolean: ""`
2. **MIGRATION_DISABLE_TRIGGERS_BATCH.sql** - Ajoute les fonctions pour désactiver les triggers pendant les opérations en lot

## 🚀 Méthode 1 : SQL Editor de Supabase (Recommandé)

### Étapes :

1. **Ouvrir le dashboard Supabase**
   - Aller sur https://supabase.com/dashboard
   - Se connecter à votre compte
   - Sélectionner le projet : `dkfkkpddityvxjuxtugp`

2. **Ouvrir le SQL Editor**
   - Dans le menu de gauche, cliquer sur **"SQL Editor"**
   - Cliquer sur **"New query"** (ou utiliser le raccourci)

3. **Copier-coller la migration**
   - Ouvrir le fichier `MIGRATION_COMBINED.sql` dans votre éditeur
   - Sélectionner tout le contenu (Ctrl+A)
   - Copier (Ctrl+C)
   - Coller dans le SQL Editor de Supabase (Ctrl+V)

4. **Exécuter la migration**
   - Cliquer sur le bouton **"Run"** (ou appuyer sur Ctrl+Enter)
   - Attendre la confirmation de succès

5. **Vérifier le résultat**
   - Vous devriez voir un message de succès
   - Les fonctions et triggers devraient être créés/mis à jour

## 🚀 Méthode 2 : Via psql (si installé)

Si vous avez `psql` installé et le mot de passe de la base de données :

### Obtenir le mot de passe :

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **Settings** → **Database**
4. Copier le **Database password**

### Exécuter la commande :

```bash
psql "postgresql://postgres:[PASSWORD]@db.dkfkkpddityvxjuxtugp.supabase.co:5432/postgres" -f MIGRATION_COMBINED.sql
```

**Remplacez `[PASSWORD]` par le mot de passe de la base de données.**

## 📋 Contenu des migrations

### Migration 1 : Fix Boolean Final
- Nettoie toutes les valeurs booléennes invalides dans `periodes_charge`
- Ajoute une contrainte CHECK pour empêcher les valeurs NULL
- Met à jour la fonction de consolidation pour normaliser les booléens

### Migration 2 : Disable Triggers Batch
- Crée les fonctions `disable_consolidation_triggers()` et `enable_consolidation_triggers()`
- Crée la fonction `consolidate_periodes_after_batch()` pour consolider après un batch
- Crée la fonction RPC `batch_insert_periodes_charge()` pour les insertions en lot

## ✅ Vérification après exécution

Après avoir exécuté les migrations, vous pouvez vérifier que tout fonctionne :

```sql
-- Vérifier que les fonctions existent
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'disable_consolidation_triggers',
    'enable_consolidation_triggers',
    'consolidate_periodes_after_batch',
    'batch_insert_periodes_charge'
  );

-- Vérifier que la contrainte existe
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'periodes_charge' 
  AND constraint_name = 'check_force_weekend_ferie_boolean';
```

## ⚠️ Notes importantes

- **Sauvegarde** : Les migrations sont idempotentes (peuvent être exécutées plusieurs fois sans problème)
- **Temps d'exécution** : La migration peut prendre quelques secondes selon la quantité de données
- **Impact** : La migration nettoie les données existantes avec des valeurs booléennes invalides

## 🐛 En cas d'erreur

Si vous rencontrez une erreur lors de l'exécution :

1. **Vérifier les permissions** : Assurez-vous d'être connecté avec un compte ayant les droits d'administration
2. **Vérifier la syntaxe** : Copiez-collez exactement le contenu de `MIGRATION_COMBINED.sql`
3. **Vérifier les dépendances** : Assurez-vous que la table `periodes_charge` existe

## 📞 Support

Si vous avez des questions ou rencontrez des problèmes, consultez :
- La documentation Supabase : https://supabase.com/docs
- Le fichier `SOLUTION_BATCH_INSERT_TRIGGERS.md` pour plus de détails sur la solution

