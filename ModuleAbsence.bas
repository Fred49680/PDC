

' ============================================================================
' MODULE GESTION ABSENCES ET CONFLITS
' À ajouter dans un nouveau module ou à la fin de ModuleAffectation
' ============================================================================
Option Explicit

' ==== NOUVELLES CONSTANTES ====
Private Const TBL_ABSENCES As String = "TblAbsences"
Private Const TBL_ALERTES As String = "TblAlertes"
Private Const COLOR_ABSENCE As Long = &HC0C0C0    ' Gris
Private Const COLOR_FORMATION As Long = &HFFC000  ' Orange
Private Const COLOR_CONFLIT As Long = &H80FFFF    ' Jaune orangé
Private Const COLOR_TRANSFERT_INDISPO As Long = &HD0D0D0    ' Gris clair pour transfert indispo

' ============================================================================
' 1) TABLE ABSENCES
' Colonnes : RessourceID | DateDebut | DateFin | Motif
' L'absence est GLOBALE, pas liée à une affaire ou un site
' ============================================================================

Public Function GetAbsencesTable() As ListObject
    Set GetAbsencesTable = ModuleExec.GetAbsencesTable()
End Function

' ============================================================================
' 2) TABLE ALERTES
' Colonnes : DateAction | TypeAlerte | Ressource | AffaireID | Site | Competence |
'            DateDebut | DateFin | Action | Utilisateur
' Les alertes conservent l'affaire/site pour traçabilité des retraits
' ============================================================================

Public Function GetAlertesTable() As ListObject
    Set GetAlertesTable = ModuleExec.GetAlertesTable()
End Function

' ============================================================================
' CRÉER/MANTENIR LA FEUILLE ET TABLE DES ALERTES
' ============================================================================
Public Sub EnsureAlertesSheetAndTable()
    On Error Resume Next
    
    ' MODIFIÉ : Vérifier d'abord si la table existe dans le fichier DONNEES
    Dim loDonnees As ListObject
    Set loDonnees = ModuleExec.GetAlertesTable()
    If Not loDonnees Is Nothing Then
        ' La table existe, vérifier si elle est dans DONNEES (pas dans ThisWorkbook)
        If loDonnees.Parent.Parent.name <> ThisWorkbook.name Then
            ' La table est dans DONNEES, ne pas créer de feuille dans ThisWorkbook
            Debug.Print "[EnsureAlertesSheetAndTable] Table trouvée dans fichier DONNEES - Pas de création de feuille locale"
            On Error GoTo 0
            Exit Sub
        End If
    End If
    
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Alertes")
    
    ' Si la feuille n'existe pas, la créer
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.name = "Alertes"
        Debug.Print "[EnsureAlertesSheetAndTable] Feuille 'Alertes' créée"
    End If
    
    ' Vérifier si la table existe
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_ALERTES)
    On Error GoTo 0
    
    ' Si la table n'existe pas, la créer
    If lo Is Nothing Then
        ' Créer les en-têtes (12 colonnes : PriseEnCompte, Courrier Statut + les 10 existantes)
        ws.Cells(1, 1).value = "PriseEnCompte"
        ws.Cells(1, 2).value = "Courrier Statut"
        ws.Cells(1, 3).value = "DateAction"
        ws.Cells(1, 4).value = "TypeAlerte"
        ws.Cells(1, 5).value = "Ressource"
        ws.Cells(1, 6).value = "AffaireID"
        ws.Cells(1, 7).value = "Site"
        ws.Cells(1, 8).value = "Competence"
        ws.Cells(1, 9).value = "DateDebut"
        ws.Cells(1, 10).value = "DateFin"
        ws.Cells(1, 11).value = "Action"
        ws.Cells(1, 12).value = "Utilisateur"
        
        ' Style en-têtes
        With ws.Range(ws.Cells(1, 1), ws.Cells(1, 12))
            .Font.Bold = True
            .Interior.color = RGB(68, 114, 196)
            .Font.color = RGB(255, 255, 255)
        End With
        
        ' Créer la table
        Set lo = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(1, 12)), , xlYes)
        lo.name = TBL_ALERTES
        lo.TableStyle = "TableStyleMedium2"
        
        Debug.Print "[EnsureAlertesSheetAndTable] Table '" & TBL_ALERTES & "' créée"
    Else
        ' Vérifier si la colonne "PriseEnCompte" existe déjà
        Dim cPriseEnCompte As Long
        cPriseEnCompte = FindTableColumnIndex(lo, "PriseEnCompte")
        
        ' Si la colonne n'existe pas, l'ajouter en première position
        If cPriseEnCompte = 0 Then
            ' Ajouter la colonne en première position
            Dim newCol As ListColumn
            Set newCol = lo.ListColumns.Add(1)
            newCol.name = "PriseEnCompte"
            Debug.Print "[EnsureAlertesSheetAndTable] Colonne 'PriseEnCompte' ajoutée en première position"
        End If
        
        ' Vérifier si la colonne "Courrier Statut" existe déjà
        Dim cCourrierStatut As Long
        cCourrierStatut = FindTableColumnIndex(lo, "Courrier Statut")
        
        ' Si la colonne n'existe pas, l'ajouter après "PriseEnCompte"
        If cCourrierStatut = 0 Then
            ' Trouver la position de "PriseEnCompte"
            Dim posPriseEnCompte As Long
            posPriseEnCompte = FindTableColumnIndex(lo, "PriseEnCompte")
            
            If posPriseEnCompte > 0 Then
                ' Ajouter la colonne après "PriseEnCompte"
                Set newCol = lo.ListColumns.Add(posPriseEnCompte + 1)
                newCol.name = "Courrier Statut"
                Debug.Print "[EnsureAlertesSheetAndTable] Colonne 'Courrier Statut' ajoutée après 'PriseEnCompte'"
            Else
                ' Si PriseEnCompte n'existe pas, l'ajouter en position 2
                Set newCol = lo.ListColumns.Add(2)
                newCol.name = "Courrier Statut"
                Debug.Print "[EnsureAlertesSheetAndTable] Colonne 'Courrier Statut' ajoutée en position 2"
            End If
        End If
    End If
    
    ' Appliquer la validation de données sur les colonnes PriseEnCompte et Courrier Statut
    If Not lo Is Nothing Then
        ' Validation sur PriseEnCompte
        Dim cPriseEnCompteVal As Long
        cPriseEnCompteVal = FindTableColumnIndex(lo, "PriseEnCompte")
        
        If cPriseEnCompteVal > 0 Then
            ' Créer la liste des choix possibles
            Dim listeChoix As String
            listeChoix = "Oui,Non"
            
            ' Récupérer la colonne complète (en-tête + données)
            Dim colPriseEnCompte As Range
            Set colPriseEnCompte = lo.ListColumns(cPriseEnCompteVal).Range
            
            ' Appliquer la validation sur toute la colonne (y compris les futures lignes)
            Dim validationRange As Range
            Dim firstRow As Long, lastRow As Long
            firstRow = colPriseEnCompte.Row + 1  ' Commencer après l'en-tête
            lastRow = 1000  ' Jusqu'à la ligne 1000 pour couvrir les futures lignes
            Set validationRange = ws.Range(ws.Cells(firstRow, colPriseEnCompte.Column), ws.Cells(lastRow, colPriseEnCompte.Column))
            
            ' Supprimer toute validation existante
            On Error Resume Next
            validationRange.Validation.Delete
            On Error GoTo 0
            
            ' Appliquer la validation de données
            With validationRange.Validation
                .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
                     Operator:=xlBetween, Formula1:=listeChoix
                .IgnoreBlank = True  ' Permettre les cellules vides
                .InCellDropdown = True
                .ShowInput = False  ' Pas de message d'aide
                .ShowError = False  ' Pas de message d'erreur
            End With
            
            Debug.Print "[EnsureAlertesSheetAndTable] Validation de données appliquée sur colonne PriseEnCompte (lignes " & firstRow & " à " & lastRow & ")"
        End If
        
        ' Validation sur Courrier Statut
        Dim cCourrierStatutVal As Long
        cCourrierStatutVal = FindTableColumnIndex(lo, "Courrier Statut")
        
        If cCourrierStatutVal > 0 Then
            ' Créer la liste des choix possibles
            Dim listeChoixCourrier As String
            listeChoixCourrier = "A envoyer,Envoyé"
            
            ' Récupérer la colonne complète (en-tête + données)
            Dim colCourrierStatut As Range
            Set colCourrierStatut = lo.ListColumns(cCourrierStatutVal).Range
            
            ' Appliquer la validation sur toute la colonne (y compris les futures lignes)
            firstRow = colCourrierStatut.Row + 1  ' Commencer après l'en-tête
            lastRow = 1000  ' Jusqu'à la ligne 1000 pour couvrir les futures lignes
            Set validationRange = ws.Range(ws.Cells(firstRow, colCourrierStatut.Column), ws.Cells(lastRow, colCourrierStatut.Column))
            
            ' Supprimer toute validation existante
            On Error Resume Next
            validationRange.Validation.Delete
            On Error GoTo 0
            
            ' Appliquer la validation de données
            With validationRange.Validation
                .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
                     Operator:=xlBetween, Formula1:=listeChoixCourrier
                .IgnoreBlank = True  ' Permettre les cellules vides
                .InCellDropdown = True
                .ShowInput = False  ' Pas de message d'aide
                .ShowError = False  ' Pas de message d'erreur
            End With
            
            Debug.Print "[EnsureAlertesSheetAndTable] Validation de données appliquée sur colonne Courrier Statut (lignes " & firstRow & " à " & lastRow & ")"
        End If
    End If
    
    On Error GoTo 0
End Sub

' ============================================================================
' 3) ENREGISTRER UNE ABSENCE
' ============================================================================

Public Sub EnregistrerAbsence(ressource As String, dateDebut As Date, dateFin As Date, _
                              motif As String, Optional affaireID As String = "", _
                              Optional siteVal As String = "")
    
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Then
        MsgBox "Table TblAbsences introuvable. Créez une feuille 'Absences' avec une table 'TblAbsences'.", vbCritical
        Exit Sub
    End If
    
    ' Vérifier les conflits avant d'enregistrer
    Dim conflits As Collection
    Set conflits = VerifierConflitsAbsence(ressource, dateDebut, dateFin)
    
    If conflits.count > 0 Then
        Dim msg As String
        msg = "?? ATTENTION : " & ressource & " est déjà affecté(e) sur :" & vbCrLf & vbCrLf
        
        Dim i As Integer
        For i = 1 To conflits.count
            msg = msg & "• " & conflits(i) & vbCrLf
        Next i
        
        msg = msg & vbCrLf & "Voulez-vous enregistrer l'absence et retirer ces affectations ?"
        
        If MsgBox(msg, vbYesNo + vbExclamation, "Conflit d'affectation") = vbYes Then
            ' Retirer les affectations conflictuelles
            RetirerAffectationsConflictuelles ressource, dateDebut, dateFin
        Else
            Exit Sub
        End If
    End If
    
    ' S'assurer que la table a les colonnes de validation
    ModuleFeuilleAbsences.EnsureAbsencesSheetAndTable
    
    ' Trouver les indices de colonnes dynamiquement
    Dim cRessource As Long, cSite As Long, cDateDebut As Long, cDateFin As Long
    Dim cType As Long, cCommentaire As Long, cComp As Long
    Dim cValidationSaisie As Long, cSaisiPar As Long, cDateSaisie As Long
    
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cSite = FindTableColumnIndex(lo, "Site")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    cCommentaire = FindTableColumnIndex(lo, "Commentaire")
    cComp = FindTableColumnIndex(lo, "Comp")
    cValidationSaisie = FindTableColumnIndex(lo, "Validation Saisie")
    cSaisiPar = FindTableColumnIndex(lo, "SaisiPar")
    cDateSaisie = FindTableColumnIndex(lo, "DateSaisie")
    
    ' Ajouter l'absence
    Dim newRow As ListRow
    Set newRow = lo.ListRows.Add
    
    ' Remplir les colonnes de base
    If cRessource > 0 Then newRow.Range(1, cRessource).value = ressource
    If cDateDebut > 0 Then newRow.Range(1, cDateDebut).value = dateDebut
    If cDateFin > 0 Then newRow.Range(1, cDateFin).value = dateFin
    If cType > 0 Then newRow.Range(1, cType).value = motif
    If cSite > 0 Then newRow.Range(1, cSite).value = siteVal
    If cComp > 0 Then newRow.Range(1, cComp).value = "" ' Comp vide par défaut
    
    ' Vérifier si c'est une formation
    Dim isFormation As Boolean: isFormation = False
    Dim typeAbs As String: typeAbs = UCase$(Trim$(motif))
    If InStr(typeAbs, "FORMATION") > 0 Or InStr(typeAbs, "TRAINING") > 0 Then
        isFormation = True
    End If
    
    ' Si ce n'est pas une formation, initialiser la validation
    If Not isFormation Then
        If cCommentaire > 0 Then
            newRow.Range(1, cCommentaire).value = "En attente validation"
        End If
        
        If cValidationSaisie > 0 Then
            newRow.Range(1, cValidationSaisie).value = "Non"
        End If
        
        If cSaisiPar > 0 Then
            newRow.Range(1, cSaisiPar).value = Environ("USERNAME")
        End If
        
        If cDateSaisie > 0 Then
            newRow.Range(1, cDateSaisie).value = Now
            newRow.Range(1, cDateSaisie).NumberFormat = "dd/mm/yyyy hh:mm"
        End If
    End If
    
    ' Invalider le cache après ajout
    ModuleExec.InvalidateListObjectCache "TblAbsences"
    
    ' Vérifier si c'est un arrêt maladie > 30 jours et créer une alerte spécifique
    Dim typeAbs As String: typeAbs = UCase$(Trim$(motif))
    Dim dureeCalendaire As Long: dureeCalendaire = DateDiff("d", dateDebut, dateFin) + 1
    
    ' Si c'est une maladie et > 30 jours calendaires, créer une alerte spécifique
    If (InStr(typeAbs, "MALADIE") > 0 Or InStr(typeAbs, "ARRET") > 0) And dureeCalendaire > 30 Then
        LoggerAlerte "ARRET_MALADIE_30J", ressource, affaireID, siteVal, "", _
                     dateDebut, dateFin, "Arrêt maladie de " & dureeCalendaire & " jours calendaires - Courrier à envoyer"
    Else
        ' Logger dans les alertes (alerte normale)
        LoggerAlerte "ABSENCE_AJOUTEE", ressource, affaireID, siteVal, "", _
                     dateDebut, dateFin, "Absence enregistrée : " & motif
    End If
    
    ' Vérification automatique déplacée dans Workbook_SheetDeactivate
    
    ' Marquer Dashboard pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    Debug.Print "[Dashboard] Flag mis à True (modification absence)"
    ModuleExec.TriggerAutoChecks
    
    MsgBox "Absence enregistrée pour " & ressource & " du " & Format(dateDebut, "dd/mm/yyyy") & _
           " au " & Format(dateFin, "dd/mm/yyyy"), vbInformation
End Sub

' ============================================================================
' 4) VÉRIFIER SI UNE RESSOURCE EST ABSENTE
' ============================================================================

' Note: Cette fonction vérifie TOUS les types d'absences (Congé, Maladie, etc.) SAUF les formations
' Les formations sont détectées par EstEnFormation (qui a la priorité)
Public Function EstAbsent(ressource As String, d As Date) As Boolean
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Then Exit Function
    If lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Trouver les indices de colonnes dynamiquement
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Then Exit Function
    
    ' Charger toutes les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    On Error GoTo 0
    
    Dim i As Long, d0 As Date, d1 As Date
    ressource = Trim$(ressource)
    
    ' Vérifier TOUS les types d'absences SAUF les formations
    ' Les formations sont détectées par EstEnFormation (priorité plus haute)
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRessource))) = ressource Then
            If IsDate(dataArr(i, cDateDebut)) And IsDate(dataArr(i, cDateFin)) Then
                d0 = CDate(dataArr(i, cDateDebut))
                d1 = CDate(dataArr(i, cDateFin))
                
                ' Si la date est dans la période d'absence
                If d >= d0 And d <= d1 Then
                    ' Exclure les formations (détectées par EstEnFormation)
                    Dim typeAbs As String
                    typeAbs = ""
                    If cType > 0 And UBound(dataArr, 2) >= cType Then
                        typeAbs = UCase$(Trim$(CStr(dataArr(i, cType))))
                    End If
                    
                    ' Si c'est une formation, ignorer (EstEnFormation s'en charge)
                    If InStr(typeAbs, "FORMATION") > 0 Or InStr(typeAbs, "TRAINING") > 0 Then
                        GoTo NextAbsence
                    End If
                    
                    ' Sinon, c'est une absence normale (Congé, Maladie, etc.)
                    EstAbsent = True
                    Exit Function
                End If
            End If
        End If
NextAbsence:
    Next i
End Function

' ============================================================================
' 5) OBTENIR DÉTAILS ABSENCE
' ============================================================================

Public Function GetDetailsAbsence(ressource As String, d As Date) As String
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Then
        GetDetailsAbsence = ""
        Exit Function
    End If
    If lo.DataBodyRange Is Nothing Then
        GetDetailsAbsence = ""
        Exit Function
    End If
    
    ' Trouver les indices de colonnes dynamiquement
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long, cCommentaire As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    cCommentaire = FindTableColumnIndex(lo, "Commentaire")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Then
        GetDetailsAbsence = ""
        Exit Function
    End If
    
    ' Charger toutes les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Err.Clear
        GetDetailsAbsence = ""
        Exit Function
    End If
    On Error GoTo 0
    
    Dim i As Long, d0 As Date, d1 As Date
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRessource))) = ressource Then
            If IsDate(dataArr(i, cDateDebut)) And IsDate(dataArr(i, cDateFin)) Then
                d0 = CDate(dataArr(i, cDateDebut))
                d1 = CDate(dataArr(i, cDateFin))
                
                If d >= d0 And d <= d1 Then
                    GetDetailsAbsence = "Absent(e) du " & Format(d0, "dd/mm/yyyy") & _
                                       " au " & Format(d1, "dd/mm/yyyy")
                    
                    ' Ajouter le type si disponible
                    If cType > 0 And UBound(dataArr, 2) >= cType Then
                        Dim typeAbs As String
                        typeAbs = Trim$(CStr(dataArr(i, cType)))
                        If Len(typeAbs) > 0 Then
                            GetDetailsAbsence = GetDetailsAbsence & vbCrLf & "Type : " & typeAbs
                        End If
                    End If
                    
                    ' Ajouter le commentaire si disponible
                    If cCommentaire > 0 And UBound(dataArr, 2) >= cCommentaire Then
                        Dim commentaire As String
                        commentaire = Trim$(CStr(dataArr(i, cCommentaire)))
                        If Len(commentaire) > 0 Then
                            GetDetailsAbsence = GetDetailsAbsence & vbCrLf & "Commentaire : " & commentaire
                        End If
                    End If
                    
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

' ============================================================================
' 5b) VÉRIFIER SI C'EST UNE FORMATION
' ============================================================================

Public Function EstEnFormation(ressource As String, d As Date) As Boolean
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Then Exit Function
    If lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Trouver les indices de colonnes dynamiquement
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Or cType = 0 Then Exit Function
    
    ' Charger toutes les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    On Error GoTo 0
    
    Dim i As Long, d0 As Date, d1 As Date
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRessource))) = ressource Then
            If IsDate(dataArr(i, cDateDebut)) And IsDate(dataArr(i, cDateFin)) Then
                d0 = CDate(dataArr(i, cDateDebut))
                d1 = CDate(dataArr(i, cDateFin))
                
                If d >= d0 And d <= d1 Then
                    ' Vérifier si c'est une formation (colonne Type contient "Formation" ou similaire)
                    Dim typeAbs As String
                    typeAbs = ""
                    If UBound(dataArr, 2) >= cType Then
                        typeAbs = UCase$(Trim$(CStr(dataArr(i, cType))))
                    End If
                    ' Vérifier si le type contient "FORMATION" ou "TRAINING"
                    If InStr(typeAbs, "FORMATION") > 0 Or InStr(typeAbs, "TRAINING") > 0 Then
                        EstEnFormation = True
                        Exit Function
                    End If
                End If
            End If
        End If
    Next i
End Function

' ============================================================================
' FONCTION UTILITAIRE : Trouver l'index d'une colonne dans un ListObject
' ============================================================================
Private Function FindTableColumnIndex(lo As ListObject, header As String) As Long
    On Error Resume Next
    FindTableColumnIndex = 0  ' Valeur par défaut
    
    ' *** AJOUT : Vérification critique que lo n'est pas Nothing ***
    If lo Is Nothing Then
        Debug.Print "[FindTableColumnIndex] ERREUR : lo est Nothing pour colonne '" & header & "'"
        Exit Function
    End If
    
    ' Vérifier que lo est valide en testant l'accès à une propriété
    Dim testName As String
    testName = lo.name
    If Err.Number <> 0 Then
        Debug.Print "[FindTableColumnIndex] ERREUR accès lo.Name pour colonne '" & header & "': " & Err.Description
        Err.Clear
        Exit Function
    End If
    
    Dim i As Long
    Dim colCount As Long
    colCount = lo.ListColumns.count
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    
    For i = 1 To colCount
        On Error Resume Next
        Dim colName As String
        Dim col As ListColumn
        Set col = lo.ListColumns(i)
        If Err.Number <> 0 Or col Is Nothing Then
            Err.Clear
            GoTo NextCol
        End If
        colName = col.name
        If Err.Number <> 0 Then
            Err.Clear
            GoTo NextCol
        End If
        On Error GoTo 0
        If StrComp(colName, header, vbTextCompare) = 0 Then
            FindTableColumnIndex = i
            Exit Function
        End If
NextCol:
    Next
    On Error GoTo 0
End Function

' ============================================================================
' 6) VÉRIFIER CONFLITS D'AFFECTATION
' ============================================================================

Private Function VerifierConflitsAbsence(ressource As String, dateDebut As Date, _
                                         dateFin As Date) As Collection
    Dim conflits As New Collection
    Dim lo As ListObject: Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set VerifierConflitsAbsence = conflits
        Exit Function
    End If
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, d0 As Date, d1 As Date
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, 3))) = ressource Then
            If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
                d0 = CDate(dataArr(i, 5))
                d1 = CDate(dataArr(i, 6))
                
                ' Chevauchement ?
                If Not (dateFin < d0 Or dateDebut > d1) Then
                    Dim affaire As String, site As String, comp As String
                    affaire = Trim$(CStr(dataArr(i, 1)))
                    site = Trim$(CStr(dataArr(i, 2)))
                    comp = Trim$(CStr(dataArr(i, 4)))
                    
                    conflits.Add affaire & " / " & site & " / " & comp & _
                                " (" & Format(d0, "dd/mm") & " - " & Format(d1, "dd/mm") & ")"
                End If
            End If
        End If
    Next i
    
    Set VerifierConflitsAbsence = conflits
End Function

' ============================================================================
' 7) RETIRER AFFECTATIONS CONFLICTUELLES
' ============================================================================

Private Sub RetirerAffectationsConflictuelles(ressource As String, dateDebut As Date, dateFin As Date)
    Dim lo As ListObject: Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    Dim i As Long
    Dim deleted As Boolean: deleted = False
    For i = lo.ListRows.count To 1 Step -1
        Dim r As Range: Set r = lo.ListRows(i).Range
        
        If Trim$(CStr(r.Cells(1, 3).value)) = ressource Then
            Dim d0 As Date, d1 As Date
            d0 = CDate(r.Cells(1, 5).value)
            d1 = CDate(r.Cells(1, 6).value)
            
            ' Chevauchement ?
            If Not (dateFin < d0 Or dateDebut > d1) Then
                Dim affaire As String, site As String, comp As String
                affaire = Trim$(CStr(r.Cells(1, 1).value))
                site = Trim$(CStr(r.Cells(1, 2).value))
                comp = Trim$(CStr(r.Cells(1, 4).value))
                
                ' Logger avant suppression
                LoggerAlerte "AFFECTATION_RETIREE", ressource, affaire, site, comp, _
                            d0, d1, "Retrait automatique pour cause d'absence"
                
                ' Supprimer l'affectation
                lo.ListRows(i).Delete
                deleted = True
            End If
        End If
    Next i
    
    ' Invalider le cache après suppression
    If deleted Then ModuleExec.InvalidateListObjectCache "TblAffectations"
End Sub

' ============================================================================
' 8) VÉRIFIER SI RESSOURCE AFFECTÉE AILLEURS
' ============================================================================

' Détecte si la ressource est affectée sur une AUTRE affaire/site
Public Function EstAffecteAilleurs(ressource As String, affaireActuelle As String, _
                                  siteActuel As String, d As Date) As String
    On Error Resume Next
    Dim lo As ListObject: Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Then
        EstAffecteAilleurs = ""
        Exit Function
    End If
    If lo.DataBodyRange Is Nothing Then
        EstAffecteAilleurs = ""
        Exit Function
    End If
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Err.Clear
        EstAffecteAilleurs = ""
        Exit Function
    End If
    On Error GoTo 0
    
    Dim i As Long, res As String, aff As String, site As String, comp As String
    Dim d0 As Date, d1 As Date
    ressource = Trim$(ressource)
    affaireActuelle = Trim$(affaireActuelle)
    siteActuel = Trim$(siteActuel)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        res = Trim$(CStr(dataArr(i, 3)))
        aff = Trim$(CStr(dataArr(i, 1)))
        site = Trim$(CStr(dataArr(i, 2)))
        comp = Trim$(CStr(dataArr(i, 4)))
        
        ' Même ressource ET date dans la période, MAIS AUTRE affaire/site (conflit)
        If res = ressource Then
            ' Exclure si c'est la même affaire/site (ce n'est pas un conflit, c'est son affectation)
            If aff = affaireActuelle And site = siteActuel Then
                GoTo NextAffectation  ' Pas un conflit, c'est la même affectation
            End If
            
            If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
                d0 = CDate(dataArr(i, 5))
                d1 = CDate(dataArr(i, 6))
                
                ' Date dans la période d'affectation existante sur une AUTRE affaire/site
                If d >= d0 And d <= d1 Then
                    ' C'est un conflit : la ressource est affectée sur une autre affaire/site
                    EstAffecteAilleurs = aff & " / " & site & " / " & comp & _
                                        " (" & Format(d0, "dd/mm") & " - " & Format(d1, "dd/mm") & ")"
                    Exit Function
                End If
            End If
        End If
NextAffectation:
    Next i
End Function

' ============================================================================
' 9) LOGGER UNE ALERTE
' ============================================================================

Public Sub LoggerAlerte(typeAlerte As String, ressource As String, _
                        affaireID As String, siteVal As String, comp As String, _
                        dateDebut As Date, dateFin As Date, action As String)
    
    ' S'assurer que la feuille et la table existent
    EnsureAlertesSheetAndTable
    
    ' *** CORRECTION : Invalider le cache AVANT de récupérer lo pour forcer une récupération fraîche ***
    ModuleExec.InvalidateListObjectCache "TblAlertes"
    
    ' *** CORRECTION : Récupérer lo APRÈS EnsureAlertesSheetAndTable pour avoir un objet valide ***
    Dim lo As ListObject
    On Error Resume Next
    Set lo = GetAlertesTable()
    
    If Err.Number <> 0 Then
        Debug.Print "[LoggerAlerte] ERREUR GetAlertesTable: " & Err.Number & " - " & Err.Description
        Err.Clear
        ' Réessayer une fois
        Set lo = GetAlertesTable()
    End If
    
    If lo Is Nothing Then
        Debug.Print "[LoggerAlerte] ERREUR : GetAlertesTable() a retourné Nothing après invalidation cache"
        Exit Sub
    End If
    
    ' Vérifier que lo est valide
    Dim testName As String
    testName = lo.name
    If Err.Number <> 0 Then
        Debug.Print "[LoggerAlerte] ERREUR : lo invalide : " & Err.Description
        Err.Clear
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo 0
    
    ' Vérifier si c'est un arrêt maladie > 30 jours calendaires
    Dim isArretMaladie As Boolean: isArretMaladie = False
    Dim dureeCalendaire As Long: dureeCalendaire = 0
    Dim courrierStatut As String: courrierStatut = ""
    Dim priseEnCompte As String: priseEnCompte = "Non"
    
    ' Vérifier si c'est une alerte liée à une absence de type "Maladie"
    If typeAlerte = "ABSENCE_AJOUTEE" Or typeAlerte = "ARRET_MALADIE_30J" Then
        ' Récupérer le type d'absence depuis TblAbsences
        On Error Resume Next
        Dim loAbsences As ListObject: Set loAbsences = GetAbsencesTable()
        If Not loAbsences Is Nothing And Not loAbsences.DataBodyRange Is Nothing Then
            Dim dataArr As Variant
            dataArr = loAbsences.DataBodyRange.value
            
            If Err.Number = 0 Then
                Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long, cMotif As Long
                cRessource = FindTableColumnIndex(loAbsences, "Ressource")
                cDateDebut = FindTableColumnIndex(loAbsences, "DateDébut")
                cDateFin = FindTableColumnIndex(loAbsences, "DateFin")
                cType = FindTableColumnIndex(loAbsences, "Type")
                ' Si colonne "Type" n'existe pas, essayer "Motif"
                If cType = 0 Then
                    cType = FindTableColumnIndex(loAbsences, "Motif")
                End If
                
                If cRessource > 0 And cDateDebut > 0 And cDateFin > 0 And cType > 0 Then
                    Dim i As Long
                    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
                        If Trim$(CStr(dataArr(i, cRessource))) = ressource Then
                            If IsDate(dataArr(i, cDateDebut)) And IsDate(dataArr(i, cDateFin)) Then
                                Dim d0 As Date, d1 As Date
                                d0 = CDate(dataArr(i, cDateDebut))
                                d1 = CDate(dataArr(i, cDateFin))
                                
                                ' Vérifier si les dates correspondent
                                If d0 = dateDebut And d1 = dateFin Then
                                    ' Vérifier le type
                                    Dim typeAbs As String
                                    typeAbs = ""
                                    If UBound(dataArr, 2) >= cType Then
                                        typeAbs = UCase$(Trim$(CStr(dataArr(i, cType))))
                                    End If
                                    
                                    ' Vérifier si c'est une maladie
                                    If InStr(typeAbs, "MALADIE") > 0 Or InStr(typeAbs, "ARRET") > 0 Then
                                        isArretMaladie = True
                                        ' Calculer la durée calendaire
                                        dureeCalendaire = DateDiff("d", d0, d1) + 1
                                        
                                        ' Si > 30 jours calendaires, créer une alerte avec Courrier Statut
                                        If dureeCalendaire > 30 Then
                                            courrierStatut = "A envoyer"
                                            priseEnCompte = "Non"
                                            ' Modifier le type d'alerte pour être plus spécifique
                                            typeAlerte = "ARRET_MALADIE_30J"
                                            action = "Arrêt maladie de " & dureeCalendaire & " jours calendaires (" & Format$(d0, "dd/mm/yyyy") & " - " & Format$(d1, "dd/mm/yyyy") & ") - Courrier à envoyer"
                                        End If
                                    End If
                                    Exit For
                                End If
                            End If
                        End If
                    Next i
                End If
            End If
        End If
        On Error GoTo 0
    End If
    
    ' Si c'est déjà une alerte ARRET_MALADIE_30J, définir directement les valeurs
    If typeAlerte = "ARRET_MALADIE_30J" Then
        courrierStatut = "A envoyer"
        priseEnCompte = "Non"
    End If
    
    ' Vérifier si une alerte similaire existe déjà pour éviter les doublons
    If lo.DataBodyRange Is Nothing Then
        ' Table vide, on peut créer l'alerte
    Else
        
        dataArr = lo.DataBodyRange.value
        
        Dim cTypeAlerte As Long, cAction As Long
        cTypeAlerte = FindTableColumnIndex(lo, "TypeAlerte")
        cRessource = FindTableColumnIndex(lo, "Ressource")
        cDateDebut = FindTableColumnIndex(lo, "DateDebut")
        cDateFin = FindTableColumnIndex(lo, "DateFin")
        cAction = FindTableColumnIndex(lo, "Action")
        
        If cTypeAlerte > 0 And cRessource > 0 And cDateDebut > 0 And cDateFin > 0 Then
            Dim p As Long
            For p = LBound(dataArr, 1) To UBound(dataArr, 1)
                ' Vérifier si c'est la même alerte (type, ressource, dates)
                If Trim$(CStr(dataArr(p, cTypeAlerte))) = typeAlerte And _
                   Trim$(CStr(dataArr(p, cRessource))) = ressource Then
                    
                    Dim existingDateDebut As Variant, existingDateFin As Variant
                    existingDateDebut = dataArr(p, cDateDebut)
                    existingDateFin = dataArr(p, cDateFin)
                    
                    ' Comparer les dates (tolérance de 1 jour)
                    Dim datesMatch As Boolean: datesMatch = False
                    If IsDate(existingDateDebut) And IsDate(existingDateFin) Then
                        If Abs(DateDiff("d", CDate(existingDateDebut), dateDebut)) <= 1 And _
                           Abs(DateDiff("d", CDate(existingDateFin), dateFin)) <= 1 Then
                            datesMatch = True
                        End If
                    ElseIf IsEmpty(existingDateDebut) And IsEmpty(existingDateFin) And _
                           (dateDebut = #1/1/1900# Or dateFin = #1/1/1900#) Then
                        ' Dates vides ou invalides des deux côtés
                        datesMatch = True
                    End If
                    
                    If datesMatch Then
                        ' Vérifier aussi l'action si disponible (pour plus de précision)
                        If cAction > 0 And UBound(dataArr, 2) >= cAction Then
                            Dim existingAction As String
                            existingAction = Trim$(CStr(dataArr(i, cAction)))
                            If existingAction = action Then
                                ' Alerte identique trouvée, ne pas créer de doublon
                                Debug.Print "[LoggerAlerte] Alerte déjà existante, doublon évité : " & typeAlerte & " pour " & ressource
                                Exit Sub
                            End If
                        Else
                            ' Pas de colonne Action ou pas de correspondance, mais dates et type correspondent
                            ' On considère que c'est un doublon
                            Debug.Print "[LoggerAlerte] Alerte déjà existante (même type/ressource/dates), doublon évité : " & typeAlerte & " pour " & ressource
                            Exit Sub
                        End If
                    End If
                End If
            Next p
        End If
    End If
    
    ' *** CORRECTION : Ajouter la nouvelle ligne avec gestion d'erreur robuste ***
    On Error Resume Next
    Dim newRow As ListRow
    Set newRow = lo.ListRows.Add
    
    If Err.Number <> 0 Or newRow Is Nothing Then
        Debug.Print "[LoggerAlerte] ERREUR lors de l'ajout de ligne : " & Err.Number & " - " & Err.Description
        Err.Clear
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo 0
    
    With newRow.Range
        .Cells(1, 1).value = priseEnCompte              ' PriseEnCompte (par défaut "Non" pour toutes les alertes)
        .Cells(1, 2).value = courrierStatut             ' Courrier Statut (vide sauf pour arrêt maladie > 30j)
        .Cells(1, 3).value = Now                        ' DateAction
        .Cells(1, 4).value = typeAlerte                 ' TypeAlerte
        .Cells(1, 5).value = ressource                  ' Ressource
        .Cells(1, 6).value = affaireID                  ' AffaireID
        .Cells(1, 7).value = siteVal                    ' Site
        .Cells(1, 8).value = comp                       ' Competence
        .Cells(1, 9).value = dateDebut                  ' DateDebut
        .Cells(1, 10).value = dateFin                   ' DateFin
        .Cells(1, 11).value = action                    ' Action
        .Cells(1, 12).value = Environ("USERNAME")       ' Utilisateur
    End With
    
    ' Invalider le cache après ajout
    ModuleExec.InvalidateListObjectCache "TblAlertes"
    
    Debug.Print "[LoggerAlerte] Alerte créée : " & typeAlerte & " pour " & ressource
End Sub

' ============================================================================
' 10) APPLIQUER VISUELLEMENT ABSENCES ET CONFLITS SUR LA GRILLE
' ============================================================================

Public Sub AppliquerVisuelsAbsencesEtConflits(ws As Worksheet, affaireID As String, siteVal As String)
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] START - affaireID=" & affaireID & " / siteVal=" & siteVal
    
    ' Utiliser les constantes de ModuleAffectation
    Const HEADER_ROW_CHARGE As Long = 3
    Const FIRST_DATE_COL As Long = 5
    Const COL_COMP As Long = 3
    Const SPACING_AFTER_CHARGE As Long = 2
    Const TECH_ROW_START As Long = 1000
    
    Dim startRow As Long: startRow = ModuleAffectation.FindEndOfChargeGrid(ws) + SPACING_AFTER_CHARGE + 2
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] Zone affectation: row " & startRow & " -> " & (TECH_ROW_START - 1) & " / col " & FIRST_DATE_COL & " -> " & lastCol
    
    ' Charger toutes les absences et conflits en mémoire
    Dim t1 As Double: t1 = Timer
    Dim dictFormations As Object: Set dictFormations = LoadFormationsDict()  ' Clé: "Ressource|Date" -> True
    Dim dictAbsences As Object: Set dictAbsences = LoadAbsencesDict()        ' Clé: "Ressource|Date" -> True
    Dim dictConflits As Object: Set dictConflits = LoadConflitsDict(affaireID, siteVal)  ' Clé: "Ressource|Date" -> "Détails"
    Dim dictTransfertsIndispo As Object: Set dictTransfertsIndispo = LoadTransfertsIndispoDict(siteVal)  ' Clé: "Ressource|Site|Date" -> "Détails"
    Dim dictDatesCols As Object: Set dictDatesCols = BuildDateColumnDict(ws, TECH_ROW_START, FIRST_DATE_COL, lastCol)  ' Clé: Date (Long) -> Col
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] Chargement mémoire: " & Format$(Timer - t1, "0.000") & " sec"
    
    Dim r As Long, c As Long
    Dim ressource As String, comp As String, d As Date
    Dim nbFormations As Long: nbFormations = 0
    Dim nbAbsences As Long: nbAbsences = 0
    Dim nbConflits As Long: nbConflits = 0
    Dim nbTransfertsIndispo As Long: nbTransfertsIndispo = 0
    Dim nbCellulesTraitees As Long: nbCellulesTraitees = 0
    Dim nbLignesParcourues As Long: nbLignesParcourues = 0
    Dim nbLignesIgnorees As Long: nbLignesIgnorees = 0
    Dim nbRessourcesTrouvees As Long: nbRessourcesTrouvees = 0
    
    ' Désactiver les événements pour accélérer
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    
    ' Parcourir toutes les ressources
    For r = startRow To TECH_ROW_START - 1
        nbLignesParcourues = nbLignesParcourues + 1
        ressource = Trim$(CStr(ws.Cells(r, COL_COMP).value))
        
        ' Ignorer les lignes "Besoin", "Affecté", titres
        If Len(ressource) = 0 Then
            nbLignesIgnorees = nbLignesIgnorees + 1
            GoTo NextRow
        End If
        
        If ws.Cells(r, COL_COMP).Font.Bold Then
            nbLignesIgnorees = nbLignesIgnorees + 1
            GoTo NextRow
        End If
        
        If ressource = "Besoin" Or ressource = "Affecté" Then
            nbLignesIgnorees = nbLignesIgnorees + 1
            GoTo NextRow
        End If
        
        comp = ModuleAffectation.FindCompetenceForRow(ws, r)
        If comp = "" Then
            nbLignesIgnorees = nbLignesIgnorees + 1
            GoTo NextRow
                        End If
        
        nbRessourcesTrouvees = nbRessourcesTrouvees + 1
        
        ' Appliquer par plages de cellules
        ApplyVisualsForResource ws, r, ressource, FIRST_DATE_COL, lastCol, _
                               dictFormations, dictAbsences, dictConflits, dictTransfertsIndispo, siteVal, dictDatesCols, _
                               nbFormations, nbAbsences, nbConflits, nbTransfertsIndispo, nbCellulesTraitees
NextRow:
    Next r
    
    ' Réactiver les événements
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] Statistiques: " & nbLignesParcourues & " lignes parcourues, " & nbLignesIgnorees & " ignorées, " & nbRessourcesTrouvees & " ressources traitées"
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] Résultats: " & nbCellulesTraitees & " cellules traitées, " & nbFormations & " formations, " & nbAbsences & " absences, " & nbTransfertsIndispo & " transferts indispo, " & nbConflits & " conflits"
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] END (" & Format$(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] ERREUR : " & Err.Number & " - " & Err.Description & " (ligne " & Erl & ")"
    ModuleErrorHandling.HandleError "ModuleAbsence", "AppliquerVisuelsAbsencesEtConflits", False
    Debug.Print "[AppliquerVisuelsAbsencesEtConflits] END (ERREUR) (" & Format$(Timer - t0, "0.000") & " sec)"
    Err.Clear
End Sub

' ============================================================================
' FONCTIONS OPTIMISÉES : Chargement en mémoire et application par plages
' ============================================================================

' Charger toutes les formations en mémoire
' Utilise la même méthode que LoadFormationsDictVisible() pour garantir la cohérence des dates
Private Function LoadFormationsDict() As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadFormationsDict = dict
        Exit Function
    End If
    
    ' Parcourir les ListRows (même méthode que LoadFormationsDictVisible pour cohérence)
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Or cType = 0 Then
        Set LoadFormationsDict = dict
        Exit Function
    End If
    
    Dim i As Long, lr As ListRow
    For i = 1 To lo.ListRows.count
        Set lr = lo.ListRows(i)
        
        ' Ignorer les lignes masquées
        If lr.Range.Rows.Hidden Then GoTo NextRowFormLoad
        
        Dim dateDebut As Variant, dateFin As Variant
        dateDebut = lr.Range(1, cDateDebut).value
        dateFin = lr.Range(1, cDateFin).value
        
        If IsDate(dateDebut) And IsDate(dateFin) Then
            Dim typeAbs As String
            typeAbs = Trim$(CStr(lr.Range(1, cType).value))
            
            ' Si c'est une formation
            If InStr(UCase$(typeAbs), "FORMATION") > 0 Or InStr(UCase$(typeAbs), "TRAINING") > 0 Then
                Dim d0 As Date, d1 As Date, d As Date
                d0 = CDate(dateDebut)
                d1 = CDate(dateFin)
                Dim ressource As String
                ressource = Trim$(CStr(lr.Range(1, cRessource).value))
                
                ' Ajouter toutes les dates de la période (même format que LoadFormationsDictVisible)
                For d = d0 To d1
                    dict(ressource & "|" & CLng(d)) = True
                Next d
            End If
        End If
NextRowFormLoad:
    Next i
    
    On Error GoTo 0
    Set LoadFormationsDict = dict
End Function

' ============================================================================
' 12) VÉRIFICATION AUTOMATIQUE DES ABSENCES (RETIRE AUTOMATIQUEMENT LES AFFECTATIONS)
' ============================================================================

' Vérifie toutes les affectations et retire automatiquement les périodes en conflit avec des absences
' Découpe les affectations au lieu de les supprimer complètement
Public Sub VerifierEtRetirerAffectationsAbsences()
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[VerifierEtRetirerAffectationsAbsences] START"
    
    Dim lo As ListObject: Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[VerifierEtRetirerAffectationsAbsences] Table introuvable ou vide"
        Exit Sub
    End If
    
    ' Charger les dictionnaires d'absences (utiliser les fonctions qui excluent les lignes masquées)
    Dim dictAbsences As Object: Set dictAbsences = LoadAbsencesDictVisible()
    Dim dictFormations As Object: Set dictFormations = LoadFormationsDictVisible()
    
    If dictAbsences.count = 0 And dictFormations.count = 0 Then
        Debug.Print "[VerifierEtRetirerAffectationsAbsences] Aucune absence/formation trouvée"
        Exit Sub
    End If
    
    Debug.Print "[VerifierEtRetirerAffectationsAbsences] " & dictAbsences.count & " absence(s), " & dictFormations.count & " formation(s) chargée(s)"
    
    Dim nbPeriodesRetirees As Long: nbPeriodesRetirees = 0
    Dim i As Long
    
    ' Parcourir directement les ListRows à l'envers
    For i = lo.ListRows.count To 1 Step -1
        Dim lr As ListRow: Set lr = lo.ListRows(i)
        
        Dim affaireID As String, siteVal As String, ressource As String, comp As String
        Dim d0 As Date, d1 As Date
        Dim charge As Double
        Dim periodeD0 As Date, periodeD1 As Date, raison As String, commentaire As String
        
        ' Lire les valeurs de la ligne
        affaireID = Trim$(CStr(lr.Range(1, 1).value))
        siteVal = Trim$(CStr(lr.Range(1, 2).value))
        ressource = Trim$(CStr(lr.Range(1, 3).value))
        comp = Trim$(CStr(lr.Range(1, 4).value))
        
        If Not IsDate(lr.Range(1, 5).value) Or Not IsDate(lr.Range(1, 6).value) Then GoTo NextRow
        d0 = CDate(lr.Range(1, 5).value)
        d1 = CDate(lr.Range(1, 6).value)
        
        If IsNumeric(lr.Range(1, 7).value) Then
            charge = CDbl(lr.Range(1, 7).value)
        Else
            charge = 0
        End If
        
        ' Identifier toutes les périodes en conflit (formations puis absences) directement depuis les dictionnaires
        Dim periodesARetirer As Collection: Set periodesARetirer = New Collection
        Dim dictPeriodesTraitees As Object: Set dictPeriodesTraitees = CreateObject("Scripting.Dictionary")
        dictPeriodesTraitees.CompareMode = vbTextCompare
        
        Dim d As Date
        For d = d0 To d1
            Dim dateSerial As Long: dateSerial = CLng(d)
            Dim key As String: key = ressource & "|" & dateSerial
            
            ' Vérifier formation (priorité 1)
            If dictFormations.Exists(key) Then
                Dim periodeFormation As String: periodeFormation = CStr(dictFormations(key))
                
                ' Si cette période n'a pas déjà été ajoutée, l'ajouter
                If Not dictPeriodesTraitees.Exists(periodeFormation) Then
                    dictPeriodesTraitees.Add periodeFormation, "Formation"
                    
                    ' Parser la période : DateDébut|DateFin|Type|Commentaire
                    Dim partsForm() As String: partsForm = Split(periodeFormation, "|")
                    If UBound(partsForm) >= 1 Then
                        periodeD0 = CDate(partsForm(0))
                        periodeD1 = CDate(partsForm(1))
                        
                        ' Vérifier que la période chevauche avec l'affectation
                        If Not (periodeD1 < d0 Or periodeD0 > d1) Then
                            ' Ajouter la période à retirer (format: DateDébut|DateFin|Raison|Commentaire)
                            raison = "Formation"
                            commentaire = ""
                            If UBound(partsForm) >= 2 Then
                                If UBound(partsForm) >= 3 And Len(partsForm(3)) > 0 Then
                                    commentaire = partsForm(3)
                            End If
                            End If
                            
                            Dim periodeARetirer As String
                            periodeARetirer = Format$(periodeD0, "yyyy-mm-dd") & "|" & Format$(periodeD1, "yyyy-mm-dd") & "|" & raison & "|" & commentaire
                            periodesARetirer.Add periodeARetirer
                        End If
                    End If
                End If
                
            ' Vérifier absence (priorité 2)
            ElseIf dictAbsences.Exists(key) Then
                Dim periodeAbsence As String: periodeAbsence = CStr(dictAbsences(key))
                
                ' Si cette période n'a pas déjà été ajoutée, l'ajouter
                If Not dictPeriodesTraitees.Exists(periodeAbsence) Then
                    dictPeriodesTraitees.Add periodeAbsence, "Absence"
                    
                    ' Parser la période : DateDébut|DateFin|Type|Commentaire
                    Dim partsAbs() As String: partsAbs = Split(periodeAbsence, "|")
                    If UBound(partsAbs) >= 1 Then
                        periodeD0 = CDate(partsAbs(0))
                        periodeD1 = CDate(partsAbs(1))
                        
                        ' Vérifier que la période chevauche avec l'affectation
                        If Not (periodeD1 < d0 Or periodeD0 > d1) Then
                            ' Ajouter la période à retirer (format: DateDébut|DateFin|Raison|Commentaire)
                            raison = "Absence"
                            commentaire = ""
                            If UBound(partsAbs) >= 2 Then
                                If UBound(partsAbs) >= 3 And Len(partsAbs(3)) > 0 Then
                                    commentaire = partsAbs(3)
                                End If
                            End If
                            
                            Dim periodeARetirerAbs As String
                            periodeARetirerAbs = Format$(periodeD0, "yyyy-mm-dd") & "|" & Format$(periodeD1, "yyyy-mm-dd") & "|" & raison & "|" & commentaire
                            periodesARetirer.Add periodeARetirerAbs
                        End If
                    End If
                End If
            End If
        Next d
        
        ' Si des périodes en conflit ont été trouvées, découper l'affectation
        If periodesARetirer.count > 0 Then
            ' Construire un tableau de périodes avec dates pour trier
            Dim periodesArray() As Variant
            ReDim periodesArray(1 To periodesARetirer.count, 1 To 4)  ' DateDebut, DateFin, Raison, Commentaire
            
            Dim pIdx As Long: pIdx = 1
            Dim periodeInfo As Variant
            For Each periodeInfo In periodesARetirer
                Dim parts() As String: parts = Split(periodeInfo, "|")
                If UBound(parts) >= 2 Then
                    periodesArray(pIdx, 1) = CDate(parts(0))  ' DateDebut
                    periodesArray(pIdx, 2) = CDate(parts(1))  ' DateFin
                    periodesArray(pIdx, 3) = parts(2)         ' Raison
                    If UBound(parts) >= 3 Then
                        periodesArray(pIdx, 4) = parts(3)     ' Commentaire
                    Else
                        periodesArray(pIdx, 4) = ""
                    End If
                    pIdx = pIdx + 1
                End If
            Next periodeInfo
            
            ' Trier les périodes par date de début (ordre croissant)
            If UBound(periodesArray, 1) > 1 Then
                Dim j As Long, k As Long
                Dim tempDate As Date, tempRaison As String, tempCommentaire As String
                For j = 1 To UBound(periodesArray, 1) - 1
                    For k = j + 1 To UBound(periodesArray, 1)
                        If periodesArray(j, 1) > periodesArray(k, 1) Then
                            ' Échange
                            tempDate = periodesArray(j, 1)
                            periodesArray(j, 1) = periodesArray(k, 1)
                            periodesArray(k, 1) = tempDate
                            
                            tempDate = periodesArray(j, 2)
                            periodesArray(j, 2) = periodesArray(k, 2)
                            periodesArray(k, 2) = tempDate
                            
                            tempRaison = periodesArray(j, 3)
                            periodesArray(j, 3) = periodesArray(k, 3)
                            periodesArray(k, 3) = tempRaison
                            
                            tempCommentaire = periodesArray(j, 4)
                            periodesArray(j, 4) = periodesArray(k, 4)
                            periodesArray(k, 4) = tempCommentaire
                        End If
                    Next k
                Next j
            End If
            
            ' Retirer chaque période (en ordre, en relisant les dates depuis la ligne après chaque modification)
            For pIdx = 1 To UBound(periodesArray, 1)
                ' Vérifier que la ligne existe toujours
                On Error Resume Next
                Dim testValue As Variant: testValue = lr.Range(1, 1).value
                If Err.Number <> 0 Then
                    ' La ligne a été supprimée, passer à la suivante
                    Err.Clear
                    Exit For
                End If
                On Error GoTo 0
                
                ' Relire les dates actuelles de la ligne
                If Not IsDate(lr.Range(1, 5).value) Or Not IsDate(lr.Range(1, 6).value) Then Exit For
                d0 = CDate(lr.Range(1, 5).value)
                d1 = CDate(lr.Range(1, 6).value)
                
                ' Récupérer les valeurs depuis le tableau (variables déjà déclarées en haut de la boucle)
                periodeD0 = periodesArray(pIdx, 1)
                periodeD1 = periodesArray(pIdx, 2)
                raison = periodesArray(pIdx, 3)
                commentaire = periodesArray(pIdx, 4)
                
                ' Vérifier que la période chevauche encore avec l'affectation actuelle
                If periodeD1 >= d0 And periodeD0 <= d1 Then
                    ' Retirer la période de conflit de l'affectation (découpage)
                    RetirerPeriodeAffectation lo, lr, affaireID, siteVal, ressource, comp, _
                                               d0, d1, charge, periodeD0, periodeD1, raison, nbPeriodesRetirees, commentaire
                End If
            Next pIdx
        End If
NextRow:
    Next i
    
    ' Invalider le cache si des modifications ont été faites
    If nbPeriodesRetirees > 0 Then
        ModuleExec.InvalidateListObjectCache "TblAffectations"
        Debug.Print "[VerifierEtRetirerAffectationsAbsences] " & nbPeriodesRetirees & " période(s) retirée(s) automatiquement"
    Else
        Debug.Print "[VerifierEtRetirerAffectationsAbsences] Aucune période à retirer"
    End If
    
    Debug.Print "[VerifierEtRetirerAffectationsAbsences] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[VerifierEtRetirerAffectationsAbsences] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleAbsence", "VerifierEtRetirerAffectationsAbsences", False
    Err.Clear
End Sub

' *** NOUVEAU : Retirer une période spécifique d'une affectation (découpage au lieu de suppression totale) ***
Private Sub RetirerPeriodeAffectation(lo As ListObject, lr As ListRow, _
                                      affaireID As String, siteVal As String, ressource As String, comp As String, _
                                      oldD0 As Date, oldD1 As Date, oldCharge As Double, _
                                      periodeD0 As Date, periodeD1 As Date, raison As String, _
                                      ByRef nbPeriodesRetirees As Long, _
                                      Optional commentaire As String = "")
    On Error Resume Next
    
    ' Vérifier chevauchement
    If periodeD1 < oldD0 Or periodeD0 > oldD1 Then Exit Sub
    
    ' Logger le retrait (avec commentaire si disponible)
    Dim messageRetrait As String
    messageRetrait = "Retrait automatique pour cause de " & raison & " (" & Format(periodeD0, "dd/mm/yyyy") & " - " & Format(periodeD1, "dd/mm/yyyy") & ")"
    If Len(commentaire) > 0 Then
        messageRetrait = messageRetrait & " : " & commentaire
    End If
    
    LoggerAlerte "AFFECTATION_RETIREE_AUTO", ressource, affaireID, siteVal, comp, _
                periodeD0, periodeD1, messageRetrait
    
    ' Découpage selon le chevauchement (même logique que DeleteAffectationsOverlappingPeriod)
    ' Suppression totale si la période d'absence couvre complètement l'affectation
    If periodeD0 <= oldD0 And periodeD1 >= oldD1 Then
        lr.Delete
        nbPeriodesRetirees = nbPeriodesRetirees + 1
    
    ' Suppression début : ajuster la date de début
    ElseIf periodeD0 <= oldD0 And periodeD1 < oldD1 Then
        If periodeD1 >= oldD0 Then
            lr.Range(1, 5).value = periodeD1 + 1
            nbPeriodesRetirees = nbPeriodesRetirees + 1
        End If
    
    ' Suppression fin : ajuster la date de fin
    ElseIf periodeD0 > oldD0 And periodeD1 >= oldD1 Then
        If periodeD0 <= oldD1 Then
            lr.Range(1, 6).value = periodeD0 - 1
            nbPeriodesRetirees = nbPeriodesRetirees + 1
        End If
    
    ' Suppression au milieu : scinder en deux périodes
    ElseIf periodeD0 > oldD0 And periodeD1 < oldD1 Then
        ' Créer une nouvelle ligne pour la fin
        Dim newRow As ListRow: Set newRow = lo.ListRows.Add
        With newRow.Range
            .Cells(1, 1).value = affaireID
            .Cells(1, 2).value = siteVal
            .Cells(1, 3).value = ressource
            .Cells(1, 4).value = comp
            .Cells(1, 5).value = periodeD1 + 1
            .Cells(1, 6).value = oldD1
            .Cells(1, 7).value = oldCharge
                        End With
        
        ' Ajuster la ligne existante (fin avant la période d'absence)
        lr.Range(1, 6).value = periodeD0 - 1
        nbPeriodesRetirees = nbPeriodesRetirees + 1
                    End If
    
    ' Vérifier si la période résultante est invalide (date début > date fin)
    On Error Resume Next
    Dim testD0 As Date, testD1 As Date
    testD0 = lr.Range(1, 5).value
    testD1 = lr.Range(1, 6).value
    If Err.Number = 0 Then
        If testD0 > testD1 Then
            lr.Delete
                End If
    End If
    Err.Clear
    On Error GoTo 0
End Sub

' *** NOUVEAU : Tri rapide pour les dates (Long) ***
Private Sub QuickSortLong(arr() As Long, ByVal low As Long, ByVal high As Long)
    Dim pivot As Long, i As Long, j As Long, temp As Long
    
    If low < high Then
        pivot = arr((low + high) \ 2)
        i = low
        j = high
        
        Do While i <= j
            Do While arr(i) < pivot: i = i + 1: Loop
            Do While arr(j) > pivot: j = j - 1: Loop
            
            If i <= j Then
                temp = arr(i)
                arr(i) = arr(j)
                arr(j) = temp
                i = i + 1
                j = j - 1
            End If
        Loop
        
        If low < j Then QuickSortLong arr, low, j
        If i < high Then QuickSortLong arr, i, high
    End If
End Sub

' ============================================================================
' 13) MASQUER LES ABSENCES ANCIENNES (> 10 JOURS APRÈS DATE DE FIN)
' ============================================================================

' *** NOUVEAU : Masque automatiquement les lignes d'absence terminées depuis plus de 10 jours ***
Public Sub MasquerAbsencesAnciennes(Optional joursDepuisFin As Long = 10)
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[MasquerAbsencesAnciennes] START (masquage si date fin passée depuis > " & joursDepuisFin & " jours)"
    
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[MasquerAbsencesAnciennes] Table introuvable ou vide"
        Exit Sub
    End If
    
    ' Date limite : aujourd'hui - joursDepuisFin
    Dim dateLimite As Date
    dateLimite = DateAdd("d", -joursDepuisFin, Date)
    
    Dim cDateFin As Long
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    
    If cDateFin = 0 Then
        Debug.Print "[MasquerAbsencesAnciennes] Colonne 'DateFin' introuvable"
        Exit Sub
    End If
    
    Dim nbMasquees As Long: nbMasquees = 0
    Dim nbDemasquees As Long: nbDemasquees = 0
    Dim i As Long
    
    ' Parcourir toutes les absences (lire les ListRows pour masquer/démasquer)
    For i = 1 To lo.ListRows.count
        Dim lr As ListRow: Set lr = lo.ListRows(i)
        Dim dateFin As Variant: dateFin = lr.Range(1, cDateFin).value
        
        If IsDate(dateFin) Then
            Dim dFin As Date: dFin = CDate(dateFin)
            
            ' Si date de fin < date limite, masquer la ligne
            If dFin < dateLimite Then
                ' Masquer la ligne si elle ne l'est pas déjà
                If Not lr.Range.Rows.Hidden Then
                    lr.Range.Rows.Hidden = True
                    nbMasquees = nbMasquees + 1
                End If
            Else
                ' S'assurer que la ligne n'est pas masquée (au cas où elle devrait être visible)
                If lr.Range.Rows.Hidden Then
                    lr.Range.Rows.Hidden = False
                    nbDemasquees = nbDemasquees + 1
                End If
            End If
        End If
    Next i
    
    Debug.Print "[MasquerAbsencesAnciennes] " & nbMasquees & " ligne(s) masquée(s), " & nbDemasquees & " ligne(s) démasquée(s)"
    Debug.Print "[MasquerAbsencesAnciennes] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[MasquerAbsencesAnciennes] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleAbsence", "MasquerAbsencesAnciennes", False
    Err.Clear
End Sub

' ============================================================================
' 14) VÉRIFIER ET ALERTER ARRÊTS MALADIE > 30 JOURS CALENDAIRES
' ============================================================================

' *** NOUVEAU : Vérifie automatiquement les arrêts maladie de plus de 30 jours calendaires ***
' et crée une alerte avec "Courrier Statut" = "A envoyer" si nécessaire
Public Sub VerifierEtAlerterArretsMaladie30J()
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] START"
    
    ' S'assurer que la table des alertes existe (AVANT de récupérer lo pour éviter l'invalidation du cache)
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 1: EnsureAlertesSheetAndTable"
    On Error Resume Next
    EnsureAlertesSheetAndTable
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR EnsureAlertesSheetAndTable: " & Err.Description
        Err.Clear
    End If
    On Error GoTo ErrHandler
    
    ' *** CORRECTION : Récupérer lo APRÈS EnsureAlertesSheetAndTable pour éviter l'invalidation du cache ***
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Table introuvable ou vide"
        Exit Sub
    End If
    
    ' Invalider le cache et récupérer la table des alertes
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 2: Invalidation cache et récupération TblAlertes"
    ModuleExec.InvalidateListObjectCache "TblAlertes"
    Dim loAlertes As ListObject
    On Error Resume Next
    Set loAlertes = GetAlertesTable()
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR GetAlertesTable: " & Err.Description & " (ligne " & Erl & ")"
        Err.Clear
        Set loAlertes = Nothing
    End If
    On Error GoTo ErrHandler
    
    ' Charger les alertes existantes en mémoire pour éviter les doublons
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 3: Chargement alertes existantes"
    Dim dictAlertesExistantes As Object: Set dictAlertesExistantes = CreateObject("Scripting.Dictionary")
    dictAlertesExistantes.CompareMode = vbTextCompare
    
    ' Essayer de charger les alertes existantes (si la table existe et a des données)
    On Error Resume Next
    If Not loAlertes Is Nothing Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 3a: loAlertes n'est pas Nothing"
        Dim testNameAlertes As String
        testNameAlertes = loAlertes.name
        If Err.Number <> 0 Then
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR accès loAlertes.Name: " & Err.Description & " (ligne " & Erl & ")"
            Err.Clear
            GoTo SkipAlertesLoad
        End If
        
        If Not loAlertes.DataBodyRange Is Nothing Then
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 3b: DataBodyRange existe"
            Dim alertesArr As Variant
            alertesArr = loAlertes.DataBodyRange.value
            If Err.Number <> 0 Then
                Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR lecture DataBodyRange: " & Err.Description & " (ligne " & Erl & ")"
                Err.Clear
                GoTo SkipAlertesLoad
            End If
            
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 3c: Recherche colonnes dans TblAlertes"
            Dim cTypeAlerte As Long, cRessourceAlert As Long, cDateDebutAlert As Long, cDateFinAlert As Long
            cTypeAlerte = FindTableColumnIndex(loAlertes, "TypeAlerte")
            cRessourceAlert = FindTableColumnIndex(loAlertes, "Ressource")
            cDateDebutAlert = FindTableColumnIndex(loAlertes, "DateDebut")
            cDateFinAlert = FindTableColumnIndex(loAlertes, "DateFin")
            
            If Err.Number <> 0 Then
                Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR FindTableColumnIndex TblAlertes: " & Err.Description & " (ligne " & Erl & ")"
                Err.Clear
                GoTo SkipAlertesLoad
            End If
            
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] Colonnes trouvées: TypeAlerte=" & cTypeAlerte & " / Ressource=" & cRessourceAlert & " / DateDebut=" & cDateDebutAlert & " / DateFin=" & cDateFinAlert
            
            If cTypeAlerte > 0 And cRessourceAlert > 0 And cDateDebutAlert > 0 And cDateFinAlert > 0 Then
                Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 3d: Parcours " & UBound(alertesArr, 1) & " alerte(s) existante(s)"
                Dim j As Long
                For j = LBound(alertesArr, 1) To UBound(alertesArr, 1)
                    Dim typeAlert As String
                    typeAlert = Trim$(CStr(alertesArr(j, cTypeAlerte)))
                    
                    ' Si c'est déjà une alerte ARRET_MALADIE_30J, l'ajouter au dictionnaire
                    If typeAlert = "ARRET_MALADIE_30J" Then
                        Dim resAlert As String, dDebAlert As Date, dFinAlert As Date
                        resAlert = Trim$(CStr(alertesArr(j, cRessourceAlert)))
                        
                        If IsDate(alertesArr(j, cDateDebutAlert)) And IsDate(alertesArr(j, cDateFinAlert)) Then
                            dDebAlert = CDate(alertesArr(j, cDateDebutAlert))
                            dFinAlert = CDate(alertesArr(j, cDateFinAlert))
                            
                            ' Clé unique : Ressource|DateDébut|DateFin
                            Dim keyAlert As String
                            keyAlert = resAlert & "|" & Format$(dDebAlert, "yyyymmdd") & "|" & Format$(dFinAlert, "yyyymmdd")
                            dictAlertesExistantes(keyAlert) = True
                        End If
                    End If
                Next j
                Debug.Print "[VerifierEtAlerterArretsMaladie30J] " & dictAlertesExistantes.count & " alerte(s) ARRET_MALADIE_30J trouvée(s)"
            Else
                Debug.Print "[VerifierEtAlerterArretsMaladie30J] Colonnes manquantes dans TblAlertes, skip chargement alertes"
            End If
        Else
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] DataBodyRange est Nothing, skip chargement alertes"
        End If
    Else
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] loAlertes est Nothing, skip chargement alertes"
    End If
    On Error GoTo ErrHandler
    
SkipAlertesLoad:
    ' Vérifier que lo (TblAbsences) est toujours valide
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 4: Vérification TblAbsences"
    On Error Resume Next
    Dim testLoName As String
    testLoName = lo.name
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR: lo (TblAbsences) invalide: " & Err.Description & " (ligne " & Erl & ")"
        Err.Clear
        ModuleExec.InvalidateListObjectCache "TblAbsences"
        Set lo = GetAbsencesTable()
        If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] Impossible de récupérer TblAbsences"
            Exit Sub
        End If
    End If
    On Error GoTo ErrHandler
    
    ' Rechercher les colonnes dans TblAbsences
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 5: Recherche colonnes dans TblAbsences"
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long
    On Error Resume Next
    cRessource = FindTableColumnIndex(lo, "Ressource")
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR FindTableColumnIndex Ressource: " & Err.Description & " (ligne " & Erl & ")"
        Err.Clear
        Exit Sub
    End If
    
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR FindTableColumnIndex DateDébut: " & Err.Description & " (ligne " & Erl & ")"
        Err.Clear
        Exit Sub
    End If
    
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR FindTableColumnIndex DateFin: " & Err.Description & " (ligne " & Erl & ")"
        Err.Clear
        Exit Sub
    End If
    
    cType = FindTableColumnIndex(lo, "Type")
    ' Si colonne "Type" n'existe pas, essayer "Motif"
    If cType = 0 Then
        cType = FindTableColumnIndex(lo, "Motif")
    End If
    On Error GoTo ErrHandler
    
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Colonnes trouvées: Ressource=" & cRessource & " / DateDébut=" & cDateDebut & " / DateFin=" & cDateFin & " / Type=" & cType
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Colonnes essentielles manquantes (Ressource, DateDébut, DateFin)"
        Exit Sub
    End If
    
    ' Si pas de colonne Type/Motif, on ne peut pas détecter les arrêts maladie
    If cType = 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Colonne Type/Motif introuvable - impossible de détecter les arrêts maladie"
        Exit Sub
    End If
    
    Dim nbAlertesCreees As Long: nbAlertesCreees = 0
    Dim i As Long
    
    ' *** CORRECTION : Récupérer à nouveau lo depuis le cache pour éviter l'invalidation ***
    On Error Resume Next
    Set lo = Nothing
    Set lo = GetAbsencesTable()
    
    If lo Is Nothing Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR : GetAbsencesTable() a retourné Nothing après recherche colonnes"
        Exit Sub
    End If
    
    ' Vérifier que lo est valide en testant l'accès à Name
    Dim testLoName2 As String
    testLoName2 = lo.name
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR : lo invalide après récupération : " & Err.Description
        Err.Clear
        Exit Sub
    End If
    
    ' Vérifier que DataBodyRange existe
    If lo.DataBodyRange Is Nothing Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] DataBodyRange est Nothing, table vide"
        Exit Sub
    End If
    
    ' Vérifier que la table a des lignes AVANT d'accéder à ListRows.count
    Dim testCount As Long
    testCount = 0
    On Error Resume Next
    testCount = lo.ListRows.count
    Dim testErr As Long
    testErr = Err.Number
    If testErr <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR accès lo.ListRows.count: " & Err.Description & " (Err " & testErr & ")"
        Err.Clear
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo ErrHandler
    
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] Étape 6: Parcours de " & testCount & " absence(s)"
    
    ' Vérifier que la table a des lignes
    If testCount = 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Table vide, aucune absence à vérifier"
        Exit Sub
    End If
    
    ' *** CORRECTION : Charger les données en tableau pour éviter les problèmes d'accès ***
    Dim dataArr As Variant
    On Error Resume Next
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR lecture DataBodyRange.Value: " & Err.Description
        Err.Clear
        On Error GoTo ErrHandler
        Exit Sub
    End If
    On Error GoTo ErrHandler
    
    ' Parcourir le tableau au lieu des ListRows (beaucoup plus fiable)
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        On Error Resume Next
        
        Dim ressource As String, typeAbs As String
        ressource = Trim$(CStr(dataArr(i, cRessource)))
        
        If Err.Number <> 0 Then
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR lecture Ressource ligne " & i & ": " & Err.Description
            Err.Clear
            GoTo NextAbsence
        End If
        
        Dim dateDebutVal As Variant, dateFinVal As Variant
        dateDebutVal = dataArr(i, cDateDebut)
        dateFinVal = dataArr(i, cDateFin)
        
        If Err.Number <> 0 Then
            Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR lecture dates ligne " & i & ": " & Err.Description
            Err.Clear
            GoTo NextAbsence
        End If
        
        typeAbs = ""
        If cType > 0 And UBound(dataArr, 2) >= cType Then
            typeAbs = UCase$(Trim$(CStr(dataArr(i, cType))))
            If Err.Number <> 0 Then
                Err.Clear
                typeAbs = ""
            End If
        End If
        On Error GoTo ErrHandler
        
        ' Vérifier si c'est une maladie
        If InStr(typeAbs, "MALADIE") > 0 Or InStr(typeAbs, "ARRET") > 0 Then
            If IsDate(dateDebutVal) And IsDate(dateFinVal) Then
                Dim dateDebut As Date, dateFin As Date
                dateDebut = CDate(dateDebutVal)
                dateFin = CDate(dateFinVal)
                
                ' Calculer la durée calendaire
                Dim dureeCalendaire As Long
                dureeCalendaire = DateDiff("d", dateDebut, dateFin) + 1
                
                ' Si > 30 jours calendaires
                If dureeCalendaire > 30 Then
                    ' Vérifier si une alerte existe déjà
                    Dim keyAbs As String
                    keyAbs = ressource & "|" & Format$(dateDebut, "yyyymmdd") & "|" & Format$(dateFin, "yyyymmdd")
                    
                    If Not dictAlertesExistantes.Exists(keyAbs) Then
                        ' Créer une alerte
                        LoggerAlerte "ARRET_MALADIE_30J", ressource, "", "", "", _
                                     dateDebut, dateFin, _
                                     "Arrêt maladie de " & dureeCalendaire & " jours calendaires (" & Format$(dateDebut, "dd/mm/yyyy") & " - " & Format$(dateFin, "dd/mm/yyyy") & ") - Courrier à envoyer"
                        nbAlertesCreees = nbAlertesCreees + 1
                        dictAlertesExistantes(keyAbs) = True  ' Ajouter au dictionnaire pour éviter doublons
                        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Alerte créée pour " & ressource & " (" & dureeCalendaire & " jours)"
                    End If
                End If
            End If
        End If
NextAbsence:
    Next i
    
    If nbAlertesCreees > 0 Then
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] " & nbAlertesCreees & " alerte(s) créée(s) pour arrêts maladie > 30 jours"
    Else
        Debug.Print "[VerifierEtAlerterArretsMaladie30J] Aucune nouvelle alerte à créer"
    End If
    
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[VerifierEtAlerterArretsMaladie30J] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleAbsence", "VerifierEtAlerterArretsMaladie30J", False
    Err.Clear
End Sub

' Charger toutes les absences (sauf formations) en mémoire
' Utilise la même méthode que LoadAbsencesDictVisible() pour garantir la cohérence des dates
Private Function LoadAbsencesDict() As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadAbsencesDict = dict
        Exit Function
    End If
    
    ' Parcourir les ListRows (même méthode que LoadAbsencesDictVisible pour cohérence)
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Then
        Set LoadAbsencesDict = dict
        Exit Function
    End If
    
    Dim i As Long, lr As ListRow
    For i = 1 To lo.ListRows.count
        Set lr = lo.ListRows(i)
        
        ' *** CORRECTION : Ignorer les lignes masquées pour cohérence avec LoadAbsencesDictVisible ***
        If lr.Range.Rows.Hidden Then GoTo NextRowAbsLoad
        
        Dim dateDebut As Variant, dateFin As Variant
        dateDebut = lr.Range(1, cDateDebut).value
        dateFin = lr.Range(1, cDateFin).value
        
        If IsDate(dateDebut) And IsDate(dateFin) Then
            Dim typeAbs As String
            typeAbs = ""
            If cType > 0 Then
                typeAbs = Trim$(CStr(lr.Range(1, cType).value))
            End If
            
            ' Exclure les formations (déjà gérées par LoadFormationsDict)
            If InStr(UCase$(typeAbs), "FORMATION") = 0 And InStr(UCase$(typeAbs), "TRAINING") = 0 Then
                Dim d0 As Date, d1 As Date, d As Date
                d0 = CDate(dateDebut)
                d1 = CDate(dateFin)
                Dim ressource As String
                ressource = Trim$(CStr(lr.Range(1, cRessource).value))
                
                ' Ajouter toutes les dates de la période (même format que LoadAbsencesDictVisible)
                For d = d0 To d1
                    dict(ressource & "|" & CLng(d)) = True
                Next d
            End If
        End If
NextRowAbsLoad:
    Next i
    
    On Error GoTo 0
    Set LoadAbsencesDict = dict
End Function

' *** NOUVEAU : Charger les absences visibles (non masquées) en mémoire ***
' Stocke les périodes complètes (DateDébut|DateFin|Type|Commentaire) au lieu de jours individuels
Private Function LoadAbsencesDictVisible() As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadAbsencesDictVisible = dict
        Exit Function
    End If
    
    ' Parcourir les ListRows pour exclure les lignes masquées
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long, cCommentaire As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    cCommentaire = FindTableColumnIndex(lo, "Commentaire")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Then
        Set LoadAbsencesDictVisible = dict
        Exit Function
    End If
    
    Dim i As Long, lr As ListRow
    For i = 1 To lo.ListRows.count
        Set lr = lo.ListRows(i)
        
        ' Ignorer les lignes masquées
        If lr.Range.Rows.Hidden Then GoTo NextRowAbs
        
        Dim dateDebut As Variant, dateFin As Variant
        dateDebut = lr.Range(1, cDateDebut).value
        dateFin = lr.Range(1, cDateFin).value
        
        If IsDate(dateDebut) And IsDate(dateFin) Then
            Dim typeAbs As String: typeAbs = ""
            If cType > 0 Then
                typeAbs = Trim$(CStr(lr.Range(1, cType).value))
            End If
            
            ' Exclure les formations (déjà gérées par LoadFormationsDictVisible)
            If InStr(UCase$(typeAbs), "FORMATION") = 0 And InStr(UCase$(typeAbs), "TRAINING") = 0 Then
                Dim d0 As Date, d1 As Date, d As Date
                d0 = CDate(dateDebut)
                d1 = CDate(dateFin)
                Dim ressource As String
                ressource = Trim$(CStr(lr.Range(1, cRessource).value))
                
                ' Construire la chaîne de période : DateDébut|DateFin|Type|Commentaire
                Dim periodeInfo As String
                periodeInfo = Format$(d0, "yyyy-mm-dd") & "|" & Format$(d1, "yyyy-mm-dd") & "|" & typeAbs
                If cCommentaire > 0 Then
                    Dim commentaire As String
                    commentaire = Trim$(CStr(lr.Range(1, cCommentaire).value))
                    periodeInfo = periodeInfo & "|" & commentaire
                Else
                    periodeInfo = periodeInfo & "|"
                End If
                
                ' Ajouter toutes les dates de la période avec la même info de période
                For d = d0 To d1
                    dict(ressource & "|" & CLng(d)) = periodeInfo
                Next d
            End If
        End If
NextRowAbs:
    Next i
    
    On Error GoTo 0
    Set LoadAbsencesDictVisible = dict
End Function

' *** NOUVEAU : Charger les formations visibles (non masquées) en mémoire ***
' Stocke les périodes complètes (DateDébut|DateFin|Type|Commentaire) au lieu de jours individuels
Private Function LoadFormationsDictVisible() As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject: Set lo = GetAbsencesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadFormationsDictVisible = dict
        Exit Function
    End If
    
    ' Parcourir les ListRows pour exclure les lignes masquées
    Dim cRessource As Long, cDateDebut As Long, cDateFin As Long, cType As Long, cCommentaire As Long
    cRessource = FindTableColumnIndex(lo, "Ressource")
    cDateDebut = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cType = FindTableColumnIndex(lo, "Type")
    cCommentaire = FindTableColumnIndex(lo, "Commentaire")
    
    If cRessource = 0 Or cDateDebut = 0 Or cDateFin = 0 Or cType = 0 Then
        Set LoadFormationsDictVisible = dict
        Exit Function
    End If
    
    Dim i As Long, lr As ListRow
    For i = 1 To lo.ListRows.count
        Set lr = lo.ListRows(i)
        
        ' Ignorer les lignes masquées
        If lr.Range.Rows.Hidden Then GoTo NextRowForm
        
        Dim dateDebut As Variant, dateFin As Variant
        dateDebut = lr.Range(1, cDateDebut).value
        dateFin = lr.Range(1, cDateFin).value
        
        If IsDate(dateDebut) And IsDate(dateFin) Then
            Dim typeAbs As String
            typeAbs = Trim$(CStr(lr.Range(1, cType).value))
            
            ' Si c'est une formation
            If InStr(UCase$(typeAbs), "FORMATION") > 0 Or InStr(UCase$(typeAbs), "TRAINING") > 0 Then
                Dim d0 As Date, d1 As Date, d As Date
                d0 = CDate(dateDebut)
                d1 = CDate(dateFin)
                Dim ressource As String
                ressource = Trim$(CStr(lr.Range(1, cRessource).value))
                
                ' Construire la chaîne de période : DateDébut|DateFin|Type|Commentaire
                Dim periodeInfo As String
                periodeInfo = Format$(d0, "yyyy-mm-dd") & "|" & Format$(d1, "yyyy-mm-dd") & "|" & typeAbs
                If cCommentaire > 0 Then
                    Dim commentaire As String
                    commentaire = Trim$(CStr(lr.Range(1, cCommentaire).value))
                    periodeInfo = periodeInfo & "|" & commentaire
                Else
                    periodeInfo = periodeInfo & "|"
                End If
                
                ' Ajouter toutes les dates de la période avec la même info de période
                For d = d0 To d1
                    dict(ressource & "|" & CLng(d)) = periodeInfo
                Next d
            End If
        End If
NextRowForm:
    Next i
    
    On Error GoTo 0
    Set LoadFormationsDictVisible = dict
End Function

' Charger tous les conflits en mémoire (exclut les affectations de la même affaire/site)
Private Function LoadConflitsDict(affaireID As String, siteVal As String) As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject: Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadConflitsDict = dict
        Exit Function
    End If
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, d0 As Date, d1 As Date, d As Date
    affaireID = Trim$(affaireID)
    siteVal = Trim$(siteVal)
    
    ' Parcourir toutes les affectations
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
            Dim affaire As String, site As String
            affaire = Trim$(CStr(dataArr(i, 1)))
            site = Trim$(CStr(dataArr(i, 2)))
            
            ' *** MODIFIÉ : Exclure les affectations de la même affaire/site (pas un conflit) ***
            If affaire = affaireID And site = siteVal Then
                GoTo NextAffectation  ' Pas un conflit, c'est la même affectation
            End If
            
            d0 = CDate(dataArr(i, 5))
            d1 = CDate(dataArr(i, 6))
            Dim ressource As String
            ressource = Trim$(CStr(dataArr(i, 3)))
            
            ' Construire la clé de conflit pour toutes les dates
            Dim comp As String
            comp = Trim$(CStr(dataArr(i, 4)))
            
            Dim details As String
            details = affaire & " / " & site & " / " & comp & _
                     " (" & Format$(d0, "dd/mm") & " - " & Format$(d1, "dd/mm") & ")"
            
            ' Ajouter toutes les dates de la période (conflit pour cette ressource sur une AUTRE affaire/site)
            For d = d0 To d1
                Dim key As String
                key = ressource & "|" & CLng(d)
                ' Garder le premier conflit trouvé (ou le plus récent)
                If Not dict.Exists(key) Then
                    dict(key) = details
                End If
            Next d
        End If
NextAffectation:
    Next i
    
    On Error GoTo 0
    Set LoadConflitsDict = dict
End Function

' *** NOUVEAU : Charger les périodes d'indisponibilité liées aux transferts ***
' Clé: "Ressource|Site|Date" -> "Détails"
Private Function LoadTransfertsIndispoDict(siteVal As String) As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare
    
    On Error Resume Next
    Dim lo As ListObject
    Set lo = ModuleTransfert.GetTransfertsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set LoadTransfertsIndispoDict = dict
        Exit Function
    End If
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long, cDateDeb As Long, cDateFin As Long, cStatut As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSiteOrig = FindTableColumnIndex(lo, "SiteOrigine")
    cSiteDest = FindTableColumnIndex(lo, "SiteDestination")
    cDateDeb = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cStatut = FindTableColumnIndex(lo, "Statut")
    
    If cRes = 0 Or cSiteOrig = 0 Or cSiteDest = 0 Or cDateDeb = 0 Or cDateFin = 0 Or cStatut = 0 Then
        Set LoadTransfertsIndispoDict = dict
        Exit Function
    End If
    
    Dim i As Long
    siteVal = Trim$(siteVal)
    
    ' Parcourir tous les transferts appliqués
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        ' Vérifier si le statut est "Appliqué"
        Dim statut As String
        statut = Trim$(UCase$(CStr(dataArr(i, cStatut))))
        
        If statut = "APPLIQUE" Or statut = "APPLIQUÉ" Then
            ' Vérifier si les dates sont valides
            If IsDate(dataArr(i, cDateDeb)) And IsDate(dataArr(i, cDateFin)) Then
                Dim dateDeb As Date, dateFin As Date
                Dim ressource As String, siteOrigine As String, siteDestination As String
                
                dateDeb = CDate(dataArr(i, cDateDeb))
                dateFin = CDate(dataArr(i, cDateFin))
                ressource = Trim$(CStr(dataArr(i, cRes)))
                siteOrigine = Trim$(CStr(dataArr(i, cSiteOrig)))
                siteDestination = Trim$(CStr(dataArr(i, cSiteDest)))
                
                ' Vérifier si le site correspond
                If siteVal = siteOrigine Then
                    ' Site d'origine : indisponible PENDANT le transfert (entre DateDébut et DateFin)
                    Dim d As Date
                    Dim detailsOrigine As String
                    detailsOrigine = "Indisponible : Transfert vers " & siteDestination & " (" & Format$(dateDeb, "dd/mm/yyyy") & " - " & Format$(dateFin, "dd/mm/yyyy") & ")"
                    
                    For d = dateDeb To dateFin
                        Dim keyOrigine As String
                        keyOrigine = ressource & "|" & siteVal & "|" & CLng(d)
                        ' Garder le premier transfert trouvé
                        If Not dict.Exists(keyOrigine) Then
                            dict(keyOrigine) = detailsOrigine
                        End If
                    Next d
                ElseIf siteVal = siteDestination Then
                    ' Site de destination : indisponible AVANT DateDébut et APRÈS DateFin
                    ' Limiter aux dates de la période paramétrée (années de début et de fin)
                    Dim anneeDebut As Long, anneeFin As Long
                    anneeDebut = ModuleExec.GetAnneeDebut()
                    anneeFin = ModuleExec.GetAnneeFin()
                    
                    Dim dateLimiteAvant As Date, dateLimiteApres As Date
                    dateLimiteAvant = dateSerial(anneeDebut, 1, 1)  ' 1er janvier de l'année de début
                    dateLimiteApres = dateSerial(anneeFin, 12, 31)  ' 31 décembre de l'année de fin
                    
                    ' S'assurer que dateLimiteAvant <= dateDeb - 1 et dateLimiteApres >= dateFin + 1
                    If dateLimiteAvant > dateDeb - 1 Then dateLimiteAvant = dateDeb - 1
                    If dateLimiteApres < dateFin + 1 Then dateLimiteApres = dateFin + 1
                    
                    Dim detailsDestAvant As String, detailsDestApres As String
                    detailsDestAvant = "Indisponible : Transfert en attente (à partir du " & Format$(dateDeb, "dd/mm/yyyy") & ")"
                    detailsDestApres = "Indisponible : Transfert terminé (jusqu'au " & Format$(dateFin, "dd/mm/yyyy") & ")"
                    
                    ' Période AVANT DateDébut (limité à la période paramétrée)
                    For d = dateLimiteAvant To dateDeb - 1
                        Dim keyDestAvant As String
                        keyDestAvant = ressource & "|" & siteVal & "|" & CLng(d)
                        ' Ne pas écraser si déjà défini
                        If Not dict.Exists(keyDestAvant) Then
                            dict(keyDestAvant) = detailsDestAvant
                        End If
                    Next d
                    
                    ' Période APRÈS DateFin (limité à la période paramétrée)
                    For d = dateFin + 1 To dateLimiteApres
                        Dim keyDestApres As String
                        keyDestApres = ressource & "|" & siteVal & "|" & CLng(d)
                        ' Ne pas écraser si déjà défini
                        If Not dict.Exists(keyDestApres) Then
                            dict(keyDestApres) = detailsDestApres
                        End If
                    Next d
                End If
            End If
        End If
    Next i
    
    On Error GoTo 0
    Set LoadTransfertsIndispoDict = dict
End Function

' Construire un dictionnaire Colonne -> Date (accès direct)
Private Function BuildDateColumnDict(ws As Worksheet, techRow As Long, firstCol As Long, lastCol As Long) As Object
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    
    Dim c As Long
    Dim dateVal As Variant, d As Date
    For c = firstCol To lastCol
        dateVal = ws.Cells(techRow, c).value
        If ModuleExec.TryGetDate(dateVal, d) Then
            ' Stocker directement la Date (pas besoin de conversion)
            dict(c) = d
            End If
        Next c
    
    Set BuildDateColumnDict = dict
End Function

' Appliquer les couleurs par plages pour une ressource
Private Sub ApplyVisualsForResource(ws As Worksheet, rowNum As Long, ressource As String, _
                                    firstCol As Long, lastCol As Long, _
                                    dictFormations As Object, dictAbsences As Object, dictConflits As Object, _
                                    dictTransfertsIndispo As Object, siteVal As String, _
                                    dictDatesCols As Object, _
                                    ByRef nbFormations As Long, ByRef nbAbsences As Long, _
                                    ByRef nbConflits As Long, ByRef nbTransfertsIndispo As Long, _
                                    ByRef nbCellulesTraitees As Long)
    Dim c As Long, d As Date
    Dim currentType As String  ' "FORMATION", "ABSENCE", "CONFLIT", ou ""
    Dim startCol As Long, endCol As Long
    Dim key As String
    Dim details As String
    
    currentType = ""
    startCol = 0
    
    For c = firstCol To lastCol
        ' Vérifier si on a une date valide pour cette colonne (accès direct au dictionnaire)
        If Not dictDatesCols.Exists(c) Then GoTo NextCol
        
        ' Récupérer directement la Date depuis le dictionnaire
        d = dictDatesCols(c)
        
        nbCellulesTraitees = nbCellulesTraitees + 1
        
        ' Construire la clé avec le numéro de série pour les dictionnaires d'absences/conflits
        Dim dateSerial As Long
        dateSerial = CLng(d)
        key = ressource & "|" & dateSerial
        
        ' Clé pour les transferts : "Ressource|Site|Date"
        Dim keyTransfert As String
        keyTransfert = ressource & "|" & siteVal & "|" & dateSerial
        
        Dim newType As String
        newType = ""
        Dim newDetails As String
        newDetails = ""
        
        ' Vérifier formation (priorité 1)
        If dictFormations.Exists(key) Then
            newType = "FORMATION"
            newDetails = GetDetailsAbsence(ressource, d)
            
        ' Vérifier absence (priorité 2)
        ElseIf dictAbsences.Exists(key) Then
            newType = "ABSENCE"
            newDetails = GetDetailsAbsence(ressource, d)
            
        ' Vérifier transfert indispo (priorité 3)
        ElseIf dictTransfertsIndispo.Exists(keyTransfert) Then
            newType = "TRANSFERT_INDISPO"
            newDetails = dictTransfertsIndispo(keyTransfert)
            
        ' Vérifier conflit (priorité 4)
        ElseIf dictConflits.Exists(key) Then
            newType = "CONFLIT"
            newDetails = "?? CONFLIT : Déjà affecté(e) sur " & vbCrLf & dictConflits(key)
        End If
        
        ' Si changement de type, appliquer la couleur sur la plage précédente
        If newType <> currentType Then
            ' Appliquer la couleur sur la plage précédente
            If startCol > 0 And endCol >= startCol Then
                ' Utiliser les détails de la plage précédente (pas les nouveaux)
                Dim prevDetails As String
                prevDetails = details
                If prevDetails = "" And currentType <> "" Then
                    ' Si pas de détails précédents, récupérer pour la première date de la plage (accès direct)
                    If dictDatesCols.Exists(startCol) Then
                        Dim prevDate As Date
                        prevDate = dictDatesCols(startCol)
                        Dim prevDateSerial As Long
                        prevDateSerial = CLng(prevDate)
                        
                        If currentType = "FORMATION" Or currentType = "ABSENCE" Then
                            prevDetails = GetDetailsAbsence(ressource, prevDate)
                        ElseIf currentType = "TRANSFERT_INDISPO" Then
                            Dim prevKeyTransfert As String
                            prevKeyTransfert = ressource & "|" & siteVal & "|" & prevDateSerial
                            If dictTransfertsIndispo.Exists(prevKeyTransfert) Then
                                prevDetails = dictTransfertsIndispo(prevKeyTransfert)
                            End If
                        ElseIf currentType = "CONFLIT" Then
                            Dim prevKey As String
                            prevKey = ressource & "|" & prevDateSerial
                            If dictConflits.Exists(prevKey) Then
                                prevDetails = "?? CONFLIT : Déjà affecté(e) sur " & vbCrLf & dictConflits(prevKey)
                            End If
                        End If
                    End If
                End If
                ApplyColorToRange ws, rowNum, startCol, endCol, currentType, prevDetails
                
                ' Compter
                Select Case currentType
                    Case "FORMATION": nbFormations = nbFormations + (endCol - startCol + 1)
                    Case "ABSENCE": nbAbsences = nbAbsences + (endCol - startCol + 1)
                    Case "TRANSFERT_INDISPO": nbTransfertsIndispo = nbTransfertsIndispo + (endCol - startCol + 1)
                    Case "CONFLIT": nbConflits = nbConflits + (endCol - startCol + 1)
                End Select
            End If
            
            ' Nouvelle période
            currentType = newType
            startCol = c
            endCol = c
        Else
            ' Même type, continuer la plage
            endCol = c
        End If
NextCol:
    Next c
    
    ' Appliquer la dernière plage
    If startCol > 0 And endCol >= startCol And currentType <> "" Then
        ApplyColorToRange ws, rowNum, startCol, endCol, currentType, details
        
        ' Compter
        Select Case currentType
            Case "FORMATION": nbFormations = nbFormations + (endCol - startCol + 1)
            Case "ABSENCE": nbAbsences = nbAbsences + (endCol - startCol + 1)
            Case "TRANSFERT_INDISPO": nbTransfertsIndispo = nbTransfertsIndispo + (endCol - startCol + 1)
            Case "CONFLIT": nbConflits = nbConflits + (endCol - startCol + 1)
        End Select
    End If
End Sub

' Appliquer la couleur sur une plage de cellules
Private Sub ApplyColorToRange(ws As Worksheet, rowNum As Long, startCol As Long, endCol As Long, _
                               colorType As String, details As String)
    If startCol > endCol Then Exit Sub
    
    Dim color As Long
    Dim rng As Range
    Set rng = ws.Range(ws.Cells(rowNum, startCol), ws.Cells(rowNum, endCol))
    
    Select Case colorType
        Case "FORMATION"
            color = COLOR_FORMATION
        Case "ABSENCE"
            color = COLOR_ABSENCE
        Case "TRANSFERT_INDISPO"
            color = COLOR_TRANSFERT_INDISPO
        Case "CONFLIT"
            color = COLOR_CONFLIT
        Case Else
            Exit Sub
    End Select
    
    ' Appliquer la couleur en une seule opération
    With rng
        .Interior.color = color
        .Locked = True
        ' Ajouter commentaire seulement sur la première cellule
        If .Cells(1, 1).Comment Is Nothing And Len(details) > 0 Then
            .Cells(1, 1).AddComment details
            ' OPTIMISATION : Enregistrer la cellule avec commentaire dans le dictionnaire
            ' pour permettre une suppression rapide ultérieure
            ModuleAffectation.RegisterAffectationComment rowNum, startCol
        End If
    End With
End Sub

' ============================================================================
' 11) VALIDATION AVANT AFFECTATION (À APPELER DANS ValidateSaisieAffectation)
' ============================================================================

Public Function ValiderAffectationPossible(ws As Worksheet, Target As Range, _
                                          ressource As String, d As Date, _
                                          affaireID As String, siteVal As String) As Boolean
    
    ' 1) Vérifier formation (priorité 1) - BLOQUER la saisie
    If EstEnFormation(ressource, d) Then
        MsgBox "? " & ressource & " est en formation :" & vbCrLf & vbCrLf & _
               GetDetailsAbsence(ressource, d), _
               vbExclamation, "Affectation impossible"
        
        Application.EnableEvents = False
        Target.value = 0
        Application.EnableEvents = True
        
        ValiderAffectationPossible = False
        Exit Function
    End If
    
    ' 2) Vérifier absence (priorité 2) - BLOQUER la saisie
    If EstAbsent(ressource, d) Then
        MsgBox "? " & ressource & " est absent(e) :" & vbCrLf & vbCrLf & _
               GetDetailsAbsence(ressource, d), _
               vbExclamation, "Affectation impossible"
        
        Application.EnableEvents = False
        Target.value = 0
        Application.EnableEvents = True
        
        ValiderAffectationPossible = False
        Exit Function
    End If
    
    ' 3) Vérifier date de fin de la ressource (DateFin dans tblRessources) - BLOQUER la saisie
    Dim dateFinRessource As Date
    If VerifierDateFinRessource(ressource, d, dateFinRessource) Then
        MsgBox "? " & ressource & " n'est plus disponible après le " & Format$(dateFinRessource, "dd/mm/yyyy") & " :" & vbCrLf & vbCrLf & _
               "Date d'affectation demandée : " & Format$(d, "dd/mm/yyyy") & vbCrLf & _
               "Date de fin de disponibilité : " & Format$(dateFinRessource, "dd/mm/yyyy"), _
               vbExclamation, "Affectation impossible"
        
        Application.EnableEvents = False
        Target.value = 0
        Application.EnableEvents = True
        
        ValiderAffectationPossible = False
        Exit Function
    End If
    
    ' 4) Vérifier date de fin du transfert (DateFin dans TblTransferts)
    ' Si la date dépasse, essayer d'étendre le transfert automatiquement pour IES/INSTRUM
    Dim dateFinTransfert As Date
    If VerifierDateFinTransfert(ressource, siteVal, d, dateFinTransfert) Then
        ' Essayer d'obtenir la compétence et la période complète pour étendre le transfert
        Dim comp As String
        comp = ""
        On Error Resume Next
        comp = ModuleAffectation.FindCompetenceForRow(ws, Target.Row)
        On Error GoTo 0
        
        ' Vérifier si c'est une compétence IES ou INSTRUM
        Dim isMultiSite As Boolean: isMultiSite = False
        If Len(comp) > 0 Then
            Dim normalizedComp As String
            normalizedComp = UCase$(Trim$(comp))
            If normalizedComp = "IES" Or normalizedComp = "INSTRUM" Then
                isMultiSite = True
            End If
        End If
        
        ' Si c'est IES ou INSTRUM, essayer d'étendre le transfert
        If isMultiSite Then
            Dim d0 As Date, d1 As Date
            d0 = d
            d1 = d
            
            ' Essayer d'obtenir la période complète depuis les lignes techniques
            On Error Resume Next
            Dim techStartVal As Variant, techEndVal As Variant
            techStartVal = ws.Cells(1000, Target.Column).value
            techEndVal = ws.Cells(1001, Target.Column).value
            If ModuleExec.TryGetDate(techStartVal, d0) And ModuleExec.TryGetDate(techEndVal, d1) Then
                ' Période complète obtenue
            Else
                d0 = d
                d1 = d
            End If
            On Error GoTo 0
            
            ' Essayer d'étendre le transfert
            Dim siteOrigine As String
            siteOrigine = ModuleAffectation.GetResourceSite(ressource)
            If Len(siteOrigine) > 0 And siteOrigine <> siteVal Then
                ' Appeler la fonction d'extension du transfert
                ModuleAffectation.EnsureTransferForAffectation ressource, comp, siteVal, d0, d1
                
                ' Re-vérifier après extension
                If Not VerifierDateFinTransfert(ressource, siteVal, d, dateFinTransfert) Then
                    ' L'extension a réussi, on peut continuer
                    GoTo ContinueValidation
                End If
            End If
        End If
        
        ' Si l'extension n'a pas fonctionné ou si ce n'est pas IES/INSTRUM, bloquer
        MsgBox "? " & ressource & " n'est plus disponible sur " & siteVal & " après le " & Format$(dateFinTransfert, "dd/mm/yyyy") & " :" & vbCrLf & vbCrLf & _
               "Date d'affectation demandée : " & Format$(d, "dd/mm/yyyy") & vbCrLf & _
               "Date de fin du transfert : " & Format$(dateFinTransfert, "dd/mm/yyyy"), _
               vbExclamation, "Affectation impossible"
        
        Application.EnableEvents = False
        Target.value = 0
        Application.EnableEvents = True
        
        ValiderAffectationPossible = False
        Exit Function
    End If
    
ContinueValidation:
    
    ' 5) Vérifier conflit - sur une AUTRE affaire/site (même ressource, même période = conflit)
    Dim autreAffectation As String
    autreAffectation = EstAffecteAilleurs(ressource, affaireID, siteVal, d)
    
    If autreAffectation <> "" Then
        ' *** MODIFIÉ : Bloquer la saisie si la ressource est déjà affectée sur une AUTRE affaire/site ***
        ' Note: Si c'est la même affaire/site, ce n'est pas un conflit (c'est son affectation normale)
        MsgBox "?? " & ressource & " est déjà affecté(e) sur :" & vbCrLf & vbCrLf & _
                        autreAffectation & vbCrLf & vbCrLf & _
               "Une ressource ne peut pas être affectée à deux affaires différentes en même temps.", _
               vbExclamation, "Conflit d'affectation"
        
            Application.EnableEvents = False
            Target.value = 0
            Application.EnableEvents = True
            
            ValiderAffectationPossible = False
            Exit Function
    End If
    
    ValiderAffectationPossible = True
End Function

' ============================================================================
' VÉRIFIER DATE DE FIN DE LA RESSOURCE (tblRessources)
' ============================================================================
Private Function VerifierDateFinRessource(ressource As String, dateAffectation As Date, _
                                         ByRef dateFinRessource As Date) As Boolean
    ' Retourne True si la date d'affectation est après la DateFin de la ressource
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleExec.GetRessourcesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        VerifierDateFinRessource = False
        Exit Function
    End If
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cNom As Long, cDateFin As Long
    cNom = FindTableColumnIndex(lo, "NomPrenom")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    
    If cNom = 0 Or cDateFin = 0 Then
        VerifierDateFinRessource = False
        Exit Function
    End If
    
    Dim i As Long
    ressource = Trim$(ressource)
    
    ' Chercher la ressource
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cNom))) = ressource Then
            ' Vérifier si DateFin existe et est une date valide
            If cDateFin > 0 And UBound(dataArr, 2) >= cDateFin Then
                Dim dateFinVal As Variant
                dateFinVal = dataArr(i, cDateFin)
                
                If Not IsEmpty(dateFinVal) And IsDate(dateFinVal) Then
                    dateFinRessource = CDate(dateFinVal)
                    
                    ' Si la date d'affectation est après la date de fin, bloquer
                    If dateAffectation > dateFinRessource Then
                        VerifierDateFinRessource = True
                        Exit Function
                    End If
                End If
            End If
            Exit For  ' Ressource trouvée, pas besoin de continuer
        End If
    Next i
    
    VerifierDateFinRessource = False
    On Error GoTo 0
End Function

' ============================================================================
' VÉRIFIER DATE DE FIN DU TRANSFERT (TblTransferts)
' ============================================================================
Private Function VerifierDateFinTransfert(ressource As String, siteVal As String, _
                                         dateAffectation As Date, _
                                         ByRef dateFinTransfert As Date) As Boolean
    ' Retourne True si la date d'affectation est après la DateFin du transfert actif
    ' ou si la date d'affectation est dans la période du transfert mais sur le site d'origine
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleTransfert.GetTransfertsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        VerifierDateFinTransfert = False
        Exit Function
    End If
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long, cDateDeb As Long, cDateFin As Long, cStatut As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSiteOrig = FindTableColumnIndex(lo, "SiteOrigine")
    cSiteDest = FindTableColumnIndex(lo, "SiteDestination")
    cDateDeb = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cStatut = FindTableColumnIndex(lo, "Statut")
    
    If cRes = 0 Or cSiteDest = 0 Or cDateDeb = 0 Or cDateFin = 0 Or cStatut = 0 Then
        VerifierDateFinTransfert = False
        Exit Function
    End If
    
    Dim i As Long
    ressource = Trim$(ressource)
    siteVal = Trim$(siteVal)
    
    ' Chercher un transfert actif pour cette ressource
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRes))) = ressource Then
            
            ' Vérifier si le statut est "Appliqué"
            Dim statut As String
            statut = Trim$(UCase$(CStr(dataArr(i, cStatut))))
            
            If statut = "APPLIQUE" Or statut = "APPLIQUÉ" Then
                ' Vérifier si les dates sont valides
                If IsDate(dataArr(i, cDateDeb)) And IsDate(dataArr(i, cDateFin)) Then
                    Dim dateDeb As Date, dateFin As Date
                    Dim siteOrigine As String, siteDestination As String
                    dateDeb = CDate(dataArr(i, cDateDeb))
                    dateFin = CDate(dataArr(i, cDateFin))
                    
                    If cSiteOrig > 0 And UBound(dataArr, 2) >= cSiteOrig Then
                        siteOrigine = Trim$(CStr(dataArr(i, cSiteOrig)))
                    End If
                    siteDestination = Trim$(CStr(dataArr(i, cSiteDest)))
                    
                    ' Vérifier si la date d'affectation est dans la période du transfert
                    If dateAffectation >= dateDeb And dateAffectation <= dateFin Then
                        ' Si on essaie d'affecter sur le site d'origine pendant le transfert, bloquer
                        If siteVal = siteOrigine Then
                            dateFinTransfert = dateFin
                            VerifierDateFinTransfert = True
                            Exit Function
                        End If
                        ' Si on essaie d'affecter sur le site de destination pendant le transfert, c'est OK
                        If siteVal = siteDestination Then
                            VerifierDateFinTransfert = False
                            Exit Function
                        End If
                    ElseIf dateAffectation < dateDeb Then
                        ' La date d'affectation est avant le début du transfert
                        ' Si on essaie d'affecter sur le site de destination avant le début du transfert, bloquer
                        If siteVal = siteDestination Then
                            dateFinTransfert = dateFin
                            VerifierDateFinTransfert = True
                            Exit Function
                        End If
                        ' Si on essaie d'affecter sur le site d'origine avant le transfert, c'est OK (ressource pas encore prêtée)
                    ElseIf dateAffectation > dateFin Then
                        ' La date d'affectation est après la fin du transfert
                        ' Si on essaie d'affecter sur le site de destination, bloquer (la ressource n'est plus là)
                        If siteVal = siteDestination Then
                            dateFinTransfert = dateFin
                            VerifierDateFinTransfert = True
                            Exit Function
                        End If
                        ' Si on essaie d'affecter sur le site d'origine après la fin du transfert, c'est OK (la ressource peut revenir)
                    End If
                End If
            End If
        End If
    Next i
    
    VerifierDateFinTransfert = False
    On Error GoTo 0
End Function

' ============================================================================
' GÉRER UNE MODIFICATION DANS LA TABLE TblAbsences
' ============================================================================
' *** DÉLÉGATION À ModuleFeuilleAbsences pour la gestion de la validation ***
Public Sub HandleAbsencesTableChange(ByVal Target As Range)
    ' Déléguer à ModuleFeuilleAbsences qui gère la validation automatique
    ModuleFeuilleAbsences.HandleAbsencesTableChange Target
End Sub

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblAbsences
' ============================================================================
Private Function IsInAbsencesTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> "Absences" Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_ABSENCES)
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
' GÉRER UNE MODIFICATION DANS LA TABLE TblAlertes
' ============================================================================
Public Sub HandleAlertesTableChange(ByVal Target As Range)
    On Error GoTo ErrHandler
    
    ' Vérifier si c'est dans la table
    If Not IsInAlertesTable(Target) Then Exit Sub
    
    Debug.Print "[HandleAlertesTableChange] Modification dans TblAlertes - " & Target.Address
    
    ' Vérifier si c'est la colonne "PriseEnCompte" qui a été modifiée
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_ALERTES)
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Trouver les colonnes
    Dim cPriseEnCompte As Long, cCourrierStatut As Long
    cPriseEnCompte = FindTableColumnIndex(lo, "PriseEnCompte")
    cCourrierStatut = FindTableColumnIndex(lo, "Courrier Statut")
    
    If cPriseEnCompte > 0 And Target.Column = lo.ListColumns(cPriseEnCompte).Index Then
        ' La colonne "PriseEnCompte" a été modifiée
        Dim rowIndex As Long
        rowIndex = Target.Row - lo.DataBodyRange.Row + 1
        
        If rowIndex > 0 And rowIndex <= lo.ListRows.count Then
            Dim lr As ListRow: Set lr = lo.ListRows(rowIndex)
            Dim priseEnCompte As String
            priseEnCompte = Trim$(UCase$(CStr(lr.Range(1, cPriseEnCompte).value)))
            
            ' Si "Oui", mettre à jour la date de prise en compte (par exemple dans la colonne DateAction)
            ' ou ajouter un commentaire dans la colonne Action
            If priseEnCompte = "OUI" Then
                Dim cAction As Long
                cAction = FindTableColumnIndex(lo, "Action")
                
                If cAction > 0 Then
                    Dim actionActuelle As String
                    actionActuelle = Trim$(CStr(lr.Range(1, cAction).value))
                    
                    ' Ajouter un suffixe pour indiquer que l'alerte a été prise en compte
                    If InStr(actionActuelle, " (Prise en compte le ") = 0 Then
                        lr.Range(1, cAction).value = actionActuelle & " (Prise en compte le " & Format$(Now, "dd/mm/yyyy hh:mm") & ")"
                    End If
                End If
                
                Debug.Print "[HandleAlertesTableChange] Alerte prise en compte - Ligne " & rowIndex
            End If
        End If
    End If
    
    ' Si la colonne "Courrier Statut" a été modifiée
    If cCourrierStatut > 0 And Target.Column = lo.ListColumns(cCourrierStatut).Index Then
        Dim rowIndexCourrier As Long
        rowIndexCourrier = Target.Row - lo.DataBodyRange.Row + 1
        
        If rowIndexCourrier > 0 And rowIndexCourrier <= lo.ListRows.count Then
            Dim lrCourrier As ListRow: Set lrCourrier = lo.ListRows(rowIndexCourrier)
            Dim courrierStatut As String
            courrierStatut = Trim$(UCase$(CStr(lrCourrier.Range(1, cCourrierStatut).value)))
            
            ' Si "Envoyé", mettre à jour l'action pour indiquer la date d'envoi
            If courrierStatut = "ENVOYE" Or courrierStatut = "ENVOYÉ" Then
                Dim cActionCourrier As Long
                cActionCourrier = FindTableColumnIndex(lo, "Action")
                
                If cActionCourrier > 0 Then
                    Dim actionActuelleCourrier As String
                    actionActuelleCourrier = Trim$(CStr(lrCourrier.Range(1, cActionCourrier).value))
                    
                    ' Ajouter un suffixe pour indiquer que le courrier a été envoyé
                    If InStr(actionActuelleCourrier, " (Courrier envoyé le ") = 0 Then
                        lrCourrier.Range(1, cActionCourrier).value = actionActuelleCourrier & " (Courrier envoyé le " & Format$(Now, "dd/mm/yyyy hh:mm") & ")"
                    End If
                End If
                
                Debug.Print "[HandleAlertesTableChange] Courrier marqué comme envoyé - Ligne " & rowIndexCourrier
            End If
        End If
    End If
    
    ' Marquer Dashboard pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    Debug.Print "[HandleAlertesTableChange] Modification enregistrée"
    ModuleExec.TriggerAutoChecks
    Exit Sub
    
ErrHandler:
    Debug.Print "[HandleAlertesTableChange] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleAbsence", "HandleAlertesTableChange", False
    Err.Clear
End Sub

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblAlertes
' ============================================================================
Private Function IsInAlertesTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> "Alertes" Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_ALERTES)
    On Error GoTo Quit
    
    If lo Is Nothing Then GoTo Quit
    If lo.DataBodyRange Is Nothing Then GoTo Quit
    
    ' Vérifier si la cellule est dans le DataBodyRange
    If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
        IsInAlertesTable = True
        Exit Function
    End If

Quit:
    IsInAlertesTable = False
End Function





