/**
 * Script pour générer les icônes PWA
 * Utilise sharp pour créer des PNG de qualité
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon(size, outputPath) {
  // Créer un SVG avec le design de l'icône
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="white"/>
      <text x="${size / 2}" y="${size / 2 + size * 0.05}" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="#6366f1" text-anchor="middle" dominant-baseline="middle">PDC</text>
    </svg>
  `.trim();

  try {
    // Convertir SVG en PNG
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Icône ${size}x${size} générée : ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la génération de l'icône ${size}x${size}:`, error.message);
    return false;
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 Génération des icônes PWA...\n');
  
  // Créer les icônes 192x192 et 512x512
  const icon192 = await generateIcon(192, path.join(publicDir, 'icon-192.png'));
  const icon512 = await generateIcon(512, path.join(publicDir, 'icon-512.png'));
  
  if (icon192 && icon512) {
    console.log('\n✅ Toutes les icônes PWA ont été générées avec succès !');
    console.log('📱 Votre PWA est maintenant prête à être installée.\n');
  } else {
    console.log('\n⚠️  Certaines icônes n\'ont pas pu être générées.');
    console.log('💡 Vous pouvez utiliser public/generate-icons.html pour les créer manuellement.\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
}

module.exports = { generateIcon };
