'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AlertCircle, CheckCircle2, Info, Users, Target, ChevronLeft, ChevronRight, Filter, Loader2, Save } from 'lucide-react'
import { normalizeDateToUTC } from '@/utils/calendar'
import type { Precision } from '@/types/charge'

interface GrilleChargeAffectationProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  onDateChange?: (newDateDebut: Date, newDateFin: Date) => void
}

// ========================================
// MOCK DATA & UTILITIES (à remplacer par vos vrais hooks)
// ========================================

const mockPeriodes = [
  { id: '1', competence: 'BE_IES', date_debut: new Date('2024-01-08'), date_fin: new Date('2024-01-12'), nb_ressources: 2 },
  { id: '2', competence: 'IES', date_debut: new Date('2024-01-15'), date_fin: new Date('2024-01-19'), nb_ressources: 3 }
]

const mockAffectations = [
  { id: '1', ressource_id: 'r1', competence: 'BE_IES', date_debut: new Date('2024-01-08'), date_fin: new Date('2024-01-12'), charge: 5 }
]

const mockRessources = [
  { id: 'r1', nom: 'Jean Dupont', date_fin_contrat: new Date('2025-12-31') },
  { id: 'r2', nom: 'Marie Martin', date_fin_contrat: null },
  { id: 'r3', nom: 'Pierre Dubois', date_fin_contrat: new Date('2024-06-30') }
]

const mockCompetencesMap = new Map([
  ['r1', [{ competence: 'BE_IES', type_comp: 'P' }, { competence: 'IES', type_comp: 'S' }]],
  ['r2', [{ competence: 'IES', type_comp: 'P' }]],
  ['r3', [{ competence: 'BE_IES', type_comp: 'S' }]]
])

const COMPETENCES_LIST = ['BE_IES', 'IES', 'INSTRUM', 'ROB', 'AUTO', 'FIBRE OPTIQUE']

// Utility functions simplifiées
const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())
const isFrenchHoliday = (date: Date): boolean => false // Simplification
const isBusinessDay = (date: Date): boolean => !isWeekend(date) && !isFrenchHoliday(date)

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
  
  // États de données
  const [periodes, setPeriodes] = useState(mockPeriodes)
  const [affectations, setAffectations] = useState(mockAffectations)
  const [ressources] = useState(mockRessources)
  const [competencesMap] = useState(mockCompetencesMap)
  
  // États de filtres
  const [competencesFiltrees, setCompetencesFiltrees] = useState(new Set(['BE_IES', 'IES']))
  
  // États de sauvegarde
  const [savingCells, setSavingCells] = useState(new Set())
  const saveTimeoutRef = useRef(new Map())

  // ========================================
  // COLONNES - Mémoïsées
  // ========================================
  const colonnes = useMemo(() => {
    const cols = []
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
    const grille = new Map()
    
    periodes.forEach((periode) => {
      colonnes.forEach((col) => {
        // *** CORRECTION : Normaliser les dates à minuit UTC pour la comparaison ***
        const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
        const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
        const colDate = normalizeDateToUTC(col.date)
        
        if (
          periodeDateDebut <= colDate &&
          periodeDateFin >= colDate
        ) {
          const cellKey = `${periode.competence}|${col.date.getTime()}`
          grille.set(cellKey, periode.nb_ressources)
        }
      })
    })
    
    return grille
  }, [periodes, colonnes])

  // ========================================
  // GRILLE D'AFFECTATIONS - Mémoïsée
  // ========================================
  const grilleAffectations = useMemo(() => {
    const grille = new Map()
    
    affectations.forEach((affectation) => {
      colonnes.forEach((col) => {
        if (
          new Date(affectation.date_debut) <= col.date &&
          new Date(affectation.date_fin) >= col.date
        ) {
          const cellKey = `${affectation.competence}|${col.date.getTime()}`
          if (!grille.has(cellKey)) {
            grille.set(cellKey, new Set())
          }
          grille.get(cellKey).add(affectation.ressource_id)
        }
      })
    })
    
    return grille
  }, [affectations, colonnes])

  // ========================================
  // RESSOURCES PAR COMPÉTENCE - Mémoïsées
  // ========================================
  const ressourcesParCompetence = useMemo(() => {
    const map = new Map()
    
    COMPETENCES_LIST.forEach((comp) => {
      const ressourcesComp = ressources.filter((r) => {
        const competencesRessource = competencesMap.get(r.id) || []
        return competencesRessource.some((c) => c.competence === comp)
      })
      map.set(comp, ressourcesComp)
    })
    
    return map
  }, [ressources, competencesMap])

  // ========================================
  // HANDLER CHARGE AVEC DEBOUNCING
  // ========================================
  const handleChargeChange = useCallback((competence, col, value) => {
    const cellKey = `${competence}|${col.date.getTime()}`
    const nbRessources = Math.max(0, Math.floor(value))
    
    // Mise à jour optimiste immédiate
    // *** CORRECTION : Normaliser les dates à minuit UTC ***
    const colDateNormalisee = normalizeDateToUTC(col.date)
    
    setPeriodes((prev) => {
      const periodeExistante = prev.find(
        (p) => {
          const pDateDebut = normalizeDateToUTC(new Date(p.date_debut))
          const pDateFin = normalizeDateToUTC(new Date(p.date_fin))
          return p.competence === competence && 
                 pDateDebut <= colDateNormalisee && 
                 pDateFin >= colDateNormalisee
        }
      )
      
      if (nbRessources === 0 && periodeExistante) {
        return prev.filter(p => p.id !== periodeExistante.id)
      } else if (nbRessources > 0) {
        if (periodeExistante) {
          return prev.map(p => 
            p.id === periodeExistante.id 
              ? { ...p, nb_ressources: nbRessources }
              : p
          )
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            competence,
            date_debut: colDateNormalisee,
            date_fin: colDateNormalisee,
            nb_ressources: nbRessources
          }]
        }
      }
      return prev
    })
    
    // Indicateur de sauvegarde
    setSavingCells(prev => new Set(prev).add(cellKey))
    
    // Debouncing - sauvegarde après 500ms
    if (saveTimeoutRef.current.has(cellKey)) {
      clearTimeout(saveTimeoutRef.current.get(cellKey))
    }
    
    const timeout = setTimeout(() => {
      console.log(`💾 Sauvegarde ${competence} - ${col.label}: ${nbRessources}`)
      // ICI : Appel API réel savePeriode()
      
      setSavingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
      saveTimeoutRef.current.delete(cellKey)
    }, 500)
    
    saveTimeoutRef.current.set(cellKey, timeout)
  }, [])

  // ========================================
  // HANDLER AFFECTATION
  // ========================================
  const handleAffectationChange = useCallback((competence, ressourceId, col, checked) => {
    console.log(`✅ Affectation ${checked ? 'ajoutée' : 'retirée'}: ${ressourceId} - ${competence} - ${col.label}`)
    
    // *** CORRECTION : Normaliser les dates à minuit UTC ***
    const colDateNormalisee = normalizeDateToUTC(col.date)
    
    // Mise à jour optimiste
    if (checked) {
      setAffectations(prev => [...prev, {
        id: `temp-${Date.now()}`,
        ressource_id: ressourceId,
        competence,
        date_debut: colDateNormalisee,
        date_fin: colDateNormalisee,
        charge: 1
      }])
    } else {
      setAffectations(prev => prev.filter(
        a => {
          const aDateDebut = normalizeDateToUTC(new Date(a.date_debut))
          const aDateFin = normalizeDateToUTC(new Date(a.date_fin))
          return !(a.ressource_id === ressourceId && 
                   a.competence === competence &&
                   aDateDebut <= colDateNormalisee &&
                   aDateFin >= colDateNormalisee)
        }
      ))
    }
    
    // ICI : Appel API réel saveAffectation() / deleteAffectation()
  }, [])

  // ========================================
  // TOTAL AFFECTÉ - Mémoïsé
  // ========================================
  const getTotalAffecte = useCallback((competence, col) => {
    const cellKey = `${competence}|${col.date.getTime()}`
    return (grilleAffectations.get(cellKey) || new Set()).size
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
  const toggleCompetence = (competence) => {
    setCompetencesFiltrees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(competence)) {
        newSet.delete(competence)
      } else {
        newSet.add(competence)
      }
      return newSet
    })
  }

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
                onClick={() => setCompetencesFiltrees(new Set(COMPETENCES_LIST))}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => setCompetencesFiltrees(new Set())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {COMPETENCES_LIST.map((comp) => {
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
                        {totalCharge === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-400 italic bg-gray-50/50">
                              Définissez une charge pour voir les ressources
                            </td>
                          </tr>
                        ) : ressourcesComp.length === 0 ? (
                          <tr>
                            <td colSpan={colonnes.length + 2} className="p-6 text-center text-gray-500 italic">
                              Aucune ressource disponible
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
                                  const affectees = grilleAffectations.get(cellKey) || new Set()
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
                                    const affectees = grilleAffectations.get(cellKey) || new Set()
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