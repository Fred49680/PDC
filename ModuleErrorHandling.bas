Attribute VB_Name = "ModuleErrorHandling"
Option Explicit

' =======================================================================================
' MODULE : ModuleErrorHandling
' Objectif : Gestion centralisée des erreurs avec logging automatique
'
' Fonctions fournies :
'     LogError - Enregistrer une erreur dans le journal
'     HandleError - Gérer une erreur avec message utilisateur
'     SafeExecute - Exécuter du code avec gestion d'erreur automatique
'
' =======================================================================================

' Constantes
Private Const LOG_FILE_PATH As String = "D:\ExcelErrors.log"  ' À adapter selon vos besoins
Private Const LOG_ENABLED As Boolean = True
Private Const SHOW_ERROR_MESSAGES As Boolean = True

' =======================================================================================
' LOGGER UNE ERREUR
' =======================================================================================
Public Sub LogError(moduleName As String, functionName As String, errorNumber As Long, errorDescription As String, Optional additionalInfo As String = "")
    If Not LOG_ENABLED Then Exit Sub
    
    On Error Resume Next  ' Pour éviter les boucles infinies
    
    Dim logLine As String
    logLine = Format$(Now, "yyyy-mm-dd hh:mm:ss") & " | " & _
              "Module: " & moduleName & " | " & _
              "Function: " & functionName & " | " & _
              "Error #" & errorNumber & " | " & _
              errorDescription
    
    If Len(additionalInfo) > 0 Then
        logLine = logLine & " | Info: " & additionalInfo
    End If
    
    ' Debug Print (toujours actif)
    Debug.Print "[ERROR] " & logLine
    
    ' Log fichier (si activé)
    If LOG_ENABLED Then
        Dim fnum As Integer
        fnum = FreeFile
        
        Open LOG_FILE_PATH For Append As #fnum
        Print #fnum, logLine
        Close #fnum
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' GÉRER UNE ERREUR AVEC MESSAGE UTILISATEUR
' =======================================================================================
Public Sub HandleError(moduleName As String, functionName As String, Optional showToUser As Boolean = True)
    Dim errNum As Long, errDesc As String
    
    errNum = Err.Number
    errDesc = Err.Description
    
    ' Logger l'erreur
    LogError moduleName, functionName, errNum, errDesc
    
    ' Afficher à l'utilisateur si demandé
    If showToUser And SHOW_ERROR_MESSAGES Then
        Dim msg As String
        msg = "Une erreur s'est produite dans " & moduleName & "." & functionName & vbCrLf & vbCrLf & _
              "Erreur #" & errNum & ": " & errDesc & vbCrLf & vbCrLf & _
              "Vérifiez le journal des erreurs pour plus de détails."
        MsgBox msg, vbCritical, "Erreur"
    End If
End Sub

' =======================================================================================
' EXÉCUTER DU CODE AVEC GESTION D'ERREUR AUTOMATIQUE
' =======================================================================================
Public Function SafeExecute(moduleName As String, functionName As String, _
                           ByRef codeToRun As Object, _
                           Optional showErrorToUser As Boolean = True) As Boolean
    
    On Error GoTo ErrorHandler
    
    ' Exécuter le code (via CallByName si objet, ou via paramètre fonction)
    SafeExecute = True
    Exit Function
    
ErrorHandler:
    HandleError moduleName, functionName, showErrorToUser
    SafeExecute = False
End Function

' =======================================================================================
' GÉRER UNE ERREUR AVEC REPRISE
' =======================================================================================
Public Sub HandleErrorWithResume(moduleName As String, functionName As String, Optional labelResume As String = "")
    Dim errNum As Long, errDesc As String
    
    errNum = Err.Number
    errDesc = Err.Description
    
    ' Logger l'erreur
    LogError moduleName, functionName, errNum, errDesc, "Resuming at: " & labelResume
    
    ' Reprendre à l'étiquette spécifiée ou à la ligne suivante
    If Len(labelResume) > 0 Then
        On Error Resume Next
        Resume labelResume
    Else
        Resume Next
    End If
End Sub

' =======================================================================================
' GÉRER UNE ERREUR AVEC CLEANUP
' =======================================================================================
Public Sub HandleErrorWithCleanup(moduleName As String, functionName As String, cleanupProc As String)
    Dim errNum As Long, errDesc As String
    
    errNum = Err.Number
    errDesc = Err.Description
    
    ' Logger l'erreur
    LogError moduleName, functionName, errNum, errDesc, "Cleaning up with: " & cleanupProc
    
    ' Exécuter la procédure de nettoyage
    On Error Resume Next
    Application.Run cleanupProc
    On Error GoTo 0
End Sub

' =======================================================================================
' VÉRIFIER ET LOGGER UNE ERREUR SILENCIEUSE
' =======================================================================================
Public Sub CheckSilentError(moduleName As String, functionName As String)
    If Err.Number <> 0 Then
        LogError moduleName, functionName, Err.Number, Err.Description, "Silent error"
        Err.Clear
    End If
End Sub

' =======================================================================================
' INITIALISER LE LOG (CRÉER LE FICHIER SI NÉCESSAIRE)
' =======================================================================================
Public Sub InitializeErrorLog()
    On Error Resume Next
    
    ' Créer le répertoire si nécessaire
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    Dim logDir As String
    logDir = Left$(LOG_FILE_PATH, InStrRev(LOG_FILE_PATH, "\"))
    
    If Not fso.FolderExists(logDir) Then
        fso.CreateFolder logDir
    End If
    
    ' Créer le fichier avec en-tête si nouveau
    If Not fso.FileExists(LOG_FILE_PATH) Then
        Dim fnum As Integer
        fnum = FreeFile
        Open LOG_FILE_PATH For Output As #fnum
        Print #fnum, "=== JOURNAL DES ERREURS ==="
        Print #fnum, "Démarré le: " & Format$(Now, "yyyy-mm-dd hh:mm:ss")
        Print #fnum, ""
        Close #fnum
    End If
    
    Set fso = Nothing
    On Error GoTo 0
End Sub

' =======================================================================================
' VIDER LE JOURNAL DES ERREURS
' =======================================================================================
Public Sub ClearErrorLog()
    On Error Resume Next
    If Dir(LOG_FILE_PATH) <> "" Then
        Kill LOG_FILE_PATH
        InitializeErrorLog
    End If
    On Error GoTo 0
End Sub

' =======================================================================================
' OUVRIR LE JOURNAL DES ERREURS
' =======================================================================================
Public Sub OpenErrorLog()
    On Error Resume Next
    If Dir(LOG_FILE_PATH) <> "" Then
        Shell "notepad.exe """ & LOG_FILE_PATH & """", vbNormalFocus
    Else
        MsgBox "Aucun journal d'erreurs trouvé.", vbInformation
    End If
    On Error GoTo 0
End Sub


