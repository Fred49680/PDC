'use client'

import { useState, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAbsences } from '@/hooks/useAbsences'
import { useRessources } from '@/hooks/useRessources'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Plus, Trash2, Search, AlertCircle, X, CheckCircle2 } from 'lucide-react'
import type { Absence } from '@/types/absences'

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
        {/* En-tête avec icône */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Gestion des Absences
            </h1>
            <p className="text-gray-600 mt-1">Gérez les absences, formations et congés des ressources</p>
          </div>
        </div>

        {/* Bouton Nouvelle absence */}
        <div className="flex items-center justify-end">
          <button
            onClick={handleNew}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle absence
          </button>
        </div>

        {/* Liste des absences */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des absences</h2>
          </div>
          
          {/* Filtres - Design amélioré */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={ressourceId}
                onChange={(e) => setRessourceId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                placeholder="Filtrer par ressource ID..."
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                placeholder="Filtrer par site..."
              />
            </div>
          </div>

          {loading ? (
            <Loading />
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
                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ressource</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Site</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date début</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date fin</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type arrêt</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Compétence</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Commentaire</th>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ressourceNom}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{absence.site}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              {absence.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(absence.date_debut), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(absence.date_fin), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              absence.statut === 'Clôturé' 
                                ? 'bg-gray-100 text-gray-700' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {absence.statut || 'Actif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {isArretMaladie && absence.type_arret_maladie ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded bg-blue-100 text-blue-800">
                                {absence.type_arret_maladie}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{absence.competence || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{absence.commentaire || '-'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
            <div 
              className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEditing ? 'Modifier une absence' : 'Nouvelle absence'}
                  </h2>
                </div>
                <button
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
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Première ligne : Ressource et Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Ressource <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.ressource_id}
                      onChange={(e) => handleRessourceChange(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                      required
                    >
                      <option value="">Sélectionner une ressource...</option>
                      {ressources.map((ressource) => (
                        <option key={ressource.id} value={ressource.id}>
                          {ressource.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
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
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm font-medium"
                      required
                    >
                      <option value="Formation">Formation</option>
                      <option value="Congés payés">Congés payés</option>
                      <option value="Maladie">Maladie</option>
                      <option value="Paternité">Paternité</option>
                      <option value="Maternité">Maternité</option>
                      <option value="Parental">Parental</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                {/* Deuxième ligne : Site et Compétence (automatiques) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Site <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.site}
                      readOnly
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                      required
                    />
                    <p className="text-xs text-gray-500">Rempli automatiquement selon la ressource</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Compétence
                    </label>
                    <input
                      type="text"
                      value={formData.competence}
                      readOnly
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Compétence principale de la ressource</p>
                  </div>
                </div>

                {/* Troisième ligne : Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Date début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Date fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Quatrième ligne : Statut et Type arrêt maladie (si maladie) */}
                {(formData.type.toLowerCase().includes('maladie') || formData.type.toLowerCase().includes('arrêt')) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">
                        Type d'arrêt maladie
                      </label>
                      <select
                        value={formData.type_arret_maladie}
                        onChange={(e) => setFormData({ ...formData, type_arret_maladie: e.target.value as 'Initial' | 'Prolongation' | '' })}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Initial">Initial</option>
                        <option value="Prolongation">Prolongation</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">
                        Statut
                      </label>
                      <select
                        value={formData.statut}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'Actif' | 'Clôturé' })}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                      >
                        <option value="Actif">Actif</option>
                        <option value="Clôturé">Clôturé</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Statut (si ce n'est pas un arrêt maladie) */}
                {!(formData.type.toLowerCase().includes('maladie') || formData.type.toLowerCase().includes('arrêt')) && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Statut
                    </label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'Actif' | 'Clôturé' })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-sm"
                    >
                      <option value="Actif">Actif</option>
                      <option value="Clôturé">Clôturé</option>
                    </select>
                  </div>
                )}

                {/* Cinquième ligne : Commentaire */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.commentaire}
                    onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white resize-none text-sm"
                    rows={3}
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
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
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 font-medium text-sm"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg font-semibold flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isEditing ? 'Enregistrer' : 'Créer'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
