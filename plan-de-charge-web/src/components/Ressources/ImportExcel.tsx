'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExcelRow {
  [key: string]: any
}

interface MappedRessourceRow {
  nom: string
  site: string
  type_contrat: string | null
  responsable: string | null
  actif: boolean
  date_fin_contrat: Date | null
  competences: Array<{ competence: string; type_comp: string }>
}

interface ImportResult {
  success: number
  errors: Array<{ row: number; message: string; data: any }>
  skipped: number
}

export function ImportExcel({ onImportComplete }: { onImportComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<MappedRessourceRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mapping des colonnes Excel vers les colonnes de la base de données
  // Supporte plusieurs variantes de noms (insensible à la casse, avec/sans accents)
  const getColumnMapping = (normalizedCol: string): string | null => {
    const mapping: { [key: string]: string | null } = {
      // NomPrenom (Nom et Prénom)
      'nomprenom': 'nom',
      'nom_prenom': 'nom',
      'nom': 'nom',
      'prenom': 'nom',
      'ressource': 'nom',
      'ressourceid': 'nom',
      'ressource_id': 'nom',
      
      // TypeContrat
      'typecontrat': 'type_contrat',
      'type_contrat': 'type_contrat',
      'typecontr': 'type_contrat',
      'contrat': 'type_contrat',
      
      // Site
      'site': 'site',
      
      // Responsable
      'responsable': 'responsable',
      
      // Actif
      'actif': 'actif',
      'active': 'actif',
      
      // DateFin
      'datefin': 'date_fin_contrat',
      'date_fin': 'date_fin_contrat',
      'datefincontrat': 'date_fin_contrat',
      'date_fin_contrat': 'date_fin_contrat',
      
      // Comp (Compétence)
      'comp': 'comp',
      'competence': 'comp',
      'compétence': 'comp',
      
      // Type_Comp (Type de Compétence)
      'typecomp': 'type_comp',
      'type_comp': 'type_comp',
      'typecompétence': 'type_comp',
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

      // Mapper les données ligne par ligne
      const rawMappedData: Array<{
        nom: string
        site: string
        type_contrat: string | null
        responsable: string | null
        actif: boolean
        date_fin_contrat: Date | null
        comp: string
        type_comp: string
      }> = []

      jsonData.forEach((row, index) => {
        const mapped: any = {
          nom: '',
          site: '',
          type_contrat: null,
          responsable: null,
          actif: true,
          date_fin_contrat: null,
          comp: '',
          type_comp: 'S',
        }

        // Parcourir toutes les colonnes disponibles et les mapper
        for (const excelCol of availableColumns) {
          const normalizedCol = normalizeColumnName(excelCol)
          const dbField = getColumnMapping(normalizedCol)

          if (dbField) {
            const value = row[excelCol]

            switch (dbField) {
              case 'nom':
                mapped.nom = value ? String(value).trim() : ''
                break

              case 'site':
                mapped.site = value ? String(value).trim() : ''
                break

              case 'type_contrat':
                mapped.type_contrat = value && String(value).trim() !== '' ? String(value).trim() : null
                break

              case 'responsable':
                mapped.responsable = value && String(value).trim() !== '' ? String(value).trim() : null
                break

              case 'actif':
                const actifValue = value ? String(value).trim().toUpperCase() : 'OUI'
                mapped.actif = actifValue === 'OUI' || actifValue === 'YES' || actifValue === 'TRUE' || actifValue === '1'
                break

              case 'date_fin_contrat':
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
                      mapped.date_fin_contrat = parsedDate
                    }
                  }
                }
                break

              case 'comp':
                mapped.comp = value ? String(value).trim() : ''
                break

              case 'type_comp':
                const typeCompValue = value ? String(value).trim().toUpperCase() : 'S'
                mapped.type_comp = typeCompValue === 'P' ? 'P' : 'S'
                break
            }
          }
        }

        // Ne garder que les lignes avec nom, site et compétence valides
        if (mapped.nom !== '' && mapped.site !== '' && mapped.comp !== '') {
          rawMappedData.push(mapped)
        }
      })

      if (rawMappedData.length === 0) {
        alert('Aucune ligne valide trouvée. Vérifiez que les colonnes "NomPrenom", "Site" et "Comp" sont remplies.')
        return
      }

      // Regrouper par ressource (nom + site)
      const ressourcesMap = new Map<string, MappedRessourceRow>()

      rawMappedData.forEach((row) => {
        const key = `${row.nom}|${row.site}`
        
        if (!ressourcesMap.has(key)) {
          // Créer une nouvelle ressource
          ressourcesMap.set(key, {
            nom: row.nom,
            site: row.site,
            type_contrat: row.type_contrat,
            responsable: row.responsable,
            actif: row.actif,
            date_fin_contrat: row.date_fin_contrat,
            competences: [],
          })
        }

        // Ajouter la compétence à la ressource
        const ressource = ressourcesMap.get(key)!
        if (row.comp && !ressource.competences.find(c => c.competence === row.comp)) {
          ressource.competences.push({
            competence: row.comp,
            type_comp: row.type_comp,
          })
        }
      })

      // Convertir le Map en tableau
      const groupedData = Array.from(ressourcesMap.values())

      setPreview(groupedData)
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

      // Taille des batches pour l'import
      const batchSize = 50

      // Traiter chaque ressource
      for (let i = 0; i < preview.length; i++) {
        const ressource = preview[i]

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
              data: ressource,
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
                date_fin_contrat: ressource.date_fin_contrat
                  ? ressource.date_fin_contrat.toISOString().split('T')[0]
                  : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', ressourceId)

            if (updateError) {
              errors.push({
                row: i + 1,
                message: `Erreur lors de la mise à jour : ${updateError.message}`,
                data: ressource,
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
                date_fin_contrat: ressource.date_fin_contrat
                  ? ressource.date_fin_contrat.toISOString().split('T')[0]
                  : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single()

            if (insertError) {
              errors.push({
                row: i + 1,
                message: `Erreur lors de la création : ${insertError.message}`,
                data: ressource,
              })
              continue
            }

            if (!newRessource || !newRessource.id) {
              errors.push({
                row: i + 1,
                message: 'Erreur : La ressource a été créée mais aucun ID n\'a été retourné',
                data: ressource,
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
            console.warn(`[ImportExcel] Erreur lors de la suppression des compétences existantes pour ${ressource.nom}:`, deleteError)
            // Ne pas bloquer, continuer quand même
          }

          // Insérer les nouvelles compétences si la liste n'est pas vide
          if (ressource.competences.length > 0) {
            // Vérifier qu'il n'y a qu'une seule compétence principale
            const principales = ressource.competences.filter(c => c.type_comp === 'P')
            if (principales.length > 1) {
              // Si plusieurs principales, garder seulement la première et mettre les autres en secondaire
              console.warn(`[ImportExcel] Plusieurs compétences principales pour ${ressource.nom}, seule la première sera conservée comme principale`)
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
                data: ressource,
              })
              continue
            }
          }

          successCount++
        } catch (err: any) {
          errors.push({
            row: i + 1,
            message: err.message || 'Erreur inconnue',
            data: ressource,
          })
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
          <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
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
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Cliquez pour sélectionner un fichier Excel
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Formats acceptés : .xlsx, .xls
              </p>
              <details className="text-xs text-gray-500 text-left mt-3">
                <summary className="cursor-pointer hover:text-green-600 font-medium">
                  Colonnes attendues dans le fichier Excel
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="font-semibold mb-2">Colonnes obligatoires :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>NomPrenom</strong> : Nom et prénom de la ressource</li>
                    <li><strong>Site</strong> : Site d'affectation</li>
                    <li><strong>Comp</strong> : Compétence (une ligne par compétence)</li>
                  </ul>
                  <p className="font-semibold mt-3 mb-2">Colonnes optionnelles :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>TypeContrat</strong> : Type de contrat (CDI, CDD, ETT, etc.)</li>
                    <li><strong>Responsable</strong> : Nom du responsable</li>
                    <li><strong>Actif</strong> : OUI/NON (défaut : OUI)</li>
                    <li><strong>DateFin</strong> : Date de fin de contrat (format : DD/MM/YYYY)</li>
                    <li><strong>Type_Comp</strong> : Type de compétence - P (Principale) ou S (Secondaire) (défaut : S)</li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-3 italic">
                    Note : Une ressource peut avoir plusieurs compétences. Chaque compétence doit être sur une ligne séparée avec le même NomPrenom et Site.
                  </p>
                </div>
              </details>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
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
              Aperçu des données ({preview.length} ressource(s) regroupée(s))
            </h3>
            <div className="text-sm text-gray-600">
              Colonnes mappées : NomPrenom, Site, TypeContrat, Responsable, Actif, DateFin, Comp, Type_Comp
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-green-50 to-emerald-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Site
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Type Contrat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Responsable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Actif
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Date Fin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Compétences
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((ressource, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {ressource.nom}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ressource.site}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ressource.type_contrat || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ressource.responsable || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {ressource.actif ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ressource.date_fin_contrat
                        ? ressource.date_fin_contrat.toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {ressource.competences.map((comp, compIndex) => (
                          <span
                            key={compIndex}
                            className={`px-2 py-1 text-xs rounded-full ${
                              comp.type_comp === 'P'
                                ? 'bg-blue-100 text-blue-800 font-semibold'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                            title={comp.type_comp === 'P' ? 'Compétence principale' : 'Compétence secondaire'}
                          >
                            {comp.competence}
                            {comp.type_comp === 'P' && ' ⭐'}
                          </span>
                        ))}
                      </div>
                    </td>
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
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Importer ({preview.length} ressource(s))
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
                    {result.success} ressource(s) importée(s) avec succès
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
                      <span className="font-semibold">Ressource {error.row}:</span>
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
              className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Importer un autre fichier
            </button>
          )}
        </div>
      )}
    </div>
  )
}
