'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  const { createAlerte } = useAlertes()

  // Cache pour éviter les appels multiples
  const loadingRef = useRef(false)
  const lastOptionsRef = useRef<string>('')
  
  // Références stables pour les fonctions (évite les re-renders)
  const loadInterimsRef = useRef<((forceRefresh?: boolean) => Promise<void>) | null>(null)
  const verifierEtMettreAJourRenouvellementsRef = useRef<(() => Promise<{ updated: number; alertsCreated: number; initialized: number }>) | null>(null)
  
  // Mémoriser les options pour éviter les recréations
  const memoizedOptions = useMemo(() => options, [
    options.ressourceId,
    options.site,
    options.aRenouveler,
  ])
  
  // Créer une clé de cache pour les options
  const optionsKey = useMemo(() => 
    JSON.stringify({ 
      ressourceId: memoizedOptions.ressourceId || '', 
      site: memoizedOptions.site || '', 
      aRenouveler: memoizedOptions.aRenouveler || '' 
    }), 
    [memoizedOptions]
  )

  const getSupabaseClient = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }, [])

  /**
   * Charge les intérims depuis la table ressources (type_contrat='ETT')
   * Optimisé avec cache pour éviter les appels multiples
   */
  const loadInterims = useCallback(async (forceRefresh: boolean = false) => {
    // Éviter les appels multiples simultanés
    if (loadingRef.current && !forceRefresh) {
      console.log('[useInterims] loadInterims déjà en cours, ignoré')
      return
    }

    // Vérifier si les options ont changé
    if (lastOptionsRef.current === optionsKey && !forceRefresh) {
      console.log('[useInterims] Options identiques, chargement ignoré (cache)')
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Log des options pour débogage (seulement si changement)
      if (lastOptionsRef.current !== optionsKey) {
        console.log('[useInterims] loadInterims appelé avec options:', memoizedOptions)
        lastOptionsRef.current = optionsKey
      }

      // Charger directement depuis ressources avec type_contrat='ETT'
      let query = supabase
        .from('ressources')
        .select('*')
        .eq('type_contrat', 'ETT')
        .order('date_fin_contrat', { ascending: true, nullsFirst: false })

      if (memoizedOptions.ressourceId) {
        query = query.eq('id', memoizedOptions.ressourceId)
      }

      if (memoizedOptions.site) {
        query = query.eq('site', memoizedOptions.site)
      }

      if (memoizedOptions.aRenouveler) {
        query = query.eq('a_renouveler', memoizedOptions.aRenouveler)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error('[useInterims] Erreur requête Supabase:', queryError)
        throw queryError
      }

      console.log('[useInterims] Données récupérées:', data?.length || 0, 'ressource(s) ETT')

      // Convertir les ressources ETT en format Interim
      const interimsAvecDates = (data || []).map((ressource: {
        id: string
        nom: string
        site: string
        date_debut_contrat: string | null
        date_fin_contrat: string | null
        a_renouveler: string | null
        date_mise_a_jour_interim: string | null
        commentaire_interim: string | null
        actif: boolean | null
        created_at: string | null
        updated_at: string | null
      }) => ({
        id: ressource.id, // L'id de l'intérim = l'id de la ressource
        ressource_id: ressource.id, // Pour compatibilité avec le type Interim
        site: ressource.site || '',
        date_debut_contrat: ressource.date_debut_contrat ? new Date(ressource.date_debut_contrat) : new Date(),
        date_fin_contrat: ressource.date_fin_contrat ? new Date(ressource.date_fin_contrat) : new Date(),
        a_renouveler: ressource.a_renouveler || '',
        date_mise_a_jour: ressource.date_mise_a_jour_interim ? new Date(ressource.date_mise_a_jour_interim) : new Date(),
        commentaire: ressource.commentaire_interim || undefined,
        created_at: ressource.created_at ? new Date(ressource.created_at) : new Date(),
        updated_at: ressource.updated_at ? new Date(ressource.updated_at) : new Date(),
        ressource: {
          id: ressource.id,
          nom: ressource.nom,
          actif: ressource.actif || false,
        },
      })) as (Interim & { ressource: { id: string; nom: string; actif: boolean } | null })[]

      console.log('[useInterims] Intérims formatés:', interimsAvecDates.length)
      setInterims(interimsAvecDates)
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur:', err)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [memoizedOptions, optionsKey, getSupabaseClient])
  
  // Mettre à jour la référence quand loadInterims change
  useEffect(() => {
    loadInterimsRef.current = loadInterims
  }, [loadInterims])

  /**
   * Vérifie automatiquement les intérims et met à jour le statut "a_renouveler"
   * 10 jours ouvrés avant la date de fin
   * Initialise aussi le statut pour les intérims qui n'ont pas encore de statut défini
   */
  const verifierEtMettreAJourRenouvellements = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Calculer la date limite (10 jours ouvrés à partir d'aujourd'hui)
      let dateLimite = new Date(today)
      let joursOuvres = 0
      while (joursOuvres < 10) {
        dateLimite = nextBusinessDay(dateLimite)
        joursOuvres++
      }

      // Récupérer un peu plus large pour être sûr de ne rien manquer
      const dateLimiteLarge = new Date(dateLimite)
      dateLimiteLarge.setDate(dateLimiteLarge.getDate() + 7) // Ajouter 7 jours calendaires

      // Récupérer TOUTES les ressources ETT avec date_fin_contrat (pas seulement celles proches)
      // pour initialiser les statuts manquants
      const { data: toutesRessourcesETT, error: queryErrorAll } = await supabase
        .from('ressources')
        .select('*')
        .eq('type_contrat', 'ETT')
        .not('date_fin_contrat', 'is', null)
        .gte('date_fin_contrat', today.toISOString().split('T')[0])

      if (queryErrorAll) throw queryErrorAll

      // Récupérer aussi celles dans la fenêtre de renouvellement
      const { data: ressourcesETT, error: queryError } = await supabase
        .from('ressources')
        .select('*')
        .eq('type_contrat', 'ETT')
        .not('date_fin_contrat', 'is', null)
        .gte('date_fin_contrat', today.toISOString().split('T')[0])
        .lte('date_fin_contrat', dateLimiteLarge.toISOString().split('T')[0])

      if (queryError) throw queryError

      let updated = 0
      let alertsCreated = 0
      let initialized = 0

      // D'abord, initialiser les statuts manquants pour tous les intérims
      if (toutesRessourcesETT && toutesRessourcesETT.length > 0) {
        for (const ressource of toutesRessourcesETT) {
          // Si le statut est NULL ou vide, l'initialiser selon la date de fin
          if (!ressource.a_renouveler || ressource.a_renouveler.trim() === '') {
            const dateFin = new Date(ressource.date_fin_contrat)
            dateFin.setHours(0, 0, 0, 0)
            const joursRestants = businessDaysBetween(today, dateFin)

            let statutInitial = ''
            if (joursRestants <= 10 && joursRestants >= 0) {
              statutInitial = 'A renouveler'
            } else if (joursRestants < 0) {
              // Date passée mais pas encore désactivé
              statutInitial = 'A renouveler'
            } else {
              // Plus de 10 jours, statut vide (sera mis à jour automatiquement plus tard)
              statutInitial = ''
            }

            const { error: updateError } = await supabase
              .from('ressources')
              .update({ 
                a_renouveler: statutInitial,
                date_mise_a_jour_interim: new Date().toISOString(),
              })
              .eq('id', ressource.id)

            if (!updateError) {
              initialized++
              // Si on a mis "A renouveler", compter aussi comme updated
              if (statutInitial === 'A renouveler') {
                updated++
              }
            }
          }
        }
      }

      // Ensuite, traiter les intérims dans la fenêtre de renouvellement
      if (ressourcesETT && ressourcesETT.length > 0) {
        for (const ressource of ressourcesETT) {
          const dateFin = new Date(ressource.date_fin_contrat)
          dateFin.setHours(0, 0, 0, 0)

          // Calculer le nombre de jours ouvrés restants
          const joursRestants = businessDaysBetween(today, dateFin)

          // Si on est dans les 10 jours ouvrés avant la fin ET que a_renouveler n'est pas déjà "A renouveler"
          if (joursRestants <= 10 && joursRestants >= 0 && ressource.a_renouveler !== 'A renouveler') {
            // Mettre à jour le statut directement dans ressources
            const { error: updateError } = await supabase
              .from('ressources')
              .update({ 
                a_renouveler: 'A renouveler',
                date_mise_a_jour_interim: new Date().toISOString(),
              })
              .eq('id', ressource.id)

            if (updateError) {
              console.error(`[useInterims] Erreur mise à jour ressource ${ressource.id}:`, updateError)
              continue
            }

            updated++

            // Vérifier si une alerte existe déjà pour cette ressource
            const { data: alertesExistantes } = await supabase
              .from('alertes')
              .select('id')
              .eq('type_alerte', 'RENOUVELLEMENT_INTÉRIM')
              .eq('ressource_id', ressource.id)
              .eq('date_fin', ressource.date_fin_contrat)

            // Créer l'alerte seulement si elle n'existe pas déjà
            if (!alertesExistantes || alertesExistantes.length === 0) {
              try {
                await createAlerte({
                  type_alerte: 'RENOUVELLEMENT_INTÉRIM',
                  ressource_id: ressource.id,
                  site: ressource.site,
                  date_debut: dateFin,
                  date_fin: dateFin,
                  action: `Intérim de ${ressource.nom} à renouveler avant le ${dateFin.toLocaleDateString('fr-FR')} (${joursRestants} jour(s) ouvré(s) restant(s))`,
                  prise_en_compte: 'Non',
                })
                alertsCreated++
              } catch (alerteError) {
                console.error(`[useInterims] Erreur création alerte pour ressource ${ressource.id}:`, alerteError)
              }
            }
          }
        }
      }

      // Recharger les intérims après mise à jour (via ref pour éviter dépendance)
      if (loadInterimsRef.current) {
        await loadInterimsRef.current(true)
      }

      return { updated, alertsCreated, initialized }
    } catch (err) {
      console.error('[useInterims] Erreur verifierEtMettreAJourRenouvellements:', err)
      throw err
    }
  }, [getSupabaseClient, createAlerte]) // Retirer loadInterims des dépendances pour éviter les boucles
  
  // Mettre à jour la référence quand verifierEtMettreAJourRenouvellements change
  useEffect(() => {
    verifierEtMettreAJourRenouvellementsRef.current = verifierEtMettreAJourRenouvellements
  }, [verifierEtMettreAJourRenouvellements])

  /**
   * Désactive les intérims non renouvelés après la date de fin
   */
  const desactiverInterimsExpires = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Récupérer toutes les ressources ETT avec date_fin_contrat passée et a_renouveler != 'Oui'
      const { data: ressourcesETT, error: queryError } = await supabase
        .from('ressources')
        .select('*')
        .eq('type_contrat', 'ETT')
        .not('date_fin_contrat', 'is', null)
        .lt('date_fin_contrat', today.toISOString().split('T')[0])
        .neq('a_renouveler', 'Oui')
        .neq('a_renouveler', 'oui')

      if (queryError) throw queryError

      if (!ressourcesETT || ressourcesETT.length === 0) {
        return { desactivated: 0 }
      }

      let desactivated = 0

      for (const ressource of ressourcesETT) {
        // Désactiver la ressource si elle est encore active
        if (ressource.actif) {
          const { error: updateError } = await supabase
            .from('ressources')
            .update({ actif: false })
            .eq('id', ressource.id)

          if (updateError) {
            console.error(`[useInterims] Erreur désactivation ressource ${ressource.id}:`, updateError)
            continue
          }

          desactivated++
        }
      }

      // Recharger les intérims après désactivation (via ref pour éviter dépendance)
      if (loadInterimsRef.current) {
        await loadInterimsRef.current(true)
      }

      return { desactivated }
    } catch (err) {
      console.error('[useInterims] Erreur desactiverInterimsExpires:', err)
      throw err
    }
  }, [getSupabaseClient]) // Retirer loadInterims pour éviter les boucles

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

  /**
   * Crée ou met à jour un intérim (met à jour directement la ressource)
   */
  const createInterim = useCallback(async (interim: Partial<Interim>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      // Si ressource_id est fourni, mettre à jour la ressource existante
      if (interim.ressource_id) {
        const updateData: {
          date_debut_contrat?: string
          date_fin_contrat?: string
          a_renouveler?: string
          date_mise_a_jour_interim: string
          commentaire_interim?: string | null
          site?: string
        } = {
          date_debut_contrat: interim.date_debut_contrat instanceof Date 
            ? interim.date_debut_contrat.toISOString().split('T')[0]
            : interim.date_debut_contrat,
          date_fin_contrat: interim.date_fin_contrat instanceof Date 
            ? interim.date_fin_contrat.toISOString().split('T')[0]
            : interim.date_fin_contrat,
          a_renouveler: interim.a_renouveler || '',
          date_mise_a_jour_interim: new Date().toISOString(),
          commentaire_interim: interim.commentaire || null,
        }

        // Mettre à jour le site si fourni
        if (interim.site) {
          updateData.site = interim.site
        }

        const { data, error: updateError } = await supabase
          .from('ressources')
          .update(updateData)
          .eq('id', interim.ressource_id)
          .select()
          .single()

        if (updateError) throw updateError

        // Vérifier automatiquement les renouvellements après mise à jour (via ref)
        if (verifierEtMettreAJourRenouvellementsRef.current) {
          verifierEtMettreAJourRenouvellementsRef.current().catch(err => {
            console.error('[useInterims] Erreur vérification après création:', err)
          })
        }
        
        // Recharger les intérims (forcer le refresh via ref)
        if (loadInterimsRef.current) {
          await loadInterimsRef.current(true)
        }

        // Convertir en format Interim
        return {
          id: data.id,
          ressource_id: data.id,
          site: data.site,
          date_debut_contrat: data.date_debut_contrat ? new Date(data.date_debut_contrat) : new Date(),
          date_fin_contrat: data.date_fin_contrat ? new Date(data.date_fin_contrat) : new Date(),
          a_renouveler: data.a_renouveler || '',
          date_mise_a_jour: data.date_mise_a_jour_interim ? new Date(data.date_mise_a_jour_interim) : new Date(),
          commentaire: data.commentaire_interim || undefined,
          created_at: data.created_at ? new Date(data.created_at) : new Date(),
          updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
        } as Interim
      } else {
        throw new Error('ressource_id est requis pour créer/mettre à jour un intérim')
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur createInterim:', err)
      throw err
    }
  }, [getSupabaseClient]) // Retirer loadInterims et verifierEtMettreAJourRenouvellements pour éviter les boucles

  /**
   * Met à jour un intérim (met à jour directement la ressource)
   */
  const updateInterim = useCallback(async (interimId: string, updates: Partial<Interim>) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      const updateData: {
        date_mise_a_jour_interim: string
        site?: string
        date_debut_contrat?: string
        date_fin_contrat?: string
        a_renouveler?: string
        commentaire_interim?: string | null
      } = {
        date_mise_a_jour_interim: new Date().toISOString(),
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
          // Récupérer la ressource actuelle pour obtenir les informations nécessaires
          const interim = interims.find((i) => i.id === interimId)
          if (interim) {
            await supprimerAlertesRenouvellement(interim.ressource_id, interim.date_fin_contrat)
          } else {
            // Si l'intérim n'est pas dans la liste, le récupérer depuis Supabase
            const { data: ressourceData, error: fetchError } = await supabase
              .from('ressources')
              .select('id, date_fin_contrat')
              .eq('id', interimId)
              .single()
            
            if (!fetchError && ressourceData && ressourceData.date_fin_contrat) {
              const dateFin = new Date(ressourceData.date_fin_contrat)
              await supprimerAlertesRenouvellement(ressourceData.id, dateFin)
            }
          }
        }
      }

      if (updates.commentaire !== undefined) {
        updateData.commentaire_interim = updates.commentaire || null
      }

      const { data, error: updateError } = await supabase
        .from('ressources')
        .update(updateData)
        .eq('id', interimId)
        .select()
        .single()

      if (updateError) throw updateError

      // Vérifier automatiquement les renouvellements après mise à jour (via ref)
      if (verifierEtMettreAJourRenouvellementsRef.current) {
        verifierEtMettreAJourRenouvellementsRef.current().catch(err => {
          console.error('[useInterims] Erreur vérification après mise à jour:', err)
        })
      }
      
      // Recharger les intérims (forcer le refresh via ref)
      if (loadInterimsRef.current) {
        await loadInterimsRef.current(true)
      }

      // Convertir en format Interim
      return {
        id: data.id,
        ressource_id: data.id,
        site: data.site,
        date_debut_contrat: data.date_debut_contrat ? new Date(data.date_debut_contrat) : new Date(),
        date_fin_contrat: data.date_fin_contrat ? new Date(data.date_fin_contrat) : new Date(),
        a_renouveler: data.a_renouveler || '',
        date_mise_a_jour: data.date_mise_a_jour_interim ? new Date(data.date_mise_a_jour_interim) : new Date(),
        commentaire: data.commentaire_interim || undefined,
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      } as Interim
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur updateInterim:', err)
      throw err
    }
  }, [getSupabaseClient, interims, supprimerAlertesRenouvellement]) // Retirer loadInterims et verifierEtMettreAJourRenouvellements pour éviter les boucles

  /**
   * Supprime un intérim (réinitialise les colonnes d'intérim dans la ressource)
   */
  const deleteInterim = useCallback(async (interimId: string) => {
    try {
      setError(null)

      const supabase = getSupabaseClient()

      // Réinitialiser les colonnes d'intérim (mais garder la ressource)
      const { error: updateError } = await supabase
        .from('ressources')
        .update({
          a_renouveler: null,
          date_mise_a_jour_interim: null,
          commentaire_interim: null,
        })
        .eq('id', interimId)

      if (updateError) throw updateError

      // Recharger les intérims
      await loadInterims(true)
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur deleteInterim:', err)
      throw err
    }
  }, [getSupabaseClient]) // Retirer loadInterims pour éviter les boucles

  /**
   * Initialise les intérims depuis les ressources ETT
   * Cette fonction n'est plus vraiment nécessaire car les données sont déjà dans ressources
   * Mais on peut l'utiliser pour initialiser les colonnes a_renouveler, date_mise_a_jour_interim, etc.
   */
  const initialiserInterims = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const supabase = getSupabaseClient()

      // Récupérer toutes les ressources ETT
      const { data: ressourcesETT, error: ressourcesError } = await supabase
        .from('ressources')
        .select('id, nom, site, date_fin_contrat, actif, a_renouveler, date_mise_a_jour_interim')
        .eq('type_contrat', 'ETT')

      if (ressourcesError) throw ressourcesError

      if (!ressourcesETT || ressourcesETT.length === 0) {
        console.log('[useInterims] Aucune ressource ETT trouvée')
        await loadInterims(true)
        return { created: 0, updated: 0 }
      }

      let nbMisesAJour = 0

      // Initialiser les colonnes d'intérim si elles sont vides
      // Calculer le statut initial selon la date de fin de contrat
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const ressource of ressourcesETT) {
        const needsUpdate = !ressource.a_renouveler || ressource.a_renouveler.trim() === ''

        if (needsUpdate && ressource.date_fin_contrat) {
          const dateFin = new Date(ressource.date_fin_contrat)
          dateFin.setHours(0, 0, 0, 0)
          
          // Calculer le nombre de jours ouvrés restants
          const joursRestants = businessDaysBetween(today, dateFin)
          
          // Déterminer le statut initial
          let statutInitial = ''
          if (joursRestants <= 10 && joursRestants >= 0) {
            statutInitial = 'A renouveler'
          } else if (joursRestants < 0) {
            // Date passée
            statutInitial = 'A renouveler'
          } else {
            // Plus de 10 jours, laisser vide (sera mis à jour automatiquement plus tard)
            statutInitial = ''
          }

          const { error: updateError } = await supabase
            .from('ressources')
            .update({
              a_renouveler: statutInitial,
              date_mise_a_jour_interim: new Date().toISOString(),
              commentaire_interim: `Initialisé depuis la ressource ${ressource.nom}`,
            })
            .eq('id', ressource.id)

          if (!updateError) {
            nbMisesAJour++
          }
        }
      }

      // Recharger les intérims (forcer le refresh via ref)
      if (loadInterimsRef.current) {
        await loadInterimsRef.current(true)
      }

      return { created: 0, updated: nbMisesAJour }
    } catch (err) {
      setError(err as Error)
      console.error('[useInterims] Erreur initialiserInterims:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getSupabaseClient]) // Retirer loadInterims pour éviter les boucles

  // Charger les intérims au montage et vérifier automatiquement les renouvellements
  // Utiliser optionsKey au lieu de loadInterims pour éviter les re-renders
  useEffect(() => {
    let isMounted = true
    let verificationInProgress = false
    
    const loadAndVerify = async () => {
      // Charger les intérims (via ref)
      if (loadInterimsRef.current) {
        await loadInterimsRef.current(true)
      }
      
      if (!isMounted) return
      
      // Vérifier automatiquement les renouvellements après chargement initial
      // pour initialiser les statuts "Non défini"
      // Utiliser un flag pour éviter les appels multiples simultanés
      if (!verificationInProgress && verifierEtMettreAJourRenouvellementsRef.current) {
        verificationInProgress = true
        try {
          await verifierEtMettreAJourRenouvellementsRef.current()
        } catch (err) {
          console.error('[useInterims] Erreur vérification automatique:', err)
        } finally {
          verificationInProgress = false
        }
      }
    }
    
    loadAndVerify()
    
    return () => {
      isMounted = false
    }
  }, [optionsKey]) // Utiliser optionsKey au lieu de loadInterims pour éviter les boucles

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
