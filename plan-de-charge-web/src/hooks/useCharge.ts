'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PeriodeCharge } from '@/types/charge'

interface UseChargeOptions {
  affaireId: string
  site: string
}

export function useCharge({ affaireId, site }: UseChargeOptions) {
  const [periodes, setPeriodes] = useState<PeriodeCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Créer le client de manière lazy (seulement côté client)
  const getSupabaseClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }

  const loadPeriodes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire depuis affaire_id
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .single()

      if (affaireError || !affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      const { data, error: queryError } = await supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)
        .order('date_debut', { ascending: true })

      if (queryError) throw queryError

      setPeriodes((data || []) as PeriodeCharge[])
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [affaireId, site])

  useEffect(() => {
    if (affaireId && site) {
      loadPeriodes()
    }
  }, [affaireId, site, loadPeriodes])

  const savePeriode = useCallback(async (periode: Partial<PeriodeCharge>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .single()

      if (affaireError || !affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      const periodeData = {
        ...periode,
        affaire_id: affaireData.id,
        site,
      }

      const { data, error: upsertError } = await supabase
        .from('periodes_charge')
        .upsert(periodeData, {
          onConflict: 'affaire_id,site,competence,date_debut,date_fin',
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // Recharger les périodes
      await loadPeriodes()

      return data as PeriodeCharge
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur savePeriode:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes])

  const deletePeriode = useCallback(async (periodeId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('periodes_charge')
        .delete()
        .eq('id', periodeId)

      if (deleteError) throw deleteError

      // Recharger les périodes
      await loadPeriodes()
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur deletePeriode:', err)
      throw err
    }
  }, [loadPeriodes])

  const consolidate = useCallback(async () => {
    // TODO: Implémenter la consolidation
    // Pour l'instant, on recharge simplement les périodes
    await loadPeriodes()
  }, [loadPeriodes])

  return {
    periodes,
    loading,
    error,
    savePeriode,
    deletePeriode,
    consolidate,
    refresh: loadPeriodes,
  }
}
