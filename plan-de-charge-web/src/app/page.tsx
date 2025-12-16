'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { CheckCircle2, XCircle, Loader2, BarChart3, Users, Calendar, AlertCircle, Building2, MapPin } from 'lucide-react'

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
      <div className="space-y-8">
        {/* En-tête avec gradient */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Plan de Charge
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Application web moderne pour la gestion des ressources et des affectations
          </p>
        </div>

        {/* Statut de connexion - Design amélioré */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Statut de la connexion</h2>
          <div className={`p-5 rounded-xl flex items-center gap-4 transition-all duration-300 ${
            supabaseStatus === 'connected' 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm' 
              : supabaseStatus === 'error' 
              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 shadow-sm'
              : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-sm'
          }`}>
            {supabaseStatus === 'connected' && (
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
            )}
            {supabaseStatus === 'error' && (
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                <XCircle className="w-7 h-7 text-white" />
              </div>
            )}
            {supabaseStatus === 'checking' && (
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
            )}
            <div className="flex-1">
              <p className={`text-lg font-semibold ${
                supabaseStatus === 'connected' ? 'text-green-800' :
                supabaseStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {supabaseStatus === 'connected' && '✅ Connexion Supabase établie'}
                {supabaseStatus === 'error' && '❌ Erreur de connexion'}
                {supabaseStatus === 'checking' && '🔄 Vérification en cours...'}
              </p>
              {supabaseUrl && (
                <p className="text-sm text-gray-600 mt-1 font-mono">
                  {supabaseUrl.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation rapide - Cartes modernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/affaires"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-indigo-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                Affaires
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Créez et gérez les affaires et leurs sites
            </p>
            <div className="mt-4 text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/ressources"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-green-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                Ressources
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Créez et gérez les ressources et leurs compétences
            </p>
            <div className="mt-4 text-green-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/charge"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-blue-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Charge
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Gérer les besoins en ressources par compétence et période
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/affectations"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-green-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                Affectations
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Affecter les ressources aux affaires selon les compétences
            </p>
            <div className="mt-4 text-green-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/absences"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-purple-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                Absences
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Gérer les absences, formations et congés des ressources
            </p>
            <div className="mt-4 text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-orange-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                Dashboard
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Vue d'ensemble et statistiques en temps réel
            </p>
            <div className="mt-4 text-orange-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>

          <Link
            href="/admin/sites"
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-cyan-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">
                Sites
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Administrer les sites et leurs régions
            </p>
            <div className="mt-4 text-cyan-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Accéder <span>→</span>
            </div>
          </Link>
        </div>

        {/* Lien test - Design amélioré */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <Link
            href="/test-supabase"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
          >
            <span className="text-lg">🧪</span>
            <span>Tester la connexion Supabase</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
