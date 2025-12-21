'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Common/Layout'
import { GrilleCharge } from '@/components/Charge/GrilleCharge'
import { format, addMonths, startOfMonth, endOfMonth, addDays, addWeeks, subDays, subWeeks, subMonths, addMonths as addMonthsFn } from 'date-fns'
import { BarChart3, AlertCircle, Target, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Precision } from '@/types/charge'
import { useAffaires } from '@/hooks/useAffaires'
import { formatSemaineISO } from '@/utils/calendar'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function ChargePage() {
  const { affaires, loading: loadingAffaires } = useAffaires()

  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [responsable, setResponsable] = useState('')
  const [numeroCompte, setNumeroCompte] = useState('')
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

  // Réinitialiser les filtres en cascade quand on change le responsable
  useEffect(() => {
    if (responsable) {
      setSite('')
      setAffaireId('')
    }
  }, [responsable])

  // Réinitialiser affaire quand le site change
  useEffect(() => {
    if (site) {
      setAffaireId('')
    }
  }, [site])

  // Mettre à jour le site automatiquement quand une affaire est sélectionnée
  useEffect(() => {
    if (affaireId) {
      const affaire = affairesFiltreesFinales.find((a) => a.affaire_id === affaireId)
      if (affaire && affaire.site !== site) {
        setSite(affaire.site)
      }
    }
  }, [affaireId, affairesFiltreesFinales, site])

  // Sélection automatique de l'affaire si un numéro de compte correspond exactement
  useEffect(() => {
    if (numeroCompte && numeroCompte.trim() !== '') {
      const affaireTrouvee = affairesFiltreesFinales.find(
        (a) => a.affaire_id && a.affaire_id.toLowerCase() === numeroCompte.toLowerCase().trim()
      )
      if (affaireTrouvee && affaireTrouvee.affaire_id && affaireTrouvee.affaire_id !== affaireId) {
        setAffaireId(affaireTrouvee.affaire_id)
        setSite(affaireTrouvee.site)
      }
    }
  }, [numeroCompte, affairesFiltreesFinales, affaireId])

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête moderne */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <BarChart3 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Gestion de la Charge
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">Définissez les besoins en ressources par compétence</p>
            </div>
          </div>
        </div>

        {/* Sélection affaire - Compactée sur une ligne */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Titre compact */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Sélection affaire</h2>
            </div>
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
          </div>

          {/* Navigation et paramètres de période (comme Planning2) */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              {/* Navigation avec flèches */}
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-xl p-1 shadow-md">
                <button
                  onClick={() => {
                    let newDateDebut: Date
                    let newDateFin: Date
                    
                    if (precision === 'JOUR') {
                      const diffDays = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
                      newDateDebut = subDays(dateDebut, diffDays + 1)
                      newDateFin = subDays(dateFin, diffDays + 1)
                    } else if (precision === 'SEMAINE') {
                      const monthStart = startOfMonth(dateDebut)
                      const previousMonthStart = subMonths(monthStart, 1)
                      const dayOfWeekNew = previousMonthStart.getDay()
                      const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
                      newDateDebut = new Date(previousMonthStart)
                      newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
                      newDateFin = endOfMonth(previousMonthStart)
                    } else if (precision === 'MOIS') {
                      const monthStart = startOfMonth(dateDebut)
                      newDateDebut = subMonths(monthStart, 1)
                      newDateFin = endOfMonth(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
                    } else {
                      newDateDebut = subWeeks(dateDebut, 1)
                      newDateFin = subWeeks(dateFin, 1)
                    }
                    
                    setDateDebut(newDateDebut)
                    setDateFin(newDateFin)
                  }}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-all text-blue-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 text-center min-w-[200px] relative group">
                  <div className="font-semibold text-gray-800 pointer-events-none">
                    {dateDebut.toLocaleDateString('fr-FR')} - {dateFin.toLocaleDateString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1 pointer-events-none">
                    <Calendar className="w-3 h-3" />
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
                          const monthStart = startOfMonth(newDateDebut)
                          const weekStart = new Date(monthStart)
                          const dayOfWeek = weekStart.getDay() || 7
                          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                          weekStart.setDate(weekStart.getDate() - daysToMonday)
                          newDateFin = endOfMonth(monthStart)
                          setDateDebut(weekStart)
                        } else if (precision === 'MOIS') {
                          const monthStart = startOfMonth(newDateDebut)
                          newDateFin = endOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 11, 1))
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
                      const currentMonthEnd = endOfMonth(dateFin)
                      const nextMonthStart = addMonthsFn(startOfMonth(currentMonthEnd), 1)
                      const dayOfWeekNew = nextMonthStart.getDay()
                      const daysToMondayNew = dayOfWeekNew === 0 ? 6 : dayOfWeekNew - 1
                      newDateDebut = new Date(nextMonthStart)
                      newDateDebut.setDate(newDateDebut.getDate() - daysToMondayNew)
                      newDateFin = endOfMonth(nextMonthStart)
                    } else if (precision === 'MOIS') {
                      const monthStart = startOfMonth(dateDebut)
                      newDateDebut = addMonthsFn(monthStart, 1)
                      newDateFin = endOfMonth(new Date(newDateDebut.getFullYear(), newDateDebut.getMonth() + 11, 1))
                    } else {
                      newDateDebut = addWeeks(dateDebut, 1)
                      newDateFin = addWeeks(dateFin, 1)
                    }
                    
                    if (isNaN(newDateDebut.getTime()) || isNaN(newDateFin.getTime())) {
                      console.error('[ChargePage] Dates invalides calculées', { newDateDebut, newDateFin })
                      return
                    }
                    
                    setDateDebut(newDateDebut)
                    setDateFin(newDateFin)
                  }}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-all text-blue-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Précision */}
              <div className="flex items-center gap-1 bg-white/60 backdrop-blur rounded-xl p-1 shadow-md">
                {(['JOUR', 'SEMAINE', 'MOIS'] as Precision[]).map((prec) => (
                  <button
                    key={prec}
                    onClick={() => setPrecision(prec)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      precision === prec
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {prec.charAt(0) + prec.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grille de charge */}
        {affaireId && site && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
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
        )}

        {(!affaireId || !site) && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                Veuillez renseigner l'Affaire ID et le Site pour afficher la grille de charge.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
