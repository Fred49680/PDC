'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, BarChart3, Target } from 'lucide-react'
import { GrilleCharge } from '@/components/Charge/GrilleCharge'
import { Planning3 } from '@/components/Planning3'
import { useAffaires } from '@/hooks/useAffaires'
import { startOfMonth, endOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { formatSemaineISO } from '@/utils/calendar'
import type { Precision } from '@/types/charge'
import { addMonths, addDays, addWeeks, subDays, subWeeks, subMonths, startOfMonth as startOfMonthFn, endOfMonth as endOfMonthFn } from 'date-fns'

interface ModalChargeAffectationProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalChargeAffectation({ isOpen, onClose }: ModalChargeAffectationProps) {
  const [activeTab, setActiveTab] = useState<'charge' | 'affectation'>('charge')
  const { affaires } = useAffaires()
  
  // État pour le drag & drop
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  // État partagé pour l'affaire
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [responsable, setResponsable] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')

  // État pour la page Charge uniquement
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
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

  // Réinitialiser la position quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[calc(100vh-4rem)] flex flex-col my-auto"
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Navigation avec flèches */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-1.5 border border-blue-100 shadow-sm">
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
              <div className="px-4 py-2 text-center min-w-[220px] relative group">
                <div className="font-semibold text-gray-800 pointer-events-none">
                  {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1 pointer-events-none mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatSemaineISO(dateDebut)}
                </div>
                <input
                  type="date"
                  value={dateDebut.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const dateStr = e.target.value
                      const newDateDebut = new Date(dateStr + 'T12:00:00')
                      if (isNaN(newDateDebut.getTime())) return
                      
                      setDateDebut(newDateDebut)
                      let newDateFin: Date
                      if (precision === 'SEMAINE') {
                        const monthStart = startOfMonthFn(newDateDebut)
                        const weekStart = new Date(monthStart)
                        const dayOfWeek = weekStart.getDay() || 7
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                        weekStart.setDate(weekStart.getDate() - daysToMonday)
                        newDateFin = endOfMonthFn(monthStart)
                        setDateDebut(weekStart)
                      } else if (precision === 'MOIS') {
                        const monthStart = startOfMonthFn(newDateDebut)
                        newDateFin = endOfMonthFn(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1))
                      } else {
                        const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                        newDateFin = new Date(newDateDebut.getTime() + diffDays * 24 * 60 * 60 * 1000)
                      }
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

            {/* Précision */}
            <div className="flex items-center gap-1 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-1 border border-gray-200">
              {(['JOUR', 'SEMAINE', 'MOIS'] as Precision[]).map((prec) => (
                <button
                  key={prec}
                  onClick={() => setPrecision(prec)}
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
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('charge')}
            className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'charge'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Charge
          </button>
          <button
            onClick={() => setActiveTab('affectation')}
            className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'affectation'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
            }`}
          >
            <Target className="w-5 h-5" />
            Affectation
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="flex-1 overflow-y-auto p-6 pb-12">
          {activeTab === 'charge' && (
            <div className="space-y-6">
              {/* Grille de charge */}
              {affaireId && site ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
                  <GrilleCharge
                    affaireId={affaireId}
                    site={site}
                    dateDebut={dateDebut}
                    dateFin={dateFin}
                    precision={precision}
                    onDateDebutChange={setDateDebut}
                    onDateFinChange={setDateFin}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-amber-800 font-medium">
                      Veuillez renseigner l&apos;Affaire ID et le Site pour afficher la grille de charge.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'affectation' && (
            <div>
              {affaireId && site ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-6">
                  <Planning3 
                    affaireId={affaireId} 
                    site={site}
                    dateDebut={dateDebut}
                    dateFin={dateFin}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-amber-800 font-medium">
                      Veuillez sélectionner une affaire et un site pour afficher le planning.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

