'use client'

import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Common/Layout'
import { GanttChart } from '@/components/Gantt/GanttChart'
import { Target, Building2, Calendar, Loader2, AlertCircle } from 'lucide-react'
import { useAffaires } from '@/hooks/useAffaires'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import { useSites } from '@/hooks/useSites'
import { useTransferts } from '@/hooks/useTransferts'
import { startOfMonth, endOfMonth, addMonths, subMonths, addDays, subDays, addWeeks, subWeeks, startOfMonth as startOfMonthFn, endOfMonth as endOfMonthFn } from 'date-fns'
import { formatPlageSemainesISO } from '@/utils/calendar'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Precision } from '@/types/charge'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

type ViewMode = 'affaire' | 'site'

export default function GanttPage() {
  const { affaires, loading: loadingAffaires } = useAffaires()
  const { sites: sitesList, loading: loadingSites } = useSites({ actif: true })
  
  const [viewMode, setViewMode] = useState<ViewMode>('affaire')
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [responsable, setResponsable] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
  const [ressourceFilter, setRessourceFilter] = useState('')
  
  // État pour la période - Initialisation à la date de base : 01/01/2026
  // Vue JOUR par défaut : 1 mois (01/01/2026 → 31/01/2026)
  const baseDate = new Date(2026, 0, 1) // 01/01/2026
  const [dateDebut, setDateDebut] = useState(baseDate)
  const [dateFin, setDateFin] = useState(endOfMonthFn(baseDate)) // 31/01/2026
  const [precision, setPrecision] = useState<Precision>('JOUR')

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
  )

  // Extraire les responsables uniques
  const responsablesDisponibles = Array.from(
    new Set(affairesActives.map((a) => a.responsable).filter(Boolean))
  ).sort()

  // Filtrer les affaires selon le responsable
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

  // Filtrer par numéro de compte si renseigné
  const affairesFiltreesFinales = numeroCompte
    ? affairesFiltreesParResponsableEtSite.filter((a) =>
        a.affaire_id && a.affaire_id.toLowerCase().includes(numeroCompte.toLowerCase())
      )
    : affairesFiltreesParResponsableEtSite

  // Réinitialiser les filtres en cascade
  useEffect(() => {
    if (responsable) {
      setSite('')
      setAffaireId('')
    }
  }, [responsable])

  useEffect(() => {
    if (site) {
      setAffaireId('')
    }
  }, [site])

  // Mettre à jour le site automatiquement quand une affaire est sélectionnée
  useEffect(() => {
    if (affaireId && viewMode === 'affaire') {
      const affaire = affairesFiltreesFinales.find((a) => a.affaire_id === affaireId)
      if (affaire && affaire.site !== site) {
        setSite(affaire.site)
      }
    }
  }, [affaireId, affairesFiltreesFinales, site, viewMode])

  // Sélection automatique de l'affaire si un numéro de compte correspond exactement
  useEffect(() => {
    if (numeroCompte && numeroCompte.trim() !== '' && viewMode === 'affaire') {
      const affaireTrouvee = affairesFiltreesFinales.find(
        (a) => a.affaire_id && a.affaire_id.toLowerCase() === numeroCompte.toLowerCase().trim()
      )
      if (affaireTrouvee && affaireTrouvee.affaire_id && affaireTrouvee.affaire_id !== affaireId) {
        setAffaireId(affaireTrouvee.affaire_id)
        setSite(affaireTrouvee.site)
      }
    }
  }, [numeroCompte, affairesFiltreesFinales, affaireId, viewMode])

  // Charger les données selon le mode de vue
  // Note: useCharge nécessite un affaireId, donc on ne l'utilise que pour le mode affaire
  // Pour le mode site, on chargera les périodes directement via Supabase
  const { periodes: periodesAffaire, loading: loadingPeriodesAffaire } = useCharge({
    affaireId: viewMode === 'affaire' ? affaireId : '',
    site: viewMode === 'affaire' ? site : '',
    autoRefresh: viewMode === 'affaire',
    enableRealtime: viewMode === 'affaire',
  })

  // Pour le mode site, charger toutes les périodes du site
  const [periodesSite, setPeriodesSite] = useState<typeof periodesAffaire>([])
  const [loadingPeriodesSite, setLoadingPeriodesSite] = useState(false)

  useEffect(() => {
    if (viewMode === 'site') {
      const loadPeriodesSite = async () => {
        try {
          setLoadingPeriodesSite(true)
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          let query = supabase
            .from('periodes_charge')
            .select('*')
          
          // Si un site est sélectionné, filtrer par site, sinon charger tous les sites
          if (site) {
            const siteNormalized = site.toUpperCase().trim()
            query = query.eq('site', siteNormalized)
          }
          
          const { data, error } = await query.order('date_debut', { ascending: true })

          if (error) throw error

          const periodesAvecDates = (data || []).map((p: any) => ({
            ...p,
            date_debut: p.date_debut ? new Date(p.date_debut) : new Date(),
            date_fin: p.date_fin ? new Date(p.date_fin) : new Date(),
            force_weekend_ferie: p.force_weekend_ferie === true,
            created_at: p.created_at ? new Date(p.created_at) : new Date(),
            updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
          }))

          setPeriodesSite(periodesAvecDates)
        } catch (err) {
          console.error('[GanttPage] Erreur chargement périodes site:', err)
          setPeriodesSite([])
        } finally {
          setLoadingPeriodesSite(false)
        }
      }

      loadPeriodesSite()
    } else {
      setPeriodesSite([])
    }
  }, [viewMode, site])

  const periodes = viewMode === 'affaire' ? periodesAffaire : periodesSite
  const loadingPeriodes = viewMode === 'affaire' ? loadingPeriodesAffaire : loadingPeriodesSite

  // Pour les affectations, on peut filtrer par site uniquement
  const { affectations: affectationsAffaire, loading: loadingAffectationsAffaire } = useAffectations({
    affaireId: viewMode === 'affaire' ? affaireId : '',
    site: viewMode === 'affaire' ? site : '',
    autoRefresh: viewMode === 'affaire',
    enableRealtime: viewMode === 'affaire',
  })

  // Pour le mode site, charger toutes les affectations du site
  const [affectationsSite, setAffectationsSite] = useState<typeof affectationsAffaire>([])
  const [loadingAffectationsSite, setLoadingAffectationsSite] = useState(false)

  useEffect(() => {
    if (viewMode === 'site') {
      const loadAffectationsSite = async () => {
        try {
          setLoadingAffectationsSite(true)
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          let query = supabase
            .from('affectations')
            .select(`
              *,
              affaires!inner (
                affaire_id,
                compte
              )
            `)
          
          // Si un site est sélectionné, filtrer par site, sinon charger tous les sites
          if (site) {
            const siteNormalized = site.toUpperCase().trim()
            query = query.eq('site', siteNormalized)
          }
          
          const { data, error } = await query.order('date_debut', { ascending: true })

          if (error) throw error

          const affectationsAvecDates = (data || []).map((a: any) => ({
            ...a,
            date_debut: a.date_debut ? new Date(a.date_debut) : new Date(),
            date_fin: a.date_fin ? new Date(a.date_fin) : new Date(),
            created_at: a.created_at ? new Date(a.created_at) : new Date(),
            updated_at: a.updated_at ? new Date(a.updated_at) : new Date(),
            affaire_id_display: a.affaires?.affaire_id || null,
            compte: a.affaires?.compte || null,
          }))

          setAffectationsSite(affectationsAvecDates)
        } catch (err) {
          console.error('[GanttPage] Erreur chargement affectations site:', err)
          setAffectationsSite([])
        } finally {
          setLoadingAffectationsSite(false)
        }
      }

      loadAffectationsSite()
    } else {
      setAffectationsSite([])
    }
  }, [viewMode, site])

  const affectations = viewMode === 'affaire' ? affectationsAffaire : affectationsSite
  const loadingAffectations = viewMode === 'affaire' ? loadingAffectationsAffaire : loadingAffectationsSite

  // Charger tous les transferts pour la période
  const { transferts, loading: loadingTransferts } = useTransferts({})

  // Charger toutes les ressources (filtrées par site si sélectionné)
  const { ressources: toutesRessources, loading: loadingRessources } = useRessources({
    actif: true,
    // Ne pas filtrer par site ici, on va gérer les transferts manuellement
  })

  // Filtrer les ressources selon le filtre ressource et ajouter les ressources transférées
  const ressources = useMemo(() => {
    let ressourcesFiltrees = toutesRessources

    // Filtrer par site si sélectionné (en mode site)
    if (viewMode === 'site' && site) {
      const siteNormalized = site.toUpperCase().trim()
      ressourcesFiltrees = toutesRessources.filter((r) => r.site.toUpperCase() === siteNormalized)
    }

    // Ajouter les ressources transférées vers le site sélectionné pendant la période
    if (viewMode === 'site' && site) {
      const siteNormalized = site.toUpperCase().trim()
      const ressourcesTransfereesIds = new Set<string>()

      transferts.forEach((transfert) => {
        // Si le transfert est vers le site sélectionné et chevauche la période
        // Prendre en compte les transferts appliqués ET planifiés
        if (
          transfert.site_destination.toUpperCase() === siteNormalized &&
          transfert.date_debut <= dateFin &&
          transfert.date_fin >= dateDebut
        ) {
          ressourcesTransfereesIds.add(transfert.ressource_id)
        }
      })

      // Ajouter les ressources transférées qui ne sont pas déjà dans la liste
      ressourcesTransfereesIds.forEach((ressourceId) => {
        if (!ressourcesFiltrees.find((r) => r.id === ressourceId)) {
          const ressourceTransferee = toutesRessources.find((r) => r.id === ressourceId)
          if (ressourceTransferee) {
            ressourcesFiltrees.push(ressourceTransferee)
          }
        }
      })
    }

    // Filtrer par nom de ressource si filtre renseigné
    if (ressourceFilter) {
      ressourcesFiltrees = ressourcesFiltrees.filter((r) =>
        r.nom.toLowerCase().includes(ressourceFilter.toLowerCase())
      )
    }

    return ressourcesFiltrees
  }, [toutesRessources, ressourceFilter, viewMode, site, transferts, dateDebut, dateFin])

  // Créer un Set des IDs de ressources transférées pour faciliter les vérifications
  const ressourcesTransfereesIds = useMemo(() => {
    const ids = new Set<string>()
    if (viewMode === 'site' && site) {
      const siteNormalized = site.toUpperCase().trim()
      transferts.forEach((transfert) => {
        if (
          transfert.site_destination.toUpperCase() === siteNormalized &&
          transfert.date_debut <= dateFin &&
          transfert.date_fin >= dateDebut
        ) {
          ids.add(transfert.ressource_id)
        }
      })
    }
    return ids
  }, [viewMode, site, transferts, dateDebut, dateFin])

  // Charger toutes les absences
  const { absences, loading: loadingAbsences } = useAbsences({})

  // Filtrer les données par période
  const periodesFiltrees = useMemo(() => {
    return periodes.filter((p) => {
      const pDebut = new Date(p.date_debut)
      const pFin = new Date(p.date_fin)
      return pDebut <= dateFin && pFin >= dateDebut
    })
  }, [periodes, dateDebut, dateFin])

  const affectationsFiltrees = useMemo(() => {
    return affectations.filter((a) => {
      const aDebut = new Date(a.date_debut)
      const aFin = new Date(a.date_fin)
      const chevauchePeriode = aDebut <= dateFin && aFin >= dateDebut
      
      // En mode site, inclure aussi les affectations des ressources transférées
      // même si elles ne sont pas du site sélectionné (elles sont sur le site de destination)
      if (viewMode === 'site' && site && ressourcesTransfereesIds.has(a.ressource_id)) {
        return chevauchePeriode
      }
      
      return chevauchePeriode
    })
  }, [affectations, dateDebut, dateFin, viewMode, site, ressourcesTransfereesIds])

  const absencesFiltrees = useMemo(() => {
    return absences.filter((a) => {
      const aDebut = new Date(a.date_debut)
      const aFin = new Date(a.date_fin)
      return aDebut <= dateFin && aFin >= dateDebut
    })
  }, [absences, dateDebut, dateFin])

  const loading = loadingAffaires || loadingPeriodes || loadingAffectations || loadingRessources || loadingAbsences || loadingSites || loadingTransferts

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-xl">
              <Calendar className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Visualisation Gantt
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
                Vue d&apos;ensemble des affectations et besoins par affaire ou par site
              </p>
            </div>
          </div>
        </div>

        {/* Sélection du mode de vue */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-semibold text-gray-700">Mode de visualisation:</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewMode('affaire')
                  setAffaireId('')
                  setSite('')
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'affaire'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Par Affaire
              </button>
              <button
                onClick={() => {
                  setViewMode('site')
                  setAffaireId('')
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'site'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Par Site
              </button>
            </div>
          </div>

          {/* Sélection affaire/site */}
          <div className="flex items-center gap-4 flex-wrap">
            {viewMode === 'affaire' && (
              <>
                {/* Numéro de compte */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Numéro de compte
                  </label>
                  <input
                    type="text"
                    value={numeroCompte}
                    onChange={(e) => setNumeroCompte(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>

                {/* Responsable */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
                  <select
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Tous...</option>
                    {responsablesDisponibles.map((resp) => (
                      <option key={resp} value={resp}>
                        {resp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Site */}
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Sélectionner...</option>
                    {sitesDisponibles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Affaire */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Affaire <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={affaireId}
                    onChange={(e) => {
                      const selectedAffaireId = e.target.value
                      if (selectedAffaireId) {
                        const affaire = affairesFiltreesFinales.find(
                          (a) => a.affaire_id === selectedAffaireId
                        )
                        if (affaire) {
                          setAffaireId(selectedAffaireId)
                          setSite(affaire.site)
                          setNumeroCompte('')
                        }
                      } else {
                        setAffaireId('')
                      }
                    }}
                    disabled={!site}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Sélectionner...</option>
                    {affairesFiltreesFinales.map((affaire) => (
                      <option key={affaire.id} value={affaire.affaire_id || ''}>
                        {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {viewMode === 'site' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Site
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Tous les sites</option>
                    {sitesDisponibles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Filtrer par ressource
                  </label>
                  <input
                    type="text"
                    value={ressourceFilter}
                    onChange={(e) => setRessourceFilter(e.target.value)}
                    placeholder="Rechercher une ressource..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation et paramètres de période - Même sélection que BesoinsGrid */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4">
          <div className="flex items-center gap-4 flex-wrap">
              {/* Sélection de précision - Style segmented control */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="inline-flex bg-gray-200 rounded-lg p-1 gap-1">
                <button
                  onClick={() => {
                    const newPrecision: Precision = 'JOUR'
                    setPrecision(newPrecision)
                    
                    // Vue JOUR : 1 mois (01/01/2026 → 31/01/2026)
                    const baseDate = new Date(2026, 0, 1) // 01/01/2026
                    const monthEnd = endOfMonthFn(baseDate) // 31/01/2026
                    setDateDebut(baseDate)
                    setDateFin(monthEnd)
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    precision === 'JOUR'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => {
                    const newPrecision: Precision = 'SEMAINE'
                    setPrecision(newPrecision)
                    
                    // Vue SEMAINE : 1 mois (01/01/2026 → 31/01/2026)
                    const baseDate = new Date(2026, 0, 1) // 01/01/2026
                    const monthStart = startOfMonthFn(baseDate)
                    const monthEnd = endOfMonthFn(monthStart) // 31/01/2026
                    setDateDebut(monthStart)
                    setDateFin(monthEnd)
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    precision === 'SEMAINE'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => {
                    const newPrecision: Precision = 'MOIS'
                    setPrecision(newPrecision)
                    
                    // Réinitialiser à la date de base : 01/01/2026
                    const baseDate = new Date(2026, 0, 1) // 01/01/2026
                    const monthStart = startOfMonthFn(baseDate)
                    setDateDebut(monthStart)
                    setDateFin(endOfMonthFn(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1)))
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    precision === 'MOIS'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Mois
                </button>
              </div>
            </div>

            {/* Navigation de période - S'étend sur toute la largeur restante */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-1.5 border border-blue-100 shadow-sm flex-1 min-w-[300px]">
              <button
                onClick={() => {
                  let newDateDebut: Date
                  let newDateFin: Date
                  
                  if (precision === 'JOUR') {
                    // En mode JOUR : naviguer mois par mois, toujours commencer le 01
                    const previousMonth = subMonths(startOfMonthFn(dateDebut), 1)
                    newDateDebut = previousMonth
                    newDateFin = endOfMonthFn(previousMonth)
                  } else if (precision === 'SEMAINE') {
                    const monthStart = startOfMonthFn(dateDebut)
                    const previousMonthStart = subMonths(monthStart, 1)
                    const dayOfWeekNew = previousMonthStart.getDay()
                    const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
                    newDateDebut = new Date(previousMonthStart)
                    newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
                    newDateFin = endOfMonthFn(previousMonthStart)
                  } else if (precision === 'MOIS') {
                    const monthStart = startOfMonthFn(dateDebut)
                    newDateDebut = subMonths(monthStart, 1)
                    newDateFin = endOfMonthFn(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
                  } else {
                    newDateDebut = subWeeks(dateDebut, 1)
                    newDateFin = subWeeks(dateFin, 1)
                  }
                  
                  setDateDebut(newDateDebut)
                  setDateFin(newDateFin)
                }}
                className="p-2 hover:bg-blue-200 rounded-lg transition-all text-blue-700 hover:text-blue-900 flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 text-center flex-1 relative group">
                <div className="font-semibold text-gray-800 pointer-events-none">
                  {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1 pointer-events-none mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatPlageSemainesISO(dateDebut, dateFin)}
                </div>
                  <input
                  type="date"
                  value={dateDebut.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const dateStr = e.target.value
                      const newDateDebut = new Date(dateStr + 'T12:00:00')
                      if (isNaN(newDateDebut.getTime())) return
                      
                      let finalDateDebut: Date
                      let newDateFin: Date
                      
                      if (precision === 'JOUR') {
                        // En mode JOUR : toujours commencer le 01 du mois sélectionné
                        const monthStart = startOfMonthFn(newDateDebut)
                        finalDateDebut = monthStart
                        newDateFin = endOfMonthFn(monthStart)
                      } else if (precision === 'SEMAINE') {
                        const monthStart = startOfMonthFn(newDateDebut)
                        const weekStart = new Date(monthStart)
                        const dayOfWeek = weekStart.getDay() || 7
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                        weekStart.setDate(weekStart.getDate() - daysToMonday)
                        finalDateDebut = weekStart
                        newDateFin = endOfMonthFn(monthStart)
                      } else if (precision === 'MOIS') {
                        const monthStart = startOfMonthFn(newDateDebut)
                        finalDateDebut = monthStart
                        newDateFin = endOfMonthFn(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1))
                      } else {
                        const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                        finalDateDebut = newDateDebut
                        newDateFin = new Date(newDateDebut.getTime() + diffDays * 24 * 60 * 60 * 1000)
                      }
                      
                      setDateDebut(finalDateDebut)
                      setDateFin(newDateFin)
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  style={{ fontSize: '16px' }}
                  title="Cliquez pour modifier la date de début"
                />
              </div>
              <button
                onClick={() => {
                  let newDateDebut: Date
                  let newDateFin: Date
                  
                  if (precision === 'JOUR') {
                    // En mode JOUR : naviguer mois par mois, toujours commencer le 01
                    const nextMonth = addMonths(startOfMonthFn(dateDebut), 1)
                    newDateDebut = nextMonth
                    newDateFin = endOfMonthFn(nextMonth)
                  } else if (precision === 'SEMAINE') {
                    const currentMonthEnd = endOfMonthFn(dateFin)
                    const nextMonthStart = addMonths(startOfMonthFn(currentMonthEnd), 1)
                    const dayOfWeekNew = nextMonthStart.getDay()
                    const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
                    newDateDebut = new Date(nextMonthStart)
                    newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
                    newDateFin = endOfMonthFn(nextMonthStart)
                  } else if (precision === 'MOIS') {
                    const monthStart = startOfMonthFn(dateDebut)
                    newDateDebut = addMonths(monthStart, 1)
                    newDateFin = endOfMonthFn(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
                  } else {
                    newDateDebut = addWeeks(dateDebut, 1)
                    newDateFin = addWeeks(dateFin, 1)
                  }
                  
                  if (isNaN(newDateDebut.getTime()) || isNaN(newDateFin.getTime())) {
                    console.error('[GanttPage] Dates invalides calculées', { newDateDebut, newDateFin })
                    return
                  }
                  
                  setDateDebut(newDateDebut)
                  setDateFin(newDateFin)
                }}
                className="p-2 hover:bg-blue-200 rounded-lg transition-all text-blue-700 hover:text-blue-900 flex-shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (viewMode === 'affaire' && affaireId && site) || viewMode === 'site' ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
            <GanttChart
              periodes={periodesFiltrees}
              affectations={affectationsFiltrees}
              absences={absencesFiltrees}
              ressources={ressources}
              dateDebut={dateDebut}
              dateFin={dateFin}
              precision={precision}
              viewMode={viewMode}
              affaireId={viewMode === 'affaire' ? affaireId : undefined}
              site={site}
              sitesList={sitesList}
              transferts={transferts}
            />
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                {viewMode === 'affaire'
                  ? 'Veuillez sélectionner une affaire et un site pour afficher le Gantt.'
                  : 'Aucune donnée à afficher pour cette période.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

