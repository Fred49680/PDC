'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Affaire } from '@/types/charge'

interface UseAffairesOptions {
  affaireId?: string
  site?: string
  actif?: boolean
}

export function useAffaires(options: UseAffairesOptions = {}) {
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on the client side')
    }
    return createClient()
  }, [])

  const loadAffaires = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      let query = supabase
        .from('affaires')
        .select('*')
        .order('affaire_id', { ascending: true })

      if (options.affaireId) {
        query = query.eq('affaire_id', options.affaireId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.actif !== undefined) {
        query = query.eq('actif', options.actif)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setAffaires(
        (data || []).map((item) => ({
          id: item.id,
          affaire_id: item.affaire_id || '',
          site: item.site,
          libelle: item.libelle,
          // Nouveaux champs
          tranche: item.tranche || undefined,
          affaire_nom: item.affaire_nom || undefined,
          statut: item.statut || undefined,
          compte: item.compte || undefined,
          date_debut_dem: item.date_debut_dem ? new Date(item.date_debut_dem) : undefined,
          date_fin_dem: item.date_fin_dem ? new Date(item.date_fin_dem) : undefined,
          responsable: item.responsable || undefined,
          budget_heures: item.budget_heures ? Number(item.budget_heures) : undefined,
          raf: item.raf ? Number(item.raf) : undefined,
          date_maj: item.date_maj ? new Date(item.date_maj) : undefined,
          total_planifie: item.total_planifie ? Number(item.total_planifie) : undefined,
          // Champs existants
          date_creation: new Date(item.date_creation),
          date_modification: new Date(item.date_modification),
          actif: item.actif ?? true,
          created_by: item.created_by,
          updated_by: item.updated_by,
        }))
      )
    } catch (err: any) {
      setError(err)
      console.error('[useAffaires] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.affaireId, options.site, options.actif, getSupabaseClient])

  const saveAffaire = useCallback(
    async (affaire: Partial<Affaire> & { site: string; libelle: string }) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        // Ne PAS inclure affaire_id dans les données (généré automatiquement par le trigger)
        const affaireData: any = {
          site: affaire.site,
          libelle: affaire.libelle,
          actif: affaire.actif ?? true,
          // Nouveaux champs pour génération AffaireID
          tranche: affaire.tranche || null,
          affaire_nom: affaire.affaire_nom || null,
          statut: affaire.statut || 'Ouverte',
          compte: affaire.compte || null,
          date_debut_dem: affaire.date_debut_dem ? affaire.date_debut_dem.toISOString().split('T')[0] : null,
          date_fin_dem: affaire.date_fin_dem ? affaire.date_fin_dem.toISOString().split('T')[0] : null,
          responsable: affaire.responsable || null,
          budget_heures: affaire.budget_heures || null,
          raf: affaire.raf || null,
          date_maj: affaire.date_maj ? affaire.date_maj.toISOString() : null,
          total_planifie: affaire.total_planifie || null,
          date_modification: new Date().toISOString(),
        }

        if (affaire.id) {
          // Mise à jour
          const { error: updateError } = await supabase
            .from('affaires')
            .update(affaireData)
            .eq('id', affaire.id)

          if (updateError) throw updateError
        } else {
          // Création
          const { error: insertError } = await supabase.from('affaires').insert(affaireData)

          if (insertError) throw insertError
        }

        // Recharger la liste
        await loadAffaires()
      } catch (err: any) {
        setError(err)
        console.error('[useAffaires] Erreur saveAffaire:', err)
        throw err
      }
    },
    [getSupabaseClient, loadAffaires]
  )

  const deleteAffaire = useCallback(
    async (id: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('affaires').delete().eq('id', id)

        if (deleteError) throw deleteError

        // Recharger la liste
        await loadAffaires()
      } catch (err: any) {
        setError(err)
        console.error('[useAffaires] Erreur deleteAffaire:', err)
        throw err
      }
    },
    [getSupabaseClient, loadAffaires]
  )

  useEffect(() => {
    loadAffaires()
  }, [loadAffaires])

  return {
    affaires,
    loading,
    error,
    loadAffaires,
    saveAffaire,
    deleteAffaire,
  }
}
