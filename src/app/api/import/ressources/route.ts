import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ImportRessourceRow {
  nom: string
  site: string
  type_contrat: string | null
  responsable: string | null
  actif: boolean
  date_fin_contrat: string | null
  competences: Array<{ competence: string; type_comp: string }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { ressources }: { ressources: ImportRessourceRow[] } = body

    if (!Array.isArray(ressources) || ressources.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ressource à importer' },
        { status: 400 }
      )
    }

    const errors: Array<{ row: number; message: string }> = []
    let successCount = 0

    // Traiter chaque ressource
    for (let i = 0; i < ressources.length; i++) {
      const ressource = ressources[i]

      try {
        // Vérifier si la ressource existe déjà (même nom + site)
        const { data: existingRessources, error: selectError } = await supabase
          .from('ressources')
          .select('id')
          .eq('nom', ressource.nom)
          .eq('site', ressource.site)
          .limit(1)

        if (selectError) {
          errors.push({
            row: i + 1,
            message: `Erreur lors de la vérification : ${selectError.message}`,
          })
          continue
        }

        let ressourceId: string

        if (existingRessources && existingRessources.length > 0) {
          // Ressource existe déjà, mettre à jour
          ressourceId = existingRessources[0].id

          const { error: updateError } = await supabase
            .from('ressources')
            .update({
              type_contrat: ressource.type_contrat,
              responsable: ressource.responsable,
              actif: ressource.actif,
              date_fin_contrat: ressource.date_fin_contrat,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ressourceId)

          if (updateError) {
            errors.push({
              row: i + 1,
              message: `Erreur lors de la mise à jour : ${updateError.message}`,
            })
            continue
          }
        } else {
          // Créer une nouvelle ressource
          const { data: newRessource, error: insertError } = await supabase
            .from('ressources')
            .insert({
              nom: ressource.nom,
              site: ressource.site,
              type_contrat: ressource.type_contrat,
              responsable: ressource.responsable,
              actif: ressource.actif,
              date_fin_contrat: ressource.date_fin_contrat,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (insertError) {
            errors.push({
              row: i + 1,
              message: `Erreur lors de la création : ${insertError.message}`,
            })
            continue
          }

          if (!newRessource || !newRessource.id) {
            errors.push({
              row: i + 1,
              message: 'Erreur : La ressource a été créée mais aucun ID n\'a été retourné',
            })
            continue
          }

          ressourceId = newRessource.id
        }

        // Supprimer toutes les compétences existantes pour cette ressource
        const { error: deleteError } = await supabase
          .from('ressources_competences')
          .delete()
          .eq('ressource_id', ressourceId)

        if (deleteError) {
          console.warn(`[API Import Ressources] Erreur lors de la suppression des compétences existantes pour ${ressource.nom}:`, deleteError)
          // Ne pas bloquer, continuer quand même
        }

        // Insérer les nouvelles compétences si la liste n'est pas vide
        if (ressource.competences.length > 0) {
          // Vérifier qu'il n'y a qu'une seule compétence principale
          const principales = ressource.competences.filter(c => c.type_comp === 'P')
          if (principales.length > 1) {
            // Si plusieurs principales, garder seulement la première et mettre les autres en secondaire
            console.warn(`[API Import Ressources] Plusieurs compétences principales pour ${ressource.nom}, seule la première sera conservée comme principale`)
            let firstPrincipale = true
            ressource.competences.forEach(c => {
              if (c.type_comp === 'P' && !firstPrincipale) {
                c.type_comp = 'S'
              } else if (c.type_comp === 'P' && firstPrincipale) {
                firstPrincipale = false
              }
            })
          }

          const competencesToInsert = ressource.competences.map(c => ({
            ressource_id: ressourceId,
            competence: c.competence,
            type_comp: c.type_comp || 'S',
            niveau: null, // Le niveau n'est pas dans le fichier Excel
          }))

          const { error: competencesError } = await supabase
            .from('ressources_competences')
            .insert(competencesToInsert)

          if (competencesError) {
            errors.push({
              row: i + 1,
              message: `Erreur lors de l'insertion des compétences : ${competencesError.message}`,
            })
            continue
          }
        }

        successCount++
      } catch (err: any) {
        errors.push({
          row: i + 1,
          message: err.message || 'Erreur inconnue',
        })
      }
    }

    return NextResponse.json({
      success: successCount,
      errors,
      skipped: 0,
    })
  } catch (error: any) {
    console.error('[API Import Ressources] Erreur:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

