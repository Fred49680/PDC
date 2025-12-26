# 🔧 OPTIMISATIONS POUR ConsoliderAffectationsRessource

## 📋 RÉSUMÉ DES PROBLÈMES IDENTIFIÉS

1. ❌ **Comparaison case-sensitive** → Ne trouve pas si la casse diffère
2. ❌ **Pas d'invalidation du cache** → Risque de données obsolètes
3. ❌ **Gestion des cas limites incomplète** → Ne gère pas dict.count = 0 et dict.count = 1
4. ❌ **Gestion d'erreur excessive** → Masque les erreurs dans la boucle
5. ❌ **Logique de fusion trop complexe** → Code difficile à maintenir

---

## ✅ OPTIMISATIONS À APPLIQUER

### 1. **Normaliser les paramètres au début** (ligne 1309)

**AVANT :**
```vba
Debug.Print "[ConsoliderAffectationsRessource] START - " & res & " / " & comp
```

**APRÈS :**
```vba
' Normaliser les paramètres (trim + uppercase pour comparaison)
affaireID = Trim$(affaireID)
siteVal = Trim$(siteVal)
res = Trim$(res)
comp = Trim$(comp)

Debug.Print "[ConsoliderAffectationsRessource] START - affaireID='" & affaireID & "' / siteVal='" & siteVal & "' / res='" & res & "' / comp='" & comp & "'"
```

---

### 2. **Invalider le cache AVANT de charger** (après ligne 1311)

**AJOUTER :**
```vba
' *** OPTIMISATION : Invalider le cache AVANT de charger les données ***
ModuleExec.InvalidateListObjectCache "TblAffectations"
```

---

### 3. **Simplifier la récupération de la table** (lignes 1313-1337)

**AVANT :**
```vba
Dim lo As ListObject
Debug.Print "[ConsoliderAffectationsRessource] Récupération de GetAffectationsTable()..."
On Error Resume Next
Set lo = GetAffectationsTable()
' ... beaucoup de debug ...
```

**APRÈS :**
```vba
Dim lo As ListObject
On Error Resume Next
Set lo = GetAffectationsTable()
If Err.Number <> 0 Then
    Debug.Print "[ConsoliderAffectationsRessource] ERREUR GetAffectationsTable: " & Err.Number & " - " & Err.Description
    Err.Clear
    On Error GoTo ErrHandler
    GoTo ErrHandler
End If
On Error GoTo ErrHandler

If lo Is Nothing Then
    Debug.Print "[ConsoliderAffectationsRessource] ABORT: Table introuvable"
    Exit Sub
End If

If lo.DataBodyRange Is Nothing Then
    Debug.Print "[ConsoliderAffectationsRessource] ABORT: Table vide"
    Exit Sub
End If
```

---

### 4. **Chargement des données avec gestion d'erreur** (lignes 1342-1346)

**AVANT :**
```vba
Dim dataArr As Variant
Dim t0 As Double: t0 = Timer
Debug.Print "[ConsoliderAffectationsRessource] Chargement des données en mémoire..."
dataArr = lo.DataBodyRange.value
Debug.Print "[ConsoliderAffectationsRessource] Données chargées (" & UBound(dataArr, 1) & " lignes) en " & Format(Timer - t0, "0.000") & " sec"
```

**APRÈS :**
```vba
Dim dataArr As Variant
Dim t0 As Double: t0 = Timer
On Error Resume Next
dataArr = lo.DataBodyRange.value
If Err.Number <> 0 Then
    Debug.Print "[ConsoliderAffectationsRessource] ERREUR lors du chargement des données : " & Err.Description
    Err.Clear
    Exit Sub
End If
On Error GoTo ErrHandler
```

---

### 5. **Comparaison case-insensitive** (lignes 1353-1357)

**AVANT :**
```vba
If Trim$(CStr(dataArr(i, 1))) = affaireID And _
   Trim$(CStr(dataArr(i, 2))) = siteVal And _
   Trim$(CStr(dataArr(i, 3))) = res And _
   Trim$(CStr(dataArr(i, 4))) = comp Then
```

**APRÈS :**
```vba
' *** OPTIMISATION : Comparaison case-insensitive avec UCase$ ***
Dim affTable As String, siteTable As String, resTable As String, compTable As String
affTable = Trim$(CStr(dataArr(i, 1)))
siteTable = Trim$(CStr(dataArr(i, 2)))
resTable = Trim$(CStr(dataArr(i, 3)))
compTable = Trim$(CStr(dataArr(i, 4)))

If UCase$(affTable) = UCase$(affaireID) And _
   UCase$(siteTable) = UCase$(siteVal) And _
   UCase$(resTable) = UCase$(res) And _
   UCase$(compTable) = UCase$(comp) Then
```

---

### 6. **Simplifier la boucle de dates** (lignes 1367-1377)

**AVANT :**
```vba
Dim d As Date
For d = d0 To d1
    On Error Resume Next
    If Cal_IsBusiness(d) Then
        dict(CStr(CLng(d))) = charge
    End If
    If Err.Number <> 0 Then
        Debug.Print "[ConsoliderAffectationsRessource] ERREUR Cal_IsBusiness pour date " & d & ": " & Err.Description
        Err.Clear
    End If
    On Error GoTo 0
Next d
```

**APRÈS :**
```vba
' *** OPTIMISATION : Utiliser ModuleCalendar directement (plus simple) ***
Dim d As Date
For d = d0 To d1
    If ModuleCalendar.isBusinessDay(d) Then
        dict(CStr(CLng(d))) = charge
    End If
Next d
```

---

### 7. **Gérer les cas limites** (lignes 1385-1388)

**AVANT :**
```vba
If dict.count <= 1 Then
    Debug.Print "[ConsoliderAffectationsRessource] ABORT: Moins de 2 jours uniques"
    Exit Sub
End If
```

**APRÈS :**
```vba
' *** OPTIMISATION : Gérer les cas limites comme dans ModuleCharge ***
' Si aucune donnée, supprimer toutes les lignes et sortir
If dict.count = 0 Then
    Debug.Print "[ConsoliderAffectationsRessource] Aucune donnée trouvée -> suppression de toutes les lignes"
    DeleteRowsByAffectation lo, affaireID, siteVal, res, comp
    Exit Sub
End If

' Si seulement 1 jour, pas besoin de consolidation, juste supprimer les autres lignes
' et créer une seule ligne pour ce jour
If dict.count = 1 Then
    DeleteRowsByAffectation lo, affaireID, siteVal, res, comp
    Dim singleDate As Long, singleCharge As Double
    singleDate = CLng(dict.keys()(0))
    singleCharge = dict(dict.keys()(0))
    AddAffectationLine lo, affaireID, siteVal, res, comp, singleDate, singleDate, singleCharge, 1
    Debug.Print "[ConsoliderAffectationsRessource] Une seule journée -> ligne unique créée"
    Exit Sub
End If
```

---

### 8. **Simplifier la logique de fusion** (lignes 1409-1479)

**AVANT :** (logique complexe avec beaucoup de debug)

**APRÈS :**
```vba
' === 4) Reconstruire périodes (logique simplifiée comme ModuleCharge) ===
Dim startD As Long: startD = dates(0)
Dim endD As Long: endD = dates(0)
Dim chargeUnitaire As Double: chargeUnitaire = dict(CStr(startD))
Dim nbJoursOuvres As Long: nbJoursOuvres = 1
Dim nbPeriodes As Long: nbPeriodes = 0
Dim cur As Long, nextWorkDay As Long

t0 = Timer
For i = 1 To UBound(dates)
    cur = dates(i)
    
    ' *** OPTIMISATION : Utiliser ModuleCalendar directement (plus simple) ***
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
```

---

## 🎯 RÉSULTAT ATTENDU

Après ces optimisations, la fonction :
- ✅ Trouvera les affectations même si la casse diffère
- ✅ Utilisera toujours des données fraîches (cache invalidé)
- ✅ Gérera correctement les cas limites (0 ou 1 jour)
- ✅ Aura une logique plus simple et maintenable
- ✅ Sera alignée avec la logique de `ConsoliderUnePeriode` dans `ModuleCharge`

---

## 📝 NOTES

- Supprimer la variable `Dim r As Range` ligne 1339 (jamais utilisée)
- Supprimer les variables inutilisées `dStart`, `dEnd`, `dCur`, `nbJoursAttendu`, `nbJoursReel` ligne 1416-1417

