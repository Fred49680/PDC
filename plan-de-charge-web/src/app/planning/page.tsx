'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Common/Layout'
import GrilleChargeAffectation from '@/components/ChargeAffectation/GrilleChargeAffectation'
import { format, startOfMonth, endOfMonth, startOfWeek, addWeeks } from 'date-fns'
import { Calendar, AlertCircle, Target, Settings, Keyboard, Zap, Search, Clock, XCircle } from 'lucide-react'
import type { Precision } from '@/types/charge'
import { useAffaires } from '@/hooks/useAffaires'
import { SITES_LIST } from '@/utils/siteMap'
import Link from 'next/link'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function PlanningPage() {
  const { affaires, loading: loadingAffaires } = useAffaires()
  
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les sites uniques depuis les affaires
  const sitesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.site).filter(Boolean))
  ).sort()

  // Ajuster automatiquement la date de fin selon la précision
  useEffect(() => {
    if (precision === 'SEMAINE') {
      const weekStart = startOfWeek(dateDebut, { weekStartsOn: 1 })
      const weekEnd = addWeeks(weekStart, 4)
      setDateDebut(weekStart)
      setDateFin(weekEnd)
    } else if (precision === 'MOIS') {
      setDateDebut(startOfMonth(dateDebut))
      setDateFin(endOfMonth(dateDebut))
    }
  }, [precision])

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K : Afficher/masquer les raccourcis
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      }
      
      // Ctrl+/ : Afficher les raccourcis
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(true)
      }
      
      // Échap : Masquer les raccourcis
      if (e.key === 'Escape') {
        setShowShortcuts(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Raccourcis rapides : Charger une affaire récente
  const handleQuickLoad = useCallback((affaireId: string) => {
    const affaire = affairesActives.find((a) => a.affaire_id === affaireId)
    if (affaire) {
      setAffaireId(affaireId)
      setSite(affaire.site)
    }
  }, [affairesActives])

  // Affaires récentes (dernières 5 modifiées)
  const affairesRecentes = affairesActives
    .sort((a, b) => {
      const dateA = a.date_modification ? new Date(a.date_modification).getTime() : 0
      const dateB = b.date_modification ? new Date(b.date_modification).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec raccourcis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Planning Charge & Affectations
              </h1>
              <p className="text-gray-600 mt-1">
                Définissez la charge par compétence et affectez les ressources disponibles
              </p>
            </div>
          </div>
          
          {/* Bouton raccourcis */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:bg-white transition-all duration-200 text-gray-700 font-medium"
            title="Raccourcis clavier (Ctrl+K)"
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden md:inline">Raccourcis</span>
            <kbd className="hidden lg:inline px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+K</kbd>
          </button>
        </div>

        {/* Modal raccourcis */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Keyboard className="w-6 h-6 text-blue-600" />
                  Raccourcis clavier
                </h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Afficher/masquer les raccourcis</span>
                    <kbd className="px-3 py-1 bg-white border border-gray-300 rounded font-mono text-sm">Ctrl+K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Aide rapide</span>
                    <kbd className="px-3 py-1 bg-white border border-gray-300 rounded font-mono text-sm">Ctrl+/</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Fermer les modales</span>
                    <kbd className="px-3 py-1 bg-white border border-gray-300 rounded font-mono text-sm">Échap</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raccourcis rapides - Affaires récentes */}
        {affairesRecentes.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200/50">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Accès rapide</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {affairesRecentes.map((affaire) => (
                <button
                  key={affaire.id}
                  onClick={() => handleQuickLoad(affaire.affaire_id || '')}
                  className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                  <span className="ml-2 text-xs text-gray-500">({affaire.site})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paramètres */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              Paramètres
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Affaire */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Affaire <span className="text-red-500">*</span>
              </label>
              <select
                value={affaireId}
                onChange={(e) => {
                  setAffaireId(e.target.value)
                  if (e.target.value) {
                    const affaire = affairesActives.find(
                      (a) => a.affaire_id === e.target.value
                    )
                    if (affaire) {
                      setSite(affaire.site)
                    }
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Sélectionner une affaire...</option>
                {affairesActives.map((affaire) => (
                  <option key={affaire.id} value={affaire.affaire_id || ''}>
                    {affaire.affaire_id || 'Sans ID'} - {affaire.libelle} ({affaire.site})
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Sélectionner un site...</option>
                {SITES_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Date début */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date début
              </label>
              <input
                type="date"
                value={format(dateDebut, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value)
                  setDateDebut(newDate)
                  if (precision === 'MOIS') {
                    setDateFin(endOfMonth(newDate))
                  } else if (precision === 'SEMAINE') {
                    const weekStart = startOfWeek(newDate, { weekStartsOn: 1 })
                    const weekEnd = addWeeks(weekStart, 4)
                    setDateDebut(weekStart)
                    setDateFin(weekEnd)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              />
            </div>

            {/* Date fin */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date fin
              </label>
              <input
                type="date"
                value={format(dateFin, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = new Date(e.target.value)
                  setDateFin(newDate)
                  if (precision === 'MOIS') {
                    setDateDebut(startOfMonth(newDate))
                  } else if (precision === 'SEMAINE') {
                    const weekEnd = startOfWeek(newDate, { weekStartsOn: 1 })
                    const weekStart = addWeeks(weekEnd, -4)
                    setDateDebut(weekStart)
                    setDateFin(weekEnd)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              />
            </div>

            {/* Précision */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Précision
              </label>
              <select
                value={precision}
                onChange={(e) => {
                  const newPrecision = e.target.value as Precision
                  setPrecision(newPrecision)
                  
                  if (newPrecision === 'MOIS') {
                    setDateDebut(startOfMonth(dateDebut))
                    setDateFin(endOfMonth(dateDebut))
                  } else if (newPrecision === 'SEMAINE') {
                    const weekStart = startOfWeek(dateDebut, { weekStartsOn: 1 })
                    const weekEnd = addWeeks(weekStart, 4)
                    setDateDebut(weekStart)
                    setDateFin(weekEnd)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="JOUR">Jour</option>
                <option value="SEMAINE">Semaine</option>
                <option value="MOIS">Mois</option>
              </select>
            </div>
          </div>
        </div>

                 {/* Grille combinée */}
                 {affaireId && site ? (
                   <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
                     <GrilleChargeAffectation
                       affaireId={affaireId}
                       site={site}
                       dateDebut={dateDebut}
                       dateFin={dateFin}
                       precision={precision}
                       onDateChange={(newDateDebut, newDateFin) => {
                         setDateDebut(newDateDebut)
                         setDateFin(newDateFin)
                       }}
                       onPrecisionChange={(newPrecision) => {
                         setPrecision(newPrecision)
                       }}
                     />
                   </div>
                 ) : (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                Veuillez sélectionner une affaire et un site pour afficher la grille de charge et d'affectations.
              </p>
            </div>
          </div>
        )}

        {/* Liens rapides vers autres pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/affaires"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Gérer les affaires</p>
              <p className="text-sm text-gray-500">Créer et modifier les affaires</p>
            </div>
          </Link>

          <Link
            href="/ressources"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-green-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Gérer les ressources</p>
              <p className="text-sm text-gray-500">Voir et modifier les ressources</p>
            </div>
          </Link>

          <Link
            href="/absences"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-purple-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">Gérer les absences</p>
              <p className="text-sm text-gray-500">Déclarer absences et formations</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
