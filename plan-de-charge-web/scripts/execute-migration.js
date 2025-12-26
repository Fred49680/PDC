/**
 * Script pour exécuter la migration batch_insert_periodes_charge sur Supabase
 * Utilise le client Supabase avec service_role key
 */

const { createClient } = require('@supabase/supabase-js');
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

if (!SUPABASE_SERVICE_KEY) {
  console.error('⚠️  SUPABASE_SERVICE_ROLE_KEY non trouvé');
  console.error('💡 Pour exécuter automatiquement, ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  console.error('   Vous pouvez la trouver dans: Supabase Dashboard → Settings → API → service_role key');
  console.error('\n📝 Sinon, exécutez le SQL manuellement dans le SQL Editor');
  process.exit(1);
}

async function executeMigration() {
  try {
    console.log('📦 Lecture de la migration...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127000000_fix_batch_insert_periodes_charge_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔗 Connexion à Supabase...');
    console.log('   URL:', SUPABASE_URL.substring(0, 40) + '...');
    
    // Créer le client Supabase avec service_role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Diviser le SQL en commandes individuelles
    // On doit gérer les blocs $function$ correctement
    const commands = [];
    let currentCommand = '';
    let inFunctionBlock = false;
    
    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Ignorer les commentaires seuls
      if (trimmed.startsWith('--') && !trimmed.includes('$')) {
        continue;
      }
      
      currentCommand += line + '\n';
      
      // Détecter le début d'un bloc de fonction
      if (trimmed.includes('$function$')) {
        inFunctionBlock = !inFunctionBlock;
      }
      
      // Si on n'est pas dans un bloc de fonction et qu'on a un point-virgule, c'est une commande complète
      if (!inFunctionBlock && trimmed.endsWith(';')) {
        const cmd = currentCommand.trim();
        if (cmd.length > 0 && !cmd.startsWith('--')) {
          commands.push(cmd);
        }
        currentCommand = '';
      }
    }
    
    // Ajouter la dernière commande si elle existe
    if (currentCommand.trim().length > 0) {
      commands.push(currentCommand.trim());
    }
    
    console.log(`📤 Exécution de ${commands.length} commande(s) SQL...\n`);
    
    // Exécuter chaque commande via une requête RPC
    // Note: On doit créer une fonction RPC temporaire pour exécuter du SQL arbitraire
    // Ou utiliser l'API Management si disponible
    
    // Méthode: Créer une fonction RPC temporaire qui exécute le SQL
    const execSQLFunction = `
      CREATE OR REPLACE FUNCTION exec_sql_temp(sql_text text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$;
    `;
    
    try {
      // Créer la fonction temporaire
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: execSQLFunction
      });
      
      if (createError && !createError.message.includes('does not exist')) {
        // Si exec_sql n'existe pas, on doit créer la fonction via une autre méthode
        console.log('⚠️  Fonction exec_sql non disponible');
        console.log('📝 Exécution manuelle requise\n');
        console.log('═'.repeat(80));
        console.log(migrationSQL);
        console.log('═'.repeat(80));
        
        const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (urlMatch) {
          const projectRef = urlMatch[1];
          console.log(`\n🔗 Lien direct: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        }
        
        process.exit(1);
      }
      
      // Exécuter chaque commande
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        console.log(`📝 Exécution commande ${i + 1}/${commands.length}...`);
        
        try {
          // Utiliser une requête HTTP directe vers l'API REST
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_temp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ sql_text: cmd })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          console.log(`✅ Commande ${i + 1}/${commands.length} exécutée\n`);
          
        } catch (error) {
          console.error(`❌ Erreur commande ${i + 1}:`, error.message);
          console.log('\n📝 Exécution manuelle requise\n');
          console.log('═'.repeat(80));
          console.log(migrationSQL);
          console.log('═'.repeat(80));
          
          const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
          if (urlMatch) {
            const projectRef = urlMatch[1];
            console.log(`\n🔗 Lien direct: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
          }
          
          process.exit(1);
        }
      }
      
      console.log('✅ Migration exécutée avec succès!');
      
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      console.log('\n📝 Exécution manuelle requise\n');
      console.log('═'.repeat(80));
      console.log(migrationSQL);
      console.log('═'.repeat(80));
      
      const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch) {
        const projectRef = urlMatch[1];
        console.log(`\n🔗 Lien direct: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

executeMigration();


