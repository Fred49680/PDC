'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Affectation, Ressource } from '@/types/affectations'

interface UseAffectationsOptions {
  affaireId: string
  site: string
  competence?: string
  autoRefresh?: boolean // Option pour désactiver le refresh automatique
}

export function useAffectations({ affaireId, site, competence, autoRefresh = true }: UseAffectationsOptions) {
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Créer le client de manière lazy (seulement côté client)
  const getSupabaseClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }

  const loadAffectations = useCallback(async () => {
    try {
      setLoading(true)
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

      // Convertir les dates de string ISO en Date
      const affectationsAvecDates = (data || []).map((a: any) => ({
        ...a,
        date_debut: a.date_debut ? new Date(a.date_debut) : new Date(),
        date_fin: a.date_fin ? new Date(a.date_fin) : new Date(),
        created_at: a.created_at ? new Date(a.created_at) : new Date(),
        updated_at: a.updated_at ? new Date(a.updated_at) : new Date(),
      })) as Affectation[]

      setAffectations(affectationsAvecDates)
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [affaireId, site, competence])

  const loadRessources = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()

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
  }, [site])

  useEffect(() => {
    if (affaireId && site) {
      loadAffectations()
      loadRessources()
    }
  }, [affaireId, site, competence, loadAffectations, loadRessources])

  const saveAffectation = useCallback(async (affectation: Partial<Affectation>) => {
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

      // Mise à jour optimiste immédiate (pour que la checkbox se mette à jour instantanément)
      const affectationAvecDates = {
        ...data,
        date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
        date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      } as Affectation
      
      setAffectations((prev) => {
        const newAffectations = [...prev]
        // Chercher si une affectation existante a le même ID
        let index = newAffectations.findIndex((a) => a.id === affectationAvecDates.id)
        
        // Si pas trouvé par ID, chercher par ressource/compétence/dates (pour les nouvelles affectations)
        if (index < 0 && affectationData.ressource_id && affectationData.competence) {
          index = newAffectations.findIndex((a) => 
            a.ressource_id === affectationData.ressource_id &&
            a.competence === affectationData.competence &&
            Math.abs(new Date(a.date_debut).getTime() - new Date(affectationAvecDates.date_debut).getTime()) < 1000 &&
            Math.abs(new Date(a.date_fin).getTime() - new Date(affectationAvecDates.date_fin).getTime()) < 1000
          )
        }
        
        if (index >= 0) {
          newAffectations[index] = affectationAvecDates
        } else {
          newAffectations.push(affectationAvecDates)
        }
        return newAffectations
      })

      // Recharger les affectations seulement si autoRefresh est activé (en arrière-plan)
      if (autoRefresh) {
        // Ne pas attendre le rechargement pour que la mise à jour optimiste soit visible immédiatement
        loadAffectations().catch((err) => {
          console.error('[useAffectations] Erreur lors du rechargement:', err)
        })
      }

      return data as Affectation
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur saveAffectation:', err)
      throw err
    }
  }, [affaireId, site, loadAffectations, autoRefresh])

  const deleteAffectation = useCallback(async (affectationId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('affectations')
        .delete()
        .eq('id', affectationId)

      if (deleteError) throw deleteError

      // Recharger les affectations seulement si autoRefresh est activé
      if (autoRefresh) {
        await loadAffectations()
      } else {
        // Mise à jour optimiste : supprimer de l'état local
        setAffectations((prev) => prev.filter((a) => a.id !== affectationId))
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur deleteAffectation:', err)
      throw err
    }
  }, [loadAffectations])

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
