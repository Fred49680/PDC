'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { GrilleCharge } from '@/components/Charge/GrilleCharge'
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart3, AlertCircle } from 'lucide-react'
import type { Precision } from '@/types/charge'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function ChargePage() {
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Gestion de la Charge
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Définissez les besoins en ressources par compétence</p>
          </div>
        </div>

        {/* Paramètres - Design moderne */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Paramètres de saisie</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Affaire ID
              </label>
              <input
                type="text"
                value={affaireId}
                onChange={(e) => setAffaireId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                placeholder="Ex: AFF001"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                placeholder="Ex: Blayais"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Date début
              </label>
              <input
                type="date"
                value={format(dateDebut, 'yyyy-MM-dd')}
                onChange={(e) => setDateDebut(new Date(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Date fin
              </label>
              <input
                type="date"
                value={format(dateFin, 'yyyy-MM-dd')}
                onChange={(e) => setDateFin(new Date(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Précision
              </label>
              <select
                value={precision}
                onChange={(e) => setPrecision(e.target.value as Precision)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="JOUR">Jour</option>
                <option value="SEMAINE">Semaine</option>
                <option value="MOIS">Mois</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grille de charge */}
        {affaireId && site && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
            <GrilleCharge
              affaireId={affaireId}
              site={site}
              dateDebut={dateDebut}
              dateFin={dateFin}
              precision={precision}
            />
          </div>
        )}

        {(!affaireId || !site) && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                Veuillez renseigner l'Affaire ID et le Site pour afficher la grille de charge.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
