# 🎬 SCÉNARIO D'UTILISATION COMPLET - CHARGE & AFFECTATION

## 📖 SCÉNARIO : Planification d'un projet

**Contexte** : Vous devez planifier les ressources pour le projet "PROJET_A" sur le site "BLAYAIS" pour le mois de janvier 2026.

---

## 📊 ÉTAPE 1 : SAISIE DE LA CHARGE

### Interface affichée

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 PLANIFICATION DE CHARGE                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Affaire: PROJET_A ▼]  [Site: BLAYAIS ▼]                            │
│  [📅 01/01/2026]  [📅 31/01/2026]                                     │
│  Précision: [● Jour] [○ Semaine] [○ Mois]                            │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐ │
│  │ Compétence   │ 01/01│ 02/01│ 03/01│ 04/01│ 05/01│ 06/01│ Total  │ │
│  ├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤ │
│  │ IES          │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │   0 H  │ │
│  │ INSTRUM       │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │   0 H  │ │
│  │ MECANIQUE     │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │  [ ] │   0 H  │ │
│  └──────────────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┘ │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Actions utilisateur

1. **Sélectionner l'affaire** : Clic sur "Affaire" → Sélection "PROJET_A"
   - Le site "BLAYAIS" est automatiquement sélectionné
   - Les dates sont pré-remplies (01/01/2026 - 31/01/2026)

2. **Saisir les besoins** :
   - Clic sur cellule "IES" / "01/01" → Mode édition
   - Saisie "2" → Enter
   - ✅ Cellule devient jaune avec "2"
   - ✅ Message : "Charge enregistrée avec succès"

3. **Continuer la saisie** :
   - IES : 2, 2, 3, 3, 2, 2 (pour les 6 premiers jours)
   - INSTRUM : 1, 1, 1, 1, 1, 1
   - MECANIQUE : 0, 0, 1, 1, 0, 0

4. **Consolider** :
   - Clic sur "💾 Consolider toutes les compétences"
   - ✅ Les périodes adjacentes avec même charge sont fusionnées
   - ✅ Message : "Toutes les compétences ont été consolidées"

### Résultat en base de données

```sql
-- Table periodes_charge
AffaireID | Site    | Compétence | DateDébut  | DateFin    | NbRessources
----------|---------|------------|------------|------------|-------------
PROJET_A  | BLAYAIS | IES        | 01/01/2026 | 02/01/2026 | 2
PROJET_A  | BLAYAIS | IES        | 03/01/2026 | 04/01/2026 | 3
PROJET_A  | BLAYAIS | IES        | 05/01/2026 | 06/01/2026 | 2
PROJET_A  | BLAYAIS | INSTRUM    | 01/01/2026 | 06/01/2026 | 1
PROJET_A  | BLAYAIS | MECANIQUE  | 03/01/2026 | 04/01/2026 | 1
```

---

## 👥 ÉTAPE 2 : AFFECTATION DES RESSOURCES

### Interface affichée

```
┌──────────────────────────────────────────────────────────────────────┐
│  👥 AFFECTATION DES RESSOURCES                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Affaire: PROJET_A ▼]  [Site: BLAYAIS ▼]                            │
│  [📅 01/01/2026]  [📅 31/01/2026]                                     │
│  Précision: [● Jour] [○ Semaine] [○ Mois]                            │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 📋 IES                                                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Besoin:     2   2   3   3   2   2                               │ │
│  │ Affecté:     0   0   0   0   0   0                              │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Dupont Jean (P)      ⚪  ⚪  ⚪  ⚪  ⚪  ⚪                      │ │
│  │ 👤 Martin Pierre (P)    ⚪  ⚪  ⚪  ⚪  ⚪  ⚪                      │ │
│  │ 👤 Durand Marie (S)     ⚪  ⚪  ⚪  ⚪  ⚪  ⚪                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ⚠️ Besoins non couverts : IES (14 jours)                             │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Actions utilisateur

1. **Voir les besoins** :
   - La ligne "Besoin" affiche automatiquement les besoins du module Charge
   - IES : 2, 2, 3, 3, 2, 2
   - INSTRUM : 1, 1, 1, 1, 1, 1
   - MECANIQUE : 0, 0, 1, 1, 0, 0

2. **Affecter Dupont Jean** :
   - Clic sur cellule "Dupont Jean" / "01/01" → Cellule devient verte ✓
   - ✅ Message : "Affectation enregistrée"
   - Clic sur "02/01" → Cellule devient verte ✓
   - Clic sur "03/01" → Cellule devient verte ✓
   - Clic sur "04/01" → Cellule devient verte ✓

3. **Affecter Martin Pierre** :
   - Clic sur cellule "Martin Pierre" / "01/01" → Cellule devient verte ✓
   - Clic sur "02/01" → Cellule devient verte ✓
   - Clic sur "03/01" → Cellule devient verte ✓
   - Clic sur "04/01" → Cellule devient verte ✓
   - Clic sur "05/01" → Cellule devient verte ✓
   - Clic sur "06/01" → Cellule devient verte ✓

4. **Vérification automatique** :
   - La ligne "Affecté" se met à jour automatiquement
   - IES : 2, 2, 2, 2, 1, 1
   - ⚠️ Alerte : "Sur-affectation détectée le 03/01 et 04/01" (besoin=3, affecté=2)
   - ⚠️ Alerte : "Sous-affectation détectée le 05/01 et 06/01" (besoin=2, affecté=1)

5. **Ajuster les affectations** :
   - Clic sur "Durand Marie" / "03/01" → Cellule devient verte ✓
   - Clic sur "Durand Marie" / "04/01" → Cellule devient verte ✓
   - ✅ La ligne "Affecté" devient : 2, 2, 3, 3, 1, 1
   - ⚠️ Alerte : "Sous-affectation le 05/01 et 06/01"

6. **Finaliser** :
   - Clic sur "Durand Marie" / "05/01" → Cellule devient verte ✓
   - Clic sur "Durand Marie" / "06/01" → Cellule devient verte ✓
   - ✅ La ligne "Affecté" devient : 2, 2, 3, 3, 2, 2
   - ✅ Message : "Tous les besoins sont couverts"

7. **Consolider** :
   - Clic sur "💾 Consolider toutes les affectations"
   - ✅ Les périodes adjacentes sont fusionnées
   - ✅ Optimisation des données en base

### Résultat en base de données

```sql
-- Table affectations
AffaireID | Site    | Ressource    | Compétence | DateDébut  | DateFin    | Charge
----------|---------|--------------|------------|------------|------------|-------
PROJET_A  | BLAYAIS | Dupont Jean  | IES        | 01/01/2026 | 04/01/2026 | 4
PROJET_A  | BLAYAIS | Martin Pierre| IES        | 01/01/2026 | 06/01/2026 | 6
PROJET_A  | BLAYAIS | Durand Marie | IES        | 03/01/2026 | 06/01/2026 | 4
```

---

## 🔄 ÉTAPE 3 : MODIFICATION EN TEMPS RÉEL

### Scénario : Deux utilisateurs simultanés

**Utilisateur A** (Module Charge) :
- Modifie le besoin IES du 03/01 de 3 → 4

**Utilisateur B** (Module Affectation) :
- ✅ Voit automatiquement la modification
- ✅ La ligne "Besoin" se met à jour : 2, 2, **4**, 4, 2, 2
- ⚠️ Alerte : "Besoin non couvert le 03/01 et 04/01" (besoin=4, affecté=3)
- Utilisateur B affecte une ressource supplémentaire
- ✅ La ligne "Affecté" se met à jour : 2, 2, 4, 4, 2, 2

**Utilisateur A** :
- ✅ Voit automatiquement la nouvelle affectation
- ✅ Peut continuer à travailler sans conflit

---

## 🎨 EXEMPLE AVEC ABSENCES

### Scénario : Ressource absente

1. **Utilisateur essaie d'affecter** :
   - Clic sur "Dupont Jean" / "10/01"
   - ❌ Message : "⚠️ Dupont Jean est absent(e) : Absent(e) du 10/01/2026 au 15/01/2026 - Type : Congés payés"
   - ❌ La cellule reste grise (non affectable)

2. **Visualisation** :
   - Les cellules du 10/01 au 15/01 sont en rouge 🔴
   - Tooltip au survol : "Absent : Congés payés"

3. **Affectation possible** :
   - Clic sur "Dupont Jean" / "16/01" → ✅ Fonctionne (après l'absence)

---

## 🎨 EXEMPLE AVEC FORMATIONS

### Scénario : Ressource en formation

1. **Visualisation** :
   - Les cellules du 20/01 au 22/01 sont en jaune 🟡
   - Tooltip au survol : "Formation : Formation sécurité"

2. **Tentative d'affectation** :
   - Clic sur "Martin Pierre" / "20/01"
   - ❌ Message : "⚠️ Martin Pierre est en formation : Formation sécurité"
   - ❌ La cellule reste jaune (non affectable)

3. **Affectation possible** :
   - Clic sur "Martin Pierre" / "23/01" → ✅ Fonctionne (après la formation)

---

## 🎨 EXEMPLE AVEC CONFLITS

### Scénario : Ressource déjà affectée ailleurs

1. **Tentative d'affectation** :
   - Clic sur "Dupont Jean" / "05/01"
   - ❌ Message : "⚠️ Dupont Jean est déjà affecté(e) sur : PROJET_B / BLAYAIS / IES (01/01 - 10/01)"
   - ❌ La cellule reste grise

2. **Résolution** :
   - Option 1 : Désaffecter de PROJET_B d'abord
   - Option 2 : Utiliser une autre ressource

---

## 📊 DASHBOARD - VUE D'ENSEMBLE

### Après toutes les affectations

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 DASHBOARD - PROJET_A / BLAYAIS                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  📈 Couverture des besoins                                            │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ IES        : ████████████████████ 100% ✅                      │   │
│  │ INSTRUM     : ████████████████████ 100% ✅                      │   │
│  │ MECANIQUE   : ████████████████████ 100% ✅                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  👥 Ressources affectées : 3                                          │
│  📅 Période : 01/01/2026 - 31/01/2026                                │
│  ⚠️ Conflits : 0                                                      │
│  ✅ Statut : Tous les besoins sont couverts                          │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW COMPLET

```
1. Saisie Charge
   └─> periodes_charge (besoins)

2. Affectation Ressources
   ├─> Lecture periodes_charge (besoins)
   ├─> Saisie affectations
   └─> affectations (ressources affectées)

3. Consolidation
   ├─> Fusion périodes charge
   └─> Fusion périodes affectations

4. Validation
   ├─> Vérification conflits
   ├─> Vérification absences
   └─> Comparaison besoin vs affecté

5. Dashboard
   └─> Affichage synthèse
```

---

## ✨ POINTS FORTS DE L'INTERFACE

1. **Intuitive** : Saisie directe dans les cellules (comme Excel)
2. **Temps réel** : Synchronisation automatique
3. **Validation** : Vérification automatique des erreurs
4. **Visuel** : Couleurs pour absences, formations, conflits
5. **Performance** : Chargement rapide, cache optimisé
6. **Responsive** : Fonctionne sur mobile/tablette

---

**Cette interface reproduit fidèlement l'expérience Excel avec les avantages du web !** 🚀
