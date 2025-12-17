# 🔧 Dépannage : Erreur RLS lors de l'ajout d'une affaire

## ❌ Erreur rencontrée

```
new row violates row-level security policy for table "affaires"
```

## 🔍 Cause du problème

L'erreur se produit car :
1. **RLS est activé** sur la table `affaires` dans Supabase
2. **Les politiques RLS** nécessitent une authentification (`auth.role() = 'authenticated'`)
3. **L'application n'a pas de système d'authentification** en place ou l'utilisateur n'est pas connecté

## ✅ Solutions

### Solution 1 : Corriger les politiques RLS (RECOMMANDÉ pour le développement)

1. **Ouvrir Supabase Dashboard** → SQL Editor

2. **Exécuter le fichier de migration** `MIGRATION_FIX_RLS_AFFAIRES.sql`

   Ce fichier crée des politiques qui permettent l'accès sans authentification (pour le développement).

3. **Vérifier que les politiques sont créées** :
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'affaires';
   ```

### Solution 2 : Ajouter un système d'authentification (PRODUCTION)

Si vous souhaitez garder la sécurité RLS, vous devez :

1. **Créer une page de connexion** dans l'application
2. **Authentifier l'utilisateur** avant d'accéder aux données
3. **Utiliser les politiques avec authentification** (voir Option 2 dans le fichier SQL)

### Solution 3 : Utiliser le Service Role Key (DÉVELOPPEMENT UNIQUEMENT)

⚠️ **ATTENTION** : Cette solution contourne complètement RLS. Ne pas utiliser en production !

1. **Récupérer le Service Role Key** dans Supabase Dashboard → Settings → API

2. **Créer un client Supabase avec Service Role** :
   ```typescript
   // src/lib/supabase/admin.ts
   import { createClient } from '@supabase/supabase-js'
   
   export function createAdminClient() {
     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
     const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
     
     return createClient(supabaseUrl, supabaseServiceKey, {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     })
   }
   ```

3. **Utiliser le client admin uniquement pour les opérations d'écriture** :
   ```typescript
   // Dans useAffaires.ts
   import { createAdminClient } from '@/lib/supabase/admin'
   
   const saveAffaire = async (affaire: Partial<Affaire>) => {
     const supabase = createAdminClient() // Utiliser le client admin
     const { error } = await supabase.from('affaires').insert(affaireData)
     // ...
   }
   ```

## 📋 Étapes de résolution rapide

### Pour le développement (solution la plus simple)

1. **Ouvrir Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Copier-coller le contenu de `MIGRATION_FIX_RLS_AFFAIRES.sql`**
4. **Exécuter le script**
5. **Tester à nouveau l'ajout d'une affaire**

### Pour la production

1. **Implémenter l'authentification** (voir Solution 2)
2. **Utiliser les politiques avec authentification** (Option 2 dans le fichier SQL)
3. **Tester que seuls les utilisateurs authentifiés peuvent modifier les données**

## 🔐 Sécurité

- **Développement** : Les politiques sans authentification sont acceptables
- **Production** : Toujours utiliser l'authentification avec RLS activé
- **Service Role Key** : Ne jamais exposer dans le code client (frontend)

## 📝 Notes

- Les politiques RLS sont définies dans `ARCHITECTURE_VERCEL_SUPABASE.md` (lignes 782-930)
- Le code d'insertion se trouve dans `plan-de-charge-web/src/hooks/useAffaires.ts` (ligne 99)
- Le client Supabase est configuré dans `plan-de-charge-web/src/lib/supabase/client.ts`

## 🐛 Vérification

Après avoir appliqué la solution, vérifier que :

1. ✅ Les politiques RLS sont bien créées
2. ✅ L'insertion fonctionne sans erreur
3. ✅ La lecture fonctionne toujours
4. ✅ La mise à jour fonctionne
5. ✅ La suppression fonctionne

## 📞 Support

Si le problème persiste :
1. Vérifier les logs Supabase Dashboard → Logs
2. Vérifier la console du navigateur pour d'autres erreurs
3. Vérifier que la table `affaires` existe bien dans Supabase
