'use client'

import React, { useState, useMemo } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useCharge } from '@/hooks/useCharge'
import { useAffectations } from '@/hooks/useAffectations'
import { useRessources } from '@/hooks/useRessources'
import { useAbsences } from '@/hooks/useAbsences'
import { BesoinsList } from './BesoinsList'
import { AffectationPanel } from './AffectationPanel'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { useToast } from '@/components/UI/Toast'
import type { BesoinPeriode } from '@/utils/planning/planning.compute'
import { periodeToBesoin } from '@/utils/planning/planning.compute'
// Note: triggerConsolidationPeriodesCharge retiré - la consolidation se fait automatiquement via les triggers SQL

interface Planning3Props {
  affaireId: string
  site: string
}

export function Planning3({ affaireId, site }: Planning3Props) {
  const [selectedBesoin, setSelectedBesoin] = useState<BesoinPeriode | null>(null)
  const [besoinToDelete, setBesoinToDelete] = useState<BesoinPeriode | null>(null)
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

  const { ressources, competences, loading: loadingRessources } = useRessources({
    site,
    actif: true,
  })

  const { absences, loading: loadingAbsences } = useAbsences({
    site: site || undefined,
  })

  // Récupérer l'UUID de l'affaire depuis les périodes (useMemo au lieu de useState + useEffect)
  const affaireUuid = useMemo(() => {
    return periodes.length > 0 ? periodes[0].affaire_id : null
  }, [periodes])

  // Note: La consolidation se fait automatiquement via les triggers SQL
  // Plus besoin d'appel manuel qui causait une récursion infinie

  // Calculer les besoins avec couverture (useMemo au lieu de useState + useEffect)
  const besoins = useMemo(() => {
    if (periodes.length > 0 && affectations.length >= 0) {
      return periodes.map((periode) => periodeToBesoin(periode, affectations))
    }
    return []
  }, [periodes, affectations])

  const handleAffecter = (besoin: BesoinPeriode) => {
    setSelectedBesoin(besoin)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleModifier = (_besoin: BesoinPeriode) => {
    // TODO: Implémenter la modification
    addToast('Fonctionnalité de modification à venir', 'info')
  }

  const handleSupprimer = (besoin: BesoinPeriode) => {
    setBesoinToDelete(besoin)
  }

  const confirmDelete = async () => {
    if (!besoinToDelete) return

    try {
      await deletePeriode(besoinToDelete.id)
      addToast('Besoin supprimé avec succès', 'success')
      setBesoinToDelete(null)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      addToast(errorMessage, 'error')
    }
  }

  const handleAffectationSuccess = async () => {
    refreshAffectations()
    refreshPeriodes()
    // La consolidation se fait automatiquement via les triggers SQL
    // après chaque INSERT/UPDATE/DELETE sur periodes_charge
  }

  const loading = loadingPeriodes || loadingAffectations || loadingRessources || loadingAbsences

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
      <BesoinsList
        besoins={besoins}
        onAffecter={handleAffecter}
        onModifier={handleModifier}
        onSupprimer={handleSupprimer}
      />

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

      {besoinToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Supprimer le besoin"
          message={`Êtes-vous sûr de vouloir supprimer ce besoin pour la compétence "${besoinToDelete.competence}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setBesoinToDelete(null)}
        />
      )}
    </>
  )
}

