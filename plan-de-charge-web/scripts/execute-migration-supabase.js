/**
 * Script pour exécuter la migration batch_insert_periodes_charge sur Supabase
 * Utilise l'API Supabase directement
 */

const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  
  if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
  if (keyMatch) SUPABASE_SERVICE_KEY = keyMatch[1].trim();
}

// Fallback sur les valeurs du fichier VOS_CLES_SUPABASE.txt
if (!SUPABASE_URL) {
  const keysPath = path.join(__dirname, '../../VOS_CLES_SUPABASE.txt');
  if (fs.existsSync(keysPath)) {
    const keysContent = fs.readFileSync(keysPath, 'utf8');
    const urlMatch = keysContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
  }
}

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL non trouvé');
  console.error('💡 Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

async function executeMigration() {
  try {
    console.log('📦 Lecture de la migration...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127000000_fix_batch_insert_periodes_charge_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔗 Connexion à Supabase...');
    console.log('   URL:', SUPABASE_URL.substring(0, 40) + '...');
    
    // Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST
    // Il faut utiliser le SQL Editor du dashboard ou psql
    
    // Option 1: Utiliser le Management API si disponible (nécessite service_role key)
    if (SUPABASE_SERVICE_KEY) {
      console.log('\n🔄 Tentative d\'exécution via l\'API Supabase...');
      
      // Diviser le SQL en commandes individuelles
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      // Note: Supabase n'a pas d'endpoint pour exécuter du SQL arbitraire
      // On va utiliser une approche différente : créer une fonction RPC temporaire
      console.log('⚠️  Supabase ne permet pas d\'exécuter du SQL arbitraire via l\'API REST');
      console.log('📝 Veuillez utiliser l\'une des méthodes suivantes:\n');
    }
    
    // Afficher le SQL à exécuter
    console.log('📋 SQL à exécuter dans le Supabase Dashboard:');
    console.log('═'.repeat(80));
    console.log(migrationSQL);
    console.log('═'.repeat(80));
    
    // Extraire le project ref pour créer le lien direct
    const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectRef = urlMatch[1];
      console.log('\n🔗 Lien direct vers le SQL Editor:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    }
    
    console.log('\n📝 Instructions:');
    console.log('   1. Ouvrez le lien ci-dessus (ou allez dans Supabase Dashboard → SQL Editor)');
    console.log('   2. Copiez-collez le SQL ci-dessus');
    console.log('   3. Cliquez sur "Run" (ou Ctrl+Enter)');
    console.log('   4. Vérifiez qu\'il n\'y a pas d\'erreur');
    
    // Option 2: Essayer avec psql si disponible
    console.log('\n🔄 Tentative d\'exécution via psql...');
    
    try {
      const { execSync } = require('child_process');
      
      // Vérifier si psql est disponible
      try {
        execSync('psql --version', { stdio: 'ignore' });
      } catch {
        console.log('⚠️  psql n\'est pas installé');
        console.log('💡 Installez PostgreSQL pour utiliser psql, ou utilisez le SQL Editor');
        return;
      }
      
      // Demander le mot de passe de la base de données
      console.log('\n💡 Pour utiliser psql, vous avez besoin du mot de passe de la base de données');
      console.log('   Vous pouvez le trouver dans: Supabase Dashboard → Settings → Database');
      console.log('   Ou utilisez la méthode du SQL Editor ci-dessus (plus simple)');
      
    } catch (error) {
      console.log('⚠️  Impossible d\'utiliser psql:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

executeMigration();


