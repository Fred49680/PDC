'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { Planning3 } from '@/components/Planning3'
import { Target, AlertCircle } from 'lucide-react'
import { useAffaires } from '@/hooks/useAffaires'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function Planning3Page() {
  const { affaires, loading: loadingAffaires } = useAffaires()

  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [responsable, setResponsable] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les responsables uniques
  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable
  const affairesFiltreesParResponsable = responsable
    ? affairesActives.filter((a) => a.responsable === responsable)
    : affairesActives

  // Extraire les sites uniques
  const sitesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsable.map((a) => a.site).filter(Boolean))
  ).sort()

  // Filtrer par numéro de compte si renseigné
  const affairesFiltreesFinales = numeroCompte
    ? affairesFiltreesParResponsable.filter((a) =>
        a.affaire_id && a.affaire_id.toLowerCase().includes(numeroCompte.toLowerCase())
      )
    : affairesFiltreesParResponsable

  // Réinitialiser les filtres en cascade
  useEffect(() => {
    if (responsable) {
      setSite('')
      setAffaireId('')
    }
  }, [responsable])

  useEffect(() => {
    if (site) {
      setAffaireId('')
    }
  }, [site])

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
      const affaireTrouvee = affairesFiltreesFinales.find(
        (a) => a.affaire_id && a.affaire_id.toLowerCase() === numeroCompte.toLowerCase().trim()
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
        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
              <Target className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Planning v3
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
                Gestion des besoins et affectations par Affaire / Compétence / Période
              </p>
            </div>
          </div>
        </div>

        {/* Sélection affaire - Compactée sur une ligne (modèle Charge) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Titre compact */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Target className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-800">Sélection affaire</h2>
            </div>
            {/* Numéro de compte */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Numéro de compte
              </label>
              <input
                type="text"
                value={numeroCompte}
                onChange={(e) => setNumeroCompte(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
              />
            </div>

            {/* Responsable */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
              >
                <option value="">Tous...</option>
                {responsablesDisponibles.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
              >
                <option value="">Sélectionner...</option>
                {sitesDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Affaire */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner...</option>
                {affairesFiltreesFinales.map((affaire) => (
                  <option key={affaire.id} value={affaire.affaire_id || ''}>
                    {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Composant Planning3 (modèle Charge) */}
        {affaireId && site ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
            <Planning3 affaireId={affaireId} site={site} />
          </div>
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
      </div>
    </Layout>
  )
}

