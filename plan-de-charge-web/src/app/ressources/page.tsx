'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useRessources } from '@/hooks/useRessources'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, X, Award } from 'lucide-react'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function RessourcesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const { ressources, competences, loading, error, saveRessource, deleteRessource, saveCompetence, deleteCompetence } =
    useRessources({
      site: filters.site || undefined,
      actif: filters.actif,
    })

  const [formData, setFormData] = useState({
    id: '',
    nom: '',
    site: '',
    type_contrat: '',
    date_debut_contrat: '',
    date_fin_contrat: '',
    actif: true,
  })

  const [competenceForm, setCompetenceForm] = useState({
    ressourceId: '',
    competence: '',
    niveau: '',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showCompetenceForm, setShowCompetenceForm] = useState(false)
  const [selectedRessource, setSelectedRessource] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveRessource({
        ...formData,
        date_debut_contrat: formData.date_debut_contrat ? new Date(formData.date_debut_contrat) : undefined,
        date_fin_contrat: formData.date_fin_contrat ? new Date(formData.date_fin_contrat) : undefined,
      })
      // Réinitialiser le formulaire
      setFormData({
        id: '',
        nom: '',
        site: '',
        type_contrat: '',
        date_debut_contrat: '',
        date_fin_contrat: '',
        actif: true,
      })
      setIsEditing(false)
      setShowForm(false)
    } catch (err) {
      console.error('[RessourcesPage] Erreur:', err)
    }
  }

  const handleEdit = (ressource: typeof ressources[0]) => {
    setFormData({
      id: ressource.id,
      nom: ressource.nom,
      site: ressource.site,
      type_contrat: ressource.type_contrat || '',
      date_debut_contrat: ressource.date_debut_contrat
        ? format(ressource.date_debut_contrat, 'yyyy-MM-dd')
        : '',
      date_fin_contrat: ressource.date_fin_contrat ? format(ressource.date_fin_contrat, 'yyyy-MM-dd') : '',
      actif: ressource.actif,
    })
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      try {
        await deleteRessource(id)
      } catch (err) {
        console.error('[RessourcesPage] Erreur suppression:', err)
      }
    }
  }

  const handleNew = () => {
    setFormData({
      id: '',
      nom: '',
      site: '',
      type_contrat: '',
      date_debut_contrat: '',
      date_fin_contrat: '',
      actif: true,
    })
    setIsEditing(false)
    setShowForm(true)
  }

  const handleAddCompetence = (ressourceId: string) => {
    setCompetenceForm({
      ressourceId,
      competence: '',
      niveau: '',
    })
    setSelectedRessource(ressourceId)
    setShowCompetenceForm(true)
  }

  const handleSubmitCompetence = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveCompetence(competenceForm.ressourceId, competenceForm.competence, competenceForm.niveau || undefined)
      setCompetenceForm({
        ressourceId: '',
        competence: '',
        niveau: '',
      })
      setShowCompetenceForm(false)
      setSelectedRessource(null)
    } catch (err) {
      console.error('[RessourcesPage] Erreur ajout compétence:', err)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Gestion des Ressources
              </h1>
              <p className="text-gray-600 mt-1">Créez et gérez les ressources et leurs compétences</p>
            </div>
          </div>
          <button
            onClick={handleNew}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle ressource
          </button>
        </div>

        {/* Formulaire ressource - Design moderne */}
        {showForm && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? 'Modifier une ressource' : 'Nouvelle ressource'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  required
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Type de contrat</label>
                <select
                  value={formData.type_contrat}
                  onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white font-medium"
                >
                  <option value="">Sélectionner...</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="ETT">ETT</option>
                  <option value="Interim">Intérim</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Date début contrat</label>
                <input
                  type="date"
                  value={formData.date_debut_contrat}
                  onChange={(e) => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Date fin contrat</label>
                <input
                  type="date"
                  value={formData.date_fin_contrat}
                  onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                />
                <label htmlFor="actif" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Ressource active
                </label>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isEditing ? 'Enregistrer les modifications' : 'Créer la ressource'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setIsEditing(false)
                    setFormData({
                      id: '',
                      nom: '',
                      site: '',
                      type_contrat: '',
                      date_debut_contrat: '',
                      date_fin_contrat: '',
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

        {/* Formulaire compétence - Design moderne */}
        {showCompetenceForm && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Ajouter une compétence</h2>
              </div>
              <button
                onClick={() => {
                  setShowCompetenceForm(false)
                  setSelectedRessource(null)
                  setCompetenceForm({ ressourceId: '', competence: '', niveau: '' })
                }}
                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSubmitCompetence} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Compétence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={competenceForm.competence}
                  onChange={(e) => setCompetenceForm({ ...competenceForm, competence: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  required
                  placeholder="Ex: IES, INSTRUM, etc."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Niveau (optionnel)</label>
                <select
                  value={competenceForm.niveau}
                  onChange={(e) => setCompetenceForm({ ...competenceForm, niveau: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white font-medium"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Junior">Junior</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="Senior">Senior</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <Award className="w-5 h-5" />
                  Ajouter la compétence
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtres - Design moderne */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Filtres</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.site}
                onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                placeholder="Filtrer par site..."
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="actifFilter"
                checked={filters.actif}
                onChange={(e) => setFilters({ ...filters, actif: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
              />
              <label htmlFor="actifFilter" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Afficher uniquement les ressources actives
              </label>
            </div>
          </div>
        </div>

        {/* Liste des ressources */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des ressources</h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              {ressources.length}
            </span>
          </div>

          {loading ? (
            <Loading message="Chargement des ressources..." />
          ) : error ? (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-medium">Erreur: {error.message}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {ressources.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium text-lg">Aucune ressource trouvée</p>
                </div>
              ) : (
                ressources.map((ressource) => {
                  const resCompetences = competences.get(ressource.id) || []
                  return (
                    <div
                      key={ressource.id}
                      className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{ressource.nom}</h3>
                            {ressource.actif ? (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-semibold">Site:</span> {ressource.site}
                            </div>
                            {ressource.type_contrat && (
                              <div>
                                <span className="font-semibold">Contrat:</span> {ressource.type_contrat}
                              </div>
                            )}
                            {ressource.date_fin_contrat && (
                              <div>
                                <span className="font-semibold">Fin contrat:</span>{' '}
                                {format(ressource.date_fin_contrat, 'dd/MM/yyyy', { locale: fr })}
                              </div>
                            )}
                          </div>
                          {resCompetences.length > 0 && (
                            <div className="mt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-semibold text-gray-700">Compétences:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {resCompetences.map((comp) => (
                                  <span
                                    key={comp.id}
                                    className="px-3 py-1 bg-green-50 text-green-800 rounded-lg text-xs font-medium flex items-center gap-2"
                                  >
                                    {comp.competence}
                                    {comp.niveau && <span className="text-green-600">({comp.niveau})</span>}
                                    <button
                                      onClick={() => deleteCompetence(comp.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleAddCompetence(ressource.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 flex items-center gap-2 font-medium text-sm"
                            title="Ajouter une compétence"
                          >
                            <Award className="w-4 h-4" />
                            Compétence
                          </button>
                          <button
                            onClick={() => handleEdit(ressource)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 flex items-center gap-2 font-medium text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(ressource.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 flex items-center gap-2 font-medium text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
