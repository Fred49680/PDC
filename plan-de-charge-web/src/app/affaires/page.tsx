'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAffaires } from '@/hooks/useAffaires'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, Info } from 'lucide-react'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function AffairesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const { affaires, loading, error, saveAffaire, deleteAffaire } = useAffaires({
    site: filters.site || undefined,
    actif: filters.actif,
  })
  const { sites } = useSites({ actif: true })

  const [formData, setFormData] = useState({
    id: '',
    affaire_id: '', // Lecture seule (généré automatiquement)
    site: '',
    libelle: '',
    // Nouveaux champs pour génération AffaireID
    tranche: '',
    affaire_nom: '',
    statut: 'Ouverte',
    compte: '',
    date_debut_dem: '',
    date_fin_dem: '',
    responsable: '',
    budget_heures: '',
    raf: '',
    total_planifie: '',
    actif: true,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveAffaire({
        id: formData.id || undefined,
        site: formData.site,
        libelle: formData.libelle,
        // Nouveaux champs
        tranche: formData.tranche || undefined,
        affaire_nom: formData.affaire_nom || undefined,
        statut: formData.statut || 'Ouverte',
        compte: formData.compte || undefined,
        date_debut_dem: formData.date_debut_dem ? new Date(formData.date_debut_dem) : undefined,
        date_fin_dem: formData.date_fin_dem ? new Date(formData.date_fin_dem) : undefined,
        responsable: formData.responsable || undefined,
        budget_heures: formData.budget_heures ? Number(formData.budget_heures) : undefined,
        raf: formData.raf ? Number(formData.raf) : undefined,
        total_planifie: formData.total_planifie ? Number(formData.total_planifie) : undefined,
        actif: formData.actif,
      })
      // Réinitialiser le formulaire
      setFormData({
        id: '',
        affaire_id: '',
        site: '',
        libelle: '',
        tranche: '',
        affaire_nom: '',
        statut: 'Ouverte',
        compte: '',
        date_debut_dem: '',
        date_fin_dem: '',
        responsable: '',
        budget_heures: '',
        raf: '',
        total_planifie: '',
        actif: true,
      })
      setIsEditing(false)
      setShowForm(false)
    } catch (err) {
      console.error('[AffairesPage] Erreur:', err)
    }
  }

  const handleEdit = (affaire: typeof affaires[0]) => {
    setFormData({
      id: affaire.id,
      affaire_id: affaire.affaire_id || '',
      site: affaire.site,
      libelle: affaire.libelle,
      // Nouveaux champs
      tranche: affaire.tranche || '',
      affaire_nom: affaire.affaire_nom || '',
      statut: affaire.statut || 'Ouverte',
      compte: affaire.compte || '',
      date_debut_dem: affaire.date_debut_dem ? format(affaire.date_debut_dem, 'yyyy-MM-dd') : '',
      date_fin_dem: affaire.date_fin_dem ? format(affaire.date_fin_dem, 'yyyy-MM-dd') : '',
      responsable: affaire.responsable || '',
      budget_heures: affaire.budget_heures?.toString() || '',
      raf: affaire.raf?.toString() || '',
      total_planifie: affaire.total_planifie?.toString() || '',
      actif: affaire.actif,
    })
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette affaire ?')) {
      try {
        await deleteAffaire(id)
      } catch (err) {
        console.error('[AffairesPage] Erreur suppression:', err)
      }
    }
  }

  const handleNew = () => {
    setFormData({
      id: '',
      affaire_id: '',
      site: '',
      libelle: '',
      tranche: '',
      affaire_nom: '',
      statut: 'Ouverte',
      compte: '',
      date_debut_dem: '',
      date_fin_dem: '',
      responsable: '',
      budget_heures: '',
      raf: '',
      total_planifie: '',
      actif: true,
    })
    setIsEditing(false)
    setShowForm(true)
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Affaires
              </h1>
              <p className="text-gray-600 mt-1">Créez et gérez les affaires et leurs sites</p>
            </div>
          </div>
          <button
            onClick={handleNew}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle affaire
          </button>
        </div>

        {/* Formulaire - Design moderne */}
        {showForm && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? 'Modifier une affaire' : 'Nouvelle affaire'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Affaire ID - Lecture seule (généré automatiquement) */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Affaire ID <span className="text-gray-500 text-xs">(Généré automatiquement)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.affaire_id || '(Sera généré automatiquement)'}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                </div>
                <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">Génération automatique :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Format : <code className="bg-blue-100 px-1 rounded">[Tranche][SiteMap][Affaire]</code></li>
                      <li>Généré uniquement si Statut = "Ouverte" ou "Prévisionnelle"</li>
                      <li>Le SiteMap est récupéré automatiquement depuis la table sites</li>
                      <li>Exemple : <code className="bg-blue-100 px-1 rounded">[TOUTE][BEL][PACK TEM]</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Statut - Détermine si AffaireID est généré */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                >
                  <option value="Ouverte">Ouverte</option>
                  <option value="Prévisionnelle">Prévisionnelle</option>
                  <option value="Fermée">Fermée</option>
                  <option value="Suspendue">Suspendue</option>
                </select>
              </div>

              {/* Tranche - Obligatoire pour générer AffaireID */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Tranche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tranche}
                  onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: TOUTE, 1, 2..."
                  required
                />
              </div>

              {/* Site - Obligatoire (sélecteur) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.site}>
                      {site.site} {site.site_map ? `(${site.site_map})` : ''}
                    </option>
                  ))}
                </select>
                {formData.site && (
                  <p className="text-xs text-gray-500 mt-1">
                    SiteMap: {sites.find(s => s.site === formData.site)?.site_map || 'Non trouvé'}
                  </p>
                )}
              </div>

              {/* Nom de l'affaire - Obligatoire pour générer AffaireID */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nom de l'affaire <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.affaire_nom}
                  onChange={(e) => setFormData({ ...formData, affaire_nom: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: PACK TEM, PNPE 3313..."
                  required
                />
              </div>

              {/* Compte */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Compte
                </label>
                <input
                  type="text"
                  value={formData.compte}
                  onChange={(e) => setFormData({ ...formData, compte: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: 2VPBA0"
                />
              </div>

              {/* Libellé */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Libellé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.libelle}
                  onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                />
              </div>

              {/* Dates demande */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Date début demande
                </label>
                <input
                  type="date"
                  value={formData.date_debut_dem}
                  onChange={(e) => setFormData({ ...formData, date_debut_dem: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Date fin demande
                </label>
                <input
                  type="date"
                  value={formData.date_fin_dem}
                  onChange={(e) => setFormData({ ...formData, date_fin_dem: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                />
              </div>

              {/* Responsable */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Responsable
                </label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: BARBEROT Matthieu"
                />
              </div>

              {/* Budget heures */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Budget (heures)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget_heures}
                  onChange={(e) => setFormData({ ...formData, budget_heures: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: 3402"
                />
              </div>

              {/* RAF */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Reste À Faire (heures)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.raf}
                  onChange={(e) => setFormData({ ...formData, raf: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: 500"
                />
              </div>

              {/* Total planifié */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Total planifié (heures)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_planifie}
                  onChange={(e) => setFormData({ ...formData, total_planifie: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  placeholder="Ex: 2902"
                />
              </div>

              {/* Actif */}
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="actif" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Affaire active
                </label>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isEditing ? 'Enregistrer les modifications' : 'Créer l\'affaire'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setIsEditing(false)
                    setFormData({
                      id: '',
                      affaire_id: '',
                      site: '',
                      libelle: '',
                      tranche: '',
                      affaire_nom: '',
                      statut: 'Ouverte',
                      compte: '',
                      date_debut_dem: '',
                      date_fin_dem: '',
                      responsable: '',
                      budget_heures: '',
                      raf: '',
                      total_planifie: '',
                      actif: true,
                    })
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-semibold"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtres - Design moderne */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Filtres</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.site}
                onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                placeholder="Filtrer par site..."
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="actifFilter"
                checked={filters.actif}
                onChange={(e) => setFilters({ ...filters, actif: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <label htmlFor="actifFilter" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Afficher uniquement les affaires actives
              </label>
            </div>
          </div>
        </div>

        {/* Liste des affaires */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des affaires</h2>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
              {affaires.length}
            </span>
          </div>

          {loading ? (
            <Loading message="Chargement des affaires..." />
          ) : error ? (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-medium">Erreur: {error.message}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Affaire ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tranche
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Libellé
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Budget (h)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date création
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affaires.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Building2 className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucune affaire trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    affaires.map((affaire) => (
                      <tr key={affaire.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {affaire.affaire_id || (
                            <span className="text-gray-400 italic">(Non généré)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.tranche || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{affaire.site}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.affaire_nom || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {affaire.statut ? (
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              affaire.statut === 'Ouverte' || affaire.statut === 'Prévisionnelle'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {affaire.statut}
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={affaire.libelle}>
                          {affaire.libelle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.responsable || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.budget_heures ? affaire.budget_heures.toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(affaire.date_creation, 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(affaire)}
                              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 font-medium"
                            >
                              <Edit2 className="w-4 h-4" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(affaire.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
