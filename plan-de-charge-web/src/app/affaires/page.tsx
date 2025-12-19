'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAffaires } from '@/hooks/useAffaires'
import { Loading } from '@/components/Common/Loading'
import { Card, CardHeader } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Input } from '@/components/UI/Input'
import { Select } from '@/components/UI/Select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Building2, Plus, Search, AlertCircle, CheckCircle2, 
  Eye, EyeOff, FileSpreadsheet, Filter 
} from 'lucide-react'
import { generateAffaireId, SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'
import { ImportExcel } from '@/components/Affaires/ImportExcel'

export const dynamic = 'force-dynamic'

export default function AffairesPage() {
  const [showImport, setShowImport] = useState(false)
  const { affaires: allAffaires, loading, error, saveAffaire, loadAffaires } = useAffaires()
  
  const [responsable, setResponsable] = useState('')
  const [site, setSite] = useState('')
  const [tranche, setTranche] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
  const [hideClosed, setHideClosed] = useState(true)
  
  const affairesActives = allAffaires.filter((a) => {
    if (hideClosed && a.statut === 'Clôturé') return false
    return true
  })

  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter((r): r is string => Boolean(r)))
  ).sort()

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
    new Set(affairesFiltreesParResponsableEtSite.map((a) => a.tranche).filter(Boolean))
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
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState<string | number | Date | undefined>('')

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
      
      await saveAffaire(affaireToSave)
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
      setShowModal(false)
    } catch (err: any) {
      console.error('[AffairesPage] Erreur:', err)
      alert('Erreur lors de l\'enregistrement :\n\n' + (err.message || 'Une erreur inattendue s\'est produite'))
    }
  }

  const normalizeSite = (siteValue: string | undefined | null): string => {
    if (!siteValue) return ''
    const normalized = siteValue.trim()
    for (const site of SITES_LIST) {
      if (site.toLowerCase() === normalized.toLowerCase()) {
        return site
      }
    }
    return normalized
  }

  const normalizeTranche = (trancheValue: string | undefined | null): string => {
    if (!trancheValue) return ''
    const normalized = trancheValue.trim()
    if (normalized === '0') return '0'
    for (const tranche of TRANCHES_LIST) {
      if (tranche.toLowerCase() === normalized.toLowerCase()) {
        return tranche
      }
    }
    return normalized
  }

  const handleCellEdit = (affaire: typeof affaires[0], field: string) => {
    let initialValue: string | number | Date | undefined = ''
    switch (field) {
      case 'site': initialValue = affaire.site || ''; break
      case 'responsable': initialValue = affaire.responsable || ''; break
      case 'libelle': initialValue = affaire.libelle || ''; break
      case 'tranche': initialValue = affaire.tranche || ''; break
      case 'compte': initialValue = affaire.compte || ''; break
      case 'statut': initialValue = affaire.statut || 'Ouverte'; break
      case 'budget_heures': initialValue = affaire.budget_heures || 0; break
      case 'raf_heures': initialValue = affaire.raf_heures || 0; break
      case 'date_maj_raf': initialValue = affaire.date_maj_raf ? format(affaire.date_maj_raf, 'yyyy-MM-dd') : ''; break
    }
    setEditingCell({ rowId: affaire.id, field })
    setEditingValue(initialValue)
  }
  
  const handleCellSave = async (affaire: typeof affaires[0], field: string) => {
    if (!editingCell || editingCell.rowId !== affaire.id || editingCell.field !== field) return
    
    try {
      const normalizedSite = normalizeSite(affaire.site)
      const normalizedTranche = normalizeTranche(affaire.tranche)
      
      let newSite = normalizedSite
      let newTranche = normalizedTranche
      
      if (field === 'site') newSite = normalizeSite(String(editingValue))
      if (field === 'tranche') newTranche = normalizeTranche(String(editingValue))
      
      const updatedAffaire = {
        ...affaire,
        site: newSite,
        responsable: field === 'responsable' ? String(editingValue) : affaire.responsable,
        libelle: field === 'libelle' ? String(editingValue) : affaire.libelle,
        tranche: newTranche,
        compte: field === 'compte' ? String(editingValue) : affaire.compte,
        statut: field === 'statut' ? String(editingValue) : affaire.statut,
        budget_heures: field === 'budget_heures' ? (typeof editingValue === 'number' ? editingValue : parseFloat(String(editingValue)) || 0) : affaire.budget_heures,
        raf_heures: field === 'raf_heures' ? (typeof editingValue === 'number' ? editingValue : parseFloat(String(editingValue)) || 0) : affaire.raf_heures,
        date_maj_raf: field === 'date_maj_raf' ? (editingValue && String(editingValue).trim() !== '' ? new Date(String(editingValue)) : undefined) : affaire.date_maj_raf,
        date_modification: new Date(),
      }
      
      if (field === 'statut' || field === 'tranche' || field === 'site' || field === 'libelle') {
        const newLibelle = field === 'libelle' ? String(editingValue) : affaire.libelle
        const newStatut = field === 'statut' ? String(editingValue) : affaire.statut
        
        if (newTranche && newSite && newLibelle && newStatut) {
          const generatedId = generateAffaireId(newTranche, newSite, newLibelle, newStatut)
          updatedAffaire.affaire_id = (newStatut === 'Ouverte' || newStatut === 'Prévisionnelle') ? generatedId : null
        } else {
          updatedAffaire.affaire_id = null
        }
      }
      
      if (field === 'raf_heures') {
        const rafValue = typeof editingValue === 'number' ? editingValue : parseFloat(String(editingValue)) || 0
        if (rafValue > 0) {
          updatedAffaire.date_maj_raf = new Date()
        }
      }
      
      await saveAffaire(updatedAffaire)
      setEditingCell(null)
      setEditingValue('')
    } catch (err: any) {
      console.error('[AffairesPage] Erreur sauvegarde inline:', err)
      alert('Erreur lors de la sauvegarde :\n\n' + (err.message || 'Une erreur inattendue s\'est produite'))
    }
  }
  
  const handleCellCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const handleNew = () => {
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
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Affaires
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Créez et gérez les affaires et leurs sites</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet className="w-5 h-5" />}
              onClick={() => setShowImport(!showImport)}
            >
              {showImport ? 'Masquer import' : 'Importer Excel'}
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={handleNew}
            >
              Nouvelle affaire
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Liste des affaires */}
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Site</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Responsable</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Libellé</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tranche</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Compte</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RAF</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date maj RAF</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affaires.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
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
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'site')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'site' ? (
                            <select
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'site')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'site')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                              {SITES_LIST.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <span>{affaire.site}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'responsable')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'responsable' ? (
                            <input
                              type="text"
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'responsable')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'responsable')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.responsable || '-'}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'libelle')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'libelle' ? (
                            <input
                              type="text"
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'libelle')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'libelle')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.libelle}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'tranche')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'tranche' ? (
                            <select
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'tranche')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'tranche')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                              {TRANCHES_LIST.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          ) : (
                            <span>{affaire.tranche || '-'}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'compte')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'compte' ? (
                            <input
                              type="text"
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'compte')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'compte')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.compte || '-'}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'statut')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'statut' ? (
                            <select
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'statut')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'statut')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                              <option value="Ouverte">Ouverte</option>
                              <option value="Prévisionnelle">Prévisionnelle</option>
                              <option value="Clôturé">Clôturé</option>
                            </select>
                          ) : (
                            <span>
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
                            </span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'budget_heures')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'budget_heures' ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={typeof editingValue === 'number' ? editingValue : (typeof editingValue === 'string' ? parseFloat(editingValue) || 0 : 0)}
                              onChange={(e) => setEditingValue(parseFloat(e.target.value) || 0)}
                              onBlur={() => handleCellSave(affaire, 'budget_heures')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'budget_heures')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.budget_heures !== undefined ? affaire.budget_heures.toFixed(2) : '-'}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'raf_heures')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'raf_heures' ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={typeof editingValue === 'number' ? editingValue : (typeof editingValue === 'string' ? parseFloat(editingValue) || 0 : 0)}
                              onChange={(e) => setEditingValue(parseFloat(e.target.value) || 0)}
                              onBlur={() => handleCellSave(affaire, 'raf_heures')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'raf_heures')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.raf_heures !== undefined ? affaire.raf_heures.toFixed(2) : '-'}</span>
                          )}
                        </td>
                        
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          onClick={() => handleCellEdit(affaire, 'date_maj_raf')}
                          title="Cliquez pour modifier"
                        >
                          {editingCell?.rowId === affaire.id && editingCell?.field === 'date_maj_raf' ? (
                            <input
                              type="date"
                              value={String(editingValue)}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleCellSave(affaire, 'date_maj_raf')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(affaire, 'date_maj_raf')
                                if (e.key === 'Escape') handleCellCancel()
                              }}
                              autoFocus
                              className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          ) : (
                            <span>{affaire.date_maj_raf ? format(affaire.date_maj_raf, 'dd/MM/yyyy', { locale: fr }) : '-'}</span>
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

        {/* Modal de création/modification */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => {
              setShowModal(false)
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
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader gradient="indigo" icon={<Plus className="w-6 h-6 text-indigo-600" />}>
                <h2 className="text-2xl font-bold text-gray-800">Nouvelle affaire</h2>
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
                  <Input
                    label="Responsable"
                    value={formData.responsable || ''}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    placeholder="Nom du responsable"
                  />
                  <Input
                    label="Numéro de compte"
                    value={formData.compte || ''}
                    onChange={(e) => setFormData({ ...formData, compte: e.target.value })}
                    placeholder="Ex: 123ABC456"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Budget (H)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_heures || ''}
                    onChange={(e) => setFormData({ ...formData, budget_heures: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                  <Input
                    label="RAF (H)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.raf_heures || ''}
                    onChange={(e) => {
                      const rafValue = parseFloat(e.target.value) || 0
                      setFormData({ 
                        ...formData, 
                        raf_heures: rafValue,
                        date_maj_raf: rafValue > 0 ? new Date() : formData.date_maj_raf
                      })
                    }}
                    placeholder="0.00"
                  />
                </div>

                <Input
                  label="Date MAJ du RAF"
                  type="date"
                  value={formData.date_maj_raf ? format(formData.date_maj_raf, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setFormData({ ...formData, date_maj_raf: e.target.value ? new Date(e.target.value) : undefined })}
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false)
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
                    Créer
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
