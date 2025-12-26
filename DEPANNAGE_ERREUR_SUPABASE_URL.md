# 🔧 Dépannage : Erreur "Invalid supabaseUrl"

## ❌ Problème

L'erreur `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` apparaît lors de l'utilisation de la page `/admin/sites` ou d'autres pages utilisant Supabase.

## 🔍 Diagnostic

### 1. Vérifier les variables d'environnement Vercel

1. Connectez-vous à [Vercel](https://vercel.com)
2. Allez dans votre projet
3. **Settings** → **Environment Variables**
4. Vérifiez que les variables suivantes sont définies :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Format de l'URL Supabase

L'URL Supabase doit :
- ✅ Commencer par `https://` (ou `http://` pour le développement local)
- ✅ Être complète (ex: `https://xxxxx.supabase.co`)
- ❌ **NE PAS** être tronquée ou mal formatée

**Exemple d'URL valide :**
```
https://douyibpydhqtejhqinjp.supabase.co
```

**Exemples d'URL invalides :**
```
ttps://douyibpydhqtejhqinjp.supabase.co  ❌ (manque le "h")
douyibpydhqtejhqinjp.supabase.co        ❌ (manque "https://")
```

### 3. Vérifier dans Vercel

Dans les **Environment Variables** de Vercel, l'URL doit être :
- **Name** : `NEXT_PUBLIC_SUPABASE_URL`
- **Value** : `https://douyibpydhqtejhqinjp.supabase.co` (avec le `https://` complet)

## 🛠️ Solutions

### Solution 1 : Corriger l'URL dans Vercel

1. Allez dans **Settings** → **Environment Variables**
2. Trouvez `NEXT_PUBLIC_SUPABASE_URL`
3. Vérifiez que la valeur commence bien par `https://`
4. Si ce n'est pas le cas, modifiez-la pour ajouter `https://` au début
5. **Redéployez** l'application (Vercel redéploie automatiquement après modification des variables)

### Solution 2 : Vérifier le fichier `.env.local` (développement local)

Si vous testez en local, vérifiez votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://douyibpydhqtejhqinjp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

**Important :** L'URL doit commencer par `https://` (ou `http://` pour le développement local uniquement).

### Solution 3 : Le code corrige automatiquement

Le code a été mis à jour pour corriger automatiquement les URLs mal formatées :
- Si l'URL commence par `ttps://`, le code ajoute automatiquement le `h` manquant
- Si l'URL ne commence pas par `http://` ou `https://`, le code ajoute `https://` par défaut

Cependant, il est **recommandé** de corriger l'URL directement dans Vercel pour éviter toute confusion.

## 📝 Vérification dans la console (F12)

Ouvrez la console du navigateur (F12) et vérifiez les logs :

```
[createClient] Création du client Supabase avec URL: https://douyibpydhqtejhqinjp...
```

Si vous voyez un message d'avertissement comme :
```
[createClient] URL corrigée (ajout du préfixe "h"): ...
```

Cela signifie que l'URL était mal formatée et a été corrigée automatiquement. **Il est recommandé de corriger l'URL dans Vercel** pour éviter ce message.

## ✅ Vérification finale

1. **Redéployez** l'application sur Vercel après avoir corrigé les variables
2. **Attendez** que le déploiement soit terminé
3. **Rechargez** la page `/admin/sites`
4. **Vérifiez** la console (F12) - l'erreur ne devrait plus apparaître

## 🔗 Liens utiles

- [Documentation Supabase - Getting Started](https://supabase.com/docs/guides/getting-started)
- [Documentation Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Date de création :** 2025-01-27
