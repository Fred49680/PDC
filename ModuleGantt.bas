Attribute VB_Name = "ModuleGantt"

Option Explicit

Private Const COLOR_AFFECTATION As Long = &H9AD3C7     ' Turquoise doux (fallback site)
Private Const COLOR_MIXTE As Long = &H9FD18C          ' Vert sauge pour multi-affectations
Private Const COLOR_ABS_FORMATION As Long = &HCFA6FF   ' Violet formation
Private Const COLOR_ABS_CP As Long = &H99F5FF          ' Jaune doux CP
Private Const COLOR_ABS_MALADIE As Long = &H8080FF     ' Rouge rosé maladie
Private Const COLOR_ABS_PATERNITE As Long = &HFFD8BD   ' Bleu pastel paternité
Private Const COLOR_ABS_PARENTAL As Long = &HC8F0C4    ' Vert doux parental
Private Const COLOR_ABS_MATERNITE As Long = &HE3CDFF   ' Rose maternité
Private Const COLOR_ABS_AUTRE As Long = &HA2A2A2       ' Gris bleuté autres absences
Private Const COLOR_WEEKEND As Long = &HFFF0EB         ' Fond weekend
Private Const COLOR_HOLIDAY As Long = &HD6F4FF         ' Fond jours fériés
Private Const COLOR_GRID_LIGHT As Long = &HDCDCDC      ' Grille douce
Private Const HEADER_ROW As Long = 3
Private Const LEGEND_ROW As Long = 1

Private siteColorMap As Object
Private siteLegend As Object
Private sitePalette As Variant
Private sitePaletteIndex As Long

' ============================================================================
' PUBLIC : Rafraîchit le Gantt uniquement si des modifications ont été détectées
' ============================================================================
Public Sub RefreshGanttIfNeeded(Optional ByVal feuilleSortie As String = "Planning_Gantt")
    If ModuleExec.mGanttNeedsRefresh Then
        Debug.Print "[RefreshGanttIfNeeded] Rafraîchissement nécessaire - Génération du Gantt"
        GenererGanttAffectations feuilleSortie, False
        ModuleExec.mGanttNeedsRefresh = False
        Debug.Print "[RefreshGanttIfNeeded] Gantt régénéré avec succès"
    Else
        Debug.Print "[RefreshGanttIfNeeded] Pas de rafraîchissement nécessaire"
    End If
End Sub

' ============================================================================
' PUBLIC : Génère un planning type Gantt par ressource / jour
' ============================================================================
Public Sub GenererGanttAffectations(Optional ByVal feuilleSortie As String = "Planning_Gantt", Optional ByVal showMessage As Boolean = True)
    On Error GoTo ErrHandler
    
    Dim loAff As ListObject
    Dim loAbs As ListObject
    Dim dictData As Object
    Dim dictRessources As Object
    Dim minDate As Date, maxDate As Date
    
    ResetSitePalette
    
    ' Charger le calendrier pour vérifier les jours ouvrés
    ModuleCalendar.LoadCalendar
    
    Set loAff = GetAffectationsList()
    If loAff Is Nothing Then Err.Raise vbObjectError + 1, , "Table des affectations introuvable."
    
    Set loAbs = GetAbsencesList()   ' Peut être Nothing si absences non gérées
    
    Set dictData = CreateObject("Scripting.Dictionary")
    Set dictRessources = CreateObject("Scripting.Dictionary")
    minDate = 0
    maxDate = 0
    
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Application.EnableEvents = False
    
    CollectAffectations loAff, dictData, dictRessources, minDate, maxDate
    If Not loAbs Is Nothing Then
        CollectAbsences loAbs, dictData, dictRessources, minDate, maxDate
    End If
    
    If dictRessources.count = 0 Then Err.Raise vbObjectError + 2, , "Aucune ressource à afficher."
    If minDate = 0 Or maxDate = 0 Then Err.Raise vbObjectError + 3, , "Impossible de déterminer la plage de dates."
    
    BuildPlanningSheet feuilleSortie, dictData, dictRessources, minDate, maxDate
    
    If showMessage Then
        'MsgBox "Planning Gantt généré sur la feuille '" & feuilleSortie & "'.", vbInformation
    End If
    GoTo CleanExit
    
ErrHandler:
    MsgBox "Erreur lors de la génération du Gantt :" & vbCrLf & Err.Description, vbExclamation
CleanExit:
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Application.EnableEvents = True
End Sub

' ============================================================================
' COLLECTE DES DONNÉES
' ============================================================================
Private Sub CollectAffectations(lo As ListObject, dictData As Object, _
                                dictRessources As Object, ByRef minDate As Date, _
                                ByRef maxDate As Date)
    If lo.DataBodyRange Is Nothing Then Exit Sub
    
    Dim colRes As Long, colDateDebut As Long, colDateFin As Long
    Dim colSite As Long
    
    colRes = FindColumnByAliases(lo, Array("RESSOURCE", "RESSOURCEID", "COLLABORATEUR"))
    colDateDebut = FindColumnByAliases(lo, Array("DATEDEBUT", "DATE_DEBUT", "DEBUT"))
    colDateFin = FindColumnByAliases(lo, Array("DATEFIN", "FIN"))
    colSite = FindColumnByAliases(lo, Array("SITE"))
    
    If colRes = 0 Or colDateDebut = 0 Or colDateFin = 0 Then
        Err.Raise vbObjectError + 10, , "Colonnes Ressource/DateDébut/DateFin manquantes dans " & lo.name
    End If
    
    Dim lr As ListRow
    For Each lr In lo.ListRows
        Dim res As String
        Dim d0 As Date, d1 As Date
        
        res = Trim$(CStr(lr.Range(1, colRes).value))
        If Len(res) = 0 Then GoTo NextRow
        If Not IsDate(lr.Range(1, colDateDebut).value) Then GoTo NextRow
        If Not IsDate(lr.Range(1, colDateFin).value) Then GoTo NextRow
        
        d0 = CDate(lr.Range(1, colDateDebut).value)
        d1 = CDate(lr.Range(1, colDateFin).value)
        If d1 < d0 Then GoTo NextRow
        
        RegisterPeriod dictData, dictRessources, res, d0, d1, GetCellText(lr, colSite), "AFF", minDate, maxDate, vbNullString
NextRow:
    Next lr
End Sub

Private Sub CollectAbsences(lo As ListObject, dictData As Object, _
                            dictRessources As Object, ByRef minDate As Date, _
                            ByRef maxDate As Date)
    If lo.DataBodyRange Is Nothing Then Exit Sub
    
    Dim colRes As Long, colDateDebut As Long, colDateFin As Long, colMotif As Long
    Dim colComment As Long
    
    colRes = FindColumnByAliases(lo, Array("RESSOURCE", "RESSOURCEID", "COLLABORATEUR"))
    colDateDebut = FindColumnByAliases(lo, Array("DATEDEBUT", "DATE_DEBUT", "DEBUT"))
    colDateFin = FindColumnByAliases(lo, Array("DATEFIN", "FIN"))
    colMotif = FindColumnByAliases(lo, Array("MOTIF", "TYPE", "RAISON"))
    colComment = FindColumnByAliases(lo, Array("COMMENTAIRE", "COMMENT", "NOTE", "DETAIL", "OBSERVATION"))
    
    If colRes = 0 Or colDateDebut = 0 Or colDateFin = 0 Then
        Err.Raise vbObjectError + 11, , "Colonnes Ressource/DateDébut/DateFin manquantes dans " & lo.name
    End If
    
    Dim lr As ListRow
    For Each lr In lo.ListRows
        Dim res As String
        Dim d0 As Date, d1 As Date
        
        res = Trim$(CStr(lr.Range(1, colRes).value))
        If Len(res) = 0 Then GoTo NextRow
        If Not IsDate(lr.Range(1, colDateDebut).value) Then GoTo NextRow
        If Not IsDate(lr.Range(1, colDateFin).value) Then GoTo NextRow
        
        d0 = CDate(lr.Range(1, colDateDebut).value)
        d1 = CDate(lr.Range(1, colDateFin).value)
        If d1 < d0 Then GoTo NextRow
        
        Dim label As String
        label = GetCellText(lr, colMotif)
        If Len(label) = 0 Then label = "Absence"
        
        Dim commentText As String
        commentText = GetCellText(lr, colComment)
        
        RegisterPeriod dictData, dictRessources, res, d0, d1, label, "ABS", minDate, maxDate, commentText
NextRow:
    Next lr
End Sub

' ============================================================================
' SORTIE FEUILLE
' ============================================================================
Private Sub BuildPlanningSheet(ByVal feuilleSortie As String, dictData As Object, _
                               dictRessources As Object, ByVal minDate As Date, _
                               ByVal maxDate As Date)
    Dim ws As Worksheet
    
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(feuilleSortie)
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.count))
        ws.name = feuilleSortie
    Else
        ws.Cells.Clear
    End If
    
    Dim dayCount As Long
    dayCount = CLng(maxDate - minDate) + 1
    
    Dim ressources As Variant
    ressources = dictRessources.keys
    SortStringArray ressources
    
    Dim resCount As Long
    resCount = UBound(ressources) - LBound(ressources) + 1
    
    Dim headerRow As Long: headerRow = HEADER_ROW
    Dim firstDataRow As Long: firstDataRow = headerRow + 1
    Dim lastRow As Long: lastRow = firstDataRow + resCount - 1
    
    Dim dayTypes() As String
    ReDim dayTypes(1 To dayCount)
    
    Dim j As Long
    ws.Cells(headerRow, 1).value = "Ressource"
    ws.Cells(headerRow, 1).Font.Bold = True
    
    For j = 0 To dayCount - 1
        Dim colIndex As Long
        colIndex = j + 2
        Dim currentDate As Date
        currentDate = minDate + j
        
        With ws.Cells(headerRow, colIndex)
            .value = currentDate
            .NumberFormat = "dd mmm"
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
            .Font.Bold = True
        End With
        
        If ModuleCalendar.IsHoliday(currentDate) Then
            dayTypes(j + 1) = "HOL"
        ElseIf ModuleCalendar.IsWeekend(currentDate) Then
            dayTypes(j + 1) = "WE"
        End If
    Next j
    
    Dim i As Long, rowOffset As Long
    rowOffset = 0
    For i = LBound(ressources) To UBound(ressources)
        Dim targetRow As Long
        targetRow = firstDataRow + rowOffset
        ws.Cells(targetRow, 1).value = ressources(i)
        ws.Cells(targetRow, 1).HorizontalAlignment = xlLeft
        
        For j = 0 To dayCount - 1
            Dim key As String
            key = BuildKey(ressources(i), minDate + j)
            If dictData.Exists(key) Then
                Dim cellData As Variant
                cellData = dictData(key)
                
                Dim statusCode As String
                Dim infoText As String
                Dim extraInfo As String
                
                statusCode = CStr(cellData(0))
                infoText = CStr(cellData(1))
                If UBound(cellData) >= 2 Then
                    extraInfo = Trim$(CStr(cellData(2)))
                Else
                    extraInfo = vbNullString
                End If
                
                With ws.Cells(targetRow, j + 2)
                    .value = ""
                    .Interior.color = ResolveStatusColor(statusCode, infoText)
                    If UCase$(statusCode) = "ABS" Then
                        If InStr(1, UCase$(infoText), "FORM", vbTextCompare) > 0 And Len(extraInfo) > 0 Then
                            On Error Resume Next
                            .ClearComments
                            On Error GoTo 0
                            .AddComment extraInfo
                            .Comment.Visible = False
                        End If
                    End If
                End With
            End If
        Next j
        rowOffset = rowOffset + 1
    Next i
    
    With ws.Range(ws.Cells(headerRow, 1), ws.Cells(lastRow, dayCount + 1))
        .Borders.LineStyle = xlContinuous
        .Borders.color = COLOR_GRID_LIGHT
        .Font.Size = 9
    End With
    
    ws.Columns(1).ColumnWidth = 18
    ws.Range(ws.Cells(headerRow, 2), ws.Cells(headerRow, dayCount + 1)).EntireColumn.ColumnWidth = 6
    ws.Rows(headerRow).RowHeight = 18
    ws.Rows(firstDataRow & ":" & lastRow).RowHeight = 16
    
    ApplyCalendarBackground ws, headerRow, firstDataRow, lastRow, dayCount, dayTypes
    AddLegendRow ws
    ApplyFreezePanes ws
End Sub

Private Function ResolveStatusColor(ByVal statusCode As String, ByVal info As String) As Long
    Select Case UCase$(statusCode)
        Case "ABS"
            ResolveStatusColor = GetAbsenceColor(info)
        Case "MIX"
            ResolveStatusColor = COLOR_MIXTE
        Case Else
            ResolveStatusColor = GetSiteColor(info)
    End Select
End Function

Private Sub AddLegendRow(ws As Worksheet)
    ws.Rows(LEGEND_ROW).Clear
    ws.Rows(LEGEND_ROW).RowHeight = 18
    
    ws.Cells(LEGEND_ROW, 1).value = "Légende"
    ws.Cells(LEGEND_ROW, 1).Font.Bold = True
    
    Dim colPtr As Long
    colPtr = 2
    
    colPtr = AddSiteLegendRow(ws, colPtr)
    colPtr = WriteLegendChip(ws, colPtr, "Formation", COLOR_ABS_FORMATION)
    colPtr = WriteLegendChip(ws, colPtr, "Congés payés", COLOR_ABS_CP)
    colPtr = WriteLegendChip(ws, colPtr, "Maladie", COLOR_ABS_MALADIE)
    colPtr = WriteLegendChip(ws, colPtr, "Paternité", COLOR_ABS_PATERNITE)
    colPtr = WriteLegendChip(ws, colPtr, "Maternité", COLOR_ABS_MATERNITE)
    colPtr = WriteLegendChip(ws, colPtr, "Parental", COLOR_ABS_PARENTAL)
    colPtr = WriteLegendChip(ws, colPtr, "Autres absences", COLOR_ABS_AUTRE)
    WriteLegendChip ws, colPtr, "Multi-affectations", COLOR_MIXTE
End Sub

' ============================================================================
' OUTILS
' ============================================================================
Private Sub RegisterPeriod(dictData As Object, dictRessources As Object, _
                           ByVal ressource As String, ByVal d0 As Date, ByVal d1 As Date, _
                           ByVal label As String, ByVal statusCode As String, _
                           ByRef minDate As Date, ByRef maxDate As Date, _
                           Optional ByVal extraInfo As Variant)
    
    If Len(ressource) = 0 Then Exit Sub
    If d1 < d0 Then Exit Sub
    
    If Not dictRessources.Exists(ressource) Then dictRessources.Add ressource, True
    
    If minDate = 0 Or d0 < minDate Then minDate = d0
    If maxDate = 0 Or d1 > maxDate Then maxDate = d1
    
    Dim d As Date
    For d = d0 To d1
        ' Pour les affectations, ne pas enregistrer les jours non ouvrés (week-ends et fériés)
        ' Les absences restent sur tous les jours
        If UCase$(statusCode) <> "ABS" Then
            On Error Resume Next
            Dim isBusinessDay As Boolean
            isBusinessDay = ModuleCalendar.isBusinessDay(d)
            If Err.Number <> 0 Then
                Err.Clear
                ' Si le calendrier n'est pas chargé ou erreur, considérer comme jour ouvré
                isBusinessDay = True
            End If
            On Error GoTo 0
            
            ' Ignorer les jours non ouvrés pour les affectations
            If Not isBusinessDay Then GoTo NextDay
        End If
        
        Dim key As String
        key = BuildKey(ressource, d)
        
        If Not dictData.Exists(key) Then
            dictData.Add key, BuildCellData(statusCode, label, extraInfo)
        Else
            Dim existing As Variant
            existing = dictData(key)
            If UCase$(statusCode) = "ABS" Then
                dictData(key) = BuildCellData("ABS", label, extraInfo)
            ElseIf UCase$(existing(0)) = "ABS" Then
                ' On conserve l'absence prioritaire
            Else
                dictData(key) = BuildCellData("MIX", MergeLabels(existing(1), label), vbNullString)
            End If
        End If
NextDay:
    Next d
End Sub

Private Function MergeLabels(ByVal label1 As String, ByVal label2 As String) As String
    If Len(label1) = 0 Then
        MergeLabels = label2
    ElseIf Len(label2) = 0 Then
        MergeLabels = label1
    Else
        MergeLabels = label1 & " / " & label2
    End If
End Function

Private Function GetCellText(lr As ListRow, colIndex As Long) As String
    If colIndex = 0 Then Exit Function
    GetCellText = Trim$(CStr(lr.Range(1, colIndex).value))
End Function

Private Function BuildCellData(ByVal statusCode As String, ByVal label As String, _
                               Optional ByVal extraInfo As Variant) As Variant
    Dim payload(0 To 2) As Variant
    payload(0) = statusCode
    payload(1) = label
    If IsMissing(extraInfo) Then
        payload(2) = vbNullString
    Else
        payload(2) = extraInfo
    End If
    BuildCellData = payload
End Function

Private Function BuildKey(ByVal ressource As String, ByVal d As Date) As String
    BuildKey = ressource & "|" & CStr(CLng(d))
End Function

Private Function GetAffectationsList() As ListObject
    On Error Resume Next
    Set GetAffectationsList = ModuleAffectation.GetAffectationsTable()
End Function

Private Function GetAbsencesList() As ListObject
    On Error Resume Next
    Set GetAbsencesList = ModuleAbsence.GetAbsencesTable()
End Function

Private Function FindColumnByAliases(lo As ListObject, aliases As Variant) As Long
    Dim header As ListColumn
    Dim targetKeys As Object
    Set targetKeys = CreateObject("Scripting.Dictionary")
    
    Dim aliasValue As Variant
    For Each aliasValue In aliases
        targetKeys(AddAliasKey(CStr(aliasValue))) = True
    Next aliasValue
    
    For Each header In lo.ListColumns
        Dim normalized As String
        normalized = AddAliasKey(header.name)
        If targetKeys.Exists(normalized) Then
            FindColumnByAliases = header.Index
            Exit Function
        End If
    Next header
End Function

Private Function AddAliasKey(textValue As String) As String
    Dim normalized As String
    normalized = UCase$(Trim$(textValue))
    normalized = Replace(normalized, " ", "")
    normalized = Replace(normalized, "_", "")
    normalized = ReplaceAccents(normalized)
    AddAliasKey = normalized
End Function

Private Function ReplaceAccents(textValue As String) As String
    Dim accents As Variant, plain As Variant
    accents = Array("É", "È", "Ê", "Ë", "À", "Â", "Ä", "Ù", "Û", "Ü", "Î", "Ï", "Ô", "Ö", "Ç")
    plain = Array("E", "E", "E", "E", "A", "A", "A", "U", "U", "U", "I", "I", "O", "O", "C")
    
    Dim i As Long
    ReplaceAccents = textValue
    For i = LBound(accents) To UBound(accents)
        ReplaceAccents = Replace(ReplaceAccents, accents(i), plain(i))
        ReplaceAccents = Replace(ReplaceAccents, LCase$(accents(i)), plain(i))
    Next i
End Function

Private Sub SortStringArray(arr As Variant)
    If IsEmpty(arr) Then Exit Sub
    QuickSort arr, LBound(arr), UBound(arr)
End Sub

Private Sub QuickSort(arr As Variant, ByVal first As Long, ByVal last As Long)
    Dim pivot As String
    Dim temp As String
    Dim i As Long, j As Long
    
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
    
    If first < j Then QuickSort arr, first, j
    If i < last Then QuickSort arr, i, last
End Sub

Private Sub ResetSitePalette()
    Set siteColorMap = CreateObject("Scripting.Dictionary")
    siteColorMap.CompareMode = vbTextCompare
    Set siteLegend = CreateObject("Scripting.Dictionary")
    siteLegend.CompareMode = vbTextCompare
    sitePalette = Array( _
        RGB(255, 188, 121), _
        RGB(124, 197, 165), _
        RGB(146, 168, 209), _
        RGB(255, 214, 124), _
        RGB(110, 206, 218), _
        RGB(244, 167, 164), _
        RGB(179, 156, 208), _
        RGB(140, 207, 179))
    sitePaletteIndex = 0
End Sub

Private Function GetSiteColor(ByVal siteName As String) As Long
    If siteColorMap Is Nothing Then ResetSitePalette
    
    Dim key As String
    key = Trim$(UCase$(siteName))
    
    If Len(key) = 0 Then
        GetSiteColor = COLOR_AFFECTATION
        Exit Function
    End If
    
    If Not siteColorMap.Exists(key) Then
        Dim paletteSize As Long
        paletteSize = UBound(sitePalette) - LBound(sitePalette) + 1
        siteColorMap.Add key, sitePalette(sitePaletteIndex Mod paletteSize)
        If Not siteLegend.Exists(key) Then
            Dim displayName As String
            displayName = siteName
            If Len(displayName) = 0 Then displayName = "Site " & (siteLegend.count + 1)
            siteLegend.Add key, displayName
        End If
        sitePaletteIndex = sitePaletteIndex + 1
    End If
    
    GetSiteColor = siteColorMap(key)
End Function

Private Function AddSiteLegendRow(ws As Worksheet, startCol As Long) As Long
    Dim colPtr As Long
    colPtr = startCol
    
    If siteLegend Is Nothing Or siteLegend.count = 0 Then
        colPtr = WriteLegendChip(ws, colPtr, "Sites", COLOR_AFFECTATION)
    Else
        Dim keys As Variant
        keys = siteLegend.keys
        SortStringArray keys
        
        Dim key As Variant
        For Each key In keys
            colPtr = WriteLegendChip(ws, colPtr, siteLegend(key), siteColorMap(key))
        Next key
    End If
    
    AddSiteLegendRow = colPtr
End Function

Private Function WriteLegendChip(ws As Worksheet, colIndex As Long, label As String, _
                                 colorValue As Long) As Long
    With ws.Cells(LEGEND_ROW, colIndex)
        .value = label
        .Interior.color = colorValue
        .Borders.LineStyle = xlContinuous
        .Borders.color = COLOR_GRID_LIGHT
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.Size = 9
    End With
    WriteLegendChip = colIndex + 1
End Function

Private Function GetAbsenceColor(ByVal motif As String) As Long
    Dim txt As String
    txt = UCase$(Trim$(motif))
    
    If Len(txt) = 0 Then
        GetAbsenceColor = COLOR_ABS_AUTRE
        Exit Function
    End If
    
    If InStr(txt, "FORM") > 0 Then
        GetAbsenceColor = COLOR_ABS_FORMATION
    ElseIf InStr(txt, "MATERN") > 0 Then
        GetAbsenceColor = COLOR_ABS_MATERNITE
    ElseIf InStr(txt, "PATERN") > 0 Then
        GetAbsenceColor = COLOR_ABS_PATERNITE
    ElseIf InStr(txt, "PARENT") > 0 Then
        GetAbsenceColor = COLOR_ABS_PARENTAL
    ElseIf InStr(txt, "CP") > 0 Or _
           InStr(txt, "CONG") > 0 Then
        GetAbsenceColor = COLOR_ABS_CP
    ElseIf InStr(txt, "MALAD") > 0 Or _
            InStr(txt, "ARRET") > 0 Then
        GetAbsenceColor = COLOR_ABS_MALADIE
    Else
        GetAbsenceColor = COLOR_ABS_AUTRE
    End If
End Function

Private Sub ApplyCalendarBackground(ws As Worksheet, headerRow As Long, _
                                    firstDataRow As Long, lastRow As Long, _
                                    dayCount As Long, dayTypes() As String)
    Dim col As Long
    
    For col = 1 To dayCount
        Dim shadeColor As Long
        shadeColor = 0
        
        Select Case dayTypes(col)
            Case "HOL": shadeColor = COLOR_HOLIDAY
            Case "WE": shadeColor = COLOR_WEEKEND
        End Select
        
        Dim colIndex As Long
        colIndex = col + 1
        
        If shadeColor <> 0 Then
            ws.Cells(headerRow, colIndex).Interior.color = shadeColor
            
            Dim rng As Range, cell As Range
            Set rng = ws.Range(ws.Cells(firstDataRow, colIndex), ws.Cells(lastRow, colIndex))
            For Each cell In rng
                If cell.Interior.ColorIndex = xlColorIndexNone Or cell.Interior.color = 0 Then
                    cell.Interior.color = shadeColor
                    cell.Interior.Pattern = xlSolid
                Else
                    cell.Interior.Pattern = xlLightDown
                    cell.Interior.PatternColor = shadeColor
                    cell.Interior.PatternTintAndShade = 0
                End If
            Next cell
        Else
            ws.Cells(headerRow, colIndex).Interior.color = RGB(255, 255, 255)
            
            Dim rngClear As Range
            Set rngClear = ws.Range(ws.Cells(firstDataRow, colIndex), ws.Cells(lastRow, colIndex))
            rngClear.Interior.Pattern = xlSolid
        End If
    Next col
End Sub

Private Sub ApplyFreezePanes(ws As Worksheet)
    On Error Resume Next
    ws.Activate
    Application.ActiveWindow.FreezePanes = False
    ws.Cells(HEADER_ROW + 1, 2).Select
    Application.ActiveWindow.FreezePanes = True
    On Error GoTo 0
End Sub

Public Sub LancerGantt()
    GenererGanttAffectations
End Sub


