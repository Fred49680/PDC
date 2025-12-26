# ✅ Vérification Rapide Vercel - Checklist

## 🎯 Vérifications à faire MAINTENANT dans Vercel

### 1️⃣ Root Directory (CRITIQUE - 90% des problèmes viennent de là)

**Dans Vercel Dashboard :**
1. Aller sur : [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Cliquer sur votre projet : `PDC`
3. Aller dans : **Settings** → **General**
4. Scroller jusqu'à : **Root Directory**
5. **Vérifier que c'est EXACTEMENT** : `plan-de-charge-web`

**⚠️ Si c'est vide ou différent :**
- Cliquer sur **Edit**
- Entrer : `plan-de-charge-web` (sans slash, sans espace)
- Cliquer sur **Save**
- **IMPORTANT** : Redéployer après (voir étape 3)

---

### 2️⃣ Variables d'Environnement

**Dans Vercel Dashboard :**
1. Aller dans : **Settings** → **Environment Variables**
2. **Vérifier que ces 2 variables existent** :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://douyibpydhqtejhqinjp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0` |

**⚠️ Si les variables manquent :**
- Cliquer sur **Add New**
- Nom : `NEXT_PUBLIC_SUPABASE_URL`
- Valeur : `https://douyibpydhqtejhqinjp.supabase.co`
- Environnements : ✅ Production, ✅ Preview, ✅ Development
- Cliquer sur **Save**
- Répéter pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 3️⃣ Redéployer le projet

**Après avoir corrigé le Root Directory et/ou les variables :**

1. Aller dans : **Deployments** (onglet en haut)
2. Cliquer sur : **...** (trois points) du dernier déploiement
3. Sélectionner : **Redeploy**
4. Attendre : 2-3 minutes
5. Tester : L'URL de production

**OU** déclencher un nouveau déploiement via Git :
```powershell
git commit --allow-empty -m "trigger: Redéploiement Vercel"
git push origin main
```

---

## 🔍 Vérification des logs de build

**Pour diagnostiquer les erreurs :**

1. Aller dans : **Deployments**
2. Cliquer sur : Le dernier déploiement
3. Ouvrir : Les **Build Logs**
4. **Chercher** :
   - ✅ `Build Completed` → Build réussi
   - ❌ `Build Failed` → Erreur à corriger
   - ❌ `Module not found` → Root Directory incorrect
   - ❌ `Environment variable not found` → Variables manquantes

**Si vous voyez des erreurs :**
- Copier les erreurs complètes
- Les partager pour diagnostic

---

## ✅ Checklist finale

Avant de tester, vérifier :

- [ ] Root Directory = `plan-de-charge-web` dans Vercel
- [ ] Variable `NEXT_PUBLIC_SUPABASE_URL` définie
- [ ] Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` définie
- [ ] Variables disponibles pour Production, Preview, Development
- [ ] Nouveau déploiement effectué après corrections
- [ ] Build réussit dans Vercel (pas d'erreurs dans les logs)

---

## 🚨 Si ça ne marche toujours pas

**Partager :**
1. L'URL exacte qui donne l'erreur
2. Le message d'erreur exact
3. Les logs de build Vercel (copier-coller)
4. Une capture d'écran de la page d'erreur

**Vérifier aussi :**
- La page d'accueil (`/`) fonctionne-t-elle sur Vercel ?
- La page `/test-supabase` donne-t-elle 404 ou une autre erreur ?
