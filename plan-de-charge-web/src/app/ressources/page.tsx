'use client'

import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, X, Award, Star, FileSpreadsheet, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImportExcel } from '@/components/Ressources/ImportExcel'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function RessourcesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true })
  const [showImport, setShowImport] = useState(false)
  
  // Mémoriser l'objet options pour useRessources
  const ressourcesOptions = useMemo(() => ({
    site: filters.site || undefined,
    actif: filters.actif,
  }), [filters.site, filters.actif])
  
  const { ressources, competences, loading, error, saveRessource, deleteRessource, saveCompetence, deleteCompetence, saveCompetencesBatch, loadRessources } =
    useRessources(ressourcesOptions)
  
  // Mémoriser l'objet options pour useSites
  const sitesOptions = useMemo(() => ({ actif: true }), [])
  
  // Charger les sites pour le select
  const { sites: sitesList, loading: sitesLoading } = useSites(sitesOptions)

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
        {/* En-tête moderne */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
              <Users className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Gestion des Ressources
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Créez et gérez les ressources et leurs compétences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={<FileSpreadsheet className="w-5 h-5" />} onClick={() => setShowImport(!showImport)}>
              {showImport ? 'Masquer import' : 'Importer Excel'}
            </Button>
            <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={handleNew} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              Nouvelle ressource
            </Button>
          </div>
        </div>

        {/* Import Excel */}
        {showImport && (
          <Card>
            <ImportExcel
              onImportComplete={() => {
                loadRessources()
                setShowImport(false)
              }}
            />
          </Card>
        )}

        {/* Filtres modernes */}
        <Card>
          <CardHeader gradient="green" icon={<Filter className="w-6 h-6 text-green-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Filtres</h2>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Site"
              value={filters.site}
              onChange={(e) => setFilters({ ...filters, site: e.target.value })}
              placeholder="Filtrer par site..."
              icon={<Search className="w-4 h-4" />}
            />
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-3 h-full">
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
        </Card>

        {/* Modal de création/modification */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardHeader gradient="green" className="mb-0">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {isEditing ? 'Modifier la ressource' : 'Nouvelle ressource'}
                    </h2>
                  </CardHeader>
                  <Button variant="ghost" size="sm" icon={<X className="w-5 h-5" />} onClick={() => {
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
                  }} />
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
                  <Input
                    label="Nom"
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                  <Select
                    label="Site"
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    required
                    disabled={sitesLoading}
                    options={[
                      { value: '', label: 'Sélectionner un site...' },
                      ...sitesList.map((site) => ({ value: site.site, label: site.site }))
                    ]}
                  />
                </div>

                {/* Deuxième ligne : Type contrat et Responsable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Type de contrat"
                    value={formData.type_contrat}
                    onChange={(e) => setFormData({ ...formData, type_contrat: e.target.value })}
                    options={[
                      { value: '', label: 'Sélectionner...' },
                      { value: 'CDI', label: 'CDI' },
                      { value: 'CDD', label: 'CDD' },
                      { value: 'ETT', label: 'ETT' },
                      { value: 'Interim', label: 'Intérim' }
                    ]}
                  />
                  <Input
                    label="Responsable"
                    type="text"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    placeholder="Nom du responsable"
                  />
                </div>

                {/* Troisième ligne : Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Date début contrat"
                    type="date"
                    value={formData.date_debut_contrat}
                    onChange={(e) => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                  />
                  <Input
                    label="Date fin contrat"
                    type="date"
                    value={formData.date_fin_contrat}
                    onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                  />
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
                        <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(formData.id)}>
                          Supprimer
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => {
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
                      }}>
                        Annuler
                      </Button>
                      <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                        {isEditing ? 'Enregistrer' : 'Créer'}
                      </Button>
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
                        <Button variant="ghost" size="sm" onClick={() => {
                          setCompetencesSelection(new Map())
                          setCompetencesPersonnalisees([{ nom: '', principale: false }])
                          setCompetenceFormRessourceId(null)
                          setActiveTab('informations')
                        }}>
                          Annuler
                        </Button>
                        <Button variant="primary" size="sm" icon={<Award className="w-4 h-4" />} onClick={async () => {
                          if (!competenceFormRessourceId && formData.id) {
                            setCompetenceFormRessourceId(formData.id)
                          }
                          await handleSubmitCompetences()
                          setActiveTab('informations')
                        }} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                          Enregistrer les compétences
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Liste des ressources */}
        <Card>
          <CardHeader gradient="green" icon={<Users className="w-6 h-6 text-green-600" />}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-2xl font-bold text-gray-800">Liste des ressources</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                {ressources.length}
              </span>
            </div>
          </CardHeader>

          {loading ? (
            <Loading message="Chargement des ressources..." />
          ) : error ? (
            <Card>
              <div className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <p className="text-red-800 font-semibold">Erreur: {error.message}</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contrat
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actif
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ressources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucune ressource trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ressources.map((ressource) => (
                      <tr 
                        key={ressource.id} 
                        className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleRowClick(ressource)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {ressource.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ressource.site}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ressource.type_contrat || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ressource.responsable || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ressource.actif ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
