'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { X, Target, Search } from 'lucide-react'
import { GrilleCharge } from '@/components/Charge/GrilleCharge'
import { Planning3 } from '@/components/Planning3'
import { useAffaires } from '@/hooks/useAffaires'
import { startOfMonth, endOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { formatPlageSemainesISO } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { addMonths, addDays, addWeeks, subDays, subWeeks, subMonths, startOfMonth as startOfMonthFn, endOfMonth as endOfMonthFn } from 'date-fns'
import { DateRangePickerModal } from './DateRangePickerModal'

interface ModalChargeAffectationProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalChargeAffectation({ isOpen, onClose }: ModalChargeAffectationProps) {
  const { affaires } = useAffaires()
  
  // État pour le drag & drop
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [wasOpen, setWasOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Réinitialiser la position quand le modal s'ouvre
  if (isOpen && !wasOpen) {
    setPosition({ x: 0, y: 0 })
    setWasOpen(true)
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  // État partagé pour l'affaire
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [responsable, setResponsable] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)

  // État pour la page Charge uniquement
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Ref pour stocker la fonction d'ouverture du modal de charge depuis Planning3
  const openChargeModalRef = useRef<(() => void) | null>(null)
  // Ref pour stocker la fonction de refresh de la grille de charge
  const refreshGrilleChargeRef = useRef<(() => Promise<void>) | null>(null)

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

  // Recherche intelligente dans les affaires (numéro de compte, libellé, responsable, site)
  const affairesRecherchees = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return []
    }
    
    const query = searchQuery.toLowerCase().trim()
    const allAffaires = responsable
      ? site
        ? affairesFiltreesParResponsableEtSite
        : affairesFiltreesParResponsable
      : affairesActives
    
    return allAffaires
      .filter((a) => {
        const matchId = a.affaire_id?.toLowerCase().includes(query) || false
        const matchLibelle = a.libelle?.toLowerCase().includes(query) || false
        const matchResponsable = a.responsable?.toLowerCase().includes(query) || false
        const matchSite = a.site?.toLowerCase().includes(query) || false
        const matchCompte = a.compte?.toLowerCase().includes(query) || false
        
        return matchId || matchLibelle || matchResponsable || matchSite || matchCompte
      })
      .slice(0, 10) // Limiter à 10 résultats pour la performance
  }, [searchQuery, responsable, site, affairesActives, affairesFiltreesParResponsable, affairesFiltreesParResponsableEtSite])

  // Handlers pour gérer les changements de filtres
  const handleResponsableChange = (newResponsable: string) => {
    setResponsable(newResponsable)
    if (newResponsable) {
      setSite('')
      setAffaireId('')
    }
  }

  const handleSiteChange = (newSite: string) => {
    setSite(newSite)
    if (newSite) {
      setAffaireId('')
    }
  }

  const handleAffaireChange = (selectedAffaireId: string) => {
    if (selectedAffaireId) {
      const affaire = affairesFiltreesFinales.find((a) => a.affaire_id === selectedAffaireId)
      if (affaire) {
        setAffaireId(selectedAffaireId)
        setSite(affaire.site)
        setNumeroCompte('')
      }
    } else {
      setAffaireId('')
    }
  }

  const handleNumeroCompteChange = (value: string) => {
    setNumeroCompte(value)
    
    // Recherche automatique si le numéro de compte correspond exactement
    if (value && value.trim() !== '') {
      const affaireTrouvee = affairesFiltreesFinales.find(
        (a) => a.affaire_id && a.affaire_id.toLowerCase() === value.toLowerCase().trim()
      )
      if (affaireTrouvee && affaireTrouvee.affaire_id && affaireTrouvee.affaire_id !== affaireId) {
        setAffaireId(affaireTrouvee.affaire_id)
        setSite(affaireTrouvee.site)
      }
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSearchResults(value.trim().length > 0)
    
    // Réinitialiser les champs associés quand on commence à taper dans la recherche
    // Cela permet de faire une nouvelle recherche propre
    if (value.trim().length > 0) {
      setAffaireId('')
      setSite('')
      setResponsable('')
      setNumeroCompte('')
    }
  }

  const handleSelectAffaireFromSearch = (affaire: typeof affairesActives[0]) => {
    if (affaire.affaire_id) {
      setAffaireId(affaire.affaire_id)
      setSite(affaire.site)
      setResponsable(affaire.responsable || '')
      setSearchQuery('')
      setShowSearchResults(false)
      setNumeroCompte('')
    }
  }

  // Fermer les résultats de recherche quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handlers pour le drag & drop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) {
      return // Ne pas démarrer le drag si on clique sur un élément interactif
    }
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[calc(100vh-2rem)] flex flex-col"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Header - Zone de drag */}
        <div
          className="flex items-center justify-between p-6 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Planification</h2>
            <p className="text-sm text-gray-600 mt-1">Gestion de la charge et des affectations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélection affaire - Partagée entre les deux onglets */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Titre compact */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Target className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-semibold text-gray-800">Sélection affaire</h3>
            </div>
            {/* Recherche intelligente */}
            <div className="flex-1 min-w-[200px] relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Recherche affaire
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) {
                      setShowSearchResults(true)
                    }
                  }}
                  placeholder="Rechercher par ID, libellé, responsable..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
                {/* Résultats de recherche */}
                {showSearchResults && affairesRecherchees.length > 0 && (
                  <div
                    ref={searchResultsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {affairesRecherchees.map((affaire) => (
                      <button
                        key={affaire.id}
                        type="button"
                        onClick={() => handleSelectAffaireFromSearch(affaire)}
                        className="w-full px-4 py-2 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {affaire.site && <span className="mr-2">📍 {affaire.site}</span>}
                              {affaire.responsable && <span>👤 {affaire.responsable}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchResults && searchQuery.trim().length > 0 && affairesRecherchees.length === 0 && (
                  <div
                    ref={searchResultsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
                  >
                    <p className="text-sm text-gray-500 text-center">Aucune affaire trouvée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Numéro de compte */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Numéro de compte
              </label>
              <input
                type="text"
                value={numeroCompte}
                onChange={(e) => handleNumeroCompteChange(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
              />
            </div>

            {/* Responsable */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable</label>
              <select
                value={responsable}
                onChange={(e) => handleResponsableChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
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
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
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
                onChange={(e) => handleAffaireChange(e.target.value)}
                disabled={!site}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner...</option>
                {affairesFiltreesFinales.map((affaire) => (
                  <option key={affaire.id} value={affaire.affaire_id || ''}>
                    {affaire.affaire_id || 'Sans ID'} - {affaire.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation et paramètres de période - Partagés entre les deux onglets */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-200 bg-white">
          {/* Sélection de période sur toute la largeur */}
          <div className="w-full mb-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-1.5 border border-blue-100 shadow-sm w-full justify-center">
              <button
                onClick={() => {
                  let newDateDebut: Date
                  let newDateFin: Date
                  
                  if (precision === 'JOUR') {
                    const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                    newDateDebut = subDays(dateDebut, diffDays + 1)
                    newDateFin = subDays(dateFin, diffDays + 1)
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
                className="p-2 hover:bg-blue-200 rounded-lg transition-all text-blue-700 hover:text-blue-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div 
                className="px-4 py-2 text-center min-w-[220px] cursor-pointer hover:bg-blue-100 rounded-lg transition-colors relative z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDatePickerOpen(true)
                }}
                title="Cliquer pour sélectionner une période personnalisée"
              >
                <div className="font-semibold text-gray-800">
                  {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatPlageSemainesISO(dateDebut, dateFin)}
                </div>
              </div>
              <button
                onClick={() => {
                  let newDateDebut: Date
                  let newDateFin: Date
                  
                  if (precision === 'JOUR') {
                    const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                    newDateDebut = addDays(dateDebut, diffDays + 1)
                    newDateFin = addDays(dateFin, diffDays + 1)
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
                    console.error('[ModalChargeAffectation] Dates invalides calculées', { newDateDebut, newDateFin })
                    return
                  }
                  
                  setDateDebut(newDateDebut)
                  setDateFin(newDateFin)
                }}
                className="p-2 hover:bg-blue-200 rounded-lg transition-all text-blue-700 hover:text-blue-900"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 overflow-y-auto p-6 pb-12">
            <div className="space-y-6">
              {/* Grille de charge */}
              {affaireId && site ? (
              <>
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
                  <GrilleCharge
                    affaireId={affaireId}
                    site={site}
                    dateDebut={dateDebut}
                    dateFin={dateFin}
                    precision={precision}
                    onDateDebutChange={setDateDebut}
                    onDateFinChange={setDateFin}
                    onPrecisionChange={setPrecision}
                    showButtonsAbove={true}
                    onOpenChargeModal={() => {
                      console.log('[ModalChargeAffectation] Callback appelé, ref:', openChargeModalRef.current)
                      if (openChargeModalRef.current) {
                        openChargeModalRef.current()
                      } else {
                        console.warn('[ModalChargeAffectation] Le ref est null, le modal ne peut pas s\'ouvrir')
                      }
                    }}
                    onRegisterRefresh={(fn) => {
                      refreshGrilleChargeRef.current = fn
                    }}
                  />
                </div>
                
                {/* Planning d'affectation sous le tableau de charge */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
                  <Planning3 
                    affaireId={affaireId} 
                    site={site}
                    dateDebut={dateDebut}
                    dateFin={dateFin}
                    precision={precision}
                    onRegisterOpenChargeModal={(fn) => {
                      openChargeModalRef.current = fn
                    }}
                    refreshGrilleChargeRef={refreshGrilleChargeRef}
                  />
                </div>
              </>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-amber-800 font-medium">
                    Veuillez renseigner l&apos;Affaire ID et le Site pour afficher la grille de charge et le planning.
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Modal de sélection de dates personnalisées */}
        {isDatePickerOpen && (
          <DateRangePickerModal
            isOpen={isDatePickerOpen}
            dateDebut={dateDebut}
            dateFin={dateFin}
            onConfirm={(newDateDebut, newDateFin) => {
              setDateDebut(newDateDebut)
              setDateFin(newDateFin)
              setIsDatePickerOpen(false)
            }}
            onCancel={() => setIsDatePickerOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

