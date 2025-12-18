'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAffaires } from '@/hooks/useAffaires'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2, Plus, Trash2, Edit2, Search, AlertCircle, CheckCircle2, Eye, EyeOff, FileSpreadsheet } from 'lucide-react'
import { generateAffaireId, SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'
import { ImportExcel } from '@/components/Affaires/ImportExcel'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function AffairesPage() {
  const [showImport, setShowImport] = useState(false)
  const { affaires: allAffaires, loading, error, saveAffaire, deleteAffaire, loadAffaires } = useAffaires()
  
  // Filtres en cascade (comme la page Planning)
  const [responsable, setResponsable] = useState('')
  const [site, setSite] = useState('')
  const [tranche, setTranche] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
  const [hideClosed, setHideClosed] = useState(true) // Masquer les clôturées par défaut
  
  // Filtrer les affaires actives et ouvertes/prévisionnelles (sauf si hideClosed est désactivé)
  const affairesActives = allAffaires.filter(
    (a) => {
      // Masquer les clôturées si hideClosed est activé
      if (hideClosed && a.statut === 'Clôturé') {
        return false
      }
      return true
    }
  )

  // Extraire les responsables uniques depuis les affaires
  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable sélectionné
  const affairesFiltreesParResponsable = responsable
    ? affairesActives.filter((a) => a.responsable === responsable)
    : affairesActives

  // Extraire les sites uniques depuis les affaires filtrées par responsable
  const sitesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsable.map((a) => a.site).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable et le site sélectionnés
  const affairesFiltreesParResponsableEtSite = site
    ? affairesFiltreesParResponsable.filter((a) => a.site === site)
    : affairesFiltreesParResponsable

  // Extraire les tranches uniques depuis les affaires filtrées
  const tranchesDisponibles = Array.from(
    new Set(affairesFiltreesParResponsableEtSite.map((a) => a.tranche).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon responsable, site et tranche
  const affairesFiltreesParTranche = tranche
    ? affairesFiltreesParResponsableEtSite.filter((a) => a.tranche === tranche)
    : affairesFiltreesParResponsableEtSite

  // Filtrer par numéro de compte si renseigné (recherche dans affaire_id et compte)
  const affaires = numeroCompte
    ? affairesFiltreesParTranche.filter((a) => 
        (a.affaire_id && a.affaire_id.toLowerCase().includes(numeroCompte.toLowerCase())) ||
        (a.compte && a.compte.toLowerCase().includes(numeroCompte.toLowerCase()))
      )
    : affairesFiltreesParTranche

  // Réinitialiser les filtres en cascade quand on change le responsable
  useEffect(() => {
    if (responsable) {
      // Réinitialiser site, tranche et numéro de compte si le responsable change
      setSite('')
      setTranche('')
      setNumeroCompte('')
    }
  }, [responsable])

  // Réinitialiser tranche et numéro de compte quand le site change
  useEffect(() => {
    if (site) {
      setTranche('')
      setNumeroCompte('')
    }
  }, [site])

  // Réinitialiser numéro de compte quand la tranche change
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

  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Générer automatiquement l'affaire_id lorsque tranche, site, libelle ou statut changent
  useEffect(() => {
    // Générer l'ID uniquement si tous les champs nécessaires sont remplis
    if (formData.tranche && formData.site && formData.libelle && formData.statut) {
      const generatedId = generateAffaireId(
        formData.tranche,
        formData.site,
        formData.libelle,
        formData.statut
      )
      // Mettre à jour l'ID seulement s'il est différent (évite les boucles infinies)
      if (generatedId !== formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: generatedId }))
      }
    } else {
      // Si les champs ne sont plus complets, vider l'ID
      if (formData.affaire_id) {
        setFormData((prev) => ({ ...prev, affaire_id: '' }))
      }
    }
  }, [formData.tranche, formData.site, formData.libelle, formData.statut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('[AffairesPage] handleSubmit - formData:', formData)
      console.log('[AffairesPage] handleSubmit - formData.affaire_id:', formData.affaire_id, 'type:', typeof formData.affaire_id)
      console.log('[AffairesPage] handleSubmit - formData.statut:', formData.statut)
      
      // Si l'affaire_id n'est pas encore généré mais devrait l'être, le générer maintenant
      let affaireIdToSave: string | null = null
      if (formData.tranche && formData.site && formData.libelle && formData.statut) {
        const generatedId = generateAffaireId(
          formData.tranche,
          formData.site,
          formData.libelle,
          formData.statut
        )
        // Utiliser l'ID généré si disponible, sinon celui du formData
        affaireIdToSave = generatedId && generatedId.trim() !== '' 
          ? generatedId.trim() 
          : (formData.affaire_id && formData.affaire_id.trim() !== '' ? formData.affaire_id.trim() : null)
      } else {
        // Si les champs ne sont pas complets, utiliser celui du formData ou null
        affaireIdToSave = formData.affaire_id && formData.affaire_id.trim() !== '' 
          ? formData.affaire_id.trim() 
          : null
      }
      
      console.log('[AffairesPage] handleSubmit - affaireIdToSave (après génération):', affaireIdToSave, 'type:', typeof affaireIdToSave)
      
      const affaireToSave = {
        ...formData,
        affaire_id: affaireIdToSave, // null si vide, sinon la valeur trimée
        date_creation: formData.id ? new Date() : new Date(),
        date_modification: new Date(),
      }
      
      console.log('[AffairesPage] handleSubmit - affaireToSave:', affaireToSave)
      console.log('[AffairesPage] handleSubmit - affaireToSave.affaire_id:', affaireToSave.affaire_id, 'type:', typeof affaireToSave.affaire_id)
      
      await saveAffaire(affaireToSave)
      // Réinitialiser le formulaire
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
      setIsEditing(false)
      setShowModal(false)
    } catch (err: any) {
      console.error('[AffairesPage] Erreur:', err)
      // Afficher un message d'erreur à l'utilisateur
      alert(
        'Erreur lors de l\'enregistrement :\n\n' +
        (err.message || 'Une erreur inattendue s\'est produite') +
        '\n\nVeuillez consulter la console pour plus de détails.'
      )
    }
  }

  // Fonction pour normaliser le site (correspondance avec SITES_LIST)
  const normalizeSite = (siteValue: string | undefined | null): string => {
    if (!siteValue) return ''
    const normalized = siteValue.trim()
    
    // Recherche exacte (insensible à la casse)
    for (const site of SITES_LIST) {
      if (site.toLowerCase() === normalized.toLowerCase()) {
        return site // Retourner la valeur exacte de la liste
      }
    }
    
    // Si non trouvé, retourner la valeur originale (sera affichée mais ne correspondra pas à une option)
    console.warn('[AffairesPage] Site non trouvé dans SITES_LIST:', normalized)
    return normalized
  }

  // Fonction pour normaliser la tranche (correspondance avec TRANCHES_LIST)
  const normalizeTranche = (trancheValue: string | undefined | null): string => {
    if (!trancheValue) return ''
    const normalized = trancheValue.trim()
    
    // Cas spécial : "0" peut être utilisé comme tranche
    if (normalized === '0') {
      return '0'
    }
    
    // Recherche exacte (insensible à la casse)
    for (const tranche of TRANCHES_LIST) {
      if (tranche.toLowerCase() === normalized.toLowerCase()) {
        return tranche // Retourner la valeur exacte de la liste
      }
    }
    
    // Si non trouvé, retourner la valeur originale (sera affichée mais ne correspondra pas à une option)
    console.warn('[AffairesPage] Tranche non trouvée dans TRANCHES_LIST:', normalized)
    return normalized
  }

  const handleRowClick = (affaire: typeof affaires[0]) => {
    console.log('[AffairesPage] handleRowClick - affaire:', affaire)
    console.log('[AffairesPage] handleRowClick - affaire.site (raw):', affaire.site)
    console.log('[AffairesPage] handleRowClick - affaire.tranche (raw):', affaire.tranche)
    
    const normalizedSite = normalizeSite(affaire.site)
    const normalizedTranche = normalizeTranche(affaire.tranche)
    
    console.log('[AffairesPage] handleRowClick - normalizedSite:', normalizedSite)
    console.log('[AffairesPage] handleRowClick - normalizedTranche:', normalizedTranche)
    
    setFormData({
      id: affaire.id,
      affaire_id: affaire.affaire_id || '',
      site: normalizedSite,
      libelle: affaire.libelle,
      tranche: normalizedTranche,
      statut: affaire.statut || 'Ouverte',
      budget_heures: affaire.budget_heures || 0,
      raf_heures: affaire.raf_heures || 0,
      date_maj_raf: affaire.date_maj_raf,
      responsable: affaire.responsable || '',
      compte: affaire.compte || '',
      actif: affaire.actif,
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette affaire ?')) {
      try {
        await deleteAffaire(id)
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
        setIsEditing(false)
      } catch (err) {
        console.error('[AffairesPage] Erreur suppression:', err)
      }
    }
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
    setIsEditing(false)
    setShowModal(true)
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec icône */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Affaires
              </h1>
              <p className="text-gray-600 mt-1">Créez et gérez les affaires et leurs sites</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              {showImport ? 'Masquer import' : 'Importer Excel'}
            </button>
            <button
              onClick={handleNew}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouvelle affaire
            </button>
          </div>
        </div>

        {/* Composant d'import Excel */}
        {showImport && (
          <ImportExcel
            onImportComplete={() => {
              loadAffaires()
              setShowImport(false)
            }}
          />
        )}

        {/* Filtres - Design moderne (même système que Planning) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800">Filtres</h2>
            </div>
            <button
              type="button"
              onClick={() => setHideClosed(!hideClosed)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                hideClosed
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hideClosed ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Masquer les clôturées
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Afficher les clôturées
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Numéro de compte (filtre intelligent) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Numéro de compte
              </label>
              <input
                type="text"
                value={numeroCompte}
                onChange={(e) => {
                  setNumeroCompte(e.target.value)
                }}
                placeholder="Rechercher par numéro..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
              />
            </div>

            {/* Responsable */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Responsable
              </label>
              <select
                value={responsable}
                onChange={(e) => {
                  setResponsable(e.target.value)
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
              >
                <option value="">Tous les responsables...</option>
                {responsablesDisponibles.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Site
              </label>
              <select
                value={site}
                onChange={(e) => {
                  setSite(e.target.value)
                }}
                disabled={!responsable && responsablesDisponibles.length > 0}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Tous les sites...</option>
                {sitesDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Tranche */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Tranche
              </label>
              <select
                value={tranche}
                onChange={(e) => {
                  setTranche(e.target.value)
                }}
                disabled={!site}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Toutes les tranches...</option>
                {tranchesDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des affaires */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Liste des affaires</h2>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
              {affaires.length}
            </span>
          </div>

          {loading ? (
            <Loading message="Chargement des affaires..." />
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
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Libellé
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tranche
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Compte
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      RAF
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date maj RAF
                    </th>
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
                        className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleRowClick(affaire)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{affaire.site}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.responsable || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{affaire.libelle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.tranche || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.compte || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Afficher le statut réel (Ouverte/Prévisionnelle/Clôturé) */}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.budget_heures !== undefined ? affaire.budget_heures.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.raf_heures !== undefined ? affaire.raf_heures.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {affaire.date_maj_raf ? format(affaire.date_maj_raf, 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de création/modification */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => {
            setShowModal(false)
            setIsEditing(false)
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
          }}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEditing ? 'Modifier une affaire' : 'Nouvelle affaire'}
                  </h2>
                </div>
                {isEditing && (
                  <button
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cette affaire ?')) {
                        handleDelete(formData.id)
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Première ligne : Affaire ID et Site */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Affaire ID
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        {formData.statut === 'Ouverte' || formData.statut === 'Prévisionnelle'
                          ? '(Généré automatiquement)'
                          : '(Vide si statut ≠ Ouverte/Prévisionnelle)'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.affaire_id}
                      readOnly
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                      placeholder={
                        formData.statut === 'Ouverte' || formData.statut === 'Prévisionnelle'
                          ? 'Sera généré automatiquement...'
                          : 'Vide (statut ≠ Ouverte/Prévisionnelle)'
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Site <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      required
                    >
                      <option value="">Sélectionner un site...</option>
                      {SITES_LIST.map((site) => (
                        <option key={site} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deuxième ligne : Tranche et Statut */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Tranche <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tranche}
                      onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      required
                    >
                      <option value="">Sélectionner une tranche...</option>
                      {TRANCHES_LIST.map((tranche) => (
                        <option key={tranche} value={tranche}>
                          {tranche}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Statut <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      required
                    >
                      <option value="Ouverte">Ouverte</option>
                      <option value="Prévisionnelle">Prévisionnelle</option>
                      <option value="Clôturé">Clôturé</option>
                    </select>
                  </div>
                </div>

                {/* Troisième ligne : Libellé */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Libellé (Affaire) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.libelle}
                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                    required
                    placeholder="Ex: PACK TEM"
                  />
                </div>

                {/* Quatrième ligne : Responsable et Numéro de compte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={formData.responsable || ''}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      placeholder="Nom du responsable"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Numéro de compte
                    </label>
                    <input
                      type="text"
                      value={formData.compte || ''}
                      onChange={(e) => setFormData({ ...formData, compte: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      placeholder="Ex: 123ABC456"
                    />
                  </div>
                </div>

                {/* Cinquième ligne : Budget et RAF */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Budget (H)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.budget_heures || ''}
                      onChange={(e) => setFormData({ ...formData, budget_heures: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      RAF (H)
                    </label>
                    <input
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
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Sixième ligne : Date MAJ du RAF */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Date MAJ du RAF
                  </label>
                  <input
                    type="date"
                    value={formData.date_maj_raf ? format(formData.date_maj_raf, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({ ...formData, date_maj_raf: e.target.value ? new Date(e.target.value) : undefined })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white text-sm"
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setIsEditing(false)
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
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-200 font-medium text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg font-semibold flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isEditing ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
