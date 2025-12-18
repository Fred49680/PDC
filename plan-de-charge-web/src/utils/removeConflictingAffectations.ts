/**
 * Fonction utilitaire pour retirer automatiquement les affectations en conflit avec une absence
 * Cette fonction peut être appelée depuis useAbsences après l'enregistrement d'une absence
 */

import { createClient } from '@/lib/supabase/client'
import type { Alerte } from '@/hooks/useAlertes'

export async function removeConflictingAffectationsForAbsence(
  ressourceId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<{ removedCount: number; alertes: Alerte[] }> {
  try {
    const supabase = createClient()

    // Normaliser les dates pour la comparaison
    const dateDebutStr = dateDebut.toISOString().split('T')[0]
    const dateFinStr = dateFin.toISOString().split('T')[0]

    // Trouver toutes les affectations qui chevauchent avec la période d'absence
    // Chevauchement : (affectation.date_debut <= absence.dateFin) AND (affectation.date_fin >= absence.dateDebut)
    const { data: affectationsConflit, error: queryError } = await supabase
      .from('affectations')
      .select(`
        *,
        affaires!inner(affaire_id, site, libelle)
      `)
      .eq('ressource_id', ressourceId)
      .lte('date_debut', dateFinStr) // affectation.date_debut <= absence.dateFin
      .gte('date_fin', dateDebutStr) // affectation.date_fin >= absence.dateDebut

    if (queryError) {
      console.error('[removeConflictingAffectationsForAbsence] Erreur recherche affectations conflit:', queryError)
      return { removedCount: 0, alertes: [] }
    }

    if (!affectationsConflit || affectationsConflit.length === 0) {
      return { removedCount: 0, alertes: [] }
    }

    // Créer les alertes avant de supprimer
    const alertes: Alerte[] = []
    const affectationIds: string[] = []

    for (const affectation of affectationsConflit) {
      affectationIds.push(affectation.id)

      // Récupérer les informations de l'affaire
      const affaire = (affectation.affaires as any)
      const affaireId = affaire?.affaire_id || ''
      const site = affectation.site || ''
      const libelle = affaire?.libelle || ''

      // Créer une alerte
      try {
        const { data: alerteData, error: alerteError } = await supabase
          .from('alertes')
          .insert({
            type_alerte: 'AFFECTATION_RETIREE_AUTO',
            ressource_id: ressourceId,
            affaire_id: affectation.affaire_id,
            site: site,
            competence: affectation.competence,
            date_debut: affectation.date_debut,
            date_fin: affectation.date_fin,
            action: `Affectation retirée automatiquement pour cause d'absence (${affaireId}${libelle ? ' - ' + libelle : ''})`,
            prise_en_compte: 'Non',
            date_action: new Date().toISOString(),
          })
          .select()
          .single()

        if (!alerteError && alerteData) {
          alertes.push({
            ...alerteData,
            date_action: alerteData.date_action ? new Date(alerteData.date_action) : undefined,
            date_debut: alerteData.date_debut ? new Date(alerteData.date_debut) : undefined,
            date_fin: alerteData.date_fin ? new Date(alerteData.date_fin) : undefined,
            created_at: alerteData.created_at ? new Date(alerteData.created_at) : new Date(),
          } as Alerte)
        }
      } catch (alerteErr) {
        console.error('[removeConflictingAffectationsForAbsence] Erreur création alerte:', alerteErr)
      }
    }

    // Supprimer toutes les affectations en conflit
    const { error: deleteError } = await supabase
      .from('affectations')
      .delete()
      .in('id', affectationIds)

    if (deleteError) {
      console.error('[removeConflictingAffectationsForAbsence] Erreur suppression affectations conflit:', deleteError)
      return { removedCount: 0, alertes }
    }

    console.log(`[removeConflictingAffectationsForAbsence] ${affectationIds.length} affectation(s) retirée(s) automatiquement pour conflit avec absence`)

    return { removedCount: affectationIds.length, alertes }
  } catch (err) {
    console.error('[removeConflictingAffectationsForAbsence] Erreur:', err)
    return { removedCount: 0, alertes: [] }
  }
}
