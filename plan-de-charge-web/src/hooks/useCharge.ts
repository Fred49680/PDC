'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeDateToUTC, isBusinessDay, getDatesBetween } from '@/utils/calendar'
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
      // Utiliser .ilike() pour une recherche insensible à la casse si nécessaire
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .maybeSingle()

      if (affaireError) {
        console.error('[useCharge] Erreur recherche affaire:', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      const { data, error: queryError } = await supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)
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
    
    const setupRealtime = async () => {
      try {
        const { data: affaireData } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireId)
          .eq('site', site)
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
        console.error('[useCharge] Erreur recherche affaire (savePeriode):', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      // *** NORMALISER LES DATES À MINUIT UTC pour éviter les problèmes de timezone ***
      // Créer un objet propre en évitant le spread qui peut propager des valeurs invalides
      const periodeData: any = {
        affaire_id: affaireData.id,
        site,
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
        if (value === true || value === 'true' || value === 1 || value === '1') return true
        if (value === false || value === 'false' || value === 0 || value === '0') return false
        // Si undefined, null, ou chaîne vide, retourner false par défaut
        return false
      }
      
      // Créer un objet propre avec uniquement les champs nécessaires et correctement formatés
      // Cela évite de propager des valeurs invalides via le spread
      const periodeDataClean: any = {
        affaire_id: periodeData.affaire_id,
        site: periodeData.site,
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
      
      // Log pour debug - vérifier qu'il n'y a pas de chaînes vides dans les booléens
      console.log('[useCharge] periodeDataClean avant upsert:', JSON.stringify(periodeDataClean, null, 2))
      
      // Vérifier et nettoyer toutes les propriétés pour s'assurer qu'il n'y a pas de chaînes vides
      Object.keys(periodeDataClean).forEach((key) => {
        const value = periodeDataClean[key]
        // Si c'est un boolean et que la valeur est une chaîne vide, la remplacer par false
        if (typeof value === 'string' && value === '' && (key.includes('boolean') || key === 'force_weekend_ferie')) {
          console.warn(`[useCharge] Chaîne vide détectée pour ${key}, remplacement par false`)
          periodeDataClean[key] = false
        }
      })
      
      // Si on a un ID, essayer un UPDATE direct
      if (periodeDataClean.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('periodes_charge')
          .update(periodeDataClean)
          .eq('id', periodeDataClean.id)
          .select()
          .single()
        
        if (!updateError) {
          data = updateData
        } else {
          // Si l'UPDATE échoue, essayer l'upsert
          const { data: upsertData, error: upsertErr } = await supabase
            .from('periodes_charge')
            .upsert(periodeDataClean, {
              onConflict: 'affaire_id,site,competence,date_debut,date_fin',
            })
            .select()
            .single()
          
          data = upsertData
          upsertError = upsertErr
        }
      } else {
        // Pas d'ID, essayer l'upsert directement
        const { data: upsertData, error: upsertErr } = await supabase
          .from('periodes_charge')
          .upsert(periodeDataClean, {
            onConflict: 'affaire_id,site,competence,date_debut,date_fin',
          })
          .select()
          .single()
        
        data = upsertData
        upsertError = upsertErr
      }

      // Si erreur 409 (conflict) ou 400 (bad request), essayer de récupérer la période existante et la mettre à jour
      if (upsertError && (
        upsertError.code === '23505' || 
        upsertError.code === 'PGRST116' || 
        upsertError.code === 'PGRST301' ||
        upsertError.status === 400 ||
        upsertError.status === 409
      )) {
        // Erreur de contrainte unique ou requête invalide : chercher la période existante
        const { data: existingData, error: findError } = await supabase
          .from('periodes_charge')
          .select('*')
          .eq('affaire_id', periodeDataClean.affaire_id)
          .eq('site', periodeDataClean.site)
          .eq('competence', periodeDataClean.competence)
          .eq('date_debut', periodeDataClean.date_debut)
          .eq('date_fin', periodeDataClean.date_fin)
          .single()
        
        if (!findError && existingData) {
          // Mettre à jour la période existante
          const { data: updateData, error: updateError } = await supabase
            .from('periodes_charge')
            .update({
              nb_ressources: periodeDataClean.nb_ressources,
              force_weekend_ferie: periodeDataClean.force_weekend_ferie,
            })
            .eq('id', existingData.id)
            .select()
            .single()
          
          if (updateError) {
            console.error('[useCharge] Erreur update après conflict:', updateError)
            throw updateError
          }
          data = updateData
        } else {
          console.error('[useCharge] Erreur upsert et période non trouvée:', upsertError)
          throw upsertError
        }
      } else if (upsertError) {
        console.error('[useCharge] Erreur upsert:', upsertError)
        throw upsertError
      }

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
        await loadPeriodes()
      }

      return periodeAvecDates
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur savePeriode:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes, autoRefresh, enableRealtime])

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
  }, [loadPeriodes, autoRefresh, enableRealtime])

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
        console.error('[useCharge] Erreur recherche affaire (savePeriode):', affaireError)
        throw new Error(`Erreur lors de la recherche de l'affaire ${affaireId} / ${site}: ${affaireError.message}`)
      }
      
      if (!affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      // Charger toutes les périodes pour cette affaire/site (et compétence si spécifiée)
      let query = supabase
        .from('periodes_charge')
        .select('*')
        .eq('affaire_id', affaireData.id)
        .eq('site', site)
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
            site,
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
              site,
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
    deletePeriode,
    consolidate,
    refresh: loadPeriodes,
  }
}
