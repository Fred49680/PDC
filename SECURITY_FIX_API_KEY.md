# 🔒 CORRECTION DE SÉCURITÉ - Clé API Google exposée

## ⚠️ Problème détecté

GitGuardian a détecté que la clé API Google Maps a été exposée dans le dépôt GitHub.

**Clé exposée :** `AIzaSyDY57ZffE7f8Homq8E8wybjOi9k21sMsU0`

## ✅ Actions immédiates à effectuer

### 1. Révoquer la clé exposée dans Google Cloud Console

**URGENT :** Cette clé doit être révoquée immédiatement car elle est maintenant publique dans l'historique Git.

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Connectez-vous avec votre compte Google
3. Sélectionnez votre projet
4. Allez dans **APIs & Services** → **Credentials**
5. Trouvez la clé API : `AIzaSyDY57ZffE7f8Homq8E8wybjOi9k21sMsU0`
6. Cliquez sur **DELETE** ou **RESTRICT** pour la désactiver
7. Créez une **nouvelle clé API** pour remplacer l'ancienne

### 2. Mettre à jour les variables d'environnement

Après avoir créé une nouvelle clé :

1. **Localement** : Mettez à jour `.env.local` dans `plan-de-charge-web/`
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_nouvelle_cle_ici
   ```

2. **Vercel** : Mettez à jour la variable d'environnement dans votre projet Vercel
   - Settings → Environment Variables
   - Modifiez `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` avec la nouvelle clé

### 3. Nettoyer l'historique Git (optionnel mais recommandé)

⚠️ **Attention** : Cette opération modifie l'historique Git. Si d'autres personnes travaillent sur le dépôt, coordonnez-vous avec eux.

#### Option A : Utiliser git-filter-repo (recommandé)

```bash
# Installer git-filter-repo si nécessaire
pip install git-filter-repo

# Supprimer la clé de tout l'historique
git filter-repo --invert-paths --path GUIDE_CALCUL_DISTANCE.md
# Puis recréer le fichier proprement
```

#### Option B : Utiliser BFG Repo-Cleaner

```bash
# Télécharger BFG : https://rtyley.github.io/bfg-repo-cleaner/

# Créer un fichier passwords.txt avec la clé à supprimer
echo "AIzaSyDY57ZffE7f8Homq8E8wybjOi9k21sMsU0" > passwords.txt

# Nettoyer l'historique
java -jar bfg.jar --replace-text passwords.txt

# Nettoyer et forcer le push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

⚠️ **Important** : Après avoir nettoyé l'historique, vous devrez forcer le push (`git push --force`), ce qui peut affecter les autres contributeurs.

### 4. Vérifier qu'aucune autre clé n'est exposée

1. Vérifiez tous les fichiers avec :
   ```bash
   git grep -i "AIzaSy"
   ```

2. Vérifiez que `.env.local` est bien dans `.gitignore`

3. Utilisez [GitGuardian](https://www.gitguardian.com/) ou [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning) pour détecter d'autres secrets exposés

## 📋 Checklist de sécurité

- [ ] Clé API révoquée dans Google Cloud Console
- [ ] Nouvelle clé API créée
- [ ] Variable d'environnement locale mise à jour (`.env.local`)
- [ ] Variable d'environnement Vercel mise à jour
- [ ] Documentation mise à jour (sans clé réelle)
- [ ] Historique Git nettoyé (optionnel)
- [ ] Testé que l'application fonctionne avec la nouvelle clé

## 🔐 Bonnes pratiques pour éviter ce problème à l'avenir

1. **Ne jamais commiter de clés API** dans le code ou la documentation
2. **Utiliser des variables d'environnement** pour toutes les clés sensibles
3. **Vérifier `.gitignore`** pour s'assurer que `.env.local` est ignoré
4. **Utiliser des placeholders** dans la documentation : `votre_cle_ici`
5. **Configurer GitGuardian** ou GitHub Secret Scanning pour détecter automatiquement les expositions
6. **Revue de code** avant chaque commit pour vérifier qu'aucune clé n'est incluse

## 📚 Ressources

- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Date de détection :** 2025-01-27  
**Statut :** Correction en cours

