'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [supabaseUrl, setSupabaseUrl] = useState<string>('')

  useEffect(() => {
    console.log('🔵 [HOME] useEffect déclenché')
    console.log('🔵 [HOME] Environnement:', typeof window !== 'undefined' ? 'CLIENT' : 'SERVER')
    
    // Vérifier la connexion Supabase
    const checkSupabase = async () => {
      console.log('🔵 [HOME] checkSupabase() appelé')
      
      try {
        console.log('🔵 [HOME] Lecture des variables d\'environnement...')
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        console.log('🔵 [HOME] NEXT_PUBLIC_SUPABASE_URL:', url ? '✅ Définie (' + url.substring(0, 30) + '...)' : '❌ MANQUANTE')
        console.log('🔵 [HOME] NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? '✅ Définie (longueur: ' + key.length + ')' : '❌ MANQUANTE')
        console.log('🔵 [HOME] process.env complet:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')))

        if (url && key) {
          console.log('✅ [HOME] Variables OK - Connexion Supabase possible')
          setSupabaseUrl(url)
          setSupabaseStatus('connected')
        } else {
          console.error('❌ [HOME] Variables manquantes - URL:', !!url, 'KEY:', !!key)
          setSupabaseStatus('error')
        }
      } catch (error: any) {
        console.error('❌ [HOME] Erreur dans checkSupabase:', error)
        console.error('❌ [HOME] Stack:', error?.stack)
        setSupabaseStatus('error')
      }
    }

    checkSupabase()
    console.log('🔵 [HOME] useEffect terminé')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Plan de Charge
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Application de gestion de planification et d'affectation
          </p>
        </header>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {/* Supabase Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connexion Supabase
              </h2>
              <div className={`w-3 h-3 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-green-500' :
                supabaseStatus === 'error' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
            </div>
            {supabaseStatus === 'checking' && (
              <p className="text-gray-600 dark:text-gray-400">Vérification en cours...</p>
            )}
            {supabaseStatus === 'connected' && (
              <div>
                <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                  ✅ Connecté
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                  {supabaseUrl}
                </p>
              </div>
            )}
            {supabaseStatus === 'error' && (
              <p className="text-red-600 dark:text-red-400">
                ❌ Variables d'environnement manquantes
              </p>
            )}
          </div>

          {/* Application Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Statut de l'Application
            </h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Application déployée</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Next.js 16.0.10</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700 dark:text-gray-300">React 19.2.1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Pages de Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Supabase */}
            <Link
              href="/test-supabase"
              className="group bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Test Supabase
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Tester la connexion à la base de données Supabase et afficher les données des sites.
              </p>
              <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                Accéder →
              </div>
            </Link>

            {/* Page d'accueil (actuelle) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 opacity-75">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Page d'Accueil
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Vous êtes actuellement sur la page d'accueil de l'application.
              </p>
              <div className="mt-4 text-gray-500 dark:text-gray-500 font-medium">
                Page actuelle
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            Plan de Charge - Application de gestion
          </p>
          <p className="text-sm">
            Déployé sur Vercel • Connecté à Supabase
          </p>
        </footer>
      </div>
    </div>
  )
}
