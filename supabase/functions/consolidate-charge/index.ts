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

    const { affaire_id, site, competence } = await req.json()

    if (!affaire_id || !site) {
      return new Response(
        JSON.stringify({ error: 'affaire_id et site sont requis' }),
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

    // Charger toutes les périodes pour cette affaire/site (et compétence si spécifiée)
    let query = supabaseClient
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

    if (queryError) {
      return new Response(
        JSON.stringify({ error: queryError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!allPeriodes || allPeriodes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Aucune période à consolider' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
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

    let totalConsolidated = 0

    // Pour chaque compétence, consolider les périodes
    for (const [comp, periodesComp] of periodesParCompetence.entries()) {
      // Séparer les périodes avec force_weekend_ferie=true (ne pas les consolider)
      const periodesForcees: typeof allPeriodes = []
      const periodesNormales: typeof allPeriodes = []

      periodesComp.forEach((p: any) => {
        if (p.force_weekend_ferie === true) {
          periodesForcees.push(p)
        } else {
          periodesNormales.push(p)
        }
      })

      // Déplier jour par jour (jours ouvrés uniquement) SEULEMENT pour les périodes normales
      const joursParPeriode = new Map<string, number>() // Clé: date ISO (YYYY-MM-DD), Valeur: nb_ressources

      periodesNormales.forEach((p: any) => {
        const dateDebut = new Date(p.date_debut)
        const dateFin = new Date(p.date_fin)
        const nbRessources = p.nb_ressources || 0

        if (nbRessources <= 0) return

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
            // Si plusieurs périodes pour le même jour, prendre le maximum (pas d'addition)
            const nbRessourcesExistantes = joursParPeriode.get(dateKey) || 0
            joursParPeriode.set(dateKey, Math.max(nbRessourcesExistantes, nbRessources))
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }
      })

      // Vérifier s'il y a des périodes à traiter
      const hasPeriodesNormales = joursParPeriode.size > 0
      const hasPeriodesForcees = periodesForcees.length > 0

      if (!hasPeriodesNormales && !hasPeriodesForcees) {
        // Aucune période avec nb_ressources > 0, supprimer toutes les périodes de cette compétence
        for (const p of periodesComp) {
          await supabaseClient.from('periodes_charge').delete().eq('id', p.id)
        }
        continue
      }

      // Supprimer toutes les anciennes périodes de cette compétence
      for (const p of periodesComp) {
        await supabaseClient.from('periodes_charge').delete().eq('id', p.id)
      }

      // Recréer les périodes forcées telles quelles
      for (const periodeForcee of periodesForcees) {
        await supabaseClient.from('periodes_charge').insert({
          affaire_id: affaireData.id,
          site,
          competence: comp,
          date_debut: periodeForcee.date_debut,
          date_fin: periodeForcee.date_fin,
          nb_ressources: periodeForcee.nb_ressources || 0,
          force_weekend_ferie: true,
        })
      }

      // Consolider les périodes normales
      if (hasPeriodesNormales) {
        // Trier les dates
        const datesTriees = Array.from(joursParPeriode.keys()).sort()

        // Regrouper les périodes consécutives avec la même charge
        const nouvellesPeriodes: Array<{
          date_debut: string
          date_fin: string
          nb_ressources: number
        }> = []

        if (datesTriees.length > 0) {
          let periodeDebut = datesTriees[0]
          let periodeFin = datesTriees[0]
          let nbRessourcesActuelle = joursParPeriode.get(datesTriees[0])!

          for (let i = 1; i < datesTriees.length; i++) {
            const dateActuelle = datesTriees[i]
            const datePrecedente = datesTriees[i - 1]
            const nbRessourcesActuelleDate = joursParPeriode.get(dateActuelle)!

            // Vérifier si la date actuelle est le jour suivant (consécutif)
            const datePrecObj = new Date(datePrecedente + 'T00:00:00')
            const dateActObj = new Date(dateActuelle + 'T00:00:00')
            const jourSuivant = new Date(datePrecObj)
            jourSuivant.setDate(jourSuivant.getDate() + 1)
            const isConsecutif = dateActObj.getTime() === jourSuivant.getTime()

            // Si consécutif ET même charge, étendre la période
            if (isConsecutif && nbRessourcesActuelleDate === nbRessourcesActuelle) {
              periodeFin = dateActuelle
            } else {
              // Nouvelle période : sauvegarder l'ancienne
              nouvellesPeriodes.push({
                date_debut: periodeDebut,
                date_fin: periodeFin,
                nb_ressources: nbRessourcesActuelle,
              })

              // Commencer une nouvelle période
              periodeDebut = dateActuelle
              periodeFin = dateActuelle
              nbRessourcesActuelle = nbRessourcesActuelleDate
            }
          }

          // Ajouter la dernière période
          nouvellesPeriodes.push({
            date_debut: periodeDebut,
            date_fin: periodeFin,
            nb_ressources: nbRessourcesActuelle,
          })

          // Créer les nouvelles périodes consolidées
          for (const nouvellePeriode of nouvellesPeriodes) {
            await supabaseClient.from('periodes_charge').insert({
              affaire_id: affaireData.id,
              site,
              competence: comp,
              date_debut: nouvellePeriode.date_debut,
              date_fin: nouvellePeriode.date_fin,
              nb_ressources: nouvellePeriode.nb_ressources,
              force_weekend_ferie: false,
            })
          }
        }
      }

      totalConsolidated += periodesComp.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalConsolidated} période(s) consolidée(s)`,
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

