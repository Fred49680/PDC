# 🔧 CORRECTIONS DES BUGS - ModuleAffectations

## ✅ BUGS CORRIGÉS DANS ModuleFeuilleAffectations.bas

### 1. **Bug ligne 100-107 : Vérification incorrecte du nombre de colonnes**
**Problème :** `lr.Range.Columns.count` n'est pas la bonne méthode pour vérifier le nombre de colonnes d'une table.

**AVANT :**
```vba
If lr.Range.Columns.count >= 7 And IsNumeric(lr.Range(1, 7).value) Then
```

**APRÈS :**
```vba
If lo.ListColumns.count >= 7 And IsNumeric(lr.Range(1, 7).value) Then
```

✅ **CORRIGÉ**

---

### 2. **Bug ligne 93 : Comparaison incorrecte de dates**
**Problème :** `dateDebut > 0` n'est pas une bonne façon de vérifier si une date est valide.

**AVANT :**
```vba
If dateDebut > 0 And dateFin > 0 And dateFin >= dateDebut Then
```

**APRÈS :**
```vba
If dateDebut <> 0 And dateFin <> 0 And dateFin >= dateDebut Then
```

✅ **CORRIGÉ**

---

### 3. **Bug ligne 152-155 : Comparaison case-sensitive**
**Problème :** La recherche ne trouve pas les correspondances si la casse diffère.

**AVANT :**
```vba
If Trim$(CStr(dataArr(i, 1))) = aff And _
   Trim$(CStr(dataArr(i, 2))) = site And _
   Trim$(CStr(dataArr(i, 3))) = res And _
   Trim$(CStr(dataArr(i, 4))) = comp Then
```

**APRÈS :**
```vba
Dim affNorm As String, siteNorm As String, resNorm As String, compNorm As String
affNorm = UCase$(Trim$(aff))
siteNorm = UCase$(Trim$(site))
resNorm = UCase$(Trim$(res))
compNorm = UCase$(Trim$(comp))

For i = LBound(dataArr, 1) To UBound(dataArr, 1)
    If UCase$(Trim$(CStr(dataArr(i, 1)))) = affNorm And _
       UCase$(Trim$(CStr(dataArr(i, 2)))) = siteNorm And _
       UCase$(Trim$(CStr(dataArr(i, 3)))) = resNorm And _
       UCase$(Trim$(CStr(dataArr(i, 4)))) = compNorm Then
```

✅ **CORRIGÉ**

---

### 4. **Optimisation ligne 145-148 : Paramètres ByVal modifiés**
**Problème :** Les paramètres sont modifiés mais ce sont des ByVal, donc les modifications ne sont pas persistantes.

**AVANT :**
```vba
aff = Trim$(aff)
site = Trim$(site)
res = Trim$(res)
comp = Trim$(comp)
```

**APRÈS :**
```vba
Dim affNorm As String, siteNorm As String, resNorm As String, compNorm As String
affNorm = UCase$(Trim$(aff))
siteNorm = UCase$(Trim$(site))
resNorm = UCase$(Trim$(res))
compNorm = UCase$(Trim$(comp))
```

✅ **CORRIGÉ**

---

## ⚠️ BUG RESTANT DANS ModuleAffectation.bas

### **Lignes 1445-1498 : Logique de fusion trop complexe**

**Problème :** La logique de fusion utilise encore `On Error Resume Next` et beaucoup de debug, ce qui masque les erreurs et rend le code difficile à maintenir.

**À REMPLACER PAR :**
```vba
        ' *** OPTIMISATION : Utiliser ModuleCalendar directement (plus simple) ***
        Dim nextWorkDay As Long
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
```

**INSTRUCTIONS :**
1. Supprimer les lignes 1445-1498 (de `dEnd = dateSerial...` jusqu'à `NextDate:`)
2. Remplacer par le code ci-dessus
3. Supprimer aussi la ligne `On Error Resume Next` avant la boucle (ligne 1420 si elle existe)

---

## 📊 RÉSUMÉ

- ✅ **4 bugs corrigés** dans `ModuleFeuilleAffectations.bas`
- ⚠️ **1 optimisation restante** dans `ModuleAffectation.bas` (à faire manuellement à cause de l'encodage)

Les corrections principales sont en place. Le code devrait maintenant fonctionner correctement !

