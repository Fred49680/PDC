
Option Explicit

' ============================================================================
' MODULE : ModuleFeuilleAffectations
' Objectif : Gérer les modifications directes dans la table TblAffectations
'            pour permettre le copier-coller/glisser dans la table
' ============================================================================

Private Const TBL_NAME As String = "TblAffectations"

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblAffectations
' ============================================================================
Private Function IsInAffectationsTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> "Affectations" Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_NAME)
    On Error GoTo Quit
    
    If lo Is Nothing Then GoTo Quit
    If lo.DataBodyRange Is Nothing Then GoTo Quit
    
    ' Vérifier si la cellule est dans le DataBodyRange
    If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
        IsInAffectationsTable = True
        Exit Function
    End If

Quit:
    IsInAffectationsTable = False
End Function

' ============================================================================
' GÉRER UNE MODIFICATION DANS LA TABLE TblAffectations
' ============================================================================
Public Sub HandleAffectationsTableChange(ByVal Target As Range)
    On Error GoTo ErrHandler
    
    ' Vérifier si c'est dans la table
    If Not IsInAffectationsTable(Target) Then Exit Sub
    
    Debug.Print "[HandleAffectationsTableChange] Modification dans TblAffectations - " & Target.Address
    
    ' Si plusieurs cellules (copier-coller/glisser), traiter chaque ligne
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_NAME)
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Récupérer les lignes uniques modifiées
    Dim dictRows As Object: Set dictRows = CreateObject("Scripting.Dictionary")
    Dim cell As Range
    
    For Each cell In Target.Cells
        If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
            ' Trouver la ligne de la table
            Dim rowIndex As Long
            rowIndex = cell.Row - lo.DataBodyRange.Row + 1
            
            If rowIndex > 0 And rowIndex <= lo.ListRows.count Then
                dictRows(CStr(rowIndex)) = True
            End If
        End If
    Next cell
    
    ' Traiter chaque ligne modifiée
    Dim rowKey As Variant
    
    For Each rowKey In dictRows.keys
        Dim lr As ListRow: Set lr = lo.ListRows(CLng(rowKey))
        
        If Not lr Is Nothing Then
            Dim affaireID As String, siteVal As String, ressource As String, comp As String
            Dim dateDebut As Date, dateFin As Date
            
            ' Lire les valeurs de la ligne
            affaireID = Trim$(CStr(lr.Range(1, 1).value))
            siteVal = Trim$(CStr(lr.Range(1, 2).value))
            ressource = Trim$(CStr(lr.Range(1, 3).value))
            comp = Trim$(CStr(lr.Range(1, 4).value))
            
            If IsDate(lr.Range(1, 5).value) Then dateDebut = CDate(lr.Range(1, 5).value)
            If IsDate(lr.Range(1, 6).value) Then dateFin = CDate(lr.Range(1, 6).value)
            
            ' Vérifier que les données sont valides
            If Len(affaireID) > 0 And Len(siteVal) > 0 And Len(ressource) > 0 And Len(comp) > 0 Then
                ' *** CORRECTION : Vérifier que les dates sont valides autrement que dateDebut > 0 ***
                If dateDebut <> 0 And dateFin <> 0 And dateFin >= dateDebut Then
                    ' Calculer les jours ouvrés et la charge
                    Dim nbJoursOuvres As Long, charge As Double
                    nbJoursOuvres = ModuleCalendar.BusinessDaysBetween(dateDebut, dateFin)
                    
                    If nbJoursOuvres > 0 Then
                        ' Si colonne "JourOuvré" existe (colonne 7), utiliser sa valeur, sinon calculer
                        ' *** CORRECTION : Utiliser lo.ListColumns.Count au lieu de lr.Range.Columns.count ***
                        If lo.ListColumns.count >= 7 And IsNumeric(lr.Range(1, 7).value) Then
                            charge = CDbl(lr.Range(1, 7).value)
                        Else
                            charge = nbJoursOuvres  ' Valeur par défaut : 1 jour = 1 charge
                        End If
                        
                        ' Mettre à jour la charge calculée (colonne 7 - JourOuvré)
                        If lo.ListColumns.count >= 7 Then
                            lr.Range(1, 7).value = charge
                        End If
                    End If
                End If
            End If
        End If
    Next rowKey
    
    ' *** OPTIMISATION : Consolidation déplacée dans Worksheet_Deactivate de modulefeuille.mdc ***
    ' La consolidation sera exécutée une seule fois quand on quitte la feuille Charge
    ' Pas besoin de consolider ici immédiatement
    
    ' Marquer Dashboard et Gantt pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    ModuleExec.mGanttNeedsRefresh = True
    Debug.Print "[HandleAffectationsTableChange] Modifications enregistrées (consolidation reportée à Worksheet_Deactivate)"
    ModuleExec.TriggerAutoChecks
    Exit Sub
    
ErrHandler:
    Debug.Print "[HandleAffectationsTableChange] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleFeuilleAffectations", "HandleAffectationsTableChange", False
    Err.Clear
End Sub

' ============================================================================
' UTILITAIRES
' ============================================================================
Private Function FindAffectationRow(lo As ListObject, aff As String, site As String, _
                                    res As String, comp As String, d As Date) As ListRow
    If lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger toutes les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, d0 As Date, d1 As Date
    ' *** CORRECTION : Normaliser les paramètres localement (pas besoin de modifier les paramètres ByVal) ***
    Dim affNorm As String, siteNorm As String, resNorm As String, compNorm As String
    affNorm = UCase$(Trim$(aff))
    siteNorm = UCase$(Trim$(site))
    resNorm = UCase$(Trim$(res))
    compNorm = UCase$(Trim$(comp))
    
    ' Recherche dans le tableau
    ' *** CORRECTION : Comparaison case-insensitive avec UCase$ ***
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If UCase$(Trim$(CStr(dataArr(i, 1)))) = affNorm And _
           UCase$(Trim$(CStr(dataArr(i, 2)))) = siteNorm And _
           UCase$(Trim$(CStr(dataArr(i, 3)))) = resNorm And _
           UCase$(Trim$(CStr(dataArr(i, 4)))) = compNorm Then
            
            If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
                d0 = CDate(dataArr(i, 5))
                d1 = CDate(dataArr(i, 6))
                
                If d >= d0 And d <= d1 Then
                    Set FindAffectationRow = lo.ListRows(i)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function


