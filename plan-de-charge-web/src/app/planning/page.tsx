'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Common/Layout'
import GrilleChargeAffectation from '@/components/ChargeAffectation/GrilleChargeAffectation'
import { format, startOfMonth, endOfMonth, startOfWeek, addWeeks } from 'date-fns'
import { Calendar, AlertCircle, Target, Settings, Search, Clock } from 'lucide-react'
import type { Precision } from '@/types/charge'
import { useAffaires } from '@/hooks/useAffaires'
import { SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'
import Link from 'next/link'

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic'

export default function PlanningPage() {
  const { affaires, loading: loadingAffaires } = useAffaires()
  
  const [affaireId, setAffaireId] = useState('')
  const [site, setSite] = useState('')
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()))
  const [dateFin, setDateFin] = useState(endOfMonth(new Date()))
  const [precision, setPrecision] = useState<Precision>('JOUR')
  const [responsable, setResponsable] = useState('')
  const [tranche, setTranche] = useState('')

  // Filtrer les affaires actives et ouvertes/prévisionnelles
  const affairesActives = affaires.filter(
    (a) => a.actif && (a.statut === 'Ouverte' || a.statut === 'Prévisionnelle')
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
  const affairesFiltreesFinales = tranche
    ? affairesFiltreesParResponsableEtSite.filter((a) => a.tranche === tranche)
    : affairesFiltreesParResponsableEtSite

  // Ajuster automatiquement la date de fin selon la précision
  useEffect(() => {
    if (precision === 'SEMAINE') {
      const weekStart = startOfWeek(dateDebut, { weekStartsOn: 1 })
      const weekEnd = addWeeks(weekStart, 4)
      setDateDebut(weekStart)
      setDateFin(weekEnd)
    } else if (precision === 'MOIS') {
      setDateDebut(startOfMonth(dateDebut))
      setDateFin(endOfMonth(dateDebut))
    }
  }, [precision])

  // Réinitialiser les filtres en cascade quand on change le responsable
  useEffect(() => {
    if (responsable) {
      // Réinitialiser site, tranche et affaire si le responsable change
      setSite('')
      setTranche('')
      setAffaireId('')
    }
  }, [responsable])

  // Réinitialiser tranche et affaire quand le site change
  useEffect(() => {
    if (site) {
      setTranche('')
      setAffaireId('')
    }
  }, [site])

  // Réinitialiser affaire quand la tranche change
  useEffect(() => {
    if (tranche) {
      setAffaireId('')
    }
  }, [tranche])

  // Mettre à jour le site automatiquement quand une affaire est sélectionnée
  useEffect(() => {
    if (affaireId) {
      const affaire = affairesFiltreesFinales.find((a) => a.affaire_id === affaireId)
      if (affaire && affaire.site !== site) {
        setSite(affaire.site)
      }
    }
  }, [affaireId, affairesFiltreesFinales, site])

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête avec raccourcis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Planning Charge & Affectations
              </h1>
              <p className="text-gray-600 mt-1">
                Définissez la charge par compétence et affectez les ressources disponibles
              </p>
            </div>
          </div>
          
        </div>

                 {/* Grille combinée */}
                 {affaireId && site ? (
                   <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
                     <GrilleChargeAffectation
                       affaireId={affaireId}
                       site={site}
                       dateDebut={dateDebut}
                       dateFin={dateFin}
                       precision={precision}
                       affaires={affairesActives}
                       responsable={responsable}
                       tranche={tranche}
                       onDateChange={(newDateDebut, newDateFin) => {
                         setDateDebut(newDateDebut)
                         setDateFin(newDateFin)
                       }}
                       onPrecisionChange={(newPrecision) => {
                         setPrecision(newPrecision)
                       }}
                       onAffaireChange={(newAffaireId, newSite) => {
                         setAffaireId(newAffaireId)
                         if (newSite) setSite(newSite)
                       }}
                       onResponsableChange={(newResponsable) => {
                         setResponsable(newResponsable)
                       }}
                       onSiteChange={(newSite) => {
                         setSite(newSite)
                       }}
                       onTrancheChange={(newTranche) => {
                         setTranche(newTranche)
                       }}
                     />
                   </div>
                 ) : (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800 font-medium">
                Veuillez sélectionner une affaire et un site pour afficher la grille de charge et d'affectations.
              </p>
            </div>
          </div>
        )}

        {/* Liens rapides vers autres pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/affaires"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">Gérer les affaires</p>
              <p className="text-sm text-gray-500">Créer et modifier les affaires</p>
            </div>
          </Link>

          <Link
            href="/ressources"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-green-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Gérer les ressources</p>
              <p className="text-sm text-gray-500">Voir et modifier les ressources</p>
            </div>
          </Link>

          <Link
            href="/absences"
            className="flex items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 hover:shadow-lg hover:border-purple-300 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">Gérer les absences</p>
              <p className="text-sm text-gray-500">Déclarer absences et formations</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
