'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Loading } from '@/components/Common/Loading'
import { useAlertes } from '@/hooks/useAlertes'
import { AlertCircle, CheckCircle2, X, Mail, Calendar, User, Building2, Target } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function AlertesPage() {
  const { alertes, loading, error, updateAlerte, deleteAlerte, refresh } = useAlertes()
  const [filtrePriseEnCompte, setFiltrePriseEnCompte] = useState<string>('')
  const [filtreCourrierStatut, setFiltreCourrierStatut] = useState<string>('')

  // Filtrer les alertes
  const alertesFiltrees = alertes.filter((alerte) => {
    if (filtrePriseEnCompte && alerte.prise_en_compte !== filtrePriseEnCompte) {
      return false
    }
    if (filtreCourrierStatut && alerte.courrier_statut !== filtreCourrierStatut) {
      return false
    }
    return true
  })

  const handlePriseEnCompteChange = async (alerteId: string, nouvelleValeur: string) => {
    try {
      await updateAlerte(alerteId, { prise_en_compte: nouvelleValeur })
    } catch (err) {
      console.error('[AlertesPage] Erreur mise à jour prise en compte:', err)
    }
  }

  const handleCourrierStatutChange = async (alerteId: string, nouvelleValeur: string) => {
    try {
      await updateAlerte(alerteId, { courrier_statut: nouvelleValeur })
    } catch (err) {
      console.error('[AlertesPage] Erreur mise à jour courrier statut:', err)
    }
  }

  const handleDeleteAlerte = async (alerteId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      try {
        await deleteAlerte(alerteId)
      } catch (err) {
        console.error('[AlertesPage] Erreur suppression alerte:', err)
      }
    }
  }

  const getTypeAlerteLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'AFFECTATION_BLOQUEE_ABSENCE': 'Affectation bloquée (absence)',
      'AFFECTATION_RETIREE_AUTO': 'Affectation retirée automatiquement',
      'ARRET_MALADIE_30J': 'Arrêt maladie > 30 jours',
      'ABSENCE_AJOUTEE': 'Absence ajoutée',
      'CONFLIT_DETECTE': 'Conflit détecté',
      'RENOUVELLEMENT_A_VENIR': 'Renouvellement à venir',
    }
    return labels[type] || type
  }

  const getTypeAlerteColor = (type: string): string => {
    if (type.includes('BLOQUEE') || type.includes('CONFLIT')) {
      return 'bg-red-100 text-red-800 border-red-300'
    }
    if (type.includes('RETIREE')) {
      return 'bg-orange-100 text-orange-800 border-orange-300'
    }
    if (type.includes('MALADIE')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800 font-medium">
              Erreur lors du chargement des alertes : {error.message}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Alertes</h1>
              <p className="text-amber-100">
                {alertesFiltrees.length} alerte(s) {filtrePriseEnCompte || filtreCourrierStatut ? 'filtrée(s)' : 'au total'}
              </p>
            </div>
            <AlertCircle className="w-16 h-16 text-white/80" />
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prise en compte
              </label>
              <select
                value={filtrePriseEnCompte}
                onChange={(e) => setFiltrePriseEnCompte(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Courrier statut
              </label>
              <select
                value={filtreCourrierStatut}
                onChange={(e) => setFiltreCourrierStatut(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="A envoyer">A envoyer</option>
                <option value="Envoyé">Envoyé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des alertes */}
        <div className="space-y-4">
          {alertesFiltrees.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucune alerte à afficher</p>
            </div>
          ) : (
            alertesFiltrees.map((alerte) => (
              <div
                key={alerte.id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`px-3 py-1 rounded-lg border ${getTypeAlerteColor(alerte.type_alerte)}`}>
                      <span className="text-xs font-semibold">
                        {getTypeAlerteLabel(alerte.type_alerte)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium mb-2">{alerte.action}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {alerte.site && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{alerte.site}</span>
                          </div>
                        )}
                        {alerte.competence && (
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <span>{alerte.competence}</span>
                          </div>
                        )}
                        {alerte.date_debut && alerte.date_fin && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(alerte.date_debut), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(alerte.date_fin), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                        )}
                        {alerte.date_action && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(alerte.date_action), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlerte(alerte.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer l'alerte"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Prise en compte :</label>
                    <select
                      value={alerte.prise_en_compte || 'Non'}
                      onChange={(e) => handlePriseEnCompteChange(alerte.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Non">Non</option>
                      <option value="Oui">Oui</option>
                    </select>
                  </div>
                  {alerte.courrier_statut && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">Courrier :</label>
                      <select
                        value={alerte.courrier_statut}
                        onChange={(e) => handleCourrierStatutChange(alerte.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A envoyer">A envoyer</option>
                        <option value="Envoyé">Envoyé</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
