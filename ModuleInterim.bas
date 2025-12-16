
Option Explicit

' ============================================================================
' MODULE : ModuleInterim
' Objectif : Gérer les intérims et alertes de renouvellement de contrat
'
' Fonctions fournies :
'     VerifierEtAlerterRenouvellements - Vérifier et alerter les renouvellements
'     MettreAJourStatutsRenouvellement - Mettre à jour les statuts de renouvellement
'     DesactiverRessourcesExpirees - Désactiver les ressources expirées
'     GetInterimsTable - Récupérer la table des intérims
'
' ============================================================================

' ==== CONSTANTES ====
Private Const SHEET_INTERIMS As String = "Interims"
Private Const TBL_INTERIMS As String = "TblInterims"
Private Const JOURS_ALERTE_RENOUVELLEMENT As Long = 10  ' 10 jours ouvrés avant échéance

' Colonnes de TblInterims :
'   Ressource | Site | DateDebutContrat | DateFinContrat | ARenouveler | DateMiseAJour | Commentaire

' ============================================================================
' RÉCUPÉRER LA TABLE DES INTÉRIMS
' ============================================================================
Public Function GetInterimsTable() As ListObject
    ' MODIFIÉ : Utilise ModuleExec pour chercher dans le fichier DONNEES
    Set GetInterimsTable = ModuleExec.GetInterimsTable()
End Function

' ============================================================================
' CRÉER/MANTENIR LA FEUILLE ET TABLE DES INTÉRIMS
' ============================================================================
Private Sub EnsureInterimsSheetAndTable()
    On Error Resume Next
    
    ' MODIFIÉ : Vérifier d'abord si la table existe dans le fichier DONNEES
    Dim loDonnees As ListObject
    Set loDonnees = ModuleExec.GetInterimsTable()
    If Not loDonnees Is Nothing Then
        ' La table existe, vérifier si elle est dans DONNEES (pas dans ThisWorkbook)
        If loDonnees.Parent.Parent.name <> ThisWorkbook.name Then
            ' La table est dans DONNEES, ne pas créer de feuille dans ThisWorkbook
            Debug.Print "[EnsureInterimsSheetAndTable] Table trouvée dans fichier DONNEES - Pas de création de feuille locale"
            On Error GoTo 0
            Exit Sub
        End If
    End If
    
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_INTERIMS)
    
    ' Si la feuille n'existe pas, la créer
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.name = SHEET_INTERIMS
        Debug.Print "[EnsureInterimsSheetAndTable] Feuille '" & SHEET_INTERIMS & "' créée"
    End If
    
    ' Vérifier si la table existe
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_INTERIMS)
    On Error GoTo 0
    
    ' Si la table n'existe pas, la créer
    If lo Is Nothing Then
        ' Créer les en-têtes
        ws.Cells(1, 1).value = "Ressource"
        ws.Cells(1, 2).value = "Site"
        ws.Cells(1, 3).value = "DateDébutContrat"
        ws.Cells(1, 4).value = "DateFinContrat"
        ws.Cells(1, 5).value = "ARenouveler"
        ws.Cells(1, 6).value = "DateMiseAJour"
        ws.Cells(1, 7).value = "Commentaire"
        
        ' Style en-têtes
        With ws.Range(ws.Cells(1, 1), ws.Cells(1, 7))
            .Font.Bold = True
            .Interior.color = RGB(68, 114, 196)
            .Font.color = RGB(255, 255, 255)
        End With
        
        ' Créer la table
        Set lo = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(1, 7)), , xlYes)
        lo.name = TBL_INTERIMS
        lo.TableStyle = "TableStyleMedium2"
        
        Debug.Print "[EnsureInterimsSheetAndTable] Table '" & TBL_INTERIMS & "' créée"
    End If
    
    ' Appliquer la validation de données sur la colonne ARenouveler
    If Not lo Is Nothing Then
        Dim cARenouveler As Long
        cARenouveler = FindTableColumnIndex(lo, "ARenouveler")
        
        If cARenouveler > 0 Then
            ' Créer la liste des choix possibles
            Dim listeChoix As String
            listeChoix = "A renouveler,Oui,Non"
            
            ' Récupérer la colonne complète (en-tête + données)
            Dim colARenouveler As Range
            Set colARenouveler = lo.ListColumns(cARenouveler).Range
            
            ' Appliquer la validation sur toute la colonne (y compris les futures lignes)
            ' Utiliser une plage étendue pour couvrir les futures lignes (jusqu'à la ligne 1000)
            Dim validationRange As Range
            Dim firstRow As Long, lastRow As Long
            firstRow = colARenouveler.Row + 1  ' Commencer après l'en-tête
            lastRow = 1000  ' Jusqu'à la ligne 1000 pour couvrir les futures lignes
            Set validationRange = ws.Range(ws.Cells(firstRow, colARenouveler.Column), ws.Cells(lastRow, colARenouveler.Column))
            
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
            
            Debug.Print "[EnsureInterimsSheetAndTable] Validation de données appliquée sur colonne ARenouveler (lignes " & firstRow & " à " & lastRow & ")"
        End If
    End If
    
    On Error GoTo 0
End Sub

' ============================================================================
' INITIALISER LES INTÉRIMS DEPUIS tblRessources
' ============================================================================
Public Sub InitialiserInterims()
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[InitialiserInterims] START"
    
    Dim t1 As Double: t1 = Timer
    EnsureInterimsSheetAndTable
    Debug.Print "[InitialiserInterims] Step 1 - EnsureInterimsSheetAndTable : " & Format(Timer - t1, "0.000") & " sec"
    
    Dim t2 As Double: t2 = Timer
    Dim lo As ListObject
    Set lo = GetInterimsTable()
    If lo Is Nothing Then
        Debug.Print "[InitialiserInterims] Table TblInterims introuvable"
        Exit Sub
    End If
    
    If lo.DataBodyRange Is Nothing Then
        Debug.Print "[InitialiserInterims] Table TblInterims vide (aucune ligne existante)"
    Else
        Debug.Print "[InitialiserInterims] Table TblInterims contient " & lo.ListRows.count & " ligne(s) existante(s)"
    End If
    Debug.Print "[InitialiserInterims] Step 2 - GetInterimsTable : " & Format(Timer - t2, "0.000") & " sec"
    
    Dim t3 As Double: t3 = Timer
    Dim loRessources As ListObject
    Set loRessources = ModuleExec.GetRessourcesTable()
    If loRessources Is Nothing Or loRessources.DataBodyRange Is Nothing Then
        Debug.Print "[InitialiserInterims] Table tblRessources introuvable ou vide"
        Exit Sub
    End If
    Debug.Print "[InitialiserInterims] Step 3 - GetRessourcesTable : " & Format(Timer - t3, "0.000") & " sec"
    
    Dim t4 As Double: t4 = Timer
    Dim dataArr As Variant
    dataArr = loRessources.DataBodyRange.value
    Debug.Print "[InitialiserInterims] Step 4 - Chargement données : " & Format(Timer - t4, "0.000") & " sec"
    
    Dim t5 As Double: t5 = Timer
    Dim cNom As Long, cSite As Long, cDateFin As Long, cActif As Long, cTypeContrat As Long
    cNom = FindTableColumnIndex(loRessources, "NomPrenom")
    cSite = FindTableColumnIndex(loRessources, "Site")
    cDateFin = FindTableColumnIndex(loRessources, "DateFin")
    cActif = FindTableColumnIndex(loRessources, "Actif")
    
    cTypeContrat = FindTableColumnIndex(loRessources, "TypeContrat")
    If cTypeContrat = 0 Then
        cTypeContrat = FindTableColumnIndex(loRessources, "TypeContr")
    End If
    
    Debug.Print "[InitialiserInterims] Colonnes trouvées: Nom=" & cNom & " / Site=" & cSite & " / DateFin=" & cDateFin & " / TypeContrat=" & cTypeContrat
    Debug.Print "[InitialiserInterims] Step 5 - Recherche colonnes : " & Format(Timer - t5, "0.000") & " sec"
    
    If cNom = 0 Or cSite = 0 Then
        Debug.Print "[InitialiserInterims] Colonnes essentielles manquantes dans tblRessources"
        Exit Sub
    End If
    
    If cTypeContrat = 0 Then
        Debug.Print "[InitialiserInterims] Colonne 'TypeContrat'/'TypeContr' introuvable dans tblRessources"
        ' Lister les colonnes disponibles pour debug
        Dim j As Long
        Debug.Print "[InitialiserInterims] Colonnes disponibles dans tblRessources:"
        For j = 1 To loRessources.ListColumns.count
            Debug.Print "  - " & loRessources.ListColumns(j).name
        Next j
        Exit Sub
    End If
    
    ' Parcourir les ressources et créer/mettre à jour les intérims
    Dim i As Long, nbCrees As Long, nbMisesAJour As Long
    Dim nbRessourcesTotal As Long, nbRessourcesETT As Long, nbRessourcesETTavecDateFin As Long
    nbCrees = 0
    nbMisesAJour = 0
    nbRessourcesTotal = 0
    nbRessourcesETT = 0
    nbRessourcesETTavecDateFin = 0
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        Dim ressource As String, siteVal As String
        ressource = Trim$(CStr(dataArr(i, cNom)))
        siteVal = Trim$(CStr(dataArr(i, cSite)))
        
        If Len(ressource) = 0 Then GoTo NextRessource
        nbRessourcesTotal = nbRessourcesTotal + 1
        
        ' Filtrer : Ne prendre que les ressources avec TypeContrat = "ETT"
        Dim typeContrat As String
        typeContrat = ""
        If cTypeContrat > 0 And UBound(dataArr, 2) >= cTypeContrat Then
            typeContrat = Trim$(UCase$(CStr(dataArr(i, cTypeContrat))))
        End If
        
        ' Si TypeContrat n'est pas "ETT", ignorer cette ressource
        If typeContrat <> "ETT" Then GoTo NextRessource
        nbRessourcesETT = nbRessourcesETT + 1
        
        ' Récupérer DateFin si elle existe
        Dim dateFinContrat As Variant
        dateFinContrat = Empty
        Dim hasDateFin As Boolean: hasDateFin = False
        If cDateFin > 0 And UBound(dataArr, 2) >= cDateFin Then
            dateFinContrat = dataArr(i, cDateFin)
            If Not IsEmpty(dateFinContrat) And IsDate(dateFinContrat) Then
                hasDateFin = True
                nbRessourcesETTavecDateFin = nbRessourcesETTavecDateFin + 1
            End If
        End If
        
        ' Créer une entrée même si DateFin est vide
        ' Cela permet de suivre tous les intérims, même ceux sans date de fin définie
        
        Dim dateFin As Date
        If hasDateFin Then
            dateFin = CDate(dateFinContrat)
        Else
            ' Utiliser une date fictive pour FindInterimRow (qui cherche par date)
            ' On cherchera plutôt par ressource/site uniquement
            dateFin = #1/1/1900#
        End If
        
        ' Vérifier si l'intérim existe déjà (par ressource uniquement, car une ressource n'est que sur un site)
        ' On cherche toujours par ressource uniquement pour pouvoir mettre à jour la date si elle change
        Dim lrExistante As ListRow
        Set lrExistante = Nothing
        
        ' Toujours chercher par ressource uniquement (sans tenir compte de la date)
        ' Cela permet de modifier la date existante au lieu de créer un doublon
        Set lrExistante = FindInterimRowByRessourceOnly(lo, ressource)
        
        If lrExistante Is Nothing Then
            ' Créer un nouvel intérim
            Dim newRow As ListRow
            Set newRow = lo.ListRows.Add
            
            With newRow.Range
                .Cells(1, 1).value = ressource
                .Cells(1, 2).value = siteVal
                .Cells(1, 3).value = ""  ' DateDébutContrat (sera rempli manuellement si nécessaire)
                If hasDateFin Then
                    .Cells(1, 4).value = dateFin
                Else
                    .Cells(1, 4).value = ""  ' DateFinContrat vide si pas de DateFin dans tblRessources
                End If
                .Cells(1, 5).value = ""  ' ARenouveler (sera mis à jour automatiquement)
                .Cells(1, 6).value = Now
                .Cells(1, 7).value = "Initialisé depuis tblRessources" & IIf(hasDateFin, "", " (DateFin à renseigner)")
            End With
            
            ' Formater les dates
            With newRow.Range
                .Cells(1, 3).NumberFormat = "dd/mm/yyyy"
                If hasDateFin Then
                    .Cells(1, 4).NumberFormat = "dd/mm/yyyy"
                End If
                .Cells(1, 6).NumberFormat = "dd/mm/yyyy hh:mm"
            End With
            
            nbCrees = nbCrees + 1
        Else
            ' Mettre à jour DateFinContrat si elle a changé
            Dim cDateFinContrat As Long
            cDateFinContrat = FindTableColumnIndex(lo, "DateFinContrat")
            
            If cDateFinContrat > 0 Then
                Dim dateFinExistante As Variant
                dateFinExistante = lrExistante.Range(1, cDateFinContrat).value
                
                Dim needsUpdate As Boolean: needsUpdate = False
                
                If hasDateFin Then
                    ' Si on a une DateFin dans tblRessources, toujours mettre à jour si différente
                    If IsEmpty(dateFinExistante) Or Not IsDate(dateFinExistante) Then
                        needsUpdate = True
                    Else
                        ' Comparer les dates (tolérance 1 jour pour éviter problèmes de format)
                        If Abs(DateDiff("d", CDate(dateFinExistante), dateFin)) > 1 Then
                            needsUpdate = True
                        End If
                    End If
                Else
                    ' Si pas de DateFin dans tblRessources, ne pas écraser une DateFin existante dans TblInterims
                    ' (on laisse l'utilisateur la remplir manuellement)
                    needsUpdate = False
                End If
                
                If needsUpdate Then
                    lrExistante.Range(1, cDateFinContrat).value = dateFin
                    lrExistante.Range(1, cDateFinContrat).NumberFormat = "dd/mm/yyyy"
                    
                    Dim cDateMiseAJour As Long
                    cDateMiseAJour = FindTableColumnIndex(lo, "DateMiseAJour")
                    If cDateMiseAJour > 0 Then
                        lrExistante.Range(1, cDateMiseAJour).value = Now
                        lrExistante.Range(1, cDateMiseAJour).NumberFormat = "dd/mm/yyyy hh:mm"
                    End If
                    
                    nbMisesAJour = nbMisesAJour + 1
                End If
            End If
        End If
NextRessource:
    Next i
    
    Dim t6 As Double: t6 = Timer
    Debug.Print "[InitialiserInterims] Statistiques: " & nbRessourcesTotal & " ressource(s) totale(s), " & _
                nbRessourcesETT & " avec TypeContrat='ETT', " & _
                nbRessourcesETTavecDateFin & " avec TypeContrat='ETT' ET DateFin valide"
    Debug.Print "[InitialiserInterims] " & nbCrees & " intérim(s) créé(s), " & nbMisesAJour & " mis(e)(s) à jour"
    Debug.Print "[InitialiserInterims] Step 6 - Traitement ressources : " & Format(Timer - t6, "0.000") & " sec"
    
    ' Nettoyer les doublons après initialisation
    Dim t7 As Double: t7 = Timer
    NettoyerDoublonsInterims
    Debug.Print "[InitialiserInterims] Step 7 - Nettoyage doublons : " & Format(Timer - t7, "0.000") & " sec"
    
    Debug.Print "[InitialiserInterims] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[InitialiserInterims] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "InitialiserInterims", False
    Debug.Print "[InitialiserInterims] END (ERREUR) (" & Format(Timer - t0, "0.000") & " sec)"
    Err.Clear
End Sub

' ============================================================================
' SYNCHRONISER UNE RESSOURCE SPÉCIFIQUE DEPUIS tblRessources VERS TblInterims
' Utile pour synchronisation bidirectionnelle lors de modification DateFin
' ============================================================================
Public Sub SynchroniserRessourceVersInterims(ByVal ressource As String)
    On Error GoTo ErrHandler
    
    If Len(Trim$(ressource)) = 0 Then Exit Sub
    
    Debug.Print "[SynchroniserRessourceVersInterims] START pour " & ressource
    
    Dim loRessources As ListObject
    Set loRessources = ModuleExec.GetRessourcesTable()
    If loRessources Is Nothing Or loRessources.DataBodyRange Is Nothing Then
        Debug.Print "[SynchroniserRessourceVersInterims] Table tblRessources introuvable ou vide"
        Exit Sub
    End If
    
    Dim dataArr As Variant
    dataArr = loRessources.DataBodyRange.value
    
    Dim cNom As Long, cSite As Long, cDateFin As Long, cTypeContrat As Long
    cNom = FindTableColumnIndex(loRessources, "NomPrenom")
    cSite = FindTableColumnIndex(loRessources, "Site")
    cDateFin = FindTableColumnIndex(loRessources, "DateFin")
    cTypeContrat = FindTableColumnIndex(loRessources, "TypeContrat")
    If cTypeContrat = 0 Then
        cTypeContrat = FindTableColumnIndex(loRessources, "TypeContr")
    End If
    
    If cNom = 0 Or cSite = 0 Or cTypeContrat = 0 Then Exit Sub
    
    ' Chercher la ressource dans tblRessources
    Dim i As Long
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cNom))) = ressource Then
            Dim typeContrat As String
            typeContrat = ""
            If cTypeContrat > 0 And UBound(dataArr, 2) >= cTypeContrat Then
                typeContrat = Trim$(UCase$(CStr(dataArr(i, cTypeContrat))))
            End If
            
            ' Ne traiter que les ETT
            If typeContrat <> "ETT" Then Exit Sub
            
            Dim siteVal As String
            siteVal = Trim$(CStr(dataArr(i, cSite)))
            Dim dateFinVal As Variant
            dateFinVal = Empty
            Dim hasDateFin As Boolean: hasDateFin = False
            Dim dateFin As Date
            
            If cDateFin > 0 And UBound(dataArr, 2) >= cDateFin Then
                dateFinVal = dataArr(i, cDateFin)
                If Not IsEmpty(dateFinVal) And IsDate(dateFinVal) Then
                    hasDateFin = True
                    dateFin = CDate(dateFinVal)
                End If
            End If
            
            ' Mettre à jour TblInterims
            Dim lo As ListObject
            Set lo = GetInterimsTable()
            If lo Is Nothing Then Exit Sub
            
            ' Chercher la ligne existante
            Dim lrExistante As ListRow
            Set lrExistante = FindInterimRowByRessourceOnly(lo, ressource)
            
            If lrExistante Is Nothing Then
                ' Créer une nouvelle ligne
                Dim newRow As ListRow
                Set newRow = lo.ListRows.Add
                
                With newRow.Range
                    .Cells(1, 1).value = ressource
                    .Cells(1, 2).value = siteVal
                    .Cells(1, 3).value = ""
                    If hasDateFin Then
                        .Cells(1, 4).value = dateFin
                    Else
                        .Cells(1, 4).value = ""
                    End If
                    .Cells(1, 5).value = ""
                    .Cells(1, 6).value = Now
                    .Cells(1, 7).value = "Initialisé depuis tblRessources" & IIf(hasDateFin, "", " (DateFin à renseigner)")
                End With
                
                With newRow.Range
                    .Cells(1, 3).NumberFormat = "dd/mm/yyyy"
                    If hasDateFin Then
                        .Cells(1, 4).NumberFormat = "dd/mm/yyyy"
                    End If
                    .Cells(1, 6).NumberFormat = "dd/mm/yyyy hh:mm"
                End With
            Else
                ' Mettre à jour la ligne existante
                Dim cDateFinContrat As Long
                cDateFinContrat = FindTableColumnIndex(lo, "DateFinContrat")
                
                If cDateFinContrat > 0 Then
                    Dim dateFinExistante As Variant
                    dateFinExistante = lrExistante.Range(1, cDateFinContrat).value
                    
                    Dim needsUpdate As Boolean: needsUpdate = False
                    
                    If hasDateFin Then
                        If IsEmpty(dateFinExistante) Or Not IsDate(dateFinExistante) Then
                            needsUpdate = True
                        Else
                            If Abs(DateDiff("d", CDate(dateFinExistante), dateFin)) > 1 Then
                                needsUpdate = True
                            End If
                        End If
                    End If
                    
                    If needsUpdate Then
                        lrExistante.Range(1, cDateFinContrat).value = dateFin
                        lrExistante.Range(1, cDateFinContrat).NumberFormat = "dd/mm/yyyy"
                        
                        Dim cDateMiseAJour As Long
                        cDateMiseAJour = FindTableColumnIndex(lo, "DateMiseAJour")
                        If cDateMiseAJour > 0 Then
                            lrExistante.Range(1, cDateMiseAJour).value = Now
                            lrExistante.Range(1, cDateMiseAJour).NumberFormat = "dd/mm/yyyy hh:mm"
                        End If
                    End If
                End If
            End If
            
            Debug.Print "[SynchroniserRessourceVersInterims] Synchronisation OK pour " & ressource
            Exit Sub
        End If
    Next i
    
    Debug.Print "[SynchroniserRessourceVersInterims] Ressource " & ressource & " non trouvée dans tblRessources"
    Exit Sub
    
ErrHandler:
    Debug.Print "[SynchroniserRessourceVersInterims] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "SynchroniserRessourceVersInterims", False
    Err.Clear
End Sub

' ============================================================================
' VÉRIFIER ET ALERTER LES RENOUVELLEMENTS
' ============================================================================
Public Sub VerifierEtAlerterRenouvellements()
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[VerifierEtAlerterRenouvellements] START"
    
    Dim t1 As Double: t1 = Timer
    Dim lo As ListObject
    Set lo = GetInterimsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[VerifierEtAlerterRenouvellements] Table TblInterims introuvable ou vide"
        Exit Sub
    End If
    Debug.Print "[VerifierEtAlerterRenouvellements] Step 1 - GetInterimsTable : " & Format(Timer - t1, "0.000") & " sec"
    
    Dim t2 As Double: t2 = Timer
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    Debug.Print "[VerifierEtAlerterRenouvellements] Step 2 - Chargement données : " & Format(Timer - t2, "0.000") & " sec"
    
    Dim t3 As Double: t3 = Timer
    Dim cRes As Long, cSite As Long, cDateFin As Long, cARenouveler As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSite = FindTableColumnIndex(lo, "Site")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    cARenouveler = FindTableColumnIndex(lo, "ARenouveler")
    
    If cRes = 0 Or cSite = 0 Or cDateFin = 0 Then
        Debug.Print "[VerifierEtAlerterRenouvellements] Colonnes essentielles manquantes"
        Exit Sub
    End If
    Debug.Print "[VerifierEtAlerterRenouvellements] Step 3 - Recherche colonnes : " & Format(Timer - t3, "0.000") & " sec"
    
    Dim t4 As Double: t4 = Timer
    LoadCalendar
    Dim dateLimiteAlerte As Date
    
    ' Si on est avant le 1er janvier 2026, forcer la date limite au 1er janvier 2026
    ' Sinon, calculer normalement
    If Date < #1/1/2026# Then
        dateLimiteAlerte = #1/1/2026#
        Debug.Print "[VerifierEtAlerterRenouvellements] Date actuelle avant 2026, date limite forcée au 01/01/2026"
    Else
        ' Calculer la date limite : Date + JOURS_ALERTE_RENOUVELLEMENT jours ouvrés
        dateLimiteAlerte = Date
        Dim j As Long, nbJoursOuvres As Long
        nbJoursOuvres = 0
        
        ' Compter les jours ouvrés jusqu'à atteindre JOURS_ALERTE_RENOUVELLEMENT
        Do While nbJoursOuvres < JOURS_ALERTE_RENOUVELLEMENT
            On Error Resume Next
            Dim testDate As Date
            testDate = DateAdd("d", 1, dateLimiteAlerte)
            If Err.Number <> 0 Then
                Err.Clear
                testDate = dateLimiteAlerte + 1
            End If
            On Error GoTo ErrHandler
            
            ' Vérifier si c'est un jour ouvré
            Dim isBiz As Boolean
            isBiz = False
            On Error Resume Next
            isBiz = ModuleCalendar.isBusinessDay(testDate)
            If Err.Number <> 0 Then
                ' Si le calendrier ne contient pas cette date, utiliser une méthode simple
                Err.Clear
                ' Vérifier si c'est un week-end (samedi=6, dimanche=7 en mode lundi=1)
                Dim dayOfWeek As Long
                dayOfWeek = Weekday(testDate, vbMonday)
                If dayOfWeek < 6 Then
                    isBiz = True  ' Lundi à vendredi = jour ouvré (sans tenir compte des fériés)
                End If
            End If
            On Error GoTo ErrHandler
            
            If isBiz Then
                nbJoursOuvres = nbJoursOuvres + 1
            End If
            
            dateLimiteAlerte = testDate
            
            ' Sécurité : éviter boucle infinie
            If nbJoursOuvres = 0 And dateLimiteAlerte > DateAdd("d", 365, Date) Then
                ' Si après 365 jours on n'a toujours pas trouvé de jour ouvré, utiliser DateAdd simple
                dateLimiteAlerte = DateAdd("d", JOURS_ALERTE_RENOUVELLEMENT, Date)
                Exit Do
            End If
        Loop
        
        ' Vérifier si la date limite calculée est invalide (avant 2026) et la forcer au 1er janvier 2026
        If dateLimiteAlerte < #1/1/2026# Then
            dateLimiteAlerte = #1/1/2026#
            Debug.Print "[VerifierEtAlerterRenouvellements] Date limite invalide, forcée au 01/01/2026"
        End If
    End If
    
    Debug.Print "[VerifierEtAlerterRenouvellements] Step 4 - Calcul date limite : " & Format(Timer - t4, "0.000") & " sec"
    Debug.Print "[VerifierEtAlerterRenouvellements] Date limite alerte : " & Format$(dateLimiteAlerte, "dd/mm/yyyy")
    
    Dim t5 As Double: t5 = Timer
    Dim i As Long, nbAlertes As Long
    nbAlertes = 0
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Not IsDate(dataArr(i, cDateFin)) Then GoTo NextInterim
        
        Dim dateFinContrat As Date
        dateFinContrat = CDate(dataArr(i, cDateFin))
        
        If dateFinContrat >= Date And dateFinContrat <= dateLimiteAlerte Then
            Dim aRenouveler As String
            aRenouveler = ""
            If cARenouveler > 0 And UBound(dataArr, 2) >= cARenouveler Then
                aRenouveler = Trim$(UCase$(CStr(dataArr(i, cARenouveler))))
            End If
            
            If Len(aRenouveler) = 0 Then
                Dim lr As ListRow
                Set lr = lo.ListRows(i)
                
                If cARenouveler > 0 Then
                    lr.Range(1, cARenouveler).value = "A renouveler"
                    
                    Dim ressource As String, siteVal As String
                    ressource = Trim$(CStr(dataArr(i, cRes)))
                    siteVal = Trim$(CStr(dataArr(i, cSite)))
                    
                    ModuleAbsence.LoggerAlerte "RENOUVELLEMENT_A_VENIR", ressource, "", siteVal, "", _
                                               dateFinContrat, dateFinContrat, _
                                               "Date de fin de contrat approche : " & Format$(dateFinContrat, "dd/mm/yyyy")
                    
                    nbAlertes = nbAlertes + 1
                End If
            End If
        End If
NextInterim:
    Next i
    Debug.Print "[VerifierEtAlerterRenouvellements] Step 5 - Traitement intérims : " & Format(Timer - t5, "0.000") & " sec"
    
    Debug.Print "[VerifierEtAlerterRenouvellements] " & nbAlertes & " alerte(s) générée(s)"
    Debug.Print "[VerifierEtAlerterRenouvellements] END (" & Format(Timer - t0, "0.000") & " sec)"
    Exit Sub
    
ErrHandler:
    Debug.Print "[VerifierEtAlerterRenouvellements] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "VerifierEtAlerterRenouvellements", False
    Debug.Print "[VerifierEtAlerterRenouvellements] END (ERREUR) (" & Format(Timer - t0, "0.000") & " sec)"
    Err.Clear
End Sub

' ============================================================================
' METTRE À JOUR LES STATUTS DE RENOUVELLEMENT
' ============================================================================
Public Sub MettreAJourStatutsRenouvellement()
    On Error GoTo ErrHandler
    
    Dim t0 As Double: t0 = Timer
    Debug.Print "[MettreAJourStatutsRenouvellement] START"
    
    Dim t1 As Double: t1 = Timer
    Dim lo As ListObject
    Set lo = GetInterimsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[MettreAJourStatutsRenouvellement] Table TblInterims introuvable ou vide"
        Exit Sub
    End If
    Debug.Print "[MettreAJourStatutsRenouvellement] Step 1 - GetInterimsTable : " & Format(Timer - t1, "0.000") & " sec"
    
    Dim t3 As Double: t3 = Timer
    Dim cRes As Long, cSite As Long, cDateFin As Long, cARenouveler As Long, cDateDebut As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSite = FindTableColumnIndex(lo, "Site")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    cARenouveler = FindTableColumnIndex(lo, "ARenouveler")
    cDateDebut = FindTableColumnIndex(lo, "DateDébutContrat")
    
    If cRes = 0 Or cSite = 0 Or cDateFin = 0 Or cARenouveler = 0 Then
        Debug.Print "[MettreAJourStatutsRenouvellement] Colonnes essentielles manquantes"
        Exit Sub
    End If
    Debug.Print "[MettreAJourStatutsRenouvellement] Step 3 - Recherche colonnes : " & Format(Timer - t3, "0.000") & " sec"
    
    Dim t4 As Double: t4 = Timer
    LoadCalendar
    Dim i As Long, nbTraitees As Long
    nbTraitees = 0
    
    ' Parcourir les ListRows directement pour éviter les problèmes d'index
    ' Parcourir à l'envers pour éviter les problèmes si des lignes sont supprimées
    Dim maxRows As Long
    maxRows = lo.ListRows.count
    For i = maxRows To 1 Step -1
        Dim lr As ListRow
        On Error Resume Next
        Set lr = lo.ListRows(i)
        If Err.Number <> 0 Then
            Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR accès ListRow(" & i & "): " & Err.Description
            Err.Clear
            GoTo NextInterimMiseAJour
        End If
        On Error GoTo ErrHandler
        
        If lr Is Nothing Then GoTo NextInterimMiseAJour
        
        ' Vérifier que la ligne est toujours valide
        On Error Resume Next
        Dim testRange As Range
        Set testRange = lr.Range
        If Err.Number <> 0 Or testRange Is Nothing Then
            Debug.Print "[MettreAJourStatutsRenouvellement] Ligne " & i & " invalide, ignorée"
            Err.Clear
            GoTo NextInterimMiseAJour
        End If
        On Error GoTo ErrHandler
        
        ' Lire les valeurs depuis la ligne plutôt que le tableau
        Dim dateFinVal As Variant
        On Error Resume Next
        dateFinVal = lr.Range(1, cDateFin).value
        If Err.Number <> 0 Then
            Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR lecture DateFin (ligne " & i & "): " & Err.Description
            Err.Clear
            GoTo NextInterimMiseAJour
        End If
        On Error GoTo ErrHandler
        If Not IsDate(dateFinVal) Then GoTo NextInterimMiseAJour
        
        Dim dateFinContrat As Date
        dateFinContrat = CDate(dateFinVal)
        
        ' Vérifier si le contrat est expiré
        If dateFinContrat < Date Then
            Dim aRenouveler As String
            aRenouveler = ""
            Dim aRenouvelerVal As Variant
            aRenouvelerVal = lr.Range(1, cARenouveler).value
            If Not IsEmpty(aRenouvelerVal) Then
                aRenouveler = Trim$(UCase$(CStr(aRenouvelerVal)))
            End If
            
            Dim ressource As String, siteVal As String
            ressource = Trim$(CStr(lr.Range(1, cRes).value))
            siteVal = Trim$(CStr(lr.Range(1, cSite).value))
            
            ' Si ARenouveler = "Non" ou vide, désactiver la ressource
            If Len(aRenouveler) = 0 Or aRenouveler = "NON" Then
                ' Désactiver la ressource dans tblRessources
                DesactiverRessourceDansTblRessources ressource, siteVal, dateFinContrat
                
                ' Supprimer toutes les affectations après la date de fin
                SupprimerAffectationsApresDate ressource, siteVal, dateFinContrat
                
                ' Logger dans les alertes
                ModuleAbsence.LoggerAlerte "RESSOURCE_DESACTIVEE", ressource, "", siteVal, "", _
                                           dateFinContrat, dateFinContrat, _
                                           "Ressource désactivée : contrat expiré et non renouvelé"
                
                nbTraitees = nbTraitees + 1
            ElseIf aRenouveler = "OUI" Then
                ' Si renouvelé, mettre à jour DateFinContrat si DateDébutContrat existe
                If cDateDebut > 0 Then
                    Dim dateDebutContrat As Variant
                    On Error Resume Next
                    dateDebutContrat = lr.Range(1, cDateDebut).value
                    If Err.Number <> 0 Then
                        Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR lecture DateDébutContrat (ligne " & i & "): " & Err.Description
                        Err.Clear
                        GoTo NextInterimMiseAJour
                    End If
                    On Error GoTo ErrHandler
                    
                    If IsDate(dateDebutContrat) Then
                        Dim nouvDateFin As Date
                        Dim dureeContrat As Long
                        On Error Resume Next
                        dureeContrat = ModuleCalendar.BusinessDaysBetween(CDate(dateDebutContrat), dateFinContrat)
                        If Err.Number <> 0 Then
                            Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR BusinessDaysBetween: " & Err.Description
                            Err.Clear
                            dureeContrat = DateDiff("d", CDate(dateDebutContrat), dateFinContrat)
                        End If
                        On Error GoTo ErrHandler
                        
                        nouvDateFin = dateFinContrat
                        Dim k As Long
                        For k = 1 To dureeContrat
                            On Error Resume Next
                            nouvDateFin = ModuleCalendar.NextBusinessDay(nouvDateFin)
                            If Err.Number <> 0 Then
                                Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR NextBusinessDay (itération " & k & "): " & Err.Description
                                Err.Clear
                                nouvDateFin = DateAdd("d", 1, nouvDateFin)
                            End If
                            On Error GoTo ErrHandler
                        Next k
                        
                        ' Mettre à jour DateFinContrat
                        lr.Range(1, cDateFin).value = nouvDateFin
                        lr.Range(1, cDateFin).NumberFormat = "dd/mm/yyyy"
                        
                        ' Réinitialiser ARenouveler
                        lr.Range(1, cARenouveler).value = ""
                        
                        ' Mettre à jour DateMiseAJour
                        Dim cDateMiseAJour As Long
                        cDateMiseAJour = FindTableColumnIndex(lo, "DateMiseAJour")
                        If cDateMiseAJour > 0 Then
                            lr.Range(1, cDateMiseAJour).value = Now
                            lr.Range(1, cDateMiseAJour).NumberFormat = "dd/mm/yyyy hh:mm"
                        End If
                        
                        ' Logger dans les alertes
                        ModuleAbsence.LoggerAlerte "RENOUVELLEMENT_APPLIQUE", ressource, "", siteVal, "", _
                                                   nouvDateFin, nouvDateFin, _
                                                   "Contrat renouvelé : nouvelle date de fin " & Format$(nouvDateFin, "dd/mm/yyyy")
                        
                        nbTraitees = nbTraitees + 1
                    End If
                End If
            End If
        End If
NextInterimMiseAJour:
    Next i
    
    Debug.Print "[MettreAJourStatutsRenouvellement] " & nbTraitees & " intérim(s) traité(s)"
    Debug.Print "[MettreAJourStatutsRenouvellement] END"
    Exit Sub
    
ErrHandler:
    Debug.Print "[MettreAJourStatutsRenouvellement] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "MettreAJourStatutsRenouvellement", False
    Err.Clear
End Sub

' ============================================================================
' SYNCHRONISER TblInterims -> tblRessources (quand DateFinContrat change)
' ============================================================================
Private Sub SynchroniserInterimsVersRessources(ByVal Target As Range)
    On Error Resume Next
    
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_INTERIMS)
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Trouver la ligne modifiée
    Dim lr As ListRow
    Dim rowIndex As Long
    rowIndex = Target.Row - lo.DataBodyRange.Row + 1
    
    If rowIndex < 1 Or rowIndex > lo.ListRows.count Then Exit Sub
    Set lr = lo.ListRows(rowIndex)
    
    ' Récupérer les valeurs
    Dim cRes As Long, cSite As Long, cDateFin As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSite = FindTableColumnIndex(lo, "Site")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    
    If cRes = 0 Or cSite = 0 Or cDateFin = 0 Then Exit Sub
    
    Dim ressource As String, siteVal As String
    ressource = Trim$(CStr(lr.Range(1, cRes).value))
    siteVal = Trim$(CStr(lr.Range(1, cSite).value))
    Dim dateFinContrat As Variant
    dateFinContrat = lr.Range(1, cDateFin).value
    
    If Len(ressource) = 0 Or Len(siteVal) = 0 Then Exit Sub
    
    ' Mettre à jour tblRessources
    Dim loRessources As ListObject
    Set loRessources = ModuleExec.GetRessourcesTable()
    If loRessources Is Nothing Or loRessources.DataBodyRange Is Nothing Then Exit Sub
    
    Dim dataArr As Variant
    dataArr = loRessources.DataBodyRange.value
    
    Dim cNom As Long, cSiteRes As Long, cDateFinRes As Long, cTypeContrat As Long
    cNom = FindTableColumnIndex(loRessources, "NomPrenom")
    cSiteRes = FindTableColumnIndex(loRessources, "Site")
    cDateFinRes = FindTableColumnIndex(loRessources, "DateFin")
    cTypeContrat = FindTableColumnIndex(loRessources, "TypeContrat")
    If cTypeContrat = 0 Then
        cTypeContrat = FindTableColumnIndex(loRessources, "TypeContr")
    End If
    
    If cNom = 0 Or cSiteRes = 0 Or cDateFinRes = 0 Then Exit Sub
    
    Dim i As Long
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        ' Recherche uniquement par ressource (nom) car une ressource n'est que sur un site
        If Trim$(CStr(dataArr(i, cNom))) = ressource Then
            ' Vérifier que c'est bien un ETT
            Dim typeContrat As String
            typeContrat = ""
            If cTypeContrat > 0 And UBound(dataArr, 2) >= cTypeContrat Then
                typeContrat = Trim$(UCase$(CStr(dataArr(i, cTypeContrat))))
            End If
            
            If typeContrat = "ETT" Then
                ' Mettre à jour DateFin
                Dim lrRes As ListRow
                Set lrRes = loRessources.ListRows(i)
                
                If IsDate(dateFinContrat) Then
                    lrRes.Range(1, cDateFinRes).value = CDate(dateFinContrat)
                    lrRes.Range(1, cDateFinRes).NumberFormat = "dd/mm/yyyy"
                Else
                    ' Si DateFinContrat est vide dans TblInterims, ne pas écraser DateFin dans tblRessources
                End If
                
                ' Invalider le cache
                ModuleExec.InvalidateListObjectCache "tblRessources"
                Debug.Print "[SynchroniserInterimsVersRessources] DateFin mise à jour pour " & ressource
                Exit Sub
            End If
        End If
    Next i
    
    On Error GoTo 0
End Sub

' ============================================================================
' NETTOYER LES DOUBLONS DANS TblInterims
' ============================================================================
Public Sub NettoyerDoublonsInterims()
    On Error GoTo ErrHandler
    
    Debug.Print "[NettoyerDoublonsInterims] START"
    
    Dim lo As ListObject
    Set lo = GetInterimsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[NettoyerDoublonsInterims] Table TblInterims introuvable ou vide"
        Exit Sub
    End If
    
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim cRes As Long, cDateFin As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    
    If cRes = 0 Or cDateFin = 0 Then Exit Sub
    
    ' Parcourir à l'envers pour supprimer les doublons
    Dim i As Long, j As Long, nbSupprimees As Long
    nbSupprimees = 0
    
    For i = UBound(dataArr, 1) To LBound(dataArr, 1) + 1 Step -1
        Dim ressource1 As String
        ressource1 = Trim$(CStr(dataArr(i, cRes)))
        Dim dateFin1 As Variant
        dateFin1 = dataArr(i, cDateFin)
        
        If Len(ressource1) = 0 Then GoTo NextI
        
        ' Chercher les doublons dans les lignes précédentes (même ressource)
        For j = i - 1 To LBound(dataArr, 1) Step -1
            Dim ressource2 As String
            ressource2 = Trim$(CStr(dataArr(j, cRes)))
            Dim dateFin2 As Variant
            dateFin2 = dataArr(j, cDateFin)
            
            If ressource1 = ressource2 Then
                ' Doublon trouvé : comparer les dates
                Dim isDuplicate As Boolean: isDuplicate = False
                
                If IsEmpty(dateFin1) And IsEmpty(dateFin2) Then
                    ' Les deux ont DateFin vide : doublon
                    isDuplicate = True
                ElseIf IsDate(dateFin1) And IsDate(dateFin2) Then
                    ' Les deux ont une date : comparer (tolérance 1 jour)
                    If Abs(DateDiff("d", CDate(dateFin1), CDate(dateFin2))) <= 1 Then
                        isDuplicate = True
                    End If
                ElseIf IsEmpty(dateFin1) Or IsEmpty(dateFin2) Then
                    ' Un a DateFin vide, l'autre non : garder celui avec DateFin
                    If IsEmpty(dateFin1) Then
                        ' Supprimer la ligne i (celle sans DateFin)
                        isDuplicate = True
                    End If
                End If
                
                If isDuplicate Then
                    ' Supprimer la ligne i (la plus récente, donc en bas)
                    Dim lr As ListRow
                    Set lr = lo.ListRows(i)
                    lr.Delete
                    nbSupprimees = nbSupprimees + 1
                    Debug.Print "[NettoyerDoublonsInterims] Doublon supprimé : " & ressource1
                    GoTo NextI
                End If
            End If
        Next j
NextI:
    Next i
    
    If nbSupprimees > 0 Then
        ' Invalider le cache
        ModuleExec.InvalidateListObjectCache TBL_INTERIMS
        Debug.Print "[NettoyerDoublonsInterims] " & nbSupprimees & " doublon(s) supprimé(s)"
    Else
        Debug.Print "[NettoyerDoublonsInterims] Aucun doublon trouvé"
    End If
    
    Debug.Print "[NettoyerDoublonsInterims] END"
    Exit Sub
    
ErrHandler:
    Debug.Print "[NettoyerDoublonsInterims] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "NettoyerDoublonsInterims", False
    Err.Clear
End Sub

' ============================================================================
' DÉSACTIVER UNE RESSOURCE DANS tblRessources
' ============================================================================
Private Sub DesactiverRessourceDansTblRessources(ressource As String, siteVal As String, dateFin As Date)
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleExec.GetRessourcesTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cNom As Long, cSite As Long, cActif As Long
    cNom = FindTableColumnIndex(lo, "NomPrenom")
    cSite = FindTableColumnIndex(lo, "Site")
    cActif = FindTableColumnIndex(lo, "Actif")
    
    If cNom = 0 Or cSite = 0 Or cActif = 0 Then Exit Sub
    
    Dim i As Long
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        ' Recherche uniquement par ressource (nom) car une ressource n'est que sur un site
        If Trim$(CStr(dataArr(i, cNom))) = ressource Then
            ' Mettre à jour Actif = "NON"
            Dim lr As ListRow
            Set lr = lo.ListRows(i)
            lr.Range(1, cActif).value = "NON"
            
            ' Mettre à jour DateFin si elle existe
            Dim cDateFin As Long
            cDateFin = FindTableColumnIndex(lo, "DateFin")
            If cDateFin > 0 Then
                lr.Range(1, cDateFin).value = dateFin
                lr.Range(1, cDateFin).NumberFormat = "dd/mm/yyyy"
            End If
            
            ' Invalider le cache
            ModuleExec.InvalidateListObjectCache "tblRessources"
            
            Debug.Print "[DesactiverRessourceDansTblRessources] Ressource " & ressource & " désactivée"
            Exit Sub
        End If
    Next i
    
    On Error GoTo 0
End Sub

' ============================================================================
' SUPPRIMER TOUTES LES AFFECTATIONS APRÈS UNE DATE
' ============================================================================
Public Sub SupprimerAffectationsApresDate(ressource As String, siteVal As String, dateLimite As Date)
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleExec.GetAffectationsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Parcourir les affectations à l'envers pour supprimer
    Dim i As Long, nbSupprimees As Long
    nbSupprimees = 0
    
    For i = lo.ListRows.count To 1 Step -1
        Dim lr As ListRow
        Set lr = lo.ListRows(i)
        
        ' Recherche uniquement par ressource (nom) car une ressource n'est que sur un site
        If Trim$(CStr(lr.Range(1, 3).value)) = ressource Then
            
            If IsDate(lr.Range(1, 5).value) And IsDate(lr.Range(1, 6).value) Then
                Dim dateDebut As Date, dateFin As Date
                dateDebut = CDate(lr.Range(1, 5).value)
                dateFin = CDate(lr.Range(1, 6).value)
                
                ' Si la période commence après la date limite, supprimer complètement
                If dateDebut > dateLimite Then
                    ' Logger avant suppression
                    ModuleAbsence.LoggerAlerte "AFFECTATION_SUPPRIMEE", ressource, _
                                               Trim$(CStr(lr.Range(1, 1).value)), siteVal, _
                                               Trim$(CStr(lr.Range(1, 4).value)), _
                                               dateDebut, dateFin, _
                                               "Suppression automatique : ressource désactivée"
                    
                    lr.Delete
                    nbSupprimees = nbSupprimees + 1
                ' Si la période chevauche, ajuster la date de fin
                ElseIf dateDebut <= dateLimite And dateFin > dateLimite Then
                    ' Ajuster la date de fin à dateLimite
                    lr.Range(1, 6).value = dateLimite
                    
                    ' Logger
                    ModuleAbsence.LoggerAlerte "AFFECTATION_MODIFIEE", ressource, _
                                               Trim$(CStr(lr.Range(1, 1).value)), siteVal, _
                                               Trim$(CStr(lr.Range(1, 4).value)), _
                                               dateDebut, dateLimite, _
                                               "Date de fin ajustée : ressource désactivée"
                    
                    nbSupprimees = nbSupprimees + 1
                End If
            End If
        End If
    Next i
    
    If nbSupprimees > 0 Then
        ' Invalider le cache
        ModuleExec.InvalidateListObjectCache "TblAffectations"
        Debug.Print "[SupprimerAffectationsApresDate] " & nbSupprimees & " affectation(s) supprimée(s) ou modifiée(s)"
    End If
    
    On Error GoTo 0
End Sub

' ============================================================================
' DÉSACTIVER LES RESSOURCES EXPIRÉES
' ============================================================================
Public Sub DesactiverRessourcesExpirees()
    On Error GoTo ErrHandler
    
    Debug.Print "[DesactiverRessourcesExpirees] START"
    
    ' Appeler MettreAJourStatutsRenouvellement qui gère déjà la désactivation
    MettreAJourStatutsRenouvellement
    
    Debug.Print "[DesactiverRessourcesExpirees] END"
    Exit Sub
    
ErrHandler:
    Debug.Print "[DesactiverRessourcesExpirees] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "DesactiverRessourcesExpirees", False
    Err.Clear
End Sub

' ============================================================================
' GÉRER UNE MODIFICATION DANS LA TABLE TblInterims
' ============================================================================
Public Sub HandleInterimsTableChange(ByVal Target As Range)
    On Error GoTo ErrHandler
    
    ' Vérifier si c'est dans la table
    If Not IsInInterimsTable(Target) Then Exit Sub
    
    Debug.Print "[HandleInterimsTableChange] Modification dans TblInterims - " & Target.Address
    
    ' Si ARenouveler ou DateFinContrat a été modifié, vérifier les statuts
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_INTERIMS)
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Trouver la colonne modifiée
    Dim cARenouveler As Long, cDateFin As Long
    cARenouveler = FindTableColumnIndex(lo, "ARenouveler")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    
    If cARenouveler > 0 And Target.Column = lo.ListColumns(cARenouveler).Index Then
        ' Si ARenouveler a été modifié, vérifier les statuts
        MettreAJourStatutsRenouvellement
    ElseIf cDateFin > 0 And Target.Column = lo.ListColumns(cDateFin).Index Then
        ' Si DateFinContrat a été modifié, synchroniser vers tblRessources et vérifier les alertes
        SynchroniserInterimsVersRessources Target
        VerifierEtAlerterRenouvellements
    End If
    
    ' Marquer Dashboard et Gantt pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    ModuleExec.mGanttNeedsRefresh = True
    Debug.Print "[HandleInterimsTableChange] Modification enregistrée"
    ModuleExec.TriggerAutoChecks
    Exit Sub
    
ErrHandler:
    Debug.Print "[HandleInterimsTableChange] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleInterim", "HandleInterimsTableChange", False
    Err.Clear
End Sub

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblInterims
' ============================================================================
Private Function IsInInterimsTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> SHEET_INTERIMS Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_INTERIMS)
    On Error GoTo Quit
    
    If lo Is Nothing Then GoTo Quit
    If lo.DataBodyRange Is Nothing Then GoTo Quit
    
    ' Vérifier si la cellule est dans le DataBodyRange
    If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
        IsInInterimsTable = True
        Exit Function
    End If

Quit:
    IsInInterimsTable = False
End Function

' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM
' ============================================================================
Private Function FindInterimRow(lo As ListObject, ressource As String, siteVal As String, dateFin As Date) As ListRow
    ' Délègue à FindInterimRowByRessource (site non nécessaire car ressource unique par site)
    Set FindInterimRow = FindInterimRowByRessource(lo, ressource, dateFin)
End Function

' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM PAR RESSOURCE ET SITE (SANS DATE)
' ============================================================================
Private Function FindInterimRowByRessourceSite(lo As ListObject, ressource As String, siteVal As String) As ListRow
    On Error Resume Next
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cSite As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSite = FindTableColumnIndex(lo, "Site")
    
    If cRes = 0 Or cSite = 0 Then Exit Function
    
    Dim i As Long
    ressource = Trim$(ressource)
    siteVal = Trim$(siteVal)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRes))) = ressource And _
           Trim$(CStr(dataArr(i, cSite))) = siteVal Then
            ' Trouvé : retourner la première ligne correspondante
            Set FindInterimRowByRessourceSite = lo.ListRows(i)
            Exit Function
        End If
    Next i
    
    On Error GoTo 0
End Function

' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM PAR RESSOURCE ET SITE AVEC DATEFIN VIDE
' ============================================================================
' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM PAR RESSOURCE UNIQUEMENT
' ============================================================================
Private Function FindInterimRowByRessourceOnly(lo As ListObject, ressource As String) As ListRow
    On Error Resume Next
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    
    If cRes = 0 Then Exit Function
    
    Dim i As Long
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRes))) = ressource Then
            ' Trouvé : retourner la première ligne correspondante
            Set FindInterimRowByRessourceOnly = lo.ListRows(i)
            Exit Function
        End If
    Next i
    
    On Error GoTo 0
End Function

' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM PAR RESSOURCE ET DATE
' ============================================================================
Private Function FindInterimRowByRessource(lo As ListObject, ressource As String, dateFin As Date) As ListRow
    On Error Resume Next
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cDateFin As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    
    If cRes = 0 Or cDateFin = 0 Then Exit Function
    
    Dim i As Long
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRes))) = ressource Then
            If IsDate(dataArr(i, cDateFin)) Then
                Dim dFin As Date
                dFin = CDate(dataArr(i, cDateFin))
                
                ' Si la date de fin correspond (tolérance de 1 jour pour éviter problèmes de format)
                If Abs(DateDiff("d", dFin, dateFin)) <= 1 Then
                    Set FindInterimRowByRessource = lo.ListRows(i)
                    Exit Function
                End If
            End If
        End If
    Next i
    
    On Error GoTo 0
End Function

' ============================================================================
' TROUVER UNE LIGNE D'INTÉRIM PAR RESSOURCE AVEC DATEFIN VIDE
' ============================================================================
Private Function FindInterimRowByRessourceWithEmptyDate(lo As ListObject, ressource As String) As ListRow
    On Error Resume Next
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Function
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cDateFin As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cDateFin = FindTableColumnIndex(lo, "DateFinContrat")
    
    If cRes = 0 Or cDateFin = 0 Then Exit Function
    
    Dim i As Long
    ressource = Trim$(ressource)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cRes))) = ressource Then
            ' Vérifier si DateFinContrat est vide ou invalide
            Dim dateFinVal As Variant
            dateFinVal = dataArr(i, cDateFin)
            If IsEmpty(dateFinVal) Or Not IsDate(dateFinVal) Or CDate(dateFinVal) = #1/1/1900# Then
                Set FindInterimRowByRessourceWithEmptyDate = lo.ListRows(i)
                Exit Function
            End If
        End If
    Next i
    
    On Error GoTo 0
End Function

' ============================================================================
' FONCTION UTILITAIRE : Trouver l'index d'une colonne dans un ListObject
' ============================================================================
Private Function FindTableColumnIndex(lo As ListObject, header As String) As Long
    On Error Resume Next
    If lo Is Nothing Then Exit Function
    
    Dim i As Long
    Dim colCount As Long
    colCount = lo.ListColumns.count
    If Err.Number <> 0 Then
        Err.Clear
        Exit Function
    End If
    
    For i = 1 To colCount
        If StrComp(lo.ListColumns(i).name, header, vbTextCompare) = 0 Then
            FindTableColumnIndex = i
            Exit Function
        End If
    Next
    On Error GoTo 0
End Function

' Utilise ModuleExec.GetRessourcesTable, ModuleExec.GetAffectationsTable
' Utilise ModuleAbsence.LoggerAlerte
' Utilise ModuleErrorHandling.HandleError
' Utilise BusinessDaysBetween et NextBusinessDay de ModuleCalendar


