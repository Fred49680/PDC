'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeDateToUTC, isBusinessDay } from '@/utils/calendar'
import { addDays, isSameDay } from 'date-fns'
import type { Affectation, Ressource } from '@/types/affectations'
import type { Absence } from '@/types/absences'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseAffectationsOptions {
  affaireId: string
  site: string
  competence?: string
  autoRefresh?: boolean // Option pour désactiver le refresh automatique
  enableRealtime?: boolean // Option pour activer/désactiver Realtime
}

export function useAffectations({ affaireId, site, competence, autoRefresh = true, enableRealtime = true }: UseAffectationsOptions) {
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const affaireDbIdRef = useRef<string | null>(null)

  // Créer le client de manière lazy (seulement côté client)
  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  const loadAffectations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .maybeSingle()

      if (affaireError) {
        console.error('[useAffectations] Erreur recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      let query = supabase
        .from('affectations')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)

      if (competence) {
        query = query.eq('competence', competence)
      }

      const { data, error: queryError } = await query
        .order('date_debut', { ascending: true })

      if (queryError) throw queryError

      // Convertir les dates de string ISO en Date
      const affectationsAvecDates = (data || []).map((a: any) => ({
        ...a,
        date_debut: a.date_debut ? new Date(a.date_debut) : new Date(),
        date_fin: a.date_fin ? new Date(a.date_fin) : new Date(),
        created_at: a.created_at ? new Date(a.created_at) : new Date(),
        updated_at: a.updated_at ? new Date(a.updated_at) : new Date(),
      })) as Affectation[]

      setAffectations(affectationsAvecDates)
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [affaireId, site, competence])

  const loadRessources = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()

      const { data, error: queryError } = await supabase
        .from('ressources')
        .select('*')
        .eq('site', site)
        .eq('actif', true)
        .order('nom', { ascending: true })

      if (queryError) throw queryError

      setRessources((data || []) as Ressource[])
    } catch (err) {
      console.error('[useAffectations] Erreur loadRessources:', err)
    }
  }, [site])

  // Abonnement Realtime pour les affectations
  useEffect(() => {
    if (!enableRealtime || !affaireId || !site) return

    const supabase = getSupabaseClient()
    
    const setupRealtime = async () => {
      try {
        // Récupérer l'ID de l'affaire pour le filtre Realtime
        const { data: affaireData } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireId)
          .eq('site', site)
          .single()
        
        if (!affaireData) return
        
        affaireDbIdRef.current = affaireData.id
        const channelName = `affectations-changes-${affaireDbIdRef.current}-${Date.now()}`
        
        let filter = `affaire_id=eq.${affaireDbIdRef.current}`
        if (competence) {
          filter = `${filter}&competence=eq.${competence}`
        }
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'affectations',
              filter: filter,
            },
            (payload) => {
              console.log('[useAffectations] Changement Realtime:', payload.eventType)
              
              // Mise à jour optimiste
              if (payload.eventType === 'INSERT' && payload.new) {
                const newAffectation = payload.new as any
                setAffectations((prev) => {
                  const exists = prev.some((a) => a.id === newAffectation.id)
                  if (exists) return prev
                  const transformed: Affectation = {
                    ...newAffectation,
                    date_debut: new Date(newAffectation.date_debut),
                    date_fin: new Date(newAffectation.date_fin),
                    created_at: new Date(newAffectation.created_at),
                    updated_at: new Date(newAffectation.updated_at),
                  }
                  return [...prev, transformed].sort((a, b) => 
                    new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
                  )
                })
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                const updatedAffectation = payload.new as any
                setAffectations((prev) =>
                  prev.map((a) =>
                    a.id === updatedAffectation.id
                      ? {
                          ...a,
                          ...updatedAffectation,
                          date_debut: new Date(updatedAffectation.date_debut),
                          date_fin: new Date(updatedAffectation.date_fin),
                          updated_at: new Date(updatedAffectation.updated_at),
                        }
                      : a
                  )
                )
              } else if (payload.eventType === 'DELETE' && payload.old) {
                const deletedId = (payload.old as any).id
                setAffectations((prev) => prev.filter((a) => a.id !== deletedId))
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[useAffectations] Abonnement Realtime activé')
            }
          })

        channelRef.current = channel
      } catch (err) {
        console.error('[useAffectations] Erreur setup Realtime:', err)
      }
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      affaireDbIdRef.current = null
    }
  }, [enableRealtime, affaireId, site, competence, getSupabaseClient])

  useEffect(() => {
    if (affaireId && site) {
      loadAffectations()
      loadRessources()
    }
  }, [affaireId, site, competence, loadAffectations, loadRessources])

  // Vérifier si une ressource a une absence sur une période donnée
  const checkAbsence = useCallback(async (ressourceId: string, dateDebut: Date, dateFin: Date): Promise<Absence | null> => {
    try {
      const supabase = getSupabaseClient()

      // Normaliser les dates pour la comparaison
      const dateDebutStr = dateDebut.toISOString().split('T')[0]
      const dateFinStr = dateFin.toISOString().split('T')[0]

      // Chercher une absence qui chevauche avec la période d'affectation
      // Chevauchement : (absence.date_debut <= dateFin) AND (absence.date_fin >= dateDebut)
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('ressource_id', ressourceId)
        .lte('date_debut', dateFinStr) // absence.date_debut <= dateFin
        .gte('date_fin', dateDebutStr) // absence.date_fin >= dateDebut

      if (error) {
        console.error('[useAffectations] Erreur checkAbsence:', error)
        return null
      }

      // Retourner la première absence trouvée (s'il y en a plusieurs, on prend la première)
      if (data && data.length > 0) {
        const absence = data[0] as any
        return {
          ...absence,
          date_debut: absence.date_debut ? new Date(absence.date_debut) : new Date(),
          date_fin: absence.date_fin ? new Date(absence.date_fin) : new Date(),
          created_at: absence.created_at ? new Date(absence.created_at) : new Date(),
          updated_at: absence.updated_at ? new Date(absence.updated_at) : new Date(),
        } as Absence
      }

      return null
    } catch (err) {
      console.error('[useAffectations] Erreur checkAbsence:', err)
      return null
    }
  }, [])

  // Retirer automatiquement les affectations en conflit avec une absence
  const removeConflictingAffectations = useCallback(async (ressourceId: string, dateDebut: Date, dateFin: Date): Promise<void> => {
    try {
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .single()

      if (affaireError || !affaireData) {
        console.error('[useAffectations] Affaire introuvable pour retirer affectations:', affaireError)
        return
      }

      // Normaliser les dates pour la comparaison
      const dateDebutStr = dateDebut.toISOString().split('T')[0]
      const dateFinStr = dateFin.toISOString().split('T')[0]

      // Trouver toutes les affectations qui chevauchent avec la période d'absence
      // *** MODIFIÉ : Exclure les affectations avec force_weekend_ferie=true (forçage explicite) ***
      const { data: affectationsConflitRaw, error: queryError } = await supabase
        .from('affectations')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)
        .eq('ressource_id', ressourceId)
        .lte('date_debut', dateFinStr) // affectation.date_debut <= absence.dateFin
        .gte('date_fin', dateDebutStr) // affectation.date_fin >= absence.dateDebut
      
      if (queryError) {
        console.error('[useAffectations] Erreur recherche affectations conflit:', queryError)
        return
      }
      
      // Filtrer en JavaScript pour exclure les affectations avec force_weekend_ferie=true
      const affectationsConflit = (affectationsConflitRaw || []).filter((a: any) => 
        !a.force_weekend_ferie || a.force_weekend_ferie === false
      )

      if (queryError) {
        console.error('[useAffectations] Erreur recherche affectations conflit:', queryError)
        return
      }

      if (!affectationsConflit || affectationsConflit.length === 0) {
        return // Aucune affectation en conflit
      }

      // Supprimer toutes les affectations en conflit
      const affectationIds = affectationsConflit.map((a: any) => a.id)

      const { error: deleteError } = await supabase
        .from('affectations')
        .delete()
        .in('id', affectationIds)

      if (deleteError) {
        console.error('[useAffectations] Erreur suppression affectations conflit:', deleteError)
        return
      }

      console.log(`[useAffectations] ${affectationIds.length} affectation(s) retirée(s) automatiquement pour conflit avec absence`)

      // Mise à jour optimiste : supprimer de l'état local immédiatement
      setAffectations((prev) => prev.filter((a) => !affectationIds.includes(a.id)))

      // Recharger les affectations seulement si autoRefresh est activé ET Realtime est désactivé
      // Si Realtime est activé, les mises à jour sont gérées automatiquement par les événements postgres_changes
      if (autoRefresh && !enableRealtime) {
        await loadAffectations()
      }
    } catch (err) {
      console.error('[useAffectations] Erreur removeConflictingAffectations:', err)
    }
  }, [affaireId, site, autoRefresh, enableRealtime, loadAffectations, getSupabaseClient])

  const saveAffectation = useCallback(async (affectation: Partial<Affectation>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      // Vérifier si la ressource a une absence sur cette période
      // *** MODIFIÉ : Autoriser l'affectation si force_weekend_ferie=true (forçage explicite) ***
      if (affectation.ressource_id && affectation.date_debut && affectation.date_fin && !affectation.force_weekend_ferie) {
        const absence = await checkAbsence(
          affectation.ressource_id,
          affectation.date_debut instanceof Date ? affectation.date_debut : new Date(affectation.date_debut),
          affectation.date_fin instanceof Date ? affectation.date_fin : new Date(affectation.date_fin)
        )

        if (absence) {
          // Créer une alerte
          try {
            const { createClient: createClientAlerte } = await import('@/lib/supabase/client')
            const supabaseAlerte = createClientAlerte()

            // Récupérer l'ID de l'affaire pour l'alerte
            const { data: affaireDataAlerte } = await supabaseAlerte
              .from('affaires')
              .select('id')
              .eq('affaire_id', affaireId)
              .eq('site', site)
              .single()

            await supabaseAlerte
              .from('alertes')
              .insert({
                type_alerte: 'AFFECTATION_BLOQUEE_ABSENCE',
                ressource_id: affectation.ressource_id,
                affaire_id: affaireDataAlerte?.id,
                site: site,
                competence: affectation.competence,
                date_debut: affectation.date_debut instanceof Date 
                  ? affectation.date_debut.toISOString().split('T')[0]
                  : affectation.date_debut,
                date_fin: affectation.date_fin instanceof Date 
                  ? affectation.date_fin.toISOString().split('T')[0]
                  : affectation.date_fin,
                action: `Tentative d'affectation bloquée : ressource absente (${absence.type}) du ${new Date(absence.date_debut).toLocaleDateString('fr-FR')} au ${new Date(absence.date_fin).toLocaleDateString('fr-FR')}`,
                prise_en_compte: 'Non',
                date_action: new Date().toISOString(),
              })
          } catch (alerteErr) {
            console.error('[useAffectations] Erreur création alerte:', alerteErr)
          }

          // Bloquer l'affectation
          throw new Error(
            `Impossible d'affecter : la ressource est absente (${absence.type}) du ${new Date(absence.date_debut).toLocaleDateString('fr-FR')} au ${new Date(absence.date_fin).toLocaleDateString('fr-FR')}`
          )
        }
      }

      // Récupérer l'ID de l'affaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .maybeSingle()

      if (affaireError) {
        console.error('[useAffectations] Erreur recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      const affectationData = {
        ...affectation,
        affaire_id: affaireData.id,
        site,
      }

      const { data, error: upsertError } = await supabase
        .from('affectations')
        .upsert(affectationData)
        .select()
        .single()

      if (upsertError) throw upsertError

      // Mise à jour optimiste immédiate (pour que la checkbox se mette à jour instantanément)
      const affectationAvecDates = {
        ...data,
        date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
        date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      } as Affectation
      
      setAffectations((prev) => {
        const newAffectations = [...prev]
        // Chercher si une affectation existante a le même ID
        let index = newAffectations.findIndex((a) => a.id === affectationAvecDates.id)
        
        // Si pas trouvé par ID, chercher par ressource/compétence/dates (pour les nouvelles affectations)
        if (index < 0 && affectationData.ressource_id && affectationData.competence) {
          index = newAffectations.findIndex((a) => 
            a.ressource_id === affectationData.ressource_id &&
            a.competence === affectationData.competence &&
            Math.abs(new Date(a.date_debut).getTime() - new Date(affectationAvecDates.date_debut).getTime()) < 1000 &&
            Math.abs(new Date(a.date_fin).getTime() - new Date(affectationAvecDates.date_fin).getTime()) < 1000
          )
        }
        
        if (index >= 0) {
          newAffectations[index] = affectationAvecDates
        } else {
          newAffectations.push(affectationAvecDates)
        }
        return newAffectations
      })

      // Recharger les affectations seulement si autoRefresh est activé
      if (autoRefresh) {
        await loadAffectations()
      }

      return data as Affectation
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur saveAffectation:', err)
      throw err
    }
  }, [affaireId, site, loadAffectations, autoRefresh, enableRealtime])

  const deleteAffectation = useCallback(async (affectationId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('affectations')
        .delete()
        .eq('id', affectationId)

      if (deleteError) throw deleteError

      // Mise à jour optimiste : supprimer de l'état local immédiatement
      setAffectations((prev) => prev.filter((a) => a.id !== affectationId))

      // Recharger les affectations seulement si autoRefresh est activé ET Realtime est désactivé
      // Si Realtime est activé, les mises à jour sont gérées automatiquement par les événements postgres_changes
      if (autoRefresh && !enableRealtime) {
        await loadAffectations()
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur deleteAffectation:', err)
      throw err
    }
  }, [loadAffectations, autoRefresh, enableRealtime])

  // Fonction de consolidation des affectations (similaire à celle des périodes de charge)
  const consolidate = useCallback(async (competence?: string) => {
    try {
      setError(null)
      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .maybeSingle()

      if (affaireError) {
        console.error('[useAffectations] Erreur recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      // Charger toutes les affectations pour cette affaire/site (et compétence si spécifiée)
      let query = supabase
        .from('affectations')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)
        .order('ressource_id', { ascending: true })
        .order('competence', { ascending: true })
        .order('date_debut', { ascending: true })

      if (competence) {
        query = query.eq('competence', competence)
      }

      const { data: allAffectations, error: queryError } = await query

      if (queryError) throw queryError

      if (!allAffectations || allAffectations.length === 0) {
        await loadAffectations()
        return
      }

      // Grouper par ressource et compétence
      const affectationsParRessourceComp = new Map<string, typeof allAffectations>()
      allAffectations.forEach((a: any) => {
        const key = `${a.ressource_id}|${a.competence}`
        if (!affectationsParRessourceComp.has(key)) {
          affectationsParRessourceComp.set(key, [])
        }
        affectationsParRessourceComp.get(key)!.push(a)
      })

      // Pour chaque ressource/compétence, consolider les affectations
      for (const [key, affectationsResComp] of affectationsParRessourceComp.entries()) {
        // *** NOUVEAU : Séparer les affectations avec force_weekend_ferie=true (ne pas les consolider) ***
        const affectationsForcees: typeof allAffectations = []
        const affectationsNormales: typeof allAffectations = []

        affectationsResComp.forEach((a: any) => {
          if (a.force_weekend_ferie === true) {
            // Affectation forcée : la garder telle quelle (ligne séparée)
            affectationsForcees.push(a)
          } else {
            // Affectation normale : à consolider
            affectationsNormales.push(a)
          }
        })

        // *** NOUVEAU : Déplier jour par jour (jours ouvrés uniquement) SEULEMENT pour les affectations normales ***
        const joursParAffectation = new Map<string, number>() // Clé: date ISO (YYYY-MM-DD), Valeur: charge

        affectationsNormales.forEach((a: any) => {
          const dateDebut = new Date(a.date_debut)
          const dateFin = new Date(a.date_fin)
          const charge = a.charge || 0

          if (charge <= 0) return

          // Parcourir tous les jours de la période
          const currentDate = new Date(dateDebut)
          while (currentDate <= dateFin) {
            // Vérifier si c'est un jour ouvré (utiliser isBusinessDay qui gère week-ends et fériés)
            if (isBusinessDay(currentDate)) {
              const dateKey = currentDate.toISOString().split('T')[0] // Format YYYY-MM-DD
              // Si plusieurs affectations pour le même jour, prendre la charge maximale (pas d'addition)
              const chargeExistante = joursParAffectation.get(dateKey) || 0
              joursParAffectation.set(dateKey, Math.max(chargeExistante, charge))
            }

            currentDate.setDate(currentDate.getDate() + 1)
          }
        })

        // *** NOUVEAU : Vérifier s'il y a des affectations à traiter (normales OU forcées) ***
        const hasAffectationsNormales = joursParAffectation.size > 0
        const hasAffectationsForcees = affectationsForcees.length > 0

        if (!hasAffectationsNormales && !hasAffectationsForcees) {
          // Aucune affectation avec charge > 0, supprimer toutes les affectations de cette ressource/compétence
          for (const a of affectationsResComp) {
            await supabase.from('affectations').delete().eq('id', a.id)
          }
          continue
        }

        // Supprimer toutes les anciennes affectations de cette ressource/compétence
        for (const a of affectationsResComp) {
          await supabase.from('affectations').delete().eq('id', a.id)
        }

        // *** NOUVEAU : Recréer les affectations forcées telles quelles (lignes séparées) ***
        for (const affectationForcee of affectationsForcees) {
          const [ressourceId, comp] = key.split('|')
          await supabase.from('affectations').insert({
            affaire_id: affaireData.id,
            site,
            ressource_id: ressourceId,
            competence: comp,
            date_debut: normalizeDateToUTC(new Date(affectationForcee.date_debut)),
            date_fin: normalizeDateToUTC(new Date(affectationForcee.date_fin)),
            charge: affectationForcee.charge || 0,
            force_weekend_ferie: true, // Conserver le flag
          })
        }

        // *** NOUVEAU : Consolider SEULEMENT les affectations normales (sans force_weekend_ferie) ***
        if (hasAffectationsNormales) {
          // Trier les dates
          const datesTriees = Array.from(joursParAffectation.keys()).sort()

          // Regrouper les affectations consécutives avec la même charge
          const nouvellesAffectations: Array<{
            date_debut: Date
            date_fin: Date
            charge: number
          }> = []

          if (datesTriees.length > 0) {
            const [ressourceId, comp] = key.split('|')

            let affectationDebut = new Date(datesTriees[0] + 'T00:00:00')
            let affectationFin = new Date(datesTriees[0] + 'T00:00:00')
            let chargeActuelle = joursParAffectation.get(datesTriees[0])!

            for (let i = 1; i < datesTriees.length; i++) {
              const dateActuelle = new Date(datesTriees[i] + 'T00:00:00')
              const datePrecedente = new Date(datesTriees[i - 1] + 'T00:00:00')
              const chargeActuelleDate = joursParAffectation.get(datesTriees[i])!

              // Vérifier si la date actuelle est le jour suivant (consécutif)
              const jourSuivant = addDays(datePrecedente, 1)
              const isConsecutif = isSameDay(dateActuelle, jourSuivant)

              // Si consécutif (jour suivant) ET même charge, étendre la période
              if (isConsecutif && chargeActuelleDate === chargeActuelle) {
                affectationFin = dateActuelle
              } else {
                // Nouvelle affectation : sauvegarder l'ancienne
                nouvellesAffectations.push({
                  date_debut: affectationDebut,
                  date_fin: affectationFin,
                  charge: chargeActuelle,
                })

                // Commencer une nouvelle affectation
                affectationDebut = dateActuelle
                affectationFin = dateActuelle
                chargeActuelle = chargeActuelleDate
              }
            }

            // Ajouter la dernière affectation
            nouvellesAffectations.push({
              date_debut: affectationDebut,
              date_fin: affectationFin,
              charge: chargeActuelle,
            })

            // Créer les nouvelles affectations consolidées (sans force_weekend_ferie)
            for (const nouvelleAffectation of nouvellesAffectations) {
              await supabase.from('affectations').insert({
                affaire_id: affaireData.id,
                site,
                ressource_id: ressourceId,
                competence: comp,
                date_debut: normalizeDateToUTC(nouvelleAffectation.date_debut),
                date_fin: normalizeDateToUTC(nouvelleAffectation.date_fin),
                charge: nouvelleAffectation.charge,
                force_weekend_ferie: false, // Affectations normales
              })
            }
          }
        }
      }

      // Recharger les affectations après consolidation (même avec Realtime, car consolidation = opération complexe DELETE puis INSERT)
      // Realtime gère les INSERT individuels, mais pour la consolidation qui modifie beaucoup de lignes,
      // un refresh unique est plus efficace qu'un grand nombre d'événements Realtime
      await loadAffectations()
    } catch (err) {
      setError(err as Error)
      console.error('[useAffectations] Erreur consolidate:', err)
      throw err
    }
  }, [affaireId, site, loadAffectations])

  return {
    affectations,
    ressources,
    loading,
    error,
    saveAffectation,
    deleteAffectation,
    removeConflictingAffectations, // Exporter pour utilisation dans useAbsences
    refresh: loadAffectations,
    consolidate, // Exporter la fonction de consolidation
  }
}
