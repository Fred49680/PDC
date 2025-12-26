/**
 * Script de test pour calculer la distance des transferts de BAUDRY Frédéric
 * Usage: npx tsx scripts/test-distance-baudry.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://douyibpydhqtejhqinjp.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testDistanceForBaudry() {
  console.log('🔍 Recherche des transferts de BAUDRY Frédéric sans distance...\n')

  // Récupérer les transferts de BAUDRY Frédéric sans distance
  const { data: transferts, error } = await supabase
    .from('transferts')
    .select(`
      id,
      site_origine,
      site_destination,
      distance_km,
      duration_minutes,
      ressources!inner(nom, adresse_domicile),
      sites:site_destination(adresse)
    `)
    .eq('ressources.nom', 'BAUDRY Frédéric')
    .or('distance_km.is.null,duration_minutes.is.null')

  if (error) {
    console.error('❌ Erreur lors de la récupération des transferts:', error)
    return
  }

  if (!transferts || transferts.length === 0) {
    console.log('✅ Tous les transferts de BAUDRY Frédéric ont déjà une distance calculée!')
    return
  }

  console.log(`📋 ${transferts.length} transfert(s) trouvé(s) sans distance\n`)

  // Alternative: requête directe SQL
  const { data: transfertsData, error: queryError } = await supabase.rpc('get_transferts_sans_distance', {
    ressource_nom: 'BAUDRY Frédéric'
  })

  // Si la fonction RPC n'existe pas, utiliser une requête directe
  const { data: directQuery, error: directError } = await supabase
    .from('transferts')
    .select(`
      id,
      site_origine,
      site_destination,
      ressources!inner(nom, adresse_domicile)
    `)
    .eq('ressources.nom', 'BAUDRY Frédéric')
    .or('distance_km.is.null,duration_minutes.is.null')

  if (directError) {
    console.error('❌ Erreur:', directError)
    return
  }

  // Récupérer les adresses des sites
  const { data: sites } = await supabase
    .from('sites')
    .select('site, adresse')

  const sitesMap = new Map(sites?.map(s => [s.site.toUpperCase(), s.adresse]) || [])

  console.log('🚀 Calcul de la distance pour chaque transfert...\n')

  for (const transfert of directQuery || []) {
    const ressource = (transfert as any).ressources
    const adresseOrigine = ressource?.adresse_domicile
    const adresseDestination = sitesMap.get(transfert.site_destination.toUpperCase())

    if (!adresseOrigine || !adresseDestination) {
      console.log(`⚠️  Transfert ${transfert.id}: Adresses manquantes`)
      console.log(`   Origine: ${adresseOrigine || 'MANQUANTE'}`)
      console.log(`   Destination: ${adresseDestination || 'MANQUANTE'}\n`)
      continue
    }

    console.log(`📌 Transfert ${transfert.id}:`)
    console.log(`   ${transfert.site_origine} → ${transfert.site_destination}`)
    console.log(`   Origine: ${adresseOrigine}`)
    console.log(`   Destination: ${adresseDestination}`)

    // Appeler l'Edge Function
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-transfert-distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          transfert_id: transfert.id,
          adresse_origine: adresseOrigine,
          adresse_destination: adresseDestination,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log(`   ✅ Distance calculée: ${result.distance_km} km, ${result.duration_minutes} min\n`)
      } else {
        console.log(`   ❌ Erreur: ${result.error}\n`)
      }
    } catch (err) {
      console.error(`   ❌ Erreur lors de l'appel:`, err, '\n')
    }
  }

  console.log('✨ Test terminé!')
}

// Exécuter le script
testDistanceForBaudry().catch(console.error)

