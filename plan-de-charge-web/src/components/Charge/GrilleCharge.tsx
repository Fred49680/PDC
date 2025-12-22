'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useCharge } from '@/hooks/useCharge'
import { createClient } from '@/lib/supabase/client'
import { businessDaysBetween, formatSemaineISO, normalizeDateToUTC, getDatesBetween } from '@/utils/calendar'
import { isFrenchHoliday } from '@/utils/holidays'
import type { Precision } from '@/types/charge'
import { format, startOfWeek, addDays, addWeeks, startOfMonth, addMonths, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Calendar } from 'lucide-react'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { useToast } from '@/components/UI/Toast'

interface GrilleChargeProps {
  affaireId: string
  site: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
  onDateDebutChange?: (newDateDebut: Date) => void
  onDateFinChange?: (newDateFin: Date) => void
  onPrecisionChange?: (precision: Precision) => void
  showButtonsAbove?: boolean
  onOpenChargeModal?: () => void // Callback pour ouvrir le modal de charge depuis Planning3
}

interface ColonneDate {
  date: Date
  label: string
  shortLabel: string
  isWeekend: boolean
  isHoliday: boolean
  semaineISO: string
  weekStart?: Date
  weekEnd?: Date
}

// Fonction pour obtenir le format semaine ISO avec année : "01-2026"
const getSemaineISOWithYear = (date: Date): string => {
  // Calculer le lundi de la semaine ISO
  const dayOfWeek = date.getDay() || 7 // 0 = dimanche -> 7
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOfWeek + 1)
  
  // Calculer l'année ISO (année du jeudi de cette semaine)
  const thursday = new Date(weekStart)
  thursday.setDate(weekStart.getDate() + 3)
  const isoYear = thursday.getFullYear()
  
  // Calculer le numéro de semaine ISO
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - jan4Day + 1)
  
  const diffTime = weekStart.getTime() - jan4WeekStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(diffDays / 7) + 1
  
  if (weekNumber < 1) {
    const prevJan4 = new Date(isoYear - 1, 0, 4)
    const prevJan4Day = prevJan4.getDay() || 7
    const prevJan4WeekStart = new Date(prevJan4)
    prevJan4WeekStart.setDate(prevJan4.getDate() - prevJan4Day + 1)
    const prevDiffTime = weekStart.getTime() - prevJan4WeekStart.getTime()
    const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24))
    const prevWeekNumber = Math.floor(prevDiffDays / 7) + 1
    return `${prevWeekNumber.toString().padStart(2, '0')}-${isoYear - 1}`
  } else if (weekNumber > 52) {
    const nextJan4 = new Date(isoYear + 1, 0, 4)
    const nextJan4Day = nextJan4.getDay() || 7
    const nextJan4WeekStart = new Date(nextJan4)
    nextJan4WeekStart.setDate(nextJan4.getDate() - nextJan4Day + 1)
    
    if (weekStart >= nextJan4WeekStart) {
      return `01-${isoYear + 1}`
    }
    return `53-${isoYear}`
  }
  
  return `${weekNumber.toString().padStart(2, '0')}-${isoYear}`
}

const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay())

export function GrilleCharge({
  affaireId,
  site,
  dateDebut,
  dateFin,
  precision,
  onDateDebutChange,
  onDateFinChange,
  onPrecisionChange,
  showButtonsAbove = false,
  onOpenChargeModal,
}: GrilleChargeProps) {
  const { periodes, loading, error, savePeriode, savePeriodesBatch } = useCharge({
    affaireId,
    site,
    enableRealtime: true,
  })

  const { addToast } = useToast()
  const [grille, setGrille] = useState<Map<string, number>>(new Map())
  // État local pour les valeurs en cours de saisie (permet les valeurs vides)
  const [editingValues, setEditingValues] = useState<Map<string, string>>(new Map())
  const [competences, setCompetences] = useState<string[]>([])
  const [toutesCompetences, setToutesCompetences] = useState<string[]>([])
  const [showAddCompetence, setShowAddCompetence] = useState(false)
  const [newCompetence, setNewCompetence] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  })
  
  // Debounce pour les sauvegardes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSavesRef = useRef<Map<string, { competence: string; col: ColonneDate; value: number }>>(new Map())

  // Charger toutes les compétences distinctes depuis la base de données (comme Planning2)
  useEffect(() => {
    const loadToutesCompetences = async () => {
      try {
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
        console.error('[GrilleCharge] Erreur chargement toutes compétences:', err)
        setToutesCompetences([])
      }
    }
    
    loadToutesCompetences()
  }, [])

  // Générer les colonnes selon la précision (comme Planning2)
  const colonnes = useMemo(() => {
    const cols: ColonneDate[] = []
    
    if (precision === 'JOUR') {
      const dates = getDatesBetween(dateDebut, dateFin)
      dates.forEach((date) => {
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })
        const day = date.getDate().toString().padStart(2, '0')
        const month = date.toLocaleDateString('fr-FR', { month: 'short' })
        cols.push({
          date,
          label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          shortLabel: `${dayName} ${day} ${month}`,
          isWeekend: isWeekend(date),
          isHoliday: isFrenchHoliday(date),
          semaineISO: formatSemaineISO(date),
        })
      })
    } else if (precision === 'SEMAINE') {
      const currentDate = new Date(dateDebut)
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentDate.setDate(currentDate.getDate() - daysToMonday)
      
      while (currentDate <= dateFin) {
        const weekStart = new Date(currentDate)
        const weekEnd = new Date(currentDate)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        cols.push({
          date: weekStart,
          label: `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
          shortLabel: getSemaineISOWithYear(weekStart),
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(weekStart),
          weekStart,
          weekEnd,
        })
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
    } else if (precision === 'MOIS') {
      // Pour MOIS, toujours afficher 12 mois glissants à partir de dateDebut
      const monthStart = new Date(dateDebut)
      monthStart.setDate(1)
      
      for (let i = 0; i < 12; i++) {
        const currentMonth = new Date(monthStart)
        currentMonth.setMonth(monthStart.getMonth() + i)
        
        const monthShort = currentMonth.toLocaleDateString('fr-FR', { month: 'short' })
        const monthShortClean = monthShort.replace(/\.$/, '')
        const year = currentMonth.getFullYear()
        const monthEnd = endOfMonth(currentMonth)
        
        cols.push({
          date: currentMonth,
          label: currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          shortLabel: `${monthShortClean}.${year}`,
          isWeekend: false,
          isHoliday: false,
          semaineISO: formatSemaineISO(currentMonth),
          weekStart: currentMonth,
          weekEnd: monthEnd,
        })
      }
    }
    
    return cols
  }, [dateDebut, dateFin, precision])


  // Liste des compétences - Utiliser toutes les compétences disponibles depuis la base (comme Planning2)
  const competencesList = useMemo(() => {
    const compSet = new Set<string>(toutesCompetences)
    periodes.forEach(p => { if (p.competence) compSet.add(p.competence) })
    return Array.from(compSet).sort()
  }, [toutesCompetences, periodes])

  // Extraire les compétences affichées dans la grille (celles qui ont des périodes + celles ajoutées manuellement)
  useEffect(() => {
    setCompetences((prevCompetences) => {
      const comps = new Set<string>(prevCompetences)
      periodes.forEach((p) => comps.add(p.competence))
      return Array.from(comps).sort()
    })
  }, [periodes])

  // Construire la grille depuis les périodes (comme Planning2 avec gestion week-end/férié)
  // Préserver les valeurs locales en cours de sauvegarde
  useEffect(() => {
    const newGrille = new Map<string, number>()

    periodes.forEach((periode) => {
      const periodeDateDebut = normalizeDateToUTC(new Date(periode.date_debut))
      const periodeDateFin = normalizeDateToUTC(new Date(periode.date_fin))
      
      colonnes.forEach((col, idx) => {
        const colDate = normalizeDateToUTC(col.date)
        let correspond = false
        
        if (precision === 'JOUR') {
          correspond = periodeDateDebut <= colDate && periodeDateFin >= colDate
          if (correspond && (col.isWeekend || col.isHoliday)) {
            if (periode.force_weekend_ferie !== true) return
          }
        } else if (precision === 'SEMAINE') {
          const dayOfWeek = col.date.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(col.date)
          weekStart.setDate(weekStart.getDate() - daysToMonday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          const weekStartUTC = normalizeDateToUTC(weekStart)
          const weekEndUTC = normalizeDateToUTC(weekEnd)
          correspond = periodeDateDebut <= weekEndUTC && periodeDateFin >= weekStartUTC
        } else if (precision === 'MOIS') {
          const monthStart = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
          const monthEnd = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
          const monthStartUTC = normalizeDateToUTC(monthStart)
          const monthEndUTC = normalizeDateToUTC(monthEnd)
          correspond = periodeDateDebut <= monthEndUTC && periodeDateFin >= monthStartUTC
        }
        
        if (correspond) {
          const cellKey = `${periode.competence}|${idx}`
          newGrille.set(cellKey, periode.nb_ressources)
        }
      })
    })

    // Préserver les valeurs locales qui sont en cours de sauvegarde ou qui viennent d'être modifiées
    // Cela évite que la grille soit réinitialisée à zéro pendant la sauvegarde
    setGrille((prevGrille) => {
      const mergedGrille = new Map(newGrille)
      
      // Préserver les valeurs de la grille précédente qui sont en cours de sauvegarde
      pendingSavesRef.current.forEach(({ competence, col, value }, cellKey) => {
        const colIndex = colonnes.findIndex(c => c.date.getTime() === col.date.getTime())
        if (colIndex >= 0) {
          const key = `${competence}|${colIndex}`
          // Garder la valeur en cours de sauvegarde si elle est différente de celle de la base
          // ou si elle n'existe pas encore dans la nouvelle grille
          const grilleValue = mergedGrille.get(key) || 0
          if (value !== grilleValue || !mergedGrille.has(key)) {
            mergedGrille.set(key, value)
          }
        }
      })
      
      // Préserver aussi les valeurs qui existent dans la grille précédente mais pas dans la nouvelle
      // (cas où la période n'est pas encore synchronisée via Realtime)
      prevGrille.forEach((value, key) => {
        if (!mergedGrille.has(key) && value > 0) {
          // Vérifier si cette valeur est en cours de sauvegarde
          const isPending = Array.from(pendingSavesRef.current.values()).some(
            ({ competence, col }) => {
              const colIndex = colonnes.findIndex(c => c.date.getTime() === col.date.getTime())
              return colIndex >= 0 && `${competence}|${colIndex}` === key
            }
          )
          if (isPending) {
            mergedGrille.set(key, value)
          }
        }
      })
      
      return mergedGrille
    })
    // Nettoyer les valeurs d'édition qui ne correspondent plus aux valeurs de la grille
    setEditingValues(prev => {
      const next = new Map(prev)
      let hasChanges = false
      next.forEach((editValue, cellKey) => {
        const grilleValue = newGrille.get(cellKey) || 0
        const editNum = parseFloat(editValue)
        if (!isNaN(editNum) && editNum === grilleValue) {
          next.delete(cellKey)
          hasChanges = true
        }
      })
      return hasChanges ? next : prev
    })
  }, [periodes, colonnes, precision])

  // Mise à jour optimiste de la grille locale
  const updateGrilleLocal = useCallback((competence: string, col: ColonneDate, value: number) => {
    setGrille((prev) => {
      const newGrille = new Map(prev)
      const colIndex = colonnes.findIndex(c => c.date.getTime() === col.date.getTime())
      const cellKey = `${competence}|${colIndex}`
      newGrille.set(cellKey, value)
      return newGrille
    })
  }, [colonnes])

  // Confirmation async (comme Planning2)
  const confirmAsync = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        },
      })
    })
  }, [])

  // Sauvegarde avec debounce et batch (comme Planning2 avec gestion week-end/férié)
  const handleCellChange = useCallback(async (competence: string, colIndex: number, value: number) => {
    const col = colonnes[colIndex]
    if (!col) return

    const cellKey = `${competence}|${colIndex}`
    const nbRessources = Math.max(0, Math.floor(value))
    
    // Stocker la sauvegarde en attente AVANT la mise à jour locale
    // Cela garantit que la valeur sera préservée lors de la reconstruction de la grille
    pendingSavesRef.current.set(cellKey, { competence, col, value: nbRessources })
    
    // Mise à jour optimiste immédiate
    updateGrilleLocal(competence, col, nbRessources)

    // Annuler le timeout précédent
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Programmer la sauvegarde après 500ms d'inactivité
    saveTimeoutRef.current = setTimeout(async () => {
      const saves = Array.from(pendingSavesRef.current.values())
      // Ne pas vider immédiatement - garder les valeurs jusqu'à ce que le Realtime confirme
      const savesToProcess = [...saves]
      // On garde les valeurs dans pendingSavesRef jusqu'à ce qu'elles soient confirmées par Realtime

      try {
        await Promise.all(
          savesToProcess.map(async ({ competence, col, value }) => {
            let dateDebutPeriode: Date
            let dateFinPeriode: Date
            let forceWeekendFerie = false
            
            if (precision === 'JOUR') {
              dateDebutPeriode = normalizeDateToUTC(col.date)
              dateFinPeriode = normalizeDateToUTC(col.date)
              
              if (value > 0 && (col.isWeekend || col.isHoliday)) {
                const confirme = await confirmAsync(
                  'Attention',
                  `Vous souhaitez enregistrer une charge un ${col.isWeekend ? 'week-end' : 'jour férié'} (${col.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}).\n\nVoulez-vous continuer ?`
                )
                if (!confirme) {
                  // Annuler la modification
                  updateGrilleLocal(competence, col, 0)
                  return
                }
                forceWeekendFerie = true
              }
            } else if (precision === 'SEMAINE') {
              const dayOfWeek = col.date.getDay()
              const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
              dateDebutPeriode = new Date(col.date)
              dateDebutPeriode.setDate(dateDebutPeriode.getDate() - daysToMonday)
              dateFinPeriode = new Date(dateDebutPeriode)
              dateFinPeriode.setDate(dateFinPeriode.getDate() + 6)
              dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
              dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
            } else if (precision === 'MOIS') {
              dateDebutPeriode = new Date(col.date.getFullYear(), col.date.getMonth(), 1)
              dateFinPeriode = new Date(col.date.getFullYear(), col.date.getMonth() + 1, 0)
              if (dateFinPeriode > dateFin) dateFinPeriode = new Date(dateFin)
              dateDebutPeriode = normalizeDateToUTC(dateDebutPeriode)
              dateFinPeriode = normalizeDateToUTC(dateFinPeriode)
            } else {
              dateDebutPeriode = normalizeDateToUTC(col.date)
              dateFinPeriode = normalizeDateToUTC(col.date)
            }

            const result = await savePeriode({
              competence,
              date_debut: dateDebutPeriode,
              date_fin: dateFinPeriode,
              nb_ressources: value,
              force_weekend_ferie: forceWeekendFerie,
            })
            return result
          })
        )
        
        // Après la sauvegarde, attendre que le Realtime se synchronise
        // Les valeurs restent dans pendingSavesRef jusqu'à ce qu'elles apparaissent dans periodes
        // Le useEffect les préservera automatiquement
      } catch (err) {
        console.error('[GrilleCharge] Erreur batch save:', err)
        // En cas d'erreur, retirer les sauvegardes pour éviter de bloquer
        savesToProcess.forEach(({ competence, col }) => {
          const colIndex = colonnes.findIndex(c => c.date.getTime() === col.date.getTime())
          if (colIndex >= 0) {
            const cellKey = `${competence}|${colIndex}`
            pendingSavesRef.current.delete(cellKey)
          }
        })
      }
    }, 500)
  }, [savePeriode, updateGrilleLocal, precision, dateFin, colonnes, confirmAsync])

  // Nettoyage du timeout au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Erreur: {error.message}</div>
      </div>
    )
  }

  // Boutons de précision et d'action
  const precisionButtons = onPrecisionChange ? (
    <div className="flex items-center gap-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-1 border border-gray-200">
      {(['JOUR', 'SEMAINE', 'MOIS'] as Precision[]).map((prec) => (
        <button
          key={prec}
          onClick={() => onPrecisionChange(prec)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            precision === prec
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-white hover:text-gray-800'
          }`}
        >
          {prec.charAt(0) + prec.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  ) : null

  const actionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      {!showAddCompetence ? (
        <>
          <button
            onClick={() => setShowAddCompetence(true)}
            className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md"
          >
            <Plus className="w-4 h-4" />
            Ajouter une compétence
          </button>
          {onOpenChargeModal && (
            <button
              onClick={onOpenChargeModal}
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md"
            >
              <Plus className="w-4 h-4" />
              Déclarer charge période
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={newCompetence}
            onChange={(e) => setNewCompetence(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCompetence) {
                if (!competences.includes(newCompetence)) {
                  setCompetences([...competences, newCompetence].sort())
                }
                setNewCompetence('')
                setShowAddCompetence(false)
              }
            }}
          >
            <option value="">Sélectionner une compétence...</option>
            {competencesList
              .filter((comp) => !competences.includes(comp))
              .map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
          </select>
          <input
            type="text"
            value={newCompetence}
            onChange={(e) => setNewCompetence(e.target.value)}
            placeholder="Ou saisir une nouvelle compétence"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCompetence.trim()) {
                const comp = newCompetence.trim()
                if (!competences.includes(comp)) {
                  setCompetences([...competences, comp].sort())
                }
                setNewCompetence('')
                setShowAddCompetence(false)
              }
            }}
          />
          <button
            onClick={() => {
              if (newCompetence.trim()) {
                const comp = newCompetence.trim()
                if (!competences.includes(comp)) {
                  setCompetences([...competences, comp].sort())
                }
                setNewCompetence('')
                setShowAddCompetence(false)
              }
            }}
            disabled={!newCompetence.trim()}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Ajouter
          </button>
          <button
            onClick={() => {
              setShowAddCompetence(false)
              setNewCompetence('')
            }}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Boutons au-dessus du tableau si showButtonsAbove est true */}
      {showButtonsAbove && (
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          {actionButtons}
          {precisionButtons}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
            <th className="border-b border-r border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
              Compétence
            </th>
            {colonnes.map((col, idx) => (
              <th
                key={idx}
                className={`border-b border-r border-gray-300 px-3 py-2 text-center min-w-[90px] text-xs font-semibold ${
                  col.isWeekend ? 'bg-blue-100 text-blue-800' :
                  col.isHoliday ? 'bg-rose-100 text-rose-800' :
                  'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-medium">{col.shortLabel}</div>
                {precision === 'SEMAINE' && (
                  <div className="text-[10px] text-gray-500 mt-0.5">{col.semaineISO}</div>
                )}
              </th>
            ))}
            <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-700 bg-gray-100">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {competences.map((comp, compIdx) => {
            const total = colonnes.reduce((sum, col, idx) => {
              const cellKey = `${comp}|${idx}`
              return sum + (grille.get(cellKey) || 0)
            }, 0)
            const isEven = compIdx % 2 === 0

            return (
              <tr key={comp} className={isEven ? 'bg-white' : 'bg-gray-50/50'}>
                <td className={`border-b border-r border-gray-300 px-4 py-3 font-semibold text-sm text-gray-800 sticky left-0 z-10 ${
                  isEven ? 'bg-white' : 'bg-gray-50/50'
                }`}>
                  {comp}
                </td>
                {colonnes.map((col, idx) => {
                  const cellKey = `${comp}|${idx}`
                  const value = grille.get(cellKey) || 0

                  return (
                    <td 
                      key={idx} 
                      className={`border-b border-r border-gray-300 px-2 py-2 ${
                        col.isWeekend ? 'bg-blue-50/50' :
                        col.isHoliday ? 'bg-rose-50/50' :
                        ''
                      }`}
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingValues.get(cellKey) ?? value}
                        onChange={(e) => {
                          const inputValue = e.target.value
                          // Garder la valeur brute dans l'état d'édition
                          setEditingValues(prev => {
                            const next = new Map(prev)
                            if (inputValue === '' || inputValue === '0') {
                              next.delete(cellKey)
                            } else {
                              next.set(cellKey, inputValue)
                            }
                            return next
                          })
                          // Convertir et mettre à jour la grille seulement si la valeur est valide
                          const numValue = parseFloat(inputValue)
                          if (!isNaN(numValue) && numValue >= 0) {
                            handleCellChange(comp, idx, numValue)
                          }
                        }}
                        onBlur={(e) => {
                          // À la perte de focus, nettoyer l'état d'édition et valider la valeur
                          const inputValue = e.target.value
                          const numValue = parseFloat(inputValue) || 0
                          setEditingValues(prev => {
                            const next = new Map(prev)
                            next.delete(cellKey)
                            return next
                          })
                          // S'assurer que la valeur finale est bien enregistrée
                          if (numValue !== value) {
                            handleCellChange(comp, idx, numValue)
                          }
                        }}
                        className={`w-full text-center text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 py-1 ${
                          col.isWeekend ? 'bg-blue-50 hover:bg-blue-100' :
                          col.isHoliday ? 'bg-rose-50 hover:bg-rose-100' :
                          'bg-transparent hover:bg-gray-100'
                        } transition-colors`}
                      />
                    </td>
                  )
                })}
                <td className={`border-b border-gray-300 px-4 py-3 text-center text-sm font-bold ${
                  total > 0 ? 'text-blue-700' : 'text-gray-500'
                } ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}>
                  {total.toFixed(0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {/* Boutons d'action en bas si showButtonsAbove est false */}
      {!showButtonsAbove && (
        <div className="mt-4">
          {actionButtons}
        </div>
      )}

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />

    </div>
  )
}
