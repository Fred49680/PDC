'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Planning2 } from '@/components/Planning2'
import { format, startOfMonth, endOfMonth, startOfWeek, addWeeks } from 'date-fns'
import { Calendar, AlertCircle, Target, Search, Clock, Sparkles } from 'lucide-react'
import type { Precision } from '@/types/charge'
import { useAffaires } from '@/hooks/useAffaires'
import Link from 'next/link'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function Planning2Page() {
  const { affaires, loading: loadingAffaires } = useAffaires()
  
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')
  const [responsable, setResponsable] = useState('')
  const [tranche, setTranche] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les responsables uniques depuis les affaires
  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable sélectionné
  const affairesFiltreesParResponsable = responsable
    ? affairesActives.filter((a) => a.responsable === responsable)
    : affairesActives

  // Extraire les sites uniques depuis les affaires filtrées par responsable
  const sitesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsable.map((a) => a.site).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable et le site sélectionnés
  const affairesFiltreesParResponsableEtSite = site
    ? affairesFiltreesParResponsable.filter((a) => a.site === site)
    : affairesFiltreesParResponsable

  // Extraire les tranches uniques depuis les affaires filtrées
  const tranchesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsableEtSite.map((a) => a.tranche).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon responsable, site et tranche
  const affairesFiltreesParTranche = tranche
    ? affairesFiltreesParResponsableEtSite.filter((a) => a.tranche === tranche)
    : affairesFiltreesParResponsableEtSite

  // Filtrer par numéro de compte si renseigné
  const affairesFiltreesFinales = numeroCompte
    ? affairesFiltreesParTranche.filter((a) => 
        a.affaire_id && a.affaire_id.toLowerCase().includes(numeroCompte.toLowerCase())
      )
    : affairesFiltreesParTranche

  // Ajuster automatiquement la date de fin selon la précision (uniquement au changement de précision)
  useEffect(() => {
    if (precision === 'SEMAINE') {
      // Pour SEMAINE, afficher 1 mois (environ 4-5 semaines)
      const weekStart = startOfWeek(dateDebut, { weekStartsOn: 1 })
      const monthEnd = endOfMonth(weekStart)
      setDateDebut(weekStart)
      setDateFin(monthEnd)
    } else if (precision === 'MOIS') {
      // Pour MOIS, afficher 12 mois glissants à partir de dateDebut
      const monthStart = startOfMonth(dateDebut)
      const monthEnd12 = endOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1))
      setDateDebut(monthStart)
      setDateFin(monthEnd12)
    }
    // Note: Pour JOUR, on garde les dates telles quelles (pas de réinitialisation)
  }, [precision])

  // Réinitialiser les filtres en cascade quand on change le responsable
  useEffect(() => {
    if (responsable) {
      setSite('')
      setTranche('')
      setAffaireId('')
    }
  }, [responsable])

  // Réinitialiser tranche et affaire quand le site change
  useEffect(() => {
    if (site) {
      setTranche('')
      setAffaireId('')
    }
  }, [site])

  // Réinitialiser affaire quand la tranche change
  useEffect(() => {
    if (tranche) {
      setAffaireId('')
    }
  }, [tranche])

  // Mettre à jour le site automatiquement quand une affaire est sélectionnée
  useEffect(() => {
    if (affaireId) {
      const affaire = affairesFiltreesFinales.find((a) => a.affaire_id === affaireId)
      if (affaire && affaire.site !== site) {
        setSite(affaire.site)
      }
    }
  }, [affaireId, affairesFiltreesFinales, site])

  // Sélection automatique de l'affaire si un numéro de compte correspond exactement
  useEffect(() => {
    if (numeroCompte && numeroCompte.trim() !== '') {
      const affaireTrouvee = affairesFiltreesFinales.find((a) => 
        a.affaire_id && a.affaire_id.toLowerCase() === numeroCompte.toLowerCase().trim()
      )
      if (affaireTrouvee && affaireTrouvee.affaire_id && affaireTrouvee.affaire_id !== affaireId) {
        setAffaireId(affaireTrouvee.affaire_id)
        setSite(affaireTrouvee.site)
      }
    }
  }, [numeroCompte, affairesFiltreesFinales, affaireId])

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec raccourcis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Planning 2.0
              </h1>
              <p className="text-gray-600 mt-1">
                Vue moderne et intuitive pour la gestion des charges et affectations
              </p>
            </div>
          </div>
        </div>

        {/* SÉLECTION AFFAIRE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600" />
              Sélection affaire
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Numéro de compte (filtre intelligent) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Numéro de compte
              </label>
              <input
                type="text"
                value={numeroCompte}
                onChange={(e) => {
                  setNumeroCompte(e.target.value)
                }}
                placeholder="Rechercher par numéro..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
              />
            </div>

            {/* Responsable */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Responsable
              </label>
              <select
                value={responsable}
                onChange={(e) => {
                  setResponsable(e.target.value)
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Tous les responsables...</option>
                {responsablesDisponibles.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
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
                onChange={(e) => {
                  setSite(e.target.value)
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Sélectionner un site...</option>
                {sitesDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Tranche */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tranche
              </label>
              <select
                value={tranche}
                onChange={(e) => {
                  setTranche(e.target.value)
                }}
                disabled={!site}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Toutes les tranches...</option>
                {tranchesDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Affaire */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Affaire <span className="text-red-500">*</span>
              </label>
              <select
                value={affaireId}
                onChange={(e) => {
                  const selectedAffaireId = e.target.value
                  if (selectedAffaireId) {
                    const affaire = affairesFiltreesFinales.find(
                      (a) => a.affaire_id === selectedAffaireId
                    )
                    if (affaire) {
                      setAffaireId(selectedAffaireId)
                      setSite(affaire.site)
                      setNumeroCompte('')
                    }
                  } else {
                    setAffaireId('')
                  }
                }}
                disabled={!site}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner une affaire...</option>
                {affairesFiltreesFinales.map((affaire) => (
                  <option key={affaire.id} value={affaire.affaire_id || ''}>
                    {affaire.affaire_id || 'Sans ID'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Composant Planning2 */}
        {affaireId && site ? (
          <Planning2
            affaireId={affaireId}
            site={site}
            dateDebut={dateDebut}
            dateFin={dateFin}
            precision={precision}
            onPrecisionChange={(newPrecision) => {
              setPrecision(newPrecision)
            }}
            onDateDebutChange={(newDateDebut) => {
              setDateDebut(newDateDebut)
            }}
            onDateFinChange={(newDateFin) => {
              setDateFin(newDateFin)
            }}
          />
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                Veuillez sélectionner une affaire et un site pour afficher le planning.
              </p>
            </div>
          </div>
        )}

        {/* Liens rapides vers autres pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/planning"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Planning classique</p>
              <p className="text-sm text-gray-500">Vue tableau traditionnelle</p>
            </div>
          </Link>

          <Link
            href="/affaires"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 group"
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
        </div>
      </div>
    </Layout>
  )
}
