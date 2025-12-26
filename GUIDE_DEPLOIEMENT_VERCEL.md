# 🚀 Guide de Déploiement Vercel - Plan de Charge

## 📋 Étape 1 : Vérifier la connexion GitHub ↔ Vercel

### Option A : Si Vercel n'est pas encore connecté

1. **Aller sur [vercel.com](https://vercel.com)** et se connecter
2. **Cliquer sur "Add New Project"**
3. **Importer le repository GitHub** : `Fred49680/PDC`
4. **Vercel détectera automatiquement** que c'est un projet Next.js

### Option B : Si Vercel est déjà connecté

1. **Vérifier que le projet est lié** :
   - Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
   - Vérifier que le projet `PDC` ou `plan-de-charge-web` apparaît
   - Si oui, chaque push sur GitHub déclenchera automatiquement un déploiement

---

## 📋 Étape 2 : Configurer le projet Vercel

### 2.1. Paramètres du projet

Lors de l'import ou dans les paramètres du projet :

- **Framework Preset** : `Next.js` (détecté automatiquement)
- **Root Directory** : `plan-de-charge-web` ⚠️ **IMPORTANT** (à configurer dans l'interface Vercel, pas dans `vercel.json`)
- **Build Command** : Configuré automatiquement via `vercel.json` (utilise `cd plan-de-charge-web && npm run build`)
- **Output Directory** : Configuré automatiquement via `vercel.json` (utilise `plan-de-charge-web/.next`)
- **Install Command** : Configuré automatiquement via `vercel.json` (utilise `cd plan-de-charge-web && npm install`)

**Note :** Le fichier `vercel.json` configure automatiquement les commandes pour pointer vers le sous-dossier `plan-de-charge-web`. Le `Root Directory` doit être configuré dans l'interface Vercel (`Project Settings` → `General` → `Root Directory`).

### 2.2. Configurer le Root Directory dans Vercel

**⚠️ CRITIQUE :** Le `Root Directory` doit être configuré dans l'interface Vercel :

1. **Aller dans** : `Project Settings` → `General`
2. **Trouver la section** : `Root Directory`
3. **Définir** : `plan-de-charge-web`
4. **Sauvegarder**

**Pourquoi ?** Le fichier `vercel.json` ne peut pas contenir `rootDirectory` (ce n'est pas une propriété valide). Il doit être configuré dans l'interface Vercel.

### 2.3. Variables d'environnement

**⚠️ CRITIQUE :** Ajouter ces variables dans Vercel :

1. **Aller dans** : `Project Settings` → `Environment Variables`

2. **Ajouter les variables suivantes** :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://douyibpydhqtejhqinjp.supabase.co
   ```

   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0
   ```

3. **Appliquer à** : `Production`, `Preview`, et `Development` ✅

---

## 📋 Étape 3 : Vérifier la structure du projet

### 3.1. Structure attendue

Vercel doit pointer vers le dossier `plan-de-charge-web` qui contient :
- ✅ `package.json`
- ✅ `next.config.ts`
- ✅ `src/app/`
- ✅ `.env.local` (localement, pas sur Vercel)

### 3.2. Si le projet est dans un sous-dossier

Si votre structure est :
```
plan de charge/
  ├── plan-de-charge-web/
  │   ├── package.json
  │   ├── src/
  │   └── ...
  └── autres fichiers...
```

**Alors dans Vercel** :
1. **Aller dans** : `Project Settings` → `General`
2. **Définir Root Directory** : `plan-de-charge-web`
3. **Sauvegarder**

**Note :** Le fichier `vercel.json` configure déjà les commandes de build pour pointer vers ce dossier, mais le `Root Directory` doit être défini dans l'interface Vercel.

---

## 📋 Étape 4 : Déclencher le déploiement

### Option A : Déploiement automatique (recommandé)

1. **Faire un commit et push** sur GitHub :
   ```powershell
   git add .
   git commit -m "feat: Configuration pour déploiement Vercel"
   git push origin main
   ```

2. **Vercel détectera automatiquement** le push et lancera un build

3. **Suivre le déploiement** sur [vercel.com/dashboard](https://vercel.com/dashboard)

### Option B : Déploiement manuel

1. **Aller sur le dashboard Vercel**
2. **Cliquer sur "Deploy"** ou "Redeploy"
3. **Sélectionner la branche** `main`

---

## 📋 Étape 5 : Vérifier le déploiement

### 5.1. Vérifier les logs de build

Dans Vercel, aller dans :
- `Deployments` → Cliquer sur le dernier déploiement → `Build Logs`

**Vérifier que** :
- ✅ `npm install` s'exécute sans erreur
- ✅ `npm run build` se termine avec succès
- ✅ Pas d'erreur liée aux variables d'environnement

### 5.2. Tester l'application déployée

Une fois le déploiement terminé :

1. **Vercel fournira une URL** : `https://votre-projet.vercel.app`
2. **Tester la page Supabase** : `https://votre-projet.vercel.app/test-supabase`
3. **Vérifier que** :
   - ✅ La page se charge
   - ✅ Les variables d'environnement sont détectées
   - ✅ La connexion Supabase fonctionne

---

## 📋 Étape 6 : Configuration avancée (optionnel)

### 6.1. Domaine personnalisé

1. **Aller dans** : `Project Settings` → `Domains`
2. **Ajouter votre domaine** personnalisé
3. **Configurer les DNS** selon les instructions Vercel

### 6.2. Variables d'environnement par environnement

Vous pouvez définir des variables différentes pour :
- **Production** : Variables de production
- **Preview** : Variables de staging
- **Development** : Variables de développement

---

## 🐛 Dépannage

### Erreur : "Build failed"

**Causes possibles** :
1. ❌ Variables d'environnement manquantes
   - **Solution** : Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont définies

2. ❌ Root Directory incorrect
   - **Solution** : Vérifier que `Root Directory` = `plan-de-charge-web`

3. ❌ Erreur de build TypeScript
   - **Solution** : Vérifier les logs de build pour les erreurs TypeScript

### Erreur : "Environment variables not found"

**Solution** :
1. Aller dans `Project Settings` → `Environment Variables`
2. Vérifier que les variables sont bien définies
3. **Redéployer** après avoir ajouté les variables

### Erreur : "Module not found"

**Solution** :
1. Vérifier que `package.json` contient toutes les dépendances
2. Vérifier que `node_modules` n'est pas commité (normal, c'est dans `.gitignore`)

---

## ✅ Checklist de déploiement

- [ ] Vercel connecté à GitHub
- [ ] Root Directory configuré (`plan-de-charge-web`)
- [ ] Variables d'environnement ajoutées :
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Code poussé sur GitHub (`main` branch)
- [ ] Déploiement déclenché (automatique ou manuel)
- [ ] Build réussi (vérifier les logs)
- [ ] Application accessible sur l'URL Vercel
- [ ] Test Supabase fonctionne (`/test-supabase`)

---

## 🎯 Prochaines étapes après déploiement

1. **Tester toutes les fonctionnalités** sur l'URL de production
2. **Configurer un domaine personnalisé** (si souhaité)
3. **Mettre en place un monitoring** (Vercel Analytics)
4. **Configurer les webhooks** (si nécessaire)

---

## 📞 Support

- **Documentation Vercel** : [vercel.com/docs](https://vercel.com/docs)
- **Documentation Next.js** : [nextjs.org/docs](https://nextjs.org/docs)
- **Documentation Supabase** : [supabase.com/docs](https://supabase.com/docs)

---

**Bon déploiement ! 🚀**
