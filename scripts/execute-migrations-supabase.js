/**
 * Script pour exécuter les migrations SQL sur Supabase via l'API
 * Ce script combine les migrations et les exécute via l'API Supabase
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Charger les clés Supabase
function loadSupabaseKeys() {
  const keysFile = path.join(__dirname, '..', 'VOS_CLES_SUPABASE.txt');
  if (!fs.existsSync(keysFile)) {
    throw new Error('Fichier VOS_CLES_SUPABASE.txt introuvable');
  }

  const content = fs.readFileSync(keysFile, 'utf-8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
  
  if (!urlMatch || !keyMatch) {
    throw new Error('Impossible de lire les clés Supabase depuis VOS_CLES_SUPABASE.txt');
  }

  return {
    url: urlMatch[1].trim(),
    key: keyMatch[1].trim(),
  };
}

// Lire un fichier de migration
function readMigration(filename) {
  const filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier de migration introuvable: ${filename}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// Exécuter du SQL via l'API Supabase (utilise l'endpoint REST)
async function executeSQL(sql, supabaseUrl, supabaseKey) {
  return new Promise((resolve, reject) => {
    // Note: Supabase ne permet pas l'exécution de SQL arbitraire via l'API REST standard
    // Il faut utiliser le SQL Editor ou psql avec la connexion directe
    
    // Cependant, on peut utiliser l'endpoint /rest/v1/rpc pour appeler des fonctions
    // Mais pour exécuter du SQL brut, il faut utiliser psql ou le SQL Editor
    
    console.log('⚠️  Supabase ne permet pas l\'exécution de SQL arbitraire via l\'API REST');
    console.log('   Les migrations doivent être exécutées via:');
    console.log('   1. Le SQL Editor de Supabase (recommandé)');
    console.log('   2. psql avec la connexion directe à la base de données');
    
    reject(new Error('Exécution SQL arbitraire non supportée via API REST'));
  });
}

// Fonction principale
async function main() {
  try {
    console.log('🚀 Préparation des migrations SQL pour Supabase\n');
    
    // Charger les clés
    const { url, key } = loadSupabaseKeys();
    console.log(`✅ Clés Supabase chargées`);
    console.log(`   URL: ${url}\n`);

    // Lire les migrations
    const migration1 = readMigration('MIGRATION_FIX_BOOLEAN_FINAL.sql');
    const migration2 = readMigration('MIGRATION_DISABLE_TRIGGERS_BATCH.sql');
    
    console.log('✅ Migrations chargées:');
    console.log('   - MIGRATION_FIX_BOOLEAN_FINAL.sql');
    console.log('   - MIGRATION_DISABLE_TRIGGERS_BATCH.sql\n');

    // Combiner les migrations
    const combinedMigration = `-- Migration combinée: Fix Boolean + Disable Triggers Batch
-- Générée automatiquement le ${new Date().toISOString()}

${migration1}

${migration2}
`;

    // Sauvegarder la migration combinée
    const outputPath = path.join(__dirname, '..', 'MIGRATION_COMBINED.sql');
    fs.writeFileSync(outputPath, combinedMigration, 'utf-8');
    console.log(`✅ Migration combinée sauvegardée: ${outputPath}\n`);

    // Afficher les instructions
    console.log('📋 INSTRUCTIONS POUR EXÉCUTER LES MIGRATIONS:\n');
    console.log('1. Aller sur https://supabase.com/dashboard');
    console.log('2. Sélectionner votre projet');
    console.log('3. Aller dans "SQL Editor" (menu de gauche)');
    console.log('4. Cliquer sur "New query"');
    console.log('5. Copier-coller le contenu du fichier MIGRATION_COMBINED.sql');
    console.log('6. Cliquer sur "Run" (ou Ctrl+Enter)\n');
    
    console.log('📄 Ou exécuter via psql:');
    console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${url.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres" -f MIGRATION_COMBINED.sql\n`);

    console.log('✅ Préparation terminée!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

