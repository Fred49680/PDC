'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAffaires } from '@/hooks/useAffaires'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { generateAffaireId } from '@/utils/siteMap'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function AffairesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const { affaires, loading, error, saveAffaire, deleteAffaire } = useAffaires({
    site: filters.site || undefined,
    actif: filters.actif,
  })

  const [formData, setFormData] = useState({
    id: '',
    affaire_id: '',
    site: '',
    libelle: '',
    tranche: '',
    statut: 'Ouverte',
    actif: true,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Générer automatiquement l'affaire_id lorsque tranche, site, libelle ou statut changent
  useEffect(() => {
    // Générer l'ID uniquement si tous les champs nécessaires sont remplis
    if (formData.tranche && formData.site && formData.libelle && formData.statut) {
      const generatedId = generateAffaireId(
        formData.tranche,
        formData.site,
        formData.libelle,
        formData.statut
      )
      // Mettre à jour l'ID seulement s'il est différent (évite les boucles infinies)
      if (generatedId !== formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: generatedId }))
      }
    } else {
      // Si les champs ne sont plus complets, vider l'ID
      if (formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: '' }))
      }
    }
  }, [formData.tranche, formData.site, formData.libelle, formData.statut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveAffaire({
        ...formData,
        date_creation: formData.id ? new Date() : new Date(),
        date_modification: new Date(),
      })
      // Réinitialiser le formulaire
      setFormData({
        id: '',
        affaire_id: '',
        site: '',
        libelle: '',
        tranche: '',
        statut: 'Ouverte',
        actif: true,
      })
      setIsEditing(false)
      setShowForm(false)
    } catch (err: any) {
      console.error('[AffairesPage] Erreur:', err)
      // Afficher un message d'erreur à l'utilisateur
      alert(
        'Erreur lors de l\'enregistrement :\n\n' +
        (err.message || 'Une erreur inattendue s\'est produite') +
        '\n\nVeuillez consulter la console pour plus de détails.'
      )
    }
  }

  const handleEdit = (affaire: typeof affaires[0]) => {
    setFormData({
      id: affaire.id,
      affaire_id: affaire.affaire_id || '',
      site: affaire.site,
      libelle: affaire.libelle,
      tranche: affaire.tranche || '',
      statut: affaire.statut || 'Ouverte',
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
      statut: 'Ouverte',
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
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Affaire ID
                  <span className="text-xs text-gray-500 ml-2">
                    {formData.statut === 'Ouverte' || formData.statut === 'Prévisionnelle'
                      ? '(Généré automatiquement)'
                      : '(Vide si statut ≠ Ouverte/Prévisionnelle)'}
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.affaire_id}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder={
                    formData.statut === 'Ouverte' || formData.statut === 'Prévisionnelle'
                      ? 'Sera généré automatiquement...'
                      : 'Vide (statut ≠ Ouverte/Prévisionnelle)'
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: Belleville"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Tranche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tranche}
                  onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: TOUTE, T1, T2..."
                />
              </div>
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
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Libellé (Affaire) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.libelle}
                  onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: PACK TEM"
                />
              </div>
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
                      statut: 'Ouverte',
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
                      Site
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Libellé
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date création
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affaires.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
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
                          {affaire.affaire_id || <span className="text-gray-400 italic">(vide)</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{affaire.site}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{affaire.libelle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(affaire.date_creation, 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {affaire.actif ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
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
