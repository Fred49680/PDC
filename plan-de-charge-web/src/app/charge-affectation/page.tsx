'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { GrilleChargeAffectation } from '@/components/ChargeAffectation/GrilleChargeAffectation'
import { format, startOfMonth, endOfMonth, startOfWeek, addWeeks } from 'date-fns'
import { Calendar, AlertCircle, Target, Settings } from 'lucide-react'
import type { Precision } from '@/types/charge'
import { useAffaires } from '@/hooks/useAffaires'
import { SITES_LIST } from '@/utils/siteMap'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function ChargeAffectationPage() {
  const { affaires, loading: loadingAffaires } = useAffaires()
  
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les sites uniques depuis les affaires
  const sitesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.site).filter(Boolean))
  ).sort()

  // Filtrer les affaires par site sélectionné
  const affairesParSite = affaireId
    ? affairesActives.filter((a) => a.site === site)
    : affairesActives

  // Ajuster automatiquement la date de fin selon la précision
  useEffect(() => {
    if (precision === 'SEMAINE') {
      // Ajuster pour commencer et finir sur un lundi
      const weekStart = startOfWeek(dateDebut, { weekStartsOn: 1 })
      const weekEnd = addWeeks(weekStart, 4) // 4 semaines par défaut
      setDateDebut(weekStart)
      setDateFin(weekEnd)
    } else if (precision === 'MOIS') {
      setDateDebut(startOfMonth(dateDebut))
      setDateFin(endOfMonth(dateDebut))
    }
  }, [precision])

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Charge & Affectations
            </h1>
            <p className="text-gray-600 mt-1">
              Définissez la charge par compétence et affectez les ressources disponibles
            </p>
          </div>
        </div>

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
                  // Mettre à jour le site automatiquement si une affaire est sélectionnée
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
                  // Ajuster date fin selon précision
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
                  // Ajuster date début selon précision
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
                  
                  // Ajuster les dates selon la précision
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
      </div>
    </Layout>
  )
}
