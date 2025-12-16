'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, X, Award, Star } from 'lucide-react'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function RessourcesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const { ressources, competences, loading, error, saveRessource, deleteRessource, saveCompetence, deleteCompetence, saveCompetencesBatch } =
    useRessources({
      site: filters.site || undefined,
      actif: filters.actif,
    })
  
  // Charger les sites pour le select
  const { sites: sitesList, loading: sitesLoading } = useSites({ actif: true })

  const [formData, setFormData] = useState({
    id: '',
    nom: '',
    site: '',
    type_contrat: '',
    responsable: '',
    date_debut_contrat: '',
    date_fin_contrat: '',
    actif: true,
  })

  // Liste prédéfinie des compétences
  const competencesPredéfinies = [
    'ADMIN',
    'AUTO',
    'BE_IES',
    'ENCADREMENT',
    'ESSAIS',
    'FIBRE OPTIQUE',
    'HSE_CRP',
    'IEG',
    'IES',
    'INSTRUM',
    'MAGASIN',
    'PACK',
    'PREPA',
    'REDACTION_RA',
    'RELEVE',
    'ROB',
    'SERVITUDE',
    'SS4',
    'TRACAGE',
  ]

  // État pour gérer les compétences sélectionnées (toggle)
  // Structure: Map<competence, { selected: boolean, principale: boolean }>
  const [competencesSelection, setCompetencesSelection] = useState<Map<string, { selected: boolean; principale: boolean }>>(new Map())
  const [competencesPersonnalisees, setCompetencesPersonnalisees] = useState<Array<{ nom: string; principale: boolean }>>([])
  const [competenceFormRessourceId, setCompetenceFormRessourceId] = useState<string | null>(null)

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
        responsable: '',
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
      responsable: ressource.responsable || '',
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
      responsable: '',
      date_debut_contrat: '',
      date_fin_contrat: '',
      actif: true,
    })
    setIsEditing(false)
    setShowForm(true)
  }

  const handleAddCompetence = (ressourceId: string) => {
    // Charger les compétences existantes pour cette ressource
    const existingCompetences = competences.get(ressourceId) || []
    const newSelection = new Map<string, { selected: boolean; principale: boolean }>()
    
    // Initialiser toutes les compétences prédéfinies comme non sélectionnées
    competencesPredéfinies.forEach(comp => {
      const existing = existingCompetences.find(c => c.competence === comp)
      newSelection.set(comp, {
        selected: !!existing,
        principale: existing?.type_comp === 'P' || false,
      })
    })
    
    // Séparer les compétences personnalisées
    const customComps = existingCompetences.filter(c => !competencesPredéfinies.includes(c.competence))
    
    setCompetencesSelection(newSelection)
    setCompetencesPersonnalisees(
      customComps.length > 0 
        ? customComps.map(c => ({ nom: c.competence, principale: c.type_comp === 'P' }))
        : [{ nom: '', principale: false }]
    )
    setCompetenceFormRessourceId(ressourceId)
    setShowCompetenceForm(true)
  }

  const handleToggleCompetence = (competence: string) => {
    const newSelection = new Map(competencesSelection)
    const current = newSelection.get(competence) || { selected: false, principale: false }
    
    newSelection.set(competence, {
      selected: !current.selected,
      principale: current.selected && current.principale ? false : current.principale, // Si on désélectionne, ne pas garder principale
    })
    
    // Si on vient de cocher une compétence qui est marquée principale, s'assurer qu'elle reste principale
    // Sinon, la logique reste cohérente
    
    setCompetencesSelection(newSelection)
  }

  const handleSetPrincipale = (competence: string) => {
    const newSelection = new Map(competencesSelection)
    
    // D'abord, décocher toutes les principales existantes
    competencesSelection.forEach((value, key) => {
      if (value.selected && value.principale) {
        newSelection.set(key, { selected: value.selected, principale: false })
      }
    })
    
    // Décocher aussi les compétences personnalisées principales
    setCompetencesPersonnalisees(prev => 
      prev.map(c => ({ ...c, principale: false }))
    )
    
    // Cocher la nouvelle principale
    const current = newSelection.get(competence) || { selected: false, principale: false }
    if (current.selected) {
      newSelection.set(competence, { selected: true, principale: true })
    }
    
    setCompetencesSelection(newSelection)
  }

  const handleToggleCompetencePersonnalisee = (index: number, value: string) => {
    const newCustom = [...competencesPersonnalisees]
    newCustom[index] = { nom: value, principale: newCustom[index]?.principale || false }
    setCompetencesPersonnalisees(newCustom)
  }

  const handleAddCustomCompetence = () => {
    setCompetencesPersonnalisees([...competencesPersonnalisees, { nom: '', principale: false }])
  }

  const handleRemoveCustomCompetence = (index: number) => {
    const newCustom = competencesPersonnalisees.filter((_, i) => i !== index)
    if (newCustom.length === 0) {
      newCustom.push({ nom: '', principale: false })
    }
    setCompetencesPersonnalisees(newCustom)
  }

  const handleSetPrincipalePersonnalisee = (index: number) => {
    // Ne faire que si la compétence personnalisée n'est pas vide
    if (!competencesPersonnalisees[index]?.nom.trim()) {
      return
    }

    // Décocher toutes les principales existantes (prédéfinies)
    const newSelection = new Map(competencesSelection)
    competencesSelection.forEach((value, key) => {
      if (value.selected && value.principale) {
        newSelection.set(key, { selected: value.selected, principale: false })
      }
    })
    setCompetencesSelection(newSelection)
    
    // Décocher toutes les principales personnalisées sauf celle sélectionnée
    setCompetencesPersonnalisees(prev => 
      prev.map((c, i) => ({ ...c, principale: i === index && c.nom.trim() !== '' }))
    )
  }

  const handleSubmitCompetences = async () => {
    if (!competenceFormRessourceId) return

    try {
      // Construire la liste des compétences à sauvegarder
      const competencesToSave: Array<{ competence: string; type_comp: string }> = []

      // Ajouter les compétences prédéfinies sélectionnées
      competencesSelection.forEach((value, competence) => {
        if (value.selected) {
          competencesToSave.push({
            competence,
            type_comp: value.principale ? 'P' : 'S',
          })
        }
      })

      // Ajouter les compétences personnalisées (non vides)
      competencesPersonnalisees.forEach(custom => {
        const trimmedNom = custom.nom.trim()
        if (trimmedNom) {
          competencesToSave.push({
            competence: trimmedNom,
            type_comp: custom.principale ? 'P' : 'S',
          })
        }
      })

      // Vérifier qu'il n'y a qu'une seule principale
      const principales = competencesToSave.filter(c => c.type_comp === 'P')
      if (principales.length > 1) {
        alert('Erreur : Une seule compétence principale est autorisée. Veuillez décocher les autres compétences principales.')
        return
      }
      
      if (principales.length === 0 && competencesToSave.length > 0) {
        // Avertir mais ne pas bloquer (on peut avoir uniquement des secondaires)
        console.warn('Aucune compétence principale sélectionnée. Toutes les compétences seront enregistrées comme secondaires.')
      }

      // Sauvegarder toutes les compétences en une fois
      await saveCompetencesBatch(competenceFormRessourceId, competencesToSave)

      // Réinitialiser le formulaire
      setCompetencesSelection(new Map())
      setCompetencesPersonnalisees([{ nom: '', principale: false }])
      setCompetenceFormRessourceId(null)
      setShowCompetenceForm(false)
      setSelectedRessource(null)
    } catch (err) {
      console.error('[RessourcesPage] Erreur sauvegarde compétences:', err)
      alert('Erreur lors de la sauvegarde des compétences. Veuillez réessayer.')
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Site <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white font-medium text-gray-900"
                  required
                  disabled={sitesLoading}
                >
                  <option value="" className="text-gray-500">Sélectionner un site...</option>
                  {sitesList.map((site) => (
                    <option key={site.id} value={site.site} className="text-gray-900">
                      {site.site}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Type de contrat</label>
                <select
                  value={formData.type_contrat}
                  onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white font-medium text-gray-900"
                >
                  <option value="" className="text-gray-500">Sélectionner...</option>
                  <option value="CDI" className="text-gray-900">CDI</option>
                  <option value="CDD" className="text-gray-900">CDD</option>
                  <option value="ETT" className="text-gray-900">ETT</option>
                  <option value="Interim" className="text-gray-900">Intérim</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Responsable</label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-500"
                  placeholder="Nom du responsable"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Date début contrat</label>
                <input
                  type="date"
                  value={formData.date_debut_contrat}
                  onChange={(e) => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Date fin contrat</label>
                <input
                  type="date"
                  value={formData.date_fin_contrat}
                  onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900"
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
                      responsable: '',
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

        {/* Formulaire compétence - Toggle system */}
        {showCompetenceForm && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Gérer les compétences</h2>
              </div>
              <button
                onClick={() => {
                  setShowCompetenceForm(false)
                  setSelectedRessource(null)
                  setCompetencesSelection(new Map())
                  setCompetencesPersonnalisees([{ nom: '', principale: false }])
                  setCompetenceFormRessourceId(null)
                }}
                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Compétences prédéfinies */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Compétences prédéfinies
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {competencesPredéfinies.map((comp) => {
                    const compState = competencesSelection.get(comp) || { selected: false, principale: false }
                    return (
                      <div
                        key={comp}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          compState.selected
                            ? compState.principale
                              ? 'bg-blue-100 border-blue-400 shadow-md'
                              : 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleCompetence(comp)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={compState.selected}
                              onChange={() => handleToggleCompetence(comp)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-900">{comp}</span>
                          </div>
                          {compState.selected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetPrincipale(comp)
                              }}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                compState.principale
                                  ? 'bg-blue-500 border-blue-600 text-white shadow-md'
                                  : 'bg-white border-gray-300 hover:border-blue-400 text-gray-400 hover:text-blue-500'
                              }`}
                              title={compState.principale ? 'Compétence principale (cliquer pour retirer)' : 'Marquer comme principale'}
                            >
                              <Star className={`w-4 h-4 ${compState.principale ? 'fill-white' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Compétences personnalisées */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Compétences personnalisées
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomCompetence}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {competencesPersonnalisees.map((custom, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={custom.nom}
                        onChange={(e) => handleToggleCompetencePersonnalisee(index, e.target.value)}
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-500"
                        placeholder="Nom de la compétence personnalisée..."
                      />
                      <button
                        type="button"
                        onClick={() => handleSetPrincipalePersonnalisee(index)}
                        disabled={!custom.nom.trim()}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                          custom.principale
                            ? 'bg-blue-500 border-blue-600 text-white shadow-md'
                            : custom.nom.trim()
                            ? 'bg-white border-gray-300 hover:border-blue-400 text-gray-400 hover:text-blue-500'
                            : 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                        }`}
                        title={custom.principale ? 'Compétence principale (cliquer pour retirer)' : custom.nom.trim() ? 'Marquer comme principale' : 'Saisir d\'abord un nom'}
                      >
                        <Star className={`w-5 h-5 ${custom.principale ? 'fill-white' : ''}`} />
                      </button>
                      {competencesPersonnalisees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomCompetence(index)}
                          className="w-10 h-10 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 flex items-center justify-center transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompetenceForm(false)
                    setSelectedRessource(null)
                    setCompetencesSelection(new Map())
                    setCompetencesPersonnalisees([{ nom: '', principale: false }])
                    setCompetenceFormRessourceId(null)
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCompetences}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <Award className="w-5 h-5" />
                  Enregistrer les compétences
                </button>
              </div>
            </div>
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
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-500"
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
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-semibold">Site:</span> {ressource.site}
                            </div>
                            {ressource.type_contrat && (
                              <div>
                                <span className="font-semibold">Contrat:</span> {ressource.type_contrat}
                              </div>
                            )}
                            {ressource.responsable && (
                              <div>
                                <span className="font-semibold">Responsable:</span> {ressource.responsable}
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
                                {resCompetences
                                  .sort((a, b) => {
                                    // Trier : principales d'abord (P), puis secondaires (S)
                                    const typeA = a.type_comp || 'S'
                                    const typeB = b.type_comp || 'S'
                                    if (typeA === 'P' && typeB !== 'P') return -1
                                    if (typeA !== 'P' && typeB === 'P') return 1
                                    return 0
                                  })
                                  .map((comp) => (
                                    <span
                                      key={comp.id}
                                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                        comp.type_comp === 'P'
                                          ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                          : 'bg-green-50 text-green-800 border border-green-200'
                                      }`}
                                    >
                                      {comp.type_comp === 'P' && (
                                        <span className="font-bold" title="Compétence principale">⭐</span>
                                      )}
                                      {comp.competence}
                                      {comp.niveau && <span className="opacity-75">({comp.niveau})</span>}
                                      <button
                                        onClick={() => deleteCompetence(comp.id)}
                                        className="text-red-500 hover:text-red-700 ml-1"
                                        title="Supprimer cette compétence"
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
