'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Affaire } from '@/types/charge'

interface UseAffairesOptions {
  affaireId?: string
  site?: string
  actif?: boolean
}

export function useAffaires(options: UseAffairesOptions = {}) {
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used on the client side')
    }
    return createClient()
  }, [])

  const loadAffaires = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      let query = supabase
        .from('affaires')
        .select('*')
        .order('affaire_id', { ascending: true })

      if (options.affaireId) {
        query = query.eq('affaire_id', options.affaireId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.actif !== undefined) {
        query = query.eq('actif', options.actif)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setAffaires(
        (data || []).map((item) => ({
          id: item.id,
          affaire_id: item.affaire_id || null, // Peut être NULL
          site: item.site,
          libelle: item.libelle,
          tranche: item.tranche || undefined,
          statut: item.statut || 'Ouverte',
          budget_heures: item.budget_heures ? Number(item.budget_heures) : undefined,
          raf_heures: item.raf_heures ? Number(item.raf_heures) : undefined,
          date_maj_raf: item.date_maj_raf ? new Date(item.date_maj_raf) : undefined,
          date_creation: new Date(item.date_creation),
          date_modification: new Date(item.date_modification),
          actif: item.actif ?? true,
          created_by: item.created_by,
          updated_by: item.updated_by,
          // Colonnes calculées automatiquement (remplies lors de l'enregistrement des charges)
          date_debut_demande: item.date_debut_demande ? new Date(item.date_debut_demande) : undefined,
          date_fin_demande: item.date_fin_demande ? new Date(item.date_fin_demande) : undefined,
          total_planifie: item.total_planifie ? Number(item.total_planifie) : undefined,
        }))
      )
    } catch (err: any) {
      setError(err)
      console.error('[useAffaires] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.affaireId, options.site, options.actif, getSupabaseClient])

  const saveAffaire = useCallback(
    async (affaire: Partial<Affaire> & { site: string; libelle: string }) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        // Préparer l'affaire_id : convertir les chaînes vides/undefined en null, garder les valeurs valides
        let affaireIdValue: string | null = null
        
        // Vérifier si affaire_id existe et n'est pas vide
        if (affaire.affaire_id !== undefined && affaire.affaire_id !== null) {
          const affaireIdStr = String(affaire.affaire_id).trim()
          // Si la chaîne n'est pas vide après trim, l'utiliser
          if (affaireIdStr !== '') {
            affaireIdValue = affaireIdStr
          }
          // Sinon, laisser null (chaîne vide = null)
        }
        // Si undefined ou null, laisser null
        
        console.log('[useAffaires] saveAffaire - affaire.affaire_id (raw):', affaire.affaire_id, 'type:', typeof affaire.affaire_id)
        console.log('[useAffaires] saveAffaire - affaireIdValue (processed):', affaireIdValue, 'type:', typeof affaireIdValue)
        
        const affaireData: any = {
          affaire_id: affaireIdValue, // Peut être NULL si statut ≠ Ouverte/Prévisionnelle ou si vide
          site: affaire.site,
          libelle: affaire.libelle,
          tranche: affaire.tranche && affaire.tranche.trim() !== '' ? affaire.tranche.trim() : null,
          statut: affaire.statut || 'Ouverte',
          budget_heures: affaire.budget_heures !== undefined && affaire.budget_heures !== null ? Number(affaire.budget_heures) : null,
          raf_heures: affaire.raf_heures !== undefined && affaire.raf_heures !== null ? Number(affaire.raf_heures) : null,
          date_maj_raf: affaire.date_maj_raf ? new Date(affaire.date_maj_raf).toISOString().split('T')[0] : null,
          actif: affaire.actif ?? true,
          date_modification: new Date().toISOString(),
        }
        
        console.log('[useAffaires] saveAffaire - affaireData:', JSON.stringify(affaireData, null, 2))

        console.log('[useAffaires] saveAffaire - affaireData complet:', JSON.stringify(affaireData, null, 2))
        
        if (affaire.id) {
          // Mise à jour
          console.log('[useAffaires] saveAffaire - Mise à jour affaire ID:', affaire.id)
          const { data: updateData, error: updateError } = await supabase
            .from('affaires')
            .update(affaireData)
            .eq('id', affaire.id)
            .select()

          if (updateError) {
            console.error('[useAffaires] saveAffaire - Erreur update:', updateError)
            throw updateError
          }
          console.log('[useAffaires] saveAffaire - Update réussi:', updateData)
        } else {
          // Création
          console.log('[useAffaires] saveAffaire - Création nouvelle affaire')
          const { data: insertData, error: insertError } = await supabase
            .from('affaires')
            .insert(affaireData)
            .select()

          if (insertError) {
            console.error('[useAffaires] saveAffaire - Erreur insert:', insertError)
            throw insertError
          }
          console.log('[useAffaires] saveAffaire - Insert réussi:', insertData)
        }

        // Recharger la liste
        await loadAffaires()
      } catch (err: any) {
        // Améliorer le message d'erreur pour les erreurs RLS
        let errorMessage = err.message || 'Erreur lors de l\'enregistrement'
        
        if (err.message && err.message.includes('row-level security')) {
          errorMessage = 'Erreur de sécurité : Les politiques RLS bloquent cette opération. ' +
            'Veuillez exécuter le script SQL MIGRATION_FIX_RLS_AFFAIRES.sql dans Supabase Dashboard.'
        }
        
        const enhancedError = new Error(errorMessage)
        enhancedError.name = err.name || 'Error'
        setError(enhancedError)
        console.error('[useAffaires] Erreur saveAffaire:', err)
        throw enhancedError
      }
    },
    [getSupabaseClient, loadAffaires]
  )

  const deleteAffaire = useCallback(
    async (id: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('affaires').delete().eq('id', id)

        if (deleteError) throw deleteError

        // Recharger la liste
        await loadAffaires()
      } catch (err: any) {
        setError(err)
        console.error('[useAffaires] Erreur deleteAffaire:', err)
        throw err
      }
    },
    [getSupabaseClient, loadAffaires]
  )

  useEffect(() => {
    loadAffaires()
  }, [loadAffaires])

  return {
    affaires,
    loading,
    error,
    loadAffaires,
    saveAffaire,
    deleteAffaire,
  }
}
