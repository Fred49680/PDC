
' ===========================
'   MODULE AFFECTATION - VERSION OPTIMISÉE
'   Utilise ModuleCalendar pour toutes les opérations calendrier
' ===========================
Option Explicit

' ==== TYPE PERSONNALISÉ ===================================================
Private Type RessourceInfo
    nom As String
    EstPrincipale As Boolean
    siteOrigine As String
End Type

Private RessourceSiteHints As Object
Private mAffectationComments As Object  ' Dictionnaire pour tracker les cellules avec commentaires

' ==== CONFIG (FEUILLE / CELLULES / TABLES) ================================
Private Const SHEET_CHARGE          As String = "Charge"
Private Const CELL_SITE             As String = "B6"
Private Const CELL_DATE_DEB         As String = "B10"
Private Const CELL_DATE_FIN         As String = "B11"
Private Const CELL_PRECISION        As String = "B15"

Private Const TBL_RESSOURCES        As String = "tblRessources"
Private Const TBL_AFFECTATIONS      As String = "TblAffectations"

' ==== GRILLE CHARGE (EN-TÊTES & POSITION) ==============================
Private Const HEADER_ROW_CHARGE     As Long = 3
Private Const FIRST_DATE_COL        As Long = 5
Private Const SPACING_AFTER_CHARGE  As Long = 2
Private Const COL_COMP              As Long = 3
Private Const TECH_ROW_START        As Long = 1000
Private Const TECH_ROW_END          As Long = 1001

' ==== COULEURS ============================================================
Private Const COLOR_HEADER      As Long = &H4472C4
Private Const COLOR_HEADER_TEXT As Long = &HFFFFFF
Private Const COLOR_BLOC_TITRE  As Long = &HDDEBF7
Private Const COLOR_BESOIN      As Long = &HFFF2CC
Private Const COLOR_AFFECTE     As Long = &HD9E1F2
Private Const COLOR_WE_BG       As Long = &HC4D9DD
Private Const COLOR_FERIE_BG    As Long = &HE6E6FF
Private Const COLOR_GRID        As Long = &HBFBFBF
Private Const COLOR_OUTLINE     As Long = &H7F7F7F

' -------------------------------------------------------------------------
' CENTRALISATION DES ACCÈS
' -------------------------------------------------------------------------
Private Function GetChargeSheet() As Worksheet
    On Error Resume Next
    Set GetChargeSheet = ThisWorkbook.Worksheets(SHEET_CHARGE)
End Function

Public Function GetAffectationsTable() As ListObject
    Set GetAffectationsTable = ModuleExec.GetAffectationsTable()
End Function

Private Function GetRessourcesTable() As ListObject
    Set GetRessourcesTable = ModuleExec.GetRessourcesTable()
End Function
' ==== WRAPPERS CALENDRIER (UTILCALC) =====================================
' Utilise ModuleCalendar pour toutes les fonctions calendrier

Private Function Cal_IsWeekend(d As Date) As Boolean
    Cal_IsWeekend = ModuleCalendar.IsWeekend(d)
End Function

Private Function Cal_IsHoliday(d As Date) As Boolean
    Cal_IsHoliday = ModuleCalendar.IsHoliday(d)
End Function

Private Function Cal_IsBusiness(d As Date) As Boolean
    Cal_IsBusiness = ModuleCalendar.isBusinessDay(d)
End Function

' Calcul du nombre de jours ouvrés entre deux dates
' Note: Le nom de la fonction locale est Cal_BusinessDaysBetween pour éviter le conflit
Private Function Cal_BusinessDaysBetween(dStart As Date, dEnd As Date) As Long
    Cal_BusinessDaysBetween = ModuleCalendar.BusinessDaysBetween(dStart, dEnd)
End Function

' Obtenir le prochain jour ouvré
Private Function Cal_NextBusinessDay(d As Date) As Date
    Cal_NextBusinessDay = ModuleCalendar.NextBusinessDay(d)
End Function

Private Function IsMultiSiteCompetence(ByVal comp As String) As Boolean
    Dim normalized As String
    normalized = UCase$(Trim$(comp))
    If normalized = "IES" Or normalized = "INSTRUM" Then
        IsMultiSiteCompetence = True
    End If
End Function

Private Sub EnsureRessourceSiteDict()
    If RessourceSiteHints Is Nothing Then
        Set RessourceSiteHints = CreateObject("Scripting.Dictionary")
        RessourceSiteHints.CompareMode = vbTextCompare
    End If
End Sub

Private Sub RememberRessourceSiteHint(ByVal nom As String, ByVal siteOrigine As String)
    nom = NormalizeRessourceLabel(nom)
    siteOrigine = Trim$(siteOrigine)
    If Len(nom) = 0 Or Len(siteOrigine) = 0 Then Exit Sub
    EnsureRessourceSiteDict
    RessourceSiteHints(nom) = siteOrigine
End Sub

Private Function GetRessourceSiteHint(ByVal nom As String) As String
    nom = NormalizeRessourceLabel(nom)
    If Len(nom) = 0 Then Exit Function
    If RessourceSiteHints Is Nothing Then Exit Function
    If RessourceSiteHints.Exists(nom) Then
        GetRessourceSiteHint = CStr(RessourceSiteHints(nom))
    End If
End Function

Private Sub GetSiteFromSheet(ws As Worksheet, ByRef siteVal As String)
    siteVal = Trim$(CStr(ws.Range(CELL_SITE).value))
End Sub

Private Function ReadSite(ws As Worksheet) As String
    ReadSite = Trim$(CStr(ws.Range(CELL_SITE).value))
End Function

' -------------------------------------------------------------------------
' VALIDATION CONSOLIDÉE
' -------------------------------------------------------------------------
Private Function ValidateSheetData(ws As Worksheet, ByRef d0 As Date, ByRef d1 As Date, _
                                   ByRef precision As String, Optional requireDaily As Boolean = False) As Boolean
    Dim siteVal As String
    GetSiteFromSheet ws, siteVal
    If Len(siteVal) = 0 Then
        MsgBox "Site (B6) est vide.", vbExclamation
        Exit Function
    End If

    If Not ModuleExec.TryGetDate(ws.Range(CELL_DATE_DEB).value, d0) Or _
       Not ModuleExec.TryGetDate(ws.Range(CELL_DATE_FIN).value, d1) Then
        MsgBox "Dates invalides (B10/B11).", vbExclamation
        Exit Function
    End If

    If d1 < d0 Then
        MsgBox "La date de fin est avant la date de début.", vbExclamation
        Exit Function
    End If

    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"
    If InStr("JOUR|SEMAINE|MOIS", precision) = 0 Then precision = "JOUR"

    If ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1) < FIRST_DATE_COL Then
        MsgBox "Aucune grille CHARGE détectée. Saisis d'abord la charge.", vbInformation
        Exit Function
    End If

    ValidateSheetData = True
End Function

' -------------------------------------------------------------------------
' GRILLE CHARGE - UTILITAIRES
' -------------------------------------------------------------------------
Public Function FindEndOfChargeGrid(ws As Worksheet) As Long
    Dim r As Long: r = HEADER_ROW_CHARGE + 3
    Do While Len(Trim$(CStr(ws.Cells(r, 3).value))) > 0 And r <= 500
        r = r + 1
    Loop
    FindEndOfChargeGrid = r - 1
End Function

Private Function HasBesoinBoost(ws As Worksheet, rComp As Long) As Boolean
    Dim lastCol As Long
    lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    If lastCol < FIRST_DATE_COL Then Exit Function

    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"

    Dim arr As Variant
    arr = ws.Range(ws.Cells(rComp, FIRST_DATE_COL), ws.Cells(rComp, lastCol)).value

    Dim i As Long, v As Double
    For i = 1 To UBound(arr, 2)
        v = val(arr(1, i))
        If v > 0 Then HasBesoinBoost = True: Exit Function
    Next i
End Function

Public Function GetActiveCompetences(ws As Worksheet) As String()
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = vbTextCompare

    Dim rComp As Long: rComp = HEADER_ROW_CHARGE + 3
    Dim comp As String

    Do While Len(Trim$(CStr(ws.Cells(rComp, COL_COMP).value))) > 0
        comp = Trim$(CStr(ws.Cells(rComp, COL_COMP).value))
        If HasBesoinBoost(ws, rComp) Then dict(comp) = True
        rComp = rComp + 1
    Loop

    Dim result() As String
    If dict.count = 0 Then
        ReDim result(0 To -1)
    Else
        ReDim result(0 To dict.count - 1)
        Dim i As Long
        For i = 0 To dict.count - 1
            result(i) = dict.keys()(i)
        Next i
    End If

    GetActiveCompetences = result
End Function

' -------------------------------------------------------------------------
' CONSTRUCTION DES BLOCS COMPÉTENCE
' -------------------------------------------------------------------------
Public Sub BuildCompetenceBlocks(ws As Worksheet, comps() As String, startRow As Long)
    Set RessourceSiteHints = Nothing
    Dim currentRow As Long: currentRow = startRow
    Dim lastRowAllowed As Long: lastRowAllowed = TECH_ROW_START - 1
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)

    If currentRow > lastRowAllowed Then Exit Sub

    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.Calculation = xlCalculationManual

    ' Titre général
    With ws.Range(ws.Cells(currentRow, 3), ws.Cells(currentRow, lastCol))
        .Clear
        .Merge
        .value = "--- AFFECTATION DES RESSOURCES ---"
        .Font.name = "Segoe UI"
        .Font.Size = 12
        .Font.Bold = True
        .Interior.color = COLOR_HEADER
        .Font.color = COLOR_HEADER_TEXT
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With

    currentRow = currentRow + 2

    ' Lecture vectorisée
    Dim besoinArr As Variant
    besoinArr = ws.Range(ws.Cells(HEADER_ROW_CHARGE + 3, FIRST_DATE_COL), _
                         ws.Cells(FindEndOfChargeGrid(ws), lastCol)).value

    Dim arrStart As Variant, arrEnd As Variant
    arrStart = ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), _
                        ws.Cells(TECH_ROW_START, lastCol)).value
    arrEnd = ws.Range(ws.Cells(TECH_ROW_END, FIRST_DATE_COL), _
                      ws.Cells(TECH_ROW_END, lastCol)).value

    Dim i As Long, NextRow As Long

    For i = 0 To UBound(comps)
        If currentRow + 10 > lastRowAllowed Then Exit For

        NextRow = BuildOneCompetenceBlockOptimized(ws, comps(i), currentRow, _
                                                   lastCol, besoinArr, arrStart, arrEnd)

        If NextRow <= 0 Or NextRow > lastRowAllowed Then Exit For
        currentRow = NextRow + 2
    Next i

    Application.Calculation = xlCalculationAutomatic
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

Private Function BuildOneCompetenceBlockOptimized(ws As Worksheet, comp As String, _
                                                 startRow As Long, lastCol As Long, _
                                                 besoinArr As Variant, _
                                                 arrStart As Variant, arrEnd As Variant) As Long
    
    Dim colorBand As Long
    colorBand = Choose((Asc(UCase$(Left$(comp, 1))) Mod 6) + 1, _
                       &HDDEBF7, &HE2EFDA, &HFFF2CC, &HFCE4D6, &HD9E1F2, &HF8CBAD)

    ' Titre du bloc
    With ws.Range(ws.Cells(startRow, 3), ws.Cells(startRow, lastCol))
        .Merge
        .value = comp
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = &H646464  ' #646464
        .Font.Bold = True
        .Interior.color = colorBand
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .IndentLevel = 1
        .BorderAround xlContinuous, xlMedium, COLOR_OUTLINE
    End With

    ' Besoin
    ws.Cells(startRow + 1, 3).value = "Besoin"
    With ws.Cells(startRow + 1, 3)
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = &H646464  ' #646464
        .Font.Italic = True
        .Font.Bold = True
        .Interior.color = COLOR_BESOIN
    End With
    ws.Cells(startRow + 1, 4).Interior.color = COLOR_BESOIN
    
    ImportBesoinFromChargeOptimized ws, comp, startRow + 1, lastCol, besoinArr

    ' Affecté
    ws.Cells(startRow + 2, 3).value = "Affecté"
    With ws.Cells(startRow + 2, 3)
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = &H646464  ' #646464
        .Font.Bold = True
        .Interior.color = COLOR_AFFECTE
    End With
    ws.Cells(startRow + 2, 4).Interior.color = COLOR_AFFECTE

    ' Ressources
    Dim ressources() As RessourceInfo
    ressources = GetRessourcesBySiteComp(ReadSite(ws), comp)

    Dim r As Long: r = startRow + 3
    
    ' Vérifier si le tableau contient des ressources (gestion du tableau vide)
    Dim hasRessources As Boolean
    hasRessources = False
    On Error Resume Next
    Dim testUBound As Long
    testUBound = UBound(ressources)
    If Err.Number = 0 And testUBound >= 0 Then
        hasRessources = True
    End If
    Err.Clear
    On Error GoTo 0
    
    If hasRessources Then
        Dim nomArr() As Variant, typeArr() As Variant
        ReDim nomArr(1 To UBound(ressources) + 1, 1 To 1)
        ReDim typeArr(1 To UBound(ressources) + 1, 1 To 1)
        
        Dim i As Long
        For i = 0 To UBound(ressources)
            nomArr(i + 1, 1) = ressources(i).nom
            typeArr(i + 1, 1) = IIf(ressources(i).EstPrincipale, "P", "S")
            If Len(ressources(i).siteOrigine) > 0 Then
                RememberRessourceSiteHint ressources(i).nom, ressources(i).siteOrigine
            End If
        Next i
        
        ws.Range(ws.Cells(r, 3), ws.Cells(r + UBound(ressources), 3)).value = nomArr
        ws.Range(ws.Cells(r, 4), ws.Cells(r + UBound(ressources), 4)).value = typeArr
        
        With ws.Range(ws.Cells(r, 3), ws.Cells(r + UBound(ressources), lastCol))
            .Interior.color = colorBand
            .HorizontalAlignment = xlCenter
            ' Police Segoe UI taille 11 couleur #646464
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = &H646464  ' #646464
        End With
        
        For i = 0 To UBound(ressources)
            ws.Cells(r + i, 4).Font.color = IIf(ressources(i).EstPrincipale, &HFF, &H808080)
        Next i
        
        r = r + UBound(ressources) + 1
    End If

    PutAffecteFormulas ws, startRow + 2, lastCol
    StyleCompetenceBlockOptimized ws, startRow, r - 1, lastCol, arrStart, arrEnd

    BuildOneCompetenceBlockOptimized = r - 1
End Function

Private Sub ImportBesoinFromChargeOptimized(ws As Worksheet, comp As String, _
                                           targetRow As Long, lastCol As Long, _
                                           besoinArr As Variant)
    Dim r As Long
    For r = 1 To UBound(besoinArr, 1)
        If Trim$(CStr(ws.Cells(HEADER_ROW_CHARGE + 2 + r, 3).value)) = comp Then
            
            Dim valArr() As Variant
            ReDim valArr(1 To 1, 1 To UBound(besoinArr, 2))
            
            Dim c As Long
            For c = 1 To UBound(besoinArr, 2)
                valArr(1, c) = besoinArr(r, c)
            Next c
            
            ws.Range(ws.Cells(targetRow, FIRST_DATE_COL), _
                     ws.Cells(targetRow, lastCol)).value = valArr
            
            With ws.Range(ws.Cells(targetRow, FIRST_DATE_COL), ws.Cells(targetRow, lastCol))
                .Interior.color = COLOR_BESOIN
                .Font.name = "Segoe UI"
                .Font.Size = 11
                .Font.color = &H646464  ' #646464
                .Font.Bold = True
                .HorizontalAlignment = xlCenter
            End With
            
            Exit Sub
        End If
    Next r
End Sub

Private Sub PutAffecteFormulas(ws As Worksheet, targetRow As Long, lastCol As Long)
    Dim firstRes As Long, lastRes As Long, c As Long
    
    firstRes = targetRow + 1
    lastRes = firstRes
    
    Do While lastRes < ws.Rows.count
        If Len(Trim$(CStr(ws.Cells(lastRes + 1, COL_COMP).value))) = 0 Then Exit Do
        If ws.Cells(lastRes + 1, COL_COMP).Font.Bold Then Exit Do
        lastRes = lastRes + 1
    Loop

    Dim addr As String
    For c = FIRST_DATE_COL To lastCol
        addr = ws.Range(ws.Cells(firstRes, c), ws.Cells(lastRes, c)).Address(False, False)
        ws.Cells(targetRow, c).Formula = "=SUM(" & addr & ")"
    Next c

    With ws.Range(ws.Cells(targetRow, FIRST_DATE_COL), ws.Cells(targetRow, lastCol))
        .Interior.color = COLOR_AFFECTE
        .Font.name = "Segoe UI"
        .Font.Size = 11
        .Font.color = &H646464  ' #646464
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
    End With
End Sub

' -------------------------------------------------------------------------
' STYLE
' -------------------------------------------------------------------------
Private Sub StyleCompetenceBlockOptimized(ws As Worksheet, startRow As Long, _
                                         endRow As Long, lastCol As Long, _
                                         arrStart As Variant, arrEnd As Variant)
    ' Appliquer police Segoe UI taille 11 couleur #646464 à toute la zone
    Dim firstResourceRow As Long: firstResourceRow = startRow + 3  ' Après titre, Besoin, Affecté
    
    ' Style pour les colonnes de dates (lignes de ressources uniquement)
    If firstResourceRow <= endRow Then
        With ws.Range(ws.Cells(firstResourceRow, FIRST_DATE_COL), ws.Cells(endRow, lastCol))
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = &H646464  ' #646464
        End With
    End If
    
    ' Style pour la colonne compétence (lignes de ressources uniquement) - centré
    If firstResourceRow <= endRow Then
        With ws.Range(ws.Cells(firstResourceRow, COL_COMP), ws.Cells(endRow, COL_COMP))
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
            .Font.name = "Segoe UI"
            .Font.Size = 11
            .Font.color = &H646464  ' #646464
        End With
    End If
    
    With ws.Range(ws.Cells(startRow, 3), ws.Cells(endRow, lastCol))
        .Borders.LineStyle = xlContinuous
        .Borders.color = COLOR_GRID
        .Borders.Weight = xlThin
    End With
    
    ws.Range(ws.Cells(startRow, 3), ws.Cells(endRow, lastCol)).BorderAround _
        LineStyle:=xlContinuous, Weight:=xlMedium, color:=COLOR_OUTLINE

    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    
    ' Coloration week-ends et fériés (uniquement sur les lignes de ressources)
    If precision = "JOUR" Then
        Dim c As Long, d As Date
        
        ' Calculer les lignes de ressources (après l'en-tête, Besoin et Affecté)
        firstResourceRow = startRow + 3  ' Après titre, Besoin, Affecté
        
        ' Parcourir toutes les colonnes de dates
        For c = FIRST_DATE_COL To lastCol
            ' Utiliser la même méthode que la grille de charge : lire depuis TECH_ROW_START
            Dim dateVal As Variant
            dateVal = ws.Cells(TECH_ROW_START, c).value
            
            If ModuleExec.TryGetDate(dateVal, d) Then
                ' Utiliser ModuleCalendar pour vérifier weekend et fériés
                If Cal_IsWeekend(d) Then
                    ' Coloration weekend : appliquer uniquement sur les lignes de ressources (pas sur les en-têtes)
                    If firstResourceRow <= endRow Then
                        ws.Range(ws.Cells(firstResourceRow, c), ws.Cells(endRow, c)).Interior.color = COLOR_WE_BG
                    End If
                ElseIf Cal_IsHoliday(d) Then
                    ' Coloration férié : appliquer uniquement sur les lignes de ressources (pas sur les en-têtes)
                    If firstResourceRow <= endRow Then
                        ws.Range(ws.Cells(firstResourceRow, c), ws.Cells(endRow, c)).Interior.color = COLOR_FERIE_BG
                    End If
                End If
            End If
        Next c
        
        ' Assurer les couleurs de base pour les lignes Besoin et Affecté
        ' (elles gardent leur couleur spécifique, pas affectée par week-ends/fériés)
        Dim c2 As Long
        For c2 = FIRST_DATE_COL To lastCol
            dateVal = ws.Cells(TECH_ROW_START, c2).value
            If ModuleExec.TryGetDate(dateVal, d) Then
                ' Les lignes Besoin et Affecté gardent leur couleur spécifique
                ws.Cells(startRow + 1, c2).Interior.color = COLOR_BESOIN
                ws.Cells(startRow + 2, c2).Interior.color = COLOR_AFFECTE
            End If
        Next c2
    End If
End Sub

' -------------------------------------------------------------------------
' RESSOURCES
' -------------------------------------------------------------------------
Private Function GetRessourcesBySiteComp(siteVal As String, comp As String) As RessourceInfo()
    Dim result() As RessourceInfo
    Dim n As Long: n = -1
    ReDim result(0 To 0)

    ' Utiliser directement tblRessourcesComp (table principale)
    Dim lo As ListObject: Set lo = ModuleExec.GetRessourcesCompTable()
    If Not lo Is Nothing And Not lo.DataBodyRange Is Nothing Then
        ' Utiliser tblRessourcesComp (table dépliée) - source principale
        Dim cSiteComp As Long, cNomComp As Long, cCompCol As Long, cTypeComp As Long
        cSiteComp = FindTableColumnIndex(lo, "Site")
        cNomComp = FindTableColumnIndex(lo, "NomPrenom")
        cCompCol = FindTableColumnIndex(lo, "Comp")
        cTypeComp = FindTableColumnIndex(lo, "Type_Comp")
        
        If cSiteComp > 0 And cNomComp > 0 And cCompCol > 0 Then
            ' Utilise tableau en mémoire
            Dim dataArr As Variant
            On Error Resume Next
            dataArr = lo.DataBodyRange.value
            If Err.Number <> 0 Then
                Err.Clear
                On Error GoTo 0
                GoTo Fallback
            End If
            On Error GoTo 0
            
            Dim valComp As String, valTypeComp As String
            siteVal = Trim$(siteVal)
            comp = Trim$(comp)
            Dim isMultiSite As Boolean
            isMultiSite = IsMultiSiteCompetence(comp)
            
            ' Utiliser un dictionnaire pour éviter les doublons
            Dim dictRessources As Object
            Dim dictSites As Object
            Set dictRessources = CreateObject("Scripting.Dictionary")
            dictRessources.CompareMode = vbTextCompare
            Set dictSites = CreateObject("Scripting.Dictionary")
            dictSites.CompareMode = vbTextCompare
            
            Dim i As Long
            For i = LBound(dataArr, 1) To UBound(dataArr, 1)
                ' Filtrer par Comp + Site (site ignoré si compétence multi-site)
                If Trim$(CStr(dataArr(i, cCompCol))) = comp Then
                    If isMultiSite Or Trim$(CStr(dataArr(i, cSiteComp))) = siteVal Then
                    
                        ' Récupérer le nom et le type (P = principale, S = secondaire)
                        Dim nomRes As String
                        nomRes = Trim$(CStr(dataArr(i, cNomComp)))

                        If Len(nomRes) > 0 Then
                            ' Vérifier si c'est une ressource principale (Type_Comp = "P")
                            Dim isPrincipale As Boolean
                            isPrincipale = False

                            If cTypeComp > 0 And UBound(dataArr, 2) >= cTypeComp Then
                                valTypeComp = Trim$(UCase$(CStr(dataArr(i, cTypeComp))))
                                isPrincipale = (valTypeComp = "P")
                            End If

                            ' Ajouter à la liste si pas déjà présente
                            If Not dictRessources.Exists(nomRes) Then
                                dictRessources.Add nomRes, isPrincipale
                                dictSites.Add nomRes, Trim$(CStr(dataArr(i, cSiteComp)))
                            End If
                        End If
                    End If
                End If
            Next i
            
            ' *** NOUVEAU : Ajouter les ressources en prêt (transferts actifs) vers le site sélectionné ***
            On Error Resume Next
            Dim loTransferts As ListObject
            Set loTransferts = ModuleTransfert.GetTransfertsTable()
            
            If Not loTransferts Is Nothing And Not loTransferts.DataBodyRange Is Nothing Then
                ' Charger les données de transferts
                Dim transfertsArr As Variant
                transfertsArr = loTransferts.DataBodyRange.value
                
                If Err.Number = 0 And Not IsEmpty(transfertsArr) Then
                    ' Vérifier que c'est un tableau à 2 dimensions
                    Dim testDim As Long
                    testDim = UBound(transfertsArr, 2)
                    
                    If Err.Number = 0 Then
                        ' Trouver les colonnes
                        Dim cResTransf As Long, cSiteOrigTransf As Long, cSiteDestTransf As Long, cDateDebTransf As Long, cDateFinTransf As Long, cStatutTransf As Long
                        cResTransf = FindTableColumnIndex(loTransferts, "Ressource")
                        cSiteOrigTransf = FindTableColumnIndex(loTransferts, "SiteOrigine")
                        cSiteDestTransf = FindTableColumnIndex(loTransferts, "SiteDestination")
                        cDateDebTransf = FindTableColumnIndex(loTransferts, "DateDébut")
                        cDateFinTransf = FindTableColumnIndex(loTransferts, "DateFin")
                        cStatutTransf = FindTableColumnIndex(loTransferts, "Statut")
                        
                        If cResTransf > 0 And cSiteDestTransf > 0 And cStatutTransf > 0 Then
                            Dim j As Long
                            For j = LBound(transfertsArr, 1) To UBound(transfertsArr, 1)
                                ' Vérifier si c'est un transfert actif vers le site sélectionné
                                Dim statutTransf As String
                                statutTransf = Trim$(UCase$(CStr(transfertsArr(j, cStatutTransf))))
                                
                                If Err.Number = 0 And (statutTransf = "APPLIQUE" Or statutTransf = "APPLIQUÉ") Then
                                    Dim siteDestTransf As String
                                    siteDestTransf = Trim$(CStr(transfertsArr(j, cSiteDestTransf)))
                                    
                                    If Err.Number = 0 And siteDestTransf = siteVal Then
                                        Dim ressourceTransf As String, siteOrigTransf As String
                                        ressourceTransf = Trim$(CStr(transfertsArr(j, cResTransf)))
                                        
                                        If Err.Number = 0 And Len(ressourceTransf) > 0 Then
                                            ' Récupérer le site d'origine si disponible
                                            If cSiteOrigTransf > 0 And UBound(transfertsArr, 2) >= cSiteOrigTransf Then
                                                siteOrigTransf = Trim$(CStr(transfertsArr(j, cSiteOrigTransf)))
                                                If Err.Number <> 0 Then siteOrigTransf = ""
                                            End If
                                            
                                            ' Vérifier si la ressource a la compétence demandée dans tblRessourcesComp
                                            ' Chercher dans tblRessourcesComp avec le site d'origine
                                            If Len(siteOrigTransf) > 0 Then
                                                Dim k As Long
                                                For k = LBound(dataArr, 1) To UBound(dataArr, 1)
                                                    ' Filtrer par Site d'origine ET Comp ET Nom
                                                    If Trim$(CStr(dataArr(k, cSiteComp))) = siteOrigTransf And _
                                                       Trim$(CStr(dataArr(k, cCompCol))) = comp And _
                                                       Trim$(CStr(dataArr(k, cNomComp))) = ressourceTransf Then
                                                        ' Vérifier si c'est une compétence principale
                                                        isPrincipale = False
                                                        If cTypeComp > 0 And UBound(dataArr, 2) >= cTypeComp Then
                                                            valTypeComp = Trim$(UCase$(CStr(dataArr(k, cTypeComp))))
                                                            isPrincipale = (valTypeComp = "P")
                                                        End If
                                                        
                                                        ' Ajouter à la liste si pas déjà présente
                                                        If Not dictRessources.Exists(ressourceTransf) Then
                                                            dictRessources.Add ressourceTransf, isPrincipale
                                                            dictSites.Add ressourceTransf, siteOrigTransf
                                                        End If
                                                        Exit For
                                                    End If
                                                Next k
                                            End If
                                        End If
                                    End If
                                End If
                                
                                ' Réinitialiser Err pour la prochaine itération
                                Err.Clear
                            Next j
                        End If
                    End If
                End If
            End If
            Err.Clear
            On Error GoTo 0
            
            ' Convertir le dictionnaire en tableau de résultat
            If dictRessources.count > 0 Then
                ReDim result(0 To dictRessources.count - 1)
                n = -1
                Dim resKey As Variant
                For Each resKey In dictRessources.keys
                    n = n + 1
                    result(n).nom = CStr(resKey)
                    result(n).EstPrincipale = CBool(dictRessources(resKey))
                    If dictSites.Exists(resKey) Then
                        result(n).siteOrigine = CStr(dictSites(resKey))
                    End If
                Next resKey
            Else
                ' Aucune ressource trouvée, retourner un tableau vide
                ReDim result(0 To -1)
            End If
            
            GetRessourcesBySiteComp = result
            Exit Function
        End If
    End If

Fallback:
    ' Fallback 1: feuille "RessourcesParComp" (si disponible)
    Dim sh As Worksheet
    On Error Resume Next
    Set sh = ThisWorkbook.Worksheets("RessourcesParComp")
    On Error GoTo 0
    
    If Not sh Is Nothing Then
        Dim colIndex As Long: colIndex = FindColumnIndexByHeader(sh, comp, 1)
        If colIndex > 0 Then
            Dim lastRow As Long: lastRow = sh.Cells(sh.Rows.count, colIndex).End(xlUp).Row
            Dim r As Long, raw As String, nom As String, isPrin As Boolean
            
            For r = 2 To lastRow
                raw = CStr(sh.Cells(r, colIndex).value)
                If Len(Trim$(raw)) = 0 Then GoTo NextR
                ParseNomEtType raw, nom, isPrin
                If Len(nom) > 0 Then
                    n = n + 1: ReDim Preserve result(0 To n)
                    result(n).nom = nom
                    result(n).EstPrincipale = isPrin
                End If
NextR:
            Next r
            
            If n >= 0 Then
                GetRessourcesBySiteComp = result
                Exit Function
            End If
        End If
    End If

    ' Fallback 2: table tblRessources originale (pour compatibilité)
    Dim lo2 As ListObject: Set lo2 = GetRessourcesTable()
    If Not lo2 Is Nothing And Not lo2.DataBodyRange Is Nothing Then
        Dim cSite As Long, cNom As Long, cComp As Long
        cSite = FindTableColumnIndex(lo2, "Site")
        cNom = FindTableColumnIndex(lo2, "NomPrenom")
        cComp = FindTableColumnIndex(lo2, comp)
        
        If cSite > 0 And cNom > 0 And cComp > 0 Then
            Dim dataArr2 As Variant
            On Error Resume Next
            dataArr2 = lo2.DataBodyRange.value
            If Err.Number <> 0 Then
                Err.Clear
                On Error GoTo 0
                GetRessourcesBySiteComp = result
                Exit Function
            End If
            On Error GoTo 0
            
            Dim i2 As Long, valComp2 As String
            siteVal = Trim$(siteVal)
            
            For i2 = LBound(dataArr2, 1) To UBound(dataArr2, 1)
                If Trim$(CStr(dataArr2(i2, cSite))) = siteVal Then
                    valComp2 = Trim$(UCase$(CStr(dataArr2(i2, cComp))))
                    If Len(valComp2) > 0 Then
                        n = n + 1: ReDim Preserve result(0 To n)
                        result(n).nom = Trim$(CStr(dataArr2(i2, cNom)))
                        result(n).EstPrincipale = (valComp2 = "P")
                        result(n).siteOrigine = Trim$(CStr(dataArr2(i2, cSite)))
                    End If
                End If
            Next i2
        End If
    End If

    If HasRessourceEntries(result) Then
        For i = LBound(result) To UBound(result)
            If Len(result(i).siteOrigine) = 0 Then
                result(i).siteOrigine = GetResourceSite(result(i).nom)
            End If
        Next i
    End If

    GetRessourcesBySiteComp = result
End Function

Private Sub ParseNomEtType(ByVal raw As String, ByRef nom As String, ByRef isPrin As Boolean)
    Dim s As String: s = Trim$(CStr(raw))
    isPrin = (InStr(s, "?") > 0) _
          Or (InStr(1, s, "|P", vbTextCompare) > 0) _
          Or (InStr(1, s, "(P)", vbTextCompare) > 0)

    s = Replace(s, "?", "")
    s = Replace(s, "|P", "", , , vbTextCompare)
    s = Replace(s, "|S", "", , , vbTextCompare)
    s = Replace(s, "(P)", "", , , vbTextCompare)
    s = Replace(s, "(S)", "", , , vbTextCompare)

    nom = Trim$(s)
End Sub

Private Function NormalizeRessourceLabel(ByVal label As String) As String
    Dim cleaned As String
    cleaned = Trim$(CStr(label))
    If Len(cleaned) = 0 Then Exit Function

    If Right$(cleaned, 1) = ")" Then
        Dim posOpen As Long
        posOpen = InStrRev(cleaned, "(")
        If posOpen > 1 And posOpen < Len(cleaned) Then
            If Mid$(cleaned, posOpen - 1, 1) = " " Then
                cleaned = Trim$(Left$(cleaned, posOpen - 1))
            End If
        End If
    End If

    NormalizeRessourceLabel = cleaned
End Function

Public Function GetResourceSite(ressource As String) As String
    ressource = NormalizeRessourceLabel(ressource)
    Dim lo As ListObject: Set lo = ModuleExec.GetRessourcesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function

    Dim cNom As Long, cSite As Long
    cNom = FindTableColumnIndex(lo, "NomPrenom")
    cSite = FindTableColumnIndex(lo, "Site")
    If cNom = 0 Or cSite = 0 Then Exit Function

    Dim dataArr As Variant
    On Error Resume Next
    dataArr = lo.DataBodyRange.value
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    On Error GoTo 0

    Dim i As Long, resName As String
    ressource = Trim$(ressource)
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        resName = Trim$(CStr(dataArr(i, cNom)))
        If StrComp(resName, ressource, vbTextCompare) = 0 Then
            GetResourceSite = Trim$(CStr(dataArr(i, cSite)))
            Exit Function
        End If
    Next i
End Function

Private Function HasRessourceEntries(arr() As RessourceInfo) As Boolean
    On Error Resume Next
    Dim lb As Long, ub As Long
    lb = LBound(arr)
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    ub = UBound(arr)
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    HasRessourceEntries = (ub >= lb)
    On Error GoTo 0
End Function

' -------------------------------------------------------------------------
' ENREGISTREMENT AFFECTATIONS
' -------------------------------------------------------------------------
Public Sub EnregistrerUneAffectation(affaireID As String, siteVal As String, _
                                     ressource As String, comp As String, _
                                     d As Date, db As Date, valeur As Double)

    ModuleExec.BeginFastExec
    On Error GoTo CleanExit

    ' *** NOUVEAU : Ouvrir le fichier DONNEES en mode lecture/ecriture si necessaire ***
    Dim wbDonnees As Workbook
    Dim needToSave As Boolean: needToSave = False
    Set wbDonnees = ModuleExec.GetFichierDonneesReadWrite()
    If Not wbDonnees Is Nothing Then
        needToSave = True
        Debug.Print "[EnregistrerUneAffectation] Fichier DONNEES ouvert en mode lecture/ecriture"
    End If

    Dim lo As ListObject: Set lo = GetAffectationsTable()
    If lo Is Nothing Then GoTo CleanExit

    Dim ws As Worksheet
    Set ws = GetChargeSheet()
    If ws Is Nothing Then GoTo CleanExit

    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"

    Dim d0 As Date, d1 As Date
    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    Dim c As Long

    Select Case precision
        Case "JOUR"
            d0 = d: d1 = d

        Case "SEMAINE", "MOIS"
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

    If valeur <> 0 Then
        EnsureTransferForAffectation ressource, comp, siteVal, d0, d1
    End If

    ' Si suppression (valeur = 0), supprimer TOUTES les affectations qui chevauchent
    If valeur = 0 Then
        DeleteAffectationsOverlappingPeriod lo, affaireID, siteVal, ressource, comp, d0, d1
        ModuleExec.InvalidateListObjectCache "TblAffectations"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneAffectation] Fichier DONNEES sauvegarde apres suppression"
        End If
        GoTo CleanExit
    End If

    Dim lr As ListRow
    Set lr = FindAffectationRow(lo, affaireID, siteVal, ressource, comp, d0)

    If Not lr Is Nothing Then
        Dim oldD0 As Date, oldD1 As Date
        oldD0 = lr.Range(1, 5).value
        oldD1 = lr.Range(1, 6).value

        lr.Range(1, 5).value = d0
        lr.Range(1, 6).value = d1
        lr.Range(1, 7).value = valeur
        ModuleExec.InvalidateListObjectCache "TblAffectations"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneAffectation] Fichier DONNEES sauvegarde apres mise a jour"
        End If
        GoTo CleanExit
    End If

    If valeur <> 0 Then
        Set lr = lo.ListRows.Add
        With lr.Range
            .Cells(1, 1).value = affaireID
            .Cells(1, 2).value = siteVal
            .Cells(1, 3).value = ressource
            .Cells(1, 4).value = comp
            .Cells(1, 5).value = d0
            .Cells(1, 6).value = d1
            .Cells(1, 7).value = valeur
        End With
        ' Invalider le cache après ajout
        ModuleExec.InvalidateListObjectCache "TblAffectations"
        ' *** NOUVEAU : Sauvegarder le fichier DONNEES ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[EnregistrerUneAffectation] Fichier DONNEES sauvegarde apres creation"
        End If
    End If

CleanExit:
    ModuleExec.EndFastExec
End Sub

Private Function FindAffectationRow(lo As ListObject, aff As String, site As String, _
                                    res As String, comp As String, d As Date) As ListRow
    If lo.DataBodyRange Is Nothing Then Exit Function

    ' Charger toutes les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, d0 As Date, d1 As Date
    aff = Trim$(aff)
    site = Trim$(site)
    res = Trim$(res)
    comp = Trim$(comp)

    ' Recherche dans le tableau (beaucoup plus rapide)
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, 1))) = aff And _
           Trim$(CStr(dataArr(i, 2))) = site And _
           Trim$(CStr(dataArr(i, 3))) = res And _
           Trim$(CStr(dataArr(i, 4))) = comp Then

            If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
                d0 = CDate(dataArr(i, 5))
                d1 = CDate(dataArr(i, 6))

                If d >= d0 And d <= d1 Then
                    ' Retourner la ListRow correspondante (index i dans DataBodyRange)
                    Set FindAffectationRow = lo.ListRows(i)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Private Sub DeleteAffectationsOverlappingPeriod(lo As ListObject, aff As String, site As String, _
                                                res As String, comp As String, _
                                                d0 As Date, d1 As Date)
    If lo.DataBodyRange Is Nothing Then Exit Sub
    If lo.ListRows.count = 0 Then Exit Sub
    
    Dim i As Long, oldD0 As Date, oldD1 As Date
    aff = Trim$(aff)
    site = Trim$(site)
    res = Trim$(res)
    comp = Trim$(comp)
    
    ' *** OPTIMISATION : Parcourir directement les ListRows à l'envers ***
    ' (plus fiable que le tableau en mémoire qui devient obsolète après suppression)
    For i = lo.ListRows.count To 1 Step -1
        Dim lr As ListRow: Set lr = lo.ListRows(i)
        
        If Trim$(CStr(lr.Range(1, 1).value)) = aff And _
           Trim$(CStr(lr.Range(1, 2).value)) = site And _
           Trim$(CStr(lr.Range(1, 3).value)) = res And _
           Trim$(CStr(lr.Range(1, 4).value)) = comp Then
            
            If IsDate(lr.Range(1, 5).value) And IsDate(lr.Range(1, 6).value) Then
                oldD0 = CDate(lr.Range(1, 5).value)
                oldD1 = CDate(lr.Range(1, 6).value)
                
                ' Vérifier chevauchement : (d0 <= oldD1) And (d1 >= oldD0)
                If Not (d1 < oldD0 Or d0 > oldD1) Then
                    ' Chevauchement détecté
                    
                    ' Suppression totale si la période à supprimer couvre complètement la période existante
                    If d0 <= oldD0 And d1 >= oldD1 Then
                        lr.Delete
                    ' Suppression début : ajuster la date de fin
                    ElseIf d0 > oldD0 And d1 >= oldD1 Then
                        If d0 <= oldD1 Then
                            lr.Range(1, 6).value = d0 - 1
                        End If
                    ' Suppression fin : ajuster la date de début
                    ElseIf d0 <= oldD0 And d1 < oldD1 Then
                        If d1 >= oldD0 Then
                            lr.Range(1, 5).value = d1 + 1
                        End If
                    ' Suppression au milieu : scinder en deux périodes
                    ElseIf d0 > oldD0 And d1 < oldD1 Then
                        ' Créer une nouvelle ligne pour la fin
                        Dim newRow As ListRow: Set newRow = lo.ListRows.Add
                        With newRow.Range
                            .Cells(1, 1).value = aff
                            .Cells(1, 2).value = site
                            .Cells(1, 3).value = res
                            .Cells(1, 4).value = comp
                            .Cells(1, 5).value = d1 + 1
                            .Cells(1, 6).value = oldD1
                            .Cells(1, 7).value = lr.Range(1, 7).value
                        End With
                        ' Ajuster la ligne existante
                        lr.Range(1, 6).value = d0 - 1
                    End If
                    
                    ' Vérifier si la période résultante est invalide (date début > date fin)
                    ' (nécessaire seulement si la ligne n'a pas été supprimée)
                    If i <= lo.ListRows.count Then
                        ' Re-vérifier la ligne (elle pourrait avoir été supprimée)
                        On Error Resume Next
                        Dim testValue As Date
                        testValue = lr.Range(1, 5).value
                        If Err.Number = 0 Then
                            If lr.Range(1, 5).value > lr.Range(1, 6).value Then
                                lr.Delete
                            End If
                        End If
                        Err.Clear
                        On Error GoTo 0
                    End If
                End If
            End If
        End If
    Next i
End Sub

' -------------------------------------------------------------------------
' CHARGEMENT AFFECTATIONS
' -------------------------------------------------------------------------
Public Sub ChargerAffectations(ws As Worksheet, affaireID As String, siteVal As String)
    If InStr(affaireID, ",") > 0 Then
        Exit Sub  ' Sélection multiple détectée, ignorer
    End If
    
    Dim lo As ListObject: Set lo = GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub

    Dim precision As String
    precision = UCase$(Trim$(CStr(ws.Range(CELL_PRECISION).value)))
    If precision = "" Then precision = "JOUR"

    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    Dim arrStart As Variant, arrEnd As Variant
    arrStart = ws.Range(ws.Cells(TECH_ROW_START, FIRST_DATE_COL), ws.Cells(TECH_ROW_START, lastCol)).value
    arrEnd = ws.Range(ws.Cells(TECH_ROW_END, FIRST_DATE_COL), ws.Cells(TECH_ROW_END, lastCol)).value

    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, comp As String, ressource As String
    Dim d0 As Date, d1 As Date, charge As Double
    affaireID = Trim$(affaireID)
    siteVal = Trim$(siteVal)

    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, 1))) = affaireID And Trim$(CStr(dataArr(i, 2))) = siteVal Then
            
            comp = Trim$(CStr(dataArr(i, 4)))
            ressource = Trim$(CStr(dataArr(i, 3)))
            If Not ModuleExec.TryGetDate(dataArr(i, 5), d0) Then GoTo NextIteration
            If Not ModuleExec.TryGetDate(dataArr(i, 6), d1) Then GoTo NextIteration
            charge = 1

            Dim rowRes As Long
            rowRes = FindRowForResource(ws, comp, ressource)
            If rowRes = 0 Then GoTo NextIteration

            Select Case precision
                Case "JOUR"
                    Dim dictDateCols As Object: Set dictDateCols = CreateObject("Scripting.Dictionary")
                    Dim c As Long
                    For c = FIRST_DATE_COL To lastCol
                        Dim dateVal As Variant, dCol As Date
                        dateVal = ws.Cells(TECH_ROW_START, c).value
                        If ModuleExec.TryGetDate(dateVal, dCol) Then
                            dictDateCols(CLng(dCol)) = c
                        End If
                    Next c
                    
                    Dim d As Date
                    For d = d0 To d1
                        If Cal_IsBusiness(d) Then
                            Dim dateKey As Long: dateKey = CLng(d)
                            If dictDateCols.Exists(dateKey) Then
                                c = dictDateCols(dateKey)
                                ws.Cells(rowRes, c).value = charge
                            End If
                        End If
                    Next d

                Case "SEMAINE", "MOIS"
                    Dim p As Long, colStart As Date, colEnd As Date, nbJO As Long
                    For p = 1 To UBound(arrStart, 2)
                        If IsDate(arrStart(1, p)) And IsDate(arrEnd(1, p)) Then
                            colStart = arrStart(1, p)
                            colEnd = arrEnd(1, p)

                            If d0 <= colEnd And d1 >= colStart Then
                                nbJO = BusinessDaysBetween(Application.Max(d0, colStart), Application.Min(d1, colEnd))
                                If nbJO > 0 Then
                                    ws.Cells(rowRes, FIRST_DATE_COL + p - 1).value = charge
                                End If
                            End If
                        End If
                    Next p
            End Select
        End If
NextIteration:
    Next i
End Sub

' -------------------------------------------------------------------------
' UTILITAIRES
' -------------------------------------------------------------------------
Public Function FindCompetenceForRow(ws As Worksheet, targetRow As Long) As String
    Dim r As Long, val As String
    For r = targetRow To 1 Step -1
        val = Trim$(CStr(ws.Cells(r, 3).value))
        If Len(val) > 0 And ws.Cells(r, 3).Font.Bold And r < targetRow Then
            If val <> "Besoin" And val <> "Affecté" And InStr(val, "---") = 0 Then
                FindCompetenceForRow = val
                Exit Function
            End If
        End If
    Next
End Function

Public Function FindBesoinRowForComp(ws As Worksheet, comp As String) As Long
    Dim r As Long, lastRow As Long
    lastRow = FindEndOfChargeGrid(ws) + 400
    
    For r = FindEndOfChargeGrid(ws) + 2 To lastRow
        If ws.Cells(r, COL_COMP).Font.Bold Then
            If Trim$(CStr(ws.Cells(r, COL_COMP).value)) = comp Then
                If LCase$(Trim$(CStr(ws.Cells(r + 1, COL_COMP).value))) = "besoin" Then
                    FindBesoinRowForComp = r + 1
                End If
                Exit Function
            End If
        End If
    Next r
End Function

Public Function FindAffecteRowForComp(ws As Worksheet, comp As String) As Long
    Dim r As Long, lastRow As Long
    lastRow = FindEndOfChargeGrid(ws) + 400
    
    For r = FindEndOfChargeGrid(ws) + 2 To lastRow
        If ws.Cells(r, COL_COMP).Font.Bold Then
            If Trim$(CStr(ws.Cells(r, COL_COMP).value)) = comp Then
                If LCase$(Trim$(CStr(ws.Cells(r + 2, COL_COMP).value))) = "affecté" _
                   Or LCase$(Trim$(CStr(ws.Cells(r + 2, COL_COMP).value))) = "affecte" Then
                    FindAffecteRowForComp = r + 2
                End If
                Exit Function
            End If
        End If
    Next r
End Function

Private Function FindPeriodColumn(ws As Worksheet, d As Date) As Long
    Dim c As Long, lastCol As Long, d0 As Date, d1 As Date
    lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)

    For c = FIRST_DATE_COL To lastCol
        If ModuleExec.TryGetDate(ws.Cells(TECH_ROW_START, c).value, d0) And _
           ModuleExec.TryGetDate(ws.Cells(TECH_ROW_END, c).value, d1) Then
            If d >= d0 And d <= d1 Then
                FindPeriodColumn = c
                Exit Function
            End If
        End If
    Next c
End Function

Private Function FindRowForResource(ws As Worksheet, comp As String, ressource As String) As Long
    Dim startRow As Long
    startRow = FindEndOfChargeGrid(ws) + 2
    Dim r As Long
    
    For r = startRow To ws.Rows.count
        If ws.Cells(r, 3).Font.Bold And Trim(ws.Cells(r, 3).value) = comp Then
            Dim rr As Long
            For rr = r + 3 To r + 500
                If ws.Cells(rr, 3).Font.Bold Then Exit For
                If Trim(ws.Cells(rr, 3).value) = ressource Then
                    FindRowForResource = rr
                    Exit Function
                End If
            Next rr
        End If
    Next r
End Function

' Utilise ModuleExec.TryGetDate et ModuleExec.LastUsedCol (fonctions centralisées)

Private Function FindTableColumnIndex(lo As ListObject, header As String) As Long
    Dim i As Long
    For i = 1 To lo.ListColumns.count
        If StrComp(lo.ListColumns(i).name, header, vbTextCompare) = 0 Then
            FindTableColumnIndex = i
            Exit Function
        End If
    Next
End Function

Private Function FindColumnIndexByHeader(ws As Worksheet, header As String, Optional headerRow As Long = 1) As Long
    Dim lastCol As Long, c As Long
    lastCol = ws.Cells(headerRow, ws.Columns.count).End(xlToLeft).Column
    
    For c = 1 To lastCol
        If UCase$(Trim$(CStr(ws.Cells(headerRow, c).value))) = UCase$(Trim$(header)) Then
            FindColumnIndexByHeader = c
            Exit Function
        End If
    Next c
End Function

' -------------------------------------------------------------------------
' CLEAR / NETTOYAGE
' -------------------------------------------------------------------------
Public Sub ClearAffectationBlock(ws As Worksheet)
    Dim prevEvents As Boolean
    prevEvents = Application.EnableEvents
    Application.EnableEvents = False
    
    On Error GoTo CleanExit
    
    Dim startRow As Long, endCol As Long, lastRow As Long

    startRow = FindEndOfChargeGrid(ws)
    If startRow = 0 Then GoTo CleanExit

    startRow = startRow + SPACING_AFTER_CHARGE
    endCol = LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    If endCol < FIRST_DATE_COL Then endCol = FIRST_DATE_COL

    lastRow = TECH_ROW_START - 1

    With ws.Range(ws.Cells(startRow, COL_COMP), ws.Cells(lastRow, endCol))
        .ClearContents
        .ClearFormats
    End With

CleanExit:
    Application.EnableEvents = prevEvents
End Sub

' -------------------------------------------------------------------------
' CONSOLIDATION AFFECTATIONS
' -------------------------------------------------------------------------
Public Sub ConsoliderAffectationsRessource(affaireID As String, siteVal As String, _
                                          res As String, comp As String)
    On Error GoTo ErrHandler
    
    ' *** OPTIMISATION : Normaliser les paramètres (trim + uppercase pour comparaison) ***
    affaireID = UCase$(Trim$(affaireID))
    siteVal = UCase$(Trim$(siteVal))
    res = UCase$(Trim$(res))
    comp = UCase$(Trim$(comp))
    
    Debug.Print "[ConsoliderAffectationsRessource] START - " & res & " / " & comp
    
    ' *** NOUVEAU : Ouvrir le fichier DONNEES en mode lecture/écriture si nécessaire ***
    Dim wbDonnees As Workbook
    Dim needToSave As Boolean: needToSave = False
    Set wbDonnees = ModuleExec.GetFichierDonneesReadWrite()
    If Not wbDonnees Is Nothing Then
        needToSave = True
        Debug.Print "[ConsoliderAffectationsRessource] Fichier DONNEES ouvert en mode lecture/écriture"
    End If
    
    ' *** OPTIMISATION : Invalider le cache AVANT de charger les données ***
    ModuleExec.InvalidateListObjectCache "TblAffectations"
    
    Dim lo As ListObject
    Set lo = GetAffectationsTable()
    
    If lo Is Nothing Then
        Debug.Print "[ConsoliderAffectationsRessource] ABORT: Table introuvable (GetAffectationsTable retourne Nothing)"
        Debug.Print "[ConsoliderAffectationsRessource] Vérifiez que la feuille 'Affectations' existe avec la table 'TblAffectations'"
        Exit Sub
    End If
    
    If lo.DataBodyRange Is Nothing Then
        Debug.Print "[ConsoliderAffectationsRessource] ABORT: Table vide"
        Exit Sub
    End If
    
    Dim d0 As Date, d1 As Date, charge As Double
    Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Collecte jour par jour (jours ouvrés uniquement)
    Dim i As Long, nbAffectations As Long
    nbAffectations = 0
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        ' *** OPTIMISATION : Comparaison case-insensitive avec UCase$ ***
        If UCase$(Trim$(CStr(dataArr(i, 1)))) = affaireID And _
           UCase$(Trim$(CStr(dataArr(i, 2)))) = siteVal And _
           UCase$(Trim$(CStr(dataArr(i, 3)))) = res And _
           UCase$(Trim$(CStr(dataArr(i, 4)))) = comp Then
            
            If IsDate(dataArr(i, 5)) And IsDate(dataArr(i, 6)) Then
                d0 = CDate(dataArr(i, 5))
                d1 = CDate(dataArr(i, 6))
                charge = CDbl(dataArr(i, 7))
                
                If charge > 0 Then
                    nbAffectations = nbAffectations + 1
                    Dim d As Date
                    For d = d0 To d1
                        ' *** OPTIMISATION : Appel direct, erreur gérée par Cal_IsBusiness ***
                        If Cal_IsBusiness(d) Then
                            dict(CStr(CLng(d))) = charge
                        End If
                    Next d
                End If
            End If
        End If
    Next i
    
    ' *** OPTIMISATION : Gérer les cas limites comme dans ModuleCharge ***
    If dict.count = 0 Then
        Debug.Print "[ConsoliderAffectationsRessource] Aucune donnée trouvée -> suppression de toutes les lignes"
        DeleteRowsByAffectation lo, affaireID, siteVal, res, comp
        ' *** CORRECTION : Sauvegarder même dans le cas limite ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[ConsoliderAffectationsRessource] Fichier DONNEES sauvegardé après suppression"
        End If
        Exit Sub
    End If
    
    If dict.count = 1 Then
        Debug.Print "[ConsoliderAffectationsRessource] Une seule donnée trouvée -> création d'une ligne unique"
        DeleteRowsByAffectation lo, affaireID, siteVal, res, comp
        Dim singleDate As Long, singleCharge As Double
        singleDate = CLng(dict.keys()(0))
        singleCharge = dict(dict.keys()(0))
        AddAffectationLine lo, affaireID, siteVal, res, comp, singleDate, singleDate, singleCharge, 1
        ' *** CORRECTION : Sauvegarder même dans le cas limite ***
        If needToSave Then
            ModuleExec.SauvegarderFichierDonnees
            Debug.Print "[ConsoliderAffectationsRessource] Fichier DONNEES sauvegardé après création ligne unique"
        End If
        Exit Sub
    End If
    
    DeleteRowsByAffectation lo, affaireID, siteVal, res, comp
    
    ' Convertir + trier
    Dim dates() As Long, k As Variant
    ReDim dates(0 To dict.count - 1)
    
    i = 0
    For Each k In dict.keys
        dates(i) = CLng(k)
        i = i + 1
    Next k
    
    QuickSortLong dates, LBound(dates), UBound(dates)
    
    ' Reconstruire périodes
    Dim startD As Long: startD = dates(0)
    Dim endD As Long: endD = dates(0)
    Dim chargeUnitaire As Double: chargeUnitaire = dict(CStr(startD))
    Dim nbJoursOuvres As Long: nbJoursOuvres = 1
    Dim nbPeriodes As Long: nbPeriodes = 0
    
    Dim cur As Long
    For i = 1 To UBound(dates)
        cur = dates(i)
        
        ' *** OPTIMISATION : Utiliser ModuleCalendar directement (plus simple) ***
        Dim nextWorkDay As Long
        nextWorkDay = CLng(ModuleCalendar.NextBusinessDay(dateSerial(1899, 12, 30) + endD))
        
        ' Fusionner si : prochain jour ouvré ET charge identique
        If CLng(cur) = CLng(nextWorkDay) And dict(CStr(cur)) = chargeUnitaire Then
            endD = cur
            nbJoursOuvres = nbJoursOuvres + 1
        Else
            ' Nouvelle période : sauvegarder l'ancienne et commencer une nouvelle
            AddAffectationLine lo, affaireID, siteVal, res, comp, startD, endD, chargeUnitaire, nbJoursOuvres
            nbPeriodes = nbPeriodes + 1
            startD = cur
            endD = cur
            chargeUnitaire = dict(CStr(cur))
            nbJoursOuvres = 1
        End If
    Next i
    
    AddAffectationLine lo, affaireID, siteVal, res, comp, startD, endD, chargeUnitaire, nbJoursOuvres
    nbPeriodes = nbPeriodes + 1
    
    ' *** NOUVEAU : Sauvegarder le fichier DONNEES si on l'a ouvert en écriture ***
    If needToSave Then
        ModuleExec.SauvegarderFichierDonnees
        Debug.Print "[ConsoliderAffectationsRessource] Fichier DONNEES sauvegardé après consolidation"
    End If
    
    Debug.Print "[ConsoliderAffectationsRessource] Reconstruction terminée (" & nbPeriodes & " périodes)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[ConsoliderAffectationsRessource] ERREUR : " & Err.Number & " - " & Err.Description & " (ligne " & Erl & ")"
    ModuleErrorHandling.HandleError "ModuleAffectation", "ConsoliderAffectationsRessource", False
    Err.Clear
End Sub

Private Sub AddAffectationLine(lo As ListObject, affaireID As String, siteVal As String, _
                               res As String, comp As String, startD As Long, endD As Long, _
                               charge As Double, nbJoursOuvres As Long)
    Dim newRow As ListRow: Set newRow = lo.ListRows.Add
    
    Dim dStart As Date, dEnd As Date
    dStart = dateSerial(1899, 12, 30) + startD
    dEnd = dateSerial(1899, 12, 30) + endD
    
    With newRow.Range
        .Cells(1, 1).value = affaireID
        .Cells(1, 2).value = siteVal
        .Cells(1, 3).value = res
        .Cells(1, 4).value = comp
        .Cells(1, 5).value = dStart
        .Cells(1, 6).value = dEnd
        .Cells(1, 7).value = nbJoursOuvres
    End With
    ModuleExec.InvalidateListObjectCache "TblAffectations"
End Sub

Private Sub DeleteRowsByAffectation(lo As ListObject, affaireID As String, siteVal As String, _
                                    res As String, comp As String)
    Dim i As Long, rg As Range
    Dim deleted As Boolean: deleted = False
    
    ' *** OPTIMISATION : Comparaison case-insensitive (les paramètres sont déjà normalisés) ***
    For i = lo.ListRows.count To 1 Step -1
        Set rg = lo.ListRows(i).Range
        
        If UCase$(Trim$(CStr(rg.Cells(1, 1).value))) = affaireID And _
           UCase$(Trim$(CStr(rg.Cells(1, 2).value))) = siteVal And _
           UCase$(Trim$(CStr(rg.Cells(1, 3).value))) = res And _
           UCase$(Trim$(CStr(rg.Cells(1, 4).value))) = comp Then
            lo.ListRows(i).Delete
            deleted = True
        End If
    Next i
    
    If deleted Then ModuleExec.InvalidateListObjectCache "TblAffectations"
End Sub

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

Public Sub EnsureTransferForAffectation(ressource As String, comp As String, _
                                         siteDestination As String, d0 As Date, d1 As Date)
    If Not IsMultiSiteCompetence(comp) Then Exit Sub
    If d0 <= 0 Or d1 <= 0 Then Exit Sub

    Dim resKey As String
    resKey = NormalizeRessourceLabel(ressource)
    If Len(resKey) = 0 Then Exit Sub

    Dim siteOrigine As String
    siteOrigine = GetRessourceSiteHint(resKey)
    If Len(siteOrigine) = 0 Then
        siteOrigine = GetResourceSite(resKey)
    End If
    If Len(siteOrigine) = 0 Then Exit Sub
    If StrComp(siteOrigine, siteDestination, vbTextCompare) = 0 Then Exit Sub

    RegisterOrExtendTransfer resKey, siteOrigine, siteDestination, d0, d1
End Sub

Private Sub RegisterOrExtendTransfer(ressource As String, siteOrigine As String, _
                                     siteDestination As String, d0 As Date, d1 As Date)
    ressource = NormalizeRessourceLabel(ressource)
    On Error GoTo ForceCreate

    ModuleTransfert.InitialiserTransferts
    Dim lo As ListObject
    Set lo = ModuleTransfert.GetTransfertsTable()

    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then GoTo ForceCreate

    Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long
    Dim cDateDeb As Long, cDateFin As Long, cStatut As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSiteOrig = FindTableColumnIndex(lo, "SiteOrigine")
    cSiteDest = FindTableColumnIndex(lo, "SiteDestination")
    cDateDeb = FindTableColumnIndex(lo, "DateDébut")
    If cDateDeb = 0 Then cDateDeb = FindTableColumnIndex(lo, "DateDebut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cStatut = FindTableColumnIndex(lo, "Statut")

    If cRes = 0 Or cSiteOrig = 0 Or cSiteDest = 0 Or cDateDeb = 0 Or cDateFin = 0 Then
        GoTo ForceCreate
    End If

    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value

    Dim i As Long, existingStart As Date, existingEnd As Date
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        Dim tableResName As String
        tableResName = NormalizeRessourceLabel(CStr(dataArr(i, cRes)))
        If StrComp(tableResName, ressource, vbTextCompare) = 0 And _
           StrComp(Trim$(CStr(dataArr(i, cSiteOrig))), siteOrigine, vbTextCompare) = 0 And _
           StrComp(Trim$(CStr(dataArr(i, cSiteDest))), siteDestination, vbTextCompare) = 0 Then

            If ModuleExec.TryGetDate(dataArr(i, cDateDeb), existingStart) And _
               ModuleExec.TryGetDate(dataArr(i, cDateFin), existingEnd) Then

                ' Vérifier si les périodes se chevauchent OU si la nouvelle période est proche/après la fin
                Dim shouldExtend As Boolean: shouldExtend = False
                
                If DateRangesOverlap(d0, d1, existingStart, existingEnd) Then
                    ' Chevauchement direct : étendre si nécessaire
                    shouldExtend = True
                ElseIf d0 <= existingEnd + 1 And d1 > existingEnd Then
                    ' La nouvelle période commence juste après ou pendant le transfert et dépasse la fin
                    ' Étendre le transfert pour couvrir la nouvelle période
                    shouldExtend = True
                ElseIf d0 < existingStart And d1 >= existingStart - 1 Then
                    ' La nouvelle période commence avant et se termine juste avant ou pendant le transfert
                    ' Étendre le transfert pour couvrir la nouvelle période
                    shouldExtend = True
                End If
                
                If shouldExtend Then
                    Dim lr As ListRow
                    Set lr = lo.ListRows(i)
                    If d0 < existingStart Then lr.Range(1, cDateDeb).value = d0
                    If d1 > existingEnd Then lr.Range(1, cDateFin).value = d1
                    If cStatut > 0 Then
                        lr.Range(1, cStatut).value = "Appliqué"
                    End If
                    Debug.Print "[RegisterOrExtendTransfer] Transfert étendu pour " & ressource & " : " & _
                                Format$(existingStart, "dd/mm/yyyy") & " - " & Format$(existingEnd, "dd/mm/yyyy") & _
                                " -> " & Format$(lr.Range(1, cDateDeb).value, "dd/mm/yyyy") & " - " & Format$(lr.Range(1, cDateFin).value, "dd/mm/yyyy")
                    Exit Sub
                End If
            End If
        End If
    Next i

ForceCreate:
    ModuleTransfert.EnregistrerTransfert ressource, siteOrigine, siteDestination, d0, d1, "Appliqué"
    Exit Sub
End Sub

Private Function DateRangesOverlap(d0 As Date, d1 As Date, existingStart As Date, existingEnd As Date) As Boolean
    DateRangesOverlap = Not (d1 < existingStart Or d0 > existingEnd)
End Function

' -------------------------------------------------------------------------
' DÉTECTION GRILLE AFFECTATION
' -------------------------------------------------------------------------
Public Function IsInAffectationGrid(ByVal cell As Range) As Boolean
    On Error GoTo Quit

    Dim ws As Worksheet: Set ws = cell.Worksheet
    Dim startAff As Long: startAff = FindEndOfChargeGrid(ws) + SPACING_AFTER_CHARGE
    
    If startAff = 0 Then GoTo Quit

    Dim endAff As Long: endAff = TECH_ROW_START - 1
    
    If cell.Row < startAff Or cell.Row > endAff Then GoTo Quit

    Dim lastCol As Long: lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    If lastCol < FIRST_DATE_COL Then GoTo Quit

    If cell.Column < FIRST_DATE_COL Or cell.Column > lastCol Then GoTo Quit

    IsInAffectationGrid = True
    Exit Function

Quit:
    IsInAffectationGrid = False
End Function

' -------------------------------------------------------------------------
' VÉRIFICATION CONFLITS
' -------------------------------------------------------------------------
Public Sub CheckConflits(ws As Worksheet, r As Long, c As Long)
    Dim comp As String: comp = ws.Cells(r, COL_COMP).value

    Dim besoinRow As Long: besoinRow = FindBesoinRowForComp(ws, comp)
    Dim affecteRow As Long: affecteRow = FindAffecteRowForComp(ws, comp)

    If besoinRow * affecteRow = 0 Then Exit Sub

    Dim besoin As Double: besoin = val(ws.Cells(besoinRow, c).value)
    Dim affecte As Double: affecte = val(ws.Cells(affecteRow, c).value)

    If affecte > besoin Then
        ws.Cells(r, c).Interior.color = vbRed
    Else
        ws.Cells(r, c).Interior.ColorIndex = xlColorIndexNone
    End If
End Sub

' -------------------------------------------------------------------------
' TRIGGER AUTO AFFECTATION
' -------------------------------------------------------------------------
Public Sub CheckAndTriggerAffectation(ws As Worksheet)
    On Error GoTo Quit

    Dim lastCol As Long, r As Long, c As Long, valC As Variant
    lastCol = ModuleExec.LastUsedCol(ws, HEADER_ROW_CHARGE + 1)
    If lastCol < FIRST_DATE_COL Then Exit Sub

    For r = HEADER_ROW_CHARGE + 3 To TECH_ROW_START - 1
        If Len(Trim$(CStr(ws.Cells(r, COL_COMP).value))) = 0 Then Exit For

        For c = FIRST_DATE_COL To lastCol
            valC = ws.Cells(r, c).value
            If IsNumeric(valC) And CDbl(valC) > 0 Then
                ConstruireGrilleAffectation_V2 ws
                Exit Sub
            End If
        Next c
    Next r

Quit:
End Sub

' -------------------------------------------------------------------------
' CONSTRUCTION GRILLE PRINCIPALE
' -------------------------------------------------------------------------
Public Sub ConstruireGrilleAffectation_V2(ws As Worksheet)
    ModuleExec.BeginFastExec
    On Error GoTo CleanExit

    Dim d0 As Date, d1 As Date, precision As String
    If Not ValidateSheetData(ws, d0, d1, precision, True) Then GoTo CleanExit

    ClearAffectationBlock ws

    Dim comps() As String
    comps = GetActiveCompetences(ws)
    If UBound(comps) < 0 Then GoTo CleanExit

    Dim startRow As Long
    startRow = FindEndOfChargeGrid(ws) + SPACING_AFTER_CHARGE

    BuildCompetenceBlocks ws, comps, startRow

CleanExit:
    ModuleExec.EndFastExec
End Sub

' Utilise ModuleExec.BeginFastExec et ModuleExec.EndFastExec

' ============================================================================
' GESTION DES COMMENTAIRES D'AFFECTATION
' ============================================================================
Public Sub RegisterAffectationComment(ByVal rowNum As Long, ByVal startCol As Long)
    On Error Resume Next
    
    ' Initialiser le dictionnaire si nécessaire
    If mAffectationComments Is Nothing Then
        Set mAffectationComments = CreateObject("Scripting.Dictionary")
    End If
    
    ' Créer une clé unique pour la cellule (rowNum|startCol)
    Dim key As String
    key = CStr(rowNum) & "|" & CStr(startCol)
    
    ' Enregistrer la cellule avec commentaire
    mAffectationComments(key) = True
    
    On Error GoTo 0
End Sub

' ============================================================================
' SUPPRIMER TOUS LES COMMENTAIRES D'AFFECTATION
' ============================================================================
Public Sub ClearAffectationComments(ws As Worksheet)
    On Error Resume Next
    
    If mAffectationComments Is Nothing Then Exit Sub
    If mAffectationComments.count = 0 Then Exit Sub
    
    Dim key As Variant
    For Each key In mAffectationComments.keys
        Dim parts As Variant
        parts = Split(key, "|")
        If UBound(parts) >= 1 Then
            Dim rowNum As Long, colNum As Long
            rowNum = CLng(parts(0))
            colNum = CLng(parts(1))
            
            ' Supprimer le commentaire de la cellule
            On Error Resume Next
            ws.Cells(rowNum, colNum).ClearComments
            On Error GoTo 0
        End If
    Next key
    
    ' Vider le dictionnaire
    mAffectationComments.RemoveAll
    
    On Error GoTo 0
End Sub




