'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Absence } from '@/types/absences'
import { removeConflictingAffectationsForAbsence } from '@/utils/removeConflictingAffectations'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseAbsencesOptions {
  ressourceId?: string
  site?: string
  dateDebut?: Date
  dateFin?: Date
  enableRealtime?: boolean // Option pour activer/désactiver Realtime
}

export function useAbsences(options: UseAbsencesOptions = {}) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const enableRealtime = options.enableRealtime !== false // Par défaut activé

  // Créer le client de manière lazy (seulement côté client) - mémorisé avec useCallback
  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  const loadAbsences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

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
  }, [options.ressourceId, options.site, options.dateDebut, options.dateFin, getSupabaseClient])

  // Abonnement Realtime pour les absences
  useEffect(() => {
    if (!enableRealtime) return

    const supabase = getSupabaseClient()
    const channelName = `absences-changes-${Date.now()}-${Math.random()}`
    
    // Construire le filtre pour Realtime
    let filter = ''
    if (options.ressourceId) {
      filter = `ressource_id=eq.${options.ressourceId}`
    }
    if (options.site) {
      filter = filter ? `${filter}&site=eq.${options.site}` : `site=eq.${options.site}`
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'absences',
          filter: filter || undefined,
        },
        (payload) => {
          console.log('[useAbsences] Changement Realtime:', payload.eventType)
          
          // Mise à jour optimiste de l'état local
          if (payload.eventType === 'INSERT' && payload.new) {
            const newAbsence = payload.new as Absence
            setAbsences((prev) => {
              const exists = prev.some((a) => a.id === newAbsence.id)
              if (exists) return prev
              return [...prev, newAbsence].sort((a, b) => 
                new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
              )
            })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedAbsence = payload.new as Absence
            setAbsences((prev) =>
              prev.map((a) => (a.id === updatedAbsence.id ? updatedAbsence : a))
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as { id: string }).id
            setAbsences((prev) => prev.filter((a) => a.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useAbsences] Abonnement Realtime activé')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, options.ressourceId, options.site, getSupabaseClient])

  useEffect(() => {
    loadAbsences()
  }, [loadAbsences])

  const saveAbsence = useCallback(async (absence: Partial<Absence>) => {
    try {
      setError(null)

      // Validation des champs requis
      if (!absence.ressource_id || absence.ressource_id.trim() === '') {
        throw new Error('L\'ID de la ressource est requis')
      }
      
      if (!absence.site || absence.site.trim() === '') {
        throw new Error('Le site est requis')
      }
      
      if (!absence.date_debut || !absence.date_fin) {
        throw new Error('Les dates de début et de fin sont requises')
      }
      
      if (!absence.type || absence.type.trim() === '') {
        throw new Error('Le type d\'absence est requis')
      }

      const supabase = getSupabaseClient()

      // Préparer les données pour Supabase
      // S'assurer que les dates sont au format ISO string (YYYY-MM-DD)
      let dateDebut = absence.date_debut
      let dateFin = absence.date_fin
      
      // Si ce sont des objets Date, les convertir en ISO string
      if (dateDebut instanceof Date) {
        dateDebut = dateDebut.toISOString().split('T')[0] // Extraire seulement la date (YYYY-MM-DD)
      } else if (typeof dateDebut === 'string') {
        // S'assurer que c'est bien au format YYYY-MM-DD
        dateDebut = dateDebut.trim()
      }
      
      if (dateFin instanceof Date) {
        dateFin = dateFin.toISOString().split('T')[0] // Extraire seulement la date (YYYY-MM-DD)
      } else if (typeof dateFin === 'string') {
        // S'assurer que c'est bien au format YYYY-MM-DD
        dateFin = dateFin.trim()
      }
      
      const absenceData: Partial<Absence> & {
        ressource_id: string
        site: string
        date_debut: string
        date_fin: string
        type: string
      } = {
        ressource_id: absence.ressource_id.trim(),
        site: absence.site.trim(),
        date_debut: dateDebut, // Format ISO string (YYYY-MM-DD)
        date_fin: dateFin, // Format ISO string (YYYY-MM-DD)
        type: absence.type.trim(),
      }

      // Champs optionnels (convertir chaînes vides en null)
      if (absence.competence && absence.competence.trim() !== '') {
        absenceData.competence = absence.competence.trim()
      } else {
        absenceData.competence = null
      }
      
      if (absence.commentaire && absence.commentaire.trim() !== '') {
        absenceData.commentaire = absence.commentaire.trim()
      } else {
        absenceData.commentaire = null
      }
      
      if (absence.validation_saisie) {
        absenceData.validation_saisie = absence.validation_saisie
      } else {
        absenceData.validation_saisie = 'Non'
      }
      
      if (absence.date_saisie) {
        // Convertir en ISO string si c'est un objet Date
        absenceData.date_saisie = typeof absence.date_saisie === 'string' 
          ? absence.date_saisie 
          : new Date(absence.date_saisie).toISOString()
      } else {
        absenceData.date_saisie = new Date().toISOString()
      }

      // Statut (par défaut 'Actif' si non fourni)
      if (absence.statut) {
        absenceData.statut = absence.statut
      } else {
        absenceData.statut = 'Actif'
      }

      // Type d'arrêt maladie (seulement si c'est un arrêt maladie)
      const isArretMaladie = absence.type && (
        absence.type.toLowerCase().includes('maladie') || 
        absence.type.toLowerCase().includes('arrêt')
      )
      
      if (isArretMaladie && absence.type_arret_maladie) {
        absenceData.type_arret_maladie = absence.type_arret_maladie
      } else {
        absenceData.type_arret_maladie = null
      }

      // Si c'est une modification, inclure l'id
      if (absence.id && absence.id.trim() !== '') {
        absenceData.id = absence.id
      }
      
      console.log('[useAbsences] Données à envoyer:', JSON.stringify(absenceData, null, 2))

      let data: Absence | null = null
      let error: Error | null = null

      // Si c'est une modification (avec id), utiliser update
      if (absenceData.id) {
        const { id, ...updateData } = absenceData
        const result = await supabase
          .from('absences')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
        data = result.data as Absence | null
        error = result.error ? new Error(result.error.message) : null
      } else {
        // Sinon, utiliser insert pour une nouvelle absence
        const result = await supabase
          .from('absences')
          .insert(absenceData)
          .select()
          .single()
        data = result.data as Absence | null
        error = result.error ? new Error(result.error.message) : null
      }

      if (error) {
        console.error('[useAbsences] Erreur Supabase:', error.message)
        throw error
      }

      // Recharger les absences
      await loadAbsences()

      // Retirer automatiquement les affectations en conflit avec cette absence
      if (!absenceData.id) {
        // Seulement pour les nouvelles absences (pas les modifications)
        const dateDebutAbsence = absence.date_debut instanceof Date 
          ? absence.date_debut 
          : new Date(absence.date_debut)
        const dateFinAbsence = absence.date_fin instanceof Date 
          ? absence.date_fin 
          : new Date(absence.date_fin)

        try {
          const { removedCount, alertes } = await removeConflictingAffectationsForAbsence(
            absence.ressource_id.trim(),
            dateDebutAbsence,
            dateFinAbsence
          )

          if (removedCount > 0) {
            console.log(`[useAbsences] ${removedCount} affectation(s) retirée(s) automatiquement pour conflit avec absence`)
            console.log(`[useAbsences] ${alertes.length} alerte(s) créée(s)`)
          }
        } catch (err) {
          console.error('[useAbsences] Erreur lors du retrait automatique des affectations:', err)
          // Ne pas bloquer l'enregistrement de l'absence si le retrait échoue
        }
      }

      if (!data) {
        throw new Error('Aucune donnée retournée par Supabase')
      }
      return data
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error('[useAbsences] Erreur saveAbsence:', err)
      throw error
    }
  }, [getSupabaseClient, loadAbsences])

  const deleteAbsence = useCallback(async (absenceId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

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
  }, [getSupabaseClient, loadAbsences])

  return {
    absences,
    loading,
    error,
    saveAbsence,
    deleteAbsence,
    refresh: loadAbsences,
  }
}
