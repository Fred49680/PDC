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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affaires</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAffaires}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ressources actives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRessources}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affectations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAffectations}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absences</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAbsences}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Graphiques et tableaux à venir */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Graphiques</h2>
          <p className="text-gray-500">Les graphiques seront ajoutés prochainement.</p>
        </div>
      </div>
    </Layout>
  )
}
