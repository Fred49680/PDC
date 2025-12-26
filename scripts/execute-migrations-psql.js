/**
 * Script pour exécuter les migrations SQL sur Supabase via psql
 * Ce script tente d'utiliser psql pour exécuter les migrations automatiquement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Charger les clés Supabase
function loadSupabaseKeys() {
  const keysFile = path.join(__dirname, '..', 'VOS_CLES_SUPABASE.txt');
  if (!fs.existsSync(keysFile)) {
    throw new Error('Fichier VOS_CLES_SUPABASE.txt introuvable');
  }

  const content = fs.readFileSync(keysFile, 'utf-8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  
  if (!urlMatch) {
    throw new Error('Impossible de lire l\'URL Supabase');
  }

  const url = urlMatch[1].trim();
  // Extraire le projet ID de l'URL
  const projectId = url.replace('https://', '').replace('.supabase.co', '');
  
  return { projectId, url };
}

// Vérifier si psql est disponible
function checkPsql() {
  try {
    execSync('psql --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Fonction principale
async function main() {
  try {
    console.log('🚀 Exécution des migrations SQL sur Supabase\n');
    
    // Charger les clés
    const { projectId, url } = loadSupabaseKeys();
    console.log(`✅ Clés Supabase chargées`);
    console.log(`   Projet: ${projectId}`);
    console.log(`   URL: ${url}\n`);

    // Vérifier si psql est disponible
    const hasPsql = checkPsql();
    
    if (!hasPsql) {
      console.log('⚠️  psql n\'est pas installé ou n\'est pas dans le PATH');
      console.log('   Les migrations doivent être exécutées manuellement dans le SQL Editor de Supabase\n');
      console.log('📋 INSTRUCTIONS:');
      console.log('   1. Aller sur https://supabase.com/dashboard');
      console.log('   2. Sélectionner votre projet');
      console.log('   3. Aller dans "SQL Editor"');
      console.log('   4. Copier-coller le contenu de MIGRATION_COMBINED.sql');
      console.log('   5. Exécuter (Run ou Ctrl+Enter)\n');
      return;
    }

    console.log('✅ psql détecté\n');

    // Vérifier que MIGRATION_COMBINED.sql existe
    const migrationFile = path.join(__dirname, '..', 'MIGRATION_COMBINED.sql');
    if (!fs.existsSync(migrationFile)) {
      console.log('📄 Création de la migration combinée...');
      // Exécuter le script de préparation
      execSync('node scripts/execute-migrations-supabase.js', { stdio: 'inherit' });
    }

    console.log('📋 Pour exécuter les migrations avec psql, vous avez besoin de:');
    console.log('   1. Le mot de passe de la base de données Supabase');
    console.log('   2. La connexion directe activée dans Supabase\n');
    
    console.log('🔗 URL de connexion psql:');
    console.log(`   postgresql://postgres:[PASSWORD]@db.${projectId}.supabase.co:5432/postgres\n`);
    
    console.log('💡 Pour obtenir le mot de passe:');
    console.log('   1. Aller sur https://supabase.com/dashboard');
    console.log('   2. Sélectionner votre projet');
    console.log('   3. Aller dans Settings → Database');
    console.log('   4. Copier le mot de passe de la base de données\n');
    
    console.log('📝 Commande à exécuter (remplacer [PASSWORD]):');
    console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${projectId}.supabase.co:5432/postgres" -f MIGRATION_COMBINED.sql\n`);
    
    // Demander si l'utilisateur veut exécuter maintenant
    console.log('⚠️  Pour des raisons de sécurité, cette commande doit être exécutée manuellement');
    console.log('   avec le mot de passe de la base de données.\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

