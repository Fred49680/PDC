' ============================================
' MODULE : ModuleSeparationFichiers
' Description : Séparation du fichier en DONNEES et INTERFACE
' Auteur : Assistant IA
' Date : 2025-01-27
' ============================================

Option Explicit

' ============================================
' CONSTANTES
' ============================================
Private Const FICHIER_DONNEES As String = "PlanDeCharge_DONNEES.xlsm"
Private Const CHEMIN_SERVEUR_DEFAUT As String = "\\Serveur\Partage\" ' À MODIFIER selon votre serveur

' Liste des tables à copier dans fichier DONNEES
Private Const TABLES_DONNEES As String = "TblPeriodes|TblAffectations|TblAbsences|tblRessources|tblAffaires|TblTransferts|TblInterims|TblChantiers|TblAlertes"

' ============================================
' FONCTION PRINCIPALE : Créer fichier DONNEES
' ============================================
Sub CreerFichierDonnees()
    On Error GoTo ErrHandler
    
    Dim wbDonnees As Workbook
    Dim wbSource As Workbook
    Dim wsDonnees As Worksheet
    Dim tblSource As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim cheminComplet As String
    Dim reponse As VbMsgBoxResult
    Dim cheminServeur As String
    
    ' Désactiver optimisations
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    Application.Calculation = xlCalculationManual
    
    ' Demander le chemin du serveur
    cheminServeur = InputBox("Entrez le chemin du serveur (ex: \\Serveur\Partage\)" & vbCrLf & vbCrLf & _
                             "Laissez vide pour utiliser le chemin par défaut.", _
                             "Chemin serveur", CHEMIN_SERVEUR_DEFAUT)
    
    If cheminServeur = "" Then
        cheminServeur = CHEMIN_SERVEUR_DEFAUT
    End If
    
    ' S'assurer que le chemin se termine par \
    If Right(cheminServeur, 1) <> "\" Then
        cheminServeur = cheminServeur & "\"
    End If
    
    ' Chemin complet
    cheminComplet = cheminServeur & FICHIER_DONNEES
    
    ' Vérifier si fichier existe déjà
    If Dir(cheminComplet) <> "" Then
        reponse = MsgBox("Le fichier DONNEES existe déjà à l'emplacement :" & vbCrLf & _
                        cheminComplet & vbCrLf & vbCrLf & _
                        "Voulez-vous le remplacer ?" & vbCrLf & vbCrLf & _
                        "ATTENTION : Cette opération supprimera toutes les données existantes !", _
                        vbYesNo + vbQuestion + vbDefaultButton2, "Confirmation")
        
        If reponse = vbNo Then
            GoTo Fin
        End If
        
        ' Fermer le fichier s'il est ouvert
        On Error Resume Next
        Workbooks(FICHIER_DONNEES).Close SaveChanges:=False
        On Error GoTo ErrHandler
        
        ' Supprimer l'ancien fichier
        Kill cheminComplet
    End If
    
    ' Afficher message
    Application.StatusBar = "Création du fichier DONNEES en cours..."
    
    ' Créer nouveau fichier
    Set wbDonnees = Workbooks.Add
    wbDonnees.SaveAs cheminComplet, xlOpenXMLWorkbookMacroEnabled
    
    ' Référence au fichier source (fichier actuel)
    Set wbSource = ThisWorkbook
    
    ' Séparer les noms de tables
    arrTables = Split(TABLES_DONNEES, "|")
    
    ' Copier chaque table
    For i = LBound(arrTables) To UBound(arrTables)
        Application.StatusBar = "Copie de la table : " & arrTables(i) & " (" & (i + 1) & "/" & (UBound(arrTables) + 1) & ")"
        
        Set tblSource = Nothing
        
        ' Trouver la table dans le fichier source
        On Error Resume Next
        Set tblSource = TrouverTable(wbSource, arrTables(i))
        On Error GoTo ErrHandler
        
        If Not tblSource Is Nothing Then
            ' Créer feuille pour cette table
            Set wsDonnees = wbDonnees.Worksheets.Add
            wsDonnees.Name = arrTables(i)
            
            ' Copier la table
            Call CopierTable(tblSource, wsDonnees)
            
            ' Protéger la feuille (lecture seule pour utilisateurs)
            wsDonnees.Protect Password:="", UserInterfaceOnly:=True, _
                AllowFormattingCells:=False, AllowFormattingColumns:=False, _
                AllowFormattingRows:=False, AllowInsertingRows:=False, _
                AllowDeletingRows:=False, AllowSorting:=False, _
                AllowFiltering:=True, AllowUsingPivotTables:=False
        Else
            Debug.Print "Table non trouvée : " & arrTables(i)
        End If
    Next i
    
    ' Supprimer feuille par défaut
    On Error Resume Next
    Application.DisplayAlerts = False
    If wbDonnees.Worksheets.Count > 1 Then
        wbDonnees.Worksheets("Sheet1").Delete
    End If
    Application.DisplayAlerts = True
    On Error GoTo ErrHandler
    
    ' Sauvegarder et fermer
    wbDonnees.Save
    wbDonnees.Close SaveChanges:=False
    
    Application.StatusBar = False
    MsgBox "Fichier DONNEES créé avec succès !" & vbCrLf & vbCrLf & _
           "Chemin : " & cheminComplet & vbCrLf & vbCrLf & _
           "Nombre de tables copiées : " & (UBound(arrTables) + 1) & vbCrLf & vbCrLf & _
           "Vous pouvez maintenant nettoyer le fichier INTERFACE.", vbInformation
    
Fin:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Application.Calculation = xlCalculationAutomatic
    Application.StatusBar = False
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Application.Calculation = xlCalculationAutomatic
    Application.StatusBar = False
    
    If Not wbDonnees Is Nothing Then
        On Error Resume Next
        wbDonnees.Close SaveChanges:=False
        On Error GoTo 0
    End If
    
    MsgBox "Erreur lors de la création du fichier DONNEES :" & vbCrLf & vbCrLf & _
           "Erreur " & Err.Number & " : " & Err.Description & vbCrLf & vbCrLf & _
           "Chemin tenté : " & cheminComplet, vbCritical
    GoTo Fin
End Sub

' ============================================
' FONCTION : Trouver une table dans un classeur
' ============================================
Private Function TrouverTable(wb As Workbook, nomTable As String) As ListObject
    Dim ws As Worksheet
    Dim tbl As ListObject
    
    For Each ws In wb.Worksheets
        For Each tbl In ws.ListObjects
            If tbl.Name = nomTable Then
                Set TrouverTable = tbl
                Exit Function
            End If
        Next tbl
    Next ws
    
    Set TrouverTable = Nothing
End Function

' ============================================
' FONCTION : Copier une table vers une feuille
' ============================================
Private Sub CopierTable(tblSource As ListObject, wsDest As Worksheet)
    On Error GoTo ErrHandler
    
    Dim rngSource As Range
    Dim rngDest As Range
    Dim tblDest As ListObject
    Dim nbLignes As Long
    Dim nbColonnes As Long
    
    ' Vérifier que la table source a des données
    If tblSource.DataBodyRange Is Nothing Then
        ' Table vide, créer juste la structure
        Set rngSource = tblSource.HeaderRowRange
        nbLignes = 1
        nbColonnes = tblSource.ListColumns.Count
    Else
        ' Copier les en-têtes et données
        Set rngSource = tblSource.Range
        nbLignes = rngSource.Rows.Count
        nbColonnes = rngSource.Columns.Count
    End If
    
    ' Copier vers A1
    Set rngDest = wsDest.Range("A1")
    
    ' Copier les valeurs
    rngSource.Copy
    rngDest.PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False
    
    ' Créer la table structurée
    Set rngDest = wsDest.Range(rngDest, rngDest.Offset(nbLignes - 1, nbColonnes - 1))
    
    ' Supprimer la table si elle existe déjà
    On Error Resume Next
    wsDest.ListObjects(1).Delete
    On Error GoTo ErrHandler
    
    ' Créer la nouvelle table
    Set tblDest = wsDest.ListObjects.Add(xlSrcRange, rngDest, , xlYes)
    tblDest.Name = tblSource.Name
    
    ' Appliquer le style (optionnel)
    On Error Resume Next
    tblDest.TableStyle = tblSource.TableStyle
    On Error GoTo 0
    
    Exit Sub
    
ErrHandler:
    Application.CutCopyMode = False
    Err.Raise Err.Number, "CopierTable", "Erreur lors de la copie de " & tblSource.Name & " : " & Err.Description
End Sub

' ============================================
' FONCTION : Nettoyer fichier INTERFACE
' Supprime les feuilles qui CONTIENNENT les tables de données
' ============================================
Sub NettoyerFichierInterface()
    On Error GoTo ErrHandler
    
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim reponse As VbMsgBoxResult
    Dim feuillesASupprimer As Collection
    Dim compteur As Long
    Dim msgFeuilles As String
    Dim nomFeuille As String
    Dim tableTrouvee As Boolean
    Dim wsTrouve As Worksheet
    
    ' Liste des tables à supprimer
    arrTables = Split(TABLES_DONNEES, "|")
    
    ' Parcourir toutes les feuilles et identifier celles qui CONTIENNENT les tables
    Set feuillesASupprimer = New Collection
    
    For Each ws In ThisWorkbook.Worksheets
        tableTrouvee = False
        nomFeuille = ws.Name
        
        ' Parcourir toutes les tables de cette feuille
        For Each tbl In ws.ListObjects
            ' Vérifier si cette table est dans la liste à supprimer
            For i = LBound(arrTables) To UBound(arrTables)
                If tbl.Name = arrTables(i) Then
                    ' Cette feuille contient une table à supprimer
                    tableTrouvee = True
                    Exit For
                End If
            Next i
            
            If tableTrouvee Then Exit For
        Next tbl
        
        ' Si une table a été trouvée, ajouter la feuille à la liste de suppression
        If tableTrouvee Then
            ' Vérifier que la feuille n'est pas déjà dans la collection
            Dim dejaPresente As Boolean
            dejaPresente = False
            For i = 1 To feuillesASupprimer.Count
                If feuillesASupprimer(i).Name = nomFeuille Then
                    dejaPresente = True
                    Exit For
                End If
            Next i
            
            If Not dejaPresente Then
                feuillesASupprimer.Add ws
            End If
        End If
    Next ws
    
    ' Si aucune feuille à supprimer
    If feuillesASupprimer.Count = 0 Then
        msgFeuilles = "Aucune feuille contenant les tables de données n'a été trouvée." & vbCrLf & vbCrLf & _
                      "Tables recherchées :" & vbCrLf & Replace(TABLES_DONNEES, "|", vbCrLf) & vbCrLf & vbCrLf & _
                      "Feuilles actuelles :" & vbCrLf
        For Each ws In ThisWorkbook.Worksheets
            msgFeuilles = msgFeuilles & "- " & ws.Name & vbCrLf
        Next ws
        MsgBox msgFeuilles, vbInformation, "Aucune feuille à supprimer"
        Exit Sub
    End If
    
    ' Construire le message de confirmation avec détails
    msgFeuilles = "Les feuilles suivantes seront supprimées (elles contiennent les tables de données) :" & vbCrLf & vbCrLf
    For i = 1 To feuillesASupprimer.Count
        msgFeuilles = msgFeuilles & "- " & feuillesASupprimer(i).Name & vbCrLf
        ' Afficher les tables trouvées dans cette feuille
        Dim tablesDansFeuille As String
        tablesDansFeuille = ""
        For Each tbl In feuillesASupprimer(i).ListObjects
            Dim j As Long
            For j = LBound(arrTables) To UBound(arrTables)
                If tbl.Name = arrTables(j) Then
                    If tablesDansFeuille <> "" Then tablesDansFeuille = tablesDansFeuille & ", "
                    tablesDansFeuille = tablesDansFeuille & arrTables(j)
                End If
            Next j
        Next tbl
        If tablesDansFeuille <> "" Then
            msgFeuilles = msgFeuilles & "  → Contient : " & tablesDansFeuille & vbCrLf
        End If
    Next i
    
    ' Confirmation
    reponse = MsgBox(msgFeuilles & vbCrLf & _
                     "Êtes-vous sûr de vouloir continuer ?" & vbCrLf & vbCrLf & _
                     "ATTENTION : Faites une sauvegarde avant !", _
                     vbYesNo + vbQuestion + vbDefaultButton2, "Confirmation")
    
    If reponse = vbNo Then
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    Application.Calculation = xlCalculationManual
    
    ' Supprimer les feuilles (en parcourant à l'envers pour éviter les problèmes d'index)
    compteur = 0
    For i = feuillesASupprimer.Count To 1 Step -1
        nomFeuille = feuillesASupprimer(i).Name
        Application.StatusBar = "Suppression de la feuille : " & nomFeuille & " (" & (feuillesASupprimer.Count - i + 1) & "/" & feuillesASupprimer.Count & ")"
        
        ' Trouver et supprimer la feuille
        On Error Resume Next
        Set wsTrouve = ThisWorkbook.Worksheets(nomFeuille)
        On Error GoTo ErrHandler
        
        If Not wsTrouve Is Nothing Then
            Application.DisplayAlerts = False
            wsTrouve.Delete
            Application.DisplayAlerts = True
            compteur = compteur + 1
            Set wsTrouve = Nothing
        End If
    Next i
    
    Application.StatusBar = False
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Application.Calculation = xlCalculationAutomatic
    
    MsgBox "Fichier INTERFACE nettoyé avec succès !" & vbCrLf & vbCrLf & _
           "Nombre de feuilles supprimées : " & compteur & vbCrLf & vbCrLf & _
           "Vous devez maintenant modifier les PowerQuery pour pointer vers le fichier DONNEES.", vbInformation
    
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Application.Calculation = xlCalculationAutomatic
    Application.StatusBar = False
    MsgBox "Erreur lors du nettoyage :" & vbCrLf & _
           "Erreur " & Err.Number & " : " & Err.Description & vbCrLf & vbCrLf & _
           "Feuille en cours : " & nomFeuille, vbCritical
End Sub

' ============================================
' FONCTION : Vérifier les tables existantes
' ============================================
Sub VerifierTables()
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim trouvee As Boolean
    Dim msg As String
    Dim compteurTrouvees As Long
    
    Set wb = ThisWorkbook
    arrTables = Split(TABLES_DONNEES, "|")
    
    msg = "Vérification des tables :" & vbCrLf & vbCrLf
    
    For i = LBound(arrTables) To UBound(arrTables)
        trouvee = False
        
        For Each ws In wb.Worksheets
            For Each tbl In ws.ListObjects
                If tbl.Name = arrTables(i) Then
                    trouvee = True
                    compteurTrouvees = compteurTrouvees + 1
                    msg = msg & "✓ " & arrTables(i) & " (feuille : " & ws.Name & ")" & vbCrLf
                    Exit For
                End If
            Next tbl
            If trouvee Then Exit For
        Next ws
        
        If Not trouvee Then
            msg = msg & "✗ " & arrTables(i) & " (NON TROUVÉE)" & vbCrLf
        End If
    Next i
    
    msg = msg & vbCrLf & "Total : " & compteurTrouvees & "/" & (UBound(arrTables) + 1) & " tables trouvées"
    
    MsgBox msg, vbInformation, "Vérification des tables"
End Sub

' ============================================
' FONCTION : Diagnostiquer les feuilles à supprimer
' Cherche les feuilles qui CONTIENNENT les tables
' ============================================
Sub DiagnostiquerFeuillesASupprimer()
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim j As Long
    Dim msg As String
    Dim compteur As Long
    Dim nomFeuille As String
    Dim feuillesASupprimer As String
    Dim feuillesAutres As String
    Dim tableTrouvee As Boolean
    Dim tablesDansFeuille As String
    
    arrTables = Split(TABLES_DONNEES, "|")
    
    msg = "DIAGNOSTIC - Feuilles à supprimer" & vbCrLf & vbCrLf
    msg = msg & "Tables recherchées :" & vbCrLf
    For i = LBound(arrTables) To UBound(arrTables)
        msg = msg & "- " & arrTables(i) & vbCrLf
    Next i
    
    msg = msg & vbCrLf & "----------------------------------------" & vbCrLf & vbCrLf
    msg = msg & "Analyse des feuilles :" & vbCrLf & vbCrLf
    
    compteur = 0
    feuillesASupprimer = ""
    feuillesAutres = ""
    
    ' Parcourir toutes les feuilles
    For Each ws In ThisWorkbook.Worksheets
        nomFeuille = ws.Name
        tableTrouvee = False
        tablesDansFeuille = ""
        
        ' Parcourir toutes les tables de cette feuille
        For Each tbl In ws.ListObjects
            ' Vérifier si cette table est dans la liste à supprimer
            For i = LBound(arrTables) To UBound(arrTables)
                If tbl.Name = arrTables(i) Then
                    tableTrouvee = True
                    If tablesDansFeuille <> "" Then tablesDansFeuille = tablesDansFeuille & ", "
                    tablesDansFeuille = tablesDansFeuille & arrTables(i)
                End If
            Next i
        Next tbl
        
        ' Si une table a été trouvée, cette feuille sera supprimée
        If tableTrouvee Then
            compteur = compteur + 1
            feuillesASupprimer = feuillesASupprimer & "✓ " & nomFeuille & " (SERA SUPPRIMÉE)" & vbCrLf
            feuillesASupprimer = feuillesASupprimer & "  → Contient les tables : " & tablesDansFeuille & vbCrLf & vbCrLf
        Else
            ' Afficher les tables de cette feuille (pour info)
            Dim tablesAutres As String
            tablesAutres = ""
            For Each tbl In ws.ListObjects
                If tablesAutres <> "" Then tablesAutres = tablesAutres & ", "
                tablesAutres = tablesAutres & tbl.Name
            Next tbl
            
            If tablesAutres <> "" Then
                feuillesAutres = feuillesAutres & "  " & nomFeuille & " (tables : " & tablesAutres & ")" & vbCrLf
            Else
                feuillesAutres = feuillesAutres & "  " & nomFeuille & " (aucune table)" & vbCrLf
            End If
        End If
    Next ws
    
    ' Construire le message final
    If feuillesASupprimer <> "" Then
        msg = msg & "FEUILLES QUI SERONT SUPPRIMÉES :" & vbCrLf & vbCrLf
        msg = msg & feuillesASupprimer
    End If
    
    If feuillesAutres <> "" Then
        msg = msg & "----------------------------------------" & vbCrLf & vbCrLf
        msg = msg & "AUTRES FEUILLES (ne seront PAS supprimées) :" & vbCrLf & vbCrLf
        msg = msg & feuillesAutres
    End If
    
    msg = msg & vbCrLf & "----------------------------------------" & vbCrLf
    msg = msg & "Total de feuilles à supprimer : " & compteur & vbCrLf & vbCrLf
    
    If compteur = 0 Then
        msg = msg & "⚠ ATTENTION : Aucune feuille contenant les tables de données n'a été trouvée !" & vbCrLf & vbCrLf
        msg = msg & "Vérifiez que les tables existent bien dans votre fichier."
    Else
        msg = msg & "✓ " & compteur & " feuille(s) sera(ont) supprimée(s)."
    End If
    
    MsgBox msg, vbInformation, "Diagnostic"
End Sub

' ============================================
' FONCTION : Afficher le menu principal
' ============================================
Sub MenuSeparation()
    Dim choix As String
    Dim reponse As VbMsgBoxResult
    
    choix = InputBox("MENU SÉPARATION DES FICHIERS" & vbCrLf & vbCrLf & _
                     "1. Vérifier les tables (recommandé en premier)" & vbCrLf & _
                     "2. Diagnostiquer les feuilles à supprimer" & vbCrLf & _
                     "3. Créer le fichier DONNEES" & vbCrLf & _
                     "4. Nettoyer le fichier INTERFACE" & vbCrLf & vbCrLf & _
                     "Entrez le numéro de l'option (1-4) :", _
                     "Séparation des fichiers", "1")
    
    Select Case choix
        Case "1"
            VerifierTables
        Case "2"
            DiagnostiquerFeuillesASupprimer
        Case "3"
            CreerFichierDonnees
        Case "4"
            NettoyerFichierInterface
        Case ""
            ' Annulé
        Case Else
            MsgBox "Option invalide. Veuillez entrer un nombre entre 1 et 4.", vbExclamation
    End Select
End Sub

