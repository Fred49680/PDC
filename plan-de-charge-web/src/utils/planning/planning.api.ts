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
  console.log('[ensureTransfert] DÉBUT - Création/extension transfert', {
    ressourceId,
    siteDestination,
    dateDebut: dateDebut.toISOString(),
    dateFin: dateFin.toISOString(),
  })

  const supabase = createClient()

  // Récupérer la ressource pour obtenir son site d'origine
  console.log('[ensureTransfert] Récupération ressource...', { ressourceId })
  const { data: ressource, error: ressourceError } = await supabase
    .from('ressources')
    .select('id, site')
    .eq('id', ressourceId)
    .single()

  if (ressourceError || !ressource) {
    console.error('[ensureTransfert] ERREUR - Ressource introuvable', { ressourceId, ressourceError })
    throw new Error(`Ressource ${ressourceId} introuvable`)
  }

  console.log('[ensureTransfert] Ressource trouvée', { ressourceId, site: ressource.site })

  const siteOrigine = ressource.site.toUpperCase()
  const siteDest = siteDestination.toUpperCase()

  console.log('[ensureTransfert] Comparaison sites', { siteOrigine, siteDest, memeSite: siteOrigine === siteDest })

  // Si la ressource est déjà sur le site de destination, pas besoin de transfert
  if (siteOrigine === siteDest) {
    console.log('[ensureTransfert] FIN - Pas de transfert nécessaire (même site)')
    return
  }

  // Vérifier si un transfert existe déjà pour cette ressource et cette destination
  const dateDebutStr = normalizeDateToUTC(dateDebut).toISOString().split('T')[0]
  const dateFinStr = normalizeDateToUTC(dateFin).toISOString().split('T')[0]

  console.log('[ensureTransfert] Vérification transferts existants', {
    ressourceId,
    siteOrigine,
    siteDest,
    dateDebutStr,
    dateFinStr,
  })

  const { data: transfertsExistants, error: checkError } = await supabase
    .from('transferts')
    .select('id, date_debut, date_fin')
    .eq('ressource_id', ressourceId)
    .eq('site_origine', siteOrigine)
    .eq('site_destination', siteDest)

  if (checkError) {
    console.error('[ensureTransfert] ERREUR - Vérification transfert:', checkError)
    // Continuer quand même, on créera un nouveau transfert
  }

  console.log('[ensureTransfert] Transferts existants trouvés', {
    count: transfertsExistants?.length || 0,
    transferts: transfertsExistants,
  })

  // Si un transfert existe déjà, vérifier s'il couvre la période demandée
  if (transfertsExistants && transfertsExistants.length > 0) {
    // Prendre le premier transfert trouvé (normalement il n'y en a qu'un pour cette combinaison)
    const transfert = transfertsExistants[0]
    const transfertDebut = new Date(transfert.date_debut).getTime()
    const transfertFin = new Date(transfert.date_fin).getTime()
    const demandeDebut = new Date(dateDebutStr).getTime()
    const demandeFin = new Date(dateFinStr).getTime()

    console.log('[ensureTransfert] Comparaison périodes', {
      transfertDebut: transfert.date_debut,
      transfertFin: transfert.date_fin,
      demandeDebut: dateDebutStr,
      demandeFin: dateFinStr,
    })

    // Vérifier si le transfert couvre déjà la période demandée
    if (transfertDebut <= demandeDebut && transfertFin >= demandeFin) {
      console.log('[ensureTransfert] FIN - Transfert existant couvre déjà la période')
      // Le transfert couvre déjà la période, on n'a rien à faire
      return
    }

    // Vérifier si les périodes se chevauchent ou sont adjacentes (à 1 jour près)
    const isOverlap =
      (demandeDebut <= transfertFin + 86400000 && demandeFin >= transfertDebut - 86400000) ||
      (transfertDebut <= demandeFin + 86400000 && transfertFin >= demandeDebut - 86400000)

    console.log('[ensureTransfert] Chevauchement détecté', { isOverlap })

    if (isOverlap) {
      // Étendre le transfert pour couvrir la période demandée
      const newDateDebut = transfertDebut < demandeDebut ? transfert.date_debut : dateDebutStr
      const newDateFin = transfertFin > demandeFin ? transfert.date_fin : dateFinStr

      console.log('[ensureTransfert] Extension transfert', {
        transfertId: transfert.id,
        newDateDebut,
        newDateFin,
      })

      const { error: updateError } = await supabase
        .from('transferts')
        .update({
          date_debut: newDateDebut,
          date_fin: newDateFin,
        })
        .eq('id', transfert.id)

      if (updateError) {
        console.error('[ensureTransfert] ERREUR - Extension transfert:', updateError)
        throw new Error(`Erreur lors de l'extension du transfert: ${updateError.message}`)
      }
      console.log('[ensureTransfert] SUCCÈS - Transfert étendu', { transfertId: transfert.id })
      // Transfert étendu avec succès
      return
    }
    // Les périodes ne se chevauchent pas, on créera un nouveau transfert (cas rare)
    console.log('[ensureTransfert] Périodes ne se chevauchant pas, création nouveau transfert')
  }

  // Créer un nouveau transfert
  const transfertData = {
    ressource_id: ressourceId,
    site_origine: siteOrigine,
    site_destination: siteDest,
    date_debut: dateDebutStr,
    date_fin: dateFinStr,
    statut: 'Planifié',
  }

  console.log('[ensureTransfert] Création nouveau transfert', transfertData)

  const { data: transfertCree, error: createError } = await supabase
    .from('transferts')
    .insert(transfertData)
    .select()

  if (createError) {
    console.error('[ensureTransfert] ERREUR - Création transfert:', createError, { transfertData })
    throw new Error(`Erreur lors de la création du transfert: ${createError.message}`)
  }

  console.log('[ensureTransfert] SUCCÈS - Transfert créé', { transfertCree })
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
  console.log('[applyAffectationsBatch] DÉBUT - Création des transferts', {
    affaireId,
    site,
    siteUpper,
    nbAffectations: affectations.length,
    ressourcesMapSize: ressourcesMap.size,
  })

  const transfertsCrees: string[] = []
  const erreursTransferts: Array<{ ressourceId: string; error: Error }> = []
  
  for (const aff of affectations) {
    console.log('[applyAffectationsBatch] Traitement affectation', {
      ressourceId: aff.ressourceId,
      competence: aff.competence,
      dateDebut: aff.dateDebut.toISOString(),
      dateFin: aff.dateFin.toISOString(),
    })

    const ressourceSite = ressourcesMap.get(aff.ressourceId)
    console.log('[applyAffectationsBatch] Site ressource', {
      ressourceId: aff.ressourceId,
      ressourceSite,
      siteUpper,
      necessiteTransfert: ressourceSite && ressourceSite !== siteUpper,
    })

    if (ressourceSite && ressourceSite !== siteUpper) {
      // La ressource est sur un autre site, créer/étendre le transfert
      console.log('[applyAffectationsBatch] Création transfert nécessaire', {
        ressourceId: aff.ressourceId,
        siteOrigine: ressourceSite,
        siteDestination: siteUpper,
      })
      try {
        await ensureTransfert(aff.ressourceId, site, aff.dateDebut, aff.dateFin)
        transfertsCrees.push(aff.ressourceId)
        console.log(`[applyAffectationsBatch] SUCCÈS - Transfert créé/étendu pour ressource ${aff.ressourceId} de ${ressourceSite} vers ${siteUpper}`)
      } catch (error: any) {
        console.error(`[applyAffectationsBatch] ERREUR - Transfert pour ${aff.ressourceId}:`, error)
        erreursTransferts.push({ ressourceId: aff.ressourceId, error: error as Error })
        // Ne pas bloquer l'affectation si le transfert échoue, mais loguer l'erreur
      }
    } else if (!ressourceSite) {
      // Ressource non trouvée dans la map, essayer de la récupérer
      console.warn(`[applyAffectationsBatch] ATTENTION - Ressource ${aff.ressourceId} non trouvée dans ressourcesMap, récupération depuis la base...`)
      try {
        await ensureTransfert(aff.ressourceId, site, aff.dateDebut, aff.dateFin)
        transfertsCrees.push(aff.ressourceId)
        console.log(`[applyAffectationsBatch] SUCCÈS - Transfert créé après récupération ressource ${aff.ressourceId}`)
      } catch (error: any) {
        console.error(`[applyAffectationsBatch] ERREUR - Transfert pour ${aff.ressourceId} (récupération depuis base):`, error)
        erreursTransferts.push({ ressourceId: aff.ressourceId, error: error as Error })
      }
    } else {
      console.log(`[applyAffectationsBatch] Pas de transfert nécessaire pour ${aff.ressourceId} (même site: ${ressourceSite})`)
    }
  }
  
  // Loguer un résumé des transferts
  console.log('[applyAffectationsBatch] RÉSUMÉ - Transferts', {
    transfertsCrees: transfertsCrees.length,
    erreursTransferts: erreursTransferts.length,
    transfertsCreesIds: transfertsCrees,
    erreursDetails: erreursTransferts,
  })
  
  if (transfertsCrees.length > 0) {
    console.log(`[applyAffectationsBatch] ✅ ${transfertsCrees.length} transfert(s) créé(s)/étendu(s) avec succès`)
  }
  if (erreursTransferts.length > 0) {
    console.error(`[applyAffectationsBatch] ❌ ${erreursTransferts.length} erreur(s) lors de la création des transferts`, erreursTransferts)
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

