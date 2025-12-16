# 💻 CODE D'IMPLÉMENTATION - SÉPARATION FICHIERS

## 📦 MODULE : ModuleSeparationFichiers

### Fonction principale : Créer le fichier DONNEES

```vba
' ModuleSeparationFichiers.bas

Option Explicit

' Constantes
Private Const FICHIER_DONNEES As String = "PlanDeCharge_DONNEES.xlsm"
Private Const FICHIER_INTERFACE As String = "PlanDeCharge_INTERFACE.xlsm"
Private Const CHEMIN_SERVEUR As String = "\\Serveur\Partage\"

' Liste des tables à copier dans fichier DONNEES
Private Const TABLES_DONNEES As String = "TblPeriodes|TblAffectations|TblAbsences|tblRessources|tblAffaires|TblTransferts|TblInterims|TblChantiers|TblAlertes"

' Liste des feuilles à garder dans fichier INTERFACE
Private Const FEUILLES_INTERFACE As String = "Charge|Affectations|Absences|Transferts|Interims|Chantiers|Dashboard|Planning_Gantt|Paramètres"

' ============================================
' FONCTION PRINCIPALE : Créer fichier DONNEES
' ============================================
Sub CreerFichierDonnees()
    On Error GoTo ErrHandler
    
    Dim wbDonnees As Workbook
    Dim wbSource As Workbook
    Dim wsSource As Worksheet
    Dim wsDonnees As Worksheet
    Dim tblSource As ListObject
    Dim tblDonnees As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim cheminComplet As String
    
    ' Désactiver optimisations pour cette opération
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    ' Chemin complet
    cheminComplet = CHEMIN_SERVEUR & FICHIER_DONNEES
    
    ' Vérifier si fichier existe déjà
    If Dir(cheminComplet) <> "" Then
        If MsgBox("Le fichier DONNEES existe déjà. Voulez-vous le remplacer ?", _
                  vbYesNo + vbQuestion, "Confirmation") = vbNo Then
            Exit Sub
        End If
        ' Supprimer l'ancien fichier
        Kill cheminComplet
    End If
    
    ' Créer nouveau fichier
    Set wbDonnees = Workbooks.Add
    wbDonnees.SaveAs cheminComplet, xlOpenXMLWorkbookMacroEnabled
    
    ' Référence au fichier source (fichier actuel)
    Set wbSource = ThisWorkbook
    
    ' Séparer les noms de tables
    arrTables = Split(TABLES_DONNEES, "|")
    
    ' Copier chaque table
    For i = LBound(arrTables) To UBound(arrTables)
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
        End If
    Next i
    
    ' Supprimer feuille par défaut
    On Error Resume Next
    Application.DisplayAlerts = False
    wbDonnees.Worksheets("Sheet1").Delete
    Application.DisplayAlerts = True
    On Error GoTo ErrHandler
    
    ' Sauvegarder et fermer
    wbDonnees.Save
    wbDonnees.Close SaveChanges:=False
    
    MsgBox "Fichier DONNEES créé avec succès : " & cheminComplet, vbInformation
    
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    
    MsgBox "Erreur lors de la création du fichier DONNEES : " & Err.Description, vbCritical
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
    Dim rngSource As Range
    Dim rngDest As Range
    
    ' Copier les en-têtes et données
    Set rngSource = tblSource.Range
    Set rngDest = wsDest.Range("A1")
    
    rngSource.Copy
    rngDest.PasteSpecial Paste:=xlPasteValues
    rngDest.PasteSpecial Paste:=xlPasteFormats
    
    ' Créer la table structurée
    Dim tblDest As ListObject
    Set rngDest = wsDest.Range(rngDest, rngDest.Offset(rngSource.Rows.Count - 1, rngSource.Columns.Count - 1))
    Set tblDest = wsDest.ListObjects.Add(xlSrcRange, rngDest, , xlYes)
    tblDest.Name = tblSource.Name
    
    ' Appliquer le style
    tblDest.TableStyle = tblSource.TableStyle
    
    Application.CutCopyMode = False
End Sub

' ============================================
' FONCTION : Nettoyer fichier INTERFACE
' ============================================
Sub NettoyerFichierInterface()
    On Error GoTo ErrHandler
    
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim aSupprimer As Boolean
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Liste des tables à supprimer (celles qui sont dans DONNEES)
    arrTables = Split(TABLES_DONNEES, "|")
    
    ' Parcourir toutes les feuilles
    For Each ws In ThisWorkbook.Worksheets
        ' Vérifier si c'est une feuille de données
        aSupprimer = False
        For i = LBound(arrTables) To UBound(arrTables)
            If ws.Name = arrTables(i) Then
                aSupprimer = True
                Exit For
            End If
        Next i
        
        ' Supprimer la feuille si c'est une table de données
        If aSupprimer Then
            Application.DisplayAlerts = False
            ws.Delete
            Application.DisplayAlerts = True
        End If
    Next ws
    
    ' Supprimer les PowerQuery qui pointent vers les tables locales
    Call SupprimerPowerQueryLocales
    
    MsgBox "Fichier INTERFACE nettoyé avec succès", vbInformation
    
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Erreur lors du nettoyage : " & Err.Description, vbCritical
End Sub

' ============================================
' FONCTION : Supprimer PowerQuery locales
' ============================================
Private Sub SupprimerPowerQueryLocales()
    ' Note : Cette fonction nécessite d'utiliser l'API PowerQuery
    ' Pour l'instant, on peut le faire manuellement dans Excel
    ' Ou utiliser un script PowerShell
    
    ' TODO : Implémenter suppression PowerQuery via VBA
    ' Cela nécessite d'accéder au modèle de données Excel
    
    MsgBox "Veuillez supprimer manuellement les PowerQuery qui pointent vers les tables locales." & vbCrLf & _
           "Puis recréer les PowerQuery pour pointer vers le fichier DONNEES.", vbInformation
End Sub
```

---

## 🔄 MODULE : ModuleSynchronisation

### Fonction principale : Synchroniser les données

```vba
' ModuleSynchronisation.bas

Option Explicit

Private Const FICHIER_DONNEES As String = "\\Serveur\Partage\PlanDeCharge_DONNEES.xlsm"
Private Const TIMEOUT_SEC As Long = 30

' ============================================
' FONCTION PRINCIPALE : Synchroniser données
' ============================================
Sub SynchroniserDonnees()
    On Error GoTo ErrHandler
    
    Dim wbDonnees As Workbook
    Dim wsSource As Worksheet
    Dim wsDest As Worksheet
    Dim tblSource As ListObject
    Dim tblDest As ListObject
    Dim arrTables() As String
    Dim i As Long
    Dim dateDebut As Date
    
    dateDebut = Now
    
    ' Désactiver optimisations
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    
    ' Afficher barre de progression
    Call AfficherBarreProgression("Synchronisation en cours...", 0, 100)
    
    ' Ouvrir fichier DONNEES en mode exclusif
    Set wbDonnees = OuvrirFichierExclusif(FICHIER_DONNEES)
    
    If wbDonnees Is Nothing Then
        MsgBox "Impossible d'ouvrir le fichier DONNEES. Il est peut-être ouvert par un autre utilisateur.", vbExclamation
        Exit Sub
    End If
    
    ' Liste des tables à synchroniser
    arrTables = Split("TblPeriodes|TblAffectations|TblAbsences|tblRessources|tblAffaires|TblTransferts|TblInterims|TblChantiers|TblAlertes", "|")
    
    ' Synchroniser chaque table
    For i = LBound(arrTables) To UBound(arrTables)
        Call AfficherBarreProgression("Synchronisation de " & arrTables(i), i, UBound(arrTables) - LBound(arrTables) + 1)
        
        ' Trouver table source
        Set tblSource = TrouverTable(ThisWorkbook, arrTables(i))
        
        If Not tblSource Is Nothing Then
            ' Trouver table destination
            Set tblDest = TrouverTable(wbDonnees, arrTables(i))
            
            If Not tblDest Is Nothing Then
                ' Synchroniser
                Call SynchroniserTable(tblSource, tblDest)
            End If
        End If
    Next i
    
    ' Sauvegarder et fermer
    wbDonnees.Save
    wbDonnees.Close SaveChanges:=False
    
    ' Fermer barre de progression
    Call FermerBarreProgression
    
    ' Rafraîchir PowerQuery dans fichier INTERFACE
    Call RafraichirPowerQuery
    
    MsgBox "Synchronisation terminée en " & Format(Now - dateDebut, "nn:ss") & " secondes", vbInformation
    
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Call FermerBarreProgression
    
    If Not wbDonnees Is Nothing Then
        On Error Resume Next
        wbDonnees.Close SaveChanges:=False
        On Error GoTo 0
    End If
    
    MsgBox "Erreur lors de la synchronisation : " & Err.Description, vbCritical
End Sub

' ============================================
' FONCTION : Ouvrir fichier en mode exclusif
' ============================================
Private Function OuvrirFichierExclusif(chemin As String) As Workbook
    On Error Resume Next
    
    Dim wb As Workbook
    Dim dateDebut As Date
    Dim timeout As Boolean
    
    dateDebut = Now
    timeout = False
    
    ' Essayer d'ouvrir le fichier
    Do
        Set wb = Workbooks.Open(chemin, ReadOnly:=False, _
                                UpdateLinks:=False, _
                                Notify:=False)
        
        If Not wb Is Nothing Then
            Set OuvrirFichierExclusif = wb
            Exit Function
        End If
        
        ' Vérifier timeout
        If (Now - dateDebut) * 86400 > TIMEOUT_SEC Then
            timeout = True
            Exit Do
        End If
        
        ' Attendre un peu
        Application.Wait Now + TimeValue("00:00:01")
    Loop
    
    If timeout Then
        Set OuvrirFichierExclusif = Nothing
    End If
End Function

' ============================================
' FONCTION : Synchroniser une table
' ============================================
Private Sub SynchroniserTable(tblSource As ListObject, tblDest As ListObject)
    On Error GoTo ErrHandler
    
    Dim rngSource As Range
    Dim rngDest As Range
    Dim nbLignesSource As Long
    Dim nbLignesDest As Long
    
    ' Compter les lignes
    nbLignesSource = tblSource.DataBodyRange.Rows.Count
    nbLignesDest = tblDest.DataBodyRange.Rows.Count
    
    ' Si table source vide, ne rien faire
    If nbLignesSource = 0 Then Exit Sub
    
    ' Supprimer toutes les lignes de destination
    If nbLignesDest > 0 Then
        tblDest.DataBodyRange.Delete
    End If
    
    ' Copier les données source vers destination
    Set rngSource = tblSource.DataBodyRange
    Set rngDest = tblDest.ListRows.Add.Range
    
    rngSource.Copy
    rngDest.PasteSpecial Paste:=xlPasteValues
    rngDest.PasteSpecial Paste:=xlPasteFormats
    
    Application.CutCopyMode = False
    
    Exit Sub
    
ErrHandler:
    Application.CutCopyMode = False
    Err.Raise Err.Number, "SynchroniserTable", "Erreur lors de la synchronisation de " & tblSource.Name & " : " & Err.Description
End Sub

' ============================================
' FONCTION : Rafraîchir PowerQuery
' ============================================
Private Sub RafraichirPowerQuery()
    On Error Resume Next
    
    Dim qt As QueryTable
    Dim conn As WorkbookConnection
    
    ' Rafraîchir toutes les connexions
    For Each conn In ThisWorkbook.Connections
        conn.Refresh
    Next conn
    
    ' Rafraîchir toutes les QueryTables
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        For Each qt In ws.QueryTables
            qt.Refresh BackgroundQuery:=False
        Next qt
    Next ws
End Sub

' ============================================
' FONCTIONS : Barre de progression
' ============================================
Private Sub AfficherBarreProgression(message As String, valeur As Long, maximum As Long)
    ' TODO : Implémenter UserForm avec barre de progression
    ' Pour l'instant, on utilise StatusBar
    Application.StatusBar = message & " (" & valeur & "/" & maximum & ")"
    DoEvents
End Sub

Private Sub FermerBarreProgression()
    Application.StatusBar = False
End Sub
```

---

## ⚡ MODULE : ModuleOptimisationsPartage

### Optimisations spécifiques pour fichier partagé

```vba
' ModuleOptimisationsPartage.bas

Option Explicit

Private mCalculOriginal As XlCalculation
Private mEventsOriginal As Boolean
Private mScreenOriginal As Boolean
Private mAlertsOriginal As Boolean

' ============================================
' FONCTION : Démarrer mode optimisé
' ============================================
Sub DemarrerModeOptimise()
    ' Sauvegarder état original
    mCalculOriginal = Application.Calculation
    mEventsOriginal = Application.EnableEvents
    mScreenOriginal = Application.ScreenUpdating
    mAlertsOriginal = Application.DisplayAlerts
    
    ' Désactiver tout
    Application.Calculation = xlCalculationManual
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Désactiver les recalculs automatiques sur toutes les feuilles
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.EnableCalculation = False
    Next ws
End Sub

' ============================================
' FONCTION : Arrêter mode optimisé
' ============================================
Sub ArreterModeOptimise()
    ' Restaurer état original
    Application.Calculation = mCalculOriginal
    Application.EnableEvents = mEventsOriginal
    Application.ScreenUpdating = mScreenOriginal
    Application.DisplayAlerts = mAlertsOriginal
    
    ' Réactiver les recalculs
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.EnableCalculation = True
    Next ws
    
    ' Recalculer seulement les formules modifiées
    Application.Calculate
End Sub

' ============================================
' FONCTION : Debounce pour événements
' ============================================
Private mDernierEvenement As Date
Private Const DEBOUNCE_MS As Long = 500 ' 500ms

Function DoitTraiterEvenement() As Boolean
    Dim maintenant As Date
    maintenant = Now
    
    ' Si moins de DEBOUNCE_MS depuis dernier événement, ignorer
    If (maintenant - mDernierEvenement) * 86400 * 1000 < DEBOUNCE_MS Then
        DoitTraiterEvenement = False
    Else
        mDernierEvenement = maintenant
        DoitTraiterEvenement = True
    End If
End Function

' ============================================
' FONCTION : Limiter rafraîchissements
' ============================================
Private mDernierRefresh As Date
Private Const REFRESH_COOLDOWN_SEC As Long = 300 ' 5 minutes

Function PeutRafraichir() As Boolean
    Dim maintenant As Date
    maintenant = Now
    
    ' Si moins de REFRESH_COOLDOWN_SEC depuis dernier refresh, ignorer
    If (maintenant - mDernierRefresh) * 86400 < REFRESH_COOLDOWN_SEC Then
        PeutRafraichir = False
    Else
        mDernierRefresh = maintenant
        PeutRafraichir = True
    End If
End Function
```

---

## 🔧 MODIFICATION : ModuleExec (optimisé)

### Modifier BeginFastExec et EndFastExec

```vba
' Dans ModuleExec.bas

' Ajouter ces variables au début du module
Private mNiveauOptimisation As Long ' Compteur pour gérer les appels imbriqués

' ============================================
' FONCTION : BeginFastExec (améliorée)
' ============================================
Sub BeginFastExec(Optional message As String = "")
    ' Incrémenter compteur
    mNiveauOptimisation = mNiveauOptimisation + 1
    
    ' Si premier niveau, appliquer optimisations
    If mNiveauOptimisation = 1 Then
        ' Sauvegarder état
        mCalculOriginal = Application.Calculation
        mEventsOriginal = Application.EnableEvents
        mScreenOriginal = Application.ScreenUpdating
        mAlertsOriginal = Application.DisplayAlerts
        
        ' Désactiver
        Application.Calculation = xlCalculationManual
        Application.EnableEvents = False
        Application.ScreenUpdating = False
        Application.DisplayAlerts = False
        
        ' Afficher message si fourni
        If message <> "" Then
            Application.StatusBar = message
        End If
    End If
End Sub

' ============================================
' FONCTION : EndFastExec (améliorée)
' ============================================
Sub EndFastExec()
    ' Décrémenter compteur
    mNiveauOptimisation = mNiveauOptimisation - 1
    
    ' Si dernier niveau, restaurer optimisations
    If mNiveauOptimisation = 0 Then
        ' Restaurer état
        Application.Calculation = mCalculOriginal
        Application.EnableEvents = mEventsOriginal
        Application.ScreenUpdating = mScreenOriginal
        Application.DisplayAlerts = mAlertsOriginal
        
        ' Recalculer seulement si nécessaire
        Application.Calculate
        
        ' Réinitialiser StatusBar
        Application.StatusBar = False
    ElseIf mNiveauOptimisation < 0 Then
        ' Erreur : plus d'appels EndFastExec que BeginFastExec
        mNiveauOptimisation = 0
        Debug.Print "[ModuleExec] ERREUR : Appel EndFastExec sans BeginFastExec correspondant"
    End If
End Sub
```

---

## 📝 GUIDE D'UTILISATION

### Pour l'administrateur

1. **Créer le fichier DONNEES** :
```vba
ModuleSeparationFichiers.CreerFichierDonnees
```

2. **Nettoyer le fichier INTERFACE** :
```vba
ModuleSeparationFichiers.NettoyerFichierInterface
```

3. **Modifier les PowerQuery** :
   - Ouvrir chaque PowerQuery
   - Changer la source pour pointer vers `\\Serveur\Partage\PlanDeCharge_DONNEES.xlsm`
   - Tester la connexion

### Pour les utilisateurs

1. **Synchroniser les données** :
   - Cliquer sur le bouton "Synchroniser" dans le fichier INTERFACE
   - OU exécuter : `ModuleSynchronisation.SynchroniserDonnees`

2. **Utilisation normale** :
   - Travailler dans le fichier INTERFACE (local)
   - Les données sont lues depuis le fichier DONNEES (serveur)
   - Synchroniser avant de fermer

---

## ⚠️ NOTES IMPORTANTES

### Sécurité

- Le fichier DONNEES doit être en **lecture seule** pour les utilisateurs
- Seul l'administrateur peut modifier le fichier DONNEES
- Les utilisateurs synchronisent via le fichier INTERFACE

### Performance

- Le fichier INTERFACE doit être **local** (copie par utilisateur)
- Le fichier DONNEES est sur le **serveur** (partagé en lecture seule)
- La synchronisation se fait **manuellement** (bouton)

### Maintenance

- **Backup quotidien** du fichier DONNEES
- **Archivage** des anciennes versions
- **Monitoring** des erreurs de synchronisation

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Code prêt à implémenter

