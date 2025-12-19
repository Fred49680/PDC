'use client'

import { useState, useMemo, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useInterims } from '@/hooks/useInterims'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Briefcase, Plus, Trash2, Edit2, Search, AlertCircle, X, CheckCircle2, 
  Filter, RefreshCw, Calendar, User, Building2, Clock, AlertTriangle
} from 'lucide-react'
import type { Interim } from '@/types/interims'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { businessDaysBetween } from '@/utils/calendar'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function InterimsPage() {
  const [filters, setFilters] = useState({ site: '', aRenouveler: '' })
  const [searchTerm, setSearchTerm] = useState('')
  
  // Mémoriser l'objet options pour éviter les re-renders infinis
  const interimsOptions = useMemo(() => ({
    site: filters.site || undefined,
    aRenouveler: filters.aRenouveler || undefined,
  }), [filters.site, filters.aRenouveler])
  
  const { 
    interims, 
    loading, 
    error, 
    createInterim, 
    updateInterim, 
    deleteInterim, 
    refresh,
    verifierEtMettreAJourRenouvellements,
    desactiverInterimsExpires,
  } = useInterims(interimsOptions)

  // Charger toutes les ressources pour la liste déroulante (seulement ETT)
  const { ressources } = useRessources({ type_contrat: 'Intérim', actif: true })

  // Charger les sites pour le select
  const { sites: sitesList } = useSites({ actif: true })

  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    ressource_id: '',
    site: '',
    date_debut_contrat: format(new Date(), 'yyyy-MM-dd'),
    date_fin_contrat: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 90 jours par défaut
    a_renouveler: 'A renouveler',
    commentaire: '',
  })

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

  // Vérification automatique au chargement de la page
  useEffect(() => {
    const verifierAutomatiquement = async () => {
      try {
        await verifierEtMettreAJourRenouvellements()
        await desactiverInterimsExpires()
      } catch (err) {
        console.error('[InterimsPage] Erreur vérification automatique:', err)
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
      console.error('[InterimsPage] Erreur sauvegarde:', err)
      alert('Erreur lors de la sauvegarde de l\'intérim')
    }
  }

  const handleEdit = (interim: any) => {
    setFormData({
      id: interim.id,
      ressource_id: interim.ressource_id,
      site: interim.site,
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
        console.error('[InterimsPage] Erreur suppression:', err)
        alert('Erreur lors de la suppression de l\'intérim')
      }
    }
  }

  const handleRessourceChange = (selectedRessourceId: string) => {
    const selectedRessource = ressources.find(r => r.id === selectedRessourceId)
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
      console.error('[InterimsPage] Erreur vérification manuelle:', err)
      alert('Erreur lors de la vérification')
    }
  }

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
              Erreur lors du chargement des intérims : {error.message}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Intérims</h1>
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
                      ...ressources
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
    </Layout>
  )
}
