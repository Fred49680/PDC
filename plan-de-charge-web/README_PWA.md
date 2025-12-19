# Plan de Charge - Application Web Progressive (PWA)

## 🚀 Installation PWA

L'application est maintenant installable comme une Progressive Web App (PWA) !

### Pour installer l'application :

1. **Sur Chrome/Edge (Desktop)** :
   - Ouvrez l'application dans votre navigateur
   - Cliquez sur l'icône d'installation dans la barre d'adresse (ou via le menu)
   - Confirmez l'installation

2. **Sur Mobile (Android)** :
   - Ouvrez l'application dans Chrome
   - Un message d'installation apparaîtra automatiquement
   - Ou utilisez le menu "Ajouter à l'écran d'accueil"

3. **Sur iOS (Safari)** :
   - Ouvrez l'application dans Safari
   - Appuyez sur le bouton de partage
   - Sélectionnez "Sur l'écran d'accueil"

## 📱 Fonctionnalités PWA

- ✅ Installation sur appareil
- ✅ Mode hors ligne (avec cache)
- ✅ Mise à jour automatique
- ✅ Interface native
- ✅ Notifications (à venir)

## 🎨 Icônes

Pour générer les icônes PWA :
1. Ouvrez `public/generate-icons.html` dans votre navigateur
2. Cliquez sur "Générer l'icône"
3. Téléchargez les icônes 192x192 et 512x512
4. Placez-les dans le dossier `public/` avec les noms :
   - `icon-192.png`
   - `icon-512.png`

## 🔧 Configuration

La configuration PWA est dans :
- `public/manifest.json` - Manifest de l'application
- `public/sw.js` - Service Worker pour le cache
- `next.config.ts` - Configuration Next.js pour PWA

## 📦 Dépendances ajoutées

- `framer-motion` - Animations fluides
- `zustand` - Gestion d'état moderne (déjà présent)
