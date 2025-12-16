# 🔧 Dépannage Erreur 404 sur Vercel

## ❌ Problème : Erreur 404 sur `/test-supabase`

Si vous obtenez une erreur 404 lors de l'accès à `/test-supabase`, voici les étapes de diagnostic :

---

## ✅ Étape 1 : Vérifier le Root Directory dans Vercel

**C'est LA cause la plus fréquente !**

1. **Aller dans Vercel** : [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. **Sélectionner votre projet** : `PDC`
3. **Aller dans** : `Settings` → `General`
4. **Vérifier la section** : `Root Directory`
5. **Doit être** : `plan-de-charge-web` (sans slash au début, sans slash à la fin)

**⚠️ Si c'est vide ou incorrect :**
- Cliquer sur `Edit`
- Entrer : `plan-de-charge-web`
- Sauvegarder
- **Redéployer** le projet

---

## ✅ Étape 2 : Vérifier les logs de build dans Vercel

1. **Aller dans** : `Deployments` (onglet en haut)
2. **Cliquer sur** : Le dernier déploiement
3. **Vérifier les logs** :
   - ✅ Le build doit se terminer avec `Build Completed`
   - ✅ Aucune erreur de type "Module not found"
   - ✅ Aucune erreur de type "Cannot find module"

**Si vous voyez des erreurs :**
- Copier les erreurs et les partager pour diagnostic

---

## ✅ Étape 3 : Vérifier que le fichier existe bien

Le fichier doit être présent à :
```
plan-de-charge-web/src/app/test-supabase/page.tsx
```

**Vérification locale :**
1. Ouvrir le dossier `plan-de-charge-web/src/app/test-supabase/`
2. Vérifier que `page.tsx` existe
3. Vérifier que le fichier n'est pas vide

---

## ✅ Étape 4 : Tester le build localement

Pour vérifier que le build fonctionne :

```powershell
cd "plan-de-charge-web"
npm run build
```

**Si le build échoue localement :**
- Corriger les erreurs avant de redéployer
- Les erreurs locales = erreurs sur Vercel

**Si le build réussit localement :**
- Le problème vient de la configuration Vercel (Root Directory probablement)

---

## ✅ Étape 5 : Vérifier la structure du projet sur GitHub

1. **Aller sur** : [https://github.com/Fred49680/PDC](https://github.com/Fred49680/PDC)
2. **Naviguer vers** : `plan-de-charge-web/src/app/test-supabase/`
3. **Vérifier** : Que `page.tsx` est bien présent

**Si le fichier n'est pas sur GitHub :**
- Il faut le pousser sur GitHub
- Vercel ne peut pas déployer ce qui n'est pas dans le repo

---

## ✅ Étape 6 : Forcer un nouveau déploiement

Après avoir corrigé le Root Directory :

1. **Dans Vercel** : `Deployments`
2. **Cliquer sur** : `...` (trois points) sur le dernier déploiement
3. **Sélectionner** : `Redeploy`
4. **Attendre** : Le nouveau déploiement

---

## 🔍 Diagnostic rapide

**Question 1 :** Le Root Directory est-il configuré à `plan-de-charge-web` ?
- ❌ Non → **CORRIGER** (voir Étape 1)
- ✅ Oui → Continuer

**Question 2 :** Le build réussit-il dans Vercel ?
- ❌ Non → Vérifier les logs (voir Étape 2)
- ✅ Oui → Continuer

**Question 3 :** Le fichier `page.tsx` existe-t-il sur GitHub ?
- ❌ Non → Le pousser sur GitHub
- ✅ Oui → Le problème vient probablement du Root Directory

---

## 🎯 Solution la plus probable

**Dans 90% des cas, le problème vient du Root Directory :**

1. **Aller dans** : Vercel → Settings → General
2. **Vérifier** : Root Directory = `plan-de-charge-web`
3. **Si vide ou incorrect** : Le définir à `plan-de-charge-web`
4. **Sauvegarder**
5. **Redéployer**

---

## 📞 Si le problème persiste

Vérifier dans l'ordre :
1. ✅ Root Directory configuré correctement
2. ✅ Variables d'environnement définies
3. ✅ Build réussit dans Vercel (pas d'erreurs)
4. ✅ Fichier `page.tsx` présent sur GitHub
5. ✅ Build local fonctionne (`npm run build`)

**Si tout est correct et que le 404 persiste :**
- Partager les logs de build Vercel
- Partager l'URL exacte qui donne 404
- Vérifier si d'autres routes fonctionnent (ex: `/`)

---

## ✅ Checklist de vérification

- [ ] Root Directory = `plan-de-charge-web` dans Vercel
- [ ] Variables d'environnement définies
- [ ] Build réussit dans Vercel (logs sans erreur)
- [ ] Fichier `page.tsx` présent sur GitHub
- [ ] Build local fonctionne
- [ ] Nouveau déploiement effectué après corrections
