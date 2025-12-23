/**
 * Script pour exécuter la migration batch_insert_periodes_charge directement sur Supabase
 * Utilise l'API Supabase Management pour exécuter le SQL
 */

const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement
const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  
  if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
  if (keyMatch) SUPABASE_SERVICE_KEY = keyMatch[1].trim();
}

// Fallback sur VOS_CLES_SUPABASE.txt
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
  process.exit(1);
}

async function executeSQL(sql) {
  // Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST standard
  // On doit utiliser le SQL Editor ou créer une fonction RPC
  
  // Méthode alternative: utiliser l'API Management si disponible
  // Mais cela nécessite des permissions spéciales
  
  // Pour l'instant, on va utiliser une approche différente:
  // Exécuter chaque commande SQL individuellement via des requêtes HTTP
  
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  console.log(`📤 Exécution de ${commands.length} commande(s) SQL...`);
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.length === 0) continue;
    
    try {
      // Essayer d'exécuter via l'API REST
      // Note: Cela ne fonctionnera probablement pas car Supabase ne permet pas
      // d'exécuter du SQL arbitraire via REST
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY || ''}`
        },
        body: JSON.stringify({ sql: cmd })
      });
      
      if (!response.ok) {
        // Si exec_sql n'existe pas, on ne peut pas exécuter directement
        throw new Error('Fonction exec_sql non disponible');
      }
      
      const result = await response.json();
      console.log(`✅ Commande ${i + 1}/${commands.length} exécutée`);
      
    } catch (error) {
      // Si l'API directe ne fonctionne pas, on affiche les instructions
      console.log(`⚠️  Impossible d'exécuter automatiquement la commande ${i + 1}`);
      console.log(`   Raison: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function runMigration() {
  try {
    console.log('📦 Lecture de la migration...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127000000_fix_batch_insert_periodes_charge_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔗 Connexion à Supabase...');
    console.log('   URL:', SUPABASE_URL.substring(0, 40) + '...');
    
    // Essayer d'exécuter directement
    const success = await executeSQL(migrationSQL);
    
    if (!success) {
      console.log('\n📝 Méthode alternative: Exécution manuelle requise');
      console.log('═'.repeat(80));
      console.log(migrationSQL);
      console.log('═'.repeat(80));
      
      const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch) {
        const projectRef = urlMatch[1];
        console.log(`\n🔗 Lien direct: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      }
      
      console.log('\n📝 Instructions:');
      console.log('   1. Ouvrez le lien ci-dessus');
      console.log('   2. Copiez-collez le SQL ci-dessus');
      console.log('   3. Cliquez sur "Run"');
      
      process.exit(1);
    }
    
    console.log('\n✅ Migration exécutée avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\n💡 Veuillez exécuter le SQL manuellement dans le Supabase Dashboard');
    process.exit(1);
  }
}

runMigration();


