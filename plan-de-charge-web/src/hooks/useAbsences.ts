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
      
      const absenceData: any = {
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

      let data: any
      let error: any

      // Si c'est une modification (avec id), utiliser update
      if (absenceData.id) {
        const { id, ...updateData } = absenceData
        const result = await supabase
          .from('absences')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // Sinon, utiliser insert pour une nouvelle absence
        const result = await supabase
          .from('absences')
          .insert(absenceData)
          .select()
          .single()
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('[useAbsences] Erreur Supabase complète:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        const errorMsg = error.message || error.details || 'Erreur lors de la sauvegarde'
        throw new Error(errorMsg)
      }

      // Recharger les absences
      await loadAbsences()

      return data as Absence
    } catch (err: any) {
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
