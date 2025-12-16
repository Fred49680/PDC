'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MapPin, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, Download, RefreshCw } from 'lucide-react'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function SitesAdminPage() {
  const [filters, setFilters] = useState({ region: '', centreOuest: '', actif: true })
  const { sites, loading, error, saveSite, deleteSite, initializeDefaultSites } = useSites({
    region: filters.region || undefined,
    centreOuest: filters.centreOuest || undefined,
    actif: filters.actif,
  })

  const [formData, setFormData] = useState({
    id: '',
    site: '',
    site_key: '',
    site_map: '',
    region: '',
    centre_ouest: '',
    actif: true,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveSite({
        ...formData,
        region: formData.region || null,
        centre_ouest: formData.centre_ouest || null,
      })
      // Réinitialiser le formulaire
      setFormData({
        id: '',
        site: '',
        site_key: '',
        site_map: '',
        region: '',
        centre_ouest: '',
        actif: true,
      })
      setIsEditing(false)
      setShowForm(false)
    } catch (err) {
      console.error('[SitesAdminPage] Erreur:', err)
    }
  }

  const handleEdit = (site: typeof sites[0]) => {
    setFormData({
      id: site.id,
      site: site.site,
      site_key: site.site_key,
      site_map: site.site_map,
      region: site.region || '',
      centre_ouest: site.centre_ouest || '',
      actif: site.actif,
    })
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) {
      try {
        await deleteSite(id)
      } catch (err) {
        console.error('[SitesAdminPage] Erreur suppression:', err)
      }
    }
  }

  const handleNew = () => {
    setFormData({
      id: '',
      site: '',
      site_key: '',
      site_map: '',
      region: '',
      centre_ouest: '',
      actif: true,
    })
    setIsEditing(false)
    setShowForm(true)
  }

  const handleInitialize = async () => {
    if (confirm('Initialiser les sites par défaut ? Cela ajoutera tous les sites des centrales françaises.')) {
      try {
        setIsInitializing(true)
        await initializeDefaultSites()
        alert('Sites initialisés avec succès !')
      } catch (err: any) {
        alert('Erreur lors de l\'initialisation : ' + (err.message || 'Erreur inconnue'))
        console.error('[SitesAdminPage] Erreur initialisation:', err)
      } finally {
        setIsInitializing(false)
      }
    }
  }

  // Liste des régions uniques pour le filtre
  const regions = Array.from(new Set(sites.map((s) => s.region).filter((r) => r !== null))) as string[]
  const centresOuest = Array.from(new Set(sites.map((s) => s.centre_ouest).filter((c) => c !== null))) as string[]

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Administration des Sites
              </h1>
              <p className="text-gray-600 mt-1">Gérez les sites et leurs régions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Initialisation...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Initialiser sites par défaut
                </>
              )}
            </button>
            <button
              onClick={handleNew}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouveau site
            </button>
          </div>
        </div>

        {/* Formulaire - Design moderne */}
        {showForm && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? 'Modifier un site' : 'Nouveau site'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: Blayais"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.site_key}
                  onChange={(e) => setFormData({ ...formData, site_key: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: BLAYAIS"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site Map <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.site_map}
                  onChange={(e) => setFormData({ ...formData, site_map: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: BLA"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Région</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  placeholder="Ex: Sud Ouest"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Centre Ouest</label>
                <select
                  value={formData.centre_ouest}
                  onChange={(e) => setFormData({ ...formData, centre_ouest: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Centre Ouest">Centre Ouest</option>
                  <option value="Nord Ouest">Nord Ouest</option>
                  <option value="Centre Est">Centre Est</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="actif" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Site actif
                </label>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isEditing ? 'Enregistrer les modifications' : 'Créer le site'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setIsEditing(false)
                    setFormData({
                      id: '',
                      site: '',
                      site_key: '',
                      site_map: '',
                      region: '',
                      centre_ouest: '',
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
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Filtres</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                placeholder="Filtrer par région..."
              />
            </div>
            <div>
              <select
                value={filters.centreOuest}
                onChange={(e) => setFilters({ ...filters, centreOuest: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Tous les centres</option>
                <option value="Centre Ouest">Centre Ouest</option>
                <option value="Nord Ouest">Nord Ouest</option>
                <option value="Centre Est">Centre Est</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="actifFilter"
                checked={filters.actif}
                onChange={(e) => setFilters({ ...filters, actif: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="actifFilter" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Afficher uniquement les sites actifs
              </label>
            </div>
          </div>
        </div>

        {/* Liste des sites */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des sites</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {sites.length}
            </span>
          </div>

          {loading ? (
            <Loading message="Chargement des sites..." />
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
                <thead className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site Key
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site Map
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Région
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Centre Ouest
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
                  {sites.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <MapPin className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucun site trouvé</p>
                          <p className="text-gray-400 text-sm">
                            Cliquez sur "Initialiser sites par défaut" pour ajouter les sites des centrales françaises
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sites.map((site) => (
                      <tr key={site.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {site.site}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.site_key}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.site_map}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {site.region || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {site.centre_ouest || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {site.actif ? (
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
                              onClick={() => handleEdit(site)}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 font-medium"
                            >
                              <Edit2 className="w-4 h-4" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(site.id)}
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
