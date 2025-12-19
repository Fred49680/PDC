'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Affaire } from '@/types/charge'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseAffairesOptions {
  affaireId?: string
  site?: string
  enableRealtime?: boolean // Option pour activer/désactiver Realtime
}

export function useAffaires(options: UseAffairesOptions = {}) {
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const enableRealtime = options.enableRealtime !== false // Par défaut activé

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
          responsable: item.responsable || undefined,
          compte: item.compte || undefined,
          date_creation: new Date(item.date_creation),
          date_modification: new Date(item.date_modification),
          actif: item.actif ?? true,
          created_by: item.created_by,
          updated_by: item.updated_by,
          // Colonnes calculées automatiquement (remplies lors de l'enregistrement des charges)
          date_debut_demande: item.date_debut_demande ? new Date(item.date_debut_demande) : undefined,
          date_fin_demande: item.date_fin_demande ? new Date(item.date_fin_demande) : undefined,
          total_planifie: item.total_planifie !== null && item.total_planifie !== undefined ? Number(item.total_planifie) : undefined,
        }))
      )
    } catch (err: any) {
      setError(err)
      console.error('[useAffaires] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.affaireId, options.site, getSupabaseClient])

  const saveAffaire = useCallback(
    async (affaire: Partial<Affaire> & { site: string; libelle: string }) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        // Préparer l'affaire_id : convertir les chaînes vides/undefined en null, garder les valeurs valides
        // IMPORTANT : Toujours inclure affaire_id dans affaireData (même si null) pour que Supabase le sauvegarde
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
        // Si undefined ou null, laisser null (mais toujours inclure dans affaireData)
        
        console.log('[useAffaires] saveAffaire - affaire.affaire_id (raw):', affaire.affaire_id, 'type:', typeof affaire.affaire_id)
        console.log('[useAffaires] saveAffaire - affaireIdValue (processed):', affaireIdValue, 'type:', typeof affaireIdValue)
        
        // IMPORTANT : Toujours inclure affaire_id dans affaireData, même si null
        // Supabase ignore les champs undefined, donc on force null au lieu de undefined
        // Normaliser le site en majuscules pour cohérence avec periodes_charge
        const affaireData: any = {
          affaire_id: affaireIdValue, // null ou string, jamais undefined
          site: affaire.site ? affaire.site.toUpperCase().trim() : null,
          libelle: affaire.libelle,
          tranche: affaire.tranche && affaire.tranche.trim() !== '' ? affaire.tranche.trim() : null,
          statut: affaire.statut || 'Ouverte',
          budget_heures: affaire.budget_heures !== undefined && affaire.budget_heures !== null ? Number(affaire.budget_heures) : null,
          raf_heures: affaire.raf_heures !== undefined && affaire.raf_heures !== null ? Number(affaire.raf_heures) : null,
          date_maj_raf: affaire.date_maj_raf ? new Date(affaire.date_maj_raf).toISOString().split('T')[0] : null,
          responsable: affaire.responsable && affaire.responsable.trim() !== '' ? affaire.responsable.trim() : null,
          compte: affaire.compte && affaire.compte.trim() !== '' ? affaire.compte.trim() : null,
          actif: affaire.actif ?? true,
          date_modification: new Date().toISOString(),
        }
        
        // Vérifier explicitement que affaire_id est bien inclus
        if (!('affaire_id' in affaireData)) {
          console.error('[useAffaires] saveAffaire - ERREUR: affaire_id manquant dans affaireData!')
          affaireData.affaire_id = affaireIdValue // Forcer l'ajout
        }
        
        console.log('[useAffaires] saveAffaire - affaireData complet:', JSON.stringify(affaireData, null, 2))
        console.log('[useAffaires] saveAffaire - affaireData.affaire_id explicite:', affaireData.affaire_id, 'type:', typeof affaireData.affaire_id)
        
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

  // Abonnement Realtime pour les mises à jour automatiques
  useEffect(() => {
    if (!enableRealtime) return

    const supabase = getSupabaseClient()
    const channelName = `affaires-changes-${Date.now()}-${Math.random()}`
    
    // Construire le filtre pour Realtime
    let filter = ''
    if (options.affaireId) {
      filter = `affaire_id=eq.${options.affaireId}`
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
          table: 'affaires',
          filter: filter || undefined,
        },
        (payload) => {
          console.log('[useAffaires] Changement Realtime:', payload.eventType)
          
          // Mise à jour optimiste de l'état local
          if (payload.eventType === 'INSERT' && payload.new) {
            const newAffaire = payload.new as any
            setAffaires((prev) => {
              // Vérifier si l'affaire existe déjà
              const exists = prev.some((a) => a.id === newAffaire.id)
              if (exists) return prev
              
              // Ajouter la nouvelle affaire avec transformation
              const transformed: Affaire = {
                id: newAffaire.id,
                affaire_id: newAffaire.affaire_id || null,
                site: newAffaire.site,
                libelle: newAffaire.libelle,
                tranche: newAffaire.tranche || undefined,
                statut: newAffaire.statut || 'Ouverte',
                budget_heures: newAffaire.budget_heures ? Number(newAffaire.budget_heures) : undefined,
                raf_heures: newAffaire.raf_heures ? Number(newAffaire.raf_heures) : undefined,
                date_maj_raf: newAffaire.date_maj_raf ? new Date(newAffaire.date_maj_raf) : undefined,
                responsable: newAffaire.responsable || undefined,
                compte: newAffaire.compte || undefined,
                date_creation: new Date(newAffaire.date_creation),
                date_modification: new Date(newAffaire.date_modification),
                actif: newAffaire.actif ?? true,
                created_by: newAffaire.created_by,
                updated_by: newAffaire.updated_by,
                date_debut_demande: newAffaire.date_debut_demande ? new Date(newAffaire.date_debut_demande) : undefined,
                date_fin_demande: newAffaire.date_fin_demande ? new Date(newAffaire.date_fin_demande) : undefined,
                total_planifie: newAffaire.total_planifie !== null && newAffaire.total_planifie !== undefined ? Number(newAffaire.total_planifie) : undefined,
              }
              return [...prev, transformed].sort((a, b) => {
                const aId = a.affaire_id || ''
                const bId = b.affaire_id || ''
                return aId.localeCompare(bId)
              })
            })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedAffaire = payload.new as any
            setAffaires((prev) =>
              prev.map((a) =>
                a.id === updatedAffaire.id
                  ? {
                      ...a,
                      affaire_id: updatedAffaire.affaire_id || null,
                      site: updatedAffaire.site,
                      libelle: updatedAffaire.libelle,
                      tranche: updatedAffaire.tranche || undefined,
                      statut: updatedAffaire.statut || 'Ouverte',
                      budget_heures: updatedAffaire.budget_heures ? Number(updatedAffaire.budget_heures) : undefined,
                      raf_heures: updatedAffaire.raf_heures ? Number(updatedAffaire.raf_heures) : undefined,
                      date_maj_raf: updatedAffaire.date_maj_raf ? new Date(updatedAffaire.date_maj_raf) : undefined,
                      responsable: updatedAffaire.responsable || undefined,
                      compte: updatedAffaire.compte || undefined,
                      date_modification: new Date(updatedAffaire.date_modification),
                      actif: updatedAffaire.actif ?? true,
                      updated_by: updatedAffaire.updated_by,
                      date_debut_demande: updatedAffaire.date_debut_demande ? new Date(updatedAffaire.date_debut_demande) : undefined,
                      date_fin_demande: updatedAffaire.date_fin_demande ? new Date(updatedAffaire.date_fin_demande) : undefined,
                      total_planifie: updatedAffaire.total_planifie !== null && updatedAffaire.total_planifie !== undefined ? Number(updatedAffaire.total_planifie) : undefined,
                    }
                  : a
              )
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as any).id
            setAffaires((prev) => prev.filter((a) => a.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useAffaires] Abonnement Realtime activé')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useAffaires] Erreur abonnement Realtime')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, options.affaireId, options.site, getSupabaseClient])

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
