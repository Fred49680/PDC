Attribute VB_Name = "ModuleCalendar"

' =======================================================================================
' MODULE : ModuleCalendar
' Objectif : Gestion centralisée du calendrier (jours ouvrés, week-ends, fériés)
'            Utilise le cache en mémoire pour des performances optimales
' =======================================================================================
Option Explicit

' Variables privées
Private CalDict As Object          ' Scripting.Dictionary(Long -> clsCalDay)
Private CalLoaded As Boolean

' Constantes
Private Const BASE_DATE As Date = #12:00:00 AM#
Private Const DEBUG_CAL As Boolean = False

' =======================================================================================
' RÉINITIALISER LE CACHE
' =======================================================================================
Public Sub ResetCalendarCache()
    Set CalDict = Nothing
    CalLoaded = False
End Sub

' =======================================================================================
' CHARGER LE CALENDRIER
' =======================================================================================
Public Sub LoadCalendar(Optional ByVal ForceReload As Boolean = False)
    If CalLoaded And Not ForceReload Then Exit Sub

    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("qry_CalOuvres")
    On Error GoTo 0

    If ws Is Nothing Then
        Set CalDict = CreateObject("Scripting.Dictionary")
        CalDict.CompareMode = vbBinaryCompare
        CalLoaded = True
        Exit Sub
    End If

    Dim lo As ListObject
    On Error Resume Next
    If ws.ListObjects.count = 0 Then
        Set CalDict = CreateObject("Scripting.Dictionary")
        CalDict.CompareMode = vbBinaryCompare
        CalLoaded = True
        Exit Sub
    End If
    Set lo = ws.ListObjects(1)
    On Error GoTo 0
    
    If lo Is Nothing Then
        Set CalDict = CreateObject("Scripting.Dictionary")
        CalDict.CompareMode = vbBinaryCompare
        CalLoaded = True
        Exit Sub
    End If

    If lo.DataBodyRange Is Nothing Then
        Set CalDict = CreateObject("Scripting.Dictionary")
        CalDict.CompareMode = vbBinaryCompare
        CalLoaded = True
        Exit Sub
    End If

    On Error GoTo ErrLoadCalendar
    
    Dim arr As Variant
    arr = lo.DataBodyRange.Value2

    Dim idxDate As Long, idxWE As Long, idxHol As Long, idxBiz As Long
    Dim idxWS As Long, idxIsoYr As Long, idxIsoWk As Long
    
    With lo.ListColumns
        idxDate = GetColumnIndex(.Item("Date"), "Date")
        idxWE = GetColumnIndex(.Item("IsWeekend"), "IsWeekend")
        idxHol = GetColumnIndex(.Item("IsHoliday"), "IsHoliday")
        idxBiz = GetColumnIndex(.Item("IsBusinessDay"), "IsBusinessDay")
        idxWS = GetColumnIndex(.Item("WeekStart"), "WeekStart")
        idxIsoYr = GetColumnIndex(.Item("ISOYear"), "ISOYear")
        idxIsoWk = GetColumnIndex(.Item("ISOWeek"), "ISOWeek")
    End With

    If idxDate = 0 Or idxBiz = 0 Then
        GoTo ErrLoadCalendar
    End If

    Set CalDict = CreateObject("Scripting.Dictionary")
    CalDict.CompareMode = vbBinaryCompare

    Dim i As Long, key As Long
    Dim data As clsCalDay

    For i = 1 To UBound(arr, 1)
        If IsNumeric(arr(i, idxDate)) Then
            key = CLng(arr(i, idxDate))

            Set data = New clsCalDay
            data.IsWeekend = CBool(arr(i, idxWE))
            data.IsHoliday = CBool(arr(i, idxHol))
            data.IsBusiness = CBool(arr(i, idxBiz))
            If IsNumeric(arr(i, idxWS)) Then
                data.WeekStart = CLng(arr(i, idxWS))
            Else
                data.WeekStart = 0
            End If
            data.ISOYear = SafeCInt(arr(i, idxIsoYr))
            data.ISOWeek = SafeCInt(arr(i, idxIsoWk))

            Set CalDict(key) = data
        End If
    Next i

    CalLoaded = True
    If DEBUG_CAL Then Debug.Print "LoadCalendar - " & CalDict.count & " dates"
    Exit Sub
    
ErrLoadCalendar:
    If CalDict Is Nothing Then
        Set CalDict = CreateObject("Scripting.Dictionary")
        CalDict.CompareMode = vbBinaryCompare
    End If
    CalLoaded = True
    Err.Clear
End Sub

' =======================================================================================
' FONCTIONS PRIVÉES
' =======================================================================================
Private Function GetColumnIndex(col As ListColumn, name As String) As Long
    If col Is Nothing Then
        Err.Raise vbObjectError + 1, "LoadCalendar", "Colonne manquante: " & name
    End If
    GetColumnIndex = col.Index
End Function

Private Function SafeCInt(v As Variant) As Integer
    If IsNumeric(v) Then SafeCInt = CInt(v) Else SafeCInt = 0
End Function

Private Sub EnsureCalendar()
    If Not CalLoaded Then LoadCalendar
End Sub

' =======================================================================================
' FONCTIONS PUBLIQUES
' =======================================================================================
Public Function IsWeekend(ByVal d As Date) As Boolean
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then IsWeekend = CalDict(key).IsWeekend
End Function

Public Function IsHoliday(ByVal d As Date) As Boolean
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then IsHoliday = CalDict(key).IsHoliday
End Function

Public Function isBusinessDay(ByVal d As Date) As Boolean
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then isBusinessDay = CalDict(key).IsBusiness
End Function

Public Function GetWeekStart(ByVal d As Date) As Date
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then
        Dim wk As Long: wk = CalDict(key).WeekStart
        If wk > 0 Then
            GetWeekStart = BASE_DATE + wk
        Else
            GetWeekStart = d
        End If
    Else
        GetWeekStart = d
    End If
End Function

Public Function GetISOWeek(ByVal d As Date) As Long
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then GetISOWeek = CalDict(key).ISOWeek
End Function

Public Function GetISOYear(ByVal d As Date) As Long
    EnsureCalendar
    Dim key As Long: key = CLng(d)
    If CalDict.Exists(key) Then GetISOYear = CalDict(key).ISOYear
End Function

Public Function BusinessDaysBetween(ByVal d0 As Date, ByVal d1 As Date) As Long
    EnsureCalendar
    If CalDict Is Nothing Then
        BusinessDaysBetween = DateDiff("d", d0, d1) + 1
        Exit Function
    End If
    Dim start As Long, finish As Long, key As Long, cnt As Long
    start = CLng(d0)
    finish = CLng(d1)
    If finish < start Then Exit Function

    For key = start To finish
        If CalDict.Exists(key) Then
            If CalDict(key).IsBusiness Then cnt = cnt + 1
        End If
    Next key

    BusinessDaysBetween = cnt
End Function

Public Function NextBusinessDay(ByVal d As Date) As Date
    EnsureCalendar
    If CalDict Is Nothing Then
        NextBusinessDay = DateAdd("d", 1, d)
        Exit Function
    End If
    Dim key As Long: key = CLng(d) + 1
    Dim maxIterations As Long: maxIterations = 0
    Do While maxIterations < 365
        If Not CalDict.Exists(key) Then Exit Do
        If CalDict(key).IsBusiness Then Exit Do
        key = key + 1
        maxIterations = maxIterations + 1
    Loop
    If maxIterations >= 365 Or Not CalDict.Exists(key) Then
        NextBusinessDay = DateAdd("d", 1, d)
    Else
        NextBusinessDay = BASE_DATE + key
    End If
End Function

Public Function PrevBusinessDay(ByVal d As Date) As Date
    EnsureCalendar
    If CalDict Is Nothing Then
        PrevBusinessDay = DateAdd("d", -1, d)
        Exit Function
    End If
    Dim key As Long: key = CLng(d) - 1
    Dim maxIterations As Long: maxIterations = 0
    Do While maxIterations < 365
        If Not CalDict.Exists(key) Then Exit Do
        If CalDict(key).IsBusiness Then Exit Do
        key = key - 1
        maxIterations = maxIterations + 1
    Loop
    If maxIterations >= 365 Or Not CalDict.Exists(key) Then
        PrevBusinessDay = DateAdd("d", -1, d)
    Else
        PrevBusinessDay = BASE_DATE + key
    End If
End Function

Public Function Overlap(ByVal d0a As Date, ByVal d1a As Date, _
                        ByVal d0b As Date, ByVal d1b As Date) As Boolean
    Overlap = (d0a <= d1b And d0b <= d1a)
End Function

' =======================================================================================
' FONCTION DE TEST (DEBUG)
' =======================================================================================
Public Sub TestCalendar()
    LoadCalendar

    Dim testDate As Date: testDate = #1/14/2026#
    Dim key As Long: key = CLng(testDate)

    Debug.Print "Test date: "; testDate
    Debug.Print "Key: "; key
    Debug.Print "Exists: "; CalDict.Exists(key)
    Debug.Print "CalDict count: "; CalDict.count

    If CalDict.count > 0 Then
        Debug.Print "Première clé: "; CalDict.keys()(0)
        Debug.Print "Dernière clé: "; CalDict.keys()(CalDict.count - 1)
    End If

    If CalDict.Exists(key) Then
        Dim data As clsCalDay
        Set data = CalDict(key)
        Debug.Print "WeekStart: "; data.WeekStart
    Else
        Debug.Print "Date non trouvée dans le calendrier"
    End If
End Sub


