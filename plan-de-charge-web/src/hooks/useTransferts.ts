'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transfert, CreateTransfertInput, UpdateTransfertInput } from '@/types/transferts'
import { useAlertes } from './useAlertes'

interface UseTransfertsOptions {
  ressourceId?: string
  siteOrigine?: string
  siteDestination?: string
  statut?: 'Planifié' | 'Appliqué'
}

export function useTransferts(options: UseTransfertsOptions = {}) {
  const [transferts, setTransferts] = useState<Transfert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { createAlerte } = useAlertes()

  // Cache pour éviter les appels multiples
  const loadingRef = useRef(false)
  const lastOptionsRef = useRef<string>('')
  
  // Références stables pour les fonctions (évite les re-renders)
  const loadTransfertsRef = useRef<((forceRefresh?: boolean) => Promise<void>) | null>(null)
  const appliquerTransfertRef = useRef<((transfertId: string, ressourceId: string, siteOrigine: string, siteDestination: string, dateDebut: Date, dateFin: Date) => Promise<void>) | null>(null)

  // Mémoriser les options pour éviter les recréations
  const memoizedOptions = useMemo(() => options, [options])

  // Créer une clé de cache pour les options
  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        ressourceId: memoizedOptions.ressourceId || '',
        siteOrigine: memoizedOptions.siteOrigine || '',
        siteDestination: memoizedOptions.siteDestination || '',
        statut: memoizedOptions.statut || '',
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
   * Charge les transferts depuis Supabase
   * Optimisé avec cache pour éviter les appels multiples
   */
  const loadTransferts = useCallback(
    async (forceRefresh: boolean = false) => {
      // Éviter les appels multiples simultanés
      if (loadingRef.current && !forceRefresh) {
        console.log('[useTransferts] loadTransferts déjà en cours, ignoré')
        return
      }

      // Vérifier si les options ont changé
      if (lastOptionsRef.current === optionsKey && !forceRefresh) {
        console.log('[useTransferts] Options identiques, chargement ignoré (cache)')
        return
      }

      try {
        loadingRef.current = true
        setLoading(true)
        setError(null)

        const supabase = getSupabaseClient()

        // Log des options pour débogage (seulement si changement)
        if (lastOptionsRef.current !== optionsKey) {
          console.log('[useTransferts] loadTransferts appelé avec options:', memoizedOptions)
          lastOptionsRef.current = optionsKey
        }

        // Charger les transferts avec jointure sur ressources
        let query = supabase
          .from('transferts')
          .select(`
            *,
            ressources (
              id,
              nom,
              site,
              actif
            )
          `)
          .order('date_debut', { ascending: false })
          .order('date_creation', { ascending: false })

        if (memoizedOptions.ressourceId) {
          query = query.eq('ressource_id', memoizedOptions.ressourceId)
        }

        if (memoizedOptions.siteOrigine) {
          query = query.eq('site_origine', memoizedOptions.siteOrigine)
        }

        if (memoizedOptions.siteDestination) {
          query = query.eq('site_destination', memoizedOptions.siteDestination)
        }

        if (memoizedOptions.statut) {
          query = query.eq('statut', memoizedOptions.statut)
        }

        const { data, error: queryError } = await query

        if (queryError) {
          console.error('[useTransferts] Erreur requête Supabase:', queryError)
          throw queryError
        }

        console.log('[useTransferts] Données récupérées:', data?.length || 0, 'transfert(s)')

        // Convertir les données en format Transfert
        const transfertsAvecDates = (data || []).map(
          (item: {
            id: string
            ressource_id: string
            site_origine: string
            site_destination: string
            date_debut: string | null
            date_fin: string | null
            statut: string | null
            date_creation: string | null
            created_by: string | null
            ressources: {
              id: string
              nom: string
              site: string
              actif: boolean | null
            } | null
          }) =>
            ({
              id: item.id,
              ressource_id: item.ressource_id,
              site_origine: item.site_origine,
              site_destination: item.site_destination,
              date_debut: item.date_debut ? new Date(item.date_debut) : new Date(),
              date_fin: item.date_fin ? new Date(item.date_fin) : new Date(),
              statut: (item.statut || 'Planifié') as 'Planifié' | 'Appliqué',
              date_creation: item.date_creation ? new Date(item.date_creation) : new Date(),
              created_by: item.created_by || undefined,
              ressource: item.ressources
                ? {
                    id: item.ressources.id,
                    nom: item.ressources.nom,
                    site: item.ressources.site,
                    actif: item.ressources.actif ?? true,
                  }
                : undefined,
            }) as Transfert
        )

        console.log('[useTransferts] Transferts formatés:', transfertsAvecDates.length)
        setTransferts(transfertsAvecDates)
      } catch (err) {
        setError(err as Error)
        console.error('[useTransferts] Erreur:', err)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [memoizedOptions, optionsKey, getSupabaseClient]
  )
  
  // Mettre à jour la référence quand loadTransferts change
  useEffect(() => {
    loadTransfertsRef.current = loadTransferts
  }, [loadTransferts])

  /**
   * Crée un nouveau transfert
   */
  const createTransfert = useCallback(
    async (transfert: CreateTransfertInput) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        // Validation
        if (!transfert.ressource_id || !transfert.site_origine || !transfert.site_destination) {
          throw new Error('Ressource, site d\'origine et site de destination sont requis')
        }

        const dateDebut =
          transfert.date_debut instanceof Date
            ? transfert.date_debut.toISOString().split('T')[0]
            : transfert.date_debut
        const dateFin =
          transfert.date_fin instanceof Date
            ? transfert.date_fin.toISOString().split('T')[0]
            : transfert.date_fin

        if (new Date(dateFin) < new Date(dateDebut)) {
          throw new Error('La date de fin doit être postérieure à la date de début')
        }

        // Vérifier que la ressource existe et est active
        const { data: ressource, error: ressourceError } = await supabase
          .from('ressources')
          .select('id, nom, site, actif')
          .eq('id', transfert.ressource_id)
          .single()

        if (ressourceError || !ressource) {
          throw new Error('Ressource introuvable')
        }

        if (!ressource.actif) {
          throw new Error('La ressource n\'est pas active')
        }

        if (ressource.site !== transfert.site_origine) {
          throw new Error(
            `La ressource est sur le site "${ressource.site}", pas sur "${transfert.site_origine}"`
          )
        }

        // Créer le transfert
        const { data, error: insertError } = await supabase
          .from('transferts')
          .insert({
            ressource_id: transfert.ressource_id,
            site_origine: transfert.site_origine.trim(),
            site_destination: transfert.site_destination.trim(),
            date_debut: dateDebut,
            date_fin: dateFin,
            statut: transfert.statut || 'Planifié',
          })
          .select(`
            *,
            ressources (
              id,
              nom,
              site,
              actif
            )
          `)
          .single()

        if (insertError) throw insertError

        // Logger dans les alertes
        try {
          await createAlerte({
            type_alerte: 'TRANSFERT_ENREGISTRE',
            ressource_id: transfert.ressource_id,
            site: transfert.site_origine,
            date_debut: new Date(dateDebut),
            date_fin: new Date(dateFin),
            action: `Transfert de ${ressource.nom} de ${transfert.site_origine} vers ${transfert.site_destination} : ${transfert.statut || 'Planifié'}`,
            prise_en_compte: 'Non',
          })
        } catch (alerteError) {
          console.error('[useTransferts] Erreur création alerte:', alerteError)
          // Ne pas bloquer la création du transfert si l'alerte échoue
        }

        // Si statut = "Appliqué", appliquer le transfert immédiatement
        if (transfert.statut === 'Appliqué' || data.statut === 'Appliqué') {
          if (appliquerTransfertRef.current) {
            await appliquerTransfertRef.current(data.id, transfert.ressource_id, transfert.site_origine, transfert.site_destination, new Date(dateDebut), new Date(dateFin))
          }
        }

        // Recharger les transferts
        await loadTransferts(true)

        // Convertir en format Transfert
        return {
          id: data.id,
          ressource_id: data.ressource_id,
          site_origine: data.site_origine,
          site_destination: data.site_destination,
          date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
          date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
          statut: data.statut || 'Planifié',
          date_creation: data.date_creation ? new Date(data.date_creation) : new Date(),
          created_by: data.created_by,
          ressource: data.ressources
            ? {
                id: data.ressources.id,
                nom: data.ressources.nom,
                site: data.ressources.site,
                actif: data.ressources.actif ?? true,
              }
            : undefined,
        } as Transfert
      } catch (err) {
        setError(err as Error)
        console.error('[useTransferts] Erreur createTransfert:', err)
        throw err
      }
    },
    [getSupabaseClient, createAlerte, loadTransferts] // Retirer appliquerTransfert pour éviter les boucles
  )

  /**
   * Met à jour un transfert
   */
  const updateTransfert = useCallback(
    async (transfertId: string, updates: UpdateTransfertInput) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const updateData: {
          site_origine?: string
          site_destination?: string
          date_debut?: string
          date_fin?: string
          statut?: 'Planifié' | 'Appliqué'
        } = {}

        if (updates.site_origine !== undefined) {
          updateData.site_origine = updates.site_origine.trim()
        }

        if (updates.site_destination !== undefined) {
          updateData.site_destination = updates.site_destination.trim()
        }

        if (updates.date_debut !== undefined) {
          updateData.date_debut =
            updates.date_debut instanceof Date
              ? updates.date_debut.toISOString().split('T')[0]
              : updates.date_debut
        }

        if (updates.date_fin !== undefined) {
          updateData.date_fin =
            updates.date_fin instanceof Date
              ? updates.date_fin.toISOString().split('T')[0]
              : updates.date_fin
        }

        if (updates.statut !== undefined) {
          updateData.statut = updates.statut
        }

        // Validation des dates si les deux sont présentes
        if (updateData.date_debut && updateData.date_fin) {
          if (new Date(updateData.date_fin) < new Date(updateData.date_debut)) {
            throw new Error('La date de fin doit être postérieure à la date de début')
          }
        }

        const { data, error: updateError } = await supabase
          .from('transferts')
          .update(updateData)
          .eq('id', transfertId)
          .select(`
            *,
            ressources (
              id,
              nom,
              site,
              actif
            )
          `)
          .single()

        if (updateError) throw updateError

        // Si le statut passe à "Appliqué", appliquer le transfert
        if (updates.statut === 'Appliqué' || data.statut === 'Appliqué') {
          if (appliquerTransfertRef.current) {
            await appliquerTransfertRef.current(
              transfertId,
              data.ressource_id,
              data.site_origine,
              data.site_destination,
              new Date(data.date_debut),
              new Date(data.date_fin)
            )
          }
        }

        // Recharger les transferts
        await loadTransferts(true)

        // Convertir en format Transfert
        return {
          id: data.id,
          ressource_id: data.ressource_id,
          site_origine: data.site_origine,
          site_destination: data.site_destination,
          date_debut: data.date_debut ? new Date(data.date_debut) : new Date(),
          date_fin: data.date_fin ? new Date(data.date_fin) : new Date(),
          statut: data.statut || 'Planifié',
          date_creation: data.date_creation ? new Date(data.date_creation) : new Date(),
          created_by: data.created_by,
          ressource: data.ressources
            ? {
                id: data.ressources.id,
                nom: data.ressources.nom,
                site: data.ressources.site,
                actif: data.ressources.actif ?? true,
              }
            : undefined,
        } as Transfert
      } catch (err) {
        setError(err as Error)
        console.error('[useTransferts] Erreur updateTransfert:', err)
        throw err
      }
    },
    [getSupabaseClient, loadTransferts]
  )

  /**
   * Supprime un transfert
   */
  const deleteTransfert = useCallback(
    async (transfertId: string) => {
      try {
        setError(null)

        const supabase = getSupabaseClient()

        const { error: deleteError } = await supabase.from('transferts').delete().eq('id', transfertId)

        if (deleteError) throw deleteError

        // Recharger les transferts
        await loadTransferts(true)
      } catch (err) {
        setError(err as Error)
        console.error('[useTransferts] Erreur deleteTransfert:', err)
        throw err
      }
    },
    [getSupabaseClient, loadTransferts]
  )

  /**
   * Applique un transfert (créer des affectations sur le site de destination)
   * Cette fonction est appelée automatiquement quand le statut passe à "Appliqué"
   */
  const appliquerTransfert = useCallback(
    async (
      transfertId: string,
      ressourceId: string,
      siteOrigine: string,
      siteDestination: string,
      dateDebut: Date,
      dateFin: Date
    ) => {
      try {
        const supabase = getSupabaseClient()

        // Récupérer les compétences principales de la ressource
        const { data: competences, error: competencesError } = await supabase
          .from('ressources_competences')
          .select('competence, type_comp')
          .eq('ressource_id', ressourceId)
          .eq('type_comp', 'P') // Compétences principales uniquement

        if (competencesError) {
          console.error('[useTransferts] Erreur récupération compétences:', competencesError)
          throw competencesError
        }

        if (!competences || competences.length === 0) {
          console.log('[useTransferts] Aucune compétence principale trouvée pour la ressource')
          return
        }

        // Calculer le nombre de jours ouvrés
        const { businessDaysBetween } = await import('@/utils/calendar')
        const nbJoursOuvres = businessDaysBetween(dateDebut, dateFin)

        if (nbJoursOuvres <= 0) {
          console.log('[useTransferts] Aucun jour ouvré dans la période')
          return
        }

        // Pour chaque compétence, créer une affectation "générique" sur le site de destination
        // Utiliser une affaire factice "TRANSFERT" pour tracer
        const affaireTransfert = `TRANSFERT_${siteDestination}`

        // Vérifier si l'affaire existe, sinon la créer
        const { data: affaireExistante } = await supabase
          .from('affaires')
          .select('id')
          .eq('affaire_id', affaireTransfert)
          .single()

        let affaireId: string

        if (!affaireExistante) {
          // Créer l'affaire factice
          const { data: nouvelleAffaire, error: affaireError } = await supabase
            .from('affaires')
            .insert({
              affaire_id: affaireTransfert,
              site: siteDestination,
              libelle: `Transfert automatique vers ${siteDestination}`,
              actif: true,
            })
            .select('id')
            .single()

          if (affaireError) {
            console.error('[useTransferts] Erreur création affaire transfert:', affaireError)
            throw affaireError
          }

          affaireId = nouvelleAffaire.id
        } else {
          affaireId = affaireExistante.id
        }

        // Créer les affectations pour chaque compétence
        const affectations = competences.map((comp) => ({
          affaire_id: affaireId,
          site: siteDestination,
          ressource_id: ressourceId,
          competence: comp.competence,
          date_debut: dateDebut.toISOString().split('T')[0],
          date_fin: dateFin.toISOString().split('T')[0],
          charge: nbJoursOuvres,
        }))

        const { error: affectationsError } = await supabase.from('affectations').insert(affectations)

        if (affectationsError) {
          console.error('[useTransferts] Erreur création affectations:', affectationsError)
          throw affectationsError
        }

        // Logger dans les alertes
        try {
          await createAlerte({
            type_alerte: 'TRANSFERT_APPLIQUE',
            ressource_id: ressourceId,
            site: siteDestination,
            date_debut: dateDebut,
            date_fin: dateFin,
            action: `Transfert appliqué de ${siteOrigine} vers ${siteDestination} - ${competences.length} compétence(s) affectée(s)`,
            prise_en_compte: 'Non',
          })
        } catch (alerteError) {
          console.error('[useTransferts] Erreur création alerte:', alerteError)
          // Ne pas bloquer l'application du transfert si l'alerte échoue
        }

        console.log(
          `[useTransferts] Transfert appliqué : ${competences.length} affectation(s) créée(s) pour ${competences.length} compétence(s)`
        )
      } catch (err) {
        console.error('[useTransferts] Erreur appliquerTransfert:', err)
        throw err
      }
    },
    [getSupabaseClient, createAlerte]
  )
  
  // Mettre à jour la référence quand appliquerTransfert change
  useEffect(() => {
    appliquerTransfertRef.current = appliquerTransfert
  }, [appliquerTransfert])

  /**
   * Applique automatiquement les transferts planifiés dont la date de début est aujourd'hui ou dans le passé
   */
  const appliquerTransfertsAuto = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Récupérer les transferts planifiés avec date_debut <= today
      const { data: transfertsPlanifies, error: queryError } = await supabase
        .from('transferts')
        .select('*')
        .eq('statut', 'Planifié')
        .lte('date_debut', today.toISOString().split('T')[0])

      if (queryError) throw queryError

      if (!transfertsPlanifies || transfertsPlanifies.length === 0) {
        return { appliques: 0 }
      }

      let nbAppliques = 0

      for (const transfert of transfertsPlanifies) {
        try {
          if (appliquerTransfertRef.current) {
            await appliquerTransfertRef.current(
              transfert.id,
              transfert.ressource_id,
              transfert.site_origine,
              transfert.site_destination,
              new Date(transfert.date_debut),
              new Date(transfert.date_fin)
            )
          }

          // Mettre à jour le statut à "Appliqué"
          const { error: updateError } = await supabase
            .from('transferts')
            .update({ statut: 'Appliqué' })
            .eq('id', transfert.id)

          if (updateError) {
            console.error(`[useTransferts] Erreur mise à jour statut transfert ${transfert.id}:`, updateError)
            continue
          }

          nbAppliques++
        } catch (err) {
          console.error(`[useTransferts] Erreur application transfert ${transfert.id}:`, err)
          // Continuer avec les autres transferts
        }
      }

      // Recharger les transferts après application
      await loadTransferts(true)

      return { appliques: nbAppliques }
    } catch (err) {
      console.error('[useTransferts] Erreur appliquerTransfertsAuto:', err)
      throw err
    }
  }, [getSupabaseClient, loadTransferts]) // Retirer appliquerTransfert pour éviter les boucles

  // Charger les transferts au montage
  useEffect(() => {
    // Utiliser la référence pour éviter les dépendances circulaires
    if (loadTransfertsRef.current) {
      loadTransfertsRef.current(true)
    }
  }, [optionsKey]) // Utiliser optionsKey au lieu de loadTransferts pour éviter les boucles

  return {
    transferts,
    loading,
    error,
    createTransfert,
    updateTransfert,
    deleteTransfert,
    appliquerTransfert,
    appliquerTransfertsAuto,
    refresh: loadTransferts,
  }
}
