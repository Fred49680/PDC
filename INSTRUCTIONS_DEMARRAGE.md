# 🚀 INSTRUCTIONS DE DÉMARRAGE - PROJET CONFIGURÉ

## ✅ CE QUI EST DÉJÀ FAIT

1. ✅ **Clés Supabase configurées** : Vos clés sont prêtes
2. ✅ **Fichiers de configuration créés** : Client Supabase, structure de base
3. ✅ **Documentation complète** : Tous les guides sont disponibles

---

## 📋 ÉTAPES POUR DÉMARRER

### Étape 1 : Créer le projet Next.js

```bash
# Depuis le dossier parent
cd "c:\Users\Fredd\OneDrive\Desktop\VBA Excel"
npx create-next-app@latest plan-de-charge-web --typescript --tailwind --app --yes
cd plan-de-charge-web
```

### Étape 2 : Copier la configuration

```bash
# Copier le fichier .env.local.example en .env.local
# (Windows PowerShell)
Copy-Item "..\plan de charge\.env.local.example" ".env.local"

# OU manuellement :
# Créer .env.local avec le contenu suivant :
```

**Contenu de `.env.local`** :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dkfkkpddityvxjuxtugp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZmtrcGRkaXR5dnhqdXh0dWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODgyNjQsImV4cCI6MjA4MTQ2NDI2NH0.3BSRE65M_eMWyyHPo5TC10IAmu9FtOw6LYua3jM7gQE
```

### Étape 3 : Installer les dépendances

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand date-fns react-hook-form zod clsx tailwind-merge lucide-react
npm install -D @types/node @types/react @types/react-dom
```

### Étape 4 : Créer la structure de dossiers

```bash
# Créer les dossiers nécessaires
mkdir -p src/lib/supabase
mkdir -p src/lib/hooks
mkdir -p src/lib/utils
mkdir -p src/components/charge
mkdir -p src/components/affectations
mkdir -p src/components/shared
mkdir -p src/components/ui
```

### Étape 5 : Copier les fichiers de base

Copiez ces fichiers depuis `plan de charge/src/lib/supabase/` vers votre projet :

1. **`src/lib/supabase/client.ts`** (déjà créé dans `plan de charge/src/lib/supabase/client.ts`)
2. **`src/lib/supabase/server.ts`** (déjà créé dans `plan de charge/src/lib/supabase/server.ts`)

### Étape 6 : Créer le fichier de test

Créez `src/app/test-supabase/page.tsx` avec le contenu de `TEST_CONNEXION_SUPABASE.md`

### Étape 7 : Tester la connexion

```bash
npm run dev
```

Puis accédez à : `http://localhost:3000/test-supabase`

---

## 📊 ÉTAPE 8 : EXÉCUTER LE SCHÉMA SQL

### Dans Supabase Dashboard

1. Aller sur : https://supabase.com/dashboard
2. Sélectionner votre projet : `dkfkkpddityvxjuxtugp`
3. Cliquer sur **"SQL Editor"** dans le menu de gauche
4. Ouvrir le fichier `ARCHITECTURE_VERCEL_SUPABASE.md`
5. Copier toute la section **SQL** (tables, fonctions, triggers, RLS)
6. Coller dans l'éditeur SQL
7. Cliquer sur **"Run"** ou `Ctrl+Enter`

### Vérifier les tables créées

Dans Supabase Dashboard > **Table Editor**, vous devriez voir :
- ✅ `sites`
- ✅ `affaires`
- ✅ `competences`
- ✅ `ressources`
- ✅ `ressources_competences`
- ✅ `calendrier`
- ✅ `periodes_charge`
- ✅ `affectations`
- ✅ `absences`
- ✅ `transferts`
- ✅ `interims`
- ✅ `chantiers`
- ✅ `etats_chantiers`
- ✅ `alertes`
- ✅ `feries`
- ✅ `parametres`

---

## 🎨 ÉTAPE 9 : CRÉER LES PREMIERS COMPOSANTS

### Utiliser les exemples fournis

1. **Module Charge** : Voir `INTERFACE_MODULE_CHARGE.md`
2. **Module Affectation** : Voir `INTERFACE_MODULE_AFFECTATION.md`
3. **Hooks** : Voir `EXEMPLES_CODE_VERCEL_SUPABASE.md`

---

## ✅ CHECKLIST COMPLÈTE

- [ ] Projet Next.js créé
- [ ] Fichier `.env.local` créé avec vos clés
- [ ] Dépendances installées
- [ ] Structure de dossiers créée
- [ ] Fichiers `client.ts` et `server.ts` copiés
- [ ] Page de test créée
- [ ] Test de connexion réussi
- [ ] Schéma SQL exécuté dans Supabase
- [ ] Tables vérifiées dans Supabase Dashboard
- [ ] Premiers composants créés

---

## 🆘 EN CAS DE PROBLÈME

### Erreur "Variables d'environnement manquantes"
- Vérifier que `.env.local` existe à la racine du projet
- Redémarrer le serveur (`Ctrl+C` puis `npm run dev`)

### Erreur "Table does not exist"
- Normal si le schéma SQL n'est pas encore exécuté
- Exécuter le schéma SQL dans Supabase Dashboard

### Erreur de connexion
- Vérifier que l'URL et la clé sont correctes
- Vérifier que le projet Supabase est actif
- Vérifier votre connexion internet

---

## 📚 DOCUMENTATION DISPONIBLE

1. **`ARCHITECTURE_VERCEL_SUPABASE.md`** - Schéma complet de la base de données
2. **`GUIDE_DEMARRAGE_VERCEL_SUPABASE.md`** - Guide de démarrage rapide
3. **`EXEMPLES_CODE_VERCEL_SUPABASE.md`** - Exemples de code complets
4. **`INTERFACE_MODULE_CHARGE.md`** - Interface module Charge
5. **`INTERFACE_MODULE_AFFECTATION.md`** - Interface module Affectation
6. **`CONFIGURATION_NEXTJS.md`** - Configuration Next.js complète
7. **`CONFIGURATION_SUPABASE_REEL.md`** - Votre configuration Supabase

---

**Tout est prêt pour démarrer le développement !** 🚀
