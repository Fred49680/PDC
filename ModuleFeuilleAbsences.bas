Attribute VB_Name = "ModuleFeuilleAbsences"

Option Explicit

' ============================================================================
' MODULE : ModuleFeuilleAbsences
' Objectif : Gérer les modifications directes dans la table TblAbsences
'            et la validation automatique des absences
'
' FONCTIONNALITÉS :
' - Détection automatique quand la colonne "Type" change (autres que Formation)
' - Initialisation automatique : "En attente validation" dans Commentaire
' - Initialisation : "Non" dans Validation Saisie
' - Enregistrement : SaisiPar et DateSaisie
' - Quand Validation Saisie passe à "Oui" : Commentaire devient "Validé par XX le XX"
'
' DÉCLENCHEMENT :
' - Se déclenche uniquement quand la colonne "Type" ou "Validation Saisie" est modifiée
' - Pas de déclenchement sur les autres colonnes (optimisation)
'
' UTILISATION :
' Appeler HandleAbsencesTableChange depuis Workbook_SheetChange dans ThisWorkbook :
'
'   Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
'       If Sh.Name = "Absences" Then
'           ModuleFeuilleAbsences.HandleAbsencesTableChange Target
'       End If
'   End Sub
'
' OU depuis Worksheet_Change dans la feuille Absences :
'
'   Private Sub Worksheet_Change(ByVal Target As Range)
'       ModuleFeuilleAbsences.HandleAbsencesTableChange Target
'   End Sub
' ============================================================================

Private Const TBL_NAME As String = "TblAbsences"
Private Const SHEET_NAME As String = "Absences"

' ============================================================================
' CRÉER/MANTENIR LA FEUILLE ET TABLE DES ABSENCES AVEC COLONNES DE VALIDATION
' ============================================================================
Public Sub EnsureAbsencesSheetAndTable()
    On Error Resume Next
    
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    
    ' Si la feuille n'existe pas, la créer
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.name = SHEET_NAME
        Debug.Print "[EnsureAbsencesSheetAndTable] Feuille '" & SHEET_NAME & "' créée"
    End If
    
    ' Vérifier si la table existe
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_NAME)
    On Error GoTo 0
    
    ' Si la table n'existe pas, la créer
    If lo Is Nothing Then
        ' Créer les en-têtes de base
        Dim lastCol As Long: lastCol = 0
        
        ' Colonnes existantes (selon PowerQuery)
        ws.Cells(1, 1).value = "Ressource"
        ws.Cells(1, 2).value = "Site"
        ws.Cells(1, 3).value = "DateDébut"
        ws.Cells(1, 4).value = "DateFin"
        ws.Cells(1, 5).value = "Type"
        ws.Cells(1, 6).value = "Commentaire"
        ws.Cells(1, 7).value = "Comp"
        lastCol = 7
        
        ' Nouvelles colonnes pour validation
        ws.Cells(1, 8).value = "Validation Saisie"
        ws.Cells(1, 9).value = "SaisiPar"
        ws.Cells(1, 10).value = "DateSaisie"
        
        ' Style en-têtes
        With ws.Range(ws.Cells(1, 1), ws.Cells(1, 10))
            .Font.Bold = True
            .Interior.color = RGB(68, 114, 196)
            .Font.color = RGB(255, 255, 255)
        End With
        
        ' Créer la table
        Set lo = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(1, 10)), , xlYes)
        lo.name = TBL_NAME
        lo.TableStyle = "TableStyleMedium2"
        
        Debug.Print "[EnsureAbsencesSheetAndTable] Table '" & TBL_NAME & "' créée"
    Else
        ' Vérifier si les colonnes de validation existent
        Dim cValidationSaisie As Long, cSaisiPar As Long, cDateSaisie As Long
        cValidationSaisie = FindTableColumnIndex(lo, "Validation Saisie")
        cSaisiPar = FindTableColumnIndex(lo, "SaisiPar")
        cDateSaisie = FindTableColumnIndex(lo, "DateSaisie")
        
        ' Ajouter les colonnes manquantes
        If cValidationSaisie = 0 Then
            Dim newCol As ListColumn
            Set newCol = lo.ListColumns.Add(lo.ListColumns.count + 1)
            newCol.name = "Validation Saisie"
            Debug.Print "[EnsureAbsencesSheetAndTable] Colonne 'Validation Saisie' ajoutée"
        End If
        
        If cSaisiPar = 0 Then
            Set newCol = lo.ListColumns.Add(lo.ListColumns.count + 1)
            newCol.name = "SaisiPar"
            Debug.Print "[EnsureAbsencesSheetAndTable] Colonne 'SaisiPar' ajoutée"
        End If
        
        If cDateSaisie = 0 Then
            Set newCol = lo.ListColumns.Add(lo.ListColumns.count + 1)
            newCol.name = "DateSaisie"
            Debug.Print "[EnsureAbsencesSheetAndTable] Colonne 'DateSaisie' ajoutée"
        End If
    End If
    
    ' Appliquer la validation de données sur la colonne Validation Saisie
    If Not lo Is Nothing Then
        Dim cValidation As Long
        cValidation = FindTableColumnIndex(lo, "Validation Saisie")
        
        If cValidation > 0 Then
            ' Créer la liste des choix possibles
            Dim listeChoix As String
            listeChoix = "Oui,Non"
            
            ' Récupérer la colonne complète (en-tête + données)
            Dim colValidation As Range
            Set colValidation = lo.ListColumns(cValidation).Range
            
            ' Appliquer la validation sur toute la colonne (y compris les futures lignes)
            Dim validationRange As Range
            Dim firstRow As Long, lastRow As Long
            firstRow = colValidation.Row + 1 ' Commencer après l'en-tête
            lastRow = 1000 ' Jusqu'à la ligne 1000 pour couvrir les futures lignes
            Set validationRange = ws.Range(ws.Cells(firstRow, colValidation.Column), ws.Cells(lastRow, colValidation.Column))
            
            ' Supprimer toute validation existante
            On Error Resume Next
            validationRange.Validation.Delete
            On Error GoTo 0
            
            ' Appliquer la validation de données
            With validationRange.Validation
                .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
                     Operator:=xlBetween, Formula1:=listeChoix
                .IgnoreBlank = True ' Permettre les cellules vides
                .InCellDropdown = True
                .ShowInput = False ' Pas de message d'aide
                .ShowError = False ' Pas de message d'erreur
            End With
            
            Debug.Print "[EnsureAbsencesSheetAndTable] Validation de données appliquée sur colonne Validation Saisie"
        End If
    End If
    
    On Error GoTo 0
End Sub

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblAbsences
' ============================================================================
Private Function IsInAbsencesTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> SHEET_NAME Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_NAME)
    On Error GoTo Quit
    
    If lo Is Nothing Then GoTo Quit
    If lo.DataBodyRange Is Nothing Then GoTo Quit
    
    ' Vérifier si la cellule est dans le DataBodyRange
    If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
        IsInAbsencesTable = True
        Exit Function
    End If

Quit:
    IsInAbsencesTable = False
End Function

' ============================================================================
' GÉRER UNE MODIFICATION DANS LA TABLE TblAbsences
' ============================================================================
Public Sub HandleAbsencesTableChange(ByVal Target As Range)
    On Error GoTo ErrHandler
    
    ' Vérifier si c'est dans la table
    If Not IsInAbsencesTable(Target) Then Exit Sub
    
    Debug.Print "[HandleAbsencesTableChange] Modification dans TblAbsences - " & Target.Address
    
    ' S'assurer que la table a les colonnes nécessaires
    EnsureAbsencesSheetAndTable
    
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_NAME)
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Trouver les colonnes
    Dim cRessource As Long, cType As Long, cCommentaire As Long
    Dim cValidationSaisie As Long, cSaisiPar As Long, cDateSaisie As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cType = FindTableColumnIndex(lo, "Type")
    cCommentaire = FindTableColumnIndex(lo, "Commentaire")
    cValidationSaisie = FindTableColumnIndex(lo, "Validation Saisie")
    cSaisiPar = FindTableColumnIndex(lo, "SaisiPar")
    cDateSaisie = FindTableColumnIndex(lo, "DateSaisie")
    
    If cRessource = 0 Then Exit Sub
    
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
    
    ' Trouver l'index de la colonne Type
    Dim cTypeIndex As Long
    cTypeIndex = 0
    If cType > 0 Then
        cTypeIndex = lo.ListColumns(cType).Index
    End If
    
    ' Trouver l'index de la colonne Validation Saisie
    Dim cValidationSaisieIndex As Long
    cValidationSaisieIndex = 0
    If cValidationSaisie > 0 Then
        cValidationSaisieIndex = lo.ListColumns(cValidationSaisie).Index
    End If
    
    ' Vérifier quelles colonnes ont été modifiées (pour gérer copier-coller)
    Dim dictColsModifiees As Object: Set dictColsModifiees = CreateObject("Scripting.Dictionary")
    
    For Each cell In Target.Cells
        If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
            dictColsModifiees(CStr(cell.Column)) = True
        End If
    Next cell
    
    ' Traiter chaque ligne modifiée
    Dim rowKey As Variant
    
    For Each rowKey In dictRows.keys
        Dim lr As ListRow: Set lr = lo.ListRows(CLng(rowKey))
        
        If Not lr Is Nothing Then
            ' Vérifier si la colonne Type a été modifiée dans cette ligne
            Dim typeModifie As Boolean: typeModifie = False
            If cTypeIndex > 0 Then
                typeModifie = dictColsModifiees.Exists(CStr(cTypeIndex))
            End If
            
            ' Vérifier si la colonne Validation Saisie a été modifiée dans cette ligne
            Dim validationModifiee As Boolean: validationModifiee = False
            If cValidationSaisieIndex > 0 Then
                validationModifiee = dictColsModifiees.Exists(CStr(cValidationSaisieIndex))
            End If
            
            ' CAS 1 : Colonne Validation Saisie modifiée
            If validationModifiee Then
                Dim validationSaisie As String
                validationSaisie = Trim$(UCase$(CStr(lr.Range(1, cValidationSaisie).value)))
                
                ' Si Validation Saisie passe à "Oui", mettre à jour le commentaire
                If validationSaisie = "OUI" Then
                    Dim commentaireActuel As String
                    commentaireActuel = ""
                    If cCommentaire > 0 Then
                        commentaireActuel = Trim$(CStr(lr.Range(1, cCommentaire).value))
                    End If
                    
                    ' Vérifier si le commentaire n'est pas déjà validé
                    If InStr(commentaireActuel, "Validé par") = 0 Then
                        ' Mettre à jour le commentaire avec "Validé par XX le XX"
                        Dim utilisateur As String
                        utilisateur = Environ("USERNAME")
                        Dim nouveauCommentaire As String
                        nouveauCommentaire = "Validé par " & utilisateur & " le " & Format$(Now, "dd/mm/yyyy hh:mm")
                        
                        ' Si le commentaire actuel contient "En attente validation", le remplacer
                        If InStr(commentaireActuel, "En attente validation") > 0 Then
                            nouveauCommentaire = Replace(commentaireActuel, "En attente validation", nouveauCommentaire)
                        ElseIf Len(commentaireActuel) > 0 Then
                            ' Ajouter la validation au commentaire existant
                            nouveauCommentaire = commentaireActuel & " - " & nouveauCommentaire
                        End If
                        
                        If cCommentaire > 0 Then
                            lr.Range(1, cCommentaire).value = nouveauCommentaire
                        End If
                        
                        Debug.Print "[HandleAbsencesTableChange] Validation appliquée pour ligne " & rowKey & " - " & nouveauCommentaire
                    End If
                End If
            
            ' CAS 2 : Colonne Type modifiée
            ElseIf typeModifie Then
                Dim ressource As String, typeAbs As String, commentaireVal As String, validationVal As String
                Dim saisieParVal As String, dateSaisieVal As Variant
                
                ressource = Trim$(CStr(lr.Range(1, cRessource).value))
                
                If cType > 0 Then
                    typeAbs = Trim$(UCase$(CStr(lr.Range(1, cType).value)))
                Else
                    typeAbs = ""
                End If
                
                If cCommentaire > 0 Then
                    commentaireVal = Trim$(CStr(lr.Range(1, cCommentaire).value))
                Else
                    commentaireVal = ""
                End If
                
                If cValidationSaisie > 0 Then
                    validationVal = Trim$(UCase$(CStr(lr.Range(1, cValidationSaisie).value)))
                Else
                    validationVal = ""
                End If
                
                If cSaisiPar > 0 Then
                    saisieParVal = Trim$(CStr(lr.Range(1, cSaisiPar).value))
                Else
                    saisieParVal = ""
                End If
                
                If cDateSaisie > 0 Then
                    dateSaisieVal = lr.Range(1, cDateSaisie).value
                Else
                    dateSaisieVal = Empty
                End If
                
                ' Si c'est une absence (Ressource rempli) et que ce n'est pas une Formation
                If Len(ressource) > 0 Then
                    Dim isFormation As Boolean: isFormation = False
                    If Len(typeAbs) > 0 Then
                        isFormation = (InStr(typeAbs, "FORMATION") > 0 Or InStr(typeAbs, "TRAINING") > 0)
                    End If
                    
                    ' Si ce n'est pas une formation
                    If Not isFormation Then
                        ' Vérifier si l'absence n'a pas encore été initialisée
                        ' (Commentaire ne contient ni "En attente validation" ni "Validé par")
                        ' ET (Validation Saisie est vide OU SaisiPar est vide)
                        Dim needsInitialization As Boolean: needsInitialization = False
                        
                        If InStr(commentaireVal, "En attente validation") = 0 And InStr(commentaireVal, "Validé par") = 0 Then
                            ' Le commentaire n'a pas encore été initialisé
                            If Len(validationVal) = 0 Or Len(saisieParVal) = 0 Or IsEmpty(dateSaisieVal) Then
                                needsInitialization = True
                            End If
                        End If
                        
                        ' Initialiser la validation si nécessaire
                        If needsInitialization Then
                            ' Mettre "En attente validation" dans le commentaire
                            If cCommentaire > 0 Then
                                lr.Range(1, cCommentaire).value = "En attente validation"
                            End If
                            
                            ' Mettre "Non" dans Validation Saisie
                            If cValidationSaisie > 0 Then
                                lr.Range(1, cValidationSaisie).value = "Non"
                            End If
                            
                            ' Ajouter la personne et la date qui a saisi (seulement si pas déjà rempli)
                            If cSaisiPar > 0 And Len(saisieParVal) = 0 Then
                                lr.Range(1, cSaisiPar).value = Environ("USERNAME")
                            End If
                            
                            If cDateSaisie > 0 And IsEmpty(dateSaisieVal) Then
                                lr.Range(1, cDateSaisie).value = Now
                                lr.Range(1, cDateSaisie).NumberFormat = "dd/mm/yyyy hh:mm"
                            End If
                            
                            Debug.Print "[HandleAbsencesTableChange] Absence non-formation détectée (Type modifié) - Validation initialisée pour ligne " & rowKey
                        End If
                    End If
                End If
            End If
        End If
    Next rowKey
    
    ' Invalider le cache pour forcer le rechargement
    ModuleExec.InvalidateListObjectCache "TblAbsences"
    
    ' Marquer Dashboard et Gantt pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    ModuleExec.mGanttNeedsRefresh = True
    Debug.Print "[HandleAbsencesTableChange] Modification enregistrée"
    ModuleExec.TriggerAutoChecks
    Exit Sub
    
ErrHandler:
    Debug.Print "[HandleAbsencesTableChange] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleFeuilleAbsences", "HandleAbsencesTableChange", False
    Err.Clear
End Sub

' ============================================================================
' FONCTION UTILITAIRE : Trouver l'index d'une colonne dans un ListObject
' ============================================================================
Private Function FindTableColumnIndex(lo As ListObject, header As String) As Long
    On Error Resume Next
    If lo Is Nothing Then Exit Function
    
    Dim i As Long
    Dim colCount As Long
    colCount = lo.ListColumns.count
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    
    For i = 1 To colCount
        If StrComp(lo.ListColumns(i).name, header, vbTextCompare) = 0 Then
            FindTableColumnIndex = i
            Exit Function
        End If
    Next
    On Error GoTo 0
End Function


