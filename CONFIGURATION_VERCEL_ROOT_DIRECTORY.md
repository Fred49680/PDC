# Configuration Vercel - Root Directory

## Problème

Le projet Next.js se trouve dans le sous-dossier `plan-de-charge-web/` alors que le dépôt Git est à la racine. Vercel doit être configuré pour utiliser ce sous-dossier comme répertoire racine.

## Solution

La propriété `rootDirectory` ne peut **pas** être définie dans `vercel.json`. Elle doit être configurée dans le **dashboard Vercel**.

## Étapes de configuration

### 1. Accéder aux paramètres du projet

1. Connectez-vous à [vercel.com](https://vercel.com)
2. Sélectionnez votre projet **PDC** (ou le nom de votre projet)
3. Allez dans **Settings** (Paramètres)
4. Cliquez sur **General** dans le menu de gauche

### 2. Configurer le Root Directory

1. Dans la section **Root Directory**, cliquez sur **Edit**
2. Entrez : `plan-de-charge-web`
3. Cliquez sur **Save**

### 3. Vérifier la configuration

Après avoir sauvegardé, Vercel :
- Utilisera `plan-de-charge-web/` comme répertoire racine
- Trouvera le `package.json` dans ce répertoire
- Installera toutes les dépendances correctement
- Construira l'application depuis ce répertoire

### 4. Redéployer

Après avoir configuré le Root Directory :
1. Allez dans l'onglet **Deployments**
2. Cliquez sur les **trois points** (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**
4. Ou poussez un nouveau commit sur GitHub pour déclencher un nouveau déploiement automatique

## Alternative : Configuration via CLI

Si vous préférez utiliser la CLI Vercel :

```bash
# Installer Vercel CLI (si pas déjà installé)
npm i -g vercel

# Se connecter
vercel login

# Lier le projet (depuis la racine du dépôt)
vercel link

# Configurer le root directory
vercel env pull  # Pour récupérer la config actuelle
# Puis modifier dans le dashboard ou via:
vercel --prod
```

## Vérification

Après configuration, le prochain build devrait :
- ✅ Trouver `package.json` dans `plan-de-charge-web/`
- ✅ Installer `@supabase/ssr`, `clsx`, `date-fns`, `tailwind-merge`, etc.
- ✅ Construire l'application sans erreurs de modules manquants

## Solution alternative : vercel.json avec commandes personnalisées

Si vous préférez utiliser un fichier `vercel.json` au lieu du dashboard, vous pouvez utiliser des commandes de build personnalisées :

```json
{
  "buildCommand": "cd plan-de-charge-web && npm install && npm run build",
  "outputDirectory": "plan-de-charge-web/.next",
  "installCommand": "cd plan-de-charge-web && npm install"
}
```

**Note** : Cette approche fonctionne, mais la configuration via le dashboard (Root Directory) est recommandée car elle est plus simple et plus fiable.

