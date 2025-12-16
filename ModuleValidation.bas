Attribute VB_Name = "ModuleValidation"

Option Explicit

' =======================================================================================
' MODULE : ModuleValidation
' Objectif : Validation centralisée des données
'
' Fonctions fournies :
'     ValiderCohérenceDates - Vérifier cohérence des dates
'     ValiderAffectations - Vérifier validité des affectations
'     DétecterConflitsGlobaux - Détecter tous les conflits
'     VérifierIntégritéDonnées - Vérifier l'intégrité des données
'
' =======================================================================================

' Constantes
Private Const TBL_AFFAIRES As String = "tblAffaires"

' =======================================================================================
' VALIDER COHÉRENCE DES DATES
' =======================================================================================
Public Function ValiderCohérenceDates(dateDebut As Date, dateFin As Date) As Boolean
    ValiderCohérenceDates = True
    
    ' Vérifier que dateFin >= dateDebut
    If dateFin < dateDebut Then
        MsgBox "La date de fin (" & Format$(dateFin, "dd/mm/yyyy") & ") est antérieure à la date de début (" & _
               Format$(dateDebut, "dd/mm/yyyy") & ").", vbExclamation, "Validation Dates"
        ValiderCohérenceDates = False
        Exit Function
    End If
    
    ' Vérifier que les dates ne sont pas trop anciennes (ex: avant 2020)
    If Year(dateDebut) < 2020 Or Year(dateFin) < 2020 Then
        MsgBox "Les dates doivent être postérieures à 2020.", vbExclamation, "Validation Dates"
        ValiderCohérenceDates = False
        Exit Function
    End If
    
    ' Vérifier que les dates ne sont pas trop futures (ex: après 2050)
    If Year(dateDebut) > 2050 Or Year(dateFin) > 2050 Then
        MsgBox "Les dates ne peuvent pas être postérieures à 2050.", vbExclamation, "Validation Dates"
        ValiderCohérenceDates = False
        Exit Function
    End If
End Function

' =======================================================================================
' VALIDER EXISTENCE D'UNE AFFAIRE/SITE
' MODIFIÉ : Utilise ModuleExec pour chercher dans le fichier DONNEES
' =======================================================================================
Public Function AffaireSiteExiste(affaireID As String, siteVal As String) As Boolean
    On Error Resume Next
    
    ' ✅ MODIFIÉ : Utilise ModuleExec pour chercher dans le fichier DONNEES
    Dim lo As ListObject
    Set lo = ModuleExec.GetAffairesTable()
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        AffaireSiteExiste = False
        Exit Function
    End If
    
    ' *** OPTIMISATION : Utilise tableau en mémoire ***
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    ' Trouver les indices de colonnes dynamiquement
    Dim cAffaireID As Long, cSite As Long
    cAffaireID = FindTableColumnIndex(lo, "AffaireID")
    If cAffaireID = 0 Then cAffaireID = FindTableColumnIndex(lo, "Affaire")
    cSite = FindTableColumnIndex(lo, "Site")
    
    If cAffaireID = 0 Or cSite = 0 Then
        AffaireSiteExiste = False
        Exit Function
    End If
    
    Dim i As Long
    affaireID = Trim$(affaireID)
    siteVal = Trim$(siteVal)
    
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        If Trim$(CStr(dataArr(i, cAffaireID))) = affaireID And _
           Trim$(CStr(dataArr(i, cSite))) = siteVal Then
            AffaireSiteExiste = True
            Exit Function
        End If
    Next i
    
    AffaireSiteExiste = False
    On Error GoTo 0
End Function

' =======================================================================================
' VALIDER RESSOURCE DISPONIBLE
' =======================================================================================
Public Function RessourceDisponible(ressource As String, dateDebut As Date, dateFin As Date) As Boolean
    On Error Resume Next
    
    ' Vérifier que la ressource n'est pas absente sur cette période
    If ModuleAbsence.EstAbsent(ressource, dateDebut) Or _
       ModuleAbsence.EstAbsent(ressource, dateFin) Then
        RessourceDisponible = False
        Exit Function
    End If
    
    ' Vérifier les absences dans toute la période
    Dim d As Date
    For d = dateDebut To dateFin
        If ModuleAbsence.EstAbsent(ressource, d) Then
            RessourceDisponible = False
            Exit Function
        End If
    Next d
    
    RessourceDisponible = True
    On Error GoTo 0
End Function

' =======================================================================================
' VALIDER UNE AFFECTATION (VERSION CENTRALISÉE)
' =======================================================================================
Public Function ValiderAffectation(affaireID As String, siteVal As String, _
                                   ressource As String, comp As String, _
                                   dateDebut As Date, dateFin As Date, _
                                   Optional showMessages As Boolean = True) As Boolean
    
    ValiderAffectation = True
    
    ' 1) Vérifier affaire/site existe
    If Not AffaireSiteExiste(affaireID, siteVal) Then
        If showMessages Then
            MsgBox "L'affaire '" & affaireID & "' sur le site '" & siteVal & "' n'existe pas dans tblAffaires.", _
                   vbExclamation, "Validation Affectation"
        End If
        ValiderAffectation = False
        Exit Function
    End If
    
    ' 2) Vérifier cohérence dates
    If Not ValiderCohérenceDates(dateDebut, dateFin) Then
        ValiderAffectation = False
        Exit Function
    End If
    
    ' 3) Vérifier ressource disponible (via ModuleAbsence)
    If Not RessourceDisponible(ressource, dateDebut, dateFin) Then
        If showMessages Then
            Dim details As String
            details = ModuleAbsence.GetDetailsAbsence(ressource, dateDebut)
            If Len(details) = 0 Then
                details = ModuleAbsence.GetDetailsAbsence(ressource, dateFin)
            End If
            MsgBox ressource & " est absent(e) sur cette période :" & vbCrLf & vbCrLf & details, _
                   vbExclamation, "Validation Affectation"
        End If
        ValiderAffectation = False
        Exit Function
    End If
    
    ' 4) Vérifier conflits d'affectation (via ModuleAbsence)
    Dim autreAffectation As String
    autreAffectation = ModuleAbsence.EstAffecteAilleurs(ressource, affaireID, siteVal, dateDebut)
    
    If Len(autreAffectation) > 0 Then
        If showMessages Then
            Dim reponse As VbMsgBoxResult
            reponse = MsgBox(ressource & " est déjà affecté(e) sur :" & vbCrLf & vbCrLf & _
                            autreAffectation & vbCrLf & vbCrLf & _
                            "Voulez-vous quand même affecter sur cette affaire ?", _
                            vbYesNo + vbQuestion, "Conflit d'affectation")
            If reponse = vbNo Then
                ValiderAffectation = False
                Exit Function
            End If
        Else
            ValiderAffectation = False
            Exit Function
        End If
    End If
End Function

' =======================================================================================
' DÉTECTER TOUS LES CONFLITS GLOBAUX
' =======================================================================================
Public Function DétecterConflitsGlobaux() As Collection
    Dim conflits As New Collection
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleExec.GetAffectationsTable()
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set DétecterConflitsGlobaux = conflits
        Exit Function
    End If
    
    ' *** OPTIMISATION : Charger toutes les données en mémoire ***
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, j As Long
    Dim res1 As String, res2 As String
    Dim d1_debut As Date, d1_fin As Date, d2_debut As Date, d2_fin As Date
    
    ' Comparer chaque affectation avec toutes les autres
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        res1 = Trim$(CStr(dataArr(i, 3)))  ' Ressource
        If Not IsDate(dataArr(i, 5)) Or Not IsDate(dataArr(i, 6)) Then GoTo NextI
        d1_debut = CDate(dataArr(i, 5))
        d1_fin = CDate(dataArr(i, 6))
        
        For j = i + 1 To UBound(dataArr, 1)
            res2 = Trim$(CStr(dataArr(j, 3)))  ' Ressource
            
            ' Même ressource ?
            If res1 = res2 Then
                If Not IsDate(dataArr(j, 5)) Or Not IsDate(dataArr(j, 6)) Then GoTo NextJ
                d2_debut = CDate(dataArr(j, 5))
                d2_fin = CDate(dataArr(j, 6))
                
                ' Chevauchement de dates ?
                If Not (d1_fin < d2_debut Or d1_debut > d2_fin) Then
                    Dim msg As String
                    msg = res1 & " : " & _
                          Trim$(CStr(dataArr(i, 1))) & "/" & Trim$(CStr(dataArr(i, 2))) & " (" & _
                          Format$(d1_debut, "dd/mm") & "-" & Format$(d1_fin, "dd/mm") & ") " & _
                          "ET " & _
                          Trim$(CStr(dataArr(j, 1))) & "/" & Trim$(CStr(dataArr(j, 2))) & " (" & _
                          Format$(d2_debut, "dd/mm") & "-" & Format$(d2_fin, "dd/mm") & ")"
                    conflits.Add msg
                End If
            End If
NextJ:
        Next j
NextI:
    Next i
    
    Set DétecterConflitsGlobaux = conflits
    On Error GoTo 0
End Function

' =======================================================================================
' DÉTECTER TOUS LES DOUBLONS EXACTS
' =======================================================================================
Public Function DétecterDoublonsExacts() As Collection
    Dim doublons As New Collection
    On Error Resume Next
    
    Dim lo As ListObject
    Set lo = ModuleExec.GetAffectationsTable()
    
    If lo Is Nothing Or lo.DataBodyRange Is Nothing Then
        Set DétecterDoublonsExacts = doublons
        Exit Function
    End If
    
    ' *** OPTIMISATION : Charger toutes les données en mémoire ***
    Dim dataArr As Variant
    dataArr = lo.DataBodyRange.value
    
    Dim i As Long, j As Long
    Dim aff1 As String, site1 As String, res1 As String, comp1 As String
    Dim aff2 As String, site2 As String, res2 As String, comp2 As String
    Dim d1_debut As Date, d1_fin As Date, d2_debut As Date, d2_fin As Date
    Dim charge1 As Double, charge2 As Double
    
    ' Comparer chaque affectation avec toutes les suivantes
    For i = LBound(dataArr, 1) To UBound(dataArr, 1)
        aff1 = Trim$(CStr(dataArr(i, 1)))    ' AffaireID
        site1 = Trim$(CStr(dataArr(i, 2)))   ' Site
        res1 = Trim$(CStr(dataArr(i, 3)))    ' Ressource
        comp1 = Trim$(CStr(dataArr(i, 4)))   ' Compétence
        
        If Not IsDate(dataArr(i, 5)) Or Not IsDate(dataArr(i, 6)) Then GoTo NextI
        d1_debut = CDate(dataArr(i, 5))
        d1_fin = CDate(dataArr(i, 6))
        
        If IsNumeric(dataArr(i, 7)) Then
            charge1 = CDbl(dataArr(i, 7))
        Else
            charge1 = 0
        End If
        
        For j = i + 1 To UBound(dataArr, 1)
            aff2 = Trim$(CStr(dataArr(j, 1)))    ' AffaireID
            site2 = Trim$(CStr(dataArr(j, 2)))   ' Site
            res2 = Trim$(CStr(dataArr(j, 3)))    ' Ressource
            comp2 = Trim$(CStr(dataArr(j, 4)))   ' Compétence
            
            ' Vérifier si tous les champs sont identiques
            If aff1 = aff2 And site1 = site2 And res1 = res2 And comp1 = comp2 Then
                If Not IsDate(dataArr(j, 5)) Or Not IsDate(dataArr(j, 6)) Then GoTo NextJ
                d2_debut = CDate(dataArr(j, 5))
                d2_fin = CDate(dataArr(j, 6))
                
                If IsNumeric(dataArr(j, 7)) Then
                    charge2 = CDbl(dataArr(j, 7))
                Else
                    charge2 = 0
                End If
                
                ' Vérifier si les dates et la charge sont identiques
                If d1_debut = d2_debut And d1_fin = d2_fin And charge1 = charge2 Then
                    ' Doublon exact trouvé
                    Dim msg As String
                    msg = "Ligne " & i & " = Ligne " & j & " : " & _
                          aff1 & " / " & site1 & " / " & res1 & " / " & comp1 & " / " & _
                          Format$(d1_debut, "dd/mm/yyyy") & " - " & Format$(d1_fin, "dd/mm/yyyy") & " (" & _
                          Format$(charge1, "#,##0.0") & " jours)"
                    doublons.Add msg
                End If
            End If
NextJ:
        Next j
NextI:
    Next i
    
    Set DétecterDoublonsExacts = doublons
    On Error GoTo 0
End Function

' =======================================================================================
' VÉRIFIER INTÉGRITÉ DES DONNÉES
' =======================================================================================
Public Function VérifierIntégritéDonnées() As Collection
    Dim erreurs As New Collection
    On Error Resume Next
    
    ' 1) Vérifier que toutes les affectations ont une affaire/site valide
    Dim lo As ListObject
    Set lo = ModuleExec.GetAffectationsTable()
    
    If Not lo Is Nothing And Not lo.DataBodyRange Is Nothing Then
        Dim dataArr As Variant
        dataArr = lo.DataBodyRange.value
        
        Dim i As Long
        For i = LBound(dataArr, 1) To UBound(dataArr, 1)
            Dim affID As String, siteVal As String
            affID = Trim$(CStr(dataArr(i, 1)))
            siteVal = Trim$(CStr(dataArr(i, 2)))
            
            If Not AffaireSiteExiste(affID, siteVal) Then
                erreurs.Add "Affectation ligne " & i & " : Affaire '" & affID & "' / Site '" & siteVal & "' n'existe pas"
            End If
        Next i
    End If
    
    ' 2) Vérifier que toutes les périodes de charge ont une affaire/site valide
    Set lo = ModuleExec.GetChargeTable()
    
    If Not lo Is Nothing And Not lo.DataBodyRange Is Nothing Then
        dataArr = lo.DataBodyRange.value
        
        For i = LBound(dataArr, 1) To UBound(dataArr, 1)
            affID = Trim$(CStr(dataArr(i, 1)))
            siteVal = Trim$(CStr(dataArr(i, 2)))
            
            If Not AffaireSiteExiste(affID, siteVal) Then
                erreurs.Add "Période charge ligne " & i & " : Affaire '" & affID & "' / Site '" & siteVal & "' n'existe pas"
            End If
        Next i
    End If
    
    ' 3) Vérifier les doublons exacts dans les affectations
    Dim doublons As Collection
    Set doublons = DétecterDoublonsExacts()
    
    If doublons.count > 0 Then
        Dim j As Long
        For j = 1 To doublons.count
            erreurs.Add "DOUBLON : " & doublons(j)
        Next j
    End If
    
    Set VérifierIntégritéDonnées = erreurs
    On Error GoTo 0
End Function

' =======================================================================================
' VALIDER LES AFFECTATIONS D'UNE FEUILLE
' =======================================================================================
Public Sub ValiderAffectationsFeuille(ws As Worksheet)
    On Error Resume Next
    
    Dim affaireID As String, siteVal As String
    affaireID = Trim$(CStr(ws.Range("B1").value))
    siteVal = Trim$(CStr(ws.Range("B6").value))
    
    If Len(affaireID) = 0 Or Len(siteVal) = 0 Then
        MsgBox "Affaire ou Site non renseigné.", vbExclamation
        Exit Sub
    End If
    
    If Not AffaireSiteExiste(affaireID, siteVal) Then
        MsgBox "L'affaire '" & affaireID & "' sur le site '" & siteVal & "' n'existe pas.", vbExclamation
        Exit Sub
    End If
    
    ' Vérifier les conflits globaux
    Dim conflits As Collection
    Set conflits = DétecterConflitsGlobaux()
    
    If conflits.count > 0 Then
        Dim msg As String
        msg = "Conflits détectés :" & vbCrLf & vbCrLf
        
        Dim i As Long
        For i = 1 To conflits.count
            msg = msg & "• " & conflits(i) & vbCrLf
        Next i
        
        MsgBox msg, vbExclamation, "Validation Affectations"
    Else
        MsgBox "Aucun conflit détecté.", vbInformation, "Validation Affectations"
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' AFFICHER RAPPORT D'INTÉGRITÉ
' =======================================================================================
Public Sub AfficherRapportIntégrité()
    On Error Resume Next
    
    Dim erreurs As Collection
    Set erreurs = VérifierIntégritéDonnées()
    
    If erreurs.count = 0 Then
        MsgBox "Aucune erreur d'intégrité détectée.", vbInformation, "Vérification Intégrité"
    Else
        Dim msg As String
        msg = erreurs.count & " erreur(s) d'intégrité détectée(s) :" & vbCrLf & vbCrLf
        
        Dim i As Long
        For i = 1 To Application.Min(erreurs.count, 20)  ' Limiter à 20 erreurs
            msg = msg & "• " & erreurs(i) & vbCrLf
        Next i
        
        If erreurs.count > 20 Then
            msg = msg & vbCrLf & "... et " & (erreurs.count - 20) & " autre(s) erreur(s)"
        End If
        
        MsgBox msg, vbExclamation, "Vérification Intégrité"
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' AFFICHER RAPPORT DES DOUBLONS
' =======================================================================================
Public Sub AfficherRapportDoublons()
    On Error Resume Next
    
    Dim doublons As Collection
    Set doublons = DétecterDoublonsExacts()
    
    If doublons.count = 0 Then
        MsgBox "Aucun doublon exact détecté.", vbInformation, "Vérification Doublons"
    Else
        Dim msg As String
        msg = doublons.count & " doublon(s) exact(s) détecté(s) :" & vbCrLf & vbCrLf
        
        Dim i As Long
        For i = 1 To Application.Min(doublons.count, 20)  ' Limiter à 20 doublons
            msg = msg & "• " & doublons(i) & vbCrLf
        Next i
        
        If doublons.count > 20 Then
            msg = msg & vbCrLf & "... et " & (doublons.count - 20) & " autre(s) doublon(s)"
        End If
        
        MsgBox msg, vbExclamation, "Vérification Doublons"
    End If
    
    On Error GoTo 0
End Sub

' =======================================================================================
' FONCTION UTILITAIRE : Trouver l'index d'une colonne dans une table
' =======================================================================================
Private Function FindTableColumnIndex(lo As ListObject, columnName As String) As Long
    On Error Resume Next
    Dim col As ListColumn
    For Each col In lo.ListColumns
        If UCase$(Trim$(col.name)) = UCase$(Trim$(columnName)) Then
            FindTableColumnIndex = col.Index
            Exit Function
        End If
    Next col
    FindTableColumnIndex = 0
    On Error GoTo 0
End Function
