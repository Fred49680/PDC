'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeDateToUTC, isBusinessDay } from '@/utils/calendar'
import { addDays, isSameDay } from 'date-fns'
import type { PeriodeCharge } from '@/types/charge'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Variable pour activer/désactiver les logs de debug
const DEBUG_CHARGE = process.env.NODE_ENV === 'development' && true // Mettre à true pour activer les logs détaillés

// Helper pour les logs de debug
const debugLog = (...args: unknown[]) => {
  if (DEBUG_CHARGE) console.log(...args)
}
const debugError = (...args: unknown[]) => {
  if (DEBUG_CHARGE) console.error(...args)
}

// Type pour les données brutes retournées par Supabase
interface PeriodeChargeRaw {
  id: string
  affaire_id: string
  site: string
  competence: string
  date_debut: string
  date_fin: string
  nb_ressources: number
  force_weekend_ferie?: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

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
      const periodesAvecDates = (data || []).map((p: PeriodeChargeRaw) => ({
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
  }, [affaireId, site, getSupabaseClient])

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
              debugLog('[useCharge] Changement Realtime:', payload.eventType)
              
              // Mise à jour optimiste
              if (payload.eventType === 'INSERT' && payload.new) {
                const newPeriode = payload.new as PeriodeChargeRaw
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
                const updatedPeriode = payload.new as PeriodeChargeRaw
                setPeriodes((prev) =>
                  prev.map((p) =>
                    p.id === updatedPeriode.id
                      ? {
                          id: updatedPeriode.id,
                          affaire_id: updatedPeriode.affaire_id,
                          site: updatedPeriode.site,
                          competence: updatedPeriode.competence,
                          date_debut: new Date(updatedPeriode.date_debut),
                          date_fin: new Date(updatedPeriode.date_fin),
                          nb_ressources: updatedPeriode.nb_ressources,
                          force_weekend_ferie: updatedPeriode.force_weekend_ferie === true,
                          created_at: new Date(updatedPeriode.created_at),
                          updated_at: new Date(updatedPeriode.updated_at),
                          created_by: updatedPeriode.created_by,
                          updated_by: updatedPeriode.updated_by,
                        }
                      : p
                  )
                )
              } else if (payload.eventType === 'DELETE' && payload.old) {
                const deletedPeriode = payload.old as PeriodeChargeRaw
                setPeriodes((prev) => prev.filter((p) => p.id !== deletedPeriode.id))
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              debugLog('[useCharge] Abonnement Realtime activé')
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
    debugLog('[useCharge] ========== DEBUT savePeriode ==========')
    debugLog('[useCharge] Étape 1 - Données d\'entrée brutes:', JSON.stringify(periode, null, 2))
    
    try {
      setError(null)

      const supabase = getSupabaseClient()
      debugLog('[useCharge] Étape 2 - Client Supabase créé')

      // Récupérer l'ID de l'affaire
      // Normaliser le site en majuscules pour correspondre à la base de données
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      debugLog('[useCharge] Étape 3 - Recherche de l\'affaire:', { affaireId, site, siteNormalized })
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) {
        debugError('[useCharge] Étape 3 - ERREUR recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${siteNormalized}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        console.error('[useCharge] Étape 3 - Affaire introuvable')
        throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)
      }
      
      debugLog('[useCharge] Étape 3 - Affaire trouvée, ID:', affaireData.id)

      // *** NORMALISER LES DATES À MINUIT UTC pour éviter les problèmes de timezone ***
      // Créer un objet propre en évitant le spread qui peut propager des valeurs invalides
      const periodeData: {
        id?: string
        affaire_id: string
        site: string
        competence: string
        date_debut: Date | string
        date_fin: Date | string
        nb_ressources: number
        force_weekend_ferie?: boolean | string | number
      } = {
        affaire_id: affaireData.id,
        site: siteNormalized,
        competence: periode.competence || '',
        // Normaliser date_debut et date_fin si elles sont des objets Date
        date_debut: (periode.date_debut instanceof Date 
          ? normalizeDateToUTC(periode.date_debut)
          : periode.date_debut) || new Date(),
        date_fin: (periode.date_fin instanceof Date
          ? normalizeDateToUTC(periode.date_fin)
          : periode.date_fin) || new Date(),
        nb_ressources: periode.nb_ressources || 0,
        force_weekend_ferie: periode.force_weekend_ferie,
      }
      
      // Ajouter l'ID seulement s'il existe
      if (periode.id) {
        periodeData.id = periode.id
      }
      
      debugLog('[useCharge] Étape 4 - Données après normalisation initiale:', JSON.stringify(periodeData, null, 2))
      debugLog('[useCharge] Étape 4 - Types:', {
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
      let data: PeriodeChargeRaw
      
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
      const normalizeBoolean = (value: unknown): boolean => {
        debugLog('[useCharge] normalizeBoolean - Input:', { value, type: typeof value })
        if (value === true || value === 'true' || value === 1 || value === '1') {
          debugLog('[useCharge] normalizeBoolean - Retourne: true')
          return true
        }
        if (value === false || value === 'false' || value === 0 || value === '0') {
          debugLog('[useCharge] normalizeBoolean - Retourne: false')
          return false
        }
        // Si undefined, null, ou chaîne vide, retourner false par défaut
        debugLog('[useCharge] normalizeBoolean - Valeur invalide, retourne: false (défaut)')
        return false
      }
      
      // Créer un objet propre avec uniquement les champs nécessaires et correctement formatés
      // Cela évite de propager des valeurs invalides via le spread
      // Le site est déjà normalisé dans periodeData.site
      const periodeDataClean: {
        id?: string
        affaire_id: string
        site: string
        competence: string
        date_debut: string
        date_fin: string
        nb_ressources: number
        force_weekend_ferie?: boolean
      } = {
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
      
      debugLog('[useCharge] Étape 5 - Données nettoyées (periodeDataClean):', JSON.stringify(periodeDataClean, null, 2))
      debugLog('[useCharge] Étape 5 - Types après nettoyage:', {
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
      
      // S'assurer que force_weekend_ferie est un boolean strict
      if (periodeDataClean.force_weekend_ferie !== undefined) {
        periodeDataClean.force_weekend_ferie = Boolean(periodeDataClean.force_weekend_ferie)
      }
      
      // Double vérification : s'assurer que force_weekend_ferie est un boolean strict
      if (typeof periodeDataClean.force_weekend_ferie !== 'boolean') {
        console.error('[useCharge] Étape 7 - force_weekend_ferie n\'est pas un boolean:', typeof periodeDataClean.force_weekend_ferie, periodeDataClean.force_weekend_ferie)
        periodeDataClean.force_weekend_ferie = Boolean(periodeDataClean.force_weekend_ferie)
        debugLog('[useCharge] Étape 7 - force_weekend_ferie corrigé:', periodeDataClean.force_weekend_ferie)
      }
      
      debugLog('[useCharge] Étape 8 - Recherche période existante avec clés:', {
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
            status: (findError as { status?: number }).status,
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
      
      debugLog('[useCharge] Étape 8 - Résultat recherche:', existingData ? `Période existante trouvée (ID: ${existingData.id})` : 'Aucune période existante')
      
      if (existingData) {
        // Enregistrement existant : UPDATE avec seulement les champs modifiables
        // Déterminer la valeur booléenne (true ou false)
        const shouldForceWeekendFerieUpdate: boolean = periodeDataClean.force_weekend_ferie === true
        
        // Créer un objet littéral strict avec le booléen explicite
        const updateDataOnly: {
          nb_ressources: number
          force_weekend_ferie: boolean
        } = {
          nb_ressources: periodeDataClean.nb_ressources,
          force_weekend_ferie: shouldForceWeekendFerieUpdate ? true : false, // Booléens littéraux stricts
        }
        
        debugLog('[useCharge] Étape 9 - UPDATE - Données à envoyer:', JSON.stringify(updateDataOnly, null, 2))
        debugLog('[useCharge] Étape 9 - UPDATE - Types:', {
          nb_ressources: typeof updateDataOnly.nb_ressources,
          force_weekend_ferie: typeof updateDataOnly.force_weekend_ferie,
          'force_weekend_ferie value': updateDataOnly.force_weekend_ferie,
        })
        debugLog('[useCharge] Étape 9 - UPDATE - ID cible:', existingData.id)
        
        const { data: updateData, error: updateError } = await supabase
          .from('periodes_charge')
          .update(updateDataOnly)
          .eq('id', existingData.id)
          .select('*')
          .maybeSingle()
        
        if (updateError) {
          console.error('[useCharge] Étape 9 - ERREUR update:', updateError)
          console.error('[useCharge] Étape 9 - Détails erreur:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            status: (updateError as { status?: number }).status,
          })
          throw updateError
        }
        
        debugLog('[useCharge] Étape 9 - UPDATE réussi, données retournées:', JSON.stringify(updateData, null, 2))
        // Si updateData est null, recharger depuis la base
        if (!updateData) {
          const { data: reloadedData, error: reloadError } = await supabase
            .from('periodes_charge')
            .select('*')
            .eq('id', existingData.id)
            .maybeSingle()
          if (reloadError) throw reloadError
          data = reloadedData || existingData as PeriodeChargeRaw
        } else {
          data = updateData
        }
      } else {
        // Nouvel enregistrement : INSERT
        // Le site est déjà normalisé dans periodeDataClean.site
        // FORCER le booléen AVANT de créer l'objet pour éviter toute transformation lors de la sérialisation
        // Déterminer si force_weekend_ferie doit être true (sinon on l'omet pour utiliser la valeur par défaut)
        const shouldForceWeekendFerie: boolean = periodeDataClean.force_weekend_ferie === true
        
        // Créer un objet littéral strict pour éviter toute transformation lors de la sérialisation JSON
        // TOUJOURS inclure force_weekend_ferie explicitement comme booléen strict
        // Ne JAMAIS omettre ce champ car Supabase peut le transformer en chaîne vide
        const insertData: {
          affaire_id: string
          site: string
          competence: string
          date_debut: string
          date_fin: string
          nb_ressources: number
          force_weekend_ferie: boolean
        } = {
          affaire_id: periodeDataClean.affaire_id,
          site: periodeDataClean.site,
          competence: periodeDataClean.competence,
          date_debut: periodeDataClean.date_debut,
          date_fin: periodeDataClean.date_fin,
          nb_ressources: periodeDataClean.nb_ressources,
          // Toujours inclure explicitement le booléen (true ou false)
          force_weekend_ferie: shouldForceWeekendFerie ? true : false,
        }
        
        // Utiliser la fonction RPC PostgreSQL pour éviter les problèmes de sérialisation JSON booléenne
        // Cette fonction accepte TEXT pour force_weekend_ferie pour éviter les problèmes de sérialisation
        // Convertir le booléen en chaîne pour éviter les problèmes de sérialisation JSON
        const forceWeekendFerieText = insertData.force_weekend_ferie ? 'true' : 'false'
        debugLog('[useCharge] Étape 10 - INSERT via RPC - Données à envoyer:', JSON.stringify({ ...insertData, force_weekend_ferie: forceWeekendFerieText }, null, 2))
        
        const { data: insertDataResult, error: insertError } = await supabase.rpc('insert_periode_charge', {
          p_affaire_id: insertData.affaire_id,
          p_site: insertData.site,
          p_competence: insertData.competence,
          p_date_debut: insertData.date_debut,
          p_date_fin: insertData.date_fin,
          p_nb_ressources: insertData.nb_ressources,
          p_force_weekend_ferie: forceWeekendFerieText, // Envoyer comme chaîne
        })
        
        if (insertError) {
          console.error('[useCharge] Étape 10 - ERREUR insert:', insertError)
          console.error('[useCharge] Étape 10 - Détails erreur:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            status: (insertError as { status?: number }).status,
          })
          console.error('[useCharge] Étape 10 - Données qui ont causé l\'erreur:', JSON.stringify(insertData, null, 2))
          throw insertError
        }
        
        // La fonction RPC retourne un tableau, prendre le premier élément
        const periodeResult = Array.isArray(insertDataResult) && insertDataResult.length > 0 ? insertDataResult[0] : insertDataResult
        debugLog('[useCharge] Étape 10 - INSERT réussi via RPC, données retournées:', JSON.stringify(periodeResult, null, 2))
        if (!periodeResult) {
          throw new Error('La fonction RPC n\'a pas retourné de résultat')
        }
        data = periodeResult
      }
      
      debugLog('[useCharge] Étape 11 - Transformation des données retournées')
      
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

      debugLog('[useCharge] Étape 12 - Mise à jour optimiste de l\'état local')
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
        debugLog('[useCharge] Étape 13 - Rechargement des périodes (autoRefresh activé, Realtime désactivé)')
        await loadPeriodes()
      } else {
        debugLog('[useCharge] Étape 13 - Pas de rechargement (autoRefresh:', autoRefresh, ', Realtime:', enableRealtime, ')')
      }

      debugLog('[useCharge] ========== FIN savePeriode - SUCCÈS ==========')
      return periodeAvecDates
    } catch (err) {
      console.error('[useCharge] ========== FIN savePeriode - ERREUR ==========') // Toujours afficher les erreurs
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
  // Fonction pour consolider les périodes : regrouper les jours consécutifs avec la même charge
  const consoliderPeriodes = (periodes: Array<{
    competence: string
    date_debut: string
    date_fin: string
    nb_ressources: number
    force_weekend_ferie: boolean
  }>): typeof periodes => {
    if (periodes.length === 0) return []

    // Trier par compétence, puis par date de début
    const sorted = [...periodes].sort((a, b) => {
      if (a.competence !== b.competence) {
        return a.competence.localeCompare(b.competence)
      }
      return a.date_debut.localeCompare(b.date_debut)
    })

    const result: typeof periodes = []
    let current = { ...sorted[0] }

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i]
      const currentDateFin = new Date(current.date_fin)
      const nextDateDebut = new Date(next.date_debut)
      
      // Vérifier si on peut fusionner : même compétence, même charge, dates consécutives
      const canMerge = 
        current.competence === next.competence &&
        current.nb_ressources === next.nb_ressources &&
        current.force_weekend_ferie === next.force_weekend_ferie &&
        (isSameDay(addDays(currentDateFin, 1), nextDateDebut) || 
         currentDateFin >= nextDateDebut)

      if (canMerge) {
        // Fusionner : étendre la date de fin
        if (nextDateDebut > currentDateFin) {
          current.date_fin = next.date_fin
        } else {
          // Les périodes se chevauchent, prendre la date de fin la plus récente
          current.date_fin = current.date_fin > next.date_fin ? current.date_fin : next.date_fin
        }
      } else {
        // Nouvelle période : sauvegarder l'ancienne et commencer une nouvelle
        result.push(current)
        current = { ...next }
      }
    }

    // Ajouter la dernière période
    result.push(current)

    return result
  }

  const savePeriodesBatch = useCallback(async (periodes: Partial<PeriodeCharge>[]) => {
    try {
      debugLog('[useCharge] ========== DEBUT savePeriodesBatch ==========')
      debugLog('[useCharge] Nombre de périodes à sauvegarder:', periodes.length)
      
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

      const normalizeBoolean = (value: unknown): boolean => {
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

      // Consolider les périodes : regrouper les jours consécutifs avec la même charge
      const periodesConsolidees = consoliderPeriodes(periodesData)
      debugLog(`[useCharge] Consolidation: ${periodesData.length} période(s) -> ${periodesConsolidees.length} période(s) consolidée(s)`)
      debugLog('[useCharge] Données préparées pour batch insert:', JSON.stringify(periodesConsolidees.slice(0, 3), null, 2), '... (affiche les 3 premières)')

      // Diviser les insertions en lots de 50 pour éviter les timeouts (réduit car consolidation déjà faite)
      const BATCH_SIZE = 50
      const batches: typeof periodesConsolidees[] = []
      for (let i = 0; i < periodesConsolidees.length; i += BATCH_SIZE) {
        batches.push(periodesConsolidees.slice(i, i + BATCH_SIZE))
      }

      debugLog(`[useCharge] Insertion en ${batches.length} lot(s) de ${BATCH_SIZE} période(s) maximum`)

      // Traiter chaque lot séquentiellement pour éviter la surcharge
      const allResults = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        debugLog(`[useCharge] Traitement du lot ${i + 1}/${batches.length} (${batch.length} période(s))`)
        
        try {
          // Appeler la fonction RPC batch_insert_periodes_charge
          // Le site sera normalisé en majuscules dans la fonction RPC
          const { data, error: rpcError } = await supabase.rpc('batch_insert_periodes_charge', {
            p_periodes: batch,
            p_affaire_id: affaireId,
            p_site: siteNormalized,
          })

          if (rpcError) {
            console.error(`[useCharge] Erreur batch_insert_periodes_charge (lot ${i + 1}/${batches.length}):`, rpcError)
            throw rpcError
          }

          if (data) {
            allResults.push(data)
          }
          
          debugLog(`[useCharge] Lot ${i + 1}/${batches.length} inséré avec succès`)
          
          // Petit délai entre les lots pour éviter la surcharge
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (err) {
          console.error(`[useCharge] Erreur lors du traitement du lot ${i + 1}/${batches.length}:`, err)
          throw err
        }
      }

      debugLog('[useCharge] Tous les lots insérés avec succès')

      // Recharger les périodes pour mettre à jour l'état local
      if (autoRefresh) {
        debugLog('[useCharge] Rechargement des périodes après batch insert')
        await loadPeriodes()
      } else {
        debugLog('[useCharge] Pas de rechargement automatique (autoRefresh: false)')
      }

      debugLog('[useCharge] ========== FIN savePeriodesBatch - SUCCÈS ==========')
      return allResults
    } catch (err) {
      console.error('[useCharge] ========== FIN savePeriodesBatch - ERREUR ==========') // Toujours afficher les erreurs
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
      const periodesParCompetence = new Map<string, PeriodeCharge[]>()
      allPeriodes.forEach((p: PeriodeCharge) => {
        const comp = p.competence
        if (!periodesParCompetence.has(comp)) {
          periodesParCompetence.set(comp, [])
        }
        periodesParCompetence.get(comp)!.push(p)
      })

      // Pour chaque compétence, consolider les périodes
      for (const [comp, periodesComp] of periodesParCompetence.entries()) {
        // *** NOUVEAU : Séparer les périodes avec force_weekend_ferie=true (ne pas les consolider) ***
        const periodesForcees: PeriodeCharge[] = []
        const periodesNormales: PeriodeCharge[] = []

        periodesComp.forEach((p: PeriodeCharge) => {
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

        periodesNormales.forEach((p: PeriodeCharge) => {
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
  }, [affaireId, site, loadPeriodes, getSupabaseClient])

  // Fonction pour mettre à jour toutes les périodes d'une compétence avec une nouvelle compétence
  const updateCompetence = useCallback(async (ancienneCompetence: string, nouvelleCompetence: string) => {
    try {
      setError(null)
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) throw affaireError
      if (!affaireData) throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)

      // Mettre à jour toutes les périodes de cette compétence
      const { error: updateError } = await supabase
        .from('periodes_charge')
        .update({ competence: nouvelleCompetence })
        .eq('affaire_id', affaireData.id)
        .eq('site', siteNormalized)
        .eq('competence', ancienneCompetence)

      if (updateError) throw updateError

      // Recharger les périodes
      if (autoRefresh) {
        await loadPeriodes()
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur updateCompetence:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes, autoRefresh, getSupabaseClient])

  // Fonction pour supprimer toutes les périodes d'une compétence
  const deleteCompetence = useCallback(async (competence: string) => {
    try {
      setError(null)
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const siteNormalized = typeof site === 'string' ? site.toUpperCase().trim() : site
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', siteNormalized)
        .maybeSingle()

      if (affaireError) throw affaireError
      if (!affaireData) throw new Error(`Affaire ${affaireId} / ${siteNormalized} introuvable`)

      // Supprimer toutes les périodes de cette compétence
      const { error: deleteError } = await supabase
        .from('periodes_charge')
        .delete()
        .eq('affaire_id', affaireData.id)
        .eq('site', siteNormalized)
        .eq('competence', competence)

      if (deleteError) throw deleteError

      // Mise à jour optimiste : supprimer les périodes de l'état local
      setPeriodes((prev) => prev.filter((p) => p.competence !== competence))

      // Recharger les périodes seulement si autoRefresh est activé ET Realtime est désactivé
      if (autoRefresh && !enableRealtime) {
        await loadPeriodes()
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur deleteCompetence:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes, autoRefresh, enableRealtime, getSupabaseClient])

  return {
    periodes,
    loading,
    error,
    savePeriode,
    savePeriodesBatch,
    deletePeriode,
    consolidate,
    updateCompetence,
    deleteCompetence,
    refresh: loadPeriodes,
  }
}
