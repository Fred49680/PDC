/**
 * API Supabase pour le planning v3
 * Utilise les tables existantes sans les modifier
 */

import { createClient } from '@/lib/supabase/client'
import type { PeriodeCharge } from '@/types/charge'
import type { Affectation } from '@/types/affectations'
import { normalizeDateToUTC } from '@/utils/calendar'

/**
 * Récupérer les besoins d'une affaire
 */
export async function getBesoinsAffaire(
  affaireId: string,
  site: string,
  start?: Date,
  end?: Date
): Promise<PeriodeCharge[]> {
  const supabase = createClient()

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

  let query = supabase
    .from('periodes_charge')
    .select('*')
    .eq('affaire_id', affaireData.id)
    .eq('site', site)
    .order('competence', { ascending: true })
    .order('date_debut', { ascending: true })

  if (start) {
    query = query.gte('date_fin', normalizeDateToUTC(start).toISOString().split('T')[0])
  }

  if (end) {
    query = query.lte('date_debut', normalizeDateToUTC(end).toISOString().split('T')[0])
  }

  const { data, error } = await query

  if (error) throw error

  // Convertir les dates
  return (data || []).map((p: any) => ({
    ...p,
    date_debut: new Date(p.date_debut),
    date_fin: new Date(p.date_fin),
    force_weekend_ferie: p.force_weekend_ferie === true,
    created_at: new Date(p.created_at),
    updated_at: new Date(p.updated_at),
  })) as PeriodeCharge[]
}

/**
 * Récupérer la couverture d'un besoin (affectations associées)
 */
export async function getCouvertureBesoin(
  besoinId: string,
  affaireId: string,
  site: string,
  competence: string,
  dateDebut: Date,
  dateFin: Date
): Promise<Affectation[]> {
  const supabase = createClient()

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

  const { data, error } = await supabase
    .from('affectations')
    .select('*')
    .eq('affaire_id', affaireData.id)
    .eq('site', site)
    .eq('competence', competence)
    .lte('date_debut', normalizeDateToUTC(dateFin).toISOString().split('T')[0])
    .gte('date_fin', normalizeDateToUTC(dateDebut).toISOString().split('T')[0])
    .order('date_debut', { ascending: true })

  if (error) throw error

  // Convertir les dates
  return (data || []).map((a: any) => ({
    ...a,
    date_debut: new Date(a.date_debut),
    date_fin: new Date(a.date_fin),
    created_at: new Date(a.created_at),
    updated_at: new Date(a.updated_at),
  })) as Affectation[]
}

/**
 * Appliquer des affectations en batch
 */
export async function applyAffectationsBatch(
  affaireId: string,
  site: string,
  affectations: Array<{
    ressourceId: string
    competence: string
    dateDebut: Date
    dateFin: Date
    charge?: number
  }>
): Promise<Affectation[]> {
  const supabase = createClient()

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

  // Préparer les données d'insertion
  const affectationsData = affectations.map((aff) => ({
    affaire_id: affaireData.id,
    site,
    ressource_id: aff.ressourceId,
    competence: aff.competence,
    date_debut: normalizeDateToUTC(aff.dateDebut).toISOString().split('T')[0],
    date_fin: normalizeDateToUTC(aff.dateFin).toISOString().split('T')[0],
    charge: aff.charge || 1,
  }))

  const { data, error } = await supabase
    .from('affectations')
    .insert(affectationsData)
    .select()

  if (error) throw error

  // Convertir les dates
  return (data || []).map((a: any) => ({
    ...a,
    date_debut: new Date(a.date_debut),
    date_fin: new Date(a.date_fin),
    created_at: new Date(a.created_at),
    updated_at: new Date(a.updated_at),
  })) as Affectation[]
}

