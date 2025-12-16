'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAffectations } from '@/hooks/useAffectations'
import { useAbsences } from '@/hooks/useAbsences'
import { useRealtime } from '@/hooks/useRealtime'
import type { Precision } from '@/types/charge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface GrilleAffectationsProps {
  affaireId: string
  site: string
  competence: string
  dateDebut: Date
  dateFin: Date
  precision: Precision
}

export function GrilleAffectations({
  affaireId,
  site,
  competence,
  dateDebut,
  dateFin,
  precision,
}: GrilleAffectationsProps) {
  const { affectations, ressources, loading, error, saveAffectation } = useAffectations({
    affaireId,
    site,
    competence,
  })

  const [grille, setGrille] = useState<Map<string, boolean>>(new Map())

  // Charger les absences pour cette compétence
  const { absences } = useAbsences({ site })

  // Écouter les changements en temps réel
  useRealtime({
    table: 'affectations',
    filter: `affaire_id=eq.${affaireId}`,
    callback: (payload) => {
      console.log('[GrilleAffectations] Changement temps réel:', payload)
    },
  })

  // Générer les colonnes (même logique que GrilleCharge)
  const colonnes = useMemo(() => {
    // TODO: Implémenter la génération de colonnes selon la précision
    // Pour l'instant, on utilise des colonnes simples
    return []
  }, [dateDebut, dateFin, precision])

  const handleCellChange = async (ressourceId: string, date: Date, value: boolean) => {
    try {
      if (value) {
        await saveAffectation({
          ressource_id: ressourceId,
          competence,
          date_debut: date,
          date_fin: date,
          charge: 1,
        })
      } else {
        // Supprimer l'affectation
        // TODO: Implémenter deleteAffectation
      }
    } catch (err) {
      console.error('[GrilleAffectations] Erreur saveAffectation:', err)
    }
  }

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

  return (
    <div className="overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">{competence}</h3>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
              Ressource
            </th>
            {/* Colonnes de dates */}
          </tr>
        </thead>
        <tbody>
          {ressources.map((ressource) => (
            <tr key={ressource.id}>
              <td className="border border-gray-300 p-2">{ressource.nom}</td>
              {/* Cellules d'affectation */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
