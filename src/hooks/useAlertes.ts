'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Alerte {
  id: string
  prise_en_compte?: string // 'Oui' / 'Non'
  courrier_statut?: string // 'A envoyer' / 'Envoyé'
  date_action?: Date
  type_alerte: string
  ressource_id?: string
  affaire_id?: string
  site?: string
  competence?: string
  date_debut?: Date
  date_fin?: Date
  action: string
  created_by?: string
  created_at: Date
}

interface UseAlertesOptions {
  typeAlerte?: string
  ressourceId?: string
  affaireId?: string
  site?: string
  priseEnCompte?: string
}

export function useAlertes(options: UseAlertesOptions = {}) {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  const loadAlertes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      let query = supabase
        .from('alertes')
        .select('*')

      if (options.typeAlerte) {
        query = query.eq('type_alerte', options.typeAlerte)
      }

      if (options.ressourceId) {
        query = query.eq('ressource_id', options.ressourceId)
      }

      if (options.affaireId) {
        query = query.eq('affaire_id', options.affaireId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.priseEnCompte) {
        query = query.eq('prise_en_compte', options.priseEnCompte)
      }

      const { data, error: queryError } = await query
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      // Convertir les dates
      const alertesAvecDates = (data || []).map((a: any) => ({
        ...a,
        date_action: a.date_action ? new Date(a.date_action) : undefined,
        date_debut: a.date_debut ? new Date(a.date_debut) : undefined,
        date_fin: a.date_fin ? new Date(a.date_fin) : undefined,
        created_at: a.created_at ? new Date(a.created_at) : new Date(),
      })) as Alerte[]

      setAlertes(alertesAvecDates)
    } catch (err) {
      setError(err as Error)
      console.error('[useAlertes] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.typeAlerte, options.ressourceId, options.affaireId, options.site, options.priseEnCompte, getSupabaseClient])

  useEffect(() => {
    loadAlertes()
  }, [loadAlertes])

  const createAlerte = useCallback(async (alerte: Partial<Alerte>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const alerteData: any = {
        type_alerte: alerte.type_alerte,
        action: alerte.action || '',
        date_action: new Date().toISOString(),
        prise_en_compte: alerte.prise_en_compte || 'Non',
        courrier_statut: alerte.courrier_statut || null,
      }

      if (alerte.ressource_id) {
        alerteData.ressource_id = alerte.ressource_id
      }

      if (alerte.affaire_id) {
        alerteData.affaire_id = alerte.affaire_id
      }

      if (alerte.site) {
        alerteData.site = alerte.site
      }

      if (alerte.competence) {
        alerteData.competence = alerte.competence
      }

      if (alerte.date_debut) {
        alerteData.date_debut = alerte.date_debut instanceof Date 
          ? alerte.date_debut.toISOString().split('T')[0]
          : alerte.date_debut
      }

      if (alerte.date_fin) {
        alerteData.date_fin = alerte.date_fin instanceof Date 
          ? alerte.date_fin.toISOString().split('T')[0]
          : alerte.date_fin
      }

      const { data, error: insertError } = await supabase
        .from('alertes')
        .insert(alerteData)
        .select()
        .single()

      if (insertError) throw insertError

      // Recharger les alertes
      await loadAlertes()

      return data as Alerte
    } catch (err) {
      setError(err as Error)
      console.error('[useAlertes] Erreur createAlerte:', err)
      throw err
    }
  }, [getSupabaseClient, loadAlertes])

  const updateAlerte = useCallback(async (alerteId: string, updates: Partial<Alerte>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const updateData: any = {}

      if (updates.prise_en_compte !== undefined) {
        updateData.prise_en_compte = updates.prise_en_compte
      }

      if (updates.courrier_statut !== undefined) {
        updateData.courrier_statut = updates.courrier_statut
      }

      const { data, error: updateError } = await supabase
        .from('alertes')
        .update(updateData)
        .eq('id', alerteId)
        .select()
        .single()

      if (updateError) throw updateError

      // Recharger les alertes
      await loadAlertes()

      return data as Alerte
    } catch (err) {
      setError(err as Error)
      console.error('[useAlertes] Erreur updateAlerte:', err)
      throw err
    }
  }, [getSupabaseClient, loadAlertes])

  const deleteAlerte = useCallback(async (alerteId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('alertes')
        .delete()
        .eq('id', alerteId)

      if (deleteError) throw deleteError

      // Recharger les alertes
      await loadAlertes()
    } catch (err) {
      setError(err as Error)
      console.error('[useAlertes] Erreur deleteAlerte:', err)
      throw err
    }
  }, [getSupabaseClient, loadAlertes])

  return {
    alertes,
    loading,
    error,
    createAlerte,
    updateAlerte,
    deleteAlerte,
    refresh: loadAlertes,
  }
}
