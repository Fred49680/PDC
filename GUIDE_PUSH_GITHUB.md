# 🚀 Guide : Pousser le projet sur GitHub

## ✅ État actuel

- ✅ Dépôt Git initialisé
- ✅ Commit initial créé (91 fichiers, 44 681 lignes)
- ✅ `.gitignore` configuré (`.env.local` exclu)
- ✅ Configuration Git : email configuré

## 📋 Étapes pour pousser sur GitHub

### Option 1 : Créer un nouveau dépôt GitHub

1. **Aller sur GitHub** : https://github.com/new
2. **Créer un nouveau dépôt** :
   - Nom : `plan-de-charge-web` (ou autre nom)
   - Visibilité : Private (recommandé) ou Public
   - **NE PAS** initialiser avec README, .gitignore ou licence
3. **Copier l'URL du dépôt** (ex: `https://github.com/votre-username/plan-de-charge-web.git`)

### Option 2 : Utiliser un dépôt existant

Si vous avez déjà un dépôt GitHub, copiez son URL.

---

## 🔗 Ajouter le remote et pousser

Une fois que vous avez l'URL de votre dépôt GitHub, exécutez :

```powershell
cd "c:\Users\Fredd\OneDrive\Desktop\VBA Excel\plan de charge"

# Ajouter le remote (remplacez par votre URL)
git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git

# Renommer la branche en 'main' (si nécessaire)
git branch -M main

# Pousser le code
git push -u origin main
```

---

## 🔐 Authentification GitHub

### Méthode 1 : Personal Access Token (recommandé)

1. **Créer un token** : https://github.com/settings/tokens
   - Cliquer sur "Generate new token (classic)"
   - Nom : `plan-de-charge-web`
   - Permissions : `repo` (accès complet aux dépôts)
   - Générer et **copier le token** (il ne sera plus visible)

2. **Lors du push**, Git vous demandera :
   - Username : votre nom d'utilisateur GitHub
   - Password : **collez le token** (pas votre mot de passe)

### Méthode 2 : GitHub CLI

```powershell
# Installer GitHub CLI (si pas déjà installé)
winget install GitHub.cli

# Se connecter
gh auth login

# Créer le dépôt et pousser en une commande
gh repo create plan-de-charge-web --private --source=. --remote=origin --push
```
gh repo create plan-de-charge-web --private --source=. --remote=origin --push
---

## ✅ Vérification

Après le push, vérifiez sur GitHub :
- ✅ Tous les fichiers sont présents
- ✅ `.env.local` n'est **PAS** visible (protégé par .gitignore)
- ✅ Le commit initial est visible

---

## 🔄 Commandes utiles

```powershell
# Voir l'état
git status

# Voir les commits
git log --oneline

# Voir les remotes
git remote -v

# Pousser les modifications futures
git push

# Récupérer les modifications
git pull
```

---

## ⚠️ Important

- **NE JAMAIS** commiter `.env.local` (déjà dans .gitignore)
- **NE JAMAIS** partager vos clés Supabase publiquement
- Utilisez un dépôt **Private** pour la sécurité

---

**Besoin d'aide ?** Dites-moi l'URL de votre dépôt GitHub et je peux configurer le remote pour vous ! 🚀
