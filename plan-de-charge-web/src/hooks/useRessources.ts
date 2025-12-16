'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ressource, RessourceCompetence } from '@/types/affectations'

interface UseRessourcesOptions {
  ressourceId?: string
  site?: string
  actif?: boolean
}

export function useRessources(options: UseRessourcesOptions = {}) {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [competences, setCompetences] = useState<Map<string, RessourceCompetence[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on the client side')
    }
    return createClient()
  }, [])

  const loadRessources = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      let query = supabase
        .from('ressources')
        .select('*')
        .order('nom', { ascending: true })

      if (options.ressourceId) {
        query = query.eq('id', options.ressourceId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.actif !== undefined) {
        query = query.eq('actif', options.actif)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const ressourcesList =
        (data || []).map((item) => ({
          id: item.id,
          nom: item.nom,
          site: item.site,
          type_contrat: item.type_contrat,
          responsable: item.responsable,
          date_debut_contrat: item.date_debut_contrat ? new Date(item.date_debut_contrat) : undefined,
          date_fin_contrat: item.date_fin_contrat ? new Date(item.date_fin_contrat) : undefined,
          actif: item.actif ?? true,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
        })) || []

      setRessources(ressourcesList)

      // Charger les compétences pour toutes les ressources
      if (ressourcesList.length > 0) {
        const ressourceIds = ressourcesList.map((r) => r.id)
        const { data: competencesData, error: competencesError } = await supabase
          .from('ressources_competences')
          .select('*')
          .in('ressource_id', ressourceIds)

        if (competencesError) throw competencesError

        const competencesMap = new Map<string, RessourceCompetence[]>()
        ;(competencesData || []).forEach((comp) => {
          const resId = comp.ressource_id
          if (!competencesMap.has(resId)) {
            competencesMap.set(resId, [])
          }
          competencesMap.get(resId)!.push({
            id: comp.id,
            ressource_id: comp.ressource_id,
            competence: comp.competence,
            niveau: comp.niveau,
            type_comp: comp.type_comp || 'S',
            created_at: new Date(comp.created_at),
          })
        })

        setCompetences(competencesMap)
      }
    } catch (err: any) {
      setError(err)
      console.error('[useRessources] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.ressourceId, options.site, options.actif, getSupabaseClient])

  const saveRessource = useCallback(
    async (ressource: Partial<Ressource> & { nom: string; site: string }) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const ressourceData: any = {
          nom: ressource.nom,
          site: ressource.site,
          type_contrat: ressource.type_contrat,
          responsable: ressource.responsable || null,
          date_debut_contrat: ressource.date_debut_contrat?.toISOString().split('T')[0],
          date_fin_contrat: ressource.date_fin_contrat?.toISOString().split('T')[0],
          actif: ressource.actif ?? true,
          updated_at: new Date().toISOString(),
        }

        if (ressource.id) {
          // Mise à jour
          const { error: updateError } = await supabase
            .from('ressources')
            .update(ressourceData)
            .eq('id', ressource.id)

          if (updateError) throw updateError
        } else {
          // Création
          const { error: insertError } = await supabase.from('ressources').insert(ressourceData)

          if (insertError) throw insertError
        }

        // Recharger la liste
        await loadRessources()
      } catch (err: any) {
        setError(err)
        console.error('[useRessources] Erreur saveRessource:', err)
        throw err
      }
    },
    [getSupabaseClient, loadRessources]
  )

  const deleteRessource = useCallback(
    async (id: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('ressources').delete().eq('id', id)

        if (deleteError) throw deleteError

        // Recharger la liste
        await loadRessources()
      } catch (err: any) {
        setError(err)
        console.error('[useRessources] Erreur deleteRessource:', err)
        throw err
      }
    },
    [getSupabaseClient, loadRessources]
  )

  const saveCompetence = useCallback(
    async (ressourceId: string, competence: string, niveau?: string, typeComp?: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: insertError } = await supabase.from('ressources_competences').insert({
          ressource_id: ressourceId,
          competence,
          niveau,
          type_comp: typeComp || 'S',
        })

        if (insertError) throw insertError

        // Recharger la liste
        await loadRessources()
      } catch (err: any) {
        setError(err)
        console.error('[useRessources] Erreur saveCompetence:', err)
        throw err
      }
    },
    [getSupabaseClient, loadRessources]
  )

  const deleteCompetence = useCallback(
    async (id: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('ressources_competences').delete().eq('id', id)

        if (deleteError) throw deleteError

        // Recharger la liste
        await loadRessources()
      } catch (err: any) {
        setError(err)
        console.error('[useRessources] Erreur deleteCompetence:', err)
        throw err
      }
    },
    [getSupabaseClient, loadRessources]
  )

  useEffect(() => {
    loadRessources()
  }, [loadRessources])

  return {
    ressources,
    competences,
    loading,
    error,
    loadRessources,
    saveRessource,
    deleteRessource,
    saveCompetence,
    deleteCompetence,
  }
}
