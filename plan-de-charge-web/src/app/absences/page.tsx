'use client'

import { useState, useMemo, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAbsences } from '@/hooks/useAbsences'
import { useRessources } from '@/hooks/useRessources'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Plus, Trash2, Search, AlertCircle, X, CheckCircle2, Filter, Clock, Archive } from 'lucide-react'
import type { Absence } from '@/types/absences'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function AbsencesPage() {
  const [ressourceId, setRessourceId] = useState('')
  const [site, setSite] = useState('')
  const [showCloturees, setShowCloturees] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  
  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Mémoriser l'objet options pour éviter les re-renders infinis
  const absenceOptions = useMemo(() => ({
    ressourceId,
    site,
  }), [ressourceId, site])
  
  const { absences, loading, error, saveAbsence, deleteAbsence, refresh } = useAbsences(absenceOptions)

  // Charger toutes les ressources pour la liste déroulante
  const { ressources, competences: ressourcesCompetences } = useRessources()

  // Charger tous les types d'absences existants
  const [typesAbsences, setTypesAbsences] = useState<string[]>([])
  
  useEffect(() => {
    const loadTypesAbsences = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('absences')
          .select('type')
          .not('type', 'is', null)
        
        if (error) throw error
        
        // Extraire les types uniques (normalisés en MAJUSCULE pour éviter les doublons)
        const typesSet = new Set<string>()
        ;(data || []).forEach((item) => {
          if (item.type && item.type.trim()) {
            typesSet.add(item.type.trim().toUpperCase())
          }
        })
        
        // Types par défaut (en MAJUSCULE pour éviter les doublons)
        const defaultTypes = [
          'FORMATION',
          'CONGES PAYES',
          'MALADIE',
          'PATERNITE',
          'MATERNITE',
          'CONGE PARENTAL',
          'AUTRE'
        ]
        
        // Fusionner les types par défaut avec ceux de la base
        defaultTypes.forEach(type => typesSet.add(type))
        
        const typesList = Array.from(typesSet).sort()
        setTypesAbsences(typesList)
      } catch (err) {
        console.error('[AbsencesPage] Erreur chargement types absences:', err)
        // En cas d'erreur, utiliser les types par défaut (en MAJUSCULE)
        setTypesAbsences([
          'FORMATION',
          'CONGES PAYES',
          'MALADIE',
          'PATERNITE',
          'MATERNITE',
          'CONGE PARENTAL',
          'AUTRE'
        ])
      }
    }
    
    loadTypesAbsences()
  }, [])

  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isCustomType, setIsCustomType] = useState(false)
  const [customType, setCustomType] = useState('')
  const [formData, setFormData] = useState({
    id: '',
    ressource_id: '',
    site: '',
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    date_fin: format(new Date(), 'yyyy-MM-dd'),
      type: 'CONGES PAYES',
    competence: '',
    commentaire: '',
    statut: 'Actif' as 'Actif' | 'Clôturé',
    type_arret_maladie: '' as 'Initial' | 'Prolongation' | '',
  })

  // Fonction pour récupérer la compétence principale d'une ressource
  const getPrincipaleCompetence = (ressourceId: string): string => {
    const resCompetences = ressourcesCompetences.get(ressourceId) || []
    const principale = resCompetences.find(c => c.type_comp === 'P')
    return principale ? principale.competence : ''
  }

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setIsCustomType(false)
    setCustomType('')
    setFormData({
      id: '',
      ressource_id: '',
      site: '',
      date_debut: format(new Date(), 'yyyy-MM-dd'),
      date_fin: format(new Date(), 'yyyy-MM-dd'),
      type: 'CONGES PAYES',
      competence: '',
      commentaire: '',
      statut: 'Actif',
      type_arret_maladie: '',
    })
  }

  // Handler quand une ressource est sélectionnée
  const handleRessourceChange = (selectedRessourceId: string) => {
    const selectedRessource = ressources.find(r => r.id === selectedRessourceId)
    if (selectedRessource) {
      const principaleComp = getPrincipaleCompetence(selectedRessourceId)
      setFormData({
        ...formData,
        ressource_id: selectedRessourceId,
        site: selectedRessource.site,
        competence: principaleComp,
      })
    }
  }

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
    
    if (!formData.date_debut || !formData.date_fin) {
      alert('Les dates de début et de fin sont requises')
      return
    }
    
    // Validation du type personnalisé
    if (isCustomType && (!customType || !customType.trim())) {
      alert('Veuillez saisir un type d\'absence')
      return
    }
    
    try {
      // Normaliser en MAJUSCULE le type d'absence
      const typeNormalise = (isCustomType ? customType.trim() : formData.type.trim()).toUpperCase()
      
      // Préparer les données pour Supabase
      const absenceData: Partial<Absence> = {
        ressource_id: formData.ressource_id.trim(),
        site: formData.site.trim().toUpperCase(),
        date_debut: formData.date_debut, // Format ISO déjà (YYYY-MM-DD)
        date_fin: formData.date_fin, // Format ISO déjà (YYYY-MM-DD)
        type: typeNormalise,
        competence: formData.competence && formData.competence.trim() !== '' ? formData.competence.trim().toUpperCase() : null,
        commentaire: formData.commentaire && formData.commentaire.trim() !== '' ? formData.commentaire.trim() : null,
        validation_saisie: 'Non' as const,
        date_saisie: new Date().toISOString(),
        statut: formData.statut,
        // Type d'arrêt maladie : seulement si c'est un arrêt maladie
        type_arret_maladie: (typeNormalise.includes('MALADIE') || typeNormalise.includes('ARRÊT') || typeNormalise.includes('ARRET')) 
          && formData.type_arret_maladie !== '' 
          ? formData.type_arret_maladie as 'Initial' | 'Prolongation' 
          : null,
      }

      // Si c'est une modification, inclure l'id
      if (isEditing && formData.id && formData.id.trim() !== '') {
        absenceData.id = formData.id.trim()
      }

      await saveAbsence(absenceData)
      
      // Si c'est un nouveau type, l'ajouter à la liste des types disponibles (en MAJUSCULE)
      if (isCustomType && customType.trim() && !typesAbsences.includes(customType.trim().toUpperCase())) {
        setTypesAbsences(prev => [...prev, customType.trim().toUpperCase()].sort())
      }
      
      // Fermer le modal et réinitialiser
      setShowModal(false)
      setIsEditing(false)
      resetForm()
      await refresh()
    } catch (err: unknown) {
      console.error('[AbsencesPage] Erreur complète:', err)
      // Afficher un message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de la sauvegarde'
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message)
      } else if (err && typeof err === 'object' && 'error' in err && err.error && typeof err.error === 'object' && 'message' in err.error) {
        errorMessage = String(err.error.message)
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      alert(`Erreur: ${errorMessage}\n\nVérifiez que tous les champs requis sont remplis.`)
    }
  }

  const handleNew = () => {
    setIsEditing(false)
    resetForm()
    setShowModal(true)
  }

  const handleRowClick = (absence: Absence) => {
    setIsEditing(true)
    // Vérifier si le type existe dans la liste, sinon activer le mode custom
    const typeExists = typesAbsences.includes(absence.type)
    setIsCustomType(!typeExists)
    setCustomType(!typeExists ? absence.type : '')
    setFormData({
      id: absence.id,
      ressource_id: absence.ressource_id,
      site: absence.site,
      date_debut: format(new Date(absence.date_debut), 'yyyy-MM-dd'),
      date_fin: format(new Date(absence.date_fin), 'yyyy-MM-dd'),
      type: absence.type,
      competence: absence.competence || '',
      commentaire: absence.commentaire || '',
      statut: absence.statut || 'Actif',
      type_arret_maladie: absence.type_arret_maladie || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (absenceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) {
      try {
        await deleteAbsence(absenceId)
        if (isEditing && formData.id === absenceId) {
          setShowModal(false)
          setIsEditing(false)
        }
      } catch (err) {
        console.error('[AbsencesPage] Erreur suppression:', err)
      }
    }
  }

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = absences.length
    const actives = absences.filter(a => a.statut === 'Actif' || !a.statut).length
    const cloturees = absences.filter(a => a.statut === 'Clôturé').length
    
    // Compter les absences en cours (date aujourd'hui entre date_debut et date_fin)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const enCours = absences.filter(a => {
      const dateDebut = new Date(a.date_debut)
      dateDebut.setHours(0, 0, 0, 0)
      const dateFin = new Date(a.date_fin)
      dateFin.setHours(0, 0, 0, 0)
      return (a.statut === 'Actif' || !a.statut) && dateDebut <= today && dateFin >= today
    }).length

    return { total, actives, cloturees, enCours }
  }, [absences])

  // Filtrer les absences selon le toggle et la recherche
  const filteredAbsences = useMemo(() => {
    let filtered = absences

    // Filtre par statut (clôturées ou non)
    if (!showCloturees) {
      filtered = filtered.filter(a => a.statut !== 'Clôturé')
    }

    // Filtre par recherche
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.trim().toUpperCase()
      filtered = filtered.filter(absence => {
        // Trouver le nom de la ressource
        const ressource = ressources.find(r => r.id === absence.ressource_id)
        const ressourceNom = ressource ? ressource.nom.toUpperCase() : absence.ressource_id.toUpperCase()
        
        return (
          ressourceNom.includes(query) ||
          absence.site.toUpperCase().includes(query) ||
          absence.type.toUpperCase().includes(query) ||
          (absence.competence && absence.competence.toUpperCase().includes(query)) ||
          (absence.commentaire && absence.commentaire.toUpperCase().includes(query)) ||
          format(new Date(absence.date_debut), 'dd/MM/yyyy', { locale: fr }).includes(query) ||
          format(new Date(absence.date_fin), 'dd/MM/yyyy', { locale: fr }).includes(query) ||
          (absence.statut && absence.statut.toUpperCase().includes(query)) ||
          (absence.type_arret_maladie && absence.type_arret_maladie.toUpperCase().includes(query))
        )
      })
    }

    return filtered
  }, [absences, showCloturees, debouncedSearchQuery, ressources])

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800 font-medium">
              Erreur lors du chargement des absences : {error.message}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête moderne */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <Calendar className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Gestion des Absences
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
                {stats.total} absence(s) au total • {stats.actives} active(s) • {stats.cloturees} clôturée(s) • {stats.enCours} en cours
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques - Vignettes sur une ligne */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-lg flex-1 min-w-[120px] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium leading-tight">Total</p>
                <p className="text-base font-bold text-purple-800 leading-tight">{stats.total}</p>
              </div>
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl shadow-lg flex-1 min-w-[120px] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium leading-tight">Actives</p>
                <p className="text-base font-bold text-green-800 leading-tight">{stats.actives}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl shadow-lg flex-1 min-w-[120px] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium leading-tight">Clôturées</p>
                <p className="text-base font-bold text-gray-800 leading-tight">{stats.cloturees}</p>
              </div>
              <Archive className="w-4 h-4 text-gray-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-lg flex-1 min-w-[120px] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium leading-tight">En cours</p>
                <p className="text-base font-bold text-blue-800 leading-tight">{stats.enCours}</p>
              </div>
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
            </div>
          </div>

          {/* Toggle pour afficher les absences clôturées */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 px-4 py-2.5">
            <span className="text-sm text-gray-600 whitespace-nowrap">Afficher clôturées</span>
            <button
              type="button"
              role="switch"
              aria-checked={showCloturees}
              onClick={() => setShowCloturees(!showCloturees)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                showCloturees ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showCloturees ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions et filtres - Ligne compacte - STICKY */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Input
              type="text"
              placeholder="Filtrer par ressource..."
              value={ressourceId}
              onChange={(e) => setRessourceId(e.target.value)}
              className="w-auto min-w-[140px] h-9 text-sm"
            />
            <Input
              type="text"
              placeholder="Filtrer par site..."
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="w-auto min-w-[140px] h-9 text-sm"
            />
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleNew}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white h-9 px-3 text-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nouveau
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des absences */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 overflow-hidden">

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 sticky top-0 z-0">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ressource</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Site</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date début</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date fin</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Statut</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Type arrêt</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Commentaire</th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAbsences.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Calendar className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-500 font-medium">
                              {absences.length === 0 
                                ? "Aucune absence trouvée" 
                                : "Aucune absence ne correspond à votre recherche"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAbsences.map((absence) => {
                      // Trouver le nom de la ressource
                      const ressource = ressources.find(r => r.id === absence.ressource_id)
                      const ressourceNom = ressource ? ressource.nom : absence.ressource_id
                      const isArretMaladie = absence.type.toUpperCase().includes('MALADIE') || absence.type.toUpperCase().includes('ARRÊT') || absence.type.toUpperCase().includes('ARRET')
                      
                      return (
                        <tr 
                          key={absence.id} 
                          className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                          onClick={() => handleRowClick(absence)}
                        >
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{ressourceNom}</td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{absence.site}</td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                            <span className="px-2 py-1 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              {absence.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                            {format(new Date(absence.date_debut), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                            {format(new Date(absence.date_fin), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap hidden md:table-cell">
                            <span className={`px-2 py-1 sm:px-3 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              absence.statut === 'Clôturé' 
                                ? 'bg-gray-100 text-gray-700' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {absence.statut || 'Actif'}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                            {isArretMaladie && absence.type_arret_maladie ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded bg-blue-100 text-blue-800">
                                {absence.type_arret_maladie}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-xs truncate hidden md:table-cell">{absence.commentaire || '-'}</td>
                        </tr>
                      )
                    })
                    )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de création/modification */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => {
              setShowModal(false)
              setIsEditing(false)
              resetForm()
            }}
          >
            <Card className="max-w-3xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardHeader gradient="purple" className="mb-0">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {isEditing ? 'Modifier une absence' : 'Nouvelle absence'}
                    </h2>
                  </CardHeader>
                  <Button variant="ghost" size="sm" icon={<X className="w-5 h-5" />} onClick={() => {
                    setShowModal(false)
                    setIsEditing(false)
                    resetForm()
                  }} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Première ligne : Ressource et Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Ressource"
                    value={formData.ressource_id}
                    onChange={(e) => handleRessourceChange(e.target.value)}
                    required
                    options={[
                      { value: '', label: 'Sélectionner une ressource...' },
                      ...ressources.map((ressource) => ({ value: ressource.id, label: ressource.nom }))
                    ]}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={isCustomType ? 'CUSTOM' : formData.type}
                      onChange={(e) => {
                        const selectedValue = e.target.value
                        if (selectedValue === 'CUSTOM') {
                          setIsCustomType(true)
                          setCustomType('')
                        } else {
                          setIsCustomType(false)
                          setCustomType('')
                          const selectedValueUpper = selectedValue.toUpperCase()
                          const isArretMaladie = selectedValueUpper.includes('MALADIE') || selectedValueUpper.includes('ARRÊT') || selectedValueUpper.includes('ARRET')
                          setFormData({ 
                            ...formData, 
                            type: selectedValueUpper,
                            // Réinitialiser type_arret_maladie si ce n'est plus un arrêt maladie
                            type_arret_maladie: isArretMaladie ? formData.type_arret_maladie : ''
                          })
                        }
                      }}
                      required
                      options={[
                        ...typesAbsences.map(type => ({ value: type, label: type })),
                        { value: 'CUSTOM', label: '+ Ajouter un nouveau type' }
                      ]}
                    />
                    {isCustomType && (
                      <Input
                        type="text"
                        value={customType}
                        onChange={(e) => {
                          const newType = e.target.value.toUpperCase()
                          setCustomType(newType)
                          const isArretMaladie = newType.includes('MALADIE') || newType.includes('ARRÊT') || newType.includes('ARRET')
                          setFormData({ 
                            ...formData, 
                            type: newType,
                            // Réinitialiser type_arret_maladie si ce n'est plus un arrêt maladie
                            type_arret_maladie: isArretMaladie ? formData.type_arret_maladie : ''
                          })
                        }}
                        placeholder="Saisir le nouveau type d'absence..."
                        required
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>

                {/* Deuxième ligne : Site et Compétence (automatiques) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Site"
                    type="text"
                    value={formData.site}
                    readOnly
                    required
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <Input
                    label="Compétence"
                    type="text"
                    value={formData.competence}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>

                {/* Troisième ligne : Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Date début"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    required
                  />
                  <Input
                    label="Date fin"
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    required
                  />
                </div>

                {/* Quatrième ligne : Statut et Type arrêt maladie (si maladie) */}
                {(formData.type.toUpperCase().includes('MALADIE') || formData.type.toUpperCase().includes('ARRÊT') || formData.type.toUpperCase().includes('ARRET')) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Type d'arrêt maladie"
                      value={formData.type_arret_maladie}
                      onChange={(e) => setFormData({ ...formData, type_arret_maladie: e.target.value as 'Initial' | 'Prolongation' | '' })}
                      options={[
                        { value: '', label: 'Sélectionner...' },
                        { value: 'Initial', label: 'Initial' },
                        { value: 'Prolongation', label: 'Prolongation' }
                      ]}
                    />
                    <Select
                      label="Statut"
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'Actif' | 'Clôturé' })}
                      options={[
                        { value: 'Actif', label: 'Actif' },
                        { value: 'Clôturé', label: 'Clôturé' }
                      ]}
                    />
                  </div>
                )}

                {/* Statut (si ce n'est pas un arrêt maladie) */}
                {!(formData.type.toUpperCase().includes('MALADIE') || formData.type.toUpperCase().includes('ARRÊT') || formData.type.toUpperCase().includes('ARRET')) && (
                  <Select
                    label="Statut"
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'Actif' | 'Clôturé' })}
                    options={[
                      { value: 'Actif', label: 'Actif' },
                      { value: 'Clôturé', label: 'Clôturé' }
                    ]}
                  />
                )}

                {/* Cinquième ligne : Commentaire */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white resize-none text-sm font-medium placeholder:text-gray-500"
                    rows={3}
                    placeholder="Ajouter un commentaire..."
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  {isEditing && (
                    <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(formData.id)}>
                      Supprimer
                    </Button>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowModal(false)
                      setIsEditing(false)
                      resetForm()
                    }}>
                      Annuler
                    </Button>
                    <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} type="submit" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      {isEditing ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
