# ⚡ GUIDE RAPIDE - INTÉGRATION DU MODULE

## 🎯 OBJECTIF

Intégrer le module `ModuleSeparationFichiers` dans votre fichier Excel en 5 minutes.

---

## 📝 ÉTAPE 1 : COPIER LE MODULE (2 minutes)

### 1.1 Ouvrir l'éditeur VBA

1. Ouvrir votre fichier Excel
2. Appuyer sur `Alt + F11` (ou **Développeur** → **Visual Basic**)

### 1.2 Créer le nouveau module

1. Dans l'explorateur de projet (à gauche), clic droit sur **Modules**
2. **Insert** → **Module**
3. Un nouveau module `Module1` apparaît

### 1.3 Copier le code

1. Ouvrir le fichier `ModuleSeparationFichiers_COMPLET.bas`
2. **Sélectionner tout** (`Ctrl + A`) et **Copier** (`Ctrl + C`)
3. Dans l'éditeur VBA, **Coller** (`Ctrl + V`) dans le nouveau module
4. Renommer le module : 
   - Clic droit sur `Module1` → **Properties**
   - Nom : `ModuleSeparationFichiers`

---

## 🔧 ÉTAPE 2 : MODIFIER LE CHEMIN DU SERVEUR (1 minute)

### 2.1 Trouver la constante

Dans le module, trouver la ligne :
```vba
Private Const CHEMIN_SERVEUR_DEFAUT As String = "\\Serveur\Partage\"
```

### 2.2 Modifier le chemin

Remplacer `\\Serveur\Partage\` par votre chemin serveur réel, par exemple :
```vba
Private Const CHEMIN_SERVEUR_DEFAUT As String = "\\SRV-FILE01\PlanDeCharge\"
```

**Comment trouver le chemin ?**
1. Ouvrir l'Explorateur Windows
2. Naviguer vers le dossier serveur
3. Copier le chemin depuis la barre d'adresse
4. Coller dans le code

---

## ✅ ÉTAPE 3 : TESTER (2 minutes)

### 3.1 Vérifier les tables

1. Dans l'éditeur VBA, placer le curseur dans la fonction `VerifierTables`
2. Appuyer sur `F5` pour exécuter
3. Vérifier que toutes les tables sont trouvées (✓)

**Si des tables ne sont pas trouvées :**
- Vérifier que le nom de la table est exact (sensible à la casse)
- Vérifier que la table existe bien dans votre fichier

### 3.2 Tester la création du fichier DONNEES

1. Placer le curseur dans la fonction `CreerFichierDonnees`
2. Appuyer sur `F5` pour exécuter
3. Entrer le chemin du serveur (ou laisser vide pour le défaut)
4. Attendre la fin de l'opération

**Vérifier :**
- Le fichier `PlanDeCharge_DONNEES.xlsm` est créé sur le serveur
- Toutes les tables sont présentes
- Les données sont correctes

---

## 🎨 ÉTAPE 4 : CRÉER UN BOUTON (Optionnel - 5 minutes)

### 4.1 Créer un bouton sur une feuille

1. Aller sur une feuille Excel (par exemple `Paramètres`)
2. **Développeur** → **Insert** → **Bouton (Form Control)**
3. Dessiner le bouton
4. Dans la boîte de dialogue, sélectionner `MenuSeparation`
5. Cliquer sur **OK**

### 4.2 Personnaliser le bouton

1. Clic droit sur le bouton → **Modifier le texte**
2. Texte : `Séparation des fichiers`
3. Clic droit → **Format Control** pour personnaliser l'apparence

### 4.3 Tester le bouton

1. Cliquer sur le bouton
2. Un menu apparaît avec 3 options
3. Tester chaque option

---

## 📋 UTILISATION

### Option 1 : Via le menu

1. Appuyer sur `Alt + F11` pour ouvrir VBA
2. Placer le curseur dans la fonction souhaitée
3. Appuyer sur `F5`

### Option 2 : Via un bouton

1. Cliquer sur le bouton créé
2. Choisir l'option dans le menu

### Option 3 : Via la macro

1. **Développeur** → **Macros** (ou `Alt + F8`)
2. Sélectionner la macro
3. Cliquer sur **Exécuter**

---

## 🔄 PROCESSUS COMPLET DE SÉPARATION

### Étape 1 : Vérification
```
MenuSeparation → Option 1 (Vérifier les tables)
```
Vérifier que toutes les tables sont trouvées.

### Étape 2 : Création du fichier DONNEES
```
MenuSeparation → Option 2 (Créer le fichier DONNEES)
```
Créer le fichier sur le serveur avec toutes les tables.

### Étape 3 : Nettoyage du fichier INTERFACE
⚠️ **FAIRE UNE SAUVEGARDE AVANT !**
```
MenuSeparation → Option 3 (Nettoyer le fichier INTERFACE)
```
Supprimer les feuilles de données du fichier INTERFACE.

### Étape 4 : Modifier les PowerQuery
Modifier manuellement les PowerQuery pour pointer vers le fichier DONNEES.

---

## 🐛 DÉPANNAGE RAPIDE

### Erreur : "Table non trouvée"

**Solution :**
1. Exécuter `VerifierTables` pour voir quelles tables manquent
2. Vérifier le nom exact de la table (sensible à la casse)
3. Vérifier que la table existe bien dans votre fichier

### Erreur : "Chemin non valide"

**Solution :**
1. Vérifier que le chemin du serveur est accessible
2. Tester d'ouvrir le dossier dans l'Explorateur Windows
3. Vérifier les permissions d'accès

### Erreur : "Fichier verrouillé"

**Solution :**
1. Fermer le fichier DONNEES s'il est ouvert
2. Vérifier qu'aucun autre utilisateur ne l'utilise
3. Attendre quelques secondes et réessayer

### Le module ne s'exécute pas

**Solution :**
1. Vérifier que les macros sont activées
2. **Fichier** → **Options** → **Centre de gestion de la confidentialité** → **Paramètres du Centre de gestion de la confidentialité**
3. Activer les macros

---

## 📞 AIDE SUPPLÉMENTAIRE

### Voir les messages de debug

1. Dans l'éditeur VBA, ouvrir la fenêtre **Debug** (`Ctrl + G`)
2. Les messages `Debug.Print` s'affichent ici

### Modifier les tables à copier

Dans le module, modifier la constante :
```vba
Private Const TABLES_DONNEES As String = "TblPeriodes|TblAffectations|..."
```

Ajouter ou retirer des noms de tables, séparés par `|`.

---

## ✅ CHECKLIST FINALE

- [ ] Module copié dans VBA
- [ ] Chemin du serveur modifié
- [ ] `VerifierTables` exécuté avec succès
- [ ] `CreerFichierDonnees` exécuté avec succès
- [ ] Fichier DONNEES créé et vérifié
- [ ] Bouton créé (optionnel)
- [ ] Sauvegarde du fichier original effectuée

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Guide rapide prêt à utiliser

