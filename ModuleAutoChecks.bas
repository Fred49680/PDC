Attribute VB_Name = "ModuleAutoChecks"

Option Explicit

' =======================================================================================
' MODULE : ModuleAutoChecks
' Objectif : Vérifications automatiques en arrière-plan (conflits, données orphelines, etc.)
'
' Fonctions fournies :
'     RunAutoChecks - Exécuter toutes les vérifications automatiques
'     CheckConflitsAuto - Vérifier les conflits automatiquement
'     CleanupOrphanedDataAuto - Nettoyer les données orphelines automatiquement
'
' =======================================================================================

Private Const AUTO_CHECK_ENABLED As Boolean = True
Private mLastFullCheck As Double
Private Const FULL_CHECK_INTERVAL_SEC As Long = 300

' =======================================================================================
' EXÉCUTER TOUTES LES VÉRIFICATIONS AUTOMATIQUES
' =======================================================================================
Public Sub RunAutoChecks()
    On Error Resume Next
    
    If Not AUTO_CHECK_ENABLED Then Exit Sub
    If ThisWorkbook.BusyGlobal Then Exit Sub
    
    Dim elapsed As Double: elapsed = Timer - mLastFullCheck
    
    If elapsed >= FULL_CHECK_INTERVAL_SEC Then
        Debug.Print "[ModuleAutoChecks] Vérifications automatiques complètes..."
        
        CheckConflitsAuto False
        'CleanupOrphanedDataAuto False
        
        mLastFullCheck = Timer
    Else
        CheckConflitsAuto False
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' VÉRIFIER LES CONFLITS AUTOMATIQUEMENT (SILENCIEUSE)
' =======================================================================================
Private Sub CheckConflitsAuto(Optional showMessages As Boolean = False)
    On Error Resume Next
    
    Dim conflits As Collection
    Set conflits = ModuleValidation.DétecterConflitsGlobaux()
    
    If conflits.count > 0 Then
        Debug.Print "[ModuleAutoChecks] " & conflits.count & " conflit(s) détecté(s)"
        
        If showMessages Then
            Dim msg As String
            msg = conflits.count & " conflit(s) d'affectation détecté(s) :" & vbCrLf & vbCrLf
            
            Dim i As Long
            For i = 1 To Application.Min(conflits.count, 10)
                msg = msg & "• " & conflits(i) & vbCrLf
            Next i
            
            If conflits.count > 10 Then
                msg = msg & vbCrLf & "... et " & (conflits.count - 10) & " autre(s) conflit(s)"
            End If
            
            MsgBox msg, vbExclamation, "Conflits d'Affectation"
        End If
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' NETTOYER LES DONNÉES ORPHELINES AUTOMATIQUEMENT (SILENCIEUSE)
' =======================================================================================
Private Sub CleanupOrphanedDataAuto(Optional showMessages As Boolean = False)
    On Error Resume Next
    
    Dim nbSupprimees As Long
    nbSupprimees = 0
    
    nbSupprimees = nbSupprimees + CleanupTableOrphaned("TblPeriodes")
    nbSupprimees = nbSupprimees + CleanupTableOrphaned("TblAffectations")
    
    If nbSupprimees > 0 Then
        Debug.Print "[ModuleAutoChecks] " & nbSupprimees & " ligne(s) orpheline(s) supprimée(s)"
        
        If showMessages Then
            MsgBox nbSupprimees & " ligne(s) orpheline(s) supprimée(s) automatiquement.", vbInformation
        End If
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' NETTOYER UNE TABLE (SOUS-PROCÉDURE)
' =======================================================================================
Private Function CleanupTableOrphaned(tableName As String) As Long
    On Error Resume Next
    
    Dim lo As ListObject
    Select Case UCase$(tableName)
        Case "TBLPERIODES"
            Set lo = ModuleExec.GetChargeTable()
        Case "TBLAFFECTATIONS"
            Set lo = ModuleExec.GetAffectationsTable()
        Case Else
            Exit Function
    End Select
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, count As Long
    count = 0
    
    For i = UBound(dataArr, 1) To LBound(dataArr, 1) Step -1
        Dim affID As String, siteVal As String
        affID = Trim$(CStr(dataArr(i, 1)))
        siteVal = Trim$(CStr(dataArr(i, 2)))
        
        If Not ModuleValidation.AffaireSiteExiste(affID, siteVal) Then
            lo.ListRows(i).Delete
            count = count + 1
            ModuleExec.InvalidateListObjectCache tableName
        End If
    Next i
    
    CleanupTableOrphaned = count
    On Error GoTo 0
End Function

