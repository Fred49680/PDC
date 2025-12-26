import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { affaire_id, site, competence, ressource_id } = await req.json()

    if (!affaire_id || !site || !ressource_id) {
      return new Response(
        JSON.stringify({ error: 'affaire_id, site et ressource_id sont requis' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Récupérer l'ID de l'affaire depuis affaire_id
    const { data: affaireData, error: affaireError } = await supabaseClient
      .from('affaires')
      .select('id')
      .eq('affaire_id', affaire_id)
      .eq('site', site)
      .single()

    if (affaireError || !affaireData) {
      return new Response(
        JSON.stringify({ error: `Affaire ${affaire_id} / ${site} introuvable` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Charger toutes les affectations pour cette affaire/site/ressource (et compétence si spécifiée)
    let query = supabaseClient
      .from('affectations')
      .select('*')
      .eq('affaire_id', affaireData.id)
      .eq('site', site)
      .eq('ressource_id', ressource_id)
      .order('competence', { ascending: true })
      .order('date_debut', { ascending: true })

    if (competence) {
      query = query.eq('competence', competence)
    }

    const { data: allAffectations, error: queryError } = await query

    if (queryError) {
      return new Response(
        JSON.stringify({ error: queryError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!allAffectations || allAffectations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Aucune affectation à consolider' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Grouper par compétence
    const affectationsParCompetence = new Map<string, typeof allAffectations>()
    allAffectations.forEach((a: any) => {
      const comp = a.competence
      if (!affectationsParCompetence.has(comp)) {
        affectationsParCompetence.set(comp, [])
      }
      affectationsParCompetence.get(comp)!.push(a)
    })

    let totalConsolidated = 0

    // Pour chaque compétence, consolider les affectations
    for (const [comp, affectationsComp] of affectationsParCompetence.entries()) {
      // Séparer les affectations avec force_weekend_ferie=true (ne pas les consolider)
      const affectationsForcees: typeof allAffectations = []
      const affectationsNormales: typeof allAffectations = []

      affectationsComp.forEach((a: any) => {
        if (a.force_weekend_ferie === true) {
          affectationsForcees.push(a)
        } else {
          affectationsNormales.push(a)
        }
      })

      // Déplier jour par jour (jours ouvrés uniquement) SEULEMENT pour les affectations normales
      const joursParAffectation = new Map<string, number>() // Clé: date ISO (YYYY-MM-DD), Valeur: charge

      affectationsNormales.forEach((a: any) => {
        const dateDebut = new Date(a.date_debut)
        const dateFin = new Date(a.date_fin)
        const charge = a.charge || 0

        if (charge <= 0) return

        // Parcourir tous les jours de la période
        const currentDate = new Date(dateDebut)
        while (currentDate <= dateFin) {
          // Vérifier si c'est un jour ouvré (lundi=1, vendredi=5)
          const dayOfWeek = currentDate.getDay() // 0=dimanche, 1=lundi, ..., 6=samedi
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

          // Vérifier si c'est un jour férié (nécessiterait une table fériés, pour l'instant on ignore)
          // TODO: Ajouter vérification des fériés depuis une table Supabase

          if (!isWeekend) {
            const dateKey = currentDate.toISOString().split('T')[0] // Format YYYY-MM-DD
            // Si plusieurs affectations pour le même jour, prendre la charge maximale (pas d'addition)
            const chargeExistante = joursParAffectation.get(dateKey) || 0
            joursParAffectation.set(dateKey, Math.max(chargeExistante, charge))
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }
      })

      // Vérifier s'il y a des affectations à traiter
      const hasAffectationsNormales = joursParAffectation.size > 0
      const hasAffectationsForcees = affectationsForcees.length > 0

      if (!hasAffectationsNormales && !hasAffectationsForcees) {
        // Aucune affectation avec charge > 0, supprimer toutes les affectations de cette compétence
        for (const a of affectationsComp) {
          await supabaseClient.from('affectations').delete().eq('id', a.id)
        }
        continue
      }

      // Supprimer toutes les anciennes affectations de cette compétence
      for (const a of affectationsComp) {
        await supabaseClient.from('affectations').delete().eq('id', a.id)
      }

      // Recréer les affectations forcées telles quelles
      for (const affectationForcee of affectationsForcees) {
        await supabaseClient.from('affectations').insert({
          affaire_id: affaireData.id,
          site,
          ressource_id,
          competence: comp,
          date_debut: affectationForcee.date_debut,
          date_fin: affectationForcee.date_fin,
          charge: affectationForcee.charge || 0,
          force_weekend_ferie: true,
        })
      }

      // Consolider les affectations normales
      if (hasAffectationsNormales) {
        // Trier les dates
        const datesTriees = Array.from(joursParAffectation.keys()).sort()

        // Regrouper les affectations consécutives avec la même charge
        const nouvellesAffectations: Array<{
          date_debut: string
          date_fin: string
          charge: number
        }> = []

        if (datesTriees.length > 0) {
          let affectationDebut = datesTriees[0]
          let affectationFin = datesTriees[0]
          let chargeActuelle = joursParAffectation.get(datesTriees[0])!

          for (let i = 1; i < datesTriees.length; i++) {
            const dateActuelle = datesTriees[i]
            const datePrecedente = datesTriees[i - 1]
            const chargeActuelleDate = joursParAffectation.get(dateActuelle)!

            // Vérifier si la date actuelle est le jour suivant (consécutif)
            const datePrecObj = new Date(datePrecedente + 'T00:00:00')
            const dateActObj = new Date(dateActuelle + 'T00:00:00')
            const jourSuivant = new Date(datePrecObj)
            jourSuivant.setDate(jourSuivant.getDate() + 1)
            const isConsecutif = dateActObj.getTime() === jourSuivant.getTime()

            // Si consécutif ET même charge, étendre la période
            if (isConsecutif && chargeActuelleDate === chargeActuelle) {
              affectationFin = dateActuelle
            } else {
              // Nouvelle affectation : sauvegarder l'ancienne
              nouvellesAffectations.push({
                date_debut: affectationDebut,
                date_fin: affectationFin,
                charge: chargeActuelle,
              })

              // Commencer une nouvelle affectation
              affectationDebut = dateActuelle
              affectationFin = dateActuelle
              chargeActuelle = chargeActuelleDate
            }
          }

          // Ajouter la dernière affectation
          nouvellesAffectations.push({
            date_debut: affectationDebut,
            date_fin: affectationFin,
            charge: chargeActuelle,
          })

          // Créer les nouvelles affectations consolidées
          for (const nouvelleAffectation of nouvellesAffectations) {
            await supabaseClient.from('affectations').insert({
              affaire_id: affaireData.id,
              site,
              ressource_id,
              competence: comp,
              date_debut: nouvelleAffectation.date_debut,
              date_fin: nouvelleAffectation.date_fin,
              charge: nouvelleAffectation.charge,
              force_weekend_ferie: false,
            })
          }
        }
      }

      totalConsolidated += affectationsComp.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalConsolidated} affectation(s) consolidée(s)`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
