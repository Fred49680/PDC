'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Loading } from '@/components/Common/Loading'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Users, Calendar, AlertCircle } from 'lucide-react'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAffaires: 0,
    totalRessources: 0,
    totalAffectations: 0,
    totalAbsences: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Créer le client seulement côté client
        if (typeof window === 'undefined') {
          return
        }

        const supabase = createClient()

        // Compter les affaires
        const { count: countAffaires } = await supabase
          .from('affaires')
          .select('*', { count: 'exact', head: true })

        // Compter les ressources actives
        const { count: countRessources } = await supabase
          .from('ressources')
          .select('*', { count: 'exact', head: true })
          .eq('actif', true)

        // Compter les affectations
        const { count: countAffectations } = await supabase
          .from('affectations')
          .select('*', { count: 'exact', head: true })

        // Compter les absences
        const { count: countAbsences } = await supabase
          .from('absences')
          .select('*', { count: 'exact', head: true })

        setStats({
          totalAffaires: countAffaires || 0,
          totalRessources: countRessources || 0,
          totalAffectations: countAffectations || 0,
          totalAbsences: countAbsences || 0,
        })
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des statistiques')
        console.error('[Dashboard] Erreur:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <Layout>
        <Loading message="Chargement du dashboard..." />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erreur: {error}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Vue d'ensemble et statistiques en temps réel</p>
          </div>
        </div>

        {/* Statistiques - Cartes modernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Affaires</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAffaires}</p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Ressources actives</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRessources}</p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Affectations</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAffectations}</p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"></div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Absences</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAbsences}</p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full"></div>
          </div>
        </div>

        {/* Graphiques et tableaux à venir */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-amber-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Graphiques et analyses</h2>
          </div>
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Les graphiques seront ajoutés prochainement</p>
            <p className="text-gray-400 text-sm mt-2">Visualisations de charge, répartition par site, tendances...</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
