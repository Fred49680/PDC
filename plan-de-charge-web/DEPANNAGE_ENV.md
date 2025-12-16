# 🔧 Dépannage - Variables d'environnement

## ✅ Vérifications à effectuer

### 1. Vérifier que `.env.local` existe
```powershell
cd "c:\Users\Fredd\OneDrive\Desktop\VBA Excel\plan de charge\plan-de-charge-web"
Test-Path .env.local
```

### 2. Vérifier le contenu de `.env.local`
```powershell
Get-Content .env.local
```

**Résultat attendu :**
```
NEXT_PUBLIC_SUPABASE_URL=https://dkfkkpddityvxjuxtugp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Redémarrer le serveur

**IMPORTANT :** Next.js ne charge les variables d'environnement qu'au démarrage. Si vous modifiez `.env.local`, vous DEVEZ redémarrer le serveur.

```powershell
# Arrêter tous les processus Node.js
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Relancer le serveur
npm run dev
```

### 4. Vérifier que le serveur tourne

Ouvrez votre navigateur et allez sur :
- http://localhost:3000/test-supabase

## 🐛 Problèmes courants

### ❌ "Variables d'environnement manquantes"

**Cause :** Le serveur n'a pas été redémarré après la création/modification de `.env.local`

**Solution :**
1. Arrêter le serveur (Ctrl+C dans le terminal ou tuer le processus Node.js)
2. Relancer avec `npm run dev`

### ❌ "Erreur de connexion"

**Cause :** Les clés Supabase sont incorrectes ou le projet Supabase n'existe plus

**Solution :**
1. Vérifier les clés dans Supabase Dashboard > Settings > API
2. Vérifier que l'URL est correcte (sans `/` à la fin)

### ❌ "Table 'sites' introuvable"

**Cause :** Le schéma SQL n'a pas encore été exécuté dans Supabase

**Solution :**
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Ouvrir SQL Editor
4. Exécuter le schéma SQL (voir `ARCHITECTURE_VERCEL_SUPABASE.md`)

## 📝 Commandes utiles

```powershell
# Voir les variables d'environnement chargées (côté serveur uniquement)
# Note: Les variables NEXT_PUBLIC_* sont accessibles côté client

# Vérifier que le fichier existe
Test-Path .env.local

# Voir le contenu (sans afficher la clé complète)
Get-Content .env.local | Select-String "NEXT_PUBLIC_SUPABASE_URL"

# Redémarrer le serveur
npm run dev
```

## ✅ Checklist de démarrage

- [ ] Fichier `.env.local` créé dans `plan-de-charge-web/`
- [ ] Variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` définies
- [ ] Serveur redémarré après création/modification de `.env.local`
- [ ] Page de test accessible sur http://localhost:3000/test-supabase
- [ ] Connexion Supabase réussie (vert ✅)
- [ ] Schéma SQL exécuté dans Supabase Dashboard (si nécessaire)
