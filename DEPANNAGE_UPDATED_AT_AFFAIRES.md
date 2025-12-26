# 🔧 Dépannage : Erreur "column updated_at of relation affaires does not exist"

## ❌ Erreur rencontrée

```
POST https://douyibpydhqtejhqinjp.supabase.co/rest/v1/periodes_charge?on_conflict=... 400 (Bad Request)
[useCharge] Erreur savePeriode: {code: '42703', message: 'column "updated_at" of relation "affaires" does not exist'}
```

## 🔍 Cause du problème

L'erreur se produit car :
1. **Un trigger** `update_affaires_updated_at` essaie de mettre à jour la colonne `updated_at` dans la table `affaires`
2. **La colonne `updated_at` n'existe pas** dans la table `affaires` dans votre base de données Supabase
3. **Le trigger est déclenché** lors d'une opération sur `periodes_charge` qui référence `affaires` (probablement via une contrainte de clé étrangère)

## ✅ Solutions

### Solution 1 : Ajouter la colonne updated_at (RECOMMANDÉ)

1. **Ouvrir Supabase Dashboard** → SQL Editor

2. **Exécuter le fichier de migration** `MIGRATION_FIX_AFFAIRES_UPDATED_AT.sql`

   Ce fichier :
   - Ajoute la colonne `updated_at` à la table `affaires` si elle n'existe pas
   - Met à jour les lignes existantes avec une valeur par défaut
   - Recrée le trigger pour mettre à jour automatiquement `updated_at`

3. **Vérifier que la colonne est créée** :
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'affaires' 
   AND column_name = 'updated_at';
   ```

### Solution 2 : Supprimer le trigger (ALTERNATIVE)

Si vous ne souhaitez pas ajouter la colonne `updated_at` :

1. **Ouvrir Supabase Dashboard** → SQL Editor

2. **Exécuter cette commande** :
   ```sql
   DROP TRIGGER IF EXISTS update_affaires_updated_at ON affaires;
   ```

   ⚠️ **ATTENTION** : Cela supprimera le trigger, donc `updated_at` ne sera plus mis à jour automatiquement si vous l'ajoutez plus tard.

## 📋 Étapes de résolution rapide

### Pour le développement (solution la plus simple)

1. **Ouvrir Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Copier-coller le contenu de `MIGRATION_FIX_AFFAIRES_UPDATED_AT.sql`**
4. **Exécuter le script**
5. **Tester à nouveau l'enregistrement d'une période de charge**

## 🔐 Cohérence du schéma

Pour maintenir la cohérence avec les autres tables :
- Les tables `ressources`, `periodes_charge`, `affectations`, `absences`, etc. ont toutes une colonne `updated_at`
- La table `affaires` devrait également avoir cette colonne pour la cohérence

## 📝 Notes

- Le trigger `update_affaires_updated_at` est défini dans `ARCHITECTURE_VERCEL_SUPABASE.md` (lignes 375-377)
- La structure de la table `affaires` peut varier selon les migrations appliquées
- Si votre table utilise `date_modification` au lieu de `updated_at`, la migration mettra à jour les valeurs existantes

## 🐛 Vérification

Après avoir appliqué la solution, vérifier que :

1. ✅ La colonne `updated_at` existe dans la table `affaires`
2. ✅ Le trigger `update_affaires_updated_at` existe
3. ✅ L'enregistrement d'une période de charge fonctionne sans erreur
4. ✅ La mise à jour d'une affaire met à jour automatiquement `updated_at`

## 📞 Support

Si le problème persiste :
1. Vérifier les logs Supabase Dashboard → Logs
2. Vérifier la structure réelle de la table `affaires` :
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'affaires'
   ORDER BY ordinal_position;
   ```
3. Vérifier que la fonction `update_updated_at_column()` existe :
   ```sql
   SELECT routine_name 
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'update_updated_at_column';
   ```
