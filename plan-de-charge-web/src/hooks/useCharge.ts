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

      // Convertir les dates de string ISO en Date
      const periodesAvecDates = (data || []).map((p: any) => ({
        ...p,
        date_debut: p.date_debut ? new Date(p.date_debut) : new Date(),
        date_fin: p.date_fin ? new Date(p.date_fin) : new Date(),
        created_at: p.created_at ? new Date(p.created_at) : new Date(),
        updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
      })) as PeriodeCharge[]

      setPeriodes(periodesAvecDates)
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

      // *** OPTIMISATION : Mise à jour optimiste au lieu de recharger immédiatement ***
      // Cela évite que le rechargement écrase les valeurs en cours de saisie
      const periodeAvecDates = {
        ...data,
        date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
        date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      } as PeriodeCharge

      // Mettre à jour optimistement periodes (remplacer ou ajouter la période)
      setPeriodes((prev) => {
        const newPeriodes = [...prev]
        const index = newPeriodes.findIndex(
          (p) => p.id === periodeAvecDates.id || 
          (p.affaire_id === periodeAvecDates.affaire_id &&
           p.site === periodeAvecDates.site &&
           p.competence === periodeAvecDates.competence &&
           new Date(p.date_debut).getTime() === periodeAvecDates.date_debut.getTime() &&
           new Date(p.date_fin).getTime() === periodeAvecDates.date_fin.getTime())
        )
        
        if (index >= 0) {
          newPeriodes[index] = periodeAvecDates
        } else {
          newPeriodes.push(periodeAvecDates)
        }
        
        return newPeriodes
      })

      // Recharger les périodes en arrière-plan (avec un petit délai pour éviter les conflits)
      // Cela permet de synchroniser avec la BDD sans bloquer l'UI
      setTimeout(() => {
        loadPeriodes().catch((err) => {
          console.error('[useCharge] Erreur lors du rechargement différé:', err)
        })
      }, 500)

      return periodeAvecDates
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

      // *** OPTIMISATION : Mise à jour optimiste au lieu de recharger immédiatement ***
      // Supprimer la période de l'état local immédiatement
      setPeriodes((prev) => prev.filter((p) => p.id !== periodeId))

      // Recharger les périodes en arrière-plan (avec un petit délai pour éviter les conflits)
      setTimeout(() => {
        loadPeriodes().catch((err) => {
          console.error('[useCharge] Erreur lors du rechargement différé:', err)
        })
      }, 500)
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
