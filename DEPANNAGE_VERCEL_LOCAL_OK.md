# 🔧 Dépannage : Fonctionne en local (port 3000) mais pas sur Vercel

## ❌ Problème
L'application fonctionne parfaitement en local (`npm run dev` sur le port 3000) mais ne fonctionne pas sur Vercel (404 ou erreur).

---

## ✅ Étape 1 : Vérifier le Root Directory dans Vercel (CRITIQUE)

**C'est la cause #1 de ce problème !**

1. **Aller dans Vercel** : [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. **Sélectionner votre projet** : `PDC`
3. **Aller dans** : `Settings` → `General`
4. **Vérifier la section** : `Root Directory`
5. **Doit être EXACTEMENT** : `plan-de-charge-web`

**⚠️ Si c'est vide, incorrect ou différent :**
- Cliquer sur `Edit`
- Entrer : `plan-de-charge-web` (sans slash au début, sans slash à la fin)
- Sauvegarder
- **Redéployer** le projet (voir Étape 6)

---

## ✅ Étape 2 : Vérifier les Variables d'Environnement dans Vercel

Les variables d'environnement doivent être définies dans Vercel, pas seulement dans `.env.local` !

1. **Aller dans** : `Settings` → `Environment Variables`
2. **Vérifier que ces variables existent** :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://douyibpydhqtejhqinjp.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**⚠️ Si les variables manquent :**
- Cliquer sur `Add New`
- Ajouter chaque variable
- **Sélectionner** : `Production`, `Preview`, `Development` (tous les environnements)
- Sauvegarder
- **Redéployer** le projet

---

## ✅ Étape 3 : Vérifier les logs de build dans Vercel

1. **Aller dans** : `Deployments` (onglet en haut)
2. **Cliquer sur** : Le dernier déploiement
3. **Ouvrir** : Les logs de build
4. **Vérifier** :
   - ✅ Le build se termine avec `Build Completed`
   - ✅ Aucune erreur de type "Module not found"
   - ✅ Aucune erreur de type "Cannot find module"
   - ✅ Aucune erreur de type "Environment variable not found"

**🔍 Erreurs courantes à chercher :**
- `NEXT_PUBLIC_SUPABASE_URL is not defined` → Variables d'environnement manquantes
- `Cannot find module` → Root Directory incorrect
- `Build failed` → Erreur de compilation TypeScript/Next.js

**Si vous voyez des erreurs :**
- Copier les erreurs complètes
- Les partager pour diagnostic

---

## ✅ Étape 4 : Tester le build localement

Pour vérifier que le build fonctionne exactement comme Vercel :

```powershell
cd "c:\Users\Fredd\OneDrive\Desktop\VBA Excel\plan de charge\plan-de-charge-web"
npm run build
```

**Si le build échoue localement :**
- Corriger les erreurs avant de redéployer
- Les erreurs locales = erreurs sur Vercel

**Si le build réussit localement :**
- Le problème vient de la configuration Vercel (Root Directory ou variables d'environnement)

---

## ✅ Étape 5 : Vérifier la structure sur GitHub

Vercel déploie depuis GitHub, pas depuis votre machine locale !

1. **Aller sur** : [https://github.com/Fred49680/PDC](https://github.com/Fred49680/PDC)
2. **Vérifier que ces fichiers existent** :
   - `plan-de-charge-web/package.json`
   - `plan-de-charge-web/src/app/page.tsx`
   - `plan-de-charge-web/src/app/test-supabase/page.tsx`
   - `plan-de-charge-web/next.config.ts`

**Si des fichiers manquent sur GitHub :**
- Les pousser sur GitHub
- Vercel ne peut pas déployer ce qui n'est pas dans le repo

---

## ✅ Étape 6 : Forcer un nouveau déploiement

Après avoir corrigé le Root Directory et/ou les variables d'environnement :

1. **Dans Vercel** : `Deployments`
2. **Cliquer sur** : `...` (trois points) sur le dernier déploiement
3. **Sélectionner** : `Redeploy`
4. **Attendre** : Le nouveau déploiement (2-3 minutes)
5. **Tester** : L'URL de production

**Alternative :** Faire un commit vide pour déclencher un nouveau déploiement :
```powershell
git commit --allow-empty -m "trigger: Redéploiement Vercel"
git push origin main
```

---

## 🔍 Diagnostic rapide

**Question 1 :** Le Root Directory est-il configuré à `plan-de-charge-web` dans Vercel ?
- ❌ Non → **CORRIGER** (voir Étape 1) - **C'est probablement ça !**
- ✅ Oui → Continuer

**Question 2 :** Les variables d'environnement sont-elles définies dans Vercel ?
- ❌ Non → **AJOUTER** (voir Étape 2)
- ✅ Oui → Continuer

**Question 3 :** Le build réussit-il dans Vercel (pas d'erreurs dans les logs) ?
- ❌ Non → Vérifier les logs (voir Étape 3)
- ✅ Oui → Continuer

**Question 4 :** Le build local fonctionne-t-il (`npm run build`) ?
- ❌ Non → Corriger les erreurs
- ✅ Oui → Le problème vient de la configuration Vercel

---

## 🎯 Solution la plus probable (90% des cas)

**Le problème vient du Root Directory ou des variables d'environnement :**

1. **Vérifier Root Directory** :
   - Vercel → Settings → General
   - Root Directory = `plan-de-charge-web` (exactement, sans slash)

2. **Vérifier Variables d'Environnement** :
   - Vercel → Settings → Environment Variables
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` doivent exister

3. **Redéployer** :
   - Deployments → ... → Redeploy

---

## 📋 Checklist complète

- [ ] Root Directory = `plan-de-charge-web` dans Vercel (Settings → General)
- [ ] Variables d'environnement définies dans Vercel (Settings → Environment Variables)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Build réussit dans Vercel (Deployments → logs sans erreur)
- [ ] Tous les fichiers présents sur GitHub
- [ ] Build local fonctionne (`npm run build` dans `plan-de-charge-web`)
- [ ] Nouveau déploiement effectué après corrections

---

## 🚨 Erreurs spécifiques et solutions

### Erreur : "404 Not Found" sur toutes les routes
**Cause :** Root Directory incorrect
**Solution :** Vérifier Étape 1

### Erreur : "Environment variable NEXT_PUBLIC_SUPABASE_URL is not defined"
**Cause :** Variables d'environnement manquantes dans Vercel
**Solution :** Vérifier Étape 2

### Erreur : "Build Failed" avec erreurs TypeScript
**Cause :** Erreurs de code
**Solution :** Vérifier Étape 4 (build local)

### Erreur : "Module not found"
**Cause :** Root Directory incorrect ou structure de fichiers incorrecte
**Solution :** Vérifier Étape 1 et Étape 5

---

## 📞 Si le problème persiste

Vérifier dans l'ordre :
1. ✅ Root Directory configuré correctement
2. ✅ Variables d'environnement définies (tous les environnements)
3. ✅ Build réussit dans Vercel (pas d'erreurs)
4. ✅ Tous les fichiers présents sur GitHub
5. ✅ Build local fonctionne (`npm run build`)

**Si tout est correct et que le problème persiste :**
- Partager les logs de build Vercel complets
- Partager l'URL exacte qui donne l'erreur
- Partager une capture d'écran de la page d'erreur
- Vérifier si la page d'accueil (`/`) fonctionne sur Vercel
