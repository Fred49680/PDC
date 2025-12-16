'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/types/sites'

interface UseSitesOptions {
  region?: string
  centreOuest?: string
  actif?: boolean
}

export function useSites(options: UseSitesOptions = {}) {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on the client side')
    }
    return createClient()
  }, [])

  const loadSites = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      let query = supabase
        .from('sites')
        .select('*')
        .order('site', { ascending: true })

      if (options.region) {
        query = query.eq('region', options.region)
      }

      if (options.centreOuest) {
        query = query.eq('centre_ouest', options.centreOuest)
      }

      if (options.actif !== undefined) {
        query = query.eq('actif', options.actif)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setSites(
        (data || []).map((item) => ({
          id: item.id,
          site: item.site,
          site_key: item.site_key,
          site_map: item.site_map,
          region: item.region,
          centre_ouest: item.centre_ouest,
          actif: item.actif ?? true,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at),
        }))
      )
    } catch (err: any) {
      setError(err)
      console.error('[useSites] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.region, options.centreOuest, options.actif, getSupabaseClient])

  const saveSite = useCallback(
    async (site: Partial<Site> & { site: string; site_key: string; site_map: string }) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const siteData: any = {
          site: site.site,
          site_key: site.site_key,
          site_map: site.site_map,
          region: site.region || null,
          centre_ouest: site.centre_ouest || null,
          actif: site.actif ?? true,
          updated_at: new Date().toISOString(),
        }

        if (site.id) {
          // Mise à jour
          const { error: updateError } = await supabase.from('sites').update(siteData).eq('id', site.id)

          if (updateError) throw updateError
        } else {
          // Création
          const { error: insertError } = await supabase.from('sites').insert(siteData)

          if (insertError) throw insertError
        }

        // Recharger la liste
        await loadSites()
      } catch (err: any) {
        setError(err)
        console.error('[useSites] Erreur saveSite:', err)
        throw err
      }
    },
    [getSupabaseClient, loadSites]
  )

  const deleteSite = useCallback(
    async (id: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('sites').delete().eq('id', id)

        if (deleteError) throw deleteError

        // Recharger la liste
        await loadSites()
      } catch (err: any) {
        setError(err)
        console.error('[useSites] Erreur deleteSite:', err)
        throw err
      }
    },
    [getSupabaseClient, loadSites]
  )

  const initializeDefaultSites = useCallback(async () => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      // Vérifier si des sites existent déjà
      const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true })

      if (count && count > 0) {
        console.log('[useSites] Des sites existent déjà, initialisation ignorée')
        return
      }

      // Liste des sites par défaut (basée sur la requête PowerQuery)
      const defaultSites = [
        // Sud Ouest
        { site: 'Blayais', site_key: 'BLAYAIS', site_map: 'BLA', region: 'Sud Ouest', centre_ouest: 'Centre Ouest' },
        { site: 'Golfech', site_key: 'GOLFECH', site_map: 'GOL', region: 'Sud Ouest', centre_ouest: 'Centre Ouest' },
        // Rhône-Alpes / Val de Rhône
        { site: 'Bugey', site_key: 'BUGEY', site_map: 'BUG', region: 'Val de Rhône', centre_ouest: 'Centre Est' },
        { site: 'Cruas', site_key: 'CRUAS', site_map: 'CRU', region: 'Val de Rhône', centre_ouest: 'Centre Est' },
        { site: 'Tricastin', site_key: 'TRICASTIN', site_map: 'TRI', region: 'Val de Rhône', centre_ouest: 'Centre Est' },
        { site: 'Saint Alban', site_key: 'SAINT ALBAN', site_map: 'SAL', region: 'Val de Rhône', centre_ouest: 'Centre Est' },
        // Centre-Ouest
        { site: 'Civaux', site_key: 'CIVAUX', site_map: 'CIV', region: 'Sud Ouest', centre_ouest: 'Centre Ouest' },
        // Val de Loire
        { site: 'Chinon', site_key: 'CHINON', site_map: 'CHI', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Dampierre', site_key: 'DAMPIERRE', site_map: 'DAM', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Belleville', site_key: 'BELLEVILLE', site_map: 'BEL', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Saint-Laurent', site_key: 'SAINT-LAURENT', site_map: 'SLB', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Autre Site', site_key: 'AUTRE SITE', site_map: 'ASI', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Savigny', site_key: 'SAVIGNY', site_map: 'SVG', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        { site: 'Creys-Malville', site_key: 'CREYS-MALVILLE', site_map: 'CRE', region: 'Val de Loire', centre_ouest: 'Centre Ouest' },
        // Manche / Normandie
        { site: 'Flamanville', site_key: 'FLAMANVILLE', site_map: 'FLA', region: 'Manche', centre_ouest: 'Nord Ouest' },
        { site: 'Penly', site_key: 'PENLY', site_map: 'PEN', region: 'Pays de Caux', centre_ouest: 'Nord Ouest' },
        { site: 'Paluel', site_key: 'PALUEL', site_map: 'PAL', region: 'Pays de Caux', centre_ouest: 'Nord Ouest' },
        // Nord
        { site: 'Gravelines', site_key: 'GRAVELINES', site_map: 'GRA', region: 'Pays de Caux', centre_ouest: 'Nord Ouest' },
        // Est
        { site: 'Cattenom', site_key: 'CATTENOM', site_map: 'CAT', region: 'Nord Est', centre_ouest: 'Centre Est' },
        { site: 'Fessenheim', site_key: 'FESSENHEIM', site_map: 'FES', region: 'Nord Est', centre_ouest: 'Centre Est' },
        // Champagne
        { site: 'Nogent', site_key: 'NOGENT', site_map: 'NOG', region: 'Nord Est', centre_ouest: 'Centre Est' },
      ]

      const { error: insertError } = await supabase.from('sites').insert(
        defaultSites.map((s) => ({
          ...s,
          actif: true,
        }))
      )

      if (insertError) throw insertError

      // Recharger la liste
      await loadSites()
    } catch (err: any) {
      setError(err)
      console.error('[useSites] Erreur initializeDefaultSites:', err)
      throw err
    }
  }, [getSupabaseClient, loadSites])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  return {
    sites,
    loading,
    error,
    loadSites,
    saveSite,
    deleteSite,
    initializeDefaultSites,
  }
}
