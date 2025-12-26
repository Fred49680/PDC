/**
 * Script pour exécuter les migrations SQL sur Supabase
 * Usage: node scripts/run-migrations.js [migration1.sql] [migration2.sql] ...
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Charger les variables d'environnement depuis VOS_CLES_SUPABASE.txt ou .env
let supabaseUrl, supabaseKey;

// Essayer de charger depuis VOS_CLES_SUPABASE.txt
const keysFile = path.join(__dirname, '..', 'VOS_CLES_SUPABASE.txt');
if (fs.existsSync(keysFile)) {
  const content = fs.readFileSync(keysFile, 'utf-8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

// Essayer de charger depuis .env.local
if (!supabaseUrl || !supabaseKey) {
  const envFile = path.join(__dirname, '..', 'plan-de-charge-web', '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf-8');
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    
    if (urlMatch) supabaseUrl = urlMatch[1].trim();
    if (keyMatch) supabaseKey = keyMatch[1].trim();
  }
}

// Vérifier que les clés sont disponibles
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Impossible de trouver les clés Supabase');
  console.error('   Vérifiez que VOS_CLES_SUPABASE.txt ou .env.local existe avec les bonnes clés');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Exécute une migration SQL
 */
async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Fichier de migration introuvable: ${migrationFile}`);
    return false;
  }

  console.log(`\n📄 Exécution de la migration: ${migrationFile}`);
  console.log('─'.repeat(60));

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  // Diviser le SQL en instructions séparées (séparées par ';')
  // On va exécuter le SQL complet via rpc ou directement
  try {
    // Utiliser la méthode rpc pour exécuter du SQL brut
    // Note: Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST
    // Il faut utiliser le SQL Editor ou psql
    
    // Alternative: utiliser fetch pour appeler l'API Supabase directement
    // Mais Supabase ne permet pas l'exécution de SQL arbitraire via l'API REST
    
    // La meilleure approche est d'utiliser psql ou le SQL Editor
    console.log('⚠️  Supabase ne permet pas l\'exécution de SQL arbitraire via l\'API REST');
    console.log('   Veuillez exécuter cette migration manuellement dans le SQL Editor de Supabase');
    console.log(`   Fichier: ${migrationPath}`);
    console.log('\n📋 Contenu de la migration:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    
    return false;
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de ${migrationFile}:`, error.message);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  const migrations = process.argv.slice(2);
  
  if (migrations.length === 0) {
    // Exécuter les migrations par défaut
    migrations.push('MIGRATION_FIX_BOOLEAN_FINAL.sql');
    migrations.push('MIGRATION_DISABLE_TRIGGERS_BATCH.sql');
  }

  console.log('🚀 Démarrage de l\'exécution des migrations SQL');
  console.log(`📦 ${migrations.length} migration(s) à exécuter`);

  // Note: Supabase ne permet pas l'exécution de SQL arbitraire via l'API REST
  // Il faut utiliser psql ou le SQL Editor de Supabase
  console.log('\n⚠️  IMPORTANT: Supabase ne permet pas l\'exécution de SQL arbitraire via l\'API REST');
  console.log('   Les migrations doivent être exécutées manuellement dans le SQL Editor de Supabase');
  console.log('   ou via psql avec la connexion directe à la base de données.\n');

  // Afficher les instructions pour chaque migration
  for (const migration of migrations) {
    await runMigration(migration);
  }

  console.log('\n✅ Instructions affichées pour toutes les migrations');
  console.log('\n📝 Pour exécuter les migrations:');
  console.log('   1. Aller sur https://supabase.com/dashboard');
  console.log('   2. Sélectionner votre projet');
  console.log('   3. Aller dans SQL Editor');
  console.log('   4. Copier-coller le contenu de chaque migration');
  console.log('   5. Exécuter chaque migration');
}

main().catch(console.error);

