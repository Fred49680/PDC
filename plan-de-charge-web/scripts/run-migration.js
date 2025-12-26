/**
 * Script pour exécuter la migration batch_insert_periodes_charge sur Supabase
 * Utilise la service_role key pour avoir les permissions nécessaires
 */

const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_KEY');
  console.error('\n💡 Créez un fichier .env.local avec ces variables');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('📦 Lecture de la migration...');
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127000000_fix_batch_insert_periodes_charge_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔗 Connexion à Supabase...');
    console.log('   URL:', SUPABASE_URL.substring(0, 30) + '...');
    
    // Utiliser fetch pour exécuter la requête SQL via l'API REST de Supabase
    // Note: Supabase n'a pas d'endpoint direct pour exécuter du SQL arbitraire via REST
    // Il faut utiliser l'API RPC ou exécuter via le dashboard
    
    // Alternative: utiliser psql ou créer une fonction RPC temporaire
    // Pour l'instant, on va afficher le SQL à exécuter
    
    console.log('\n📋 SQL à exécuter:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    
    console.log('\n⚠️  Supabase ne permet pas d\'exécuter du SQL arbitraire via l\'API REST.');
    console.log('📝 Veuillez exécuter ce script SQL dans le Supabase Dashboard:');
    console.log('   1. Allez sur https://supabase.com/dashboard');
    console.log('   2. Sélectionnez votre projet');
    console.log('   3. Allez dans "SQL Editor"');
    console.log('   4. Copiez-collez le SQL ci-dessus');
    console.log('   5. Cliquez sur "Run"');
    
    // Si vous avez psql installé, on peut essayer de l'utiliser
    const { execSync } = require('child_process');
    
    try {
      console.log('\n🔄 Tentative d\'exécution via psql...');
      
      // Extraire les informations de connexion depuis l'URL
      const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (!urlMatch) {
        throw new Error('URL Supabase invalide');
      }
      
      const projectRef = urlMatch[1];
      
      // Construire la commande psql
      // Note: Vous devez avoir psql installé et configuré
      const dbPassword = process.env.SUPABASE_DB_PASSWORD;
      if (!dbPassword) {
        console.log('⚠️  SUPABASE_DB_PASSWORD non défini, impossible d\'utiliser psql');
        console.log('💡 Utilisez le SQL Editor dans le dashboard Supabase');
        return;
      }
      
      const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
      
      console.log('📤 Exécution de la migration...');
      execSync(`psql "${connectionString}" -c "${migrationSQL.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit',
        shell: true
      });
      
      console.log('\n✅ Migration exécutée avec succès!');
      
    } catch (psqlError) {
      console.log('\n⚠️  psql non disponible ou erreur de connexion');
      console.log('💡 Veuillez exécuter le SQL manuellement dans le Supabase Dashboard');
      console.log('   Lien: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

runMigration();


