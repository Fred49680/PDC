'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { CheckCircle2, Info, Users, Target, ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react'
import { normalizeDateToUTC } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'

interface GrilleChargeAffectationProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  onDateChange?: (newDateDebut: Date, newDateFin: Date) => void
}

interface ColonneDate {
  date: Date
  label: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
}

// ========================================
// UTILITIES
// ========================================

// Utility functions simplifiées
const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())
const isFrenchHoliday = (_date: Date): boolean => false // Simplification

const getDatesBetween = (start: Date, end: Date): Date[] => {
  const dates: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

const formatSemaineISO = (date: Date): string => {
  const year = date.getFullYear()
  const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `S${week.toString().padStart(2, '0')}`
}

const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

const subWeeks = (date: Date, weeks: number): Date => addWeeks(date, -weeks)

// ========================================
// COMPOSANT PRINCIPAL OPTIMISÉ
// ========================================

export default function GrilleChargeAffectation({
  affaireId,
  site,
  dateDebut: propDateDebut,
  dateFin: propDateFin,
  precision: propPrecision,
  onDateChange,
}: GrilleChargeAffectationProps) {
  const [precision, setPrecision] = useState<Precision>(propPrecision)
  const [dateDebut, setDateDebut] = useState(propDateDebut)
  const [dateFin, setDateFin] = useState(propDateFin)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Synchroniser avec les props si elles changent
  useEffect(() => {
    setPrecision(propPrecision)
    setDateDebut(propDateDebut)
    setDateFin(propDateFin)
  }, [propPrecision, propDateDebut, propDateFin])
  
  // ========================================
  // CHARGEMENT DES DONNÉES RÉELLES
  // ========================================
  const { periodes, loading: loadingCharge, savePeriode, deletePeriode, consolidate } = useCharge({
    affaireId,
    site,
    autoRefresh,
  })
  
  const { affectations, loading: loadingAffectations, saveAffectation, deleteAffectation } = useAffectations({
    affaireId,
    site,
    autoRefresh,
  })
  
  const { ressources, competences: competencesMap, loading: loadingRessources } = useRessources({
    site,
    actif: true,
  })
  
  // Debug: Vérifier que les données sont bien chargées
  useEffect(() => {
    console.log(`[GrilleChargeAffectation] État chargement - Charge: ${loadingCharge ? 'en cours' : 'terminé'} (${periodes.length} périodes), Affectations: ${loadingAffectations ? 'en cours' : 'terminé'} (${affectations.length} affectations), Ressources: ${loadingRessources ? 'en cours' : 'terminé'} (${ressources.length} ressources)`)
    if (!loadingCharge && periodes.length > 0) {
      console.log(`[GrilleChargeAffectation] Exemple période chargée:`, periodes[0])
    }
    if (!loadingAffectations && affectations.length > 0) {
      console.log(`[GrilleChargeAffectation] Exemple affectation chargée:`, affectations[0])
    }
  }, [loadingCharge, loadingAffectations, loadingRessources, periodes, affectations, ressources])
  
  // États de filtres
  const [competencesFiltrees, setCompetencesFiltrees] = useState<Set<string>>(new Set<string>())
  const [competencesInitialisees, setCompetencesInitialisees] = useState(false) // Flag pour éviter réinitialisation après interaction utilisateur
  
  // Extraire la liste des compétences depuis les périodes et les ressources
  const competencesList = useMemo(() => {
    const compSet = new Set<string>()
    
    // Ajouter les compétences depuis les périodes
    periodes.forEach(p => {
      if (p.competence) compSet.add(p.competence)
    })
    
    // Ajouter les compétences depuis les ressources
    competencesMap.forEach((comps) => {
      comps.forEach(comp => {
        if (comp.competence) compSet.add(comp.competence)
      })
    })
    
    return Array.from(compSet).sort()
  }, [periodes, competencesMap])
  
  // Initialiser les compétences filtrées avec toutes les compétences disponibles au démarrage
  // (seulement une fois, au premier chargement terminé, si l'utilisateur n'a pas encore interagi)
  useEffect(() => {
    if (
      !competencesInitialisees &&
      !loadingCharge && 
      !loadingRessources && 
      competencesList.length > 0 && 
      competencesFiltrees.size === 0
    ) {
      console.log(`[GrilleChargeAffectation] Initialisation compétences: ${competencesList.length} compétence(s) sélectionnée(s)`)
      setCompetencesFiltrees(new Set(competencesList))
      setCompetencesInitialisees(true) // Marquer comme initialisé pour éviter réinitialisation future
    }
  }, [competencesList, loadingCharge, loadingRessources, competencesFiltrees.size, competencesInitialisees])
  
  // États de sauvegarde
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set<string>())
  const saveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map<string, NodeJS.Timeout>())

  // ========================================
  // COLONNES - Mémoïsées
  // ========================================
  const colonnes = useMemo(() => {
    const cols: ColonneDate[] = []
    const dates = getDatesBetween(dateDebut, dateFin)
    
    dates.forEach((date) => {
      cols.push({
        date,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        isWeekend: isWeekend(date),
        isHoliday: isFrenchHoliday(date),
        semaineISO: formatSemaineISO(date),
      })
    })
    
    return cols
  }, [dateDebut, dateFin])

  // ========================================
  // GRILLE DE CHARGE - Mémoïsée avec optimisation
  // ========================================
  const grilleCharge = useMemo(() => {
    const grille = new Map<string, number>()
    
    console.log(`[GrilleChargeAffectation] DEBUG - ${periodes.length} période(s), ${colonnes.length} colonne(s)`)
    if (periodes.length > 0 && colonnes.length > 0) {
      console.log(`[GrilleChargeAffectation] DEBUG - Plage colonnes: ${colonnes[0].label} -> ${colonnes[colonnes.length - 1].label}`)
    }
    
    let nbCellulesRemplies = 0
    let nbPeriodesSansCorrespondance = 0
    periodes.forEach((periode, idx) => {
      const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
      const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
      console.log(`[GrilleChargeAffectation] DEBUG - Période ${idx + 1}: ${periode.competence} du ${periodeDateDebut.toLocaleDateString('fr-FR')} au ${periodeDateFin.toLocaleDateString('fr-FR')}`)
      
      let trouvee = false
      colonnes.forEach((col) => {
        // *** CORRECTION : Normaliser les dates à minuit UTC pour la comparaison ***
        const colDate = normalizeDateToUTC(col.date)
        
        if (
          periodeDateDebut <= colDate &&
          periodeDateFin >= colDate
        ) {
          const cellKey = `${periode.competence}|${col.date.getTime()}`
          grille.set(cellKey, periode.nb_ressources)
          nbCellulesRemplies++
          trouvee = true
        }
      })
      
      if (!trouvee) {
        nbPeriodesSansCorrespondance++
        console.log(`[GrilleChargeAffectation] ATTENTION - Période ${periode.competence} (${periodeDateDebut.toLocaleDateString('fr-FR')} - ${periodeDateFin.toLocaleDateString('fr-FR')}) n'a trouvé aucune correspondance avec les colonnes`)
      }
    })
    
    console.log(`[GrilleChargeAffectation] ${periodes.length} période(s) chargée(s) -> ${nbCellulesRemplies} cellule(s) dans la grille${nbPeriodesSansCorrespondance > 0 ? ` (${nbPeriodesSansCorrespondance} période(s) sans correspondance)` : ''}`)
    
    return grille
  }, [periodes, colonnes])

  // ========================================
  // GRILLE D'AFFECTATIONS - Mémoïsée
  // ========================================
  const grilleAffectations = useMemo(() => {
    const grille = new Map<string, Set<string>>()
    
    console.log(`[GrilleChargeAffectation] DEBUG Affectations - ${affectations.length} affectation(s), ${colonnes.length} colonne(s)`)
    
    let nbCellulesRemplies = 0
    let nbAffectationsSansCorrespondance = 0
    affectations.forEach((affectation, idx) => {
      const affectationDateDebut = normalizeDateToUTC(new Date(affectation.date_debut))
      const affectationDateFin = normalizeDateToUTC(new Date(affectation.date_fin))
      console.log(`[GrilleChargeAffectation] DEBUG - Affectation ${idx + 1}: ${affectation.ressource_id} / ${affectation.competence} du ${affectationDateDebut.toLocaleDateString('fr-FR')} au ${affectationDateFin.toLocaleDateString('fr-FR')}`)
      
      let trouvee = false
      colonnes.forEach((col) => {
        // *** CORRECTION : Normaliser les dates à minuit UTC pour la comparaison ***
        const colDate = normalizeDateToUTC(col.date)
        
        if (
          affectationDateDebut <= colDate &&
          affectationDateFin >= colDate
        ) {
          const cellKey = `${affectation.competence}|${col.date.getTime()}`
          if (!grille.has(cellKey)) {
            grille.set(cellKey, new Set<string>())
          }
          const affectationsSet = grille.get(cellKey)
          if (affectationsSet) {
            affectationsSet.add(affectation.ressource_id)
            nbCellulesRemplies++
            trouvee = true
          }
        }
      })
      
      if (!trouvee) {
        nbAffectationsSansCorrespondance++
        console.log(`[GrilleChargeAffectation] ATTENTION - Affectation ${affectation.ressource_id} / ${affectation.competence} (${affectationDateDebut.toLocaleDateString('fr-FR')} - ${affectationDateFin.toLocaleDateString('fr-FR')}) n'a trouvé aucune correspondance avec les colonnes`)
      }
    })
    
    console.log(`[GrilleChargeAffectation] ${affectations.length} affectation(s) chargée(s) -> ${nbCellulesRemplies} cellule(s) dans la grille${nbAffectationsSansCorrespondance > 0 ? ` (${nbAffectationsSansCorrespondance} affectation(s) sans correspondance)` : ''}`)
    
    return grille
  }, [affectations, colonnes])

  // ========================================
  // RESSOURCES PAR COMPÉTENCE - Mémoïsées
  // ========================================
  const ressourcesParCompetence = useMemo(() => {
    const map = new Map<string, typeof ressources>()
    
    competencesList.forEach((comp) => {
      const ressourcesComp = ressources.filter((r) => {
        const competencesRessource = competencesMap.get(r.id) || []
        return competencesRessource.some((c) => c.competence === comp)
      })
      map.set(comp, ressourcesComp)
    })
    
    return map
  }, [ressources, competencesMap, competencesList])

  // ========================================
  // HANDLER CHARGE AVEC DEBOUNCING
  // ========================================
  const handleChargeChange = useCallback((competence: string, col: ColonneDate, value: number) => {
    const cellKey = `${competence}|${col.date.getTime()}`
    const nbRessources = Math.max(0, Math.floor(value))
    
    // *** CORRECTION : Normaliser les dates à minuit UTC ***
    const colDateNormalisee = normalizeDateToUTC(col.date)
    
    // Indicateur de sauvegarde
    setSavingCells(prev => new Set(prev).add(cellKey))
    
    // Debouncing - sauvegarde après 500ms
    if (saveTimeoutRef.current.has(cellKey)) {
      clearTimeout(saveTimeoutRef.current.get(cellKey))
    }
    
    const timeout = setTimeout(async () => {
      try {
        console.log(`💾 Sauvegarde ${competence} - ${col.label}: ${nbRessources}`)
        
        // Trouver la période existante pour cette compétence/date
        const periodeExistante = periodes.find(
          (p) => {
            const pDateDebut = normalizeDateToUTC(new Date(p.date_debut))
            const pDateFin = normalizeDateToUTC(new Date(p.date_fin))
            return p.competence === competence && 
                   pDateDebut <= colDateNormalisee && 
                   pDateFin >= colDateNormalisee
          }
        )
        
        if (nbRessources === 0 && periodeExistante) {
          // Supprimer la période si elle existe et que la charge passe à 0
          await deletePeriode(periodeExistante.id)
        } else if (nbRessources > 0) {
          // Appel API réel savePeriode() (le hook gère la mise à jour optimiste)
          await savePeriode({
            id: periodeExistante?.id,
            competence,
            date_debut: colDateNormalisee,
            date_fin: colDateNormalisee,
            nb_ressources: nbRessources,
          })
          
          // Si mode JOUR et autoRefresh activé, consolider après sauvegarde
          if (precision === 'JOUR' && autoRefresh) {
            setTimeout(() => {
              consolidate(competence).catch(err => {
                console.error('[GrilleChargeAffectation] Erreur consolidation:', err)
              })
            }, 1000)
          }
        }
      } catch (err) {
        console.error('[GrilleChargeAffectation] Erreur savePeriode:', err)
      } finally {
        setSavingCells(prev => {
          const newSet = new Set(prev)
          newSet.delete(cellKey)
          return newSet
        })
        saveTimeoutRef.current.delete(cellKey)
      }
    }, 500)
    
    saveTimeoutRef.current.set(cellKey, timeout)
  }, [periodes, savePeriode, deletePeriode, consolidate, precision, autoRefresh])

  // ========================================
  // HANDLER AFFECTATION
  // ========================================
  const handleAffectationChange = useCallback(async (competence: string, ressourceId: string, col: ColonneDate, checked: boolean) => {
    console.log(`✅ Affectation ${checked ? 'ajoutée' : 'retirée'}: ${ressourceId} - ${competence} - ${col.label}`)
    
    // *** CORRECTION : Normaliser les dates à minuit UTC ***
    const colDateNormalisee = normalizeDateToUTC(col.date)
    
    try {
      if (checked) {
        // Appel API réel saveAffectation() (le hook gère la mise à jour optimiste)
        await saveAffectation({
          ressource_id: ressourceId,
          competence,
          date_debut: colDateNormalisee,
          date_fin: colDateNormalisee,
          charge: 1,
        })
      } else {
        // Trouver l'affectation à supprimer
        const affectationASupprimer = affectations.find(a => {
          const aDateDebut = normalizeDateToUTC(new Date(a.date_debut))
          const aDateFin = normalizeDateToUTC(new Date(a.date_fin))
          return a.ressource_id === ressourceId && 
                 a.competence === competence &&
                 aDateDebut <= colDateNormalisee &&
                 aDateFin >= colDateNormalisee
        })
        
        if (affectationASupprimer?.id) {
          await deleteAffectation(affectationASupprimer.id)
        }
      }
    } catch (err) {
      console.error('[GrilleChargeAffectation] Erreur saveAffectation/deleteAffectation:', err)
    }
  }, [affectations, saveAffectation, deleteAffectation])

  // ========================================
  // TOTAL AFFECTÉ - Mémoïsé
  // ========================================
  const getTotalAffecte = useCallback((competence: string, col: ColonneDate): number => {
    const cellKey = `${competence}|${col.date.getTime()}`
    return (grilleAffectations.get(cellKey) || new Set<string>()).size
  }, [grilleAffectations])

  // ========================================
  // NAVIGATION TEMPORELLE
  // ========================================
  const handlePreviousPeriod = () => {
    setDateDebut(prev => subWeeks(prev, 1))
    setDateFin(prev => subWeeks(prev, 1))
  }

  const handleNextPeriod = () => {
    setDateDebut(prev => addWeeks(prev, 1))
    setDateFin(prev => addWeeks(prev, 1))
  }

  // ========================================
  // TOGGLE COMPÉTENCE
  // ========================================
  const toggleCompetence = useCallback((competence: string): void => {
    setCompetencesFiltrees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(competence)) {
        newSet.delete(competence)
        console.log(`[GrilleChargeAffectation] Compétence "${competence}" désélectionnée`)
      } else {
        newSet.add(competence)
        console.log(`[GrilleChargeAffectation] Compétence "${competence}" sélectionnée`)
      }
      // Marquer que l'utilisateur a interagi (empêche la réinitialisation automatique)
      setCompetencesInitialisees(true)
      return newSet
    })
  }, [])

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Grille Charge & Affectations
          </h1>
          <p className="text-gray-600">Planifiez et affectez vos ressources en temps réel</p>
          {(loadingCharge || loadingAffectations || loadingRessources) && (
            <div className="mt-4 flex items-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement des données...</span>
            </div>
          )}
        </div>

        {/* FILTRES COMPÉTENCES */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Filtrer les compétences</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Bouton "Tout sélectionner" cliqué - ${competencesList.length} compétence(s)`)
                  setCompetencesFiltrees(new Set(competencesList))
                  setCompetencesInitialisees(true) // Marquer que l'utilisateur a interagi
                }}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => {
                  console.log(`[GrilleChargeAffectation] Bouton "Tout désélectionner" cliqué`)
                  setCompetencesFiltrees(new Set<string>())
                  setCompetencesInitialisees(true) // Marquer que l'utilisateur a interagi
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {competencesList.map((comp) => {
              const isActive = competencesFiltrees.has(comp)
              const hasCharge = Array.from(grilleCharge.keys()).some(key => key.startsWith(comp))
              
              return (
                <button
                  key={comp}
                  onClick={() => toggleCompetence(comp)}
                  className={`
                    relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                      : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }
                  `}
                >
                  {comp}
                  {hasCharge && (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isActive ? 'bg-yellow-400' : 'bg-blue-500'} ring-2 ring-white`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* NAVIGATION TEMPORELLE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousPeriod}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Précédent</span>
            </button>
            
            <div className="text-center">
              <div className="font-bold text-gray-800 text-lg">
                {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
              </div>
              <div className="text-sm text-gray-500">
                Semaine {formatSemaineISO(dateDebut)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium transition-all text-sm
                  ${autoRefresh 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                    : 'bg-gray-300 text-gray-700'
                  }
                `}
              >
                {autoRefresh ? '🔄 Auto ON' : '⏸️ Auto OFF'}
              </button>
              
              <button
                onClick={handleNextPeriod}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
              >
                <span>Suivant</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* GRILLE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-30 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Compétence / Ressource
                    </div>
                  </th>
                  {colonnes.map((col, idx) => (
                    <th
                      key={idx}
                      className={`
                        px-3 py-3 text-center font-semibold min-w-[100px]
                        ${col.isWeekend ? 'bg-blue-500/90' : col.isHoliday ? 'bg-pink-500/90' : ''}
                      `}
                    >
                      <div className="text-sm">{col.label}</div>
                      <div className="text-xs opacity-80 mt-1">{col.semaineISO}</div>
                      {col.isWeekend && <div className="text-xs mt-0.5">WE</div>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold bg-gradient-to-r from-blue-600 to-indigo-600">
                    Total
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {competencesFiltrees.size === 0 ? (
                  <tr>
                    <td colSpan={colonnes.length + 2} className="p-12 text-center">
                      <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl font-semibold text-gray-400 mb-2">
                        Aucune compétence sélectionnée
                      </p>
                      <p className="text-gray-400">
                        Sélectionnez des compétences pour afficher la grille
                      </p>
                    </td>
                  </tr>
                ) : (
                  Array.from(competencesFiltrees).map((comp) => {
                    const ressourcesComp = ressourcesParCompetence.get(comp) || []
                    const totalCharge = colonnes.reduce((sum, col) => {
                      const cellKey = `${comp}|${col.date.getTime()}`
                      return sum + (grilleCharge.get(cellKey) || 0)
                    }, 0)

                    return (
                      <React.Fragment key={comp}>
                        {/* LIGNE BESOIN */}
                        <tr className="bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 transition-all">
                          <td className="px-4 py-3 font-semibold sticky left-0 bg-gradient-to-r from-yellow-50 to-amber-50 z-10 border-b-2 border-yellow-200">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-yellow-700" />
                              <span className="text-yellow-900">Besoin ({comp})</span>
                            </div>
                          </td>
                          {colonnes.map((col, idx) => {
                            const cellKey = `${comp}|${col.date.getTime()}`
                            const value = grilleCharge.get(cellKey) || 0
                            const isSaving = savingCells.has(cellKey)

                            return (
                              <td
                                key={idx}
                                className={`px-2 py-2 border-b-2 border-yellow-200 relative ${
                                  col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''
                                }`}
                              >
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={value}
                                    onChange={(e) => handleChargeChange(comp, col, parseInt(e.target.value) || 0)}
                                    className="w-full text-center border-2 border-yellow-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white font-semibold transition-all"
                                  />
                                  {isSaving && (
                                    <div className="absolute -top-1 -right-1">
                                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center font-bold text-yellow-900 bg-yellow-100 border-b-2 border-yellow-200">
                            {totalCharge}
                          </td>
                        </tr>

                        {/* LIGNE AFFECTÉ */}
                        <tr className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all">
                          <td className="px-4 py-3 font-semibold sticky left-0 bg-gradient-to-r from-green-50 to-emerald-50 z-10 border-b-2 border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-700" />
                              <span className="text-green-900">Affecté ({comp})</span>
                            </div>
                          </td>
                          {colonnes.map((col, idx) => {
                            const totalAffecte = getTotalAffecte(comp, col)
                            const besoin = grilleCharge.get(`${comp}|${col.date.getTime()}`) || 0
                            const isOver = totalAffecte > besoin
                            const isUnder = totalAffecte < besoin && besoin > 0

                            return (
                              <td
                                key={idx}
                                className={`
                                  px-3 py-3 text-center font-bold border-b-2 border-green-200 transition-all
                                  ${col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''}
                                  ${isOver ? 'bg-red-200 text-red-900 ring-2 ring-red-400' : ''}
                                  ${isUnder ? 'bg-orange-100 text-orange-900' : ''}
                                  ${!isOver && !isUnder ? 'text-green-900' : ''}
                                `}
                              >
                                {totalAffecte}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center font-bold text-green-900 bg-green-100 border-b-2 border-green-200">
                            {colonnes.reduce((sum, col) => sum + getTotalAffecte(comp, col), 0)}
                          </td>
                        </tr>

                        {/* RESSOURCES */}
                        {loadingRessources ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                            </td>
                          </tr>
                        ) : totalCharge === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-400 italic bg-gray-50/50">
                              Définissez une charge pour voir les ressources
                            </td>
                          </tr>
                        ) : ressourcesComp.length === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-500 italic">
                              Aucune ressource disponible pour cette compétence
                            </td>
                          </tr>
                        ) : (
                          ressourcesComp.map((ressource) => {
                            const competencesRessource = competencesMap.get(ressource.id) || []
                            const competenceInfo = competencesRessource.find(c => c.competence === comp)
                            const isPrincipale = competenceInfo?.type_comp === 'P'

                            return (
                              <tr key={ressource.id} className="hover:bg-blue-50/30 transition-all">
                                <td className={`px-4 py-2 sticky left-0 bg-white z-10 ${isPrincipale ? 'font-semibold' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    {isPrincipale && <span className="text-blue-600 text-lg">★</span>}
                                    <span>{ressource.nom}</span>
                                  </div>
                                </td>
                                {colonnes.map((col, idx) => {
                                  const cellKey = `${comp}|${col.date.getTime()}`
                                  const affectees = grilleAffectations.get(cellKey) || new Set<string>()
                                  const isAffecte = affectees.has(ressource.id)

                                  return (
                                    <td
                                      key={idx}
                                      className={`px-2 py-2 text-center ${
                                        col.isWeekend ? 'bg-blue-50/50' : col.isHoliday ? 'bg-pink-50/50' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAffecte}
                                        onChange={(e) => handleAffectationChange(comp, ressource.id, col, e.target.checked)}
                                        className="w-5 h-5 cursor-pointer accent-green-500 rounded transition-all hover:scale-110"
                                      />
                                    </td>
                                  )
                                })}
                                <td className="px-4 py-2 text-center font-medium bg-gray-50">
                                  {colonnes.reduce((sum, col) => {
                                    const cellKey = `${comp}|${col.date.getTime()}`
                                    const affectees = grilleAffectations.get(cellKey) || new Set<string>()
                                    return sum + (affectees.has(ressource.id) ? 1 : 0)
                                  }, 0)}
                                </td>
                              </tr>
                            )
                          })
                        )}

                        <tr>
                          <td colSpan={colonnes.length + 2} className="h-4 bg-gradient-to-b from-gray-100 to-transparent"></td>
                        </tr>
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LÉGENDE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Légende & Instructions</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
              <span className="text-sm text-gray-700">Besoin (charge)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 border-2 border-green-400 rounded"></div>
              <span className="text-sm text-gray-700">Affecté</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-200 border-2 border-red-500 rounded"></div>
              <span className="text-sm text-gray-700">Sur-affectation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-100 border-2 border-orange-400 rounded"></div>
              <span className="text-sm text-gray-700">Sous-affectation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-sm text-gray-700">Week-end</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-pink-50 border-2 border-pink-300 rounded"></div>
              <span className="text-sm text-gray-700">Jour férié</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-lg">★</span>
              <span className="text-sm text-gray-700">Compétence principale</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">Sauvegarde en cours</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>La <strong>charge</strong> représente le nombre de ressources nécessaires</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Les <strong>affectations</strong> se font via les cases à cocher</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Les modifications sont <strong>sauvegardées automatiquement</strong> après 500ms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Utilisez les filtres pour afficher uniquement les compétences qui vous intéressent</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}