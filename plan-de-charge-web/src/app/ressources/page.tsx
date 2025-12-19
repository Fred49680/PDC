'use client'

import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { useInterims } from '@/hooks/useInterims'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, X, Award, Star, FileSpreadsheet, Filter, Briefcase, RefreshCw, Calendar, User, Building2, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImportExcel } from '@/components/Ressources/ImportExcel'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { businessDaysBetween } from '@/utils/calendar'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function RessourcesPage() {
  const [filters, setFilters] = useState({ site: '', actif: true, type_contrat: '' })
  const [showImport, setShowImport] = useState(false)
  const [activeCategoryTab, setActiveCategoryTab] = useState<'tous' | 'CDI' | 'Intérim' | 'APP' | 'Sous-traitance'>('tous')
  
  // Mémoriser l'objet options pour useRessources
  const ressourcesOptions = useMemo(() => ({
    site: filters.site || undefined,
    actif: filters.actif,
    type_contrat: activeCategoryTab !== 'tous' 
      ? (activeCategoryTab === 'Intérim' ? 'ETT' : activeCategoryTab)
      : undefined,
  }), [filters.site, filters.actif, activeCategoryTab])
  
  const { ressources, competences, loading, error, saveRessource, deleteRessource, saveCompetence, deleteCompetence, saveCompetencesBatch, loadRessources } =
    useRessources(ressourcesOptions)
  
  // Charger toutes les ressources pour le comptage (sans filtre type_contrat)
  const { ressources: allRessources } = useRessources({ 
    actif: filters.actif, 
    site: filters.site || undefined,
    enableRealtime: false // Pas besoin de Realtime pour le comptage
  })
  
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

  // ===== ÉTATS POUR LA GESTION DES INTÉRIMS (onglet Intérim) =====
  const [interimsFilters, setInterimsFilters] = useState({ site: '', aRenouveler: '' })
  const [interimsSearchTerm, setInterimsSearchTerm] = useState('')
  const [isEditingInterim, setIsEditingInterim] = useState(false)
  const [showInterimModal, setShowInterimModal] = useState(false)
  const [interimFormData, setInterimFormData] = useState({
    id: '',
    ressource_id: '',
    site: '',
    date_debut_contrat: format(new Date(), 'yyyy-MM-dd'),
    date_fin_contrat: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    a_renouveler: 'A renouveler',
    commentaire: '',
  })

  // Mémoriser l'objet options pour useInterims
  const interimsOptions = useMemo(() => ({
    site: interimsFilters.site || undefined,
    aRenouveler: interimsFilters.aRenouveler || undefined,
  }), [interimsFilters.site, interimsFilters.aRenouveler])

  // Charger les intérims uniquement si l'onglet Intérim est actif
  const { 
    interims, 
    loading: interimsLoading, 
    error: interimsError, 
    createInterim, 
    updateInterim, 
    deleteInterim, 
    refresh: refreshInterims,
    verifierEtMettreAJourRenouvellements,
    desactiverInterimsExpires,
    initialiserInterims,
  } = useInterims(activeCategoryTab === 'Intérim' ? interimsOptions : { site: undefined, aRenouveler: undefined })

  // Charger toutes les ressources ETT pour la liste déroulante (seulement si onglet Intérim actif)
  const { ressources: ressourcesETT } = useRessources(
    activeCategoryTab === 'Intérim' ? { type_contrat: 'ETT', actif: true } : { type_contrat: undefined, actif: true }
  )

  // Normaliser la valeur du site dans formData une fois que les sites sont chargés
  useEffect(() => {
    if (!sitesLoading && sitesList.length > 0 && formData.site && isEditing) {
      // Vérifier si la valeur du site correspond exactement à une des options
      const siteValues = sitesList.map(s => s.site?.trim() || '')
      const currentSite = formData.site.trim()
      
      // Si la valeur n'est pas dans la liste, chercher une correspondance (insensible à la casse)
      if (!siteValues.includes(currentSite)) {
        const matchingSite = sitesList.find(s => s.site?.trim().toLowerCase() === currentSite.toLowerCase())
        if (matchingSite) {
          setFormData(prev => ({ ...prev, site: matchingSite.site.trim() }))
        } else {
          // Si toujours pas de correspondance, essayer de trouver via la ressource
          if (formData.ressource_id) {
            const ressource = ressourcesETT.find(r => r.id === formData.ressource_id)
            if (ressource && ressource.site) {
              const matchingSiteFromRessource = sitesList.find(s => {
                const siteFromList = s.site?.trim() || ''
                const siteFromRessource = ressource.site.trim()
                return siteFromList.toLowerCase() === siteFromRessource.toLowerCase()
              })
              if (matchingSiteFromRessource) {
                setFormData(prev => ({ ...prev, site: matchingSiteFromRessource.site.trim() }))
              }
            }
          }
        }
      } else if (formData.site !== currentSite) {
        // Normaliser en enlevant les espaces si nécessaire
        setFormData(prev => ({ ...prev, site: currentSite }))
      }
    }
  }, [sitesLoading, sitesList, isEditing, formData.site, formData.ressource_id, ressourcesETT])

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
      site: ressource.site ? ressource.site.trim() : '',
      type_contrat: ressource.type_contrat === 'ETT' ? 'ETT' : (ressource.type_contrat || ''),
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
      site: ressource.site ? ressource.site.trim() : '',
      type_contrat: ressource.type_contrat === 'ETT' ? 'ETT' : (ressource.type_contrat || ''),
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Gestion des Ressources
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Créez et gérez les ressources et leurs compétences</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="secondary" icon={<FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />} onClick={() => setShowImport(!showImport)} className="text-xs sm:text-sm px-3 sm:px-4 py-2">
              <span className="hidden sm:inline">{showImport ? 'Masquer import' : 'Importer Excel'}</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button variant="primary" icon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />} onClick={handleNew} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xs sm:text-sm px-3 sm:px-4 py-2">
              <span className="hidden sm:inline">Nouvelle ressource</span>
              <span className="sm:hidden">Nouvelle</span>
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

        {/* Catégories et Filtres regroupés */}
        <Card>
          {/* Catégories et Filtres sur une même ligne */}
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de catégories */}
              <button
                onClick={() => setActiveCategoryTab('tous')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeCategoryTab === 'tous'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({allRessources.length})
              </button>
              <button
                onClick={() => setActiveCategoryTab('CDI')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeCategoryTab === 'CDI'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CDI ({allRessources.filter(r => r.type_contrat === 'CDI').length})
              </button>
              <button
                onClick={() => setActiveCategoryTab('Intérim')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeCategoryTab === 'Intérim'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Intérim ({allRessources.filter(r => r.type_contrat === 'ETT').length})
              </button>
              <button
                onClick={() => setActiveCategoryTab('APP')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeCategoryTab === 'APP'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                APP ({allRessources.filter(r => r.type_contrat === 'APP').length})
              </button>
              <button
                onClick={() => setActiveCategoryTab('Sous-traitance')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeCategoryTab === 'Sous-traitance'
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Sous-traitance</span>
                <span className="sm:hidden">Sous-trait.</span> ({allRessources.filter(r => r.type_contrat === 'Sous-traitance').length})
              </button>

              {/* Séparateur visuel - masqué sur très petits écrans */}
              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              {/* Filtres */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Site:</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={filters.site}
                    onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                    placeholder="Filtrer par site..."
                    className="pl-8 pr-2 sm:pr-3 py-1.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-400 w-36 sm:w-48"
                  />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="checkbox"
                    id="actifFilter"
                    checked={filters.actif}
                    onChange={(e) => setFilters({ ...filters, actif: e.target.checked })}
                    className="w-4 h-4 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                  <label htmlFor="actifFilter" className="text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                    <span className="hidden sm:inline">Actives uniquement</span>
                    <span className="sm:hidden">Actives</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Modal de création/modification */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="max-w-4xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardHeader gradient="green" className="mb-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
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
                      ...sitesList.map((site) => ({ value: site.site?.trim() || '', label: site.site?.trim() || '' }))
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
                      { value: 'ETT', label: 'Intérim' },
                      { value: 'APP', label: 'APP' },
                      { value: 'Sous-traitance', label: 'Sous-traitance' }
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
            </Card>
          </div>
        )}

        {/* Affichage conditionnel : Gestion des intérims OU Liste des ressources */}
        {activeCategoryTab === 'Intérim' ? (
          <InterimsManagement
            interims={interims}
            loading={interimsLoading}
            error={interimsError}
            filters={interimsFilters}
            setFilters={setInterimsFilters}
            searchTerm={interimsSearchTerm}
            setSearchTerm={setInterimsSearchTerm}
            sitesList={sitesList}
            ressourcesETT={ressourcesETT}
            isEditing={isEditingInterim}
            setIsEditing={setIsEditingInterim}
            showModal={showInterimModal}
            setShowModal={setShowInterimModal}
            formData={interimFormData}
            setFormData={setInterimFormData}
            createInterim={createInterim}
            updateInterim={updateInterim}
            deleteInterim={deleteInterim}
            verifierEtMettreAJourRenouvellements={verifierEtMettreAJourRenouvellements}
            desactiverInterimsExpires={desactiverInterimsExpires}
            initialiserInterims={initialiserInterims}
          />
        ) : (
          <>
            {/* Liste des ressources */}
            <Card>
              <CardHeader gradient="green" icon={<Users className="w-6 h-6 text-green-600" />}>
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Liste des ressources
                    {activeCategoryTab !== 'tous' && (
                      <span className="ml-3 text-lg font-normal text-gray-600">
                        ({activeCategoryTab})
                      </span>
                    )}
                  </h2>
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
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                      Site
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contrat
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      Responsable
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                      Actif
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ressources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 sm:px-6 sm:py-12 text-center">
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
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {ressource.nom}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                          {ressource.site}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {ressource.type_contrat === 'ETT' ? 'Intérim' : (ressource.type_contrat || '-')}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                          {ressource.responsable || '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                          {ressource.actif ? (
                            <span className="px-2 py-1 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
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
          </>
        )}
      </div>
    </Layout>
  )
}

// ===== COMPOSANT DE GESTION DES INTÉRIMS =====
interface InterimsManagementProps {
  interims: any[]
  loading: boolean
  error: Error | null
  filters: { site: string; aRenouveler: string }
  setFilters: (filters: { site: string; aRenouveler: string }) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  sitesList: any[]
  ressourcesETT: any[]
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  showModal: boolean
  setShowModal: (show: boolean) => void
  formData: {
    id: string
    ressource_id: string
    site: string
    date_debut_contrat: string
    date_fin_contrat: string
    a_renouveler: string
    commentaire: string
  }
  setFormData: (data: any) => void
  createInterim: (data: any) => Promise<any>
  updateInterim: (id: string, data: any) => Promise<any>
  deleteInterim: (id: string) => Promise<void>
  verifierEtMettreAJourRenouvellements: () => Promise<{ updated: number; alertsCreated: number }>
  desactiverInterimsExpires: () => Promise<{ desactivated: number }>
  initialiserInterims: () => Promise<{ created: number; updated: number }>
}

function InterimsManagement({
  interims,
  loading,
  error,
  filters,
  setFilters,
  searchTerm,
  setSearchTerm,
  sitesList,
  ressourcesETT,
  isEditing,
  setIsEditing,
  showModal,
  setShowModal,
  formData,
  setFormData,
  createInterim,
  updateInterim,
  deleteInterim,
  verifierEtMettreAJourRenouvellements,
  desactiverInterimsExpires,
  initialiserInterims,
}: InterimsManagementProps) {
  // Filtrer les intérims par terme de recherche
  const interimsFiltres = useMemo(() => {
    let filtered = interims as any[]

    // Filtre par terme de recherche (nom de ressource)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((interim: any) => {
        const ressourceNom = interim.ressource?.nom?.toLowerCase() || ''
        return ressourceNom.includes(searchLower)
      })
    }

    return filtered
  }, [interims, searchTerm])

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = interims.length
    const aRenouveler = interims.filter((i: any) => i.a_renouveler === 'A renouveler').length
    const renouveles = interims.filter((i: any) => i.a_renouveler === 'Oui' || i.a_renouveler === 'oui').length
    const nonRenouveles = interims.filter((i: any) => i.a_renouveler === 'Non' || i.a_renouveler === 'non').length
    
    // Compter ceux qui expirent dans les 10 prochains jours ouvrés
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expirentBientot = interims.filter((i: any) => {
      const dateFin = new Date(i.date_fin_contrat)
      dateFin.setHours(0, 0, 0, 0)
      const joursRestants = businessDaysBetween(today, dateFin)
      return joursRestants <= 10 && joursRestants >= 0 && i.a_renouveler !== 'Oui' && i.a_renouveler !== 'oui'
    }).length

    return { total, aRenouveler, renouveles, nonRenouveles, expirentBientot }
  }, [interims])

  // Vérification automatique au chargement
  useEffect(() => {
    const verifierAutomatiquement = async () => {
      try {
        await verifierEtMettreAJourRenouvellements()
        await desactiverInterimsExpires()
      } catch (err) {
        console.error('[InterimsManagement] Erreur vérification automatique:', err)
      }
    }

    // Vérifier toutes les 5 minutes
    verifierAutomatiquement()
    const interval = setInterval(verifierAutomatiquement, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [verifierEtMettreAJourRenouvellements, desactiverInterimsExpires])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation côté client
    if (!formData.ressource_id || formData.ressource_id.trim() === '') {
      alert('Veuillez sélectionner une ressource')
      return
    }
    
    if (!formData.site || formData.site.trim() === '') {
      alert('Le site est requis')
      return
    }
    
    if (!formData.date_debut_contrat || !formData.date_fin_contrat) {
      alert('Les dates de début et de fin sont requises')
      return
    }

    const dateDebut = new Date(formData.date_debut_contrat)
    const dateFin = new Date(formData.date_fin_contrat)

    if (dateFin < dateDebut) {
      alert('La date de fin doit être postérieure à la date de début')
      return
    }
    
    try {
      if (isEditing) {
        await updateInterim(formData.id, {
          site: formData.site.trim(),
          date_debut_contrat: dateDebut,
          date_fin_contrat: dateFin,
          a_renouveler: formData.a_renouveler,
          commentaire: formData.commentaire.trim() || undefined,
        })
      } else {
        await createInterim({
          ressource_id: formData.ressource_id.trim(),
          site: formData.site.trim(),
          date_debut_contrat: dateDebut,
          date_fin_contrat: dateFin,
          a_renouveler: formData.a_renouveler,
          commentaire: formData.commentaire.trim() || undefined,
        })
      }
      
      // Réinitialiser le formulaire
      setFormData({
        id: '',
        ressource_id: '',
        site: '',
        date_debut_contrat: format(new Date(), 'yyyy-MM-dd'),
        date_fin_contrat: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        a_renouveler: 'A renouveler',
        commentaire: '',
      })
      setIsEditing(false)
      setShowModal(false)
    } catch (err) {
      console.error('[InterimsManagement] Erreur sauvegarde:', err)
      alert('Erreur lors de la sauvegarde de l\'intérim')
    }
  }

  const handleEdit = (interim: any) => {
    // Normaliser le site en cherchant dans sitesList
    let normalizedSite = interim.site || ''
    
    if (normalizedSite && sitesList.length > 0) {
      // Chercher une correspondance exacte (insensible à la casse et aux espaces)
      const matchingSite = sitesList.find(s => {
        const siteFromList = s.site?.trim() || ''
        const siteFromInterim = normalizedSite.trim()
        return siteFromList.toLowerCase() === siteFromInterim.toLowerCase()
      })
      
      if (matchingSite) {
        normalizedSite = matchingSite.site.trim()
      } else {
        // Si pas de correspondance, essayer de trouver par ressource
        const ressource = ressourcesETT.find(r => r.id === interim.ressource_id)
        if (ressource && ressource.site) {
          const matchingSiteFromRessource = sitesList.find(s => {
            const siteFromList = s.site?.trim() || ''
            const siteFromRessource = ressource.site.trim()
            return siteFromList.toLowerCase() === siteFromRessource.toLowerCase()
          })
          if (matchingSiteFromRessource) {
            normalizedSite = matchingSiteFromRessource.site.trim()
          }
        }
      }
    }
    
    console.log('[handleEdit] Interim site:', interim.site, '-> Normalisé:', normalizedSite)
    
    setFormData({
      id: interim.id,
      ressource_id: interim.ressource_id,
      site: normalizedSite,
      date_debut_contrat: format(new Date(interim.date_debut_contrat), 'yyyy-MM-dd'),
      date_fin_contrat: format(new Date(interim.date_fin_contrat), 'yyyy-MM-dd'),
      a_renouveler: interim.a_renouveler || 'A renouveler',
      commentaire: interim.commentaire || '',
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDelete = async (interimId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet intérim ?')) {
      try {
        await deleteInterim(interimId)
      } catch (err) {
        console.error('[InterimsManagement] Erreur suppression:', err)
        alert('Erreur lors de la suppression de l\'intérim')
      }
    }
  }

  const handleRessourceChange = (selectedRessourceId: string) => {
    const selectedRessource = ressourcesETT.find(r => r.id === selectedRessourceId)
    if (selectedRessource) {
      setFormData({
        ...formData,
        ressource_id: selectedRessourceId,
        site: selectedRessource.site,
      })
    }
  }

  const getStatutColor = (aRenouveler: string): string => {
    switch (aRenouveler) {
      case 'Oui':
      case 'oui':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'Non':
      case 'non':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'A renouveler':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getJoursRestants = (dateFin: Date): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateFinNorm = new Date(dateFin)
    dateFinNorm.setHours(0, 0, 0, 0)
    return businessDaysBetween(today, dateFinNorm)
  }

  const handleVerificationManuelle = async () => {
    try {
      const result = await verifierEtMettreAJourRenouvellements()
      alert(`${result.updated} intérim(s) mis à jour, ${result.alertsCreated} alerte(s) créée(s)`)
    } catch (err) {
      console.error('[InterimsManagement] Erreur vérification manuelle:', err)
      alert('Erreur lors de la vérification')
    }
  }

  const handleInitialiserInterims = async () => {
    if (!confirm('Voulez-vous initialiser les intérims depuis les ressources ETT ?\n\nCette opération créera une entrée dans la table interims pour chaque ressource avec type_contrat=\'ETT\'.')) {
      return
    }

    try {
      const result = await initialiserInterims()
      alert(`${result.created} intérim(s) créé(s), ${result.updated} intérim(s) mis à jour`)
    } catch (err) {
      console.error('[InterimsManagement] Erreur initialisation:', err)
      alert('Erreur lors de l\'initialisation des intérims')
    }
  }

  if (loading) {
    return <Loading message="Chargement des intérims..." />
  }

  if (error) {
    return (
      <Card>
        <div className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800 font-medium">
              Erreur lors du chargement des intérims : {error.message}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Gestion des Intérims</h1>
            <p className="text-purple-100">
              {stats.total} intérim(s) au total • {stats.aRenouveler} à renouveler • {stats.expirentBientot} expire(nt) bientôt
            </p>
          </div>
          <Briefcase className="w-16 h-16 text-white/80" />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">À renouveler</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.aRenouveler}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Renouvelés</p>
                <p className="text-2xl font-bold text-green-800">{stats.renouveles}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Expirent bientôt</p>
                <p className="text-2xl font-bold text-orange-800">{stats.expirentBientot}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Actions et filtres */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par nom de ressource..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select
              value={filters.site}
              onChange={(e) => setFilters({ ...filters, site: e.target.value })}
              className="w-full sm:w-48"
              options={[
                { value: '', label: 'Tous les sites' },
                ...sitesList.map((site) => ({
                  value: site.site,
                  label: site.site,
                })),
              ]}
            />
            <Select
              value={filters.aRenouveler}
              onChange={(e) => setFilters({ ...filters, aRenouveler: e.target.value })}
              className="w-full sm:w-48"
              options={[
                { value: '', label: 'Tous les statuts' },
                { value: 'A renouveler', label: 'À renouveler' },
                { value: 'Oui', label: 'Renouvelé' },
                { value: 'Non', label: 'Non renouvelé' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            {interims.length === 0 && ressourcesETT.length > 0 && (
              <Button
                onClick={handleInitialiserInterims}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Initialiser les intérims ({ressourcesETT.length})
              </Button>
            )}
            <Button
              onClick={handleVerificationManuelle}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Vérifier
            </Button>
            <Button
              onClick={() => {
                setFormData({
                  id: '',
                  ressource_id: '',
                  site: '',
                  date_debut_contrat: format(new Date(), 'yyyy-MM-dd'),
                  date_fin_contrat: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                  a_renouveler: 'A renouveler',
                  commentaire: '',
                })
                setIsEditing(false)
                setShowModal(true)
              }}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel intérim
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des intérims */}
      <div className="space-y-4">
        {interimsFiltres.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Aucun intérim trouvé</p>
          </div>
        ) : (
          interimsFiltres.map((interim: any) => {
            const joursRestants = getJoursRestants(new Date(interim.date_fin_contrat))
            const estExpire = joursRestants < 0
            const expireBientot = joursRestants <= 10 && joursRestants >= 0

            return (
              <div
                key={interim.id}
                className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-200 ${
                  estExpire ? 'border-red-300 bg-red-50/50' : 
                  expireBientot ? 'border-yellow-300 bg-yellow-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`px-3 py-1 rounded-lg border ${getStatutColor(interim.a_renouveler)}`}>
                      <span className="text-xs font-semibold">
                        {interim.a_renouveler || 'Non défini'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {interim.ressource?.nom || 'Ressource inconnue'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{interim.site}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Du {format(new Date(interim.date_debut_contrat), 'dd/MM/yyyy', { locale: fr })} au {format(new Date(interim.date_fin_contrat), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className={estExpire ? 'text-red-600 font-semibold' : expireBientot ? 'text-yellow-600 font-semibold' : ''}>
                            {estExpire 
                              ? `Expiré depuis ${Math.abs(joursRestants)} jour(s) ouvré(s)`
                              : expireBientot
                              ? `${joursRestants} jour(s) ouvré(s) restant(s)`
                              : `${joursRestants} jour(s) ouvré(s) restant(s)`
                            }
                          </span>
                        </div>
                        {interim.ressource && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className={interim.ressource.actif ? 'text-green-600' : 'text-red-600'}>
                              {interim.ressource.actif ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        )}
                      </div>
                      {interim.commentaire && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                          {interim.commentaire}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(interim)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier l'intérim"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(interim.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer l'intérim"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Modifier l\'intérim' : 'Nouvel intérim'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setIsEditing(false)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <Select
                  label="Ressource *"
                  value={formData.ressource_id}
                  onChange={(e) => handleRessourceChange(e.target.value)}
                  required
                  className="w-full"
                  options={[
                    { value: '', label: 'Sélectionner une ressource' },
                    ...ressourcesETT
                      .filter(r => r.type_contrat === 'ETT')
                      .map((ressource) => ({
                        value: ressource.id,
                        label: `${ressource.nom} (${ressource.site})`,
                      })),
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Site *"
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  required
                  className="w-full"
                  options={[
                    { value: '', label: 'Sélectionner un site' },
                    ...sitesList.map((site) => ({
                      value: site.site,
                      label: site.site,
                    })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <Input
                    type="date"
                    value={formData.date_debut_contrat}
                    onChange={(e) => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de fin *
                  </label>
                  <Input
                    type="date"
                    value={formData.date_fin_contrat}
                    onChange={(e) => setFormData({ ...formData, date_fin_contrat: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Statut renouvellement"
                  value={formData.a_renouveler}
                  onChange={(e) => setFormData({ ...formData, a_renouveler: e.target.value })}
                  className="w-full"
                  options={[
                    { value: 'A renouveler', label: 'A renouveler' },
                    { value: 'Oui', label: 'Oui' },
                    { value: 'Non', label: 'Non' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commentaire
                </label>
                <textarea
                  value={formData.commentaire}
                  onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                >
                  {isEditing ? 'Modifier' : 'Créer'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setIsEditing(false)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
