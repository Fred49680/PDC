# 📘 GUIDE DE FONCTIONNEMENT COMPLET - APPLICATION DE GESTION DE RESSOURCES

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture de l'application](#architecture-de-lapplication)
3. [Modules principaux](#modules-principaux)
4. [Fonctionnalités par module](#fonctionnalités-par-module)
5. [Guide d'utilisation](#guide-dutilisation)
6. [Workflows](#workflows)
7. [Optimisations et performances](#optimisations-et-performances)
8. [Maintenance et dépannage](#maintenance-et-dépannage)
9. [Annexes](#annexes)

---

## 🎯 VUE D'ENSEMBLE

### Objectif de l'application

Cette application Excel VBA permet de gérer de manière centralisée :
- **La planification de charge** par affaire, site et compétence
- **Les affectations de ressources** sur les projets
- **Les absences** (congés, formations, arrêts maladie, etc.)
- **Les transferts** de ressources entre sites
- **Les intérims** et renouvellements de contrats
- **Le suivi de chantiers** avec états et avancement
- **Le reporting** via Dashboard et tableaux croisés dynamiques

### Technologies utilisées

- **Excel** : Interface principale avec tableaux structurés (ListObjects)
- **VBA** : Logique métier et automatisations
- **PowerQuery** : Transformation et agrégation des données
- **Tableaux Croisés Dynamiques (TCD)** : Reporting et visualisation
- **Cache VBA** : Optimisation des performances

### Structure des données

L'application utilise des **tables Excel structurées** (ListObjects) pour stocker les données :
- `TblPeriodes` : Périodes de charge (besoins)
- `TblAffectations` : Affectations de ressources
- `TblAbsences` : Absences des ressources
- `tblRessources` : Catalogue des ressources
- `tblAffaires` : Catalogue des affaires/sites
- `TblTransferts` : Transferts de ressources entre sites
- `TblInterims` : Gestion des intérims
- `TblChantiers` : Suivi des chantiers
- `TblAlertes` : Alertes et notifications

---

## 🏗️ ARCHITECTURE DE L'APPLICATION

### Structure modulaire

L'application est organisée en **modules VBA spécialisés** :

```
📦 Application Excel
├── 📁 Modules Core
│   ├── ModuleExec (Gestion globale, cache, optimisations)
│   ├── ModuleCalendar (Calendrier, jours ouvrés, fériés)
│   ├── ModuleErrorHandling (Gestion d'erreurs centralisée)
│   └── ModuleAutoChecks (Vérifications automatiques)
│
├── 📁 Modules Métier
│   ├── ModuleCharge (Gestion de la charge)
│   ├── ModuleAffectation (Gestion des affectations)
│   ├── ModuleAbsence (Gestion des absences)
│   ├── ModuleTransfert (Gestion des transferts)
│   ├── ModuleInterim (Gestion des intérims)
│   └── ModuleChantier (Suivi des chantiers)
│
├── 📁 Modules Interface
│   ├── ModuleFeuille (Gestion de la feuille Charge)
│   ├── ModuleFeuilleAffectations (Gestion table Affectations)
│   ├── ModuleFeuilleAbsences (Gestion table Absences)
│   ├── ModuleGantt (Génération du planning Gantt)
│   └── ModuleDashboard (Gestion du Dashboard)
│
├── 📁 Modules Cache
│   ├── ModuleDashboardCache (Cache charge dépliée)
│   ├── ModuleRessourcesCache (Cache ressources par semaine)
│   └── ModuleAbsencesCache (Cache absences par semaine)
│
├── 📁 Modules Utilitaires
│   ├── ModuleValidation (Validation des données)
│   ├── ModuleReporting (Génération de rapports)
│   ├── ModuleNotification (Notifications et alertes)
│   ├── ModuleImportExport (Import/Export de données)
│   ├── ModuleMaintenance (Maintenance et nettoyage)
│   ├── ModuleSecurite (Protection et sauvegarde)
│   └── ModuleSeparationFichiers (Séparation source/reporting)
│
└── 📁 Classe
    └── clsCalDay (Classe pour jour calendrier)
```

### Flux de données

```
┌─────────────────────────────────────────────────────────┐
│                    FEUILLES EXCEL                       │
│  Charge | Affectations | Absences | Ressources | ...    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              TABLES STRUCTURÉES (ListObjects)           │
│  TblPeriodes | TblAffectations | TblAbsences | ...      │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MODULES VBA (Logique métier)               │
│  Validation | Consolidation | Calculs | Cache           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              POWERQUERY (Transformation)                 │
│  qry_CalOuvres | pqcharge | pqaffectations | ...       │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CACHE VBA (Optimisation)                     │
│  TblCacheChargeDepliee | TblCacheRessourcesSemaine      │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              REPORTING (Dashboard / TCD)                 │
│  Dashboard | TCD_Aff | TCD_Princ | Gantt                │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 MODULES PRINCIPAUX

### 🔧 ModuleExec - Gestion globale

**Rôle** : Orchestration centrale, cache, optimisations

**Fonctions principales** :
- `BeginFastExec()` / `EndFastExec()` : Optimisation globale (écran OFF, events OFF, calc manuel)
- `GetChargeTable()` : Récupération de la table TblPeriodes (avec cache)
- `GetAffectationsTable()` : Récupération de la table TblAffectations (avec cache)
- `GetAbsencesTable()` : Récupération de la table TblAbsences (avec cache)
- `GetRessourcesTable()` : Récupération de la table tblRessources (avec cache)
- `InvalidateListObjectCache()` : Invalidation du cache après modifications
- `TriggerAutoChecks()` : Déclenchement des vérifications automatiques

**Utilisation** :
```vba
' Exemple : Optimiser une opération lourde
ModuleExec.BeginFastExec "Traitement en cours..."
' ... code ...
ModuleExec.EndFastExec
```

### 📅 ModuleCalendar - Gestion du calendrier

**Rôle** : Calcul des jours ouvrés, week-ends, fériés

**Fonctions principales** :
- `LoadCalendar()` : Chargement du calendrier depuis PowerQuery
- `IsBusinessDay(d)` : Vérifier si une date est un jour ouvré
- `IsWeekend(d)` : Vérifier si une date est un week-end
- `IsHoliday(d)` : Vérifier si une date est fériée
- `BusinessDaysBetween(d0, d1)` : Compter les jours ouvrés entre deux dates
- `NextBusinessDay(d)` : Obtenir le prochain jour ouvré
- `PrevBusinessDay(d)` : Obtenir le jour ouvré précédent

**Utilisation** :
```vba
' Vérifier si une date est un jour ouvré
If ModuleCalendar.IsBusinessDay(Date) Then
    ' Traitement...
End If

' Compter les jours ouvrés
Dim nbJours As Long
nbJours = ModuleCalendar.BusinessDaysBetween(dateDebut, dateFin)
```

### 📊 ModuleCharge - Gestion de la charge

**Rôle** : Gestion des besoins de charge par affaire/site/compétence

**Fonctions principales** :
- `ConstruireGrille()` : Construction de la grille de saisie de charge
- `ChargerPlanDeCharge(ws)` : Chargement des données dans la grille
- `EnregistrerUneBesoinCharge()` : Enregistrement d'un besoin de charge
- `ConsoliderPeriodes_AffaireSiteComp()` : Consolidation des périodes
- `IsInChargeGrid(cell)` : Vérifier si une cellule est dans la grille charge

**Modes de saisie** :
- **JOUR** : Saisie jour par jour
- **SEMAINE** : Saisie par semaine (lundi-dimanche)
- **MOIS** : Saisie par mois

**Utilisation** :
```vba
' Enregistrer un besoin de charge
ModuleCharge.EnregistrerUneBesoinCharge _
    "AFF001", "Site1", "IES", #1/15/2026#, 1

' Consolider les périodes pour une compétence
ModuleCharge.ConsoliderPeriodes_AffaireSiteComp _
    "AFF001", "Site1", "IES"
```

### 👥 ModuleAffectation - Gestion des affectations

**Rôle** : Gestion des affectations de ressources sur les projets

**Fonctions principales** :
- `BuildCompetenceBlocks(ws, comps, startRow)` : Construction des blocs d'affectation
- `ChargerAffectations(ws, affaireID, siteVal)` : Chargement des affectations existantes
- `EnregistrerUneAffectation()` : Enregistrement d'une affectation
- `ConsoliderAffectationsRessource()` : Consolidation des affectations
- `IsInAffectationGrid(cell)` : Vérifier si une cellule est dans la grille affectation
- `GetRessourcesBySiteComp(site, comp)` : Obtenir les ressources disponibles

**Détection automatique** :
- **Conflits** : Ressource déjà affectée ailleurs
- **Absences** : Ressource absente sur la période
- **Formations** : Ressource en formation
- **Transferts** : Ressource indisponible (transfert actif)

**Utilisation** :
```vba
' Enregistrer une affectation
ModuleAffectation.EnregistrerUneAffectation _
    "AFF001", "Site1", "Dupont Jean", "IES", _
    #1/15/2026#, #1/22/2026#, 5

' Consolider les affectations
ModuleAffectation.ConsoliderAffectationsRessource _
    "AFF001", "Site1", "Dupont Jean", "IES"
```

### 📅 ModuleAbsence - Gestion des absences

**Rôle** : Gestion des absences (congés, formations, arrêts maladie, etc.)

**Fonctions principales** :
- `EnregistrerAbsence()` : Enregistrement d'une absence
- `EstAbsent(ressource, d)` : Vérifier si une ressource est absente
- `EstEnFormation(ressource, d)` : Vérifier si une ressource est en formation
- `GetDetailsAbsence()` : Obtenir les détails d'une absence
- `AppliquerVisuelsAbsencesEtConflits()` : Appliquer les couleurs sur la grille
- `VerifierEtRetirerAffectationsAbsences()` : Retirer automatiquement les affectations en conflit
- `VerifierEtAlerterArretsMaladie30J()` : Alerter pour arrêts maladie > 30 jours
- `MasquerAbsencesAnciennes()` : Masquer les absences terminées depuis > 10 jours

**Types d'absences** :
- **Formation** : Priorité 1 (orange) - Bloque les affectations
- **Absence normale** : Priorité 2 (gris) - Bloque les affectations
- **Arrêt maladie > 30j** : Alerte automatique avec courrier à envoyer

**Utilisation** :
```vba
' Enregistrer une absence
ModuleAbsence.EnregistrerAbsence _
    "Dupont Jean", #2/1/2026#, #2/5/2026#, "Congés payés"

' Vérifier si une ressource est absente
If ModuleAbsence.EstAbsent("Dupont Jean", Date) Then
    MsgBox "Ressource absente"
End If
```

### 🔄 ModuleTransfert - Gestion des transferts

**Rôle** : Gestion des transferts de ressources entre sites

**Fonctions principales** :
- `EnregistrerTransfert()` : Enregistrement d'un transfert
- `AppliquerTransfert()` : Appliquer un transfert (créer affectations)
- `AppliquerTransfertsAuto()` : Appliquer automatiquement les transferts planifiés
- `GetTransfertsTable()` : Récupération de la table TblTransferts

**Statuts** :
- **Planifié** : Transfert prévu mais pas encore appliqué
- **Appliqué** : Transfert actif (affectations créées)

**Utilisation** :
```vba
' Enregistrer un transfert
ModuleTransfert.EnregistrerTransfert _
    "Dupont Jean", "Site1", "Site2", _
    #2/1/2026#, #2/28/2026#, "Planifié"

' Appliquer un transfert
ModuleTransfert.AppliquerTransfert _
    "Dupont Jean", "Site1", "Site2", _
    #2/1/2026#, #2/28/2026#
```

### ⏰ ModuleInterim - Gestion des intérims

**Rôle** : Gestion des intérims et renouvellements de contrats

**Fonctions principales** :
- `InitialiserInterims()` : Initialiser depuis tblRessources
- `VerifierEtAlerterRenouvellements()` : Alerter les renouvellements à venir
- `MettreAJourStatutsRenouvellement()` : Mettre à jour les statuts
- `DesactiverRessourcesExpirees()` : Désactiver les ressources expirées

**Statuts ARenouveler** :
- **A renouveler** : Contrat à renouveler (alerte automatique)
- **Oui** : Contrat renouvelé
- **Non** : Contrat non renouvelé (ressource désactivée)

**Utilisation** :
```vba
' Initialiser les intérims depuis tblRessources
ModuleInterim.InitialiserInterims

' Vérifier les renouvellements à venir
ModuleInterim.VerifierEtAlerterRenouvellements
```

### 🏗️ ModuleChantier - Suivi de chantiers

**Rôle** : Suivi des chantiers avec états et avancement

**Fonctions principales** :
- `EnregistrerEtatChantier()` : Enregistrer un changement d'état
- `CalculerAvancement()` : Calculer l'avancement automatique
- `GenererRapportChantier()` : Générer un rapport
- `VerifierChantiersRetard()` : Vérifier les chantiers en retard

**États disponibles** :
- **Lancer** : Chantier démarré
- **Reporter** : Chantier reporté (email automatique)
- **Prolonger** : Chantier prolongé (email automatique)
- **Terminer** : Chantier terminé
- **Suspendre** : Chantier suspendu (email automatique)

**Utilisation** :
```vba
' Enregistrer un changement d'état
ModuleChantier.EnregistrerEtatChantier _
    "CH001", "Reporter", 45, "Retard matériel"

' Calculer l'avancement
Dim avancement As Double
avancement = ModuleChantier.CalculerAvancement("CH001")
```

### 📈 ModuleDashboard - Gestion du Dashboard

**Rôle** : Gestion du Dashboard et rafraîchissement automatique

**Fonctions principales** :
- `RefreshDashboard()` : Rafraîchir le Dashboard
- `RefreshDashboardIfNeeded()` : Rafraîchir seulement si nécessaire

**Optimisations** :
- **Cooldown** : Ne rafraîchit pas plus d'une fois par 5 secondes
- **Flag** : Utilise `mDashboardNeedsRefresh` pour éviter les refresh inutiles

### 🎨 ModuleGantt - Génération du planning Gantt

**Rôle** : Génération d'un planning type Gantt par ressource/jour

**Fonctions principales** :
- `GenererGanttAffectations()` : Générer le planning Gantt
- `RefreshGanttIfNeeded()` : Rafraîchir seulement si nécessaire

**Couleurs** :
- **Affectations** : Couleur par site
- **Formations** : Violet
- **Absences** : Couleur selon type (CP, maladie, etc.)
- **Multi-affectations** : Vert sauge
- **Week-ends** : Fond gris clair
- **Fériés** : Fond bleu clair

**Utilisation** :
```vba
' Générer le planning Gantt
ModuleGantt.GenererGanttAffectations "Planning_Gantt"
```

---

## 🎯 FONCTIONNALITÉS PAR MODULE

### 📊 FEUILLE CHARGE

**Objectif** : Saisie et visualisation de la charge par affaire/site/compétence

**Fonctionnalités** :
1. **Sélection d'affaire** : Via slicer ou cellule B1
2. **Grille de charge** : Saisie par jour/semaine/mois
3. **Consolidation automatique** : Lors de la sortie de la feuille
4. **Validation** : Vérification des dates et valeurs

**Cellules pilotes** :
- **B1** : AffaireID (formule depuis slicer)
- **B6** : Site (formule depuis slicer)
- **B10** : Date début
- **B11** : Date fin
- **B13** : Date override (optionnel)
- **B15** : Précision (JOUR/SEMAINE/MOIS)

**Modes de saisie** :
- **JOUR** : Une colonne = un jour
- **SEMAINE** : Une colonne = une semaine (lundi-dimanche)
- **MOIS** : Une colonne = un mois

**Optimisations** :
- Reconstruction incrémentale (ajoute seulement les nouvelles colonnes)
- Cache des styles (ne reformate pas les colonnes existantes)
- Indexation des compétences (recherche O(1))

### 👥 FEUILLE AFFECTATIONS

**Objectif** : Saisie et visualisation des affectations de ressources

**Fonctionnalités** :
1. **Blocs par compétence** : Un bloc par compétence avec besoin
2. **Ressources disponibles** : Liste filtrée par site et compétence
3. **Validation automatique** : Vérification absences, conflits, transferts
4. **Consolidation automatique** : Lors de la sortie de la feuille
5. **Couleurs** : Indication visuelle des absences/conflits

**Structure** :
```
--- AFFECTATION DES RESSOURCES ---
[Compétence]
  Besoin: [valeurs depuis grille charge]
  Affecté: [somme des affectations]
  [Ressource 1] [valeurs]
  [Ressource 2] [valeurs]
  ...
```

**Validation** :
- **Formation** : Bloque la saisie (message d'erreur)
- **Absence** : Bloque la saisie (message d'erreur)
- **Conflit** : Bloque la saisie si affectation sur autre affaire/site
- **Transfert** : Bloque si ressource indisponible sur le site

### 📅 FEUILLE ABSENCES

**Objectif** : Gestion des absences avec validation automatique

**Fonctionnalités** :
1. **Saisie d'absences** : Date début, date fin, type, commentaire
2. **Validation automatique** : Initialisation pour absences non-formation
3. **Colonnes de validation** :
   - **Validation Saisie** : Oui/Non
   - **SaisiPar** : Utilisateur ayant saisi
   - **DateSaisie** : Date de saisie
4. **Masquage automatique** : Absences terminées depuis > 10 jours

**Types d'absences** :
- **Formation** : Ne nécessite pas de validation
- **Congés payés** : Nécessite validation
- **Maladie** : Nécessite validation
- **Autres** : Nécessite validation

**Workflow validation** :
1. Saisie d'une absence (non-formation)
2. Initialisation automatique :
   - Commentaire = "En attente validation"
   - Validation Saisie = "Non"
   - SaisiPar = Utilisateur actuel
   - DateSaisie = Maintenant
3. Validation manuelle :
   - Validation Saisie = "Oui"
   - Commentaire = "Validé par [Utilisateur] le [Date]"

### 🔄 FEUILLE TRANSFERTS

**Objectif** : Gestion des transferts de ressources entre sites

**Fonctionnalités** :
1. **Enregistrement de transfert** : Ressource, site origine, site destination, dates
2. **Statut** : Planifié / Appliqué
3. **Application automatique** : Si statut = "Appliqué", création d'affectations
4. **Synchronisation** : Correction automatique du site dans les statistiques

**Colonnes** :
- **Ressource** : Nom de la ressource
- **SiteOrigine** : Site d'origine
- **SiteDestination** : Site de destination
- **DateDébut** : Date de début du transfert
- **DateFin** : Date de fin du transfert
- **Statut** : Planifié / Appliqué
- **DateCréation** : Date de création
- **Utilisateur** : Utilisateur ayant créé

**Workflow** :
1. Enregistrer un transfert avec statut "Planifié"
2. Vérifier les dates et la disponibilité
3. Changer le statut en "Appliqué" (manuellement ou automatiquement)
4. Création automatique d'affectations sur le site de destination

### ⏰ FEUILLE INTERIMS

**Objectif** : Gestion des intérims et renouvellements de contrats

**Fonctionnalités** :
1. **Initialisation automatique** : Depuis tblRessources (TypeContrat = "ETT")
2. **Alerte renouvellement** : 10 jours ouvrés avant échéance
3. **Gestion statuts** : A renouveler / Oui / Non
4. **Désactivation automatique** : Si non renouvelé

**Colonnes** :
- **Ressource** : Nom de la ressource
- **Site** : Site de la ressource
- **DateDébutContrat** : Date de début du contrat
- **DateFinContrat** : Date de fin du contrat
- **ARenouveler** : A renouveler / Oui / Non
- **DateMiseAJour** : Date de mise à jour
- **Commentaire** : Commentaires libres

**Workflow** :
1. Initialisation depuis tblRessources (TypeContrat = "ETT")
2. Vérification automatique des renouvellements à venir
3. Alerte si DateFinContrat dans les 10 jours ouvrés
4. Mise à jour du statut ARenouveler
5. Si "Oui" : Renouvellement automatique (extension de DateFinContrat)
6. Si "Non" : Désactivation de la ressource et suppression des affectations futures

### 🏗️ FEUILLE CHANTIERS

**Objectif** : Suivi des chantiers avec états et avancement

**Fonctionnalités** :
1. **Gestion des états** : Lancer, Reporter, Prolonger, Terminer, Suspendre
2. **Calcul d'avancement** : Automatique basé sur les dates
3. **Historique** : Tous les changements d'état sont enregistrés
4. **Emails automatiques** : Pour les changements d'état critiques
5. **Vérification des retards** : Détection automatique des chantiers en retard

**Colonnes TblChantiers** :
- **ChantierID** : Identifiant unique
- **AffaireID** : Identifiant de l'affaire
- **Site** : Site du chantier
- **Libelle** : Description
- **DateDébut** : Date de début
- **DateFinPrévue** : Date de fin prévue
- **DateFinRéelle** : Date de fin réelle
- **Avancement** : Pourcentage (0-100)
- **EtatActuel** : État actuel
- **Responsable** : Nom du responsable
- **Priorite** : Priorité
- **Commentaire** : Commentaires

### 📊 FEUILLE DASHBOARD

**Objectif** : Visualisation globale et reporting

**Fonctionnalités** :
1. **Tableaux croisés dynamiques** : TCD_Aff, TCD_Princ
2. **Rafraîchissement automatique** : Lors de l'activation de la feuille
3. **Optimisation** : Utilise le cache VBA (TblCacheChargeDepliee)
4. **Cooldown** : Ne rafraîchit pas plus d'une fois par 5 secondes

**TCD disponibles** :
- **TCD_Aff** : Affectations par affaire/site/compétence
- **TCD_Princ** : Vue principale avec tous les indicateurs

### 🎨 FEUILLE PLANNING_GANTT

**Objectif** : Visualisation type Gantt des affectations et absences

**Fonctionnalités** :
1. **Génération automatique** : Depuis TblAffectations et TblAbsences
2. **Couleurs** : Par site, type d'absence, conflits
3. **Rafraîchissement conditionnel** : Seulement si `mGanttNeedsRefresh = True`

**Légende** :
- **Sites** : Couleur par site
- **Formation** : Violet
- **Congés payés** : Jaune
- **Maladie** : Rouge rosé
- **Multi-affectations** : Vert sauge
- **Week-ends** : Fond gris clair
- **Fériés** : Fond bleu clair

---

## 📖 GUIDE D'UTILISATION

### 🚀 DÉMARRAGE DE L'APPLICATION

#### 1. Ouverture du fichier

1. Ouvrir le fichier Excel
2. Autoriser les macros si demandé
3. Attendre le chargement initial (initialisation des caches)

#### 2. Initialisation automatique

Au démarrage, l'application :
- ✅ Charge le calendrier (jours ouvrés, fériés)
- ✅ Initialise les caches (charge, ressources, absences)
- ✅ Vérifie les chantiers en retard
- ✅ Vérifie les renouvellements d'intérims
- ✅ Masque les absences anciennes (> 10 jours)
- ✅ Protège les feuilles de données
- ✅ Crée une sauvegarde automatique (si première ouverture du jour)

### 📊 SAISIE DE CHARGE

#### Étape 1 : Sélectionner une affaire

1. Aller sur la feuille **Charge**
2. Utiliser le **slicer** en haut pour sélectionner une affaire
   - OU saisir directement dans la cellule **B1**
3. Le **site** (B6) se met à jour automatiquement

#### Étape 2 : Configurer les dates

1. **Date début** (B10) : Première date de la période
2. **Date fin** (B11) : Dernière date de la période
3. **Date override** (B13) : Optionnel, force une date de début différente
4. **Précision** (B15) : JOUR / SEMAINE / MOIS

#### Étape 3 : Saisir la charge

1. La grille se construit automatiquement avec les compétences
2. Saisir le **nombre de ressources** nécessaire pour chaque compétence/date
3. Les valeurs sont enregistrées automatiquement lors de la saisie

#### Étape 4 : Consolidation

- La consolidation se fait **automatiquement** lors de la sortie de la feuille
- Les périodes adjacentes avec même charge sont fusionnées

**Exemple** :
```
Compétence: IES
Date 15/01: 2 ressources
Date 16/01: 2 ressources
Date 17/01: 2 ressources
→ Consolidation automatique en une période : 15/01 - 17/01, 2 ressources
```

### 👥 SAISIE D'AFFECTATIONS

#### Étape 1 : Charger la grille d'affectation

1. La grille d'affectation se construit **automatiquement** après la saisie de charge
2. Un bloc est créé pour chaque compétence avec besoin > 0

#### Étape 2 : Saisir les affectations

1. Pour chaque ressource, saisir **1** dans les cellules correspondantes
2. La validation est automatique :
   - ✅ Vérifie les absences
   - ✅ Vérifie les conflits
   - ✅ Vérifie les transferts
   - ✅ Bloque si problème détecté

#### Étape 3 : Visualisation

- **Couleurs** :
  - 🟠 **Orange** : Formation
  - ⚪ **Gris** : Absence
  - 🟡 **Jaune** : Conflit (affectation ailleurs)
  - 🟢 **Vert sauge** : Multi-affectations
  - 🔵 **Bleu clair** : Transfert indisponible

#### Étape 4 : Consolidation

- La consolidation se fait **automatiquement** lors de la sortie de la feuille
- Les périodes adjacentes sont fusionnées

### 📅 GESTION DES ABSENCES

#### Saisie d'une absence

1. Aller sur la feuille **Absences**
2. Ajouter une nouvelle ligne dans la table **TblAbsences**
3. Remplir :
   - **Ressource** : Nom de la ressource
   - **Site** : Site de la ressource
   - **DateDébut** : Date de début
   - **DateFin** : Date de fin
   - **Type** : Type d'absence (Formation, Congés payés, Maladie, etc.)
   - **Commentaire** : Commentaires libres
   - **Comp** : Compétence concernée (optionnel)

#### Validation automatique (non-formation)

Si le type n'est **pas** "Formation" :
1. **Initialisation automatique** :
   - Commentaire = "En attente validation"
   - Validation Saisie = "Non"
   - SaisiPar = Utilisateur actuel
   - DateSaisie = Maintenant

2. **Validation manuelle** :
   - Changer "Validation Saisie" en "Oui"
   - Le commentaire est automatiquement mis à jour : "Validé par [Utilisateur] le [Date]"

#### Masquage automatique

- Les absences terminées depuis **> 10 jours** sont automatiquement masquées
- Elles restent dans la table mais ne sont plus visibles
- Utile pour garder l'historique sans encombrer l'affichage

#### Arrêts maladie > 30 jours

- **Alerte automatique** : Création d'une alerte dans TblAlertes
- **Courrier à envoyer** : Colonne "Courrier Statut" = "A envoyer"
- **Prise en compte** : Colonne "PriseEnCompte" = "Non" par défaut

### 🔄 GESTION DES TRANSFERTS

#### Enregistrer un transfert

1. Aller sur la feuille **Transferts**
2. Ajouter une nouvelle ligne dans la table **TblTransferts**
3. Remplir :
   - **Ressource** : Nom de la ressource
   - **SiteOrigine** : Site d'origine
   - **SiteDestination** : Site de destination
   - **DateDébut** : Date de début du transfert
   - **DateFin** : Date de fin du transfert
   - **Statut** : Planifié / Appliqué

#### Appliquer un transfert

**Méthode 1 : Manuelle**
1. Changer le statut de "Planifié" à "Appliqué"
2. Les affectations sont créées automatiquement sur le site de destination

**Méthode 2 : Automatique**
- Les transferts planifiés avec DateDébut <= aujourd'hui sont appliqués automatiquement
- Appelé lors de `AppliquerTransfertsAuto()`

#### Impact sur les statistiques

- Le site de la ressource est **automatiquement corrigé** dans les statistiques
- La requête PowerQuery `RessourcesParSemaine` prend en compte les transferts appliqués
- Pas besoin de modifier manuellement tblRessources

### ⏰ GESTION DES INTÉRIMS

#### Initialisation

1. Exécuter `ModuleInterim.InitialiserInterims`
2. Les intérims sont créés automatiquement depuis **tblRessources** (TypeContrat = "ETT")

#### Alerte renouvellement

- **10 jours ouvrés** avant DateFinContrat : Alerte automatique
- Colonne **ARenouveler** = "A renouveler"
- Alerte créée dans **TblAlertes**

#### Renouvellement

1. Changer **ARenouveler** en "Oui"
2. La DateFinContrat est automatiquement prolongée de la durée du contrat initial
3. Le statut est réinitialisé

#### Non-renouvellement

1. Changer **ARenouveler** en "Non"
2. La ressource est automatiquement désactivée (Actif = "NON" dans tblRessources)
3. Les affectations futures sont supprimées

### 🏗️ SUIVI DES CHANTIERS

#### Créer un chantier

1. Aller sur la feuille **Chantiers**
2. Ajouter une nouvelle ligne dans la table **TblChantiers**
3. Remplir les informations de base

#### Changer l'état d'un chantier

**Via VBA** :
```vba
ModuleChantier.EnregistrerEtatChantier "CH001", "Reporter", 45, "Retard matériel"
```

**Via interface** :
1. Changer la colonne **EtatActuel** dans la table
2. Les actions spécifiques sont déclenchées automatiquement :
   - **Reporter** : Demande nouvelle date de fin
   - **Prolonger** : Demande nombre de jours à ajouter
   - **Terminer** : Met DateFinRéelle et Avancement = 100%

#### Vérification des retards

- **Automatique** : Vérifie les chantiers en retard au démarrage
- **Email automatique** : Si chantiers en retard détectés
- **Rapport** : Génération d'un rapport avec les retards

### 📊 CONSULTATION DU DASHBOARD

#### Accès au Dashboard

1. Aller sur la feuille **Dashboard**
2. Le Dashboard se rafraîchit automatiquement si des modifications ont été détectées

#### Utilisation des TCD

1. **TCD_Aff** : Affectations par affaire/site/compétence
2. **TCD_Princ** : Vue principale avec tous les indicateurs
3. Utiliser les **slicers** pour filtrer

#### Rafraîchissement

- **Automatique** : Lors de l'activation de la feuille (si modifications détectées)
- **Manuel** : Bouton de rafraîchissement ou F5
- **Optimisation** : Utilise le cache VBA pour éviter les recalculs

### 🎨 CONSULTATION DU GANTT

#### Génération du Gantt

1. Aller sur la feuille **Planning_Gantt**
2. Le Gantt se génère automatiquement si nécessaire
3. OU exécuter manuellement : `ModuleGantt.GenererGanttAffectations`

#### Lecture du Gantt

- **Lignes** : Ressources
- **Colonnes** : Dates (jours)
- **Couleurs** :
  - Par site pour les affectations
  - Par type pour les absences
  - Gris clair pour les week-ends
  - Bleu clair pour les fériés

---

## 🔄 WORKFLOWS

### Workflow 1 : Création d'une nouvelle affaire

```
1. Créer l'affaire dans tblAffaires
   └─> AffaireID, Site, Libelle, etc.

2. Aller sur la feuille Charge
   └─> Sélectionner l'affaire via slicer

3. Configurer les dates (B10, B11, B15)
   └─> La grille se construit automatiquement

4. Saisir les besoins de charge
   └─> Par compétence et par date

5. La grille d'affectation se construit automatiquement
   └─> Après saisie de charge

6. Affecter les ressources
   └─> Saisir 1 dans les cellules correspondantes

7. Consolidation automatique
   └─> Lors de la sortie de la feuille
```

### Workflow 2 : Gestion d'une absence

```
1. Saisir l'absence dans TblAbsences
   └─> Ressource, Dates, Type, Commentaire

2. Si non-formation : Initialisation automatique
   └─> Commentaire = "En attente validation"
   └─> Validation Saisie = "Non"

3. Validation manuelle
   └─> Changer "Validation Saisie" en "Oui"
   └─> Commentaire mis à jour automatiquement

4. Vérification automatique des affectations
   └─> Retrait automatique des affectations en conflit
   └─> Découpage des périodes si nécessaire

5. Si arrêt maladie > 30 jours
   └─> Alerte créée dans TblAlertes
   └─> Courrier Statut = "A envoyer"
```

### Workflow 3 : Transfert de ressource

```
1. Enregistrer le transfert dans TblTransferts
   └─> Ressource, SiteOrigine, SiteDestination, Dates
   └─> Statut = "Planifié"

2. Changer le statut en "Appliqué"
   └─> Création automatique d'affectations sur site destination
   └─> Pour toutes les compétences de la ressource

3. Correction automatique du site
   └─> La requête PowerQuery corrige le site dans les statistiques
   └─> Pas besoin de modifier tblRessources manuellement

4. Indisponibilité sur site origine
   └─> La ressource est indisponible sur le site d'origine pendant le transfert
   └─> Affichage visuel dans la grille d'affectation
```

### Workflow 4 : Renouvellement d'intérim

```
1. Alerte automatique (10 jours ouvrés avant échéance)
   └─> ARenouveler = "A renouveler"
   └─> Alerte créée dans TblAlertes

2. Décision de renouvellement
   └─> Changer ARenouveler en "Oui" ou "Non"

3. Si "Oui" : Renouvellement automatique
   └─> DateFinContrat prolongée de la durée initiale
   └─> ARenouveler réinitialisé

4. Si "Non" : Désactivation
   └─> Actif = "NON" dans tblRessources
   └─> Suppression des affectations futures
```

### Workflow 5 : Suivi de chantier

```
1. Créer le chantier dans TblChantiers
   └─> Informations de base

2. Lancer le chantier
   └─> EtatActuel = "Lancer"
   └─> DateDébut mise à jour si vide

3. Suivi de l'avancement
   └─> Calcul automatique ou saisie manuelle
   └─> Changements d'état enregistrés dans TblEtatsChantiers

4. Si retard : Reporter ou Prolonger
   └─> Email automatique envoyé
   └─> Nouvelle date calculée

5. Terminer le chantier
   └─> EtatActuel = "Terminer"
   └─> DateFinRéelle = aujourd'hui
   └─> Avancement = 100%
```

---

## ⚡ OPTIMISATIONS ET PERFORMANCES

### Cache VBA

L'application utilise des **caches en mémoire** pour optimiser les performances :

#### Cache des ListObjects
- **ModuleExec** : Cache des tables Excel (TblPeriodes, TblAffectations, etc.)
- **Invalidation** : Automatique après modifications
- **Gain** : Évite les accès répétés aux tables

#### Cache Dashboard
- **TblCacheChargeDepliee** : Cache de la charge dépliée par semaine
- **Reconstruction** : Seulement si TblPeriodes modifiée
- **Gain** : -70% temps de refresh Dashboard

#### Cache Ressources
- **TblCacheRessourcesSemaine** : Cache des ressources par semaine
- **Reconstruction** : Seulement si tblRessources modifiée
- **Gain** : -80% temps de calcul RessourcesParSemaine

#### Cache Absences
- **TblCacheAbsencesSemaine** : Cache des absences par semaine
- **Reconstruction** : Seulement si TblAbsences modifiée
- **Gain** : -75% temps de calcul Depliage_Semaine_Absence

### Optimisations grille Charge

#### Reconstruction incrémentale
- **Détection** : Si dates identiques → Ne fait rien
- **Extension** : Si dates étendues → Ajoute seulement nouvelles colonnes
- **Réduction** : Si dates réduites → Supprime seulement colonnes en trop
- **Gain** : 50-70% sur les reconstructions partielles

#### Cache des styles
- **Mémorisation** : Zones déjà formatées
- **Application** : Seulement sur nouvelles colonnes
- **Gain** : 30-50% sur le formatage

#### Indexation des compétences
- **Dictionnaire** : Compétence → Numéro de ligne
- **Recherche** : O(1) au lieu de O(n)
- **Gain** : 99% sur les recherches

### Optimisations chargement données

#### Chargement en mémoire
- **Tableaux Variant** : Chargement complet des données en mémoire
- **Gain** : Évite les accès répétés aux ListRows

#### Consolidation différée
- **Report** : Consolidation lors de Worksheet_Deactivate
- **Gain** : Évite les consolidations multiples lors de la saisie

#### Rafraîchissement conditionnel
- **Flags** : `mDashboardNeedsRefresh`, `mGanttNeedsRefresh`
- **Cooldown** : Ne rafraîchit pas plus d'une fois par période
- **Gain** : Évite les refresh inutiles

### Optimisations PowerQuery

#### Utilisation du cache VBA
- **Priorité** : Utilise TblCacheChargeDepliee si disponible
- **Fallback** : Recalcul depuis TblPeriodes si cache invalide
- **Gain** : -70% temps de refresh

#### Filtrage précoce
- **Dates** : Filtre sur les années paramétrées dès le début
- **Actifs** : Filtre les ressources actives avant jointure
- **Gain** : Réduction du volume de données traitées

---

## 🛠️ MAINTENANCE ET DÉPANNAGE

### Vérifications automatiques

L'application effectue des vérifications automatiques :

#### Vérifications quotidiennes
- **Chantiers en retard** : Vérifie les chantiers avec DateFinPrévue < aujourd'hui
- **Renouvellements intérims** : Vérifie les renouvellements à venir (10 jours ouvrés)
- **Absences anciennes** : Masque les absences terminées depuis > 10 jours

#### Vérifications après modifications
- **Conflits d'affectation** : Détection automatique
- **Données orphelines** : Vérification de l'intégrité
- **Doublons** : Détection des doublons exacts

### Nettoyage et maintenance

#### Nettoyage des données orphelines
```vba
' Supprimer les affectations/charges pour affaires/sites inexistants
ModuleMaintenance.NettoyerDonneesOrphelines
```

#### Archivage des données anciennes
```vba
' Archiver les données de plus de 2 ans
ModuleMaintenance.ArchiverAnciennesDonnees
```

#### Reconstruction des index
```vba
' Reconstruire tous les caches
ModuleMaintenance.ReconstruireIndex
```

#### Optimisation complète
```vba
' Nettoyage + Reconstruction + Compaction
ModuleMaintenance.OptimiserTables
```

### Dépannage courant

#### Problème : La grille ne se construit pas

**Solution** :
1. Vérifier que B1 (AffaireID) n'est pas vide
2. Vérifier que les dates (B10, B11) sont valides
3. Exécuter manuellement : `ModuleCharge.ConstruireGrille`

#### Problème : Les affectations ne s'affichent pas

**Solution** :
1. Vérifier que la charge a été saisie
2. Vérifier que les compétences ont besoin > 0
3. Exécuter manuellement : `ModuleAffectation.BuildCompetenceBlocks`

#### Problème : Le Dashboard ne se rafraîchit pas

**Solution** :
1. Vérifier que les PowerQuery sont à jour
2. Forcer le rafraîchissement : `ModuleDashboard.RefreshDashboard True`
3. Vérifier que le cache est valide

#### Problème : Erreur "Table introuvable"

**Solution** :
1. Vérifier que la feuille existe
2. Vérifier que la table existe dans la feuille
3. Invalider le cache : `ModuleExec.InvalidateListObjectCache`
4. Réessayer

#### Problème : Performance lente

**Solution** :
1. Vérifier que les caches sont initialisés
2. Vérifier que les optimisations sont actives
3. Exécuter : `ModuleMaintenance.OptimiserTables`
4. Vérifier la taille du fichier (voir `IMPACT_TAILLE_FICHIER.md`)

### Logs et débogage

#### Fenêtre Debug VBA

Pour voir les logs :
1. Ouvrir l'éditeur VBA (Alt+F11)
2. Ouvrir la fenêtre Debug (Ctrl+G)
3. Les messages de debug s'affichent avec le préfixe `[Module]`

#### Messages de debug

Les modules affichent des messages de debug :
- `[Module] START` : Début d'une opération
- `[Module] END` : Fin d'une opération
- `[Module] ERREUR` : Erreur détectée
- `[Module] Step X` : Étapes d'une opération longue

#### Exemple de logs
```
[InitializeDashboardCache] START
[InitializeDashboardCache] Step 1 - EnsureCacheSheetAndTable : 0.050 sec
[InitializeDashboardCache] Step 2 - BuildChargeDeplieeDict : 2.350 sec
[InitializeDashboardCache] Step 3 - SyncDictToTable : 0.120 sec
[InitializeDashboardCache] END (2.520 sec)
```

---

## 📚 ANNEXES

### A. Structure des tables

#### TblPeriodes (Charge)
| Colonne | Type | Description |
|---------|------|-------------|
| AffaireID | Texte | Identifiant de l'affaire |
| Site | Texte | Site |
| Comp | Texte | Compétence |
| DateDébut | Date | Date de début |
| DateFin | Date | Date de fin |
| NbRessources | Nombre | Nombre de ressources nécessaires |

#### TblAffectations
| Colonne | Type | Description |
|---------|------|-------------|
| AffaireID | Texte | Identifiant de l'affaire |
| Site | Texte | Site |
| Ressource | Texte | Nom de la ressource |
| Comp | Texte | Compétence |
| DateDébut | Date | Date de début |
| DateFin | Date | Date de fin |
| Charge | Nombre | Charge (jours ouvrés) |

#### TblAbsences
| Colonne | Type | Description |
|---------|------|-------------|
| Ressource | Texte | Nom de la ressource |
| Site | Texte | Site |
| DateDébut | Date | Date de début |
| DateFin | Date | Date de fin |
| Type | Texte | Type d'absence |
| Commentaire | Texte | Commentaires |
| Comp | Texte | Compétence (optionnel) |
| Validation Saisie | Texte | Oui/Non |
| SaisiPar | Texte | Utilisateur ayant saisi |
| DateSaisie | Date/Heure | Date de saisie |

#### TblTransferts
| Colonne | Type | Description |
|---------|------|-------------|
| Ressource | Texte | Nom de la ressource |
| SiteOrigine | Texte | Site d'origine |
| SiteDestination | Texte | Site de destination |
| DateDébut | Date | Date de début |
| DateFin | Date | Date de fin |
| Statut | Texte | Planifié/Appliqué |
| DateCréation | Date/Heure | Date de création |
| Utilisateur | Texte | Utilisateur ayant créé |

#### TblInterims
| Colonne | Type | Description |
|---------|------|-------------|
| Ressource | Texte | Nom de la ressource |
| Site | Texte | Site |
| DateDébutContrat | Date | Date de début du contrat |
| DateFinContrat | Date | Date de fin du contrat |
| ARenouveler | Texte | A renouveler/Oui/Non |
| DateMiseAJour | Date/Heure | Date de mise à jour |
| Commentaire | Texte | Commentaires |

#### TblChantiers
| Colonne | Type | Description |
|---------|------|-------------|
| ChantierID | Texte | Identifiant unique |
| AffaireID | Texte | Identifiant de l'affaire |
| Site | Texte | Site |
| Libelle | Texte | Description |
| DateDébut | Date | Date de début |
| DateFinPrévue | Date | Date de fin prévue |
| DateFinRéelle | Date | Date de fin réelle |
| Avancement | Nombre | Pourcentage (0-100) |
| EtatActuel | Texte | État actuel |
| Responsable | Texte | Nom du responsable |
| Priorite | Texte | Priorité |
| Commentaire | Texte | Commentaires |

#### TblAlertes
| Colonne | Type | Description |
|---------|------|-------------|
| PriseEnCompte | Texte | Oui/Non |
| Courrier Statut | Texte | A envoyer/Envoyé |
| DateAction | Date/Heure | Date de l'action |
| TypeAlerte | Texte | Type d'alerte |
| Ressource | Texte | Nom de la ressource |
| AffaireID | Texte | Identifiant de l'affaire |
| Site | Texte | Site |
| Competence | Texte | Compétence |
| DateDebut | Date | Date de début |
| DateFin | Date | Date de fin |
| Action | Texte | Description de l'action |
| Utilisateur | Texte | Utilisateur |

### B. Requêtes PowerQuery principales

#### qry_CalOuvres
- **Source** : Génération de dates depuis paramètres
- **Colonnes** : Date, IsWeekend, IsHoliday, IsBusinessDay, WeekStart, ISOWeek, ISOYear, SemaineISO
- **Utilisation** : Calendrier de référence pour tous les calculs

#### pqcharge (Depliage_Semaine)
- **Source** : TblPeriodes
- **Transformation** : Dépliage par semaine avec calcul des jours ouvrés
- **Résultat** : Charge par affaire/site/compétence/semaine

#### pqchargedepliee (tblChargeDepliee)
- **Source** : TblPeriodes OU TblCacheChargeDepliee (si disponible)
- **Transformation** : Dépliage par semaine avec optimisation cache
- **Résultat** : Charge dépliée pour Dashboard

#### pqressourcesemiane (RessourcesParSemaine)
- **Source** : tblRessourcesComp
- **Transformation** : Produit cartésien Ressource × Semaine
- **Résultat** : Ressources disponibles par semaine

#### pqabsencesemaine (Depliage_Semaine_Absence)
- **Source** : TblAbsences
- **Transformation** : Dépliage par semaine avec jours ouvrés
- **Résultat** : Absences par ressource/semaine

### C. Constantes et paramètres

#### Paramètres (Feuille Paramètres)
- **L1** : Année de début (défaut : 2026)
- **L2** : Année de fin (défaut : 2030)

#### Constantes VBA
- **REFRESH_COOLDOWN_SEC** : 60 secondes (cooldown refresh TCD)
- **DASHBOARD_REFRESH_COOLDOWN_SEC** : 5 secondes (cooldown Dashboard)
- **AUTO_CHECK_INTERVAL_SEC** : 30 secondes (intervalle vérifications auto)
- **JOURS_ALERTE_ABSENCE** : 7 jours (alerte absences à venir)
- **JOURS_ALERTE_RENOUVELLEMENT** : 10 jours ouvrés (alerte renouvellements)
- **ARCHIVE_YEARS** : 2 ans (archivage données anciennes)
- **BACKUP_RETENTION_DAYS** : 30 jours (rétention sauvegardes)

### D. Codes d'erreur courants

#### Erreur 1004 : Application-defined or object-defined error
- **Cause** : Accès à une cellule/table invalide
- **Solution** : Vérifier que la table existe et est accessible

#### Erreur 9 : Subscript out of range
- **Cause** : Index de tableau invalide
- **Solution** : Vérifier les bornes du tableau avant accès

#### Erreur 13 : Type mismatch
- **Cause** : Type de données incorrect
- **Solution** : Vérifier les types avant conversion

#### Erreur 91 : Object variable or With block variable not set
- **Cause** : Objet Nothing
- **Solution** : Vérifier que l'objet est initialisé avant utilisation

### E. Commandes utiles

#### Dans l'éditeur VBA

```vba
' Forcer le rafraîchissement du Dashboard
ModuleDashboard.RefreshDashboard True

' Reconstruire tous les caches
ModuleMaintenance.ReconstruireIndex

' Nettoyer les données orphelines
ModuleMaintenance.NettoyerDonneesOrphelines

' Vérifier l'intégrité des données
ModuleValidation.AfficherRapportIntégrité

' Vérifier les doublons
ModuleValidation.AfficherRapportDoublons

' Générer le Gantt
ModuleGantt.GenererGanttAffectations

' Masquer les absences anciennes
ModuleAbsence.MasquerAbsencesAnciennes

' Vérifier les arrêts maladie > 30 jours
ModuleAbsence.VerifierEtAlerterArretsMaladie30J
```

#### Dans Excel

- **F5** : Rafraîchir les PowerQuery
- **Ctrl+Shift+F9** : Recalculer toutes les formules
- **Alt+F11** : Ouvrir l'éditeur VBA
- **Ctrl+G** : Ouvrir la fenêtre Debug (dans VBA)

### F. Bonnes pratiques

#### Saisie de données
1. ✅ Toujours utiliser les tables structurées (pas de saisie en dehors)
2. ✅ Respecter les formats de dates (dd/mm/yyyy)
3. ✅ Utiliser les listes déroulantes pour les choix (validation de données)
4. ✅ Vérifier les conflits avant de valider

#### Performance
1. ✅ Laisser la consolidation se faire automatiquement (ne pas forcer)
2. ✅ Utiliser les caches (ne pas les invalider inutilement)
3. ✅ Éviter les modifications en masse (utiliser les fonctions dédiées)

#### Maintenance
1. ✅ Vérifier régulièrement l'intégrité des données
2. ✅ Nettoyer les données orphelines périodiquement
3. ✅ Archiver les données anciennes (> 2 ans)
4. ✅ Vérifier les sauvegardes automatiques

#### Sécurité
1. ✅ Ne pas désactiver les macros (nécessaires pour le fonctionnement)
2. ✅ Vérifier les sauvegardes quotidiennes
3. ✅ Protéger les feuilles de données (protection automatique au démarrage)

---

## 📞 SUPPORT ET RESSOURCES

### Documentation complémentaire

- **`GUIDE_PHASE1_OPTIMISATION_EXCEL.md`** : Guide d'optimisation
- **`GUIDE_CHANTIERS.md`** : Guide détaillé module chantiers
- **`GUIDE_UTILISATION_OPTIMISATIONS.md`** : Guide des optimisations
- **`POWER_APPS_GUIDE_PRATIQUE.md`** : Guide Power Apps (évolution future)

### Modules de référence

- **ModuleExec** : Fonctions centrales et cache
- **ModuleCalendar** : Toutes les fonctions calendrier
- **ModuleErrorHandling** : Gestion d'erreurs centralisée

### Logs et débogage

- **Fenêtre Debug VBA** : Tous les messages de debug
- **Fichier log** : `C:\Temp\ExcelErrors.log` (si activé)

---

**Version du guide** : 1.0  
**Date de mise à jour** : 2025-01-27  
**Application** : Gestion de Ressources Excel VBA
