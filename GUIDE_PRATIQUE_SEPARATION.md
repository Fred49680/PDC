# 📋 GUIDE PRATIQUE - SÉPARATION DES FICHIERS EXCEL

## 🎯 OBJECTIF

Séparer votre fichier Excel en 2 fichiers :
1. **Fichier DONNEES** : Tables uniquement (sur serveur, lecture seule)
2. **Fichier INTERFACE** : Feuilles de saisie + PowerQuery + TCD (local par utilisateur)

---

## 📝 ÉTAPE 1 : PRÉPARATION (10 minutes)

### 1.1 Sauvegarder votre fichier actuel

1. Fermer Excel
2. Copier votre fichier actuel
3. Le renommer en `PlanDeCharge_ORIGINAL.xlsm`
4. Le garder comme sauvegarde

### 1.2 Identifier les tables à séparer

Liste des tables à copier dans le fichier DONNEES :
- `TblPeriodes` (Charge)
- `TblAffectations`
- `TblAbsences`
- `tblRessources`
- `tblAffaires`
- `TblTransferts`
- `TblInterims`
- `TblChantiers`
- `TblAlertes`

### 1.3 Identifier les feuilles à garder dans INTERFACE

Feuilles à garder dans le fichier INTERFACE :
- `Charge` (feuille de saisie)
- `Affectations` (feuille de saisie)
- `Absences` (feuille de saisie)
- `Transferts` (feuille de saisie)
- `Interims` (feuille de saisie)
- `Chantiers` (feuille de saisie)
- `Dashboard` (avec TCD)
- `Planning_Gantt`
- `Paramètres`

---

## 🔧 ÉTAPE 2 : CRÉER LE MODULE VBA (15 minutes)

### 2.1 Ouvrir l'éditeur VBA

1. Ouvrir votre fichier Excel
2. Appuyer sur `Alt + F11` pour ouvrir l'éditeur VBA
3. **Insert** → **Module**
4. Nommer le module : `ModuleSeparationFichiers`

### 2.2 Copier le code du module

Copier le code suivant dans le nouveau module :

```vba
' ModuleSeparationFichiers.bas
' Module pour séparer le fichier en DONNEES et INTERFACE

Option Explicit

' ============================================
' CONSTANTES
' ============================================
Private Const FICHIER_DONNEES As String = "PlanDeCharge_DONNEES.xlsm"
Private Const CHEMIN_SERVEUR As String = "\\Serveur\Partage\" ' À MODIFIER selon votre serveur

' Liste des tables à copier dans fichier DONNEES
Private Const TABLES_DONNEES As String = "TblPeriodes|TblAffectations|TblAbsences|tblRessources|tblAffaires|TblTransferts|TblInterims|TblChantiers|TblAlertes"

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
    Dim arrTables() As String
    Dim i As Long
    Dim cheminComplet As String
    Dim reponse As VbMsgBoxResult
    
    ' Désactiver optimisations
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    Application.Calculation = xlCalculationManual
    
    ' Demander le chemin du serveur
    Dim cheminServeur As String
    cheminServeur = InputBox("Entrez le chemin du serveur (ex: \\Serveur\Partage\)", "Chemin serveur", CHEMIN_SERVEUR)
    
    If cheminServeur = "" Then
        MsgBox "Opération annulée", vbInformation
        Exit Sub
    End If
    
    ' S'assurer que le chemin se termine par \
    If Right(cheminServeur, 1) <> "\" Then
        cheminServeur = cheminServeur & "\"
    End If
    
    ' Chemin complet
    cheminComplet = cheminServeur & FICHIER_DONNEES
    
    ' Vérifier si fichier existe déjà
    If Dir(cheminComplet) <> "" Then
        reponse = MsgBox("Le fichier DONNEES existe déjà." & vbCrLf & _
                        "Voulez-vous le remplacer ?" & vbCrLf & vbCrLf & _
                        "ATTENTION : Cette opération supprimera toutes les données existantes !", _
                        vbYesNo + vbQuestion + vbDefaultButton2, "Confirmation")
        
        If reponse = vbNo Then
            Exit Sub
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
    wbDonnees.Worksheets("Sheet1").Delete
    Application.DisplayAlerts = True
    On Error GoTo ErrHandler
    
    ' Sauvegarder et fermer
    wbDonnees.Save
    wbDonnees.Close SaveChanges:=False
    
    Application.StatusBar = False
    MsgBox "Fichier DONNEES créé avec succès !" & vbCrLf & vbCrLf & _
           "Chemin : " & cheminComplet & vbCrLf & vbCrLf & _
           "Vous pouvez maintenant nettoyer le fichier INTERFACE.", vbInformation
    
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
    
    MsgBox "Erreur lors de la création du fichier DONNEES :" & vbCrLf & _
           "Erreur " & Err.Number & " : " & Err.Description, vbCritical
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
    Dim tblDest As ListObject
    
    ' Copier les en-têtes et données
    Set rngSource = tblSource.Range
    
    ' Copier vers A1
    Set rngDest = wsDest.Range("A1")
    
    ' Copier les valeurs
    rngSource.Copy
    rngDest.PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False
    
    ' Créer la table structurée
    Dim nbLignes As Long
    Dim nbColonnes As Long
    
    nbLignes = rngSource.Rows.Count
    nbColonnes = rngSource.Columns.Count
    
    Set rngDest = wsDest.Range(rngDest, rngDest.Offset(nbLignes - 1, nbColonnes - 1))
    
    ' Supprimer la table si elle existe déjà
    On Error Resume Next
    wsDest.ListObjects(1).Delete
    On Error GoTo 0
    
    ' Créer la nouvelle table
    Set tblDest = wsDest.ListObjects.Add(xlSrcRange, rngDest, , xlYes)
    tblDest.Name = tblSource.Name
    
    ' Appliquer le style (optionnel)
    On Error Resume Next
    tblDest.TableStyle = tblSource.TableStyle
    On Error GoTo 0
End Sub

' ============================================
' FONCTION : Nettoyer fichier INTERFACE
' ============================================
Sub NettoyerFichierInterface()
    On Error GoTo ErrHandler
    
    Dim ws As Worksheet
    Dim arrTables() As String
    Dim i As Long
    Dim aSupprimer As Boolean
    Dim reponse As VbMsgBoxResult
    
    ' Confirmation
    reponse = MsgBox("Cette opération va supprimer les feuilles contenant les tables de données." & vbCrLf & vbCrLf & _
                     "Les tables suivantes seront supprimées :" & vbCrLf & _
                     TABLES_DONNEES & vbCrLf & vbCrLf & _
                     "Êtes-vous sûr de vouloir continuer ?", _
                     vbYesNo + vbQuestion + vbDefaultButton2, "Confirmation")
    
    If reponse = vbNo Then
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' Liste des tables à supprimer
    arrTables = Split(TABLES_DONNEES, "|")
    
    ' Parcourir toutes les feuilles
    Dim feuillesASupprimer As Collection
    Set feuillesASupprimer = New Collection
    
    For Each ws In ThisWorkbook.Worksheets
        ' Vérifier si c'est une feuille de données
        aSupprimer = False
        For i = LBound(arrTables) To UBound(arrTables)
            If ws.Name = arrTables(i) Then
                aSupprimer = True
                Exit For
            End If
        Next i
        
        ' Ajouter à la liste de suppression
        If aSupprimer Then
            feuillesASupprimer.Add ws
        End If
    Next ws
    
    ' Supprimer les feuilles
    For i = 1 To feuillesASupprimer.Count
        Application.StatusBar = "Suppression de la feuille : " & feuillesASupprimer(i).Name
        Application.DisplayAlerts = False
        feuillesASupprimer(i).Delete
        Application.DisplayAlerts = True
    Next i
    
    Application.StatusBar = False
    MsgBox "Fichier INTERFACE nettoyé avec succès !" & vbCrLf & vbCrLf & _
           "Les feuilles de données ont été supprimées." & vbCrLf & _
           "Vous devez maintenant modifier les PowerQuery pour pointer vers le fichier DONNEES.", vbInformation
    
    Exit Sub
    
ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Application.StatusBar = False
    MsgBox "Erreur lors du nettoyage :" & vbCrLf & _
           "Erreur " & Err.Number & " : " & Err.Description, vbCritical
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
    
    Set wb = ThisWorkbook
    arrTables = Split(TABLES_DONNEES, "|")
    
    msg = "Vérification des tables :" & vbCrLf & vbCrLf
    
    For i = LBound(arrTables) To UBound(arrTables)
        trouvee = False
        
        For Each ws In wb.Worksheets
            For Each tbl In ws.ListObjects
                If tbl.Name = arrTables(i) Then
                    trouvee = True
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
    
    MsgBox msg, vbInformation, "Vérification des tables"
End Sub
```

---

## 🚀 ÉTAPE 3 : EXÉCUTER LA SÉPARATION (5 minutes)

### 3.1 Vérifier les tables

1. Dans l'éditeur VBA, placer le curseur dans la fonction `VerifierTables`
2. Appuyer sur `F5` pour exécuter
3. Vérifier que toutes les tables sont trouvées

### 3.2 Créer le fichier DONNEES

1. Placer le curseur dans la fonction `CreerFichierDonnees`
2. Appuyer sur `F5` pour exécuter
3. Entrer le chemin du serveur quand demandé
4. Attendre la fin de l'opération (peut prendre quelques minutes)

### 3.3 Nettoyer le fichier INTERFACE

⚠️ **ATTENTION** : Faites une sauvegarde avant !

1. Placer le curseur dans la fonction `NettoyerFichierInterface`
2. Appuyer sur `F5` pour exécuter
3. Confirmer la suppression

---

## 🔗 ÉTAPE 4 : MODIFIER LES POWERQUERY (20 minutes)

### 4.1 Identifier les PowerQuery à modifier

Ouvrir chaque PowerQuery et identifier celles qui pointent vers les tables locales :
- `qry_CalOuvres` (peut rester local)
- `pqcharge` (Depliage_Semaine) → Modifier
- `pqchargedepliee` (tblChargeDepliee) → Modifier
- `pqressourcesemiane` (RessourcesParSemaine) → Modifier
- `pqabsencesemaine` (Depliage_Semaine_Absence) → Modifier

### 4.2 Modifier une PowerQuery

Exemple pour `pqcharge` :

1. **Données** → **Requêtes et connexions**
2. Clic droit sur `pqcharge` → **Modifier**
3. Dans l'éditeur PowerQuery, trouver la source
4. Remplacer la référence locale par :
   ```
   Excel.Workbook(File.Contents("\\Serveur\Partage\PlanDeCharge_DONNEES.xlsm"), null, true)
   ```
5. Sélectionner la table `TblPeriodes`
6. **Fermer et charger**

### 4.3 Répéter pour toutes les PowerQuery

Modifier chaque PowerQuery qui utilise les tables de données.

---

## 🔄 ÉTAPE 5 : CRÉER LE MODULE DE SYNCHRONISATION (Optionnel)

Si vous voulez synchroniser automatiquement les données, créer un module de synchronisation :

```vba
' ModuleSynchronisation.bas
' Module pour synchroniser les données entre INTERFACE et DONNEES

Option Explicit

Private Const FICHIER_DONNEES As String = "\\Serveur\Partage\PlanDeCharge_DONNEES.xlsm"
Private Const TIMEOUT_SEC As Long = 30

' ============================================
' FONCTION PRINCIPALE : Synchroniser données
' ============================================
Sub SynchroniserDonnees()
    On Error GoTo ErrHandler
    
    Dim wbDonnees As Workbook
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
    Application.Calculation = xlCalculationManual
    
    ' Afficher message
    Application.StatusBar = "Synchronisation en cours..."
    
    ' Ouvrir fichier DONNEES en mode exclusif
    Set wbDonnees = OuvrirFichierExclusif(FICHIER_DONNEES)
    
    If wbDonnees Is Nothing Then
        MsgBox "Impossible d'ouvrir le fichier DONNEES." & vbCrLf & _
               "Il est peut-être ouvert par un autre utilisateur.", vbExclamation
        Exit Sub
    End If
    
    ' Liste des tables à synchroniser
    arrTables = Split("TblPeriodes|TblAffectations|TblAbsences|tblRessources|tblAffaires|TblTransferts|TblInterims|TblChantiers|TblAlertes", "|")
    
    ' Synchroniser chaque table
    For i = LBound(arrTables) To UBound(arrTables)
        Application.StatusBar = "Synchronisation de " & arrTables(i) & " (" & (i + 1) & "/" & (UBound(arrTables) + 1) & ")"
        
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
    
    Application.StatusBar = False
    MsgBox "Synchronisation terminée en " & Format(Now - dateDebut, "nn:ss") & " secondes", vbInformation
    
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
    
    MsgBox "Erreur lors de la synchronisation :" & vbCrLf & _
           "Erreur " & Err.Number & " : " & Err.Description, vbCritical
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
    If tblSource.DataBodyRange Is Nothing Then
        nbLignesSource = 0
    Else
        nbLignesSource = tblSource.DataBodyRange.Rows.Count
    End If
    
    If tblDest.DataBodyRange Is Nothing Then
        nbLignesDest = 0
    Else
        nbLignesDest = tblDest.DataBodyRange.Rows.Count
    End If
    
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
' FONCTION : Trouver une table (réutilisée)
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
```

---

## ✅ ÉTAPE 6 : TESTER (10 minutes)

### 6.1 Tester le fichier DONNEES

1. Ouvrir le fichier DONNEES
2. Vérifier que toutes les tables sont présentes
3. Vérifier que les données sont correctes
4. Essayer de modifier une cellule (doit être protégée)

### 6.2 Tester le fichier INTERFACE

1. Ouvrir le fichier INTERFACE
2. Vérifier que les feuilles de saisie fonctionnent
3. Vérifier que les PowerQuery se rafraîchissent correctement
4. Vérifier que les TCD fonctionnent

### 6.3 Tester la synchronisation (si implémentée)

1. Modifier une donnée dans le fichier INTERFACE
2. Exécuter `SynchroniserDonnees`
3. Vérifier que les données sont bien synchronisées

---

## 📋 CHECKLIST FINALE

- [ ] Fichier DONNEES créé sur le serveur
- [ ] Toutes les tables sont présentes dans DONNEES
- [ ] Fichier INTERFACE nettoyé (feuilles de données supprimées)
- [ ] PowerQuery modifiées pour pointer vers DONNEES
- [ ] TCD fonctionnent correctement
- [ ] Feuilles de saisie fonctionnent
- [ ] Synchronisation testée (si implémentée)
- [ ] Sauvegarde de l'original conservée

---

## 🐛 DÉPANNAGE

### Erreur : "Table non trouvée"

- Vérifier que le nom de la table est exact (sensible à la casse)
- Exécuter `VerifierTables` pour voir quelles tables sont trouvées

### Erreur : "Chemin non valide"

- Vérifier que le chemin du serveur est accessible
- Vérifier les permissions d'accès au serveur
- Essayer d'ouvrir le dossier dans l'Explorateur Windows

### Erreur : "Fichier verrouillé"

- Fermer le fichier DONNEES s'il est ouvert
- Vérifier qu'aucun autre utilisateur ne l'utilise

### PowerQuery ne se rafraîchit pas

- Vérifier que le chemin vers le fichier DONNEES est correct
- Vérifier que le fichier DONNEES est accessible
- Vérifier que le nom de la table est correct dans PowerQuery

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :
1. Vérifier les messages d'erreur dans la fenêtre Debug VBA (Ctrl+G)
2. Vérifier que toutes les tables existent
3. Vérifier les permissions sur le serveur
4. Consulter le guide de fonctionnement pour les détails

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Guide pratique prêt à utiliser

