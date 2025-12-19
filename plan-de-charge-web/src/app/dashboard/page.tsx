'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Loading } from '@/components/Common/Loading'
import { Card, CardHeader } from '@/components/UI/Card'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Users, Calendar, AlertCircle, TrendingUp, Activity } from 'lucide-react'

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

        if (typeof window === 'undefined') {
          return
        }

        const supabase = createClient()

        const { count: countAffaires } = await supabase
          .from('affaires')
          .select('*', { count: 'exact', head: true })

        const { count: countRessources } = await supabase
          .from('ressources')
          .select('*', { count: 'exact', head: true })
          .eq('actif', true)

        const { count: countAffectations } = await supabase
          .from('affectations')
          .select('*', { count: 'exact', head: true })

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
        <Card>
          <div className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <p className="text-red-800 font-semibold">Erreur: {error}</p>
            </div>
          </div>
        </Card>
      </Layout>
    )
  }

  const statCards = [
    {
      label: 'Affaires',
      value: stats.totalAffaires,
      icon: BarChart3,
      gradient: 'from-blue-500 to-indigo-600',
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50'
    },
    {
      label: 'Ressources actives',
      value: stats.totalRessources,
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      color: 'green',
      bgGradient: 'from-green-50 to-emerald-50'
    },
    {
      label: 'Affectations',
      value: stats.totalAffectations,
      icon: Calendar,
      gradient: 'from-purple-500 to-indigo-600',
      color: 'purple',
      bgGradient: 'from-purple-50 to-indigo-50'
    },
    {
      label: 'Absences',
      value: stats.totalAbsences,
      icon: AlertCircle,
      gradient: 'from-orange-500 to-amber-600',
      color: 'orange',
      bgGradient: 'from-orange-50 to-amber-50'
    },
  ]

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête moderne */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl">
            <BarChart3 className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">Vue d'ensemble et statistiques en temps réel</p>
          </div>
        </div>

        {/* Statistiques - Cartes modernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} hover>
                <div className={`p-6 rounded-xl bg-gradient-to-br ${stat.bgGradient} border-2 border-${stat.color}-200`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                        {stat.label}
                      </p>
                      <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  <div className={`h-2 bg-gradient-to-r ${stat.gradient} rounded-full shadow-md`}></div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Section graphiques */}
        <Card>
          <CardHeader gradient="orange" icon={<TrendingUp className="w-6 h-6 text-orange-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Graphiques et analyses</h2>
          </CardHeader>
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-semibold mb-2">Les graphiques seront ajoutés prochainement</p>
            <p className="text-gray-400 text-sm">Visualisations de charge, répartition par site, tendances...</p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
