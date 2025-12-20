'use client'

import { useState, useMemo, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useTransferts } from '@/hooks/useTransferts'
import { useRessources } from '@/hooks/useRessources'
import { useSites } from '@/hooks/useSites'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  PlayCircle,
  Navigation,
  Timer,
} from 'lucide-react'
import type { Transfert } from '@/types/transferts'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { businessDaysBetween } from '@/utils/calendar'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function TransfertsPage() {
  const [filters, setFilters] = useState({ siteOrigine: '', siteDestination: '', statut: '' })
  const [searchTerm, setSearchTerm] = useState('')

  // Mémoriser l'objet options pour éviter les re-renders infinis
  const transfertsOptions = useMemo(
    () => ({
      siteOrigine: filters.siteOrigine || undefined,
      siteDestination: filters.siteDestination || undefined,
      statut: (filters.statut === 'Planifié' || filters.statut === 'Appliqué' 
        ? filters.statut as 'Planifié' | 'Appliqué' 
        : undefined),
    }),
    [filters.siteOrigine, filters.siteDestination, filters.statut]
  )

  const {
    transferts,
    loading,
    error,
    createTransfert,
    updateTransfert,
    deleteTransfert,
    appliquerTransfert,
    appliquerTransfertsAuto,
    refresh,
  } = useTransferts(transfertsOptions)

  // Charger toutes les ressources actives pour la liste déroulante
  const { ressources } = useRessources({ actif: true })

  // Charger les sites pour les selects
  const { sites: sitesList } = useSites({ actif: true })

  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    ressource_id: '',
    site_origine: '',
    site_destination: '',
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    date_fin: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 jours par défaut
    statut: 'Planifié' as 'Planifié' | 'Appliqué',
  })

  // Filtrer les transferts par terme de recherche et masquer les transferts terminés
  const transfertsFiltres = useMemo(() => {
    let filtered = transferts

    // Masquer les transferts terminés (date_fin < aujourd'hui)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    filtered = filtered.filter((transfert) => {
      const dateFin = new Date(transfert.date_fin)
      dateFin.setHours(0, 0, 0, 0)
      return dateFin >= today
    })

    // Filtre par terme de recherche (nom de ressource)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((transfert) => {
        const ressourceNom = transfert.ressource?.nom?.toLowerCase() || ''
        return ressourceNom.includes(searchLower)
      })
    }

    return filtered
  }, [transferts, searchTerm])

  // Mémoriser les options des sites pour éviter les re-renders
  // Normaliser tout en majuscules pour le traitement et l'affichage
  const siteOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Sélectionner un site' },
      ...sitesList.map((site) => ({
        value: site.site.toUpperCase(),
        label: site.site.toUpperCase(), // Affichage en majuscules
      })),
    ]
    console.log('[TransfertsPage] siteOptions recalculées:', options.length, 'options')
    return options
  }, [sitesList])

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = transferts.length
    const planifies = transferts.filter((t) => t.statut === 'Planifié').length
    const appliques = transferts.filter((t) => t.statut === 'Appliqué').length

    // Compter ceux qui commencent aujourd'hui ou dans le passé (à appliquer)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const aAppliquer = transferts.filter((t) => {
      const dateDebut = new Date(t.date_debut)
      dateDebut.setHours(0, 0, 0, 0)
      return t.statut === 'Planifié' && dateDebut <= today
    }).length

    return { total, planifies, appliques, aAppliquer }
  }, [transferts])

  // Vérification automatique au chargement de la page
  useEffect(() => {
    const appliquerAutomatiquement = async () => {
      try {
        await appliquerTransfertsAuto()
      } catch (err) {
        console.error('[TransfertsPage] Erreur application automatique:', err)
      }
    }

    // Appliquer toutes les 5 minutes
    appliquerAutomatiquement()
    const interval = setInterval(appliquerAutomatiquement, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [appliquerTransfertsAuto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation côté client
    if (!formData.ressource_id || formData.ressource_id.trim() === '') {
      alert('Veuillez sélectionner une ressource')
      return
    }

    if (!formData.site_origine || formData.site_origine.trim() === '') {
      alert('Le site d\'origine est requis')
      return
    }

    if (!formData.site_destination || formData.site_destination.trim() === '') {
      alert('Le site de destination est requis')
      return
    }

    if (formData.site_origine === formData.site_destination) {
      alert('Le site d\'origine et le site de destination doivent être différents')
      return
    }

    if (!formData.date_debut || !formData.date_fin) {
      alert('Les dates de début et de fin sont requises')
      return
    }

    const dateDebut = new Date(formData.date_debut)
    const dateFin = new Date(formData.date_fin)

    if (dateFin < dateDebut) {
      alert('La date de fin doit être postérieure à la date de début')
      return
    }

    try {
      if (isEditing) {
        await updateTransfert(formData.id, {
          site_origine: formData.site_origine.trim(),
          site_destination: formData.site_destination.trim(),
          date_debut: dateDebut,
          date_fin: dateFin,
          statut: formData.statut,
        })
      } else {
        await createTransfert({
          ressource_id: formData.ressource_id.trim(),
          site_origine: formData.site_origine.trim(),
          site_destination: formData.site_destination.trim(),
          date_debut: dateDebut,
          date_fin: dateFin,
          statut: formData.statut,
        })
      }

      // Réinitialiser le formulaire
      setFormData({
        id: '',
        ressource_id: '',
        site_origine: '',
        site_destination: '',
        date_debut: format(new Date(), 'yyyy-MM-dd'),
        date_fin: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        statut: 'Planifié',
      })
      setIsEditing(false)
      setShowModal(false)
    } catch (err: any) {
      console.error('[TransfertsPage] Erreur sauvegarde:', err)
      alert(err.message || 'Erreur lors de la sauvegarde du transfert')
    }
  }

  const handleEdit = (transfert: Transfert) => {
    setFormData({
      id: transfert.id,
      ressource_id: transfert.ressource_id,
      // Normaliser les sites en majuscules
      site_origine: transfert.site_origine.toUpperCase(),
      site_destination: transfert.site_destination.toUpperCase(),
      date_debut: format(new Date(transfert.date_debut), 'yyyy-MM-dd'),
      date_fin: format(new Date(transfert.date_fin), 'yyyy-MM-dd'),
      statut: transfert.statut,
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDelete = async (transfertId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce transfert ?')) {
      try {
        await deleteTransfert(transfertId)
      } catch (err) {
        console.error('[TransfertsPage] Erreur suppression:', err)
        alert('Erreur lors de la suppression du transfert')
      }
    }
  }

  const handleRessourceChange = (selectedRessourceId: string) => {
    console.log('[TransfertsPage] handleRessourceChange appelé avec:', selectedRessourceId)
    console.log('[TransfertsPage] Ressources disponibles:', ressources.length)
    console.log('[TransfertsPage] Sites disponibles:', sitesList.length)
    
    // Trouver la ressource sélectionnée
    const selectedRessource = ressources.find((r) => r.id === selectedRessourceId)
    console.log('[TransfertsPage] Ressource trouvée:', selectedRessource)
    
    // Mettre à jour le formulaire avec l'ID de la ressource et le site d'origine si disponible
    setFormData((prev) => {
      const newData: typeof prev = {
        ...prev,
        ressource_id: selectedRessourceId,
      }
      
      // Si la ressource est trouvée et a un site, normaliser en majuscules
      if (selectedRessource && selectedRessource.site) {
        // Normaliser le site de la ressource en majuscules
        const siteRessourceUpper = selectedRessource.site.toUpperCase()
        
        // Trouver le site correspondant dans sitesList en comparant en majuscules
        const matchingSite = sitesList.find(
          (s) => s.site.toUpperCase() === siteRessourceUpper
        )
        
        if (matchingSite) {
          // Utiliser la valeur en majuscules pour le formulaire
          console.log('[TransfertsPage] Site trouvé:', selectedRessource.site, '->', matchingSite.site.toUpperCase())
          newData.site_origine = matchingSite.site.toUpperCase()
          console.log('[TransfertsPage] Nouveau formData.site_origine:', newData.site_origine)
        } else {
          console.warn('[TransfertsPage] Site', selectedRessource.site, 'non trouvé dans sitesList')
          console.log('[TransfertsPage] Liste des sites disponibles:', sitesList.map((s) => s.site))
          // Utiliser la valeur en majuscules de la ressource
          newData.site_origine = siteRessourceUpper
        }
      } else {
        console.log('[TransfertsPage] Aucune ressource trouvée ou pas de site disponible')
      }
      
      return newData
    })
  }

  // useEffect pour mettre à jour le site d'origine si la ressource change et que les ressources sont chargées
  // Pré-remplit automatiquement le site d'origine avec le site de référence de la ressource (en majuscules)
  useEffect(() => {
    // Ne s'exécuter que si on a une ressource sélectionnée, des ressources chargées, des sites chargés, et qu'on n'est pas en mode édition
    if (formData.ressource_id && ressources.length > 0 && sitesList.length > 0 && !isEditing) {
      const selectedRessource = ressources.find((r) => r.id === formData.ressource_id)
      console.log('[TransfertsPage] useEffect - Ressource ID:', formData.ressource_id)
      console.log('[TransfertsPage] useEffect - Ressource trouvée:', selectedRessource)
      console.log('[TransfertsPage] useEffect - Site actuel dans formData:', formData.site_origine)
      console.log('[TransfertsPage] useEffect - Sites disponibles:', sitesList.length, sitesList.map((s) => s.site))
      
      if (selectedRessource && selectedRessource.site) {
        // Normaliser le site de la ressource en majuscules
        const siteRessourceUpper = selectedRessource.site.toUpperCase()
        
        // Trouver le site correspondant dans sitesList en comparant en majuscules
        const matchingSite = sitesList.find(
          (s) => s.site.toUpperCase() === siteRessourceUpper
        )
        
        if (matchingSite) {
          // Utiliser la valeur en majuscules
          const correctSiteValue = matchingSite.site.toUpperCase()
          console.log('[TransfertsPage] useEffect - Site trouvé:', selectedRessource.site, '->', correctSiteValue)
          
          // Pré-remplir le site d'origine avec le site de référence de la ressource (en majuscules)
          setFormData((prev) => {
            // Comparer en majuscules pour éviter les mises à jour inutiles
            if (prev.site_origine?.toUpperCase() !== correctSiteValue) {
              console.log('[TransfertsPage] useEffect - Mise à jour du site d\'origine de', prev.site_origine, 'vers', correctSiteValue)
              return {
                ...prev,
                site_origine: correctSiteValue,
              }
            } else {
              console.log('[TransfertsPage] useEffect - Site d\'origine déjà correct:', prev.site_origine)
            }
            return prev
          })
        } else {
          console.warn('[TransfertsPage] useEffect - Site', selectedRessource.site, 'non trouvé dans sitesList')
          console.log('[TransfertsPage] useEffect - Liste des sites disponibles:', sitesList.map((s) => s.site))
          // Utiliser quand même la valeur en majuscules de la ressource
          setFormData((prev) => {
            if (prev.site_origine?.toUpperCase() !== siteRessourceUpper) {
              return {
                ...prev,
                site_origine: siteRessourceUpper,
              }
            }
            return prev
          })
        }
      } else {
        console.log('[TransfertsPage] useEffect - Aucune ressource trouvée ou pas de site disponible')
      }
    } else {
      console.log('[TransfertsPage] useEffect - Conditions non remplies:', {
        hasRessourceId: !!formData.ressource_id,
        ressourcesLength: ressources.length,
        sitesLength: sitesList.length,
        isEditing,
      })
    }
  }, [formData.ressource_id, formData.site_origine, ressources, sitesList, isEditing])

  const handleAppliquer = async (transfert: Transfert) => {
    if (transfert.statut === 'Appliqué') {
      alert('Ce transfert est déjà appliqué')
      return
    }

    if (
      confirm(
        `Appliquer le transfert de ${transfert.ressource?.nom || 'cette ressource'} de ${transfert.site_origine.toUpperCase()} vers ${transfert.site_destination.toUpperCase()} ?\n\nCela va créer des affectations sur le site de destination.`
      )
    ) {
      try {
        await updateTransfert(transfert.id, { statut: 'Appliqué' })
      } catch (err: any) {
        console.error('[TransfertsPage] Erreur application:', err)
        alert(err.message || 'Erreur lors de l\'application du transfert')
      }
    }
  }

  const handleApplicationManuelle = async () => {
    try {
      const result = await appliquerTransfertsAuto()
      alert(`${result.appliques} transfert(s) appliqué(s) automatiquement`)
    } catch (err) {
      console.error('[TransfertsPage] Erreur application manuelle:', err)
      alert('Erreur lors de l\'application automatique')
    }
  }

  const getStatutColor = (statut: string): string => {
    switch (statut) {
      case 'Appliqué':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'Planifié':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getDuree = (dateDebut: Date, dateFin: Date): number => {
    return businessDaysBetween(dateDebut, dateFin)
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
              Erreur lors du chargement des transferts : {error.message}
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
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Transferts de Personnel</h1>
              <p className="text-blue-100">
                {stats.total} transfert(s) au total • {stats.planifies} planifié(s) •{' '}
                {stats.appliques} appliqué(s) • {stats.aAppliquer} à appliquer
              </p>
            </div>
            <ArrowRightLeft className="w-16 h-16 text-white/80" />
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
                <ArrowRightLeft className="w-8 h-8 text-blue-500" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Planifiés</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.planifies}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Appliqués</p>
                  <p className="text-2xl font-bold text-green-800">{stats.appliques}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">À appliquer</p>
                  <p className="text-2xl font-bold text-orange-800">{stats.aAppliquer}</p>
                </div>
                <PlayCircle className="w-8 h-8 text-orange-500" />
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
                value={filters.siteOrigine}
                onChange={(e) => setFilters({ ...filters, siteOrigine: e.target.value.toUpperCase() || '' })}
                className="w-full sm:w-48"
                options={[
                  { value: '', label: 'Tous les sites origine' },
                  ...sitesList.map((site) => ({
                    value: site.site.toUpperCase(),
                    label: site.site.toUpperCase(), // Affichage en majuscules
                  })),
                ]}
              />
              <Select
                value={filters.siteDestination}
                onChange={(e) => setFilters({ ...filters, siteDestination: e.target.value.toUpperCase() || '' })}
                className="w-full sm:w-48"
                options={[
                  { value: '', label: 'Tous les sites destination' },
                  ...sitesList.map((site) => ({
                    value: site.site.toUpperCase(),
                    label: site.site.toUpperCase(), // Affichage en majuscules
                  })),
                ]}
              />
              <Select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full sm:w-48"
                options={[
                  { value: '', label: 'Tous les statuts' },
                  { value: 'Planifié', label: 'Planifié' },
                  { value: 'Appliqué', label: 'Appliqué' },
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleApplicationManuelle}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Appliquer auto
              </Button>
              <Button
                onClick={() => {
                  setFormData({
                    id: '',
                    ressource_id: '',
                    site_origine: '',
                    site_destination: '',
                    date_debut: format(new Date(), 'yyyy-MM-dd'),
                    date_fin: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                    statut: 'Planifié',
                  })
                  setIsEditing(false)
                  setShowModal(true)
                }}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau transfert
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des transferts */}
        <div className="space-y-4">
          {transfertsFiltres.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 text-center">
              <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucun transfert trouvé</p>
            </div>
          ) : (
            transfertsFiltres.map((transfert) => {
              const duree = getDuree(new Date(transfert.date_debut), new Date(transfert.date_fin))
              const estPlanifie = transfert.statut === 'Planifié'
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const dateDebut = new Date(transfert.date_debut)
              dateDebut.setHours(0, 0, 0, 0)
              const peutAppliquer = estPlanifie && dateDebut <= today

              return (
                <div
                  key={transfert.id}
                  onClick={(e) => {
                    // Ne pas ouvrir le modal si on clique sur le bouton "Appliquer"
                    if ((e.target as HTMLElement).closest('button[data-action="appliquer"]')) {
                      return
                    }
                    handleEdit(transfert)
                  }}
                  className={`bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl hover:bg-white transition-all duration-200 cursor-pointer ${
                    peutAppliquer ? 'border-orange-300 bg-orange-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 text-sm">
                    {/* Statut */}
                    <div
                      className={`px-2 py-1 rounded border shrink-0 ${getStatutColor(transfert.statut)}`}
                    >
                      <span className="text-xs font-semibold">{transfert.statut}</span>
                    </div>

                    {/* Nom de la ressource */}
                    <div className="font-bold text-gray-800 min-w-[150px]">
                      {transfert.ressource?.nom || 'Ressource inconnue'}
                    </div>

                    {/* Itinéraire */}
                    <div className="flex items-center gap-1 text-gray-600 min-w-[180px]">
                      <MapPin className="w-3 h-3" />
                      <span className="font-semibold">{transfert.site_origine.toUpperCase()}</span>
                      <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                      <span className="font-semibold">{transfert.site_destination.toUpperCase()}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-1 text-gray-600 min-w-[200px]">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(transfert.date_debut), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(transfert.date_fin), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>

                    {/* Durée en jours ouvrés */}
                    <div className="flex items-center gap-1 text-gray-600 min-w-[120px]">
                      <Clock className="w-3 h-3" />
                      <span>{duree} j. ouvré(s)</span>
                    </div>

                    {/* Distance et temps de trajet */}
                    {transfert.distance_km !== undefined && transfert.duration_minutes !== undefined && (
                      <div className="flex items-center gap-3 text-gray-600 min-w-[140px]">
                        <div className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-blue-600" />
                          <span className="font-semibold text-blue-700">{transfert.distance_km.toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3 text-green-600" />
                          <span className="font-semibold text-green-700">
                            {transfert.duration_minutes >= 60
                              ? `${Math.floor(transfert.duration_minutes / 60)}h${transfert.duration_minutes % 60 < 10 ? '0' : ''}${transfert.duration_minutes % 60}`
                              : `${transfert.duration_minutes} min`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bouton Appliquer (si nécessaire) */}
                    {peutAppliquer && (
                      <button
                        data-action="appliquer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAppliquer(transfert)
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors shrink-0"
                        title="Appliquer le transfert"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Espace flex pour pousser le contenu */}
                    <div className="flex-1"></div>
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
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {isEditing ? 'Modifier le transfert' : 'Nouveau transfert'}
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
                        .filter((r) => r.actif)
                        .map((ressource) => ({
                          value: ressource.id,
                          label: ressource.nom, // Retirer le site du label car il est géré par le champ "Site d'origine"
                        })),
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {(() => {
                      console.log('[TransfertsPage] Rendu Select Site d\'origine - formData.site_origine:', formData.site_origine)
                      console.log('[TransfertsPage] Rendu Select Site d\'origine - sitesList.length:', sitesList.length)
                      console.log('[TransfertsPage] Rendu Select Site d\'origine - siteOptions.length:', siteOptions.length)
                      const siteInOptions = siteOptions.some((opt) => opt.value === formData.site_origine)
                      console.log('[TransfertsPage] Rendu Select Site d\'origine - site_origine dans options:', siteInOptions)
                      if (formData.site_origine && !siteInOptions) {
                        console.warn('[TransfertsPage] ATTENTION: site_origine', formData.site_origine, 'n\'est pas dans les options!')
                        console.log('[TransfertsPage] Options disponibles:', siteOptions.map((opt) => opt.value))
                      }
                      return null
                    })()}
                    <Select
                      key={`site-origine-${formData.site_origine}-${sitesList.length}`}
                      label="Site d'origine *"
                      value={formData.site_origine || ''}
                      onChange={(e) => {
                        console.log('[TransfertsPage] Select Site d\'origine onChange:', e.target.value)
                        setFormData((prev) => {
                          // Normaliser en majuscules
                          const newValue = e.target.value.toUpperCase()
                          console.log('[TransfertsPage] Ancien site_origine:', prev.site_origine, 'Nouveau:', newValue)
                          return { ...prev, site_origine: newValue }
                        })
                      }}
                      required
                      className="w-full"
                      options={siteOptions}
                    />
                  </div>

                  <div>
                    <Select
                      label="Site de destination *"
                      value={formData.site_destination}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, site_destination: e.target.value.toUpperCase() }))
                      }
                      required
                      className="w-full"
                      options={[
                        { value: '', label: 'Sélectionner un site' },
                        ...sitesList
                          .filter((site) => site.site.toUpperCase() !== formData.site_origine?.toUpperCase())
                          .map((site) => ({
                            value: site.site.toUpperCase(),
                            label: site.site.toUpperCase(), // Affichage en majuscules
                          })),
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date de début *
                    </label>
                    <Input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
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
                      value={formData.date_fin}
                      onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    label="Statut"
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statut: e.target.value as 'Planifié' | 'Appliqué',
                      })
                    }
                    className="w-full"
                    options={[
                      { value: 'Planifié', label: 'Planifié' },
                      { value: 'Appliqué', label: 'Appliqué' },
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si "Appliqué", le transfert sera appliqué immédiatement (création d'affectations
                    sur le site de destination)
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  {isEditing && (
                    <Button
                      type="button"
                      onClick={async () => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce transfert ?')) {
                          try {
                            await deleteTransfert(formData.id)
                            setShowModal(false)
                            setIsEditing(false)
                          } catch (err) {
                            console.error('[TransfertsPage] Erreur suppression:', err)
                            alert('Erreur lors de la suppression du transfert')
                          }
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
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
