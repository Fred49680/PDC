'use client'

import { useState, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAbsences } from '@/hooks/useAbsences'
import { useRessources } from '@/hooks/useRessources'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Plus, Trash2, Search, AlertCircle, X, CheckCircle2, Filter } from 'lucide-react'
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
  
  // Mémoriser l'objet options pour éviter les re-renders infinis
  const absenceOptions = useMemo(() => ({
    ressourceId,
    site,
  }), [ressourceId, site])
  
  const { absences, loading, error, saveAbsence, deleteAbsence, refresh } = useAbsences(absenceOptions)

  // Charger toutes les ressources pour la liste déroulante
  const { ressources, competences: ressourcesCompetences } = useRessources()

  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    ressource_id: '',
    site: '',
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    date_fin: format(new Date(), 'yyyy-MM-dd'),
    type: 'Congés payés',
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
    
    try {
      // Préparer les données pour Supabase
      const absenceData: Partial<Absence> = {
        ressource_id: formData.ressource_id.trim(),
        site: formData.site.trim(),
        date_debut: formData.date_debut, // Format ISO déjà (YYYY-MM-DD)
        date_fin: formData.date_fin, // Format ISO déjà (YYYY-MM-DD)
        type: formData.type.trim(),
        competence: formData.competence && formData.competence.trim() !== '' ? formData.competence.trim() : null,
        commentaire: formData.commentaire && formData.commentaire.trim() !== '' ? formData.commentaire.trim() : null,
        validation_saisie: 'Non' as const,
        date_saisie: new Date().toISOString(),
        statut: formData.statut,
        // Type d'arrêt maladie : seulement si c'est un arrêt maladie
        type_arret_maladie: (formData.type.toLowerCase().includes('maladie') || formData.type.toLowerCase().includes('arrêt')) 
          && formData.type_arret_maladie !== '' 
          ? formData.type_arret_maladie as 'Initial' | 'Prolongation' 
          : null,
      }

      // Si c'est une modification, inclure l'id
      if (isEditing && formData.id && formData.id.trim() !== '') {
        absenceData.id = formData.id.trim()
      }

      await saveAbsence(absenceData)
      // Fermer le modal et réinitialiser
      setShowModal(false)
      setIsEditing(false)
      setFormData({
        id: '',
        ressource_id: '',
        site: '',
        date_debut: format(new Date(), 'yyyy-MM-dd'),
        date_fin: format(new Date(), 'yyyy-MM-dd'),
        type: 'Congés payés',
        competence: '',
        commentaire: '',
        statut: 'Actif',
        type_arret_maladie: '',
      })
      await refresh()
    } catch (err: any) {
      console.error('[AbsencesPage] Erreur complète:', err)
      // Afficher un message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de la sauvegarde'
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      alert(`Erreur: ${errorMessage}\n\nVérifiez que tous les champs requis sont remplis.`)
    }
  }

  const handleNew = () => {
    setIsEditing(false)
    setFormData({
      id: '',
      ressource_id: '',
      site: '',
      date_debut: format(new Date(), 'yyyy-MM-dd'),
      date_fin: format(new Date(), 'yyyy-MM-dd'),
      type: 'Congés payés',
      competence: '',
      commentaire: '',
      statut: 'Actif',
      type_arret_maladie: '',
    })
    setShowModal(true)
  }

  const handleRowClick = (absence: Absence) => {
    setIsEditing(true)
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

  return (
    <Layout>
      <div className="space-y-8">
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
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">Gérez les absences, formations et congés des ressources</p>
            </div>
          </div>
          <Button variant="primary" icon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />} onClick={handleNew} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs sm:text-sm px-3 sm:px-4 py-2">
            <span className="hidden sm:inline">Nouvelle absence</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </div>

        {/* Filtres modernes */}
        <Card>
          <CardHeader gradient="purple" icon={<Filter className="w-6 h-6 text-purple-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Filtres</h2>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ressource"
              value={ressourceId}
              onChange={(e) => setRessourceId(e.target.value)}
              placeholder="Filtrer par ressource ID..."
              icon={<Search className="w-4 h-4" />}
            />
            <Input
              label="Site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Filtrer par site..."
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </Card>

        {/* Liste des absences */}
        <Card>
          <CardHeader gradient="purple" icon={<Calendar className="w-6 h-6 text-purple-600" />}>
            <h2 className="text-2xl font-bold text-gray-800">Liste des absences</h2>
          </CardHeader>

          {loading ? (
            <Loading message="Chargement des absences..." />
          ) : error ? (
            <div className="p-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-semibold">Erreur: {error.message}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ressource</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Site</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date début</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date fin</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Statut</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Type arrêt</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Compétence</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {absences.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Calendar className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucune absence trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    absences.map((absence) => {
                      // Trouver le nom de la ressource
                      const ressource = ressources.find(r => r.id === absence.ressource_id)
                      const ressourceNom = ressource ? ressource.nom : absence.ressource_id
                      const isArretMaladie = absence.type.toLowerCase().includes('maladie') || absence.type.toLowerCase().includes('arrêt')
                      
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
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden lg:table-cell">{absence.competence || '-'}</td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-xs truncate hidden md:table-cell">{absence.commentaire || '-'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal de création/modification */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => {
              setShowModal(false)
              setIsEditing(false)
              setFormData({
                id: '',
                ressource_id: '',
                site: '',
                date_debut: format(new Date(), 'yyyy-MM-dd'),
                date_fin: format(new Date(), 'yyyy-MM-dd'),
                type: 'Congés payés',
                competence: '',
                commentaire: '',
                statut: 'Actif',
                type_arret_maladie: '',
              })
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
                    setFormData({
                      id: '',
                      ressource_id: '',
                      site: '',
                      date_debut: format(new Date(), 'yyyy-MM-dd'),
                      date_fin: format(new Date(), 'yyyy-MM-dd'),
                      type: 'Congés payés',
                      competence: '',
                      commentaire: '',
                      statut: 'Actif',
                      type_arret_maladie: '',
                    })
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
                  <Select
                    label="Type"
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value
                      const isArretMaladie = newType.toLowerCase().includes('maladie') || newType.toLowerCase().includes('arrêt')
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        // Réinitialiser type_arret_maladie si ce n'est plus un arrêt maladie
                        type_arret_maladie: isArretMaladie ? formData.type_arret_maladie : ''
                      })
                    }}
                    required
                    options={[
                      { value: 'Formation', label: 'Formation' },
                      { value: 'Congés payés', label: 'Congés payés' },
                      { value: 'Maladie', label: 'Maladie' },
                      { value: 'Paternité', label: 'Paternité' },
                      { value: 'Maternité', label: 'Maternité' },
                      { value: 'Parental', label: 'Parental' },
                      { value: 'Autre', label: 'Autre' }
                    ]}
                  />
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
                {(formData.type.toLowerCase().includes('maladie') || formData.type.toLowerCase().includes('arrêt')) && (
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
                {!(formData.type.toLowerCase().includes('maladie') || formData.type.toLowerCase().includes('arrêt')) && (
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
                      setFormData({
                        id: '',
                        ressource_id: '',
                        site: '',
                        date_debut: format(new Date(), 'yyyy-MM-dd'),
                        date_fin: format(new Date(), 'yyyy-MM-dd'),
                        type: 'Congés payés',
                        competence: '',
                        commentaire: '',
                        statut: 'Actif',
                        type_arret_maladie: '',
                      })
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
