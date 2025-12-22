'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AlertCircle, Loader2, Grid3x3, LayoutGrid, X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import { BesoinsList } from './BesoinsList'
import { BesoinsGrid } from './BesoinsGrid'
import { AffectationPanel } from './AffectationPanel'
import { AffectationMassePanel } from './AffectationMassePanel'
import { useToast } from '@/components/UI/Toast'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { periodeToBesoin } from '@/utils/planning/planning.compute'
import { getDatesBetween, normalizeDateToUTC, isBusinessDay } from '@/utils/calendar'
// Note: triggerConsolidationPeriodesCharge retiré - la consolidation se fait automatiquement via les triggers SQL

import type { Precision } from '@/types/charge'

interface Planning3Props {
  affaireId: string
  site: string
  dateDebut?: Date
  dateFin?: Date
  precision?: Precision
  onRegisterOpenChargeModal?: (fn: () => void) => void // Callback pour enregistrer la fonction d'ouverture du modal
  refreshGrilleChargeRef?: React.MutableRefObject<(() => Promise<void>) | null> // Ref pour appeler le refresh de la grille
}

export function Planning3({ affaireId, site, dateDebut, dateFin, precision = 'JOUR', onRegisterOpenChargeModal, refreshGrilleChargeRef }: Planning3Props) {
  const [selectedBesoin, setSelectedBesoin] = useState<BesoinPeriode | null>(null)
  const [besoinsMasse, setBesoinsMasse] = useState<BesoinPeriode[]>([])
  const [vue, setVue] = useState<'tuile' | 'grille'>('tuile')
  const [showExternesGlobal, setShowExternesGlobal] = useState(false) // Toggle global pour toutes les compétences
  const [showChargeMasseModal, setShowChargeMasseModal] = useState(false)
  const [chargeMasseForm, setChargeMasseForm] = useState({
    competence: '',
    dateDebut: dateDebut || new Date(),
    dateFin: dateFin || new Date(),
    nbRessources: 1,
    ressourceIds: [] as string[], // Tableau pour sélection multiple
  })
  const [isGeneratingChargeMasse, setIsGeneratingChargeMasse] = useState(false)
  const { addToast } = useToast()

  // Hooks pour charger les données
  const { periodes, loading: loadingPeriodes, deletePeriode, refresh: refreshPeriodes } = useCharge({
    affaireId,
    site,
    autoRefresh: true,
    enableRealtime: true,
  })

  const { affectations, loading: loadingAffectations, refresh: refreshAffectations } =
    useAffectations({
      affaireId,
      site,
      autoRefresh: true,
      enableRealtime: true,
    })

  // Charger TOUTES les ressources actives (pas seulement du site) pour permettre les transferts
  // Le modal AffectationPanel doit pouvoir afficher les ressources d'autres sites
  const { ressources: allRessources, competences: allCompetences, loading: loadingRessources } = useRessources({
    actif: true,
    // site non spécifié = charger toutes les ressources de tous les sites
  })

  // Charger les ressources du site pour le modal de charge
  const { ressources: ressourcesSite, competences: competencesSite } = useRessources({
    site,
    actif: true,
    enableRealtime: false,
  })

  const { saveAffectation } = useAffectations({
    affaireId,
    site,
    autoRefresh: false,
    enableRealtime: false,
  })

  const { savePeriodesBatch } = useCharge({
    affaireId,
    site,
    enableRealtime: false,
  })

  // Charger toutes les compétences distinctes (hors site) comme dans Planning2
  // Note: Actuellement non utilisé mais disponible pour futures fonctionnalités
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [toutesCompetences, setToutesCompetences] = useState<string[]>([])
  const [loadingCompetences, setLoadingCompetences] = useState(true)

  useEffect(() => {
    const loadToutesCompetences = async () => {
      try {
        setLoadingCompetences(true)
        const supabase = createClient()
        
        // Récupérer toutes les compétences distinctes depuis ressources_competences
        const { data: competencesData, error: competencesError } = await supabase
          .from('ressources_competences')
          .select('competence')
          .not('competence', 'is', null)
        
        if (competencesError) throw competencesError
        
        // Extraire les compétences uniques et les trier
        const competencesSet = new Set<string>()
        ;(competencesData || []).forEach((item) => {
          if (item.competence && item.competence.trim()) {
            competencesSet.add(item.competence.trim())
          }
        })
        
        const competencesList = Array.from(competencesSet).sort()
        setToutesCompetences(competencesList)
      } catch (err) {
        console.error('[Planning3] Erreur chargement toutes compétences:', err)
        setToutesCompetences([])
      } finally {
        setLoadingCompetences(false)
      }
    }
    
    loadToutesCompetences()
  }, [])

  // Charger l'UUID de l'affaire depuis la base de données (pour le modal de charge)
  const [affaireUuidFromDb, setAffaireUuidFromDb] = useState<string | null>(null)
  
  useEffect(() => {
    const loadAffaireUuid = async () => {
      try {
        const supabase = createClient()
        const { data: affaireData } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireId)
          .eq('site', site)
          .maybeSingle()
        
        if (affaireData) {
          setAffaireUuidFromDb(affaireData.id)
        }
      } catch (err) {
        console.error('[Planning3] Erreur chargement UUID affaire:', err)
      }
    }
    
    if (affaireId && site) {
      loadAffaireUuid()
    }
  }, [affaireId, site])

  // Filtrer les ressources selon la compétence sélectionnée pour le modal
  // et vérifier les conflits/absences
  const ressourcesFiltrees = useMemo(() => {
    if (!chargeMasseForm.competence || !chargeMasseForm.dateDebut || !chargeMasseForm.dateFin) return []
    
    return ressourcesSite
      .filter((ressource) => {
        const ressourceCompetences = competencesSite.get(ressource.id) || []
        return ressourceCompetences.some((comp) => comp.competence === chargeMasseForm.competence)
      })
      .map((ressource) => {
        const conflitInfo = hasConflitOuAbsence(ressource.id, chargeMasseForm.dateDebut, chargeMasseForm.dateFin)
        return {
          ...ressource,
          hasConflit: conflitInfo.hasConflit,
          hasAbsence: conflitInfo.hasAbsence,
          raison: conflitInfo.raison,
          disabled: conflitInfo.hasConflit || conflitInfo.hasAbsence,
        }
      })
      .sort((a, b) => {
        // Trier : disponibles d'abord, puis conflits/absences
        if (a.disabled && !b.disabled) return 1
        if (!a.disabled && b.disabled) return -1
        return a.nom.localeCompare(b.nom)
      })
  }, [ressourcesSite, competencesSite, chargeMasseForm.competence, chargeMasseForm.dateDebut, chargeMasseForm.dateFin, hasConflitOuAbsence])

  // Charger TOUTES les absences (pas seulement du site) pour vérifier les disponibilités
  // des ressources d'autres sites dans le modal AffectationPanel
  const { absences, loading: loadingAbsences } = useAbsences({
    // site non spécifié = charger toutes les absences de tous les sites
  })

  // Charger TOUTES les affectations pour détecter les conflits
  const [allAffectations, setAllAffectations] = useState<any[]>([])
  const [loadingAllAffectations, setLoadingAllAffectations] = useState(false)

  useEffect(() => {
    const loadAllAffectations = async () => {
      try {
        setLoadingAllAffectations(true)
        const supabase = createClient()
        const { data: allAff, error } = await supabase
          .from('affectations')
          .select('*')
          .order('date_debut', { ascending: true })
        
        if (!error && allAff) {
          const affectationsAvecDates = allAff.map((a: any) => ({
            ...a,
            date_debut: a.date_debut ? new Date(a.date_debut) : new Date(),
            date_fin: a.date_fin ? new Date(a.date_fin) : new Date(),
          }))
          setAllAffectations(affectationsAvecDates)
        }
      } catch (err) {
        console.error('[Planning3] Erreur chargement toutes affectations:', err)
      } finally {
        setLoadingAllAffectations(false)
      }
    }
    
    loadAllAffectations()
  }, [])

  // Vérifier si une ressource a un conflit ou une absence sur la période
  const hasConflitOuAbsence = useCallback((ressourceId: string, dateDebut: Date, dateFin: Date): { hasConflit: boolean; hasAbsence: boolean; raison?: string } => {
    const dateDebutUTC = normalizeDateToUTC(dateDebut)
    const dateFinUTC = normalizeDateToUTC(dateFin)

    // Vérifier les absences
    const hasAbsence = absences.some((abs) => {
      if (abs.ressource_id !== ressourceId) return false
      const absDateDebut = normalizeDateToUTC(new Date(abs.date_debut))
      const absDateFin = normalizeDateToUTC(new Date(abs.date_fin))
      return absDateDebut <= dateFinUTC && absDateFin >= dateDebutUTC
    })

    if (hasAbsence) {
      return { hasConflit: false, hasAbsence: true, raison: 'Absence' }
    }

    // Vérifier les conflits (affectation sur une autre affaire)
    if (affaireUuid) {
      const hasConflit = allAffectations.some((aff: any) => {
        if (aff.ressource_id !== ressourceId) return false
        if (aff.affaire_id === affaireUuid) return false // Même affaire, pas un conflit
        
        const affDateDebut = normalizeDateToUTC(new Date(aff.date_debut))
        const affDateFin = normalizeDateToUTC(new Date(aff.date_fin))
        return affDateDebut <= dateFinUTC && affDateFin >= dateDebutUTC
      })

      if (hasConflit) {
        return { hasConflit: true, hasAbsence: false, raison: 'Affectée ailleurs' }
      }
    }

    return { hasConflit: false, hasAbsence: false }
  }, [absences, allAffectations, affaireUuid])

  // Récupérer l'UUID de l'affaire depuis les périodes ou depuis la base de données
  const affaireUuid = useMemo(() => {
    if (periodes.length > 0 && periodes[0].affaire_id) {
      return periodes[0].affaire_id
    }
    return affaireUuidFromDb
  }, [periodes, affaireUuidFromDb])

  // Enregistrer la fonction d'ouverture du modal dans le ref parent
  useEffect(() => {
    if (onRegisterOpenChargeModal) {
      const openModal = () => {
        console.log('[Planning3] Fonction openModal appelée, ouverture du modal')
        setShowChargeMasseModal(true)
      }
      console.log('[Planning3] Enregistrement de la fonction d\'ouverture du modal')
      onRegisterOpenChargeModal(openModal)
      return () => {
        // Nettoyer le ref quand le composant se démonte
        onRegisterOpenChargeModal(() => {})
      }
    }
  }, [onRegisterOpenChargeModal])

  // Note: La consolidation se fait automatiquement via les triggers SQL
  // Plus besoin d'appel manuel qui causait une récursion infinie

  // Calculer les besoins avec couverture (useMemo au lieu de useState + useEffect)
  // Filtrer par date si dateDebut et dateFin sont fournis
  const besoins = useMemo(() => {
    if (periodes.length > 0 && affectations.length >= 0) {
      let periodesFiltrees = periodes
      
      // Filtrer par période si les dates sont fournies
      if (dateDebut && dateFin) {
        periodesFiltrees = periodes.filter((periode) => {
          // Vérifier si la période chevauche avec la période sélectionnée
          return (
            (periode.date_debut <= dateFin && periode.date_fin >= dateDebut)
          )
        })
      }
      
      return periodesFiltrees.map((periode) => periodeToBesoin(periode, affectations))
    }
    return []
  }, [periodes, affectations, dateDebut, dateFin])

  const handleAffecter = (besoin: BesoinPeriode) => {
    setSelectedBesoin(besoin)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const handleAffectationSuccess = async () => {
    refreshAffectations()
    refreshPeriodes()
    // La consolidation se fait automatiquement via les triggers SQL
    // après chaque INSERT/UPDATE/DELETE sur periodes_charge
  }

  const handleAffecterMasse = (besoins: BesoinPeriode[]) => {
    setBesoinsMasse(besoins)
  }

  const loading = loadingPeriodes || loadingAffectations || loadingRessources || loadingAbsences || loadingCompetences

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!affaireId || !site) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <p className="text-amber-800 font-medium">
            Veuillez sélectionner une affaire et un site pour afficher le planning.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Toggle pour basculer entre vue tuile et vue grille + Toggle ressources externes */}
      <div className="flex justify-end items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          {/* Toggle ressources externes global */}
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 px-3 py-2">
            <button
              onClick={() => setShowExternesGlobal(!showExternesGlobal)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer ${
                showExternesGlobal ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={showExternesGlobal}
              aria-label={`${showExternesGlobal ? 'Désactiver' : 'Activer'} ressources externes pour toutes les compétences`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  showExternesGlobal ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 font-medium min-w-[30px]">
              {showExternesGlobal ? 'ON' : 'OFF'}
            </span>
            <span className="text-xs text-gray-500">Ressources externes</span>
          </div>

          {/* Toggle vue tuile/grille */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-1 flex gap-1">
            <button
              onClick={() => setVue('tuile')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${
                vue === 'tuile'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Vue tuile
            </button>
            <button
              onClick={() => setVue('grille')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${
                vue === 'grille'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Vue grille
            </button>
          </div>
        </div>
      </div>

      {/* Affichage conditionnel selon la vue sélectionnée */}
      {vue === 'tuile' ? (
        <BesoinsList
          besoins={besoins}
          onAffecter={handleAffecter}
          onAffecterMasse={handleAffecterMasse}
        />
      ) : (
        <BesoinsGrid
          besoins={besoins}
          onAffecter={handleAffecter}
          onAffecterMasse={handleAffecterMasse}
          affaireId={affaireId}
          site={site}
          dateDebut={dateDebut || new Date()}
          dateFin={dateFin || new Date()}
          precision={precision}
          showExternesGlobal={showExternesGlobal}
        />
      )}

      {selectedBesoin && affaireUuid && (
        <AffectationPanel
          besoin={selectedBesoin}
          affaireId={affaireId}
          affaireUuid={affaireUuid}
          ressources={allRessources}
          competences={allCompetences}
          affectations={affectations}
          absences={absences}
          onClose={() => setSelectedBesoin(null)}
          onSuccess={handleAffectationSuccess}
        />
      )}

      {besoinsMasse.length > 0 && affaireUuid && (
        <AffectationMassePanel
          besoins={besoinsMasse}
          affaireId={affaireId}
          affaireUuid={affaireUuid}
          ressources={allRessources}
          competences={allCompetences}
          affectations={affectations}
          absences={absences}
          onClose={() => setBesoinsMasse([])}
          onSuccess={handleAffectationSuccess}
        />
      )}

      {/* Modal charge de masse */}
      {showChargeMasseModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Déclarer charge période</h3>
              <button
                onClick={() => setShowChargeMasseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compétence <span className="text-red-500">*</span>
                </label>
                <select
                  value={chargeMasseForm.competence}
                  onChange={(e) => setChargeMasseForm({ ...chargeMasseForm, competence: e.target.value, ressourceIds: [] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {toutesCompetences.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={chargeMasseForm.dateDebut.toISOString().split('T')[0]}
                  onChange={(e) => setChargeMasseForm({ ...chargeMasseForm, dateDebut: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={chargeMasseForm.dateFin.toISOString().split('T')[0]}
                  onChange={(e) => setChargeMasseForm({ ...chargeMasseForm, dateFin: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de ressources <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={chargeMasseForm.nbRessources}
                  onChange={(e) => setChargeMasseForm({ ...chargeMasseForm, nbRessources: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ressources (facultatif) - Sélectionnez jusqu'à {chargeMasseForm.nbRessources} ressource{chargeMasseForm.nbRessources > 1 ? 's' : ''}
                </label>
                {!chargeMasseForm.competence ? (
                  <p className="text-xs text-gray-500 mt-1">Sélectionnez d'abord une compétence</p>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                    {ressourcesFiltrees.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune ressource disponible pour cette compétence</p>
                    ) : (
                      ressourcesFiltrees.map((ressource) => {
                        const isSelected = chargeMasseForm.ressourceIds.includes(ressource.id)
                        const canSelect = !ressource.disabled && chargeMasseForm.ressourceIds.length < chargeMasseForm.nbRessources
                        
                        return (
                          <label
                            key={ressource.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              ressource.disabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-blue-50 text-blue-900'
                                : canSelect
                                ? 'hover:bg-gray-50'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={ressource.disabled || (!canSelect && !isSelected)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (chargeMasseForm.ressourceIds.length < chargeMasseForm.nbRessources) {
                                    setChargeMasseForm({
                                      ...chargeMasseForm,
                                      ressourceIds: [...chargeMasseForm.ressourceIds, ressource.id],
                                    })
                                  }
                                } else {
                                  setChargeMasseForm({
                                    ...chargeMasseForm,
                                    ressourceIds: chargeMasseForm.ressourceIds.filter((id) => id !== ressource.id),
                                  })
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="flex-1">
                              {ressource.nom} ({ressource.site})
                            </span>
                            {ressource.disabled && (
                              <span className="text-xs text-red-600 font-medium">
                                {ressource.raison}
                              </span>
                            )}
                          </label>
                        )
                      })
                    )}
                    {chargeMasseForm.ressourceIds.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {chargeMasseForm.ressourceIds.length} / {chargeMasseForm.nbRessources} ressource{chargeMasseForm.nbRessources > 1 ? 's' : ''} sélectionnée{chargeMasseForm.ressourceIds.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {isGeneratingChargeMasse && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Génération en cours...</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowChargeMasseModal(false)}
                disabled={isGeneratingChargeMasse}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!chargeMasseForm.competence || !chargeMasseForm.dateDebut || !chargeMasseForm.dateFin) {
                    addToast('Veuillez remplir tous les champs', 'error')
                    return
                  }
                  setIsGeneratingChargeMasse(true)
                  try {
                    const dates = getDatesBetween(chargeMasseForm.dateDebut, chargeMasseForm.dateFin)
                    const periodesACreer = dates
                      .filter((date) => isBusinessDay(date))
                      .map((date) => ({
                        competence: chargeMasseForm.competence,
                        date_debut: normalizeDateToUTC(date),
                        date_fin: normalizeDateToUTC(date),
                        nb_ressources: chargeMasseForm.nbRessources,
                        force_weekend_ferie: false,
                      }))
                    
                    await savePeriodesBatch(periodesACreer)
                    
                    // Affecter les ressources sélectionnées (seulement celles sans conflit/absence)
                    if (chargeMasseForm.ressourceIds.length > 0 && affaireUuid) {
                      const affectationsACreer = []
                      const ressourcesNonAffectees: string[] = []
                      
                      for (const ressourceId of chargeMasseForm.ressourceIds) {
                        // Vérifier à nouveau les conflits/absences avant d'affecter
                        const conflitInfo = hasConflitOuAbsence(ressourceId, chargeMasseForm.dateDebut, chargeMasseForm.dateFin)
                        
                        if (!conflitInfo.hasConflit && !conflitInfo.hasAbsence) {
                          affectationsACreer.push({
                            ressource_id: ressourceId,
                            competence: chargeMasseForm.competence,
                            date_debut: normalizeDateToUTC(chargeMasseForm.dateDebut),
                            date_fin: normalizeDateToUTC(chargeMasseForm.dateFin),
                            charge: 1,
                          })
                        } else {
                          const ressource = ressourcesFiltrees.find(r => r.id === ressourceId)
                          ressourcesNonAffectees.push(ressource?.nom || ressourceId)
                        }
                      }
                      
                      // Créer les affectations valides
                      if (affectationsACreer.length > 0) {
                        try {
                          await Promise.all(
                            affectationsACreer.map(aff => saveAffectation(aff))
                          )
                          
                          let message = `${periodesACreer.length} période(s) créée(s) et ${affectationsACreer.length} ressource(s) affectée(s)`
                          if (ressourcesNonAffectees.length > 0) {
                            message += `. ${ressourcesNonAffectees.length} ressource(s) non affectée(s) (conflit/absence): ${ressourcesNonAffectees.join(', ')}`
                          }
                          addToast(message, ressourcesNonAffectees.length > 0 ? 'warning' : 'success')
                        } catch (affectErr) {
                          console.error('[Planning3] Erreur création affectations:', affectErr)
                          addToast(`${periodesACreer.length} période(s) créée(s) mais erreur lors de l'affectation`, 'warning')
                        }
                      } else {
                        addToast(`${periodesACreer.length} période(s) créée(s) mais aucune ressource affectée (toutes en conflit/absence)`, 'warning')
                      }
                    } else {
                      addToast(`${periodesACreer.length} période(s) créée(s)`, 'success')
                    }
                    
                    setShowChargeMasseModal(false)
                    setChargeMasseForm({ competence: '', dateDebut: dateDebut || new Date(), dateFin: dateFin || new Date(), nbRessources: 1, ressourceIds: [] })
                    
                    // Rafraîchir toutes les données après création
                    const refreshPromises = [
                      refreshPeriodes(),
                      refreshAffectations()
                    ]
                    
                    // Ajouter le refresh de la grille de charge si disponible
                    if (refreshGrilleChargeRef?.current) {
                      refreshPromises.push(refreshGrilleChargeRef.current())
                    }
                    
                    await Promise.all(refreshPromises)
                    
                    // Attendre un peu pour que les données soient bien synchronisées
                    await new Promise(resolve => setTimeout(resolve, 500))
                    
                    addToast('Données rafraîchies', 'success')
                  } catch (err) {
                    console.error('[Planning3] Erreur charge de masse:', err)
                    addToast('Erreur lors de la création', 'error')
                  } finally {
                    setIsGeneratingChargeMasse(false)
                  }
                }}
                disabled={isGeneratingChargeMasse || !chargeMasseForm.competence}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingChargeMasse ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

