'use client'

import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAffaires } from '@/hooks/useAffaires'
import { useRessources } from '@/hooks/useRessources'
import { Loading } from '@/components/Common/Loading'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Building2, Plus, Search, AlertCircle, CheckCircle2, 
  Eye, EyeOff, FileSpreadsheet, Filter, Trash2, Edit 
} from 'lucide-react'
import { generateAffaireId, SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'
import { ImportExcel } from '@/components/Affaires/ImportExcel'

export const dynamic = 'force-dynamic'

export default function AffairesPage() {
  const [showImport, setShowImport] = useState(false)
  const { affaires: allAffaires, loading, error, saveAffaire, loadAffaires, deleteAffaire } = useAffaires()
  const { ressources: allRessources, competences: ressourcesCompetences } = useRessources({ competences: ['Encadrement'] })
  const [activeTab, setActiveTab] = useState<'liste' | 'gestion'>('liste')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [affaireToDelete, setAffaireToDelete] = useState<typeof affaires[0] | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  const [responsable, setResponsable] = useState('')
  const [site, setSite] = useState('')
  const [tranche, setTranche] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  
  const affairesActives = allAffaires.filter((a) => {
    if (hideClosed && a.statut === 'Clôturé') return false
    return true
  })

  // Liste des responsables : ceux qui ont déjà une affaire + ressources avec compétence encadrement
  const responsablesDisponibles = useMemo(() => {
    const responsablesFromAffaires = Array.from(
      new Set(affairesActives.map((a) => a.responsable).filter((r): r is string => Boolean(r)))
    )
    
    // Ajouter les ressources avec compétence encadrement
    const ressourcesEncadrement = allRessources.filter((r) => {
      const comps = ressourcesCompetences.get(r.id) || []
      return comps.some((c) => c.competence.toLowerCase() === 'encadrement')
    })
    const responsablesFromRessources = ressourcesEncadrement.map((r) => r.nom)
    
    // Combiner et dédupliquer
    const allResponsables = Array.from(new Set([...responsablesFromAffaires, ...responsablesFromRessources]))
    return allResponsables.sort()
  }, [affairesActives, allRessources, ressourcesCompetences])

  const affairesFiltreesParResponsable = responsable
    ? affairesActives.filter((a) => a.responsable === responsable)
    : affairesActives

  const sitesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsable.map((a) => a.site).filter((s): s is string => Boolean(s)))
  ).sort()

  const affairesFiltreesParResponsableEtSite = site
    ? affairesFiltreesParResponsable.filter((a) => a.site === site)
    : affairesFiltreesParResponsable

  const tranchesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsableEtSite.map((a) => a.tranche).filter((t): t is string => Boolean(t)))
  ).sort()

  const affairesFiltreesParTranche = tranche
    ? affairesFiltreesParResponsableEtSite.filter((a) => a.tranche === tranche)
    : affairesFiltreesParResponsableEtSite

  const affaires = numeroCompte
    ? affairesFiltreesParTranche.filter((a) => 
        (a.affaire_id && a.affaire_id.toLowerCase().includes(numeroCompte.toLowerCase())) ||
        (a.compte && a.compte.toLowerCase().includes(numeroCompte.toLowerCase()))
      )
    : affairesFiltreesParTranche

  // Réinitialiser les filtres dépendants quand le filtre parent change
  useEffect(() => {
    if (responsable) {
      setSite('')
      setTranche('')
      setNumeroCompte('')
    }
  }, [responsable])

  useEffect(() => {
    if (site) {
      setTranche('')
      setNumeroCompte('')
    }
  }, [site])

  useEffect(() => {
    if (tranche) {
      setNumeroCompte('')
    }
  }, [tranche])

  const [formData, setFormData] = useState({
    id: '',
    affaire_id: '',
    site: '',
    libelle: '',
    tranche: '',
    statut: 'Ouverte',
    budget_heures: 0,
    raf_heures: 0,
    date_maj_raf: undefined as Date | undefined,
    responsable: '',
    compte: '',
    actif: true,
  })

  const [showModal, setShowModal] = useState(false)
  const [editingAffaire, setEditingAffaire] = useState<typeof affaires[0] | null>(null)

  useEffect(() => {
    if (formData.tranche && formData.site && formData.libelle && formData.statut) {
      const generatedId = generateAffaireId(
        formData.tranche,
        formData.site,
        formData.libelle,
        formData.statut
      )
      if (generatedId !== formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: generatedId }))
      }
    } else {
      if (formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: '' }))
      }
    }
    // formData.affaire_id est intentionnellement exclu des dépendances pour éviter les boucles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tranche, formData.site, formData.libelle, formData.statut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let affaireIdToSave: string | null = null
      if (formData.tranche && formData.site && formData.libelle && formData.statut) {
        const generatedId = generateAffaireId(
          formData.tranche,
          formData.site,
          formData.libelle,
          formData.statut
        )
        affaireIdToSave = generatedId && generatedId.trim() !== '' 
          ? generatedId.trim() 
          : (formData.affaire_id && formData.affaire_id.trim() !== '' ? formData.affaire_id.trim() : null)
      } else {
        affaireIdToSave = formData.affaire_id && formData.affaire_id.trim() !== '' 
          ? formData.affaire_id.trim() 
          : null
      }
      
      const affaireToSave = {
        ...formData,
        affaire_id: affaireIdToSave,
        date_creation: formData.id ? new Date() : new Date(),
        date_modification: new Date(),
      }
      
      const affaireToSave = {
        id: formData.id || undefined,
        affaire_id: affaireIdToSave,
        site: formData.site,
        libelle: formData.libelle,
        tranche: formData.tranche,
        statut: formData.statut,
        budget_heures: formData.budget_heures,
        raf_heures: formData.raf_heures,
        date_maj_raf: formData.date_maj_raf,
        responsable: formData.responsable || null,
        compte: formData.compte || null,
        actif: formData.actif,
      }
      
      console.log('[AffairesPage] handleSubmit - affaireToSave:', affaireToSave)
      await saveAffaire(affaireToSave)
      
      // Attendre un peu pour que la sauvegarde soit complète
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Forcer le rechargement pour éviter les problèmes de cache Realtime
      await loadAffaires()
      
      setFormData({
        id: '',
        affaire_id: '',
        site: '',
        libelle: '',
        tranche: '',
        statut: 'Ouverte',
        budget_heures: 0,
        raf_heures: 0,
        date_maj_raf: undefined,
        responsable: '',
        compte: '',
        actif: true,
      })
      setEditingAffaire(null)
      setShowModal(false)
    } catch (err: unknown) {
      console.error('[AffairesPage] Erreur:', err)
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite'
      alert('Erreur lors de l\'enregistrement :\n\n' + errorMessage)
    }
  }

  const handleEdit = (affaire: typeof affaires[0]) => {
    setEditingAffaire(affaire)
    setFormData({
      id: affaire.id,
      affaire_id: affaire.affaire_id || '',
      site: affaire.site || '',
      libelle: affaire.libelle || '',
      tranche: affaire.tranche || '',
      statut: affaire.statut || 'Ouverte',
      budget_heures: affaire.budget_heures || 0,
      raf_heures: affaire.raf_heures || 0,
      date_maj_raf: affaire.date_maj_raf,
      responsable: affaire.responsable || '',
      compte: affaire.compte || '',
      actif: affaire.actif ?? true,
    })
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingAffaire(null)
    setFormData({
      id: '',
      affaire_id: '',
      site: '',
      libelle: '',
      tranche: '',
      statut: 'Ouverte',
      budget_heures: 0,
      raf_heures: 0,
      date_maj_raf: undefined,
      responsable: '',
      compte: '',
      actif: true,
    })
    setShowModal(true)
  }

  const handleDeleteClick = (affaire: typeof affaires[0]) => {
    setAffaireToDelete(affaire)
    setDeleteConfirmText('')
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.trim() !== 'Effacer') {
      alert('Veuillez taper "Effacer" pour confirmer la suppression')
      return
    }

    if (!affaireToDelete) return

    try {
      await deleteAffaire(affaireToDelete.id)
      setShowDeleteModal(false)
      setAffaireToDelete(null)
      setDeleteConfirmText('')
    } catch (err: unknown) {
      console.error('[AffairesPage] Erreur suppression:', err)
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite'
      alert('Erreur lors de la suppression :\n\n' + errorMessage)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête moderne */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Affaires
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">Créez et gérez les affaires et leurs sites</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />}
              onClick={() => setShowImport(!showImport)}
              className="text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <span className="hidden sm:inline">{showImport ? 'Masquer import' : 'Importer Excel'}</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
              onClick={handleNew}
              className="text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <span className="hidden sm:inline">Nouvelle affaire</span>
              <span className="sm:hidden">Nouvelle</span>
            </Button>
          </div>
        </div>

        {/* Import Excel */}
        {showImport && (
          <Card>
            <ImportExcel
              onImportComplete={() => {
                loadAffaires()
                setShowImport(false)
              }}
            />
          </Card>
        )}

        {/* Filtres modernes */}
        <Card>
          <CardHeader gradient="indigo" icon={<Filter className="w-6 h-6 text-indigo-600" />}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-2xl font-bold text-gray-800">Filtres</h2>
              <Button
                variant="ghost"
                size="sm"
                icon={hideClosed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                onClick={() => setHideClosed(!hideClosed)}
              >
                {hideClosed ? 'Masquer les clôturées' : 'Afficher les clôturées'}
              </Button>
            </div>
          </CardHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Numéro de compte"
              value={numeroCompte}
              onChange={(e) => setNumeroCompte(e.target.value)}
              placeholder="Rechercher par numéro..."
              icon={<Search className="w-4 h-4" />}
            />
            <Select
              label="Responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              options={[
                { value: '', label: 'Tous les responsables...' },
                ...responsablesDisponibles.map((resp) => ({ value: resp, label: resp }))
              ]}
            />
            <Select
              label="Site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              disabled={!responsable && responsablesDisponibles.length > 0}
              options={[
                { value: '', label: 'Tous les sites...' },
                ...sitesDisponibles.map((s) => ({ value: s, label: s }))
              ]}
            />
            <Select
              label="Tranche"
              value={tranche}
              onChange={(e) => setTranche(e.target.value)}
              disabled={!site}
              options={[
                { value: '', label: 'Toutes les tranches...' },
                ...tranchesDisponibles.map((t) => ({ value: t, label: t }))
              ]}
            />
          </div>
        </Card>

        {/* Onglets */}
        <Card>
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('liste')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'liste'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Liste des affaires
              </button>
              <button
                onClick={() => setActiveTab('gestion')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'gestion'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Gestion affaire
              </button>
            </nav>
          </div>
        </Card>

        {/* Liste des affaires */}
        {activeTab === 'liste' && (
        <Card>
          <CardHeader gradient="indigo" icon={<Building2 className="w-6 h-6 text-indigo-600" />}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-2xl font-bold text-gray-800">Liste des affaires</h2>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                {affaires.length}
              </span>
            </div>
          </CardHeader>

          {loading ? (
            <Loading message="Chargement des affaires..." />
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
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Site</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Responsable</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Libellé</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Tranche</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Compte</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Budget</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affaires.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Building2 className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucune affaire trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    affaires.map((affaire) => (
                      <tr 
                        key={affaire.id} 
                        className="hover:bg-indigo-50/50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleEdit(affaire)}
                        title="Cliquez pour modifier"
                      >
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.site}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                          {affaire.responsable || '-'}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-gray-600">
                          {affaire.libelle}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                          {affaire.tranche || '-'}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                          {affaire.compte || '-'}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          {affaire.statut === 'Ouverte' ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Ouverte
                            </span>
                          ) : affaire.statut === 'Prévisionnelle' ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Prévisionnelle
                            </span>
                          ) : affaire.statut === 'Clôturé' ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Clôturé
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {affaire.statut || 'Non défini'}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                          {affaire.budget_heures !== undefined ? affaire.budget_heures.toFixed(2) : '-'}
                        </td>
                        
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4 text-red-600" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(affaire)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer l&apos;affaire"
                          >
                            <span className="hidden sm:inline">Supprimer</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        )}

        {/* Onglet Gestion affaire */}
        {activeTab === 'gestion' && (
        <Card>
          <CardHeader gradient="indigo" icon={<Building2 className="w-6 h-6 text-indigo-600" />}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-2xl font-bold text-gray-800">Gestion affaire</h2>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                {affaires.length}
              </span>
            </div>
          </CardHeader>

          {loading ? (
            <Loading message="Chargement des affaires..." />
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
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">AffaireID</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Budget RAF</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date de Maj RAF</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Heures Planifiées</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date début d&apos;affaire</th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affaires.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Building2 className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">Aucune affaire trouvée</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    affaires.map((affaire) => (
                      <tr 
                        key={affaire.id} 
                        className="hover:bg-indigo-50/50 transition-colors duration-150"
                      >
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                          {affaire.affaire_id || '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.raf_heures !== undefined ? affaire.raf_heures.toFixed(2) : '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.date_maj_raf ? format(affaire.date_maj_raf, 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.total_planifie !== undefined && affaire.total_planifie !== null ? affaire.total_planifie.toFixed(2) : '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.date_debut_demande ? format(affaire.date_debut_demande, 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {affaire.date_fin_demande ? format(affaire.date_fin_demande, 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        )}

        {/* Modal de création/modification */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => {
              setShowModal(false)
              setEditingAffaire(null)
              setFormData({
                id: '',
                affaire_id: '',
                site: '',
                libelle: '',
                tranche: '',
                statut: 'Ouverte',
                budget_heures: 0,
                raf_heures: 0,
                date_maj_raf: undefined,
                responsable: '',
                compte: '',
                actif: true,
              })
            }}
          >
            <Card className="max-w-3xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader gradient="indigo" icon={editingAffaire ? <Edit className="w-6 h-6 text-indigo-600" /> : <Plus className="w-6 h-6 text-indigo-600" />}>
                <h2 className="text-2xl font-bold text-gray-800">{editingAffaire ? 'Modifier affaire' : 'Nouvelle affaire'}</h2>
              </CardHeader>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Affaire ID"
                    value={formData.affaire_id}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder={
                      formData.statut === 'Ouverte' || formData.statut === 'Prévisionnelle'
                        ? 'Sera généré automatiquement...'
                        : 'Vide (statut ≠ Ouverte/Prévisionnelle)'
                    }
                  />
                  <Select
                    label="Site"
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    required
                    options={[
                      { value: '', label: 'Sélectionner un site...' },
                      ...SITES_LIST.map((site) => ({ value: site, label: site }))
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Tranche"
                    value={formData.tranche}
                    onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
                    required
                    options={[
                      { value: '', label: 'Sélectionner une tranche...' },
                      ...TRANCHES_LIST.map((tranche) => ({ value: tranche, label: tranche }))
                    ]}
                  />
                  <Select
                    label="Statut"
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    required
                    options={[
                      { value: 'Ouverte', label: 'Ouverte' },
                      { value: 'Prévisionnelle', label: 'Prévisionnelle' },
                      { value: 'Clôturé', label: 'Clôturé' }
                    ]}
                  />
                </div>

                <Input
                  label="Libellé (Affaire)"
                  value={formData.libelle}
                  onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                  required
                  placeholder="Ex: PACK TEM"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Responsable"
                    value={formData.responsable || ''}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    options={[
                      { value: '', label: 'Sélectionner un responsable...' },
                      ...responsablesDisponibles.map((resp) => ({ value: resp, label: resp }))
                    ]}
                  />
                  <Input
                    label="Numéro de compte"
                    value={formData.compte || ''}
                    onChange={(e) => setFormData({ ...formData, compte: e.target.value })}
                    placeholder="Ex: 123ABC456"
                  />
                </div>

                <Input
                  label="Budget (H)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget_heures || ''}
                  onChange={(e) => setFormData({ ...formData, budget_heures: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAffaire(null)
                      setFormData({
                        id: '',
                        affaire_id: '',
                        site: '',
                        libelle: '',
                        tranche: '',
                        statut: 'Ouverte',
                        budget_heures: 0,
                        raf_heures: 0,
                        date_maj_raf: undefined,
                        responsable: '',
                        compte: '',
                        actif: true,
                      })
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    type="submit"
                  >
                    {editingAffaire ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && affaireToDelete && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => {
              setShowDeleteModal(false)
              setAffaireToDelete(null)
              setDeleteConfirmText('')
            }}
          >
            <Card className="max-w-md w-full mx-2 sm:mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader gradient="orange" icon={<Trash2 className="w-6 h-6 text-red-600" />}>
                <h2 className="text-2xl font-bold text-gray-800">Supprimer l&apos;affaire</h2>
              </CardHeader>
              
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold mb-2">⚠️ Attention : Cette action est irréversible</p>
                  <p className="text-gray-700 text-sm">
                    Vous êtes sur le point de supprimer l&apos;affaire :
                  </p>
                  <p className="text-gray-900 font-bold mt-2">
                    {affaireToDelete.affaire_id || affaireToDelete.libelle} - {affaireToDelete.site}
                  </p>
                  {affaireToDelete.affaire_id && (
                    <p className="text-gray-600 text-xs mt-1">
                      ID: {affaireToDelete.affaire_id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pour confirmer, tapez <span className="font-bold text-red-600">&quot;Effacer&quot;</span> :
                  </label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Effacer"
                    className="border-2 border-red-300 focus:border-red-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setAffaireToDelete(null)
                      setDeleteConfirmText('')
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Trash2 className="w-5 h-5" />}
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmText.trim() !== 'Effacer'}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
