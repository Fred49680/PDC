'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, X, Award, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function RessourcesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const { ressources, competences, loading, error, saveRessource, deleteRessource, saveCompetence, deleteCompetence, saveCompetencesBatch, loadRessources } =
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
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'informations' | 'competences'>('informations')
  const [selectedRessource, setSelectedRessource] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveRessource({
        ...formData,
        date_debut_contrat: formData.date_debut_contrat ? new Date(formData.date_debut_contrat) : undefined,
        date_fin_contrat: formData.date_fin_contrat ? new Date(formData.date_fin_contrat) : undefined,
      })
      
      // Si c'était une création, recharger pour obtenir l'ID et passer en mode édition
      if (!isEditing) {
        // Recharger les ressources pour obtenir l'ID de la nouvelle ressource
        await loadRessources()
        // Attendre un peu pour que les données soient à jour
        await new Promise(resolve => setTimeout(resolve, 500))
        // Chercher la ressource créée via Supabase directement
        const supabase = createClient()
        const { data: newRessourceData, error: fetchError } = await supabase
          .from('ressources')
          .select('id')
          .eq('nom', formData.nom)
          .eq('site', formData.site)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (!fetchError && newRessourceData) {
          setFormData(prev => ({ ...prev, id: newRessourceData.id }))
          setIsEditing(true)
          loadCompetencesForRessource(newRessourceData.id)
          setActiveTab('competences')
        } else {
          // Si on ne trouve pas, fermer le modal
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
          setShowModal(false)
          setActiveTab('informations')
        }
      }
      // En mode édition, on reste sur l'onglet actuel et le modal reste ouvert
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
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      try {
        await deleteRessource(id)
        setShowModal(false)
        setIsEditing(false)
      } catch (err) {
        console.error('[RessourcesPage] Erreur suppression:', err)
      }
    }
  }

  const handleRowClick = (ressource: typeof ressources[0]) => {
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
    setShowModal(true)
    setActiveTab('informations')
    // Charger les compétences si en mode édition
    if (ressource.id) {
      loadCompetencesForRessource(ressource.id)
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
    setShowModal(true)
  }

  const loadCompetencesForRessource = (ressourceId: string) => {
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
    const current = newSelection.get(competence) || { selected: false, principale: false }
    
    // Si la compétence n'est pas sélectionnée, la sélectionner d'abord
    if (!current.selected) {
      newSelection.set(competence, { selected: true, principale: true })
    } else {
      // Si elle est déjà sélectionnée, basculer principale/secondaire
      newSelection.set(competence, { 
        selected: true, 
        principale: !current.principale 
      })
    }
    
    // Si on vient de marquer comme principale, décocher toutes les autres principales
    const newState = newSelection.get(competence)
    if (newState && newState.principale) {
      // Décocher toutes les autres principales (prédéfinies)
      newSelection.forEach((value, key) => {
        if (key !== competence && value.selected && value.principale) {
          newSelection.set(key, { selected: value.selected, principale: false })
        }
      })
      
      // Décocher toutes les principales personnalisées
      setCompetencesPersonnalisees(prev => 
        prev.map(c => ({ ...c, principale: false }))
      )
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
    const ressourceId = competenceFormRessourceId || formData.id
    if (!ressourceId) return

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
      await saveCompetencesBatch(ressourceId, competencesToSave)

      // Réinitialiser le formulaire
      setCompetencesSelection(new Map())
      setCompetencesPersonnalisees([{ nom: '', principale: false }])
      setCompetenceFormRessourceId(null)
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

        {/* Modal de création/modification */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {isEditing ? 'Modifier la ressource' : 'Nouvelle ressource'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setIsEditing(false)
                      setActiveTab('informations')
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
                      setCompetencesSelection(new Map())
                      setCompetencesPersonnalisees([{ nom: '', principale: false }])
                      setCompetenceFormRessourceId(null)
                    }}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Onglets */}
              <div className="border-b border-gray-200 px-6">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('informations')}
                    className={`px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                      activeTab === 'informations'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Informations
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('competences')
                      // Charger les compétences si on passe à l'onglet compétences et qu'on est en mode édition
                      if (isEditing && formData.id) {
                        loadCompetencesForRessource(formData.id)
                      }
                    }}
                    className={`px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                      activeTab === 'competences'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Compétences
                  </button>
                </div>
              </div>

              {/* Contenu de l'onglet Informations */}
              {activeTab === 'informations' && (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Première ligne : Nom et Site */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Site <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                      required
                      disabled={sitesLoading}
                    >
                      <option value="">Sélectionner un site...</option>
                      {sitesList.map((site) => (
                        <option key={site.id} value={site.site}>
                          {site.site}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deuxième ligne : Type contrat et Responsable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Type de contrat</label>
                    <select
                      value={formData.type_contrat}
                      onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                      <option value="ETT">ETT</option>
                      <option value="Interim">Intérim</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Responsable</label>
                    <input
                      type="text"
                      value={formData.responsable}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                      placeholder="Nom du responsable"
                    />
                  </div>
                </div>

                {/* Troisième ligne : Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Date début contrat</label>
                    <input
                      type="date"
                      value={formData.date_debut_contrat}
                      onChange={(e) => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Date fin contrat</label>
                    <input
                      type="date"
                      value={formData.date_fin_contrat}
                      onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                    />
                  </div>
                </div>

                {/* Quatrième ligne : Actif avec date de fin conditionnelle */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="actif"
                      checked={formData.actif}
                      onChange={(e) => {
                        const newActif = e.target.checked
                        setFormData({ 
                          ...formData, 
                          actif: newActif,
                          // Si on désactive, vider la date de fin si elle n'existe pas déjà
                          date_fin_contrat: newActif ? formData.date_fin_contrat : (formData.date_fin_contrat || '')
                        })
                      }}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                    />
                    <label htmlFor="actif" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      Ressource active
                    </label>
                  </div>
                  {!formData.actif && (
                    <div className="ml-8 space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700">
                        Date de fin (rend la ressource inactive à cette date) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date_fin_contrat}
                        onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm"
                        required={!formData.actif}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        La ressource sera automatiquement désactivée à partir de cette date.
                      </p>
                    </div>
                  )}
                </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleDelete(formData.id)}
                          className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 font-medium text-sm flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false)
                          setIsEditing(false)
                          setActiveTab('informations')
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
                          setCompetencesSelection(new Map())
                          setCompetencesPersonnalisees([{ nom: '', principale: false }])
                          setCompetenceFormRessourceId(null)
                        }}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 font-medium text-sm"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg font-semibold flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isEditing ? 'Enregistrer' : 'Créer'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Contenu de l'onglet Compétences */}
              {activeTab === 'competences' && (
                <div className="p-6 space-y-6">
                  {!isEditing ? (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">
                        Veuillez d'abord créer la ressource pour gérer ses compétences.
                      </p>
                    </div>
                  ) : (
                    <>
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
                                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-sm placeholder:text-gray-500"
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

                      {/* Boutons d'action compétences */}
                      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setCompetencesSelection(new Map())
                            setCompetencesPersonnalisees([{ nom: '', principale: false }])
                            setCompetenceFormRessourceId(null)
                            setActiveTab('informations')
                          }}
                          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 font-medium text-sm"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!competenceFormRessourceId && formData.id) {
                              setCompetenceFormRessourceId(formData.id)
                            }
                            await handleSubmitCompetences()
                            setActiveTab('informations')
                          }}
                          className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg font-semibold flex items-center gap-2 text-sm"
                        >
                          <Award className="w-4 h-4" />
                          Enregistrer les compétences
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
                      onClick={() => handleRowClick(ressource)}
                      className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
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
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
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
