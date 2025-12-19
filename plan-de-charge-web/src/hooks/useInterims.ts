'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Interim } from '@/types/interims'
import { businessDaysBetween, nextBusinessDay } from '@/utils/calendar'
import { useAlertes } from './useAlertes'

interface UseInterimsOptions {
  ressourceId?: string
  site?: string
  aRenouveler?: string
}

export function useInterims(options: UseInterimsOptions = {}) {
  const [interims, setInterims] = useState<Interim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { createAlerte, deleteAlerte } = useAlertes()

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  const loadInterims = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Log des options pour débogage
      console.log('[useInterims] loadInterims appelé avec options:', options)

      let query = supabase
        .from('interims')
        .select(`
          *,
          ressources:ressource_id (
            id,
            nom,
            actif
          )
        `)
        .order('date_fin_contrat', { ascending: true })

      if (options.ressourceId) {
        query = query.eq('ressource_id', options.ressourceId)
      }

      if (options.site) {
        query = query.eq('site', options.site)
      }

      if (options.aRenouveler) {
        query = query.eq('a_renouveler', options.aRenouveler)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error('[useInterims] Erreur requête Supabase:', queryError)
        throw queryError
      }

      console.log('[useInterims] Données récupérées:', data?.length || 0, 'intérim(s)')

      // Convertir les dates
      const interimsAvecDates = (data || []).map((item: any) => {
        // Gérer le cas où la jointure avec ressources échoue (ressource supprimée)
        let ressourceInfo = null
        if (item.ressources) {
          // Si ressources est un tableau (relation 1-n), prendre le premier élément
          const ressource = Array.isArray(item.ressources) ? item.ressources[0] : item.ressources
          if (ressource) {
            ressourceInfo = {
              id: ressource.id,
              nom: ressource.nom,
              actif: ressource.actif,
            }
          }
        }

        return {
          id: item.id,
          ressource_id: item.ressource_id,
          site: item.site,
          date_debut_contrat: item.date_debut_contrat ? new Date(item.date_debut_contrat) : new Date(),
          date_fin_contrat: item.date_fin_contrat ? new Date(item.date_fin_contrat) : new Date(),
          a_renouveler: item.a_renouveler || '',
          date_mise_a_jour: item.date_mise_a_jour ? new Date(item.date_mise_a_jour) : new Date(),
          commentaire: item.commentaire || undefined,
          created_at: item.created_at ? new Date(item.created_at) : new Date(),
          updated_at: item.updated_at ? new Date(item.updated_at) : new Date(),
          ressource: ressourceInfo,
        }
      }) as (Interim & { ressource: { id: string; nom: string; actif: boolean } | null })[]

      console.log('[useInterims] Intérims formatés:', interimsAvecDates.length)
      setInterims(interimsAvecDates as any)
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur:', err)
    } finally {
      setLoading(false)
    }
  }, [options.ressourceId, options.site, options.aRenouveler, getSupabaseClient])

  useEffect(() => {
    loadInterims()
  }, [loadInterims])

  /**
   * Vérifie automatiquement les intérims et met à jour le statut "a_renouveler"
   * 10 jours ouvrés avant la date de fin
   */
  const verifierEtMettreAJourRenouvellements = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculer la date limite (10 jours ouvrés à partir d'aujourd'hui)
      // On va chercher les intérims qui expirent dans les 10 prochains jours ouvrés
      // Pour cela, on calcule une date limite approximative (aujourd'hui + 14 jours calendaires pour couvrir 10 jours ouvrés)
      let dateLimite = new Date(today)
      let joursOuvres = 0
      while (joursOuvres < 10) {
        dateLimite = nextBusinessDay(dateLimite)
        joursOuvres++
      }

      // Récupérer tous les intérims avec date_fin_contrat entre aujourd'hui et la date limite
      // On récupère un peu plus large pour être sûr de ne rien manquer
      const dateLimiteLarge = new Date(dateLimite)
      dateLimiteLarge.setDate(dateLimiteLarge.getDate() + 7) // Ajouter 7 jours calendaires pour être sûr

      const { data: interimsAVerifier, error: queryError } = await supabase
        .from('interims')
        .select('*')
        .gte('date_fin_contrat', today.toISOString().split('T')[0])
        .lte('date_fin_contrat', dateLimiteLarge.toISOString().split('T')[0])

      if (queryError) throw queryError

      if (!interimsAVerifier || interimsAVerifier.length === 0) {
        return { updated: 0, alertsCreated: 0 }
      }

      let updated = 0
      let alertsCreated = 0

      for (const interim of interimsAVerifier) {
        const dateFin = new Date(interim.date_fin_contrat)
        dateFin.setHours(0, 0, 0, 0)

        // Calculer le nombre de jours ouvrés restants
        const joursRestants = businessDaysBetween(today, dateFin)

        // Si on est dans les 10 jours ouvrés avant la fin ET que a_renouveler n'est pas déjà "A renouveler"
        if (joursRestants <= 10 && joursRestants >= 0 && interim.a_renouveler !== 'A renouveler') {
          // Mettre à jour le statut
          const { error: updateError } = await supabase
            .from('interims')
            .update({ 
              a_renouveler: 'A renouveler',
              date_mise_a_jour: new Date().toISOString(),
            })
            .eq('id', interim.id)

          if (updateError) {
            console.error(`[useInterims] Erreur mise à jour interim ${interim.id}:`, updateError)
            continue
          }

          updated++

          // Récupérer les informations de la ressource pour créer l'alerte
          const { data: ressource, error: ressourceError } = await supabase
            .from('ressources')
            .select('nom')
            .eq('id', interim.ressource_id)
            .single()

          if (!ressourceError && ressource) {
            // Vérifier si une alerte existe déjà pour cet intérim
            const { data: alertesExistantes } = await supabase
              .from('alertes')
              .select('id')
              .eq('type_alerte', 'RENOUVELLEMENT_INTÉRIM')
              .eq('ressource_id', interim.ressource_id)
              .eq('date_fin', interim.date_fin_contrat)

            // Créer l'alerte seulement si elle n'existe pas déjà
            if (!alertesExistantes || alertesExistantes.length === 0) {
              try {
                await createAlerte({
                  type_alerte: 'RENOUVELLEMENT_INTÉRIM',
                  ressource_id: interim.ressource_id,
                  site: interim.site,
                  date_debut: dateFin,
                  date_fin: dateFin,
                  action: `Intérim de ${ressource.nom} à renouveler avant le ${dateFin.toLocaleDateString('fr-FR')} (${joursRestants} jour(s) ouvré(s) restant(s))`,
                  prise_en_compte: 'Non',
                })
                alertsCreated++
              } catch (alerteError) {
                console.error(`[useInterims] Erreur création alerte pour interim ${interim.id}:`, alerteError)
              }
            }
          }
        }
      }

      // Recharger les intérims après mise à jour
      await loadInterims()

      return { updated, alertsCreated }
    } catch (err) {
      console.error('[useInterims] Erreur verifierEtMettreAJourRenouvellements:', err)
      throw err
    }
  }, [getSupabaseClient, createAlerte, loadInterims])

  /**
   * Désactive les intérims non renouvelés après la date de fin
   */
  const desactiverInterimsExpires = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Récupérer tous les intérims avec date_fin_contrat passée et a_renouveler != 'Oui'
      const { data: interimsExpires, error: queryError } = await supabase
        .from('interims')
        .select('*, ressources:ressource_id (id, actif)')
        .lt('date_fin_contrat', today.toISOString().split('T')[0])
        .neq('a_renouveler', 'Oui')
        .neq('a_renouveler', 'oui')

      if (queryError) throw queryError

      if (!interimsExpires || interimsExpires.length === 0) {
        return { desactivated: 0 }
      }

      let desactivated = 0

      for (const interim of interimsExpires) {
        // Désactiver la ressource associée
        if (interim.ressources && interim.ressources.actif) {
          const { error: updateError } = await supabase
            .from('ressources')
            .update({ actif: false })
            .eq('id', interim.ressource_id)

          if (updateError) {
            console.error(`[useInterims] Erreur désactivation ressource ${interim.ressource_id}:`, updateError)
            continue
          }

          desactivated++
        }
      }

      // Recharger les intérims après désactivation
      await loadInterims()

      return { desactivated }
    } catch (err) {
      console.error('[useInterims] Erreur desactiverInterimsExpires:', err)
      throw err
    }
  }, [getSupabaseClient, loadInterims])

  /**
   * Supprime les alertes de renouvellement quand un intérim est renouvelé
   */
  const supprimerAlertesRenouvellement = useCallback(async (ressourceId: string, dateFinContrat: Date) => {
    try {
      const supabase = getSupabaseClient()

      // Formater la date au format ISO (YYYY-MM-DD)
      const dateFinFormatted = dateFinContrat.toISOString().split('T')[0]

      // Supprimer les alertes de renouvellement pour cette ressource et cette date
      const { error: deleteError } = await supabase
        .from('alertes')
        .delete()
        .eq('type_alerte', 'RENOUVELLEMENT_INTÉRIM')
        .eq('ressource_id', ressourceId)
        .eq('date_fin', dateFinFormatted)

      if (deleteError) {
        console.error('[useInterims] Erreur suppression alertes:', deleteError)
        throw deleteError
      }
    } catch (err) {
      console.error('[useInterims] Erreur supprimerAlertesRenouvellement:', err)
      throw err
    }
  }, [getSupabaseClient])

  const createInterim = useCallback(async (interim: Partial<Interim>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const interimData: any = {
        ressource_id: interim.ressource_id,
        site: interim.site,
        date_debut_contrat: interim.date_debut_contrat instanceof Date 
          ? interim.date_debut_contrat.toISOString().split('T')[0]
          : interim.date_debut_contrat,
        date_fin_contrat: interim.date_fin_contrat instanceof Date 
          ? interim.date_fin_contrat.toISOString().split('T')[0]
          : interim.date_fin_contrat,
        a_renouveler: interim.a_renouveler || 'A renouveler',
        commentaire: interim.commentaire || null,
      }

      const { data, error: insertError } = await supabase
        .from('interims')
        .insert(interimData)
        .select()
        .single()

      if (insertError) throw insertError

      // Vérifier automatiquement les renouvellements après création
      await verifierEtMettreAJourRenouvellements()

      // Recharger les intérims
      await loadInterims()

      return data as Interim
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur createInterim:', err)
      throw err
    }
  }, [getSupabaseClient, loadInterims, verifierEtMettreAJourRenouvellements])

  const updateInterim = useCallback(async (interimId: string, updates: Partial<Interim>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const updateData: any = {
        date_mise_a_jour: new Date().toISOString(),
      }

      if (updates.site !== undefined) {
        updateData.site = updates.site
      }

      if (updates.date_debut_contrat !== undefined) {
        updateData.date_debut_contrat = updates.date_debut_contrat instanceof Date 
          ? updates.date_debut_contrat.toISOString().split('T')[0]
          : updates.date_debut_contrat
      }

      if (updates.date_fin_contrat !== undefined) {
        updateData.date_fin_contrat = updates.date_fin_contrat instanceof Date 
          ? updates.date_fin_contrat.toISOString().split('T')[0]
          : updates.date_fin_contrat
      }

      if (updates.a_renouveler !== undefined) {
        updateData.a_renouveler = updates.a_renouveler

        // Si le statut passe à "Oui" (renouvelé), supprimer les alertes
        if (updates.a_renouveler === 'Oui' || updates.a_renouveler === 'oui') {
          // Récupérer l'intérim actuel pour obtenir les informations nécessaires
          const interim = interims.find((i: any) => i.id === interimId)
          if (interim) {
            await supprimerAlertesRenouvellement(interim.ressource_id, interim.date_fin_contrat)
          } else {
            // Si l'intérim n'est pas dans la liste, le récupérer depuis Supabase
            const { data: interimData, error: fetchError } = await supabase
              .from('interims')
              .select('ressource_id, date_fin_contrat')
              .eq('id', interimId)
              .single()
            
            if (!fetchError && interimData) {
              const dateFin = new Date(interimData.date_fin_contrat)
              await supprimerAlertesRenouvellement(interimData.ressource_id, dateFin)
            }
          }
        }
      }

      if (updates.commentaire !== undefined) {
        updateData.commentaire = updates.commentaire || null
      }

      const { data, error: updateError } = await supabase
        .from('interims')
        .update(updateData)
        .eq('id', interimId)
        .select()
        .single()

      if (updateError) throw updateError

      // Vérifier automatiquement les renouvellements après mise à jour
      await verifierEtMettreAJourRenouvellements()

      // Recharger les intérims
      await loadInterims()

      return data as Interim
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur updateInterim:', err)
      throw err
    }
  }, [getSupabaseClient, loadInterims, interims, supprimerAlertesRenouvellement, verifierEtMettreAJourRenouvellements])

  const deleteInterim = useCallback(async (interimId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const { error: deleteError } = await supabase
        .from('interims')
        .delete()
        .eq('id', interimId)

      if (deleteError) throw deleteError

      // Recharger les intérims
      await loadInterims()
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur deleteInterim:', err)
      throw err
    }
  }, [getSupabaseClient, loadInterims])

  /**
   * Initialise les intérims depuis les ressources ETT
   * Crée une entrée dans la table interims pour chaque ressource avec type_contrat='ETT'
   */
  const initialiserInterims = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const supabase = getSupabaseClient()

      // 1. Récupérer toutes les ressources ETT (actives et inactives)
      const { data: ressourcesETT, error: ressourcesError } = await supabase
        .from('ressources')
        .select('id, nom, site, date_fin_contrat, actif')
        .eq('type_contrat', 'ETT')

      if (ressourcesError) throw ressourcesError

      if (!ressourcesETT || ressourcesETT.length === 0) {
        console.log('[useInterims] Aucune ressource ETT trouvée')
        await loadInterims()
        return { created: 0, updated: 0 }
      }

      // 2. Récupérer les intérims existants pour éviter les doublons
      const { data: interimsExistants, error: interimsError } = await supabase
        .from('interims')
        .select('ressource_id')

      if (interimsError) throw interimsError

      const ressourceIdsExistants = new Set(
        (interimsExistants || []).map((i: any) => i.ressource_id)
      )

      // 3. Créer les intérims manquants
      let nbCrees = 0
      let nbMisesAJour = 0

      for (const ressource of ressourcesETT) {
        const ressourceId = ressource.id

        // Vérifier si un intérim existe déjà pour cette ressource
        if (ressourceIdsExistants.has(ressourceId)) {
          // Mettre à jour la date_fin_contrat si elle a changé
          const { data: interimExistant, error: fetchError } = await supabase
            .from('interims')
            .select('id, date_fin_contrat')
            .eq('ressource_id', ressourceId)
            .single()

          if (!fetchError && interimExistant) {
            const dateFinRessource = ressource.date_fin_contrat
              ? new Date(ressource.date_fin_contrat).toISOString().split('T')[0]
              : null

            // Si la date de fin a changé, mettre à jour
            if (dateFinRessource && interimExistant.date_fin_contrat !== dateFinRessource) {
              const { error: updateError } = await supabase
                .from('interims')
                .update({
                  date_fin_contrat: dateFinRessource,
                  date_mise_a_jour: new Date().toISOString(),
                })
                .eq('id', interimExistant.id)

              if (!updateError) {
                nbMisesAJour++
              }
            }
          }
          continue
        }

        // Créer un nouvel intérim
        const dateFinContrat = ressource.date_fin_contrat
          ? new Date(ressource.date_fin_contrat).toISOString().split('T')[0]
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 jours par défaut

        const { error: createError } = await supabase
          .from('interims')
          .insert({
            ressource_id: ressourceId,
            site: ressource.site || '',
            date_debut_contrat: new Date().toISOString().split('T')[0], // Date du jour par défaut
            date_fin_contrat: dateFinContrat,
            a_renouveler: '',
            date_mise_a_jour: new Date().toISOString(),
            commentaire: `Initialisé depuis la ressource ${ressource.nom}`,
          })

        if (createError) {
          console.error(`[useInterims] Erreur création intérim pour ${ressource.nom}:`, createError)
        } else {
          nbCrees++
        }
      }

      // 4. Recharger les intérims
      await loadInterims()

      return { created: nbCrees, updated: nbMisesAJour }
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur initialiserInterims:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getSupabaseClient, loadInterims])

  return {
    interims,
    loading,
    error,
    createInterim,
    updateInterim,
    deleteInterim,
    refresh: loadInterims,
    verifierEtMettreAJourRenouvellements,
    desactiverInterimsExpires,
    initialiserInterims,
  }
}
