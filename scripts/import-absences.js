/**
 * Script pour importer les absences depuis un fichier CSV vers Supabase
 * Usage: node scripts/import-absences.js <chemin-vers-fichier.csv>
 */

const fs = require('fs');
const path = require('path');

// Configuration Supabase - à adapter selon votre configuration
// Pour l'instant, on utilisera les fonctions MCP Supabase directement

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Format attendu: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Les mois commencent à 0 en JS
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  
  return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

function parseDateTime(dateTimeStr) {
  if (!dateTimeStr || dateTimeStr.trim() === '') return null;
  
  // Format attendu: DD/MM/YYYY HH:MM
  const parts = dateTimeStr.trim().split(' ');
  if (parts.length < 1) return null;
  
  const dateStr = parts[0];
  const timeStr = parts[1] || '00:00';
  
  const date = parseDate(dateStr);
  if (!date) return null;
  
  const timeParts = timeStr.split(':');
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  
  return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

async function getRessourceIdByName(nom, site, supabaseClient) {
  if (!nom || nom.trim() === '') return null;
  
  const { data, error } = await supabaseClient
    .from('ressources')
    .select('id')
    .eq('nom', nom.trim())
    .eq('site', site.trim().toUpperCase())
    .limit(1)
    .single();
  
  if (error || !data) {
    console.warn(`⚠️  Ressource non trouvée: ${nom} (${site})`);
    return null;
  }
  
  return data.id;
}

async function getUserIdByEmail(email, supabaseClient) {
  if (!email || email.trim() === '') return null;
  
  // Note: Les utilisateurs sont dans auth.users, mais on peut utiliser une approche différente
  // Pour l'instant, on retourne null car on ne peut pas accéder directement à auth.users depuis l'API publique
  // On peut créer une fonction RPC ou simplement laisser null
  return null;
}

async function importAbsences(csvFilePath) {
  console.log('📖 Lecture du fichier CSV...');
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    console.error('❌ Le fichier CSV est vide ou n\'a pas d\'en-tête');
    return;
  }
  
  // En-tête (ligne 1)
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  console.log('📋 Colonnes détectées:', headers);
  
  // Trouver les indices des colonnes (gérer les problèmes d'encodage)
  const colIndex = {
    ressource: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('ressource');
    }),
    site: headers.findIndex(h => h.toLowerCase() === 'site'),
    dateDebut: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('dated') && lower.includes('but') || lower.includes('datedebut');
    }),
    dateFin: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('date') && lower.includes('fin');
    }),
    type: headers.findIndex(h => h.toLowerCase() === 'type'),
    commentaire: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('commentaire');
    }),
    competence: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'comp' || lower.includes('competence');
    }),
    validationSaisie: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('validation');
    }),
    saisiPar: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('saisipar') || lower.includes('saisi par');
    }),
    dateSaisie: headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('datesaisie') || lower.includes('date saisie');
    })
  };
  
  console.log('🔍 Indices des colonnes:', colIndex);
  
  // Note: Ce script sera complété par les appels MCP Supabase
  // Pour l'instant, on prépare juste les données
  
  const absencesData = [];
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(';')) continue; // Ignorer les lignes vides ou commentaires
    
    const fields = parseCSVLine(line);
    
    const ressource = colIndex.ressource >= 0 ? fields[colIndex.ressource] : '';
    const site = colIndex.site >= 0 ? fields[colIndex.site] : '';
    const dateDebutStr = colIndex.dateDebut >= 0 ? fields[colIndex.dateDebut] : '';
    const dateFinStr = colIndex.dateFin >= 0 ? fields[colIndex.dateFin] : '';
    const type = colIndex.type >= 0 ? fields[colIndex.type] : '';
    const commentaire = colIndex.commentaire >= 0 ? fields[colIndex.commentaire] : '';
    const competence = colIndex.competence >= 0 ? fields[colIndex.competence] : '';
    const validationSaisie = colIndex.validationSaisie >= 0 ? fields[colIndex.validationSaisie] : '';
    const saisiPar = colIndex.saisiPar >= 0 ? fields[colIndex.saisiPar] : '';
    const dateSaisieStr = colIndex.dateSaisie >= 0 ? fields[colIndex.dateSaisie] : '';
    
    if (!ressource || !site || !dateDebutStr || !dateFinStr || !type) {
      skipped++;
      continue;
    }
    
    const dateDebut = parseDate(dateDebutStr);
    const dateFin = parseDate(dateFinStr);
    const dateSaisie = parseDateTime(dateSaisieStr);
    
    if (!dateDebut || !dateFin) {
      console.warn(`⚠️  Dates invalides pour ${ressource}: ${dateDebutStr} - ${dateFinStr}`);
      skipped++;
      continue;
    }
    
    absencesData.push({
      ressource: ressource.trim(),
      site: site.trim().toUpperCase(),
      date_debut: dateDebut,
      date_fin: dateFin,
      type: type.trim(),
      commentaire: commentaire.trim() || null,
      competence: competence.trim() || null,
      validation_saisie: validationSaisie.trim() && validationSaisie.trim().toUpperCase() === 'OUI' ? 'Oui' : 'Non',
      saisi_par_email: saisiPar.trim() || null,
      date_saisie: dateSaisie
    });
  }
  
  console.log(`\n✅ ${absencesData.length} absences préparées (${skipped} lignes ignorées)\n`);
  
  return absencesData;
}

// Export pour utilisation dans d'autres scripts
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(__dirname, '../../Absence.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Fichier non trouvé: ${csvPath}`);
    process.exit(1);
  }
  
  importAbsences(csvPath)
    .then(data => {
      console.log('📊 Données préparées:');
      console.log(JSON.stringify(data.slice(0, 3), null, 2));
      console.log(`\n... et ${data.length - 3} autres lignes`);
    })
    .catch(err => {
      console.error('❌ Erreur:', err);
      process.exit(1);
    });
}

module.exports = { importAbsences, parseDate, parseDateTime };

