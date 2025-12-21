'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeDateToUTC, isBusinessDay } from '@/utils/calendar'
import { addDays, isSameDay } from 'date-fns'
import type { PeriodeCharge } from '@/types/charge'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseChargeOptions {
  affaireId: string
  site: string
  autoRefresh?: boolean // Option pour désactiver le refresh automatique
  enableRealtime?: boolean // Option pour activer/désactiver Realtime
}

export function useCharge({ affaireId, site, autoRefresh = true, enableRealtime = true }: UseChargeOptions) {
  const [periodes, setPeriodes] = useState<PeriodeCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Créer le client de manière lazy (seulement côté client)
  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  const loadPeriodes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire depuis affaire_id
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) {
        console.error('[useCharge] Erreur recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${siteNormalized}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)
      }

      const { data, error: queryError } = await supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', siteNormalized)
        .order('date_debut', { ascending: true })

      if (queryError) throw queryError

      // Convertir les dates de string ISO en Date
      const periodesAvecDates = (data || []).map((p: any) => ({
        ...p,
        date_debut: p.date_debut ? new Date(p.date_debut) : new Date(),
        date_fin: p.date_fin ? new Date(p.date_fin) : new Date(),
        force_weekend_ferie: p.force_weekend_ferie === true, // Convertir en boolean explicite
        created_at: p.created_at ? new Date(p.created_at) : new Date(),
        updated_at: p.updated_at ? new Date(p.updated_at) : new Date(),
      })) as PeriodeCharge[]

      setPeriodes(periodesAvecDates)
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [affaireId, site])

  // Abonnement Realtime pour les périodes de charge
  useEffect(() => {
    if (!enableRealtime || !affaireId || !site) return

    const supabase = getSupabaseClient()
    
      // Récupérer l'ID de l'affaire pour le filtre Realtime
      let affaireDbId: string | null = null
      
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      
      const setupRealtime = async () => {
        try {
          const { data: affaireData } = await supabase
            .from('affaires')
            .select('id')
            .eq('affaire_id', affaireId)
            .eq('site', siteNormalized)
            .single()
        
        if (!affaireData) return
        
        affaireDbId = affaireData.id
        const channelName = `periodes-charge-${affaireDbId}-${Date.now()}`
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'periodes_charge',
              filter: `affaire_id=eq.${affaireDbId}`,
            },
            (payload) => {
              console.log('[useCharge] Changement Realtime:', payload.eventType)
              
              // Mise à jour optimiste
              if (payload.eventType === 'INSERT' && payload.new) {
                const newPeriode = payload.new as any
                setPeriodes((prev) => {
                  const exists = prev.some((p) => p.id === newPeriode.id)
                  if (exists) return prev
                  const transformed: PeriodeCharge = {
                    ...newPeriode,
                    date_debut: new Date(newPeriode.date_debut),
                    date_fin: new Date(newPeriode.date_fin),
                    force_weekend_ferie: newPeriode.force_weekend_ferie === true,
                    created_at: new Date(newPeriode.created_at),
                    updated_at: new Date(newPeriode.updated_at),
                  }
                  return [...prev, transformed].sort((a, b) => 
                    new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
                  )
                })
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                const updatedPeriode = payload.new as any
                setPeriodes((prev) =>
                  prev.map((p) =>
                    p.id === updatedPeriode.id
                      ? {
                          ...p,
                          ...updatedPeriode,
                          date_debut: new Date(updatedPeriode.date_debut),
                          date_fin: new Date(updatedPeriode.date_fin),
                          force_weekend_ferie: updatedPeriode.force_weekend_ferie === true,
                          updated_at: new Date(updatedPeriode.updated_at),
                        }
                      : p
                  )
                )
              } else if (payload.eventType === 'DELETE' && payload.old) {
                const deletedId = (payload.old as any).id
                setPeriodes((prev) => prev.filter((p) => p.id !== deletedId))
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[useCharge] Abonnement Realtime activé')
            }
          })

        channelRef.current = channel
      } catch (err) {
        console.error('[useCharge] Erreur setup Realtime:', err)
      }
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, affaireId, site, getSupabaseClient])

  useEffect(() => {
    if (affaireId && site) {
      loadPeriodes()
    }
  }, [affaireId, site, loadPeriodes])

  const savePeriode = useCallback(async (periode: Partial<PeriodeCharge>) => {
    console.log('[useCharge] ========== DEBUT savePeriode ==========')
    console.log('[useCharge] Étape 1 - Données d\'entrée brutes:', JSON.stringify(periode, null, 2))
    
    try {
      setError(null)

      const supabase = getSupabaseClient()
      console.log('[useCharge] Étape 2 - Client Supabase créé')

      // Récupérer l'ID de l'affaire
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      console.log('[useCharge] Étape 3 - Recherche de l\'affaire:', { affaireId, site, siteNormalized })
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) {
        console.error('[useCharge] Étape 3 - ERREUR recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${siteNormalized}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        console.error('[useCharge] Étape 3 - Affaire introuvable')
        throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)
      }
      
      console.log('[useCharge] Étape 3 - Affaire trouvée, ID:', affaireData.id)

      // *** NORMALISER LES DATES À MINUIT UTC pour éviter les problèmes de timezone ***
      // Créer un objet propre en évitant le spread qui peut propager des valeurs invalides
      const periodeData: any = {
        affaire_id: affaireData.id,
        site: siteNormalized,
        competence: periode.competence,
        // Normaliser date_debut et date_fin si elles sont des objets Date
        date_debut: periode.date_debut instanceof Date 
          ? normalizeDateToUTC(periode.date_debut)
          : periode.date_debut,
        date_fin: periode.date_fin instanceof Date
          ? normalizeDateToUTC(periode.date_fin)
          : periode.date_fin,
        nb_ressources: periode.nb_ressources || 0,
        force_weekend_ferie: periode.force_weekend_ferie,
      }
      
      // Ajouter l'ID seulement s'il existe
      if (periode.id) {
        periodeData.id = periode.id
      }
      
      console.log('[useCharge] Étape 4 - Données après normalisation initiale:', JSON.stringify(periodeData, null, 2))
      console.log('[useCharge] Étape 4 - Types:', {
        affaire_id: typeof periodeData.affaire_id,
        site: typeof periodeData.site,
        competence: typeof periodeData.competence,
        date_debut: typeof periodeData.date_debut,
        date_fin: typeof periodeData.date_fin,
        nb_ressources: typeof periodeData.nb_ressources,
        force_weekend_ferie: typeof periodeData.force_weekend_ferie,
        'force_weekend_ferie value': periodeData.force_weekend_ferie,
      })

      // Essayer d'abord un upsert
      let data: any
      let upsertError: any
      
      // S'assurer que les dates sont des strings ISO valides
      const formatDateForDB = (date: Date | string | undefined): string => {
        if (!date) return new Date().toISOString().split('T')[0]
        if (date instanceof Date) {
          return date.toISOString().split('T')[0]
        }
        if (typeof date === 'string') {
          return date.split('T')[0]
        }
        return new Date().toISOString().split('T')[0]
      }
      
      // S'assurer que force_weekend_ferie est toujours un booléen valide
      const normalizeBoolean = (value: any): boolean => {
        console.log('[useCharge] normalizeBoolean - Input:', { value, type: typeof value })
        if (value === true || value === 'true' || value === 1 || value === '1') {
          console.log('[useCharge] normalizeBoolean - Retourne: true')
          return true
        }
        if (value === false || value === 'false' || value === 0 || value === '0') {
          console.log('[useCharge] normalizeBoolean - Retourne: false')
          return false
        }
        // Si undefined, null, ou chaîne vide, retourner false par défaut
        console.log('[useCharge] normalizeBoolean - Valeur invalide, retourne: false (défaut)')
        return false
      }
      
      // Créer un objet propre avec uniquement les champs nécessaires et correctement formatés
      // Cela évite de propager des valeurs invalides via le spread
      // Le site est déjà normalisé dans periodeData.site
      const periodeDataClean: any = {
        affaire_id: periodeData.affaire_id,
        site: periodeData.site, // Déjà normalisé en majuscules
        competence: periodeData.competence,
        date_debut: formatDateForDB(periodeData.date_debut),
        date_fin: formatDateForDB(periodeData.date_fin),
        nb_ressources: periodeData.nb_ressources || 0,
        force_weekend_ferie: normalizeBoolean(periodeData.force_weekend_ferie),
      }
      
      // Ajouter l'ID seulement s'il existe (pour UPDATE)
      if (periodeData.id) {
        periodeDataClean.id = periodeData.id
      }
      
      console.log('[useCharge] Étape 5 - Données nettoyées (periodeDataClean):', JSON.stringify(periodeDataClean, null, 2))
      console.log('[useCharge] Étape 5 - Types après nettoyage:', {
        affaire_id: typeof periodeDataClean.affaire_id,
        site: typeof periodeDataClean.site,
        competence: typeof periodeDataClean.competence,
        date_debut: typeof periodeDataClean.date_debut,
        date_fin: typeof periodeDataClean.date_fin,
        nb_ressources: typeof periodeDataClean.nb_ressources,
        force_weekend_ferie: typeof periodeDataClean.force_weekend_ferie,
        'force_weekend_ferie === true': periodeDataClean.force_weekend_ferie === true,
        'force_weekend_ferie === false': periodeDataClean.force_weekend_ferie === false,
        'force_weekend_ferie value': periodeDataClean.force_weekend_ferie,
      })
      
      // Vérifier et nettoyer toutes les propriétés pour s'assurer qu'il n'y a pas de chaînes vides
      // et forcer le type boolean pour force_weekend_ferie
      Object.keys(periodeDataClean).forEach((key) => {
        const value = periodeDataClean[key]
        // Si c'est force_weekend_ferie, s'assurer que c'est un boolean strict
        if (key === 'force_weekend_ferie') {
          if (value === '' || value === null || value === undefined) {
            console.warn(`[useCharge] Étape 6 - force_weekend_ferie invalide (${value}), remplacement par false`)
            periodeDataClean[key] = false
          } else {
            // Forcer la conversion en boolean strict
            const oldValue = periodeDataClean[key]
            periodeDataClean[key] = Boolean(value)
            if (oldValue !== periodeDataClean[key]) {
              console.log(`[useCharge] Étape 6 - force_weekend_ferie converti: ${oldValue} -> ${periodeDataClean[key]}`)
            }
          }
        }
        // Si c'est un autre boolean et que la valeur est une chaîne vide, la remplacer par false
        else if (typeof value === 'string' && value === '' && key.includes('boolean')) {
          console.warn(`[useCharge] Étape 6 - Chaîne vide détectée pour ${key}, remplacement par false`)
          periodeDataClean[key] = false
        }
      })
      
      // Double vérification : s'assurer que force_weekend_ferie est un boolean strict
      if (typeof periodeDataClean.force_weekend_ferie !== 'boolean') {
        console.error('[useCharge] Étape 7 - force_weekend_ferie n\'est pas un boolean:', typeof periodeDataClean.force_weekend_ferie, periodeDataClean.force_weekend_ferie)
        periodeDataClean.force_weekend_ferie = Boolean(periodeDataClean.force_weekend_ferie)
        console.log('[useCharge] Étape 7 - force_weekend_ferie corrigé:', periodeDataClean.force_weekend_ferie)
      }
      
      console.log('[useCharge] Étape 8 - Recherche période existante avec clés:', {
        affaire_id: periodeDataClean.affaire_id,
        site: periodeDataClean.site,
        competence: periodeDataClean.competence,
        date_debut: periodeDataClean.date_debut,
        date_fin: periodeDataClean.date_fin,
      })
      
      // APPROCHE ALTERNATIVE : Vérifier d'abord si l'enregistrement existe, puis INSERT ou UPDATE
      // Cela évite le problème de l'upsert qui essaie de mettre à jour tous les champs
      // Le site est déjà normalisé dans periodeDataClean.site
      
      // Vérifier que toutes les valeurs requises sont présentes et valides
      if (!periodeDataClean.affaire_id || !periodeDataClean.site || !periodeDataClean.competence || 
          !periodeDataClean.date_debut || !periodeDataClean.date_fin) {
        const missingFields = []
        if (!periodeDataClean.affaire_id) missingFields.push('affaire_id')
        if (!periodeDataClean.site) missingFields.push('site')
        if (!periodeDataClean.competence) missingFields.push('competence')
        if (!periodeDataClean.date_debut) missingFields.push('date_debut')
        if (!periodeDataClean.date_fin) missingFields.push('date_fin')
        throw new Error(`Champs manquants pour la recherche de période: ${missingFields.join(', ')}`)
      }
      
      const { data: existingData, error: findError } = await supabase
        .from('periodes_charge')
        .select('id')
        .eq('affaire_id', periodeDataClean.affaire_id)
        .eq('site', periodeDataClean.site)
        .eq('competence', periodeDataClean.competence)
        .eq('date_debut', periodeDataClean.date_debut)
        .eq('date_fin', periodeDataClean.date_fin)
        .maybeSingle()
      
      if (findError) {
        // Log complet de l'erreur pour diagnostic
        console.error('[useCharge] Étape 8 - ERREUR lors de la recherche:', {
          error: findError,
          code: findError.code,
          message: findError.message,
          details: findError.details,
          hint: findError.hint,
          status: (findError as any).status,
          queryParams: {
            affaire_id: periodeDataClean.affaire_id,
            site: periodeDataClean.site,
            competence: periodeDataClean.competence,
            date_debut: periodeDataClean.date_debut,
            date_fin: periodeDataClean.date_fin,
          },
        })
        
        // Si c'est une erreur "not found" (PGRST116), c'est normal, continuer
        if (findError.code === 'PGRST116') {
          // C'est normal, pas d'enregistrement trouvé
        } else {
          // Autre erreur, la lancer
          throw findError
        }
      }
      
      console.log('[useCharge] Étape 8 - Résultat recherche:', existingData ? `Période existante trouvée (ID: ${existingData.id})` : 'Aucune période existante')
      
      if (existingData) {
        // Enregistrement existant : UPDATE avec seulement les champs modifiables
        // Déterminer la valeur booléenne (true ou false)
        const shouldForceWeekendFerieUpdate: boolean = periodeDataClean.force_weekend_ferie === true || 
                                                        periodeDataClean.force_weekend_ferie === 'true' || 
                                                        periodeDataClean.force_weekend_ferie === 1 ||
                                                        periodeDataClean.force_weekend_ferie === '1'
        
        // Créer un objet littéral strict avec le booléen explicite
        const updateDataOnly: {
          nb_ressources: number
          force_weekend_ferie: boolean
        } = {
          nb_ressources: periodeDataClean.nb_ressources,
          force_weekend_ferie: shouldForceWeekendFerieUpdate ? true : false, // Booléens littéraux stricts
        }
        
        console.log('[useCharge] Étape 9 - UPDATE - Données à envoyer:', JSON.stringify(updateDataOnly, null, 2))
        console.log('[useCharge] Étape 9 - UPDATE - Types:', {
          nb_ressources: typeof updateDataOnly.nb_ressources,
          force_weekend_ferie: typeof updateDataOnly.force_weekend_ferie,
          'force_weekend_ferie value': updateDataOnly.force_weekend_ferie,
        })
        console.log('[useCharge] Étape 9 - UPDATE - ID cible:', existingData.id)
        
        const { data: updateData, error: updateError } = await supabase
          .from('periodes_charge')
          .update(updateDataOnly)
          .eq('id', existingData.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('[useCharge] Étape 9 - ERREUR update:', updateError)
          console.error('[useCharge] Étape 9 - Détails erreur:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            status: (updateError as any).status,
          })
          throw updateError
        }
        
        console.log('[useCharge] Étape 9 - UPDATE réussi, données retournées:', JSON.stringify(updateData, null, 2))
        data = updateData
      } else {
        // Nouvel enregistrement : INSERT
        // Le site est déjà normalisé dans periodeDataClean.site
        // FORCER le booléen AVANT de créer l'objet pour éviter toute transformation lors de la sérialisation
        // Déterminer si force_weekend_ferie doit être true (sinon on l'omet pour utiliser la valeur par défaut)
        const shouldForceWeekendFerie: boolean = periodeDataClean.force_weekend_ferie === true || 
                                                  periodeDataClean.force_weekend_ferie === 'true' || 
                                                  periodeDataClean.force_weekend_ferie === 1 ||
                                                  periodeDataClean.force_weekend_ferie === '1'
        
        // Créer un objet littéral strict pour éviter toute transformation lors de la sérialisation JSON
        // On n'inclut force_weekend_ferie que si c'est true, sinon on utilise la valeur par défaut de la DB
        const insertData: {
          affaire_id: string
          site: string
          competence: string
          date_debut: string
          date_fin: string
          nb_ressources: number
          force_weekend_ferie?: boolean
        } = {
          affaire_id: periodeDataClean.affaire_id,
          site: periodeDataClean.site,
          competence: periodeDataClean.competence,
          date_debut: periodeDataClean.date_debut,
          date_fin: periodeDataClean.date_fin,
          nb_ressources: periodeDataClean.nb_ressources,
        }
        
        // N'inclure force_weekend_ferie que s'il est true (false est la valeur par défaut)
        if (shouldForceWeekendFerie) {
          insertData.force_weekend_ferie = true
        }
        
        console.log('[useCharge] Étape 10 - INSERT - Données à envoyer:', JSON.stringify(insertData, null, 2))
        console.log('[useCharge] Étape 10 - INSERT - Types:', {
          affaire_id: typeof insertData.affaire_id,
          site: typeof insertData.site,
          competence: typeof insertData.competence,
          date_debut: typeof insertData.date_debut,
          date_fin: typeof insertData.date_fin,
          nb_ressources: typeof insertData.nb_ressources,
          force_weekend_ferie: typeof insertData.force_weekend_ferie,
          'force_weekend_ferie value': insertData.force_weekend_ferie,
          'force_weekend_ferie === true': insertData.force_weekend_ferie === true,
          'force_weekend_ferie === false': insertData.force_weekend_ferie === false,
        })
        
        const { data: insertDataResult, error: insertError } = await supabase
          .from('periodes_charge')
          .insert(insertData)
          .select()
          .single()
        
        if (insertError) {
          console.error('[useCharge] Étape 10 - ERREUR insert:', insertError)
          console.error('[useCharge] Étape 10 - Détails erreur:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            status: (insertError as any).status,
          })
          console.error('[useCharge] Étape 10 - Données qui ont causé l\'erreur:', JSON.stringify(insertData, null, 2))
          throw insertError
        }
        
        console.log('[useCharge] Étape 10 - INSERT réussi, données retournées:', JSON.stringify(insertDataResult, null, 2))
        data = insertDataResult
      }
      
      console.log('[useCharge] Étape 11 - Transformation des données retournées')
      
      // *** OPTIMISATION : Mise à jour optimiste au lieu de recharger immédiatement ***
      // Cela évite que le rechargement écrase les valeurs en cours de saisie
      const periodeAvecDates = {
        ...data,
        date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
        date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
        force_weekend_ferie: data.force_weekend_ferie === true, // Convertir en boolean explicite
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      } as PeriodeCharge

      console.log('[useCharge] Étape 12 - Mise à jour optimiste de l\'état local')
      // Mettre à jour optimistement periodes (remplacer ou ajouter la période)
      setPeriodes((prev) => {
        const newPeriodes = [...prev]
        const index = newPeriodes.findIndex(
          (p) => p.id === periodeAvecDates.id || 
          (p.affaire_id === periodeAvecDates.affaire_id &&
           p.site === periodeAvecDates.site &&
           p.competence === periodeAvecDates.competence &&
           new Date(p.date_debut).getTime() === periodeAvecDates.date_debut.getTime() &&
           new Date(p.date_fin).getTime() === periodeAvecDates.date_fin.getTime())
        )
        
        if (index >= 0) {
          newPeriodes[index] = periodeAvecDates
        } else {
          newPeriodes.push(periodeAvecDates)
        }
        
        return newPeriodes
      })

      // Recharger les périodes seulement si autoRefresh est activé ET Realtime est désactivé
      // Si Realtime est activé, les mises à jour sont gérées automatiquement par les événements postgres_changes
      if (autoRefresh && !enableRealtime) {
        console.log('[useCharge] Étape 13 - Rechargement des périodes (autoRefresh activé, Realtime désactivé)')
        await loadPeriodes()
      } else {
        console.log('[useCharge] Étape 13 - Pas de rechargement (autoRefresh:', autoRefresh, ', Realtime:', enableRealtime, ')')
      }

      console.log('[useCharge] ========== FIN savePeriode - SUCCÈS ==========')
      return periodeAvecDates
    } catch (err) {
      console.error('[useCharge] ========== FIN savePeriode - ERREUR ==========')
      console.error('[useCharge] Erreur complète:', err)
      console.error('[useCharge] Stack trace:', (err as Error)?.stack)
      setError(err as Error)
      throw err
    }
  }, [affaireId, site, loadPeriodes, autoRefresh, enableRealtime, getSupabaseClient])

  const deletePeriode = useCallback(async (periodeId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('periodes_charge')
        .delete()
        .eq('id', periodeId)

      if (deleteError) throw deleteError

      // *** OPTIMISATION : Mise à jour optimiste au lieu de recharger immédiatement ***
      // Supprimer la période de l'état local immédiatement
      setPeriodes((prev) => prev.filter((p) => p.id !== periodeId))

      // Recharger les périodes seulement si autoRefresh est activé ET Realtime est désactivé
      // Si Realtime est activé, les mises à jour sont gérées automatiquement par les événements postgres_changes
      if (autoRefresh && !enableRealtime) {
        await loadPeriodes()
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur deletePeriode:', err)
      throw err
    }
  }, [loadPeriodes, autoRefresh, enableRealtime, getSupabaseClient])

  // Fonction pour sauvegarder plusieurs périodes en lot (batch)
  // Cette fonction désactive les triggers, insère toutes les périodes, puis réactive les triggers et consolide
  const savePeriodesBatch = useCallback(async (periodes: Partial<PeriodeCharge>[]) => {
    try {
      console.log('[useCharge] ========== DEBUT savePeriodesBatch ==========')
      console.log('[useCharge] Nombre de périodes à sauvegarder:', periodes.length)
      
      setError(null)
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) {
        console.error('[useCharge] Erreur recherche affaire (savePeriodesBatch):', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${siteNormalized}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)
      }

      // Normaliser les dates et les booléens pour chaque période
      const formatDateForDB = (date: Date | string | undefined): string => {
        if (!date) return new Date().toISOString().split('T')[0]
        if (date instanceof Date) {
          return date.toISOString().split('T')[0]
        }
        if (typeof date === 'string') {
          return date.split('T')[0]
        }
        return new Date().toISOString().split('T')[0]
      }

      const normalizeBoolean = (value: any): boolean => {
        if (value === true || value === 'true' || value === 1 || value === '1') {
          return true
        }
        if (value === false || value === 'false' || value === 0 || value === '0') {
          return false
        }
        return false
      }

      // Préparer les données pour le batch insert
      const periodesData = periodes.map((periode) => ({
        competence: periode.competence || '',
        date_debut: formatDateForDB(periode.date_debut),
        date_fin: formatDateForDB(periode.date_fin),
        nb_ressources: periode.nb_ressources || 0,
        force_weekend_ferie: normalizeBoolean(periode.force_weekend_ferie),
      }))

      console.log('[useCharge] Données préparées pour batch insert:', JSON.stringify(periodesData.slice(0, 3), null, 2), '... (affiche les 3 premières)')

      // Appeler la fonction RPC batch_insert_periodes_charge
      // Le site sera normalisé en majuscules dans la fonction RPC
      const { data, error: rpcError } = await supabase.rpc('batch_insert_periodes_charge', {
        p_periodes: periodesData,
        p_affaire_id: affaireId,
        p_site: siteNormalized,
      })

      if (rpcError) {
        console.error('[useCharge] Erreur batch_insert_periodes_charge:', rpcError)
        throw rpcError
      }

      console.log('[useCharge] Batch insert réussi')

      // Recharger les périodes pour mettre à jour l'état local
      if (autoRefresh) {
        console.log('[useCharge] Rechargement des périodes après batch insert')
        await loadPeriodes()
      } else {
        console.log('[useCharge] Pas de rechargement automatique (autoRefresh: false)')
      }

      console.log('[useCharge] ========== FIN savePeriodesBatch - SUCCÈS ==========')
      return data
    } catch (err) {
      console.error('[useCharge] ========== FIN savePeriodesBatch - ERREUR ==========')
      console.error('[useCharge] Erreur complète:', err)
      setError(err as Error)
      throw err
    }
  }, [affaireId, site, loadPeriodes, autoRefresh, getSupabaseClient])

  const consolidate = useCallback(async (competence?: string) => {
    try {
      setError(null)
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) {
        console.error('[useCharge] Erreur recherche affaire (consolidate):', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${siteNormalized}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)
      }

      // Charger toutes les périodes pour cette affaire/site (et compétence si spécifiée)
      let query = supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', siteNormalized)
        .order('competence', { ascending: true })
        .order('date_debut', { ascending: true })

      if (competence) {
        query = query.eq('competence', competence)
      }

      const { data: allPeriodes, error: queryError } = await query

      if (queryError) throw queryError

      if (!allPeriodes || allPeriodes.length === 0) {
        await loadPeriodes()
        return
      }

      // Grouper par compétence
      const periodesParCompetence = new Map<string, typeof allPeriodes>()
      allPeriodes.forEach((p: any) => {
        const comp = p.competence
        if (!periodesParCompetence.has(comp)) {
          periodesParCompetence.set(comp, [])
        }
        periodesParCompetence.get(comp)!.push(p)
      })

      // Pour chaque compétence, consolider les périodes
      for (const [comp, periodesComp] of periodesParCompetence.entries()) {
        // *** NOUVEAU : Séparer les périodes avec force_weekend_ferie=true (ne pas les consolider) ***
        const periodesForcees: typeof allPeriodes = []
        const periodesNormales: typeof allPeriodes = []

        periodesComp.forEach((p: any) => {
          if (p.force_weekend_ferie === true) {
            // Période forcée : la garder telle quelle (ligne séparée)
            periodesForcees.push(p)
          } else {
            // Période normale : à consolider
            periodesNormales.push(p)
          }
        })

        // *** NOUVEAU : Déplier jour par jour (jours ouvrés uniquement) SEULEMENT pour les périodes normales ***
        const joursParCharge = new Map<string, number>() // Clé: date ISO (YYYY-MM-DD), Valeur: nb_ressources

        periodesNormales.forEach((p: any) => {
          const dateDebut = new Date(p.date_debut)
          const dateFin = new Date(p.date_fin)
          const nbRessources = p.nb_ressources || 0

          if (nbRessources <= 0) return

          // Parcourir tous les jours de la période
          const currentDate = new Date(dateDebut)
          while (currentDate <= dateFin) {
            // Vérifier si c'est un jour ouvré (utiliser isBusinessDay qui gère week-ends et fériés)
            if (isBusinessDay(currentDate)) {
              const dateKey = currentDate.toISOString().split('T')[0] // Format YYYY-MM-DD
              joursParCharge.set(dateKey, nbRessources)
            }

            currentDate.setDate(currentDate.getDate() + 1)
          }
        })

        // *** NOUVEAU : Vérifier s'il y a des périodes à traiter (normales OU forcées) ***
        const hasPeriodesNormales = joursParCharge.size > 0
        const hasPeriodesForcees = periodesForcees.length > 0

        if (!hasPeriodesNormales && !hasPeriodesForcees) {
          // Aucune période avec charge > 0, supprimer toutes les périodes de cette compétence
          for (const p of periodesComp) {
            await supabase.from('periodes_charge').delete().eq('id', p.id)
          }
          continue
        }

        // Supprimer toutes les anciennes périodes de cette compétence
        for (const p of periodesComp) {
          await supabase.from('periodes_charge').delete().eq('id', p.id)
        }

        // *** NOUVEAU : Recréer les périodes forcées telles quelles (lignes séparées) ***
        for (const periodeForcee of periodesForcees) {
          await supabase.from('periodes_charge').insert({
            affaire_id: affaireData.id,
            site: siteNormalized,
            competence: comp,
            date_debut: normalizeDateToUTC(new Date(periodeForcee.date_debut)),
            date_fin: normalizeDateToUTC(new Date(periodeForcee.date_fin)),
            nb_ressources: periodeForcee.nb_ressources || 0,
            force_weekend_ferie: true, // Conserver le flag
          })
        }

        // *** NOUVEAU : Consolider SEULEMENT les périodes normales (sans force_weekend_ferie) ***
        if (hasPeriodesNormales) {
          // Trier les dates
          const datesTriees = Array.from(joursParCharge.keys()).sort()

          // Regrouper les périodes consécutives avec la même charge
          const nouvellesPeriodes: Array<{
            date_debut: Date
            date_fin: Date
            nb_ressources: number
          }> = []

          if (datesTriees.length > 0) {
            let periodeDebut = new Date(datesTriees[0] + 'T00:00:00') // Ajouter l'heure pour éviter les problèmes de timezone
            let periodeFin = new Date(datesTriees[0] + 'T00:00:00')
            let chargeActuelle = joursParCharge.get(datesTriees[0])!

            for (let i = 1; i < datesTriees.length; i++) {
              const dateActuelle = new Date(datesTriees[i] + 'T00:00:00')
              const datePrecedente = new Date(datesTriees[i - 1] + 'T00:00:00')
              const chargeActuelleDate = joursParCharge.get(datesTriees[i])!

              // Vérifier si la date actuelle est le jour suivant (consécutif)
              const jourSuivant = addDays(datePrecedente, 1)
              const isConsecutif = isSameDay(dateActuelle, jourSuivant)

              // Si consécutif (jour suivant) ET même charge, étendre la période
              if (isConsecutif && chargeActuelleDate === chargeActuelle) {
                periodeFin = dateActuelle
              } else {
                // Nouvelle période : sauvegarder l'ancienne
                nouvellesPeriodes.push({
                  date_debut: periodeDebut,
                  date_fin: periodeFin,
                  nb_ressources: chargeActuelle,
                })

                // Commencer une nouvelle période
                periodeDebut = dateActuelle
                periodeFin = dateActuelle
                chargeActuelle = chargeActuelleDate
              }
            }

            // Ajouter la dernière période
            nouvellesPeriodes.push({
              date_debut: periodeDebut,
              date_fin: periodeFin,
              nb_ressources: chargeActuelle,
            })
          }

          // Créer les nouvelles périodes consolidées (sans force_weekend_ferie)
          for (const nouvellePeriode of nouvellesPeriodes) {
            await supabase.from('periodes_charge').insert({
              affaire_id: affaireData.id,
              site: siteNormalized,
              competence: comp,
              date_debut: normalizeDateToUTC(nouvellePeriode.date_debut),
              date_fin: normalizeDateToUTC(nouvellePeriode.date_fin),
              nb_ressources: nouvellePeriode.nb_ressources,
              force_weekend_ferie: false, // Périodes normales
            })
          }
        }
      }

      // Recharger les périodes après consolidation (même avec Realtime, car consolidation = opération complexe DELETE puis INSERT)
      // Realtime gère les INSERT individuels, mais pour la consolidation qui modifie beaucoup de lignes,
      // un refresh unique est plus efficace qu'un grand nombre d'événements Realtime
      await loadPeriodes()
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur consolidate:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes])

  return {
    periodes,
    loading,
    error,
    savePeriode,
    savePeriodesBatch,
    deletePeriode,
    consolidate,
    refresh: loadPeriodes,
  }
}
