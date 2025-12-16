'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { GrilleCharge } from '@/components/Charge/GrilleCharge'
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestion de la Charge</h1>

        {/* Paramètres */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affaire ID
              </label>
              <input
                type="text"
                value={affaireId}
                onChange={(e) => setAffaireId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: AFF001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Blayais"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={format(dateDebut, 'yyyy-MM-dd')}
                onChange={(e) => setDateDebut(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={format(dateFin, 'yyyy-MM-dd')}
                onChange={(e) => setDateFin(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Précision
              </label>
              <select
                value={precision}
                onChange={(e) => setPrecision(e.target.value as Precision)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-white p-6 rounded-lg shadow-sm border">
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Veuillez renseigner l'Affaire ID et le Site pour afficher la grille de charge.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
