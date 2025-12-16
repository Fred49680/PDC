'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { CheckCircle2, XCircle, Loader2, BarChart3, Users, Calendar, AlertCircle } from 'lucide-react'

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
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Plan de Charge - Application Web</h1>

        {/* Statut de connexion */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h2 className="text-xl font-semibold mb-4">Statut de la connexion</h2>
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            supabaseStatus === 'connected' ? 'bg-green-50 border border-green-200' :
            supabaseStatus === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {supabaseStatus === 'connected' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
            {supabaseStatus === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
            {supabaseStatus === 'checking' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
            <div>
              <p className={`font-semibold ${
                supabaseStatus === 'connected' ? 'text-green-800' :
                supabaseStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {supabaseStatus === 'connected' && '✅ Connexion Supabase OK'}
                {supabaseStatus === 'error' && '❌ Erreur de connexion'}
                {supabaseStatus === 'checking' && '🔄 Vérification en cours...'}
              </p>
              {supabaseUrl && (
                <p className="text-sm text-gray-600 mt-1">
                  URL: {supabaseUrl.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/charge"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border"
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold">Charge</h3>
            </div>
            <p className="text-sm text-gray-600">
              Gérer les besoins en ressources
            </p>
          </Link>

          <Link
            href="/affectations"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Affectations</h3>
            </div>
            <p className="text-sm text-gray-600">
              Affecter les ressources aux affaires
            </p>
          </Link>

          <Link
            href="/absences"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold">Absences</h3>
            </div>
            <p className="text-sm text-gray-600">
              Gérer les absences et formations
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border"
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold">Dashboard</h3>
            </div>
            <p className="text-sm text-gray-600">
              Vue d'ensemble et statistiques
            </p>
          </Link>
        </div>

        {/* Lien test */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <Link
            href="/test-supabase"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            🧪 Tester la connexion Supabase
          </Link>
        </div>
      </div>
    </Layout>
  )
}
