/**
 * Script de test pour l'Edge Function calculate-transfert-distance
 * Usage: node scripts/test-edge-function-distance.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://douyibpydhqtejhqinjp.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXlpYnB5ZGhxdGVqaHFpbmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDUxODMsImV4cCI6MjA4MTQ4MTE4M30.Iv1TlJOI3BCmJFh9rI4D4ExBw_9W3lj7JTk70_zXhe0'

async function testEdgeFunction() {
  const transfertId = '44197fc6-5646-427c-bd03-8958aeced0cf'
  const adresseOrigine = '22 rue nationale, 49680 Vivy, France'
  const adresseDestination = 'Centrale Nucléaire de Belleville, 18240 Belleville-sur-Loire, France'

  console.log('🧪 Test de l\'Edge Function calculate-transfert-distance')
  console.log('Transfert ID:', transfertId)
  console.log('Origine:', adresseOrigine)
  console.log('Destination:', adresseDestination)
  console.log('')

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-transfert-distance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        transfert_id: transfertId,
        adresse_origine: adresseOrigine,
        adresse_destination: adresseDestination,
      }),
    })

    const data = await response.json()
    
    console.log('📊 Réponse:')
    console.log('Status:', response.status)
    console.log('Body:', JSON.stringify(data, null, 2))
    
    if (response.ok && data.success) {
      console.log('✅ SUCCÈS!')
      console.log(`   Distance: ${data.distance_km} km`)
      console.log(`   Durée: ${data.duration_minutes} min`)
    } else {
      console.log('❌ ERREUR:', data.error || 'Erreur inconnue')
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error)
  }
}

testEdgeFunction()

