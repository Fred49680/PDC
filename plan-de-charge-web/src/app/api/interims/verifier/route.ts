import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API Route pour vérifier automatiquement les intérims
 * Met à jour le statut "a_renouveler" 10 jours ouvrés avant la date de fin
 * Désactive les intérims non renouvelés après la date de fin
 * Utilise directement la table ressources avec type_contrat='ETT'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fonction pour calculer le prochain jour ouvré
    const nextBusinessDay = (date: Date): Date => {
      let nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      // Vérifier si c'est un jour ouvré (pas week-end)
      while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
        nextDate.setDate(nextDate.getDate() + 1)
      }
      
      // TODO: Vérifier aussi les jours fériés si nécessaire
      return nextDate
    }

    // Fonction pour calculer le nombre de jours ouvrés entre deux dates
    const businessDaysBetween = (start: Date, end: Date): number => {
      let count = 0
      let current = new Date(start)
      
      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++
        }
        current.setDate(current.getDate() + 1)
      }
      
      return count
    }

    // 1) Vérifier et mettre à jour les renouvellements (10 jours ouvrés avant)
    let dateLimite = new Date(today)
    let joursOuvres = 0
    while (joursOuvres < 10) {
      dateLimite = nextBusinessDay(dateLimite)
      joursOuvres++
    }

    const dateLimiteLarge = new Date(dateLimite)
    dateLimiteLarge.setDate(dateLimiteLarge.getDate() + 7)

    // Récupérer toutes les ressources ETT avec date_fin_contrat entre aujourd'hui et la date limite
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

    if (ressourcesETT && ressourcesETT.length > 0) {
      for (const ressource of ressourcesETT) {
        const dateFin = new Date(ressource.date_fin_contrat)
        dateFin.setHours(0, 0, 0, 0)

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
            console.error(`[API] Erreur mise à jour ressource ${ressource.id}:`, updateError)
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
            const { error: alerteError } = await supabase
              .from('alertes')
              .insert({
                type_alerte: 'RENOUVELLEMENT_INTÉRIM',
                ressource_id: ressource.id,
                site: ressource.site,
                date_debut: dateFin.toISOString().split('T')[0],
                date_fin: dateFin.toISOString().split('T')[0],
                action: `Intérim de ${ressource.nom} à renouveler avant le ${dateFin.toLocaleDateString('fr-FR')} (${joursRestants} jour(s) ouvré(s) restant(s))`,
                prise_en_compte: 'Non',
                date_action: new Date().toISOString(),
              })

            if (!alerteError) {
              alertsCreated++
            } else {
              console.error(`[API] Erreur création alerte pour ressource ${ressource.id}:`, alerteError)
            }
          }
        }
      }
    }

    // 2) Désactiver les intérims non renouvelés après la date de fin
    const { data: ressourcesETTExpires, error: expiresError } = await supabase
      .from('ressources')
      .select('*')
      .eq('type_contrat', 'ETT')
      .not('date_fin_contrat', 'is', null)
      .lt('date_fin_contrat', today.toISOString().split('T')[0])
      .neq('a_renouveler', 'Oui')
      .neq('a_renouveler', 'oui')

    if (expiresError) throw expiresError

    let desactivated = 0

    if (ressourcesETTExpires && ressourcesETTExpires.length > 0) {
      for (const ressource of ressourcesETTExpires) {
        // Désactiver la ressource si elle est encore active
        if (ressource.actif) {
          const { error: updateError } = await supabase
            .from('ressources')
            .update({ actif: false })
            .eq('id', ressource.id)

          if (updateError) {
            console.error(`[API] Erreur désactivation ressource ${ressource.id}:`, updateError)
            continue
          }

          desactivated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      alertsCreated,
      desactivated,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la vérification des intérims'
    console.error('[API] Erreur vérification intérims:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
