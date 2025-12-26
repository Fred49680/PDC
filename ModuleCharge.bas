

Option Explicit

' ==== CONFIG =====
Private Const CELL_AFFAIRE       As String = "B1"
Private Const CELL_SITE          As String = "B6"
Private Const CELL_DATE_DEB      As String = "B10"
Private Const CELL_DATE_FIN      As String = "B11"
Private Const CELL_DATE_OVERRIDE As String = "B13"
Private Const CELL_PRECISION     As String = "B15"

Private Const HEADER_ROW         As Long = 3
Private Const COL_COMP           As Long = 3
Private Const COL_TOTAL          As Long = 4
Private Const FIRST_DATE_COL     As Long = 5

Private Const TECH_ROW_START     As Long = 1000
Private Const TECH_ROW_END       As Long = 1001

Private Const TARGET_SHEET       As String = "Charge"
Private Const TARGET_PERIODE     As String = "PériodesAffaire"
Private Const TARGET_LISTOBJECT  As String = "TblPeriodes"

Private Const NAMED_LST_COMP     As String = "Lstcomp"
Private Const NAMED_LST_FERIES   As String = "LstFeries"

' Couleurs
Private Const COLOR_BAR_BG    As Long = &HF8F8F8
Private Const COLOR_INPUT_BG  As Long = &HEFEFEF
Private Const COLOR_WE_BG     As Long = &HC4D9DD
Private Const COLOR_FERIE_BG  As Long = &HE6E6FF
Private Const COLOR_GRID      As Long = &H969696
Private Const COLOR_OUTLINE   As Long = &H0

Private Const WIDTH_COL_JOUR  As Double = 14#
Private Const WIDTH_COL_META  As Double = 23#

' Le cache fériés est géré par ModuleCalendar

' ============================================================
' ==========    HELPERS & INDEXATION RAPIDE     ==============
' ============================================================

Public Function GetChargeTable() As ListObject
    Set GetChargeTable = ModuleExec.GetChargeTable()
End Function

Private Sub GetAffaireSiteFromSheet(ws As Worksheet, ByRef affID As String, ByRef siteVal As String)
    affID = Trim$(CStr(ws.Range(CELL_AFFAIRE).value))
    siteVal = Trim$(CStr(ws.Range(CELL_SITE).value))
End Sub

Private Function ValidateSheetData(ws As Worksheet, ByRef d0 As Date, ByRef d1 As Date) As Boolean
    Dim affID As String: affID = Trim$(CStr(ws.Range(CELL_AFFAIRE).value))
    If Len(affID) = 0 Then
        Debug.Print "[ValidateSheetData] ÉCHEC: affID vide"
        Exit Function
    End If

    Dim dateDebVal As Variant, dateFinVal As Variant
    dateDebVal = ws.Range(CELL_DATE_DEB).value
    dateFinVal = ws.Range(CELL_DATE_FIN).value
    
    If Not ModuleExec.TryGetDate(dateDebVal, d0) Then
        Debug.Print "[ValidateSheetData] ÉCHEC: Date début invalide (valeur=" & dateDebVal & ")"
        Exit Function
    End If
    
    If Not ModuleExec.TryGetDate(dateFinVal, d1) Then
        Debug.Print "[ValidateSheetData] ÉCHEC: Date fin invalide (valeur=" & dateFinVal & ")"
        Exit Function
    End If

       Dim ovr As Variant: ovr = ws.Range(CELL_DATE_OVERRIDE).value
    Dim dateMin As Date: dateMin = #1/1/2026# ' Date minimale par défaut
    
    If IsDate(ovr) Then
        Dim dateOvr As Date
        dateOvr = CDate(ovr)
        ' Vérifier que la date n'est pas zéro ou avant le 01/01/2026
        If dateOvr >= dateMin Then
            d0 = dateOvr
        Else
            ' Date zéro ou invalide (< 01/01/2026), utiliser la date minimale
            d0 = dateMin
        End If
    End If
    
    ' S'assurer que d0 n'est pas avant la date minimale
    If d0 < dateMin Then
        d0 = dateMin
    End If

    Debug.Print "[ValidateSheetData] OK - affID='" & affID & "' / d0=" & Format$(d0, "dd/mm/yyyy") & " / d1=" & Format$(d1, "dd/mm/yyyy")
    ValidateSheetData = True
End Function

' ============================================================
' ==========      RECONSTRUCTION DE GRILLE       =============
' ============================================================

Public Sub ConstruireGrille()
    On Error GoTo ErrHandler

    Debug.Print "[ConstruireGrille] START"
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets(TARGET_SHEET)
    Dim d0 As Date, d1 As Date
    Dim precision As String
    Dim nRows As Long

    If Not ValidateSheetData(ws, d0, d1) Then
        Debug.Print "[ConstruireGrille] ValidateSheetData a échoué"
        Exit Sub
    End If

    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"
    Debug.Print "[ConstruireGrille] Précision = " & precision & " / Dates = " & Format$(d0, "dd/mm/yyyy") & " -> " & Format$(d1, "dd/mm/yyyy")

    ModuleExec.BeginFastExec

        ClearGrid ws
        ' Effacer aussi le message de sélection si présent
        On Error Resume Next
        Application.Run "Charge.ClearSelectChantierMessage", ws
        On Error GoTo 0
        
        ' Initialiser le calendrier ModuleCalendar
        ModuleCalendar.LoadCalendar
        
        Debug.Print "[ConstruireGrille] BuildPeriodColumns..."
        BuildPeriodColumns ws, d0, d1, precision
        Debug.Print "[ConstruireGrille] BuildPeriodColumns OK"
        
        nRows = FillCompetencyRows(ws)
        Debug.Print "[ConstruireGrille] FillCompetencyRows OK (" & nRows & " lignes)"
        
        ' Définir les valeurs AVANT StyleGrid pour que le formatage s'applique correctement
        ws.Cells(HEADER_ROW, COL_COMP).value = "Compétence"
        ws.Cells(HEADER_ROW, COL_TOTAL).value = "Total (h)"
        
        StyleGrid ws, precision, d0, d1, nRows

    ModuleExec.EndFastExec

    ' Invalider le cache après reconstruction de la grille
    ' (pour éviter d'utiliser un objet ListObject invalide après ClearGrid)
    ModuleExec.InvalidateListObjectCache "TblPeriodes"

    Debug.Print "[ConstruireGrille] END (OK)"
CleanExit:
    Exit Sub

ErrHandler:
    ModuleExec.EndFastExec
    Debug.Print "[ConstruireGrille] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleCharge", "ConstruireGrille", False
    Err.Clear
    Resume CleanExit
End Sub

' ============================================================
' ==========   ENREGISTREMENT D’UNE CELLULE BESOIN   =========
' ============================================================

Public Sub EnregistrerUneBesoinCharge(affaireID As String, siteVal As String, _
                                      comp As String, d As Date, besoin As Variant)
    On Error GoTo ErrHandler

    Debug.Print "[EnregistrerUneBesoinCharge] START - affaireID=" & affaireID & " / siteVal=" & siteVal & " / comp=" & comp & " / d=" & Format$(d, "dd/mm/yyyy") & " / besoin=" & besoin
    
    ' *** NOUVEAU : Ouvrir le fichier DONNEES en mode lecture/ecriture si necessaire ***
    Dim wbDonnees As Workbook
    Dim needToSave As Boolean: needToSave = False
    Set wbDonnees = ModuleExec.GetFichierDonneesReadWrite()
    If Not wbDonnees Is Nothing Then
        needToSave = True
        Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES ouvert en mode lecture/ecriture"
    End If
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = GetChargeTable()
    If Err.Number <> 0 Then
        Debug.Print "[EnregistrerUneBesoinCharge] ERREUR GetChargeTable: " & Err.Number & " - " & Err.Description
        Err.Clear
        On Error GoTo ErrHandler
        Exit Sub
    End If
    On Error GoTo ErrHandler
    
    If lo Is Nothing Then
        Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: GetChargeTable() retourne Nothing"
        Exit Sub
    End If
    
    Debug.Print "[EnregistrerUneBesoinCharge] GetChargeTable() OK"
    
    ' Vérifier que la table est accessible et pas en lecture seule
    On Error Resume Next
    Dim testAccess As String
    testAccess = lo.name
    If Err.Number <> 0 Then
        Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: Table non accessible (nom): " & Err.Description
        Err.Clear
        ' Invalider le cache et réessayer
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        Set lo = GetChargeTable()
        If lo Is Nothing Then
            Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: Impossible de récupérer la table après invalidation cache"
            Exit Sub
        End If
    End If
    
    ' Vérifier que DataBodyRange est accessible
    If lo.DataBodyRange Is Nothing Then
        Debug.Print "[EnregistrerUneBesoinCharge] DataBodyRange est Nothing, tentative de récupération..."
        On Error Resume Next
        Dim testDBR As Range
        Set testDBR = lo.DataBodyRange
        If Err.Number <> 0 Then
            Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: DataBodyRange non accessible: " & Err.Description
            Err.Clear
            ' Invalider le cache et réessayer
            ModuleExec.InvalidateListObjectCache "TblPeriodes"
            Set lo = GetChargeTable()
            If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
                Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: Impossible de récupérer DataBodyRange après invalidation cache"
                Exit Sub
            End If
        End If
        On Error GoTo ErrHandler
    End If
    On Error GoTo ErrHandler

    Dim ws As Worksheet
    On Error Resume Next
    Set ws = Worksheets("Charge")
    On Error GoTo 0
    If ws Is Nothing Then Exit Sub

    ' ------------------------------
    ' NORMALISATION DU BESOIN
    ' ------------------------------
    If Trim$(CStr(besoin)) = "" Then besoin = 0
    If Not IsNumeric(besoin) Then besoin = 0 Else besoin = CDbl(besoin)

    ' ---------------------------------------
    ' Détection de la granularité
    ' ---------------------------------------
    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"

    Dim d0 As Date, d1 As Date

    Select Case precision
        Case "JOUR"
            d0 = d: d1 = d

        Case "SEMAINE", "MOIS"
            Dim c As Long, lastCol As Long
            lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
            For c = FIRST_DATE_COL To lastCol
                If IsDate(ws.Cells(TECH_ROW_START, c).value) And _
                   IsDate(ws.Cells(TECH_ROW_END, c).value) Then

                    If d >= ws.Cells(TECH_ROW_START, c).value And _
                       d <= ws.Cells(TECH_ROW_END, c).value Then

                        d0 = ws.Cells(TECH_ROW_START, c).value
                        d1 = ws.Cells(TECH_ROW_END, c).value
                        Exit For
                    End If
                End If
            Next c

        Case Else
            d0 = d: d1 = d
    End Select

    ' ---------------------------------------
    ' Récupération de la ligne existante
    ' ---------------------------------------
    Debug.Print "[EnregistrerUneBesoinCharge] Recherche ligne existante..."
    Dim rowFound As ListRow
    Set rowFound = FindChargeRow(lo, affaireID, siteVal, comp, d0)
    
    If rowFound Is Nothing Then
        Debug.Print "[EnregistrerUneBesoinCharge] Aucune ligne trouvée, création d'une nouvelle ligne..."
    Else
        Debug.Print "[EnregistrerUneBesoinCharge] Ligne existante trouvée"
    End If

    ' Si aucune ligne trouvée ? création
    If rowFound Is Nothing Then
        Debug.Print "[EnregistrerUneBesoinCharge] Création nouvelle ligne..."
        On Error Resume Next
        Set rowFound = lo.ListRows.Add
        If Err.Number <> 0 Then
            Debug.Print "[EnregistrerUneBesoinCharge] ERREUR lors de ListRows.Add: " & Err.Number & " - " & Err.Description
            Err.Clear
            On Error GoTo ErrHandler
            Exit Sub
        End If
        On Error GoTo ErrHandler
        
        If rowFound Is Nothing Then
            Debug.Print "[EnregistrerUneBesoinCharge] ERREUR: rowFound est Nothing après ListRows.Add"
            Exit Sub
        End If
        
        With rowFound.Range
            .Cells(1, 1).value = affaireID
            .Cells(1, 2).value = siteVal
            .Cells(1, 3).value = comp
            .Cells(1, 4).value = d0
            .Cells(1, 5).value = d1
            .Cells(1, 6).value = besoin
        End With
        
        ' Vérifier que les valeurs ont été écrites
        Debug.Print "[EnregistrerUneBesoinCharge] Ligne créée: Affaire=" & rowFound.Range(1, 1).value & " / Site=" & rowFound.Range(1, 2).value & " / Comp=" & rowFound.Range(1, 3).value & " / DateDeb=" & rowFound.Range(1, 4).value & " / DateFin=" & rowFound.Range(1, 5).value & " / NbRessources=" & rowFound.Range(1, 6).value
        
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        Debug.Print "[EnregistrerUneBesoinCharge] Ligne créée avec succès"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES si on l'a ouvert en ecriture ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres creation"
        End If
        Exit Sub
    End If

    ' ---------------------------------------
    ' GESTION DES MISES À JOUR & SUPPRESSIONS
    ' ---------------------------------------

    Dim oldD0 As Date, oldD1 As Date
    oldD0 = rowFound.Range(1, 4).value
    oldD1 = rowFound.Range(1, 5).value
    Dim oldBesoin As Double
    oldBesoin = CDbl(rowFound.Range(1, 6).value)

    ' ==============================
    ' ====== CAS 1 : MAJ ===========
    ' ==============================
    If besoin > 0 Then
        ' Vérifier si les périodes se chevauchent ou sont adjacentes
        ' Chevauchement : (d0 <= oldD1) And (d1 >= oldD0)
        ' Adjacentes : (d0 = oldD1 + 1) Or (d1 = oldD0 - 1)
        Dim chevauchent As Boolean, adjacentes As Boolean
        chevauchent = (d0 <= oldD1) And (d1 >= oldD0)
        adjacentes = (d0 = oldD1 + 1) Or (d1 = oldD0 - 1)
        
        ' Si les périodes se chevauchent ou sont adjacentes ET que la charge est identique, fusionner
        If (chevauchent Or adjacentes) And besoin = oldBesoin Then
            ' Fusionner : étendre la période pour inclure les deux
            If d0 < oldD0 Then rowFound.Range(1, 4).value = d0
            If d1 > oldD1 Then rowFound.Range(1, 5).value = d1
            ' Invalider le cache après modification
            ModuleExec.InvalidateListObjectCache "TblPeriodes"
            ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
            If needToSave Then
                ModuleExec.SauvegarderFichierDonnees
                Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres fusion"
            End If
            Exit Sub
        End If
        
        ' Si les périodes sont identiques, mettre à jour la charge
        If d0 = oldD0 And d1 = oldD1 Then
            rowFound.Range(1, 6).value = besoin
            ' Invalider le cache après modification
            ModuleExec.InvalidateListObjectCache "TblPeriodes"
            ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
            If needToSave Then
                ModuleExec.SauvegarderFichierDonnees
                Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres mise a jour"
            End If
            Exit Sub
        End If
        
        ' Sinon, créer une nouvelle ligne (la consolidation s'occupera de fusionner)
        Dim newRow As ListRow
        Set newRow = lo.ListRows.Add
        With newRow.Range
            .Cells(1, 1).value = affaireID
            .Cells(1, 2).value = siteVal
            .Cells(1, 3).value = comp
            .Cells(1, 4).value = d0
            .Cells(1, 5).value = d1
            .Cells(1, 6).value = besoin
        End With
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres creation nouvelle ligne"
        End If
        Exit Sub
    End If

    ' ==============================
    ' ====== CAS 2 : SUPPRESSION ===
    ' ==============================

    ' Suppression totale
    If d0 <= oldD0 And d1 >= oldD1 Then
        rowFound.Delete
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres suppression totale"
        End If
        Exit Sub
    End If

    ' Suppression début
    If d0 = oldD0 And d1 < oldD1 Then
        rowFound.Range(1, 4).value = d1 + 1
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres suppression debut"
        End If
        Exit Sub
    End If

    ' Suppression fin
    If d1 = oldD1 And d0 > oldD0 Then
        rowFound.Range(1, 5).value = d0 - 1
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres suppression fin"
        End If
        Exit Sub
    End If

    ' Failsafe
    If (rowFound.Range(1, 4).value > rowFound.Range(1, 5).value) Then
        rowFound.Delete
        ' Invalider le cache après modification
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
        Debug.Print "[EnregistrerUneBesoinCharge] Ligne supprimée (période invalide)"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres suppression failsafe"
        End If
        Exit Sub
    End If

    ' Suppression au milieu ? scission
    
    Set newRow = lo.ListRows.Add
    With newRow.Range
        .Cells(1, 1).value = affaireID
        .Cells(1, 2).value = siteVal
        .Cells(1, 3).value = comp
        .Cells(1, 4).value = d1 + 1
        .Cells(1, 5).value = oldD1
        .Cells(1, 6).value = rowFound.Range(1, 6).value
    End With

    rowFound.Range(1, 5).value = d0 - 1
    ModuleExec.InvalidateListObjectCache "TblPeriodes"
    Debug.Print "[EnregistrerUneBesoinCharge] Ligne scindée (suppression au milieu)"
    ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
    If needToSave Then
        ModuleExec.SauvegarderFichierDonnees
        Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres scission"
    End If
    Exit Sub
    
ErrHandler:
    Debug.Print "[EnregistrerUneBesoinCharge] ERREUR : " & Err.Number & " - " & Err.Description & " (ligne " & Erl & ")"
    ' *** NOUVEAU : Sauvegarder le fichier DONNEES meme en cas d'erreur si on l'a ouvert ***
    If needToSave Then
        ModuleExec.SauvegarderFichierDonnees
        Debug.Print "[EnregistrerUneBesoinCharge] Fichier DONNEES sauvegarde apres erreur"
    End If
    ModuleErrorHandling.HandleError "ModuleCharge", "EnregistrerUneBesoinCharge", False
    Err.Clear

End Sub


' ====================================================================
' ==========   FONCTION DE RECHERCHE DE LIGNE (ROBUSTE)   ============
' ====================================================================

' Utilise tableau en mémoire au lieu de boucle ListRows
Private Function FindChargeRow(lo As ListObject, affaireID As String, siteVal As String, comp As String, d As Date) As ListRow
    ' Invalider le cache AVANT de charger les données
    ' Cela garantit qu'on voit les nouvelles lignes créées précédemment
    ModuleExec.InvalidateListObjectCache "TblPeriodes"
    
    ' Récupérer la table fraîche après invalidation du cache
    Dim loFresh As ListObject
    Set loFresh = GetChargeTable()
    If loFresh Is Nothing Or loFresh.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger toutes les données en mémoire depuis la table fraîche
    Dim dataArr As Variant
    dataArr = loFresh.DataBodyRange.value
    
    Dim i As Long, d0 As Date, d1 As Date
    affaireID = Trim$(affaireID)
    siteVal = Trim$(siteVal)
    comp = Trim$(comp)
    
    ' Recherche dans le tableau (beaucoup plus rapide)
    ' *** CORRECTION : Comparaison avec UCase pour éviter problèmes de casse ***
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If UCase$(Trim$(CStr(dataArr(i, 1)))) = UCase$(affaireID) And _
           UCase$(Trim$(CStr(dataArr(i, 2)))) = UCase$(siteVal) And _
           UCase$(Trim$(CStr(dataArr(i, 3)))) = UCase$(comp) Then
            
            If IsDate(dataArr(i, 4)) And IsDate(dataArr(i, 5)) Then
                d0 = CDate(dataArr(i, 4))
                d1 = CDate(dataArr(i, 5))
                
                If d >= d0 And d <= d1 Then
                    ' Retourner la ListRow correspondante (index i dans DataBodyRange)
                    ' *** CORRECTION : Utiliser loFresh au lieu de lo ***
                    ' *** CORRECTION : Vérifier que l'index est valide ***
                    On Error Resume Next
                    Set FindChargeRow = loFresh.ListRows(i)
                    If Err.Number <> 0 Then
                        Debug.Print "[FindChargeRow] ERREUR: Impossible d'accéder à ListRows(" & i & "): " & Err.Description
                        Err.Clear
                        Exit Function
                    End If
                    On Error GoTo 0
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Public Sub ConsoliderUnePeriode(lo As ListObject, _
                                affaireID As String, _
                                siteVal As String, _
                                comp As String)
    
    ' Normaliser les paramètres (trim + uppercase pour comparaison)
    affaireID = Trim$(affaireID)
    siteVal = Trim$(siteVal)
    comp = Trim$(comp)
    
    Debug.Print "[ConsoliderUnePeriode] START - affaireID='" & affaireID & "' / siteVal='" & siteVal & "' / comp='" & comp & "'"
    
    ' Invalider le cache AVANT de charger les données
    ModuleExec.InvalidateListObjectCache "TblPeriodes"
    
    ' *** CORRECTION : Récupérer la table fraîche après invalidation du cache ***
    Dim loFresh As ListObject
    Set loFresh = GetChargeTable()
    If loFresh Is Nothing Then
        Debug.Print "[ConsoliderUnePeriode] GetChargeTable() retourne Nothing"
        Exit Sub
    End If
    
    ' Forcer le rafraîchissement en accédant à DataBodyRange
    On Error Resume Next
    Dim testRefresh As Long
    If Not loFresh.DataBodyRange Is Nothing Then
        testRefresh = loFresh.DataBodyRange.Rows.count
        Debug.Print "[ConsoliderUnePeriode] Table contient " & testRefresh & " ligne(s)"
    End If
    On Error GoTo 0
    
    If loFresh.DataBodyRange Is Nothing Then
        Debug.Print "[ConsoliderUnePeriode] DataBodyRange est Nothing pour " & affaireID & "/" & siteVal & "/" & comp
        Exit Sub
    End If
    
    Dim dataArr As Variant
    On Error Resume Next
    dataArr = loFresh.DataBodyRange.value
    If Err.Number <> 0 Then
        Debug.Print "[ConsoliderUnePeriode] ERREUR lors du chargement des données : " & Err.Description
        Err.Clear
        Exit Sub
    End If
    On Error GoTo 0
    
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    Dim r As Long, d0 As Date, d1 As Date, qte As Double, d As Date
    
    ' === 1) Collecte JOUR PAR JOUR ===
    Dim nbLignesTrouvees As Long: nbLignesTrouvees = 0
    Dim nbLignesTotal As Long: nbLignesTotal = UBound(dataArr, 1) - LBound(dataArr, 1) + 1
    Debug.Print "[ConsoliderUnePeriode] Parcours de " & nbLignesTotal & " ligne(s) dans la table"
    
    For r = LBound(dataArr, 1) To UBound(dataArr, 1)
        Dim affTable As String, siteTable As String, compTable As String
        affTable = Trim$(CStr(dataArr(r, 1)))
        siteTable = Trim$(CStr(dataArr(r, 2)))
        compTable = Trim$(CStr(dataArr(r, 3)))
        
        ' Comparaison case-insensitive avec UCase$
        If UCase$(affTable) = UCase$(affaireID) And _
           UCase$(siteTable) = UCase$(siteVal) And _
           UCase$(compTable) = UCase$(comp) Then
            
            nbLignesTrouvees = nbLignesTrouvees + 1
            d0 = CDate(dataArr(r, 4))
            d1 = CDate(dataArr(r, 5))
            qte = CDbl(dataArr(r, 6))
            
            If qte > 0 Then
                For d = d0 To d1
                    ' Utiliser ModuleCalendar pour vérifier jour ouvré
                    If ModuleCalendar.isBusinessDay(d) Then
                        dict(CStr(CLng(d))) = qte
                    End If
                Next d
            End If
        End If
    Next r
    
    Debug.Print "[ConsoliderUnePeriode] " & nbLignesTrouvees & " ligne(s) trouvée(s) pour " & affaireID & "/" & siteVal & "/" & comp & " -> " & dict.count & " jour(s) ouvré(s)"
    
    ' *** CORRECTION : Vérifier AVANT de supprimer les lignes ***
    ' Si aucune donnée, supprimer toutes les lignes et sortir
    If dict.count = 0 Then
        Debug.Print "[ConsoliderUnePeriode] Aucune donnée trouvée -> suppression de toutes les lignes"
        DeleteRowsByAffaireSiteComp loFresh, affaireID, siteVal, comp
        Exit Sub
    End If
    
    ' Si seulement 1 jour, pas besoin de consolidation, juste supprimer les autres lignes
    ' et garder/mettre à jour la ligne existante
    If dict.count = 1 Then
        ' Supprimer toutes les lignes existantes
        DeleteRowsByAffaireSiteComp loFresh, affaireID, siteVal, comp
        ' Créer une seule ligne pour ce jour
        Dim singleDate As Long, singleQte As Double
        singleDate = CLng(dict.keys()(0))
        singleQte = dict(dict.keys()(0))
        AddConsoLine loFresh, affaireID, siteVal, comp, singleDate, singleDate, singleQte
        Exit Sub
    End If
    
    ' === 2) Purge anciennes lignes (utiliser loFresh au lieu de lo) ===
    ' On a au moins 2 jours, on peut consolider
    DeleteRowsByAffaireSiteComp loFresh, affaireID, siteVal, comp
    
    ' === 3) Trier les dates ===
    Dim dates() As Long, k As Variant, i As Long
    ReDim dates(0 To dict.count - 1)
    
    i = 0
    For Each k In dict.keys
        dates(i) = CLng(k)
        i = i + 1
    Next k
    
    QuickSortLong dates, LBound(dates), UBound(dates)
    
    ' === 4) Reconstruire périodes ===
    Dim startD As Long: startD = dates(0)
    Dim endD As Long: endD = dates(0)
    Dim curQ As Double: curQ = dict(CStr(startD))
    Dim nextWorkDay As Long, cur As Long
    
    For i = 1 To UBound(dates)
        cur = dates(i)
        
        ' Utiliser ModuleCalendar pour calculer le prochain jour ouvré
        nextWorkDay = CLng(ModuleCalendar.NextBusinessDay(dateSerial(1899, 12, 30) + endD))
        
        If CLng(cur) = CLng(nextWorkDay) And dict(CStr(cur)) = curQ Then
            endD = cur
        Else
            AddConsoLine loFresh, affaireID, siteVal, comp, startD, endD, curQ
            startD = cur
            endD = cur
            curQ = dict(CStr(cur))
        End If
    Next i
    
    ' Dernière période
    AddConsoLine loFresh, affaireID, siteVal, comp, startD, endD, curQ
End Sub

' *** WRAPPER : Consolide toutes les périodes pour une affaire/site/compétence ***
Public Sub ConsoliderPeriodes_AffaireSiteComp(affaireID As String, siteVal As String, comp As String)
    Dim lo As ListObject: Set lo = GetChargeTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' ModuleCalendar gère le cache fériés
    ConsoliderUnePeriode lo, affaireID, siteVal, comp
End Sub

' AddConsoLine avec calcul local (utilise ModuleCalendar)
Private Sub AddConsoLine(lo As ListObject, affaireID As String, siteVal As String, comp As String, _
                         startD As Long, endD As Long, qte As Double)
    
    Dim newRow As ListRow: Set newRow = lo.ListRows.Add
    
    ' *** CORRECTION : Conversion correcte Long -> Date ***
    Dim dStart As Date, dEnd As Date
    dStart = dateSerial(1899, 12, 30) + startD
    dEnd = dateSerial(1899, 12, 30) + endD
    
    ' Utiliser ModuleCalendar pour calculer les jours ouvrés
    Dim nbJO As Long
    nbJO = ModuleCalendar.BusinessDaysBetween(dStart, dEnd)
    
    ' *** VÉRIFICATION : Si nbJO = 0, il y a un problème ***
    If nbJO = 0 Then nbJO = 1  ' Sécurité
    
    With newRow.Range
        .Cells(1, 1).value = affaireID
        .Cells(1, 2).value = siteVal
        .Cells(1, 3).value = comp
        .Cells(1, 4).value = dStart
        .Cells(1, 5).value = dEnd
        .Cells(1, 6).value = qte
        .Cells(1, 7).value = nbJO           ' ? Nombre de jours ouvrés
        .Cells(1, 8).value = qte * nbJO     ' ? Total jours
    End With
    ' *** OPTIMISATION : Invalider le cache après ajout ***
    ModuleExec.InvalidateListObjectCache "TblPeriodes"
End Sub


Private Sub DeleteRowsByAffaireSiteComp(lo As ListObject, affaireID As String, siteVal As String, comp As String)
    Dim i As Long
    Dim rg As Range
    Dim deleted As Boolean: deleted = False
    
    ' On parcourt À L'ENVERS pour éviter les décalages
    For i = lo.ListRows.count To 1 Step -1
        Set rg = lo.ListRows(i).Range
        
        If Trim$(CStr(rg.Cells(1, 1).value)) = affaireID And _
           Trim$(CStr(rg.Cells(1, 2).value)) = siteVal And _
           Trim$(CStr(rg.Cells(1, 3).value)) = comp Then
            
            lo.ListRows(i).Delete
            deleted = True
        End If
    Next i
    
    ' *** OPTIMISATION : Invalider le cache après suppression ***
    If deleted Then
        ModuleExec.InvalidateListObjectCache "TblPeriodes"
    End If
End Sub

Public Sub ChargerPlanDeCharge(ws As Worksheet)
    On Error GoTo CleanExit
    
    Dim t0 As Double: t0 = Timer

    Dim affID As String, siteVal As String
    GetAffaireSiteFromSheet ws, affID, siteVal
    If Len(affID) = 0 Then
        Exit Sub
    End If
    
    ' *** OPTIMISATION : Ignorer les sélections multiples d'affaires ***
    ' Si plusieurs affaires sélectionnées (contient des virgules), ne rien faire
    If InStr(affID, ",") > 0 Then
        Exit Sub
    End If
    
    Dim affIDToUse As String
    affIDToUse = Trim$(affID)
    siteVal = Trim$(siteVal)
    
    ' Normaliser pour comparaison case-insensitive
    Dim affIDToUseUpper As String, siteValUpper As String
    affIDToUseUpper = UCase$(affIDToUse)
    siteValUpper = UCase$(siteVal)
    
    Dim t As Double: t = Timer

    Dim lo As ListObject
    On Error Resume Next
    Set lo = GetChargeTable()
    On Error GoTo CleanExit
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[ChargerPlanDeCharge] Table vide ou inaccessible"
        Exit Sub
    End If

    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
    If lastCol < FIRST_DATE_COL Then
        Debug.Print "[ChargerPlanDeCharge] Pas de colonnes dates (lastCol=" & lastCol & " < FIRST_DATE_COL=" & FIRST_DATE_COL & ")"
        Exit Sub
    End If

    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"

    ModuleExec.BeginFastExec
    
    ' *** OPTIMISATION : Initialiser le calendrier utilcalc.mdc ***
    ModuleCalendar.LoadCalendar
    
    ' ========= EFFACEMENT DONNÉES =========
    ws.Range(ws.Cells(HEADER_ROW + 3, FIRST_DATE_COL), _
             ws.Cells(HEADER_ROW + 200, lastCol)).ClearContents

    ' ========= LECTURE PÉRIODES TECHNIQUES EN TABLEAU (pour mode SEMAINE/MOIS) =========
    Dim arrStart As Variant, arrEnd As Variant
    On Error Resume Next
    arrStart = ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_START, lastCol)).value
    arrEnd = ws.Range(ws.Cells(TECH_ROW_END, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, lastCol)).value
    On Error GoTo CleanExit

    ' *** OPTIMISATION MAJEURE : Charger TOUTES les données du ListObject en mémoire ***
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' *** NOUVELLE OPTIMISATION : Construire un dictionnaire Colonne -> Date pour accès direct ***
    Dim dictDateCols As Object: Set dictDateCols = CreateObject("Scripting.Dictionary")
    Dim dictColDates As Object: Set dictColDates = CreateObject("Scripting.Dictionary")
    Dim c As Long
    For c = FIRST_DATE_COL To lastCol
        Dim dateVal As Variant, d As Date
        dateVal = ws.Cells(TECH_ROW_START, c).value
        If ModuleExec.TryGetDate(dateVal, d) Then
            dictDateCols(c) = d
            dictColDates(CLng(d)) = c
        End If
    Next c
    
    ' *** OPTIMISATION : Construire un dictionnaire (Compétence, Colonne) -> Valeur ***
    Dim dictCharge As Object: Set dictCharge = CreateObject("Scripting.Dictionary")
    dictCharge.CompareMode = vbTextCompare
    
    Dim r As Long, comp As String, d0 As Date, d1 As Date, qte As Double
    Dim dateSerialKey As Long
    Dim nbLignesTrouvees As Long: nbLignesTrouvees = 0

    ' ========= CHARGEMENT EN MÉMOIRE (dictionnaire) =========
    For r = LBound(dataArr, 1) To UBound(dataArr, 1)
        ' *** CORRECTION : Comparaison case-insensitive avec UCase$ comme dans les autres fonctions ***
        Dim affTable As String, siteTable As String
        affTable = Trim$(CStr(dataArr(r, 1)))
        siteTable = Trim$(CStr(dataArr(r, 2)))
        
        If UCase$(affTable) = affIDToUseUpper And _
           UCase$(siteTable) = siteValUpper Then
            
            nbLignesTrouvees = nbLignesTrouvees + 1

            comp = Trim$(CStr(dataArr(r, 3)))

            If ModuleExec.TryGetDate(dataArr(r, 4), d0) And _
               ModuleExec.TryGetDate(dataArr(r, 5), d1) Then

                qte = CDbl(dataArr(r, 6))

                ' ========= MODE JOUR =========
                If precision = "JOUR" Then
                    For d = d0 To d1
                        ' Utiliser ModuleCalendar pour vérifier jour ouvré (éviter week-ends/fériés)
                        If Not ModuleCalendar.isBusinessDay(d) Then GoTo NextDayLoad
                        
                        dateSerialKey = CLng(d)
                        If dictColDates.Exists(dateSerialKey) Then
                            c = dictColDates(dateSerialKey)
                            Dim key As String
                            key = comp & "|" & c
                            dictCharge(key) = qte
                        End If
NextDayLoad:
                    Next d
                End If

                ' ========= MODE SEMAINE / MOIS =========
                If precision = "SEMAINE" Or precision = "MOIS" Then
                    For c = FIRST_DATE_COL To lastCol
                        If IsDate(arrStart(1, c - FIRST_DATE_COL + 1)) And _
                           IsDate(arrEnd(1, c - FIRST_DATE_COL + 1)) Then

                            Dim dStart As Date, dEnd As Date
                            dStart = arrStart(1, c - FIRST_DATE_COL + 1)
                            dEnd = arrEnd(1, c - FIRST_DATE_COL + 1)

                            If (d0 <= dEnd) And (d1 >= dStart) Then
                                key = comp & "|" & c
                                dictCharge(key) = qte
                            End If
                        End If
                    Next c
                End If
            End If
        End If
    Next r
    
    Debug.Print "[ChargerPlanDeCharge] " & nbLignesTrouvees & " ligne(s) trouvée(s) pour affaireID='" & affIDToUse & "' / siteVal='" & siteVal & "' -> " & dictCharge.count & " entrée(s) dans le dictionnaire"
    
    ' *** OPTIMISATION : Appliquer les valeurs par plages pour chaque compétence ***
    Dim compDict As Object: Set compDict = CreateObject("Scripting.Dictionary")
    compDict.CompareMode = vbTextCompare
    
    ' Récupérer toutes les compétences uniques
    Dim k As Variant
    For Each k In dictCharge.keys
        Dim parts() As String
        parts = Split(k, "|")
        If UBound(parts) >= 1 Then
            compDict(parts(0)) = True
        End If
    Next k
    
    ' Appliquer par compétence
    Dim compKey As Variant
    For Each compKey In compDict.keys
        comp = CStr(compKey)
        Dim rowGrid As Long
        rowGrid = FindCompRow(ws, comp)
        If rowGrid = 0 Then GoTo NextComp
        
        ' Appliquer les valeurs par plages pour cette compétence
        ApplyChargeForComp ws, rowGrid, comp, FIRST_DATE_COL, lastCol, dictCharge, dictDateCols, precision
NextComp:
    Next compKey
    ModuleAffectation.CheckAndTriggerAffectation ws
    
    ModuleExec.EndFastExec
    Debug.Print "[ChargerPlanDeCharge] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub

CleanExit:
    If Err.Number <> 0 Then
        Debug.Print "[ChargerPlanDeCharge] ERREUR : " & Err.Number & " - " & Err.Description
        ModuleErrorHandling.HandleError "ModuleCharge", "ChargerPlanDeCharge", False
        Err.Clear
    End If
    
    ' *** IMPORTANT : Toujours appeler EndFastExec si BeginFastExec a été appelé ***
    On Error Resume Next
    ModuleExec.EndFastExec
    On Error GoTo 0
End Sub

' ============================================================
' =====================   OUTILS GRILLE   ====================
' ============================================================

Private Function FindCompRow(ws As Worksheet, comp As String) As Long
    Dim r As Long: r = HEADER_ROW + 3
    Do While Len(Trim$(CStr(ws.Cells(r, COL_COMP).value))) > 0
        If Trim$(CStr(ws.Cells(r, COL_COMP).value)) = comp Then
            FindCompRow = r
            Exit Function
        End If
        r = r + 1
    Loop
End Function

' *** OPTIMISATION : Appliquer les valeurs par plages pour une compétence ***
Private Sub ApplyChargeForComp(ws As Worksheet, rowNum As Long, comp As String, _
                                firstCol As Long, lastCol As Long, _
                                dictCharge As Object, dictDateCols As Object, _
                                precision As String)
    Dim c As Long
    Dim currentValue As Variant
    Dim startCol As Long, endCol As Long
    
    currentValue = Empty
    startCol = 0
    
    For c = firstCol To lastCol
        Dim key As String
        key = comp & "|" & c
        
        Dim newValue As Variant
        newValue = Empty
        If dictCharge.Exists(key) Then
            newValue = dictCharge(key)
        End If
        
        ' Si changement de valeur, appliquer la plage précédente
        If newValue <> currentValue Then
            ' Appliquer la plage précédente si elle existe
            If startCol > 0 And endCol >= startCol And Not IsEmpty(currentValue) Then
                ' Éviter week-ends/fériés : vérifier chaque colonne avant d'écrire
                If precision = "JOUR" Then
                    ApplyChargeRangeAvoidWeekends ws, rowNum, startCol, endCol, currentValue, dictDateCols
                Else
                    ' Pour SEMAINE/MOIS, écrire directement
                    ws.Range(ws.Cells(rowNum, startCol), ws.Cells(rowNum, endCol)).value = currentValue
                End If
            End If
            
            ' Nouvelle plage
            currentValue = newValue
            startCol = c
            endCol = c
        Else
            ' Même valeur, continuer la plage
            endCol = c
        End If
    Next c
    
    ' Appliquer la dernière plage
    If startCol > 0 And endCol >= startCol And Not IsEmpty(currentValue) Then
        If precision = "JOUR" Then
            ApplyChargeRangeAvoidWeekends ws, rowNum, startCol, endCol, currentValue, dictDateCols
        Else
            ws.Range(ws.Cells(rowNum, startCol), ws.Cells(rowNum, endCol)).value = currentValue
        End If
    End If
End Sub

' *** OPTIMISATION : Appliquer une plage en évitant les week-ends/fériés ***
Private Sub ApplyChargeRangeAvoidWeekends(ws As Worksheet, rowNum As Long, _
                                          startCol As Long, endCol As Long, _
                                          value As Variant, dictDateCols As Object)
    Dim c As Long
    Dim startRange As Long, endRange As Long
    Dim inRange As Boolean: inRange = False
    
    startRange = 0
    
    For c = startCol To endCol
        If dictDateCols.Exists(c) Then
            Dim d As Date
            d = dictDateCols(c)
            
            ' Vérifier si c'est un jour ouvré
            If ModuleCalendar.isBusinessDay(d) Then
                If Not inRange Then
                    ' Début d'une nouvelle plage
                    startRange = c
                    inRange = True
                End If
                endRange = c
            Else
                ' Week-end/férié : appliquer la plage précédente si elle existe
                If inRange And startRange > 0 And endRange >= startRange Then
                    ws.Range(ws.Cells(rowNum, startRange), ws.Cells(rowNum, endRange)).value = value
                    inRange = False
                    startRange = 0
                End If
            End If
        End If
    Next c
    
    ' Appliquer la dernière plage si elle existe
    If inRange And startRange > 0 And endRange >= startRange Then
        ws.Range(ws.Cells(rowNum, startRange), ws.Cells(rowNum, endRange)).value = value
    End If
End Sub

Public Function FindPeriodColumn(ws As Worksheet, d As Date) As Long
    Dim c As Long, v
    Dim key As Long: key = CLng(d)

    For c = FIRST_DATE_COL To ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
        v = ws.Cells(HEADER_ROW + 1, c).value
        If IsDate(v) Then
            If CLng(CDate(v)) = key Then
                FindPeriodColumn = c
                Exit Function
            End If
        End If
    Next
End Function

' ============================================================
' ======= (restent identiques : BuildPeriodColumns, etc.) ====
' ============================================================
' ===== COLONNES ===========================================================

Private Sub BuildPeriodColumns(ws As Worksheet, d0 As Date, d1 As Date, precision As String)
    Dim c As Long, r1 As Long, r2 As Long, r3 As Long
    Dim d As Date, pStart As Date, pEnd As Date
    
    r1 = HEADER_ROW: r2 = HEADER_ROW + 1: r3 = HEADER_ROW + 2
    c = FIRST_DATE_COL
    
    ' Nettoyage
    ws.Range(ws.Cells(r1, FIRST_DATE_COL), ws.Cells(r3, ModuleExec.LastUsedCol(ws, r2))).Clear
    ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, ModuleExec.LastUsedCol(ws, TECH_ROW_START))).Clear
    
    Select Case precision
        Case "JOUR"
            BuildDailyColumns ws, r1, r2, r3, c, d0, d1
        Case "SEMAINE"
            BuildWeeklyColumns ws, r1, r2, r3, c, d0, d1
        Case "MOIS"
            BuildMonthlyColumns ws, r1, r2, r3, c, d0, d1
    End Select
    
    ' Masquage lignes techniques
    ws.Rows(TECH_ROW_START).Hidden = True
    ws.Rows(TECH_ROW_END).Hidden = True
    
    ' Style entêtes
    With ws.Range(ws.Cells(r1, COL_COMP), ws.Cells(r3, c - 1))
        .Font.Bold = True
        .Interior.color = COLOR_BAR_BG
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    ws.Columns(COL_COMP).ColumnWidth = WIDTH_COL_META
    ws.Columns(COL_TOTAL).ColumnWidth = WIDTH_COL_JOUR
    ws.Range(ws.Cells(1, FIRST_DATE_COL), ws.Cells(1, c - 1)).EntireColumn.ColumnWidth = WIDTH_COL_JOUR
    
End Sub

' Sous-routines pour chaque type de période
Private Sub BuildDailyColumns(ws As Worksheet, r1 As Long, r2 As Long, r3 As Long, ByRef c As Long, d0 As Date, d1 As Date)
    Dim d As Date: d = d0
    Do While d <= d1
        ws.Cells(r1, c).value = "S" & Format$(IsoWeekNumber(d), "00") & "-" & IsoWeekYear(d)
        
        ' ? Forcer un vrai objet Date, pas une chaîne
        ws.Cells(r2, c).value = dateSerial(Year(d), Month(d), Day(d))
        ws.Cells(r3, c).value = Format$(d, "ddd")

        ws.Cells(TECH_ROW_START, c).value = dateSerial(Year(d), Month(d), Day(d))
        ws.Cells(TECH_ROW_END, c).value = dateSerial(Year(d), Month(d), Day(d))

        c = c + 1
        d = d + 1
    Loop

    ws.Range(ws.Cells(r2, FIRST_DATE_COL), ws.Cells(r2, c - 1)).NumberFormat = "dd/mm"
End Sub


Private Sub BuildWeeklyColumns(ws As Worksheet, r1 As Long, r2 As Long, r3 As Long, ByRef c As Long, d0 As Date, d1 As Date)
    Dim pStart As Date: pStart = MondayOnOrBefore(d0)
    Dim pEnd As Date
    Do While pStart <= d1
        pEnd = pStart + 6
        If pEnd > d1 Then pEnd = d1
        ws.Cells(r1, c).value = "S" & Format$(IsoWeekNumber(pStart), "00") & "-" & IsoWeekYear(pStart)
        ws.Cells(r2, c).value = Format$(pStart, "dd/mm") & "–" & Format$(pEnd, "dd/mm")
        ws.Cells(r3, c).value = "sem"
        ws.Cells(TECH_ROW_START, c).value = pStart
        ws.Cells(TECH_ROW_END, c).value = pEnd
        c = c + 1: pStart = pStart + 7
    Loop
End Sub

Private Sub BuildMonthlyColumns(ws As Worksheet, r1 As Long, r2 As Long, r3 As Long, ByRef c As Long, d0 As Date, d1 As Date)
    Dim pStart As Date: pStart = dateSerial(Year(d0), Month(d0), 1)
    Dim pEnd As Date
    Do While pStart <= d1
        pEnd = dateSerial(Year(pStart), Month(pStart) + 1, 0)
        If pEnd > d1 Then pEnd = d1
        ws.Cells(r1, c).value = Format$(pStart, "mmmm yyyy")
        ws.Cells(r2, c).value = Format$(pStart, "dd/mm") & "–" & Format$(pEnd, "dd/mm")
        ws.Cells(r3, c).value = "mois"
        ws.Cells(TECH_ROW_START, c).value = pStart
        ws.Cells(TECH_ROW_END, c).value = pEnd
        c = c + 1: pStart = dateSerial(Year(pStart), Month(pStart) + 1, 1)
    Loop
End Sub

' ===== LIGNES COMPETENCE ==================================================

Private Function FillCompetencyRows(ws As Worksheet) As Long
    Dim compRng As Range, arr, i As Long, row0 As Long, n As Long
    
    On Error Resume Next
    Set compRng = Range(NAMED_LST_COMP)
    On Error GoTo 0
    If compRng Is Nothing Then Exit Function
    
    row0 = HEADER_ROW + 3
    arr = compRng.value
    
    If IsArray(arr) Then
        For i = 1 To UBound(arr, 1)
            If Len(Trim$(CStr(arr(i, 1)))) > 0 Then
                ws.Cells(row0 + n, COL_COMP).value = arr(i, 1)
                PutTotalFormula ws, row0 + n
                n = n + 1
            End If
        Next
    Else
        If Len(Trim$(CStr(compRng.value))) > 0 Then
            ws.Cells(row0, COL_COMP).value = compRng.value
            PutTotalFormula ws, row0
            n = 1
        End If
    End If
    
    FillCompetencyRows = n
End Function

Private Sub PutTotalFormula(ws As Worksheet, r As Long)
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
    If lastCol < FIRST_DATE_COL Then Exit Sub
    
    Dim sep As String: sep = Application.International(xlListSeparator)
    Dim f As String
    f = "=TotalHeuresLigneSpan(" & _
        ws.Range(ws.Cells(r, FIRST_DATE_COL), ws.Cells(r, lastCol)).Address(False, False) & sep & _
        ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_START, lastCol)).Address(False, False) & sep & _
        ws.Range(ws.Cells(TECH_ROW_END, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, lastCol)).Address(False, False) & sep & _
        NAMED_LST_FERIES & ")"
    ws.Cells(r, COL_TOTAL).FormulaLocal = f
End Sub

' ===== STYLE ==============================================================

Private Sub StyleGrid(ws As Worksheet, precision As String, d0 As Date, d1 As Date, nRows As Long)
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
    If lastCol < FIRST_DATE_COL Or nRows = 0 Then Exit Sub
    
    Dim firstDataRow As Long: firstDataRow = HEADER_ROW + 3
    Dim lastDataRow As Long:  lastDataRow = firstDataRow + nRows - 1
    
    ' *** NOUVEAU : Style police Segoe UI taille 11 couleur #646464 pour toute la grille ***
    Const COLOR_TEXT As Long = &H646464  ' #646464
    
    ' Style données de base (colonnes dates)
    With ws.Range(ws.Cells(firstDataRow, FIRST_DATE_COL), ws.Cells(lastDataRow, lastCol))
        .Interior.color = COLOR_INPUT_BG
        .NumberFormat = "0"
        .HorizontalAlignment = xlCenter
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = COLOR_TEXT
    End With
    
    ' *** NOUVEAU : Style colonne compétence (centré, Segoe UI 11, #646464) ***
    With ws.Range(ws.Cells(firstDataRow, COL_COMP), ws.Cells(lastDataRow, COL_COMP))
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = COLOR_TEXT
    End With
    
    ' *** NOUVEAU : Style colonne total (centré, Segoe UI 11, #646464) ***
    With ws.Range(ws.Cells(firstDataRow, COL_TOTAL), ws.Cells(lastDataRow, COL_TOTAL))
        .NumberFormat = "0"" H"""
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = COLOR_TEXT
    End With
    
    ' Bordures grille
    ApplyGridBorders ws, lastDataRow, lastCol
    
    ' Mise en évidence de la période selon précision
    Select Case UCase$(precision)
        Case "JOUR"
            ' Coloration WE / Fériés par colonne
            ApplyWeekendHolidayColors ws, lastCol, lastDataRow
        Case "SEMAINE"
            ' Bandes alternées + séparateurs fins en fin de semaine
            ShadePeriodColumns ws, firstDataRow, lastDataRow, lastCol, True
        Case "MOIS"
            ' Bandes alternées par mois + séparateurs de fin de mois
            ShadePeriodColumns ws, firstDataRow, lastDataRow, lastCol, False
    End Select
    
    ' Merge headers (comme avant)
    MergeColumnHeaders ws
    
    ' *** NOUVEAU : Style en-têtes (Gras pour "Compétence" et "Total (h)") - APRÈS merge ***
    Dim hdrComp As Range, hdrTot As Range
    Set hdrComp = ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(HEADER_ROW + 2, COL_COMP))
    Set hdrTot = ws.Range(ws.Cells(HEADER_ROW, COL_TOTAL), ws.Cells(HEADER_ROW + 2, COL_TOTAL))
    
    ' Réappliquer le format APRÈS le merge pour s'assurer qu'il n'est pas écrasé
    With hdrComp
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = COLOR_TEXT
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    With hdrTot
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = COLOR_TEXT
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    ' *** NOUVEAU : Appliquer le format à toute la zone jusqu'à la ligne 900 (après la grille) ***
    Dim maxRow As Long: maxRow = 900
    If lastDataRow < maxRow Then
        ' Format colonne compétence jusqu'à la ligne 900
        With ws.Range(ws.Cells(lastDataRow + 1, COL_COMP), ws.Cells(maxRow, COL_COMP))
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = COLOR_TEXT
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With
        
        ' Format colonne total jusqu'à la ligne 900
        With ws.Range(ws.Cells(lastDataRow + 1, COL_TOTAL), ws.Cells(maxRow, COL_TOTAL))
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = COLOR_TEXT
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
            .NumberFormat = "0"" H"""
        End With
        
        ' Format colonnes dates jusqu'à la ligne 900
        With ws.Range(ws.Cells(lastDataRow + 1, FIRST_DATE_COL), ws.Cells(maxRow, lastCol))
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = COLOR_TEXT
            .HorizontalAlignment = xlCenter
            .Interior.color = COLOR_INPUT_BG
        End With
    End If
    
    ' Freeze panes
On Error Resume Next
    ws.Activate
    ws.Cells(firstDataRow, FIRST_DATE_COL).Select
    ActiveWindow.FreezePanes = True
On Error GoTo 0
End Sub


Private Sub ApplyGridBorders(ws As Worksheet, lastDataRow As Long, lastCol As Long)
    With ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(lastDataRow, lastCol)).Borders
        .LineStyle = xlContinuous
        .color = COLOR_GRID
        .Weight = xlThin
    End With
    ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(lastDataRow, lastCol)).BorderAround _
        LineStyle:=xlContinuous, Weight:=xlMedium, color:=COLOR_OUTLINE
End Sub

Private Sub ApplyWeekendHolidayColors(ws As Worksheet, lastCol As Long, lastDataRow As Long)
    Dim c As Long, d As Date
    For c = FIRST_DATE_COL To lastCol
        If ModuleExec.TryGetDate(ws.Cells(HEADER_ROW + 1, c).value, d) Then
            ' Utiliser ModuleCalendar pour vérifier weekend et fériés
            If ModuleCalendar.IsWeekend(d) Then
                ws.Range(ws.Cells(HEADER_ROW, c), ws.Cells(lastDataRow, c)).Interior.color = COLOR_WE_BG
            ElseIf ModuleCalendar.IsHoliday(d) Then
                ws.Range(ws.Cells(HEADER_ROW, c), ws.Cells(lastDataRow, c)).Interior.color = COLOR_FERIE_BG
            End If
        End If
    Next
    ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(HEADER_ROW + 2, lastCol)).Interior.color = COLOR_BAR_BG
End Sub

Private Sub MergeColumnHeaders(ws As Worksheet)
    Dim hdrComp As Range, hdrTot As Range
    Set hdrComp = ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(HEADER_ROW + 2, COL_COMP))
    Set hdrTot = ws.Range(ws.Cells(HEADER_ROW, COL_TOTAL), ws.Cells(HEADER_ROW + 2, COL_TOTAL))
    
    On Error Resume Next
    hdrComp.UnMerge: hdrTot.UnMerge
    On Error GoTo 0
    
    With hdrComp
        .Merge
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    With hdrTot
        .Merge
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
End Sub

' ===== FORMULE TOTAL ======================================================

Public Function TotalHeuresLigneSpan(rngValeurs As Range, rngDateStarts As Range, _
                                     rngDateEnds As Range, rngFeries As Range) As Double
    Dim i As Long, s As Double, v As Variant, d1 As Variant, d2 As Variant, wd As Long
    
    For i = 1 To rngValeurs.Columns.count
        v = rngValeurs.Cells(1, i).value
        If IsNumeric(v) And CDbl(v) <> 0 Then
            d1 = rngDateStarts.Cells(1, i).value
            d2 = rngDateEnds.Cells(1, i).value
            If IsDate(d1) And IsDate(d2) Then
                On Error Resume Next
                wd = Application.WorksheetFunction.NetworkDays_Intl(CDate(d1), CDate(d2), 1, rngFeries)
                If Err.Number <> 0 Then
                    Err.Clear
                    wd = Application.WorksheetFunction.NetworkDays_Intl(CDate(d1), CDate(d2), 1)
                End If
                On Error GoTo 0
                If wd > 0 Then s = s + (CDbl(v) * wd * 7#)
            End If
        End If
    Next
    TotalHeuresLigneSpan = s
End Function

' ===== CACHE FÉRIÉS =======================================================
' Le cache fériés est géré par ModuleCalendar
' Toutes les fonctions de calendrier utilisent ModuleCalendar :
'   - IsWeekend(d) -> ModuleCalendar
'   - IsHoliday(d) -> ModuleCalendar
'   - IsBusinessDay(d) -> ModuleCalendar
'   - BusinessDaysBetween(d0, d1) -> ModuleCalendar
'   - NextBusinessDay(d) -> ModuleCalendar

' Utilise ModuleExec.LastUsedCol (fonction centralisée)

Private Function MondayOnOrBefore(d As Date) As Date
    MondayOnOrBefore = d - ((Weekday(d, vbMonday) - 1) Mod 7)
End Function

Private Function IsoWeekNumber(d As Date) As Integer
    IsoWeekNumber = DatePart("ww", d, vbMonday, vbFirstFourDays)
End Function

Private Function IsoWeekYear(d As Date) As Integer
    Dim wn As Integer: wn = IsoWeekNumber(d)
    Dim y As Integer: y = Year(d)
    If Month(d) = 1 And wn >= 52 Then
        IsoWeekYear = y - 1
    ElseIf Month(d) = 12 And wn = 1 Then
        IsoWeekYear = y + 1
    Else
        IsoWeekYear = y
    End If
End Function

' Utilise ModuleExec.TryGetDate (fonction centralisée)

Public Sub ClearGrid(ws As Worksheet)
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW + 1)
    If lastCol < FIRST_DATE_COL Then lastCol = FIRST_DATE_COL
    
    ' *** OPTIMISATION : Étendre le clear jusqu'à la ligne 900 (de COL_COMP à lastCol) ***
    Dim maxRow As Long: maxRow = 900
    
    ' *** CORRECTION : Défusionner les cellules avant de les effacer (évite erreur 1004) ***
    On Error Resume Next
    ' Défusionner les en-têtes de colonnes (COL_COMP et COL_TOTAL)
    ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(HEADER_ROW + 2, COL_COMP)).UnMerge
    ws.Range(ws.Cells(HEADER_ROW, COL_TOTAL), ws.Cells(HEADER_ROW + 2, COL_TOTAL)).UnMerge
    ' Défusionner toutes les cellules fusionnées dans la zone à effacer (jusqu'à la ligne 900)
    Dim clearRng As Range
    Set clearRng = ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(maxRow, lastCol))
    clearRng.UnMerge
    On Error GoTo 0
    
    ' Nettoyer la zone CHARGE : colonnes COL_COMP à lastCol, lignes HEADER_ROW à maxRow (900)
    ws.Range(ws.Cells(HEADER_ROW, COL_COMP), ws.Cells(maxRow, lastCol)).Clear
    
    ' Nettoyer les lignes techniques (dates de début/fin)
    ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, lastCol)).Clear
    
    ' *** OPTIMISATION : Plus besoin de nettoyer le cache fériés, utilcalc.mdc gère tout ***
End Sub

' ============================================================
'   Détecte si une cellule appartient à la GRILLE CHARGE
' ============================================================
Public Function IsInChargeGrid(ByVal cell As Range) As Boolean
    On Error GoTo Quit

    Dim ws As Worksheet: Set ws = cell.Worksheet

    ' 1) Bornes des lignes compétences de la grille CHARGE
    Dim firstRow As Long: firstRow = HEADER_ROW + 3     ' première ligne compétence
    Dim r As Long: r = firstRow

    ' Trouver dernière ligne compétence
    Do While Len(Trim$(CStr(ws.Cells(r, COL_COMP).value))) > 0 And r < TECH_ROW_START
        r = r + 1
    Loop

    Dim lastRow As Long: lastRow = r - 1

    ' Si cellule en dehors des lignes charge ? NON
    If cell.Row < firstRow Or cell.Row > lastRow Then GoTo Quit

    ' 2) Bornes des colonnes période
    Dim lastCol As Long
    lastCol = LastUsedCol(ws, HEADER_ROW + 1)

    If cell.Column < FIRST_DATE_COL Or cell.Column > lastCol Then GoTo Quit

    ' OK ? La cellule est bien dans la zone Charge
    IsInChargeGrid = True
    Exit Function

Quit:
    IsInChargeGrid = False
End Function


Private Sub ShadePeriodColumns(ws As Worksheet, _
                               r1 As Long, r2 As Long, _
                               lastCol As Long, _
                               isWeekly As Boolean)

    Dim c As Long
    Dim curP As Long, newP As Long
    Dim pStart As Date, pEnd As Date
    Dim sepColor As Long: sepColor = RGB(180, 180, 180) ' gris clair
    Dim bg1 As Long: bg1 = RGB(245, 245, 245)
    Dim bg2 As Long: bg2 = RGB(255, 255, 255)
    Dim useAlt As Boolean: useAlt = False

    ' === Détermine la 1ère période ===
        If Not ModuleExec.TryGetDate(ws.Cells(TECH_ROW_START, FIRST_DATE_COL).value, pStart) Then Exit Sub
        If Not ModuleExec.TryGetDate(ws.Cells(TECH_ROW_END, FIRST_DATE_COL).value, pEnd) Then Exit Sub

    If isWeekly Then
        curP = IsoWeekNumber(pStart)
    Else
        curP = Month(pStart)
    End If

    ' === Boucle sur toutes les colonnes période ===
    For c = FIRST_DATE_COL To lastCol

        If Not ModuleExec.TryGetDate(ws.Cells(TECH_ROW_START, c).value, pStart) Then GoTo NextC
        If Not ModuleExec.TryGetDate(ws.Cells(TECH_ROW_END, c).value, pEnd) Then GoTo NextC

        ' Détection du numéro de période
        If isWeekly Then
            newP = IsoWeekNumber(pStart)
        Else
            newP = Month(pStart)
        End If

        ' Si changement de période ? on bascule l'alternance
        If newP <> curP Then
            useAlt = Not useAlt
            curP = newP
        End If

        ' === Coloration alternée ===
        ws.Range(ws.Cells(r1, c), ws.Cells(r2, c)).Interior.color = IIf(useAlt, bg1, bg2)

        ' === Trait vertical fin de période ===
       ' === Trait vertical fin de période ===
' Vérifie que la date FIN est bien une vraie date
If Not ModuleExec.TryGetDate(pEnd, pEnd) Then GoTo NextC

If isWeekly Then
    ' Fin de semaine = samedi
    If Weekday(pEnd, vbMonday) = 7 Then
        With ws.Cells(r1, c).Borders(xlEdgeRight)
            .LineStyle = xlContinuous
            .color = sepColor
        End With
    End If

Else
    ' Fin de mois
    If Day(pEnd) = Day(dateSerial(Year(pEnd), Month(pEnd) + 1, 0)) Then
        With ws.Cells(r1, c).Borders(xlEdgeRight)
            .LineStyle = xlContinuous
            .color = sepColor
        End With
    End If
End If

NextC:
    Next c

End Sub

' =========================================================================
'   Met à jour **toutes les formules Totaux (colonne COL_TOTAL)**
'   pour chaque ligne compétence de la grille CHARGE.
'
'   Utilise la fonction TotalHeuresLigneSpan déjà codée dans ce module.
' =========================================================================
Public Sub UpdateAllTotalFormulas(ws As Worksheet)
    Dim firstRow As Long, lastRow As Long
    Dim lastCol As Long
    Dim r As Long

    ' --- Délimitation lignes compétences ---
    firstRow = HEADER_ROW + 3
    lastRow = firstRow
    Do While Len(Trim$(CStr(ws.Cells(lastRow, COL_COMP).value))) > 0
        lastRow = lastRow + 1
    Loop
    lastRow = lastRow - 1

    If lastRow < firstRow Then Exit Sub

    ' --- Dernière colonne date ---
    lastCol = LastUsedCol(ws, HEADER_ROW + 1)
    If lastCol < FIRST_DATE_COL Then Exit Sub

    Dim rngVals As Range, rngDeb As Range, rngFin As Range, rngF As Range
    Dim tot As Double

    ' --- Fériés (Named Range) ---
    On Error Resume Next
    Set rngF = ws.Parent.Names(NAMED_LST_FERIES).RefersToRange
    On Error GoTo 0

    If rngF Is Nothing Then
        ' Si pas de liste fériés ? on laisse le paramètre vide (NetworkDays_Intl gère)
    End If

    ' --- On boucle sur chaque ligne compétence ---
    For r = firstRow To lastRow

        ' Colonnes valeurs (jours/semaine/mois)
        Set rngVals = ws.Range(ws.Cells(r, FIRST_DATE_COL), ws.Cells(r, lastCol))

        ' Colonnes TECH start / end
        Set rngDeb = ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_START, lastCol))
        Set rngFin = ws.Range(ws.Cells(TECH_ROW_END, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, lastCol))

        ' Total avec les jours ouvrés * charge * 7h
        tot = TotalHeuresLigneSpan(rngVals, rngDeb, rngFin, rngF)

        ' Écriture du total (en heures)
        ws.Cells(r, COL_TOTAL).value = tot
    Next r

End Sub

' ==============================================================================
'   AffaireExiste TURBO
'   Vérifie si AffaireID + Site existent dans tblAffaires
'   Méthode : COUNTIFS Excel via Evaluate ? ultra rapide (aucune boucle)
' ==============================================================================
Public Function AffaireExiste(affID As String, siteId As String) As Boolean
    On Error GoTo Fin

    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Affaires")
    Dim lo As ListObject: Set lo = ws.ListObjects("tblAffaires")

    Dim rngAff As Range, rngSite As Range
    Set rngAff = lo.ListColumns("AffaireID").DataBodyRange
    Set rngSite = lo.ListColumns("Site").DataBodyRange

    ' Construction de la formule COUNTIFS en mémoire
    Dim f As String
    f = "COUNTIFS(" & rngAff.Address(True, True, xlA1, True) & ",""" & affID & """," & _
                rngSite.Address(True, True, xlA1, True) & ",""" & siteId & """)"

    AffaireExiste = (Evaluate(f) > 0)

Fin:
End Function
' ============================================================
'   TRI RAPIDE D’UN TABLEAU DE LONG (DATES)
' ============================================================
Public Sub QuickSortLong(arr() As Long, first As Long, last As Long)
    If LBound(arr) < UBound(arr) Then
        QuickSortLongrec arr, LBound(arr), UBound(arr)
    End If
End Sub

Private Sub QuickSortLongrec(arr() As Long, first As Long, last As Long)
    Dim pivot As Long, i As Long, j As Long, temp As Long

    i = first
    j = last
    pivot = arr((first + last) \ 2)

    Do While i <= j

        Do While arr(i) < pivot
            i = i + 1
        Loop

        Do While arr(j) > pivot
            j = j - 1
        Loop

        If i <= j Then
            temp = arr(i)
            arr(i) = arr(j)
            arr(j) = temp
            i = i + 1
            j = j - 1
        End If

    Loop

    If first < j Then QuickSortLongrec arr, first, j
    If i < last Then QuickSortLongrec arr, i, last
End Sub

' ===================================================================
'  Retourne le prochain jour ouvré après la date d (ignore WE + fériés)
' ===================================================================
Public Function NextWorkingDay(d As Date) As Date
    ' *** OPTIMISATION : Utiliser utilcalc.mdc pour calculer le prochain jour ouvré ***
    NextWorkingDay = ModuleCalendar.NextBusinessDay(d)
End Function




Public Sub Charge_OnSlicerChanged()
    Debug.Print "[Charge_OnSlicerChanged] START"

    ' Nom objet EXACT de ta feuille
    Feuil12.OnSlicerOrPivotChange "RUN"

    Debug.Print "[Charge_OnSlicerChanged] END"
End Sub


' Toutes les fonctions de calendrier sont dans ModuleCalendar
' Plus besoin de fonctions locales :
'   - EstJourOuvre -> IsBusinessDay (ModuleCalendar)
'   - NextWorkingDayFast -> NextBusinessDay (ModuleCalendar)
'   - CompterJoursOuvres -> BusinessDaysBetween (ModuleCalendar)
'   - EstJourOuvreFast -> IsBusinessDay (ModuleCalendar)
'   - BuildFeriesDictionary -> Le cache est géré par ModuleCalendar via qry_CalOuvres

' Utilise ModuleExec.BeginFastExec et ModuleExec.EndFastExec (déjà importé implicitement)





