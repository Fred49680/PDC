
Option Explicit

' ============================================================================
' MODULE : ModuleTransfert
' Objectif : Gérer les transferts de ressources entre sites
'
' Fonctions fournies :
'     EnregistrerTransfert - Enregistrer un transfert de ressource
'     AppliquerTransfert - Appliquer un transfert (créer affectations)
'     GetTransfertsTable - Récupérer la table des transferts
'
' ============================================================================

' ==== CONSTANTES ====
Private Const SHEET_TRANSFERTS As String = "Transferts"
Private Const TBL_TRANSFERTS As String = "TblTransferts"

' Colonnes de TblTransferts :
'   Ressource | SiteOrigine | SiteDestination | DateDebut | DateFin | Statut | DateCreation | Utilisateur

' ============================================================================
' RÉCUPÉRER LA TABLE DES TRANSFERTS
' ============================================================================
Public Function GetTransfertsTable() As ListObject
    ' MODIFIÉ : Utilise ModuleExec pour chercher dans le fichier DONNEES
    Set GetTransfertsTable = ModuleExec.GetTransfertsTable()
End Function

' ============================================================================
' INITIALISER LES TRANSFERTS (AU DÉMARRAGE)
' ============================================================================
Public Sub InitialiserTransferts()
    On Error GoTo ErrHandler
    
    Debug.Print "[InitialiserTransferts] START"
    
    ' Créer la feuille et table si nécessaire
    EnsureTransfertsSheetAndTable
    
    Debug.Print "[InitialiserTransferts] END"
    Exit Sub
    
ErrHandler:
    Debug.Print "[InitialiserTransferts] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleTransfert", "InitialiserTransferts", False
    Err.Clear
End Sub

' ============================================================================
' CRÉER/MANTENIR LA FEUILLE ET TABLE DES TRANSFERTS
' ============================================================================
Private Sub EnsureTransfertsSheetAndTable()
    On Error Resume Next
    
    ' MODIFIÉ : Vérifier d'abord si la table existe dans le fichier DONNEES
    Dim loDonnees As ListObject
    Set loDonnees = ModuleExec.GetTransfertsTable()
    If Not loDonnees Is Nothing Then
        ' La table existe, vérifier si elle est dans DONNEES (pas dans ThisWorkbook)
        If loDonnees.Parent.Parent.name <> ThisWorkbook.name Then
            ' La table est dans DONNEES, ne pas créer de feuille dans ThisWorkbook
            Debug.Print "[EnsureTransfertsSheetAndTable] Table trouvée dans fichier DONNEES - Pas de création de feuille locale"
            On Error GoTo 0
            Exit Sub
        End If
    End If
    
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(SHEET_TRANSFERTS)
    
    ' Si la feuille n'existe pas, la créer
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add
        ws.name = SHEET_TRANSFERTS
        Debug.Print "[EnsureTransfertsSheetAndTable] Feuille '" & SHEET_TRANSFERTS & "' créée"
    End If
    
    ' Vérifier si la table existe
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_TRANSFERTS)
    Dim tableExists As Boolean
    tableExists = (Not lo Is Nothing)
    On Error GoTo 0
    
    ' Si la table n'existe pas, la créer
    If Not tableExists Then
        ' Vérifier si des données existent déjà dans la feuille (lignes 2 et suivantes)
        Dim hasExistingData As Boolean
        hasExistingData = False
        On Error Resume Next
        If ws.Cells(2, 1).value <> "" Or ws.Cells(2, 2).value <> "" Then
            hasExistingData = True
        End If
        On Error GoTo 0
        
        ' Si des données existent, ne pas écraser les en-têtes existants
        ' Sinon, créer les en-têtes
        If Not hasExistingData Then
            ' Créer les en-têtes
            ws.Cells(1, 1).value = "Ressource"
            ws.Cells(1, 2).value = "SiteOrigine"
            ws.Cells(1, 3).value = "SiteDestination"
            ws.Cells(1, 4).value = "DateDébut"
            ws.Cells(1, 5).value = "DateFin"
            ws.Cells(1, 6).value = "Statut"
            ws.Cells(1, 7).value = "DateCréation"
            ws.Cells(1, 8).value = "Utilisateur"
        End If
        
        ' Style en-têtes (même si les en-têtes existent déjà)
        With ws.Range(ws.Cells(1, 1), ws.Cells(1, 8))
            .Font.Bold = True
            .Interior.color = RGB(68, 114, 196)
            .Font.color = RGB(255, 255, 255)
        End With
        
        ' Créer la table (inclure les données existantes si elles existent)
        Dim lastRow As Long
        lastRow = ws.Cells(ws.Rows.count, 1).End(xlUp).Row
        If lastRow < 1 Then lastRow = 1
        
        Set lo = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, 8)), , xlYes)
        lo.name = TBL_TRANSFERTS
        lo.TableStyle = "TableStyleMedium2"
        
        Debug.Print "[EnsureTransfertsSheetAndTable] Table '" & TBL_TRANSFERTS & "' créée (lignes 1 à " & lastRow & ")"
    Else
        Debug.Print "[EnsureTransfertsSheetAndTable] Table '" & TBL_TRANSFERTS & "' existe déjà"
    End If
    
    ' Appliquer la validation de données sur la colonne Statut
    If Not lo Is Nothing Then
        Dim cStatut As Long
        cStatut = FindTableColumnIndex(lo, "Statut")
        
        If cStatut > 0 Then
            ' Créer la liste des choix possibles
            Dim listeChoix As String
            listeChoix = "Planifié,Appliqué"
            
            ' Récupérer la colonne complète (en-tête + données)
            Dim colStatut As Range
            Set colStatut = lo.ListColumns(cStatut).Range
            
            ' Appliquer la validation sur toute la colonne (y compris les futures lignes)
            Dim validationRange As Range
            Dim firstRow As Long
            firstRow = colStatut.Row + 1  ' Commencer après l'en-tête
            lastRow = 1000  ' Jusqu'à la ligne 1000 pour couvrir les futures lignes
            Set validationRange = ws.Range(ws.Cells(firstRow, colStatut.Column), ws.Cells(lastRow, colStatut.Column))
            
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
            
            Debug.Print "[EnsureTransfertsSheetAndTable] Validation de données appliquée sur colonne Statut (lignes " & firstRow & " à " & lastRow & ")"
        End If
    End If
    
    On Error GoTo 0
End Sub

' ============================================================================
' ENREGISTRER UN TRANSFERT
' ============================================================================
Public Sub EnregistrerTransfert(ressource As String, siteOrigine As String, _
                                siteDestination As String, dateDebut As Date, _
                                dateFin As Date, Optional statut As String = "Planifié")
    On Error GoTo ErrHandler

    ressource = NormalizeRessourceLabel(ressource)
    Debug.Print "[EnregistrerTransfert] START - " & ressource & " / " & siteOrigine & " -> " & siteDestination
    
    ' Créer la feuille et table si nécessaire
    EnsureTransfertsSheetAndTable
    Debug.Print "[EnregistrerTransfert] Step 1 - Table assurée"
    
    Dim lo As ListObject
    Set lo = GetTransfertsTable()
    If lo Is Nothing Then
        MsgBox "Impossible de créer ou accéder à la table TblTransferts.", vbCritical
        Exit Sub
    End If
    Debug.Print "[EnregistrerTransfert] Step 2 - TblTransferts OK"
    
    ' Vérifier que les dates sont valides
    If dateFin < dateDebut Then
        MsgBox "La date de fin doit être postérieure à la date de début.", vbExclamation
        Exit Sub
    End If
    
    ' Vérifier que la ressource existe
    Dim loRessources As ListObject
    Set loRessources = ModuleExec.GetRessourcesTable()
    If loRessources Is Nothing Then
        MsgBox "Table tblRessources introuvable.", vbCritical
        Exit Sub
    End If
    Debug.Print "[EnregistrerTransfert] Step 3 - tblRessources OK"
    
    ' Vérifier que la ressource est active et sur le site d'origine
    Dim ressourceTrouvee As Boolean: ressourceTrouvee = False
    Dim i As Long
    Dim dataArr As Variant
    If Not loRessources.DataBodyRange Is Nothing Then
        dataArr = loRessources.DataBodyRange.value
        Dim cNom As Long, cSite As Long, cActif As Long
        cNom = FindTableColumnIndex(loRessources, "NomPrenom")
        cSite = FindTableColumnIndex(loRessources, "Site")
        cActif = FindTableColumnIndex(loRessources, "Actif")
        
        If cNom > 0 And cSite > 0 And cActif > 0 Then
            For i = LBound(dataArr, 1) To UBound(dataArr, 1)
                If StrComp(NormalizeRessourceLabel(CStr(dataArr(i, cNom))), ressource, vbTextCompare) = 0 And _
                   Trim$(CStr(dataArr(i, cSite))) = siteOrigine And _
                   UCase$(Trim$(CStr(dataArr(i, cActif)))) = "OUI" Then
                    ressourceTrouvee = True
                    Exit For
                End If
            Next i
        End If
    End If
    
    If Not ressourceTrouvee Then
        MsgBox "Ressource '" & ressource & "' introuvable ou inactive sur le site '" & siteOrigine & "'.", vbExclamation
        Exit Sub
    End If
    Debug.Print "[EnregistrerTransfert] Step 4 - Ressource validée"
    
    ' Ajouter le transfert
    Dim newRow As ListRow
    Set newRow = lo.ListRows.Add
    Debug.Print "[EnregistrerTransfert] Step 5 - Ligne ajoutée"
    
    With newRow.Range
        .Cells(1, 1).value = ressource
        .Cells(1, 2).value = siteOrigine
        .Cells(1, 3).value = siteDestination
        .Cells(1, 4).value = dateDebut
        .Cells(1, 5).value = dateFin
        .Cells(1, 6).value = statut
        .Cells(1, 7).value = Now
        .Cells(1, 8).value = Environ("USERNAME")
    End With
    
    ' Formater les dates
    With newRow.Range
        .Cells(1, 4).NumberFormat = "dd/mm/yyyy"
        .Cells(1, 5).NumberFormat = "dd/mm/yyyy"
        .Cells(1, 7).NumberFormat = "dd/mm/yyyy hh:mm"
    End With
    
    Debug.Print "[EnregistrerTransfert] Transfert enregistré : " & ressource & " de " & siteOrigine & " vers " & siteDestination & " (" & Format$(dateDebut, "dd/mm/yyyy") & " - " & Format$(dateFin, "dd/mm/yyyy") & ")"
    
    ' Logger dans les alertes
    ModuleAbsence.LoggerAlerte "TRANSFERT_ENREGISTRE", ressource, "", siteOrigine, "", _
                               dateDebut, dateFin, "Transfert vers " & siteDestination & " : " & statut
    
    ' Si statut = "Appliqué", appliquer le transfert immédiatement
    If UCase$(Trim$(statut)) = "APPLIQUE" Then
        AppliquerTransfert ressource, siteOrigine, siteDestination, dateDebut, dateFin
    End If
    
    Exit Sub
    
ErrHandler:
    Debug.Print "[EnregistrerTransfert] ERREUR : " & Err.Number & " - " & Err.Description & " (ligne " & Erl & ")"
    ModuleErrorHandling.HandleError "ModuleTransfert", "EnregistrerTransfert", True
    Err.Clear
End Sub

' ============================================================================
' APPLIQUER UN TRANSFERT (créer affectations sur le site de destination)
' ============================================================================
Public Sub AppliquerTransfert(ressource As String, siteOrigine As String, _
                              siteDestination As String, dateDebut As Date, _
                              dateFin As Date)
    On Error GoTo ErrHandler

    ressource = NormalizeRessourceLabel(ressource)
    
    Debug.Print "[AppliquerTransfert] START - " & ressource & " de " & siteOrigine & " vers " & siteDestination & " (" & Format$(dateDebut, "dd/mm/yyyy") & " - " & Format$(dateFin, "dd/mm/yyyy") & ")"
    
    ' Récupérer la table des affectations
    Dim loAffectations As ListObject
    Set loAffectations = ModuleExec.GetAffectationsTable()
    If loAffectations Is Nothing Or loAffectations.DataBodyRange Is Nothing Then
        Debug.Print "[AppliquerTransfert] Table TblAffectations introuvable ou vide"
        Exit Sub
    End If
    
    ' Récupérer les compétences de la ressource depuis tblRessourcesComp
    Dim loRessourcesComp As ListObject
    Set loRessourcesComp = ModuleExec.GetRessourcesCompTable()
    If loRessourcesComp Is Nothing Or loRessourcesComp.DataBodyRange Is Nothing Then
        Debug.Print "[AppliquerTransfert] Table tblRessourcesComp introuvable ou vide"
        Exit Sub
    End If
    
    ' Charger les compétences en mémoire
    Dim dictCompetences As Object
    Set dictCompetences = CreateObject("Scripting.Dictionary")
    dictCompetences.CompareMode = vbTextCompare
    
    Dim dataArr As Variant
    dataArr = loRessourcesComp.DataBodyRange.value
    Dim cNom As Long, cSite As Long, cComp As Long, cTypeComp As Long, cActif As Long
    cNom = FindTableColumnIndex(loRessourcesComp, "NomPrenom")
    cSite = FindTableColumnIndex(loRessourcesComp, "Site")
    cComp = FindTableColumnIndex(loRessourcesComp, "Comp")
    cTypeComp = FindTableColumnIndex(loRessourcesComp, "Type_Comp")
    cActif = FindTableColumnIndex(loRessourcesComp, "Actif")
    
    If cNom > 0 And cSite > 0 And cComp > 0 Then
        Dim i As Long
        For i = LBound(dataArr, 1) To UBound(dataArr, 1)
            If StrComp(NormalizeRessourceLabel(CStr(dataArr(i, cNom))), ressource, vbTextCompare) = 0 And _
               Trim$(CStr(dataArr(i, cSite))) = siteOrigine Then
                ' Vérifier si actif (si colonne existe)
                If cActif > 0 Then
                    If UCase$(Trim$(CStr(dataArr(i, cActif)))) <> "OUI" Then
                        GoTo NextRessource
                    End If
                End If
                ' Vérifier si compétence principale (si colonne existe)
                If cTypeComp > 0 Then
                    If UCase$(Trim$(CStr(dataArr(i, cTypeComp)))) = "P" Then
                        dictCompetences(Trim$(CStr(dataArr(i, cComp)))) = True
                    End If
                Else
                    ' Si pas de colonne Type_Comp, prendre toutes les compétences
                    dictCompetences(Trim$(CStr(dataArr(i, cComp)))) = True
                End If
            End If
NextRessource:
        Next i
    End If
    
    If dictCompetences.count = 0 Then
        Debug.Print "[AppliquerTransfert] Aucune compétence trouvée pour " & ressource & " sur " & siteOrigine
        Exit Sub
    End If
    
    Debug.Print "[AppliquerTransfert] " & dictCompetences.count & " compétence(s) trouvée(s) pour " & ressource
    
    ' *** NOTE : Le site est maintenant géré par la requête PowerQuery RessourcesParSemaine ***
    ' La requête prend en compte les transferts appliqués et corrige automatiquement le site
    ' Plus besoin de modifier tblRessources manuellement
    
    ' Pour chaque compétence, créer une affectation sur le site de destination
    ' Note : On crée des affectations avec une charge de 0 (pas d'affectation effective, juste disponibilité)
    ' L'utilisateur devra ensuite affecter manuellement la ressource sur des affaires spécifiques
    
    Dim comp As Variant
    Dim nbAffectationsCreees As Long: nbAffectationsCreees = 0
    
    For Each comp In dictCompetences.keys
        ' Créer une affectation "générique" pour indiquer la disponibilité sur le site de destination
        ' On utilise une affaire factice "TRANSFERT" pour tracer
        Dim affaireID As String
        affaireID = "TRANSFERT_" & siteDestination
        
        ' Calculer le nombre de jours ouvrés pour la charge
        Dim nbJoursOuvres As Long
        nbJoursOuvres = BusinessDaysBetween(dateDebut, dateFin)
        
        ' Créer l'affectation
        ModuleAffectation.EnregistrerUneAffectation affaireID, siteDestination, ressource, _
                                                      CStr(comp), dateDebut, dateFin, nbJoursOuvres
        nbAffectationsCreees = nbAffectationsCreees + 1
        
        ' Logger dans les alertes
        ModuleAbsence.LoggerAlerte "TRANSFERT_APPLIQUE", ressource, affaireID, siteDestination, _
                                   CStr(comp), dateDebut, dateFin, _
                                   "Transfert appliqué de " & siteOrigine & " vers " & siteDestination
    Next comp
    
    ' Mettre à jour le statut du transfert dans TblTransferts
    Dim loTransferts As ListObject
    Set loTransferts = GetTransfertsTable()
    If Not loTransferts Is Nothing And Not loTransferts.DataBodyRange Is Nothing Then
        Dim dataArrTransferts As Variant
        dataArrTransferts = loTransferts.DataBodyRange.value
        Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long, cDateDeb As Long, cStatut As Long
        cRes = FindTableColumnIndex(loTransferts, "Ressource")
        cSiteOrig = FindTableColumnIndex(loTransferts, "SiteOrigine")
        cSiteDest = FindTableColumnIndex(loTransferts, "SiteDestination")
        cDateDeb = FindTableColumnIndex(loTransferts, "DateDébut")
        cStatut = FindTableColumnIndex(loTransferts, "Statut")
        
        If cRes > 0 And cSiteOrig > 0 And cSiteDest > 0 And cDateDeb > 0 And cStatut > 0 Then
            For i = LBound(dataArrTransferts, 1) To UBound(dataArrTransferts, 1)
                If StrComp(NormalizeRessourceLabel(CStr(dataArrTransferts(i, cRes))), ressource, vbTextCompare) = 0 And _
                   Trim$(CStr(dataArrTransferts(i, cSiteOrig))) = siteOrigine And _
                   Trim$(CStr(dataArrTransferts(i, cSiteDest))) = siteDestination Then
                    If IsDate(dataArrTransferts(i, cDateDeb)) Then
                        Dim dDeb As Date
                        dDeb = CDate(dataArrTransferts(i, cDateDeb))
                        If dDeb = dateDebut Then
                            ' Mettre à jour le statut
                            Dim lr As ListRow
                            Set lr = loTransferts.ListRows(i)
                            lr.Range(1, cStatut).value = "Appliqué"
                            Exit For
                        End If
                    End If
                End If
            Next i
        End If
    End If
    
    Debug.Print "[AppliquerTransfert] " & nbAffectationsCreees & " affectation(s) créée(s) pour " & ressource & " sur " & siteDestination
    Debug.Print "[AppliquerTransfert] END (OK)"
    
    Exit Sub
    
ErrHandler:
    Debug.Print "[AppliquerTransfert] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleTransfert", "AppliquerTransfert", False
    Err.Clear
End Sub

' ============================================================================
' APPLIQUER AUTOMATIQUEMENT LES TRANSFERTS PLANIFIÉS
' ============================================================================
Public Sub AppliquerTransfertsAuto()
    On Error GoTo ErrHandler
    
    Debug.Print "[AppliquerTransfertsAuto] START"
    
    Dim lo As ListObject
    Set lo = GetTransfertsTable()
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Debug.Print "[AppliquerTransfertsAuto] Table TblTransferts introuvable ou vide"
        Exit Sub
    End If
    
    ' Charger les données en mémoire
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les colonnes
    Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long, cDateDeb As Long, cDateFin As Long, cStatut As Long
    cRes = FindTableColumnIndex(lo, "Ressource")
    cSiteOrig = FindTableColumnIndex(lo, "SiteOrigine")
    cSiteDest = FindTableColumnIndex(lo, "SiteDestination")
    cDateDeb = FindTableColumnIndex(lo, "DateDébut")
    cDateFin = FindTableColumnIndex(lo, "DateFin")
    cStatut = FindTableColumnIndex(lo, "Statut")
    
    If cRes = 0 Or cSiteOrig = 0 Or cSiteDest = 0 Or cDateDeb = 0 Or cDateFin = 0 Or cStatut = 0 Then
        Debug.Print "[AppliquerTransfertsAuto] Colonnes essentielles manquantes"
        Exit Sub
    End If
    
    Dim i As Long, nbAppliques As Long
    nbAppliques = 0
    
    ' Parcourir tous les transferts
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        Dim statut As String
        statut = Trim$(UCase$(CStr(dataArr(i, cStatut))))
        
        ' Ne traiter que les transferts avec statut "Planifié"
        If statut <> "PLANIFIE" And statut <> "PLANIFIÉ" Then GoTo NextTransfert
        
        ' Vérifier que les dates sont valides
        If Not IsDate(dataArr(i, cDateDeb)) Or Not IsDate(dataArr(i, cDateFin)) Then GoTo NextTransfert
        
        Dim dateDebut As Date, dateFin As Date
        dateDebut = CDate(dataArr(i, cDateDeb))
        dateFin = CDate(dataArr(i, cDateFin))
        
        ' Appliquer si la date de début est aujourd'hui ou dans le passé
        If dateDebut <= Date Then
            Dim ressource As String, siteOrigine As String, siteDestination As String
            ressource = Trim$(CStr(dataArr(i, cRes)))
            siteOrigine = Trim$(CStr(dataArr(i, cSiteOrig)))
            siteDestination = Trim$(CStr(dataArr(i, cSiteDest)))
            
            ' Appliquer le transfert
            AppliquerTransfert ressource, siteOrigine, siteDestination, dateDebut, dateFin
            
            ' Mettre à jour le statut à "Appliqué"
            Dim lr As ListRow
            Set lr = lo.ListRows(i)
            lr.Range(1, cStatut).value = "Appliqué"
            
            nbAppliques = nbAppliques + 1
        End If
NextTransfert:
    Next i
    
    Debug.Print "[AppliquerTransfertsAuto] " & nbAppliques & " transfert(s) appliqué(s) automatiquement"
    Debug.Print "[AppliquerTransfertsAuto] END"
    Exit Sub
    
ErrHandler:
    Debug.Print "[AppliquerTransfertsAuto] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleTransfert", "AppliquerTransfertsAuto", False
    Err.Clear
End Sub

' ============================================================================
' GÉRER UNE MODIFICATION DANS LA TABLE TblTransferts
' ============================================================================
Public Sub HandleTransfertsTableChange(ByVal Target As Range)
    On Error GoTo ErrHandler
    
    ' Vérifier si c'est dans la table
    If Not IsInTransfertsTable(Target) Then Exit Sub
    
    Debug.Print "[HandleTransfertsTableChange] Modification dans TblTransferts - " & Target.Address
    
    ' Si le statut a été changé en "Appliqué", appliquer le transfert
    Dim ws As Worksheet: Set ws = Target.Worksheet
    Dim lo As ListObject: Set lo = ws.ListObjects(TBL_TRANSFERTS)
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then Exit Sub
    
    ' Trouver la ligne modifiée
    Dim rowIndex As Long
    rowIndex = Target.Row - lo.DataBodyRange.Row + 1
    
    If rowIndex > 0 And rowIndex <= lo.ListRows.count Then
        Dim lr As ListRow: Set lr = lo.ListRows(rowIndex)
        
        ' Vérifier si c'est la colonne Statut qui a été modifiée
        Dim cStatut As Long
        cStatut = FindTableColumnIndex(lo, "Statut")
        
        If cStatut > 0 And Target.Column = lo.ListColumns(cStatut).Index Then
            Dim statut As String
            statut = Trim$(UCase$(CStr(lr.Range(1, cStatut).value)))
            
            If statut = "APPLIQUE" Then
                ' Récupérer les valeurs du transfert
                Dim cRes As Long, cSiteOrig As Long, cSiteDest As Long, cDateDeb As Long, cDateFin As Long
                cRes = FindTableColumnIndex(lo, "Ressource")
                cSiteOrig = FindTableColumnIndex(lo, "SiteOrigine")
                cSiteDest = FindTableColumnIndex(lo, "SiteDestination")
                cDateDeb = FindTableColumnIndex(lo, "DateDébut")
                cDateFin = FindTableColumnIndex(lo, "DateFin")
                
                If cRes > 0 And cSiteOrig > 0 And cSiteDest > 0 And cDateDeb > 0 And cDateFin > 0 Then
                    Dim ressource As String, siteOrigine As String, siteDestination As String
                    Dim dateDebut As Date, dateFin As Date
                    
                    ressource = Trim$(CStr(lr.Range(1, cRes).value))
                    siteOrigine = Trim$(CStr(lr.Range(1, cSiteOrig).value))
                    siteDestination = Trim$(CStr(lr.Range(1, cSiteDest).value))
                    
                    If IsDate(lr.Range(1, cDateDeb).value) And IsDate(lr.Range(1, cDateFin).value) Then
                        dateDebut = CDate(lr.Range(1, cDateDeb).value)
                        dateFin = CDate(lr.Range(1, cDateFin).value)
                        
                        ' Appliquer le transfert
                        AppliquerTransfert ressource, siteOrigine, siteDestination, dateDebut, dateFin
                    End If
                End If
            End If
        End If
    End If
    
    ' Marquer Dashboard pour refresh et déclencher vérifications automatiques
    ModuleExec.mDashboardNeedsRefresh = True
    Debug.Print "[HandleTransfertsTableChange] Modification enregistrée"
    ModuleExec.TriggerAutoChecks
    Exit Sub
    
ErrHandler:
    Debug.Print "[HandleTransfertsTableChange] ERREUR : " & Err.Number & " - " & Err.Description
    ModuleErrorHandling.HandleError "ModuleTransfert", "HandleTransfertsTableChange", False
    Err.Clear
End Sub

' ============================================================================
' VÉRIFIER SI UNE CELLULE EST DANS LA TABLE TblTransferts
' ============================================================================
Private Function IsInTransfertsTable(ByVal cell As Range) As Boolean
    On Error GoTo Quit
    
    Dim ws As Worksheet: Set ws = cell.Worksheet
    If ws.name <> SHEET_TRANSFERTS Then GoTo Quit
    
    Dim lo As ListObject
    On Error Resume Next
    Set lo = ws.ListObjects(TBL_TRANSFERTS)
    On Error GoTo Quit
    
    If lo Is Nothing Then GoTo Quit
    If lo.DataBodyRange Is Nothing Then GoTo Quit
    
    ' Vérifier si la cellule est dans le DataBodyRange
    If Not Intersect(cell, lo.DataBodyRange) Is Nothing Then
        IsInTransfertsTable = True
        Exit Function
    End If

Quit:
    IsInTransfertsTable = False
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

' ============================================================================
' METTRE À JOUR LE SITE DANS tblRessources POUR LA PÉRIODE DU TRANSFERT
' ============================================================================
' *** FONCTION DÉSACTIVÉE : Le site est maintenant géré par la requête PowerQuery ***
' La requête RessourcesParSemaine prend en compte les transferts appliqués
' et corrige automatiquement le site pour éviter les statistiques divergentes
'
' Private Sub MettreAJourSiteRessourcePourTransfert(ressource As String, siteOrigine As String, _
'                                                    siteDestination As String, dateDebut As Date, _
'                                                    dateFin As Date)
'     ... (code supprimé car géré par PowerQuery) ...
' End Sub

' Utilise ModuleExec.GetRessourcesTable, ModuleExec.GetRessourcesCompTable, ModuleExec.GetAffectationsTable
' Utilise ModuleAffectation.EnregistrerUneAffectation
' Utilise ModuleAbsence.LoggerAlerte
' Utilise ModuleErrorHandling.HandleError
' Utilise BusinessDaysBetween de ModuleCalendar


