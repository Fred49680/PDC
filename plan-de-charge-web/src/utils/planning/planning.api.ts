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
 * Créer ou étendre un transfert pour une ressource
 */
async function ensureTransfert(
  ressourceId: string,
  siteDestination: string,
  dateDebut: Date,
  dateFin: Date
): Promise<void> {
  const supabase = createClient()

  // Récupérer la ressource pour obtenir son site d'origine
  const { data: ressource, error: ressourceError } = await supabase
    .from('ressources')
    .select('id, site')
    .eq('id', ressourceId)
    .single()

  if (ressourceError || !ressource) {
    throw new Error(`Ressource ${ressourceId} introuvable`)
  }

  const siteOrigine = ressource.site.toUpperCase()
  const siteDest = siteDestination.toUpperCase()

  // Si la ressource est déjà sur le site de destination, pas besoin de transfert
  if (siteOrigine === siteDest) {
    return
  }

  // Vérifier si un transfert existe déjà pour cette ressource et cette destination
  const dateDebutStr = normalizeDateToUTC(dateDebut).toISOString().split('T')[0]
  const dateFinStr = normalizeDateToUTC(dateFin).toISOString().split('T')[0]

  const { data: transfertsExistants, error: checkError } = await supabase
    .from('transferts')
    .select('id, date_debut, date_fin')
    .eq('ressource_id', ressourceId)
    .eq('site_origine', siteOrigine)
    .eq('site_destination', siteDest)

  if (checkError) {
    console.error('[planning.api] Erreur vérification transfert:', checkError)
    // Continuer quand même, on créera un nouveau transfert
  }

  // Si un transfert existe déjà, vérifier s'il couvre la période demandée
  if (transfertsExistants && transfertsExistants.length > 0) {
    // Prendre le premier transfert trouvé (normalement il n'y en a qu'un pour cette combinaison)
    const transfert = transfertsExistants[0]
    const transfertDebut = new Date(transfert.date_debut).getTime()
    const transfertFin = new Date(transfert.date_fin).getTime()
    const demandeDebut = new Date(dateDebutStr).getTime()
    const demandeFin = new Date(dateFinStr).getTime()

    // Vérifier si le transfert couvre déjà la période demandée
    if (transfertDebut <= demandeDebut && transfertFin >= demandeFin) {
      // Le transfert couvre déjà la période, on n'a rien à faire
      return
    }

    // Vérifier si les périodes se chevauchent ou sont adjacentes (à 1 jour près)
    const isOverlap =
      (demandeDebut <= transfertFin + 86400000 && demandeFin >= transfertDebut - 86400000) ||
      (transfertDebut <= demandeFin + 86400000 && transfertFin >= demandeDebut - 86400000)

    if (isOverlap) {
      // Étendre le transfert pour couvrir la période demandée
      const newDateDebut = transfertDebut < demandeDebut ? transfert.date_debut : dateDebutStr
      const newDateFin = transfertFin > demandeFin ? transfert.date_fin : dateFinStr

      const { error: updateError } = await supabase
        .from('transferts')
        .update({
          date_debut: newDateDebut,
          date_fin: newDateFin,
        })
        .eq('id', transfert.id)

      if (updateError) {
        console.error('[planning.api] Erreur extension transfert:', updateError)
        throw new Error(`Erreur lors de l'extension du transfert: ${updateError.message}`)
      }
      // Transfert étendu avec succès
      return
    }
    // Les périodes ne se chevauchent pas, on créera un nouveau transfert (cas rare)
  }

  // Créer un nouveau transfert
  const { error: createError } = await supabase.from('transferts').insert({
    ressource_id: ressourceId,
    site_origine: siteOrigine,
    site_destination: siteDest,
    date_debut: dateDebutStr,
    date_fin: dateFinStr,
    statut: 'Planifié',
  })

  if (createError) {
    console.error('[planning.api] Erreur création transfert:', createError)
    throw new Error(`Erreur lors de la création du transfert: ${createError.message}`)
  }
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
  }>,
  ressources?: Array<{ id: string; site: string }> // Optionnel : pour éviter les requêtes supplémentaires
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

  // Si ressources n'est pas fourni, les récupérer
  let ressourcesMap = new Map<string, string>()
  if (ressources) {
    ressourcesMap = new Map(ressources.map((r) => [r.id, r.site.toUpperCase()]))
  } else {
    const ressourceIds = [...new Set(affectations.map((a) => a.ressourceId))]
    const { data: ressourcesData } = await supabase
      .from('ressources')
      .select('id, site')
      .in('id', ressourceIds)

    if (ressourcesData) {
      ressourcesMap = new Map(ressourcesData.map((r: any) => [r.id, r.site.toUpperCase()]))
    }
  }

  const siteUpper = site.toUpperCase()

  // Créer les transferts nécessaires AVANT de créer les affectations
  for (const aff of affectations) {
    const ressourceSite = ressourcesMap.get(aff.ressourceId)
    if (ressourceSite && ressourceSite !== siteUpper) {
      // La ressource est sur un autre site, créer/étendre le transfert
      try {
        await ensureTransfert(aff.ressourceId, site, aff.dateDebut, aff.dateFin)
      } catch (error: any) {
        console.error(`[planning.api] Erreur transfert pour ${aff.ressourceId}:`, error)
        // Ne pas bloquer l'affectation si le transfert échoue, mais loguer l'erreur
      }
    }
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

  const { data, error } = await supabase.from('affectations').insert(affectationsData).select()

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
 * Déclencher la consolidation des périodes de charge
 */
export async function triggerConsolidationPeriodesCharge(
  affaireId: string,
  site: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('trigger_consolidation_periodes_charge', {
    p_affaire_id: affaireId,
    p_site: site,
  })

  if (error) {
    console.error('[planning.api] Erreur consolidation:', error)
    // Ne pas throw pour ne pas bloquer l'UI, la consolidation se fait aussi via trigger
  }
}

