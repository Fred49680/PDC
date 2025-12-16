'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Affectation, Ressource } from '@/types/affectations'

interface UseAffectationsOptions {
  affaireId: string
  site: string
  competence?: string
}

export function useAffectations({ affaireId, site, competence }: UseAffectationsOptions) {
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const loadAffectations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

      let query = supabase
        .from('affectations')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)

      if (competence) {
        query = query.eq('competence', competence)
      }

      const { data, error: queryError } = await query
        .order('date_debut', { ascending: true })

      if (queryError) throw queryError

      setAffectations((data || []) as Affectation[])
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [affaireId, site, competence, supabase])

  const loadRessources = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('ressources')
        .select('*')
        .eq('site', site)
        .eq('actif', true)
        .order('nom', { ascending: true })

      if (queryError) throw queryError

      setRessources((data || []) as Ressource[])
    } catch (err) {
      console.error('[useAffectations] Erreur loadRessources:', err)
    }
  }, [site, supabase])

  useEffect(() => {
    if (affaireId && site) {
      loadAffectations()
      loadRessources()
    }
  }, [affaireId, site, competence, loadAffectations, loadRessources])

  const saveAffectation = useCallback(async (affectation: Partial<Affectation>) => {
    try {
      setError(null)

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

      const affectationData = {
        ...affectation,
        affaire_id: affaireData.id,
        site,
      }

      const { data, error: upsertError } = await supabase
        .from('affectations')
        .upsert(affectationData)
        .select()
        .single()

      if (upsertError) throw upsertError

      // Recharger les affectations
      await loadAffectations()

      return data as Affectation
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur saveAffectation:', err)
      throw err
    }
  }, [affaireId, site, supabase, loadAffectations])

  const deleteAffectation = useCallback(async (affectationId: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('affectations')
        .delete()
        .eq('id', affectationId)

      if (deleteError) throw deleteError

      // Recharger les affectations
      await loadAffectations()
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur deleteAffectation:', err)
      throw err
    }
  }, [supabase, loadAffectations])

  return {
    affectations,
    ressources,
    loading,
    error,
    saveAffectation,
    deleteAffectation,
    refresh: loadAffectations,
  }
}
