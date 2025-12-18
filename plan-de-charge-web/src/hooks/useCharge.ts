'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeDateToUTC, isBusinessDay, getDatesBetween } from '@/utils/calendar'
import { addDays, isSameDay } from 'date-fns'
import type { PeriodeCharge } from '@/types/charge'

interface UseChargeOptions {
  affaireId: string
  site: string
  autoRefresh?: boolean // Option pour désactiver le refresh automatique
}

export function useCharge({ affaireId, site, autoRefresh = true }: UseChargeOptions) {
  const [periodes, setPeriodes] = useState<PeriodeCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Créer le client de manière lazy (seulement côté client)
  const getSupabaseClient = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be created on the client side')
    }
    return createClient()
  }

  const loadPeriodes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()

      // Récupérer l'ID de l'affaire depuis affaire_id
      const { data: affaireData, error: affaireError } = await supabase
        .from('affaires')
        .select('id')
        .eq('affaire_id', affaireId)
        .eq('site', site)
        .single()

      if (affaireError || !affaireData) {
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
        .single()

      if (affaireError || !affaireData) {
        throw new Error(`Affaire ${affaireId} / ${site} introuvable`)
      }

      // *** NORMALISER LES DATES À MINUIT UTC pour éviter les problèmes de timezone ***
      const periodeData = {
        ...periode,
        affaire_id: affaireData.id,
        site,
        // Normaliser date_debut et date_fin si elles sont des objets Date
        date_debut: periode.date_debut instanceof Date 
          ? normalizeDateToUTC(periode.date_debut)
          : periode.date_debut,
        date_fin: periode.date_fin instanceof Date
          ? normalizeDateToUTC(periode.date_fin)
          : periode.date_fin,
      }

      const { data, error: upsertError } = await supabase
        .from('periodes_charge')
        .upsert(periodeData, {
          onConflict: 'affaire_id,site,competence,date_debut,date_fin',
        })
        .select()
        .single()

      if (upsertError) throw upsertError

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

      // Recharger les périodes en arrière-plan (avec un petit délai pour éviter les conflits)
      // Cela permet de synchroniser avec la BDD sans bloquer l'UI
      // Seulement si autoRefresh est activé
      if (autoRefresh) {
        setTimeout(() => {
          loadPeriodes().catch((err) => {
            console.error('[useCharge] Erreur lors du rechargement différé:', err)
          })
        }, 500)
      }

      return periodeAvecDates
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur savePeriode:', err)
      throw err
    }
  }, [affaireId, site, loadPeriodes])

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

      // Recharger les périodes en arrière-plan (avec un petit délai pour éviter les conflits)
      // Seulement si autoRefresh est activé
      if (autoRefresh) {
        setTimeout(() => {
          loadPeriodes().catch((err) => {
            console.error('[useCharge] Erreur lors du rechargement différé:', err)
          })
        }, 500)
      }
    } catch (err) {
      setError(err as Error)
      console.error('[useCharge] Erreur deletePeriode:', err)
      throw err
    }
  }, [loadPeriodes])

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
        .single()

      if (affaireError || !affaireData) {
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

      // Recharger les périodes après consolidation
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
