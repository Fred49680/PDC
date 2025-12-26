import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAffaireId } from '@/utils/siteMap'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ImportRow {
  affaire_id: string | null
  site: string
  libelle: string
  tranche: string | null
  statut: string
  budget_heures: number | null
  raf_heures: number | null
  date_maj_raf: string | null
  responsable: string | null
  compte?: string
  actif: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { rows }: { rows: ImportRow[] } = body

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à importer' },
        { status: 400 }
      )
    }

    const errors: Array<{ row: number; message: string }> = []
    let successCount = 0
    const batchSize = 50

    // Séparer les lignes avec/sans affaire_id
    const rowsWithId = rows.filter((row) => row.affaire_id && row.affaire_id.trim() !== '')
    const rowsWithoutId = rows.filter((row) => !row.affaire_id || row.affaire_id.trim() === '')

    // Traiter les lignes avec affaire_id
    if (rowsWithId.length > 0) {
      const affaireIds = rowsWithId
        .map((row) => row.affaire_id)
        .filter((id): id is string => id !== null && id.trim() !== '')

      const { data: existingAffaires } = await supabase
        .from('affaires')
        .select('affaire_id')
        .in('affaire_id', affaireIds)

      const existingIds = new Set<string>()
      if (existingAffaires) {
        existingAffaires.forEach((affaire: any) => {
          if (affaire.affaire_id) {
            existingIds.add(affaire.affaire_id)
          }
        })
      }

      const rowsToInsert: ImportRow[] = []
      const rowsToUpdate: ImportRow[] = []

      rowsWithId.forEach((row) => {
        if (row.affaire_id && existingIds.has(row.affaire_id)) {
          rowsToUpdate.push(row)
        } else {
          rowsToInsert.push(row)
        }
      })

      // Insérer par batch
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize)
        const dataToInsert = batch.map((row) => ({
          affaire_id: row.affaire_id,
          site: row.site,
          libelle: row.libelle,
          tranche: row.tranche,
          statut: row.statut || 'Ouverte',
          budget_heures: row.budget_heures,
          raf_heures: row.raf_heures,
          date_maj_raf: row.date_maj_raf,
          responsable: row.responsable,
          compte: row.compte && row.compte.trim() !== '' ? row.compte.trim() : null,
          actif: row.actif ?? true,
          date_creation: new Date().toISOString(),
          date_modification: new Date().toISOString(),
        }))

        const { error } = await supabase.from('affaires').insert(dataToInsert)
        if (error) {
          batch.forEach((row, idx) => {
            errors.push({
              row: rows.indexOf(row) + 1,
              message: error.message || 'Erreur inconnue',
            })
          })
        } else {
          successCount += batch.length
        }
      }

      // Mettre à jour par batch (individuellement car WHERE différent)
      for (const row of rowsToUpdate) {
        if (!row.affaire_id) continue

        const { error } = await supabase
          .from('affaires')
          .update({
            site: row.site,
            libelle: row.libelle,
            tranche: row.tranche,
            statut: row.statut || 'Ouverte',
            budget_heures: row.budget_heures,
            raf_heures: row.raf_heures,
            date_maj_raf: row.date_maj_raf,
            responsable: row.responsable,
            compte: row.compte && row.compte.trim() !== '' ? row.compte.trim() : null,
            actif: row.actif ?? true,
            date_modification: new Date().toISOString(),
          })
          .eq('affaire_id', row.affaire_id)

        if (error) {
          errors.push({
            row: rows.indexOf(row) + 1,
            message: error.message || 'Erreur lors de la mise à jour',
          })
        } else {
          successCount++
        }
      }
    }

    // Traiter les lignes sans affaire_id
    for (let i = 0; i < rowsWithoutId.length; i += batchSize) {
      const batch = rowsWithoutId.slice(i, i + batchSize)
      const dataToInsert = batch.map((row) => ({
        affaire_id: null,
        site: row.site,
        libelle: row.libelle,
        tranche: row.tranche,
        statut: row.statut || 'Ouverte',
        budget_heures: row.budget_heures,
        raf_heures: row.raf_heures,
        date_maj_raf: row.date_maj_raf,
        responsable: row.responsable,
        compte: row.compte && row.compte.trim() !== '' ? row.compte.trim() : null,
        actif: row.actif ?? true,
        date_creation: new Date().toISOString(),
        date_modification: new Date().toISOString(),
      }))

      const { error } = await supabase.from('affaires').insert(dataToInsert)
      if (error) {
        batch.forEach((row) => {
          errors.push({
            row: rows.indexOf(row) + 1,
            message: error.message || 'Erreur inconnue',
          })
        })
      } else {
        successCount += batch.length
      }
    }

    return NextResponse.json({
      success: successCount,
      errors,
      skipped: 0,
    })
  } catch (error: any) {
    console.error('[API Import Affaires] Erreur:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
