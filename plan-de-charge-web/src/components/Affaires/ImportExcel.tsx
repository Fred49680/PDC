'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Affaire } from '@/types/charge'
import { SITES_LIST, TRANCHES_LIST } from '@/utils/siteMap'
import { generateAffaireId } from '@/utils/siteMap'

interface ExcelRow {
  [key: string]: any
}

interface MappedRow {
  affaire_id: string | null
  site: string
  libelle: string
  tranche: string | null
  statut: string
  budget_heures: number | null
  raf_heures: number | null
  date_maj_raf: Date | null
  responsable: string | null
  actif: boolean
  compte?: string // Colonne supplémentaire pour référence
}

interface ImportResult {
  success: number
  errors: Array<{ row: number; message: string; data: any }>
  skipped: number
}

export function ImportExcel({ onImportComplete }: { onImportComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<MappedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mapping des colonnes Excel vers les colonnes de la base de données
  // Supporte plusieurs variantes de noms (insensible à la casse, avec/sans accents)
  const getColumnMapping = (normalizedCol: string): keyof MappedRow | null => {
    const mapping: { [key: string]: keyof MappedRow | null } = {
      // AffaireID (identifiant unique)
      'affaireid': 'affaire_id',
      'affaire_id': 'affaire_id',
      
      // Compte (non stocké en base, juste pour référence)
      'compte': 'compte',
      
      // Libellé (colonne "Affaire" dans Excel)
      'affaire': 'libelle', // "Affaire" = libellé de l'affaire
      'libelle': 'libelle',
      'libellé': 'libelle',
      
      // Site
      'site': 'site',
      
      // Tranche
      'tranche': 'tranche',
      
      // DateDébutDem (calculée automatiquement, ignorée)
      'datedebutdem': null,
      'datedébutdem': null,
      'datedebutdemande': null,
      'datedébutdemande': null,
      
      // DateFinDem (calculée automatiquement, ignorée)
      'datefindem': null,
      'datefindemande': null,
      
      // Responsable
      'responsable': 'responsable',
      
      // Statut
      'statut': 'statut',
      'status': 'statut',
      'etat': 'statut',
      'état': 'statut',
      
      // BudgetHeures
      'budgetheures': 'budget_heures',
      'budget': 'budget_heures',
      'budget_h': 'budget_heures',
      
      // RAF (Reste À Faire)
      'raf': 'raf_heures',
      'rafheures': 'raf_heures',
      'raf_h': 'raf_heures',
      'resteafaire': 'raf_heures',
      'resteàfaire': 'raf_heures',
      
      // DateMAJ (Date de mise à jour du RAF)
      'datemaj': 'date_maj_raf',
      'datemiseajour': 'date_maj_raf',
      'datemiseàjour': 'date_maj_raf',
      'datemajraf': 'date_maj_raf',
      
      // TotalPlanifié (calculé automatiquement, ignoré)
      'totalplanifie': null,
      'totalplanifié': null,
      'total': null,
    }
    
    return mapping[normalizedCol] || null
  }

  // Variantes possibles des noms de colonnes (insensible à la casse, sans accents, sans espaces)
  const normalizeColumnName = (name: string): string => {
    return name
      .trim()
      .replace(/\s+/g, '') // Supprimer les espaces
      .toLowerCase() // Minuscules
      .normalize('NFD') // Décomposer les accents
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Vérifier l'extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext || '')) {
      alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)')
      return
    }

    setFile(selectedFile)
    setResult(null)
    setShowPreview(false)

    try {
      // Lire le fichier Excel
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })

      // Prendre la première feuille
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Convertir en JSON
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Convertir les dates en chaînes
        defval: '', // Valeur par défaut pour les cellules vides
      })

      if (jsonData.length === 0) {
        alert('Le fichier Excel est vide ou ne contient pas de données')
        return
      }

      // Détecter les colonnes disponibles
      const availableColumns = Object.keys(jsonData[0] || {})
      console.log('[ImportExcel] Colonnes disponibles:', availableColumns)

      // Mapper les données
      const mappedData: MappedRow[] = jsonData.map((row, index) => {
        const mapped: MappedRow = {
          affaire_id: null,
          site: '',
          libelle: '',
          tranche: null,
          statut: 'Ouverte',
          budget_heures: null,
          raf_heures: null,
          date_maj_raf: null,
          responsable: null,
          actif: true,
        }

        // Parcourir toutes les colonnes disponibles et les mapper
        for (const excelCol of availableColumns) {
          const normalizedCol = normalizeColumnName(excelCol)
          const dbField = getColumnMapping(normalizedCol)

          // Récupérer la valeur une seule fois pour tous les cas
          const value = row[excelCol]

          if (dbField && dbField !== 'compte') {
            // Traitement selon le type de champ
            switch (dbField) {
              case 'affaire_id':
                // Si AffaireID est fourni, l'utiliser, sinon sera généré plus tard
                mapped.affaire_id = value && String(value).trim() !== '' ? String(value).trim() : null
                break

              case 'site':
                mapped.site = value ? String(value).trim() : ''
                break

              case 'libelle':
                mapped.libelle = value ? String(value).trim() : ''
                break

              case 'tranche':
                mapped.tranche = value && String(value).trim() !== '' ? String(value).trim() : null
                break

              case 'statut':
                const statutValue = value ? String(value).trim() : 'Ouverte'
                // Normaliser le statut
                if (statutValue.toLowerCase() === 'ouverte' || statutValue.toLowerCase() === 'ouvert') {
                  mapped.statut = 'Ouverte'
                } else if (statutValue.toLowerCase() === 'prévisionnelle' || statutValue.toLowerCase() === 'previsionnelle') {
                  mapped.statut = 'Prévisionnelle'
                } else if (statutValue.toLowerCase() === 'fermée' || statutValue.toLowerCase() === 'fermee' || statutValue.toLowerCase() === 'ferme') {
                  mapped.statut = 'Fermée'
                } else {
                  mapped.statut = statutValue || 'Ouverte'
                }
                break

              case 'budget_heures':
                // Extraire le nombre (enlever " H" si présent)
                const budgetStr = value ? String(value).replace(/\s*H\s*/gi, '').trim() : ''
                mapped.budget_heures = budgetStr !== '' && !isNaN(Number(budgetStr)) ? Number(budgetStr) : null
                break

              case 'raf_heures':
                // Extraire le nombre (enlever " H" si présent)
                const rafStr = value ? String(value).replace(/\s*H\s*/gi, '').trim() : ''
                mapped.raf_heures = rafStr !== '' && !isNaN(Number(rafStr)) ? Number(rafStr) : null
                break

              case 'date_maj_raf':
                // Parser la date (format français DD/MM/YYYY ou ISO)
                if (value) {
                  const dateStr = String(value).trim()
                  if (dateStr !== '') {
                    // Essayer de parser la date
                    let parsedDate: Date | null = null

                    // Format français DD/MM/YYYY
                    const frenchDateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
                    if (frenchDateMatch) {
                      const [, day, month, year] = frenchDateMatch
                      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    } else {
                      // Format ISO ou autre
                      parsedDate = new Date(dateStr)
                    }

                    // Vérifier que la date est valide
                    if (!isNaN(parsedDate.getTime())) {
                      mapped.date_maj_raf = parsedDate
                    }
                  }
                }
                break

              case 'responsable':
                mapped.responsable = value && String(value).trim() !== '' ? String(value).trim() : null
                break
            }
          } else if (dbField === 'compte') {
            // Stocker le compte pour référence (non stocké en base)
            mapped.compte = value ? String(value).trim() : undefined
          }
        }

        // Générer automatiquement l'affaire_id si nécessaire (statut Ouverte ou Prévisionnelle)
        if (!mapped.affaire_id && mapped.tranche && mapped.site && mapped.libelle && mapped.statut) {
          if (mapped.statut === 'Ouverte' || mapped.statut === 'Prévisionnelle') {
            mapped.affaire_id = generateAffaireId(mapped.tranche, mapped.site, mapped.libelle, mapped.statut)
          }
        }

        return mapped
      })

      // Filtrer les lignes invalides (site et libelle obligatoires)
      const validData = mappedData.filter((row) => row.site.trim() !== '' && row.libelle.trim() !== '')

      if (validData.length === 0) {
        alert('Aucune ligne valide trouvée. Vérifiez que les colonnes "Site" et "Affaire" (Libellé) sont remplies.')
        return
      }

      setPreview(validData)
      setShowPreview(true)
    } catch (error: any) {
      console.error('[ImportExcel] Erreur lecture fichier:', error)
      alert('Erreur lors de la lecture du fichier Excel : ' + (error.message || 'Erreur inconnue'))
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setImporting(true)
    setResult(null)

    try {
      const supabase = createClient()
      const errors: Array<{ row: number; message: string; data: any }> = []
      let successCount = 0
      let skippedCount = 0

      // Séparer les lignes avec affaire_id et sans affaire_id
      // Les lignes avec affaire_id nécessitent une vérification manuelle (l'index unique partiel n'est pas reconnu par Supabase pour onConflict)
      // Les lignes sans affaire_id doivent être insérées normalement
      const rowsWithId = preview.filter((row) => row.affaire_id !== null && row.affaire_id.trim() !== '')
      const rowsWithoutId = preview.filter((row) => row.affaire_id === null || row.affaire_id.trim() === '')

      // Pour les lignes avec affaire_id : vérifier d'abord quelles existent déjà
      if (rowsWithId.length > 0) {
        // Récupérer tous les affaire_id existants en une seule requête
        const affaireIds = rowsWithId.map((row) => row.affaire_id).filter((id): id is string => id !== null && id.trim() !== '')
        
        const { data: existingAffaires, error: selectError } = await supabase
          .from('affaires')
          .select('affaire_id')
          .in('affaire_id', affaireIds)

        if (selectError) {
          console.error('[ImportExcel] Erreur lors de la vérification des affaires existantes:', selectError)
        }

        // Créer un Set des affaire_id existants pour recherche rapide
        const existingIds = new Set<string>()
        if (existingAffaires) {
          existingAffaires.forEach((affaire: any) => {
            if (affaire.affaire_id) {
              existingIds.add(affaire.affaire_id)
            }
          })
        }

        // Séparer en lignes à insérer et lignes à mettre à jour
        const rowsToInsert: MappedRow[] = []
        const rowsToUpdate: MappedRow[] = []

        rowsWithId.forEach((row) => {
          if (row.affaire_id && existingIds.has(row.affaire_id)) {
            rowsToUpdate.push(row)
          } else {
            rowsToInsert.push(row)
          }
        })

        // Traiter les INSERT par batch
        const batchSize = 50
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
            date_maj_raf: row.date_maj_raf ? row.date_maj_raf.toISOString().split('T')[0] : null,
            responsable: row.responsable,
            actif: row.actif ?? true,
            date_creation: new Date().toISOString(),
            date_modification: new Date().toISOString(),
          }))

          const { error: insertError } = await supabase
            .from('affaires')
            .insert(dataToInsert)

          if (insertError) {
            console.error('[ImportExcel] Erreur batch INSERT:', insertError)
            
            // Essayer ligne par ligne pour identifier les problèmes
            for (let j = 0; j < batch.length; j++) {
              const row = batch[j]
              const rowData = dataToInsert[j]
              
              try {
                const { error: rowError } = await supabase
                  .from('affaires')
                  .insert([rowData])

                if (rowError) {
                  errors.push({
                    row: preview.indexOf(row) + 1,
                    message: rowError.message || 'Erreur inconnue',
                    data: row,
                  })
                } else {
                  successCount++
                }
              } catch (err: any) {
                errors.push({
                  row: preview.indexOf(row) + 1,
                  message: err.message || 'Erreur inconnue',
                  data: row,
                })
              }
            }
          } else {
            successCount += batch.length
          }
        }

        // Traiter les UPDATE par batch
        for (let i = 0; i < rowsToUpdate.length; i += batchSize) {
          const batch = rowsToUpdate.slice(i, i + batchSize)

          // Pour chaque ligne, faire un UPDATE individuel (Supabase ne supporte pas UPDATE batch avec WHERE différent)
          for (const row of batch) {
            if (!row.affaire_id) continue

            const dataToUpdate = {
              site: row.site,
              libelle: row.libelle,
              tranche: row.tranche,
              statut: row.statut || 'Ouverte',
              budget_heures: row.budget_heures,
              raf_heures: row.raf_heures,
              date_maj_raf: row.date_maj_raf ? row.date_maj_raf.toISOString().split('T')[0] : null,
              responsable: row.responsable,
              actif: row.actif ?? true,
              date_modification: new Date().toISOString(),
            }

            const { error: updateError } = await supabase
              .from('affaires')
              .update(dataToUpdate)
              .eq('affaire_id', row.affaire_id)

            if (updateError) {
              errors.push({
                row: preview.indexOf(row) + 1,
                message: updateError.message || 'Erreur lors de la mise à jour',
                data: row,
              })
            } else {
              successCount++
            }
          }
        }
      }

      // Importer les lignes sans affaire_id par batch (insert simple)
      for (let i = 0; i < rowsWithoutId.length; i += batchSize) {
        const batch = rowsWithoutId.slice(i, i + batchSize)

        // Préparer les données pour l'insertion
        const dataToInsert = batch.map((row) => ({
          affaire_id: null, // Explicitement NULL
          site: row.site,
          libelle: row.libelle,
          tranche: row.tranche,
          statut: row.statut || 'Ouverte',
          budget_heures: row.budget_heures,
          raf_heures: row.raf_heures,
          date_maj_raf: row.date_maj_raf ? row.date_maj_raf.toISOString().split('T')[0] : null,
          responsable: row.responsable,
          actif: row.actif ?? true,
          date_creation: new Date().toISOString(),
          date_modification: new Date().toISOString(),
        }))

        // Insert simple (pas d'upsert car affaire_id est NULL)
        const { data, error } = await supabase
          .from('affaires')
          .insert(dataToInsert)
          .select()

        if (error) {
          // Si erreur globale, essayer ligne par ligne
          console.error('[ImportExcel] Erreur batch (sans ID):', error)
          
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j]
            const rowData = dataToInsert[j]
            
            try {
              const { error: rowError } = await supabase
                .from('affaires')
                .insert([rowData])

              if (rowError) {
                errors.push({
                  row: preview.indexOf(row) + 1,
                  message: rowError.message || 'Erreur inconnue',
                  data: row,
                })
              } else {
                successCount++
              }
            } catch (err: any) {
              errors.push({
                row: preview.indexOf(row) + 1,
                message: err.message || 'Erreur inconnue',
                data: row,
              })
            }
          }
        } else {
          successCount += data?.length || 0
        }
      }

      setResult({
        success: successCount,
        errors,
        skipped: skippedCount,
      })

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error: any) {
      console.error('[ImportExcel] Erreur import:', error)
      setResult({
        success: 0,
        errors: [{ row: 0, message: error.message || 'Erreur inconnue', data: null }],
        skipped: 0,
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview([])
    setResult(null)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-gray-800">Import depuis Excel</h2>
        </div>
        {file && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Sélection de fichier */}
      {!file && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-file-input"
          />
          <label
            htmlFor="excel-file-input"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Cliquez pour sélectionner un fichier Excel
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Formats acceptés : .xlsx, .xls
              </p>
              <details className="text-xs text-gray-500 text-left mt-3">
                <summary className="cursor-pointer hover:text-indigo-600 font-medium">
                  Colonnes attendues dans le fichier Excel
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="font-semibold mb-2">Colonnes obligatoires :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Site</strong> : Site de l'affaire</li>
                    <li><strong>Affaire</strong> : Libellé de l'affaire</li>
                  </ul>
                  <p className="font-semibold mt-3 mb-2">Colonnes optionnelles :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>AffaireID</strong> : Identifiant (généré automatiquement si vide)</li>
                    <li><strong>Compte</strong> : Code compte (non stocké, référence uniquement)</li>
                    <li><strong>Tranche</strong> : Tranche/Segment</li>
                    <li><strong>Statut</strong> : Ouverte, Prévisionnelle, ou Fermée</li>
                    <li><strong>Responsable</strong> : Nom du responsable</li>
                    <li><strong>BudgetHeures</strong> : Budget en heures (format : "3402 H" ou "3402")</li>
                    <li><strong>RAF</strong> : Reste À Faire en heures (format : "700 H" ou "700")</li>
                    <li><strong>DateMAJ</strong> : Date de mise à jour du RAF (format : DD/MM/YYYY)</li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-3 italic">
                    Note : Les colonnes DateDébutDem, DateFinDem et TotalPlanifié sont calculées automatiquement et seront ignorées.
                  </p>
                </div>
              </details>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Sélectionner un fichier
            </button>
          </label>
        </div>
      )}

      {/* Aperçu des données */}
      {showPreview && preview.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Aperçu des données ({preview.length} ligne(s))
            </h3>
            <div className="text-sm text-gray-600">
              Colonnes mappées : AffaireID, Compte, Affaire, Site, Tranche, Responsable, Statut, BudgetHeures, RAF, DateMAJ
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Affaire ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Site
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Libellé
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Tranche
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Budget (H)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    RAF (H)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Responsable
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.affaire_id || <span className="text-gray-400 italic">(auto)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.site}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.libelle}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.tranche || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          row.statut === 'Ouverte'
                            ? 'bg-green-100 text-green-800'
                            : row.statut === 'Prévisionnelle'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {row.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.budget_heures !== null ? row.budget_heures.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.raf_heures !== null ? row.raf_heures.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.responsable || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bouton d'import */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Importer ({preview.length} ligne(s))
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Résultat de l'import */}
      {result && (
        <div className="mt-6">
          {result.success > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-green-800 font-semibold">
                    {result.success} affaire(s) importée(s) avec succès
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-semibold">
                  {result.errors.length} erreur(s) lors de l'import
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <ul className="space-y-2 text-sm text-red-700">
                  {result.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="font-semibold">Ligne {error.row}:</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {result.success > 0 && result.errors.length === 0 && (
            <button
              onClick={handleReset}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Importer un autre fichier
            </button>
          )}
        </div>
      )}
    </div>
  )
}
