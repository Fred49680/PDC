/**
 * Client Supabase pour le navigateur
 * Utilise @supabase/ssr pour la gestion des sessions
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  // Nettoyer et corriger l'URL
  let trimmedUrl = supabaseUrl.trim()
  
  // Si l'URL ne commence pas par http:// ou https://, essayer de la corriger
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    // Si elle commence par "ttps://", c'est probablement une troncature, ajouter "h"
    if (trimmedUrl.startsWith('ttps://')) {
      trimmedUrl = 'h' + trimmedUrl
      console.warn('[createClient] URL corrigée (ajout du préfixe "h"):', trimmedUrl.substring(0, 30) + '...')
    } else {
      // Sinon, ajouter https:// par défaut
      trimmedUrl = 'https://' + trimmedUrl
      console.warn('[createClient] URL corrigée (ajout du préfixe "https://"):', trimmedUrl.substring(0, 30) + '...')
    }
  }
  
  // Validation finale
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    console.error('[createClient] URL invalide après correction:', trimmedUrl.substring(0, 50))
    throw new Error(
      `Invalid supabaseUrl: Must start with http:// or https://. Got: ${trimmedUrl.substring(0, 50)}...`
    )
  }

  // Logs de débogage (désactivés pour éviter spam en cas de re-renders)
  // if (typeof window !== 'undefined') {
  //   console.log('[createClient] Création du client Supabase avec URL:', trimmedUrl.substring(0, 30) + '...', 'Key length:', supabaseAnonKey.trim().length)
  // }

  return createBrowserClient(trimmedUrl, supabaseAnonKey.trim())
}
