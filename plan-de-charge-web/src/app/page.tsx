'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Card, CardHeader } from '@/components/UI/Card'
import { 
  CheckCircle2, XCircle, Loader2, BarChart3, Users, Calendar, 
  AlertCircle, Building2, MapPin, Sparkles, Zap, TrendingUp 
} from 'lucide-react'

export default function Home() {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [supabaseUrl, setSupabaseUrl] = useState<string>('')

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (url && key) {
          setSupabaseUrl(url)
          setSupabaseStatus('connected')
        } else {
          setSupabaseStatus('error')
        }
      } catch (error: any) {
        setSupabaseStatus('error')
      }
    }

    checkSupabase()
  }, [])

  const quickActions = [
    { 
      href: '/affaires', 
      label: 'Affaires', 
      icon: Building2, 
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Créez et gérez les affaires et leurs sites',
      color: 'indigo'
    },
    { 
      href: '/ressources', 
      label: 'Ressources', 
      icon: Users, 
      gradient: 'from-green-500 to-emerald-600',
      description: 'Créez et gérez les ressources et leurs compétences',
      color: 'green'
    },
    { 
      href: '/planning2', 
      label: 'Planning', 
      icon: Sparkles, 
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Gérer la charge et affecter les ressources en une seule interface',
      color: 'indigo',
      badge: 'Nouveau'
    },
    { 
      href: '/absences', 
      label: 'Absences', 
      icon: Calendar, 
      gradient: 'from-purple-500 to-indigo-600',
      description: 'Gérer les absences, formations et congés des ressources',
      color: 'purple'
    },
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      gradient: 'from-orange-500 to-amber-600',
      description: 'Vue d\'ensemble et statistiques en temps réel',
      color: 'orange'
    },
    { 
      href: '/admin/sites', 
      label: 'Sites', 
      icon: MapPin, 
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Administrer les sites et leurs régions',
      color: 'blue'
    },
  ]

  return (
    <Layout>
      <div className="space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" />
            <span>Version 2.0 - Interface moderne</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Plan de Charge
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Application web moderne et intuitive pour la gestion des ressources, 
            des affectations et du planning
          </p>
        </div>

        {/* Statut de connexion */}
        <Card>
          <CardHeader gradient="indigo" icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Statut de la connexion</h2>
          </CardHeader>
          <div className={`p-6 rounded-xl flex items-center gap-4 transition-all duration-300 ${
            supabaseStatus === 'connected' 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm' 
              : supabaseStatus === 'error' 
              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 shadow-sm'
              : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-sm'
          }`}>
            {supabaseStatus === 'connected' && (
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            )}
            {supabaseStatus === 'error' && (
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
            {supabaseStatus === 'checking' && (
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            <div className="flex-1">
              <p className={`text-xl font-bold ${
                supabaseStatus === 'connected' ? 'text-green-800' :
                supabaseStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {supabaseStatus === 'connected' && '✅ Connexion Supabase établie'}
                {supabaseStatus === 'error' && '❌ Erreur de connexion'}
                {supabaseStatus === 'checking' && '🔄 Vérification en cours...'}
              </p>
              {supabaseUrl && (
                <p className="text-sm text-gray-600 mt-2 font-mono bg-white/50 px-3 py-1 rounded-lg inline-block">
                  {supabaseUrl.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Navigation rapide - Design moderne */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Accès rapide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 hover:border-indigo-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Badge "Nouveau" */}
                  {action.badge && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold rounded-full shadow-md">
                      {action.badge}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors mb-2">
                        {action.label}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`mt-4 text-${action.color}-600 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1`}>
                    Accéder <span className="text-lg">→</span>
                  </div>
                  
                  {/* Effet de brillance au survol */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Section fonctionnalités */}
        <Card>
          <CardHeader gradient="indigo" icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Fonctionnalités principales</h2>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Gestion des affaires</h3>
              <p className="text-sm text-gray-600">Créez et suivez vos affaires avec leurs budgets et RAF</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Gestion des ressources</h3>
              <p className="text-sm text-gray-600">Organisez vos équipes et leurs compétences</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Planning avancé</h3>
              <p className="text-sm text-gray-600">Visualisez et gérez la charge et les affectations</p>
            </div>
            </div>
        </Card>
      </div>
    </Layout>
  )
}
