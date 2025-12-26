// Script Node.js pour créer les icônes PWA
// Utilise canvas pour générer les icônes programmatiquement
// Exécuter avec: node create-icons.js

const fs = require('fs');
const path = require('path');

// Note: Ce script nécessite node-canvas qui n'est pas installé par défaut
// Alternative: Utiliser le fichier HTML generate-icons.html dans le navigateur

console.log(`
Pour créer les icônes PWA:

1. Ouvrez public/generate-icons.html dans votre navigateur
2. Cliquez sur "Générer l'icône"
3. Téléchargez icon-192.png et icon-512.png
4. Placez-les dans le dossier public/

Ou utilisez un outil en ligne comme:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
`);
