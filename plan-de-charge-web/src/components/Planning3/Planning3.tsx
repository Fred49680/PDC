'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AlertCircle, Loader2, Grid3x3, LayoutGrid } from 'lucide-react'
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
// Note: triggerConsolidationPeriodesCharge retiré - la consolidation se fait automatiquement via les triggers SQL

import type { Precision } from '@/types/charge'

interface Planning3Props {
  affaireId: string
  site: string
  dateDebut?: Date
  dateFin?: Date
  precision?: Precision
}

export function Planning3({ affaireId, site, dateDebut, dateFin, precision = 'JOUR' }: Planning3Props) {
  const [selectedBesoin, setSelectedBesoin] = useState<BesoinPeriode | null>(null)
  const [besoinsMasse, setBesoinsMasse] = useState<BesoinPeriode[]>([])
  const [vue, setVue] = useState<'tuile' | 'grille'>('tuile')
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
  const { ressources, competences, loading: loadingRessources } = useRessources({
    actif: true,
    // site non spécifié = charger toutes les ressources de tous les sites
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

  // Charger TOUTES les absences (pas seulement du site) pour vérifier les disponibilités
  // des ressources d'autres sites dans le modal AffectationPanel
  const { absences, loading: loadingAbsences } = useAbsences({
    // site non spécifié = charger toutes les absences de tous les sites
  })

  // Récupérer l'UUID de l'affaire depuis les périodes (useMemo au lieu de useState + useEffect)
  const affaireUuid = useMemo(() => {
    return periodes.length > 0 ? periodes[0].affaire_id : null
  }, [periodes])

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
      {/* Toggle pour basculer entre vue tuile et vue grille */}
      <div className="flex justify-end mb-4">
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
        />
      )}

      {selectedBesoin && affaireUuid && (
        <AffectationPanel
          besoin={selectedBesoin}
          affaireId={affaireId}
          affaireUuid={affaireUuid}
          ressources={ressources}
          competences={competences}
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
          ressources={ressources}
          competences={competences}
          affectations={affectations}
          absences={absences}
          onClose={() => setBesoinsMasse([])}
          onSuccess={handleAffectationSuccess}
        />
      )}

    </>
  )
}

