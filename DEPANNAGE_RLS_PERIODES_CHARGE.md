# 🔧 Dépannage : Erreur 401 (Unauthorized) pour periodes_charge

## ❌ Erreur rencontrée

```
POST https://douyibpydhqtejhqinjp.supabase.co/rest/v1/periodes_charge?on_conflict=... 401 (Bad Request)
[useCharge] Erreur savePeriode: {code: '401', message: 'Unauthorized'}
```

## 🔍 Cause du problème

L'erreur 401 se produit car :
1. **RLS est activé** sur la table `periodes_charge` dans Supabase
2. **Les politiques RLS** nécessitent une authentification (`auth.role() = 'authenticated'`)
3. **L'application n'a pas de système d'authentification** en place ou l'utilisateur n'est pas connecté

## ✅ Solutions

### Solution 1 : Corriger les politiques RLS (RECOMMANDÉ pour le développement)

1. **Ouvrir Supabase Dashboard** → SQL Editor

2. **Exécuter le fichier de migration** `MIGRATION_FIX_RLS_PERIODES_CHARGE.sql`

   Ce fichier crée des politiques qui permettent l'accès sans authentification (pour le développement).

3. **Vérifier que les politiques sont créées** :
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'periodes_charge';
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
   // Dans useCharge.ts
   import { createAdminClient } from '@/lib/supabase/admin'
   
   const savePeriode = async (periode: Partial<PeriodeCharge>) => {
     const supabase = createAdminClient() // Utiliser le client admin
     const { error } = await supabase.from('periodes_charge').upsert(periodeData)
     // ...
   }
   ```

## 📋 Étapes de résolution rapide

### Pour le développement (solution la plus simple)

1. **Ouvrir Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Copier-coller le contenu de `MIGRATION_FIX_RLS_PERIODES_CHARGE.sql`**
4. **Exécuter le script**
5. **Tester à nouveau l'enregistrement d'une période de charge**

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
- Le code d'enregistrement se trouve dans `plan-de-charge-web/src/hooks/useCharge.ts` (ligne 68)
- Le client Supabase est configuré dans `plan-de-charge-web/src/lib/supabase/client.ts`

## 🐛 Vérification

Après avoir appliqué la solution, vérifier que :

1. ✅ Les politiques RLS sont bien créées
2. ✅ L'insertion (upsert) fonctionne sans erreur
3. ✅ La lecture fonctionne toujours
4. ✅ La mise à jour fonctionne
5. ✅ La suppression fonctionne

## 📞 Support

Si le problème persiste :
1. Vérifier les logs Supabase Dashboard → Logs
2. Vérifier la console du navigateur pour d'autres erreurs
3. Vérifier que la table `periodes_charge` existe bien dans Supabase
4. Vérifier que la contrainte unique est correctement définie
