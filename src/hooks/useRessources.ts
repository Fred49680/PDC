'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ressource, RessourceCompetence } from '@/types/affectations'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRessourcesOptions {
  ressourceId?: string
  site?: string
  actif?: boolean
  type_contrat?: string
  enableRealtime?: boolean // Option pour activer/désactiver Realtime
  competences?: string[] // Option pour filtrer par compétences (optimisation)
}

export function useRessources(options: UseRessourcesOptions = {}) {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [competences, setCompetences] = useState<Map<string, RessourceCompetence[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const competencesChannelRef = useRef<RealtimeChannel | null>(null)
  const loadRessourcesRef = useRef<() => Promise<void>>(() => Promise.resolve())
  
  // Stabiliser les valeurs d'options pour éviter les re-créations inutiles
  const ressourceId = useMemo(() => options.ressourceId, [options.ressourceId])
  const site = useMemo(() => options.site, [options.site])
  const actif = useMemo(() => options.actif, [options.actif])
  const type_contrat = useMemo(() => options.type_contrat, [options.type_contrat])
  // Stabiliser le tableau de compétences - les callers doivent passer des tableaux stables (useMemo)
  const competencesList = useMemo(() => options.competences, [options.competences])
  const enableRealtime = useMemo(() => options.enableRealtime !== false, [options.enableRealtime])

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

      if (ressourceId) {
        query = query.eq('id', ressourceId)
      }

      if (site) {
        query = query.eq('site', site)
      }

      if (actif !== undefined) {
        query = query.eq('actif', actif)
      }

      if (type_contrat) {
        // Pour Intérim, filtrer par ETT (c'est la valeur stockée en base)
        if (type_contrat === 'Intérim') {
          query = query.eq('type_contrat', 'ETT')
        } else {
          query = query.eq('type_contrat', type_contrat)
        }
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
          adresse_domicile: item.adresse_domicile || undefined,
          date_debut_contrat: item.date_debut_contrat ? new Date(item.date_debut_contrat) : undefined,
          date_fin_contrat: item.date_fin_contrat ? new Date(item.date_fin_contrat) : undefined,
          actif: item.actif ?? true,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
        })) || []

      setRessources(ressourcesList)

      // Charger les compétences pour toutes les ressources
      // Si des compétences sont spécifiées, filtrer pour optimiser
      if (ressourcesList.length > 0) {
        const ressourceIds = ressourcesList.map((r) => r.id)
        let competencesQuery = supabase
          .from('ressources_competences')
          .select('*')
          .in('ressource_id', ressourceIds)
        
        // Filtrer par compétences si spécifiées (optimisation)
        if (competencesList && competencesList.length > 0) {
          competencesQuery = competencesQuery.in('competence', competencesList)
        }
        
        const { data: competencesData, error: competencesError } = await competencesQuery

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
  }, [ressourceId, site, actif, type_contrat, competencesList, getSupabaseClient])

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
          adresse_domicile: ressource.adresse_domicile || null,
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

  // Sauvegarder toutes les compétences d'une ressource en une fois (remplace les existantes)
  const saveCompetencesBatch = useCallback(
    async (ressourceId: string, competences: Array<{ competence: string; type_comp: string; niveau?: string }>) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        // Vérifier qu'il n'y a qu'une seule compétence principale
        const principales = competences.filter(c => c.type_comp === 'P')
        if (principales.length > 1) {
          throw new Error('Une ressource ne peut avoir qu\'une seule compétence principale')
        }

        // Supprimer toutes les compétences existantes pour cette ressource
        const { error: deleteError } = await supabase
          .from('ressources_competences')
          .delete()
          .eq('ressource_id', ressourceId)

        if (deleteError) throw deleteError

        // Insérer les nouvelles compétences si la liste n'est pas vide
        if (competences.length > 0) {
          const competencesToInsert = competences.map(c => ({
            ressource_id: ressourceId,
            competence: c.competence,
            type_comp: c.type_comp || 'S',
            niveau: c.niveau || null,
          }))

          const { error: insertError } = await supabase
            .from('ressources_competences')
            .insert(competencesToInsert)

          if (insertError) throw insertError
        }

        // Recharger la liste
        await loadRessources()
      } catch (err: any) {
        setError(err)
        console.error('[useRessources] Erreur saveCompetencesBatch:', err)
        throw err
      }
    },
    [getSupabaseClient, loadRessources]
  )

  // Mettre à jour la référence quand loadRessources change
  useEffect(() => {
    loadRessourcesRef.current = loadRessources
  }, [loadRessources])

  // Abonnement Realtime pour les ressources
  useEffect(() => {
    if (!enableRealtime) {
      // Nettoyer les channels existants si Realtime est désactivé
      if (channelRef.current) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const supabase = getSupabaseClient()
    
    // Nettoyer le channel existant avant d'en créer un nouveau
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    
    const channelName = `ressources-changes-${Date.now()}-${Math.random()}`
    
    // Construire le filtre pour Realtime
    let filter = ''
    if (ressourceId) {
      filter = `id=eq.${ressourceId}`
    }
    if (site) {
      filter = filter ? `${filter}&site=eq.${site}` : `site=eq.${site}`
    }
    if (actif !== undefined) {
      filter = filter ? `${filter}&actif=eq.${actif}` : `actif=eq.${actif}`
    }
    if (type_contrat) {
      // Pour Intérim, on ne peut pas filtrer en Realtime avec IN, donc on laisse vide (rechargement complet)
      if (type_contrat !== 'Intérim') {
        filter = filter ? `${filter}&type_contrat=eq.${type_contrat}` : `type_contrat=eq.${type_contrat}`
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ressources',
          filter: filter || undefined,
        },
        () => {
          console.log('[useRessources] Changement Realtime détecté - rechargement...')
          
          // Utiliser la référence pour éviter les dépendances circulaires
          loadRessourcesRef.current()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useRessources] Abonnement Realtime activé')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, ressourceId, site, actif, type_contrat, getSupabaseClient])

  // Abonnement Realtime pour les compétences
  useEffect(() => {
    if (!enableRealtime) {
      // Nettoyer les channels existants si Realtime est désactivé
      if (competencesChannelRef.current) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(competencesChannelRef.current)
        competencesChannelRef.current = null
      }
      return
    }

    const supabase = getSupabaseClient()
    
    // Nettoyer le channel existant avant d'en créer un nouveau
    if (competencesChannelRef.current) {
      supabase.removeChannel(competencesChannelRef.current)
      competencesChannelRef.current = null
    }
    
    const channelName = `ressources-competences-changes-${Date.now()}-${Math.random()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ressources_competences',
        },
        () => {
          console.log('[useRessources] Changement Realtime compétences détecté - rechargement...')
          
          // Utiliser la référence pour éviter les dépendances circulaires
          loadRessourcesRef.current()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useRessources] Abonnement Realtime compétences activé')
        }
      })

    competencesChannelRef.current = channel

    return () => {
      if (competencesChannelRef.current) {
        supabase.removeChannel(competencesChannelRef.current)
        competencesChannelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRealtime, getSupabaseClient])

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
    saveCompetencesBatch,
  }
}
