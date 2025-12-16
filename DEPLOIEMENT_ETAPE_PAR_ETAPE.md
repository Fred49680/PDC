# 🚀 Déploiement Vercel - Guide Étape par Étape

## ✅ Étape 1 : Vérifier que tout est prêt

### 1.1. Vérifier que le code est sur GitHub
- ✅ Le code est déjà poussé sur `https://github.com/Fred49680/PDC.git`
- ✅ Les fichiers Next.js sont dans `plan-de-charge-web/`
- ✅ Le `package.json` est présent dans `plan-de-charge-web/`

### 1.2. Informations nécessaires pour Vercel

**Variables d'environnement à configurer :**
```
NEXT_PUBLIC_SUPABASE_URL=https://douyibpydhqtejhqinjp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0
```

---

## 📋 Étape 2 : Se connecter à Vercel

1. **Aller sur** : [https://vercel.com](https://vercel.com)
2. **Se connecter** avec votre compte GitHub (si ce n'est pas déjà fait)
3. **Autoriser Vercel** à accéder à vos repositories GitHub

---

## 📋 Étape 3 : Importer le projet

### Option A : Si le projet n'existe pas encore sur Vercel

1. **Cliquer sur** : `Add New Project` (bouton en haut à droite)
2. **Sélectionner** : `Import Git Repository`
3. **Choisir** : Le repository `Fred49680/PDC`
4. **Cliquer sur** : `Import`

### Option B : Si le projet existe déjà

1. **Aller sur** : [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. **Cliquer sur** : Le projet `PDC` (ou le nom que vous avez donné)

---

## 📋 Étape 4 : Configurer le Root Directory ⚠️ CRITIQUE

**C'est LA configuration la plus importante !**

1. **Dans la page de configuration du projet**, trouver la section `Configure Project`
2. **Trouver le champ** : `Root Directory`
3. **Cliquer sur** : `Edit` ou le champ lui-même
4. **Entrer** : `plan-de-charge-web`
5. **Valider**

**⚠️ Si vous ne voyez pas ce champ :**
- Cliquer sur `Advanced` ou `Show Advanced Options`
- Le champ `Root Directory` devrait apparaître

---

## 📋 Étape 5 : Configurer les Variables d'Environnement

**⚠️ CRITIQUE : Sans ces variables, l'app ne pourra pas se connecter à Supabase !**

1. **Dans la page de configuration**, trouver la section `Environment Variables`
2. **Cliquer sur** : `Add` ou `+ Add Variable`

### Variable 1 : NEXT_PUBLIC_SUPABASE_URL

- **Name** : `NEXT_PUBLIC_SUPABASE_URL`
- **Value** : `https://douyibpydhqtejhqinjp.supabase.co`
- **Environments** : ✅ Cocher `Production`, `Preview`, et `Development`
- **Cliquer sur** : `Add`

### Variable 2 : NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0`
- **Environments** : ✅ Cocher `Production`, `Preview`, et `Development`
- **Cliquer sur** : `Add`

---

## 📋 Étape 6 : Vérifier les paramètres de build

Vercel détecte automatiquement Next.js et configure :
- ✅ **Build Command** : `npm run build` (automatique)
- ✅ **Output Directory** : `.next` (automatique)
- ✅ **Install Command** : `npm install` (automatique)
- ✅ **Framework** : Next.js (détecté automatiquement)

**✅ Aucune configuration supplémentaire nécessaire !** Vercel détecte automatiquement Next.js quand le Root Directory est correctement configuré.

---

## 📋 Étape 7 : Lancer le déploiement

1. **Vérifier** que tout est correct :
   - ✅ Root Directory : `plan-de-charge-web`
   - ✅ Variables d'environnement : 2 variables ajoutées
   - ✅ Framework : Next.js (détecté automatiquement)

2. **Cliquer sur** : `Deploy` (bouton en bas de la page)

3. **Attendre** le déploiement (2-3 minutes généralement)

---

## 📋 Étape 8 : Vérifier le déploiement

### 8.1. Pendant le déploiement

- Vous verrez les logs de build en temps réel
- Vérifier qu'il n'y a pas d'erreurs

### 8.2. Après le déploiement

- ✅ **Status** : `Ready` (vert)
- ✅ **URL** : Vous recevrez une URL comme `https://pdc-xxx.vercel.app`

### 8.3. Tester l'application

1. **Cliquer sur** : L'URL du déploiement
2. **Tester** : Aller sur `/test-supabase` pour vérifier la connexion Supabase
3. **Vérifier** : Que la page s'affiche correctement

---

## 🔧 Si le déploiement échoue

### Erreur : "Root Directory not found"
- **Solution** : Vérifier que `Root Directory` est bien défini à `plan-de-charge-web` (sans slash au début)

### Erreur : "Build failed"
- **Solution** : Vérifier les logs de build dans Vercel pour identifier l'erreur exacte

### Erreur : "Environment variables missing"
- **Solution** : Vérifier que les 2 variables d'environnement sont bien ajoutées et appliquées à tous les environnements

### Erreur : "Module not found"
- **Solution** : Vérifier que `package.json` est bien dans `plan-de-charge-web/`

---

## ✅ Checklist finale avant déploiement

- [ ] Compte Vercel connecté à GitHub
- [ ] Repository `Fred49680/PDC` importé dans Vercel
- [ ] Root Directory configuré : `plan-de-charge-web`
- [ ] Variable `NEXT_PUBLIC_SUPABASE_URL` ajoutée
- [ ] Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` ajoutée
- [ ] Les 2 variables appliquées à Production, Preview, et Development
- [ ] Prêt à cliquer sur `Deploy` !

---

## 🎉 Après le déploiement réussi

1. **Notez l'URL** de votre application (ex: `https://pdc-xxx.vercel.app`)
2. **Testez** la page `/test-supabase` pour vérifier Supabase
3. **Configurez un domaine personnalisé** (optionnel) dans `Project Settings` → `Domains`

---

## 📞 Besoin d'aide ?

Si vous rencontrez un problème, vérifiez :
1. Les logs de build dans Vercel
2. Que le Root Directory est correct
3. Que les variables d'environnement sont bien définies
4. Que le code est bien poussé sur GitHub

**Bon déploiement ! 🚀**
