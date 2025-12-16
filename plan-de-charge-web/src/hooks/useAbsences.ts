'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Absence } from '@/types/absences'

interface UseAbsencesOptions {
  ressourceId?: string
  site?: string
  dateDebut?: Date
  dateFin?: Date
}

export function useAbsences(options: UseAbsencesOptions = {}) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const loadAbsences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('absences')
        .select('*')

      if (options.ressourceId) {
        query = query.eq('ressource_id', options.ressourceId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.dateDebut) {
        query = query.gte('date_fin', options.dateDebut.toISOString().split('T')[0])
      }

      if (options.dateFin) {
        query = query.lte('date_debut', options.dateFin.toISOString().split('T')[0])
      }

      const { data, error: queryError } = await query
        .order('date_debut', { ascending: true })

      if (queryError) throw queryError

      setAbsences((data || []) as Absence[])
    } catch (err) {
      setError(err as Error)
      console.error('[useAbsences] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options, supabase])

  useEffect(() => {
    loadAbsences()
  }, [loadAbsences])

  const saveAbsence = useCallback(async (absence: Partial<Absence>) => {
    try {
      setError(null)

      const { data, error: upsertError } = await supabase
        .from('absences')
        .upsert(absence)
        .select()
        .single()

      if (upsertError) throw upsertError

      // Recharger les absences
      await loadAbsences()

      return data as Absence
    } catch (err) {
      setError(err as Error)
      console.error('[useAbsences] Erreur saveAbsence:', err)
      throw err
    }
  }, [supabase, loadAbsences])

  const deleteAbsence = useCallback(async (absenceId: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('absences')
        .delete()
        .eq('id', absenceId)

      if (deleteError) throw deleteError

      // Recharger les absences
      await loadAbsences()
    } catch (err) {
      setError(err as Error)
      console.error('[useAbsences] Erreur deleteAbsence:', err)
      throw err
    }
  }, [supabase, loadAbsences])

  return {
    absences,
    loading,
    error,
    saveAbsence,
    deleteAbsence,
    refresh: loadAbsences,
  }
}
