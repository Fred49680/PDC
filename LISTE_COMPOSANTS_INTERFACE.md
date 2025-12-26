# 📦 LISTE COMPLÈTE DES COMPOSANTS - INTERFACE WEB

## 🎯 VUE D'ENSEMBLE

Liste exhaustive de tous les composants React nécessaires pour implémenter les modules Charge et Affectation.

---

## 📊 MODULE CHARGE

### Composants principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `ChargePage` | `src/app/charge/page.tsx` | Page principale du module Charge |
| `GrilleCharge` | `src/components/charge/GrilleCharge.tsx` | Grille interactive de saisie |
| `CelluleCharge` | `src/components/charge/CelluleCharge.tsx` | Cellule éditable individuelle |
| `SelecteurAffaire` | `src/components/charge/SelecteurAffaire.tsx` | Sélecteur d'affaire (dropdown) |
| `SelecteurSite` | `src/components/charge/SelecteurSite.tsx` | Sélecteur de site |
| `SelecteurDates` | `src/components/charge/SelecteurDates.tsx` | Sélecteur de période (date début/fin) |
| `SelecteurPrecision` | `src/components/charge/SelecteurPrecision.tsx` | Sélecteur Jour/Semaine/Mois |

### Hooks

| Hook | Fichier | Description |
|------|---------|-------------|
| `useCharge` | `src/lib/hooks/useCharge.ts` | Gestion des périodes de charge (CRUD) |
| `useRealtime` | `src/lib/hooks/useRealtime.ts` | Synchronisation temps réel |

### Utilitaires

| Utilitaire | Fichier | Description |
|------------|---------|-------------|
| `businessDaysBetween` | `src/lib/utils/calendar.ts` | Calcul jours ouvrés |
| `generateColumns` | `src/lib/utils/calendar.ts` | Génération colonnes selon précision |

---

## 👥 MODULE AFFECTATION

### Composants principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `AffectationsPage` | `src/app/affectations/page.tsx` | Page principale du module Affectation |
| `GrilleAffectations` | `src/components/affectations/GrilleAffectations.tsx` | Grille principale avec blocs compétences |
| `BlocCompetence` | `src/components/affectations/BlocCompetence.tsx` | Bloc pour une compétence (titre + grille) |
| `LigneBesoin` | `src/components/affectations/LigneBesoin.tsx` | Ligne "Besoin" (depuis module Charge) |
| `LigneAffecte` | `src/components/affectations/LigneAffecte.tsx` | Ligne "Affecté" (somme des affectations) |
| `LigneRessource` | `src/components/affectations/LigneRessource.tsx` | Ligne pour une ressource |
| `CelluleAffectation` | `src/components/affectations/CelluleAffectation.tsx` | Cellule toggle (0/1) avec couleurs |
| `ValidationConflits` | `src/components/affectations/ValidationConflits.tsx` | Composant d'affichage des conflits |
| `ListeRessources` | `src/components/affectations/ListeRessources.tsx` | Liste des ressources disponibles |

### Hooks

| Hook | Fichier | Description |
|------|---------|-------------|
| `useAffectations` | `src/lib/hooks/useAffectations.ts` | Gestion des affectations (CRUD) |
| `useAbsences` | `src/lib/hooks/useAbsences.ts` | Chargement des absences pour validation |
| `useFormations` | `src/lib/hooks/useFormations.ts` | Chargement des formations pour validation |
| `useRessources` | `src/lib/hooks/useRessources.ts` | Chargement des ressources par site/compétence |

### Utilitaires

| Utilitaire | Fichier | Description |
|------------|---------|-------------|
| `checkConflict` | `src/lib/utils/validation.ts` | Vérification conflits d'affectation |
| `isRessourceAbsent` | `src/lib/utils/validation.ts` | Vérification absences |
| `isRessourceEnFormation` | `src/lib/utils/validation.ts` | Vérification formations |

---

## 🔗 COMPOSANTS PARTAGÉS

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `ChargeAffectationLink` | `src/components/shared/ChargeAffectationLink.tsx` | Lien entre Charge et Affectation |
| `ComparaisonChargeAffectation` | `src/components/shared/ComparaisonChargeAffectation.tsx` | Graphique de comparaison |
| `MessageStatut` | `src/components/shared/MessageStatut.tsx` | Messages de succès/erreur |
| `Loader` | `src/components/shared/Loader.tsx` | Indicateur de chargement |

---

## 🎨 COMPOSANTS UI (shadcn/ui)

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `Button` | `src/components/ui/button.tsx` | Bouton stylisé |
| `Input` | `src/components/ui/input.tsx` | Champ de saisie |
| `Select` | `src/components/ui/select.tsx` | Sélecteur dropdown |
| `Calendar` | `src/components/ui/calendar.tsx` | Calendrier de sélection de dates |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal/Dialog |
| `Table` | `src/components/ui/table.tsx` | Tableau stylisé |
| `Badge` | `src/components/ui/badge.tsx` | Badge/étiquette |
| `Alert` | `src/components/ui/alert.tsx` | Alerte/notification |

---

## 📋 STRUCTURE COMPLÈTE DES FICHIERS

```
src/
├── app/
│   ├── charge/
│   │   └── page.tsx                    ✅ Page principale Charge
│   └── affectations/
│       └── page.tsx                    ✅ Page principale Affectation
│
├── components/
│   ├── charge/
│   │   ├── GrilleCharge.tsx           ✅ Grille principale
│   │   ├── CelluleCharge.tsx          ✅ Cellule éditable
│   │   ├── SelecteurAffaire.tsx       ✅ Sélecteur affaire
│   │   ├── SelecteurSite.tsx          ✅ Sélecteur site
│   │   ├── SelecteurDates.tsx         ✅ Sélecteur dates
│   │   └── SelecteurPrecision.tsx     ✅ Sélecteur précision
│   │
│   ├── affectations/
│   │   ├── GrilleAffectations.tsx     ✅ Grille principale
│   │   ├── BlocCompetence.tsx         ✅ Bloc par compétence
│   │   ├── LigneBesoin.tsx            ✅ Ligne besoin
│   │   ├── LigneAffecte.tsx           ✅ Ligne affecté
│   │   ├── LigneRessource.tsx         ✅ Ligne ressource
│   │   ├── CelluleAffectation.tsx     ✅ Cellule toggle
│   │   ├── ValidationConflits.tsx     ✅ Validation conflits
│   │   └── ListeRessources.tsx       ✅ Liste ressources
│   │
│   ├── shared/
│   │   ├── ChargeAffectationLink.tsx   ✅ Lien Charge ↔ Affectation
│   │   ├── ComparaisonChargeAffectation.tsx ✅ Graphique comparaison
│   │   ├── MessageStatut.tsx          ✅ Messages statut
│   │   └── Loader.tsx                 ✅ Loader
│   │
│   └── ui/
│       ├── button.tsx                 ✅ Bouton
│       ├── input.tsx                  ✅ Input
│       ├── select.tsx                  ✅ Select
│       ├── calendar.tsx                ✅ Calendar
│       ├── dialog.tsx                  ✅ Dialog
│       ├── table.tsx                   ✅ Table
│       ├── badge.tsx                   ✅ Badge
│       └── alert.tsx                   ✅ Alert
│
├── lib/
│   ├── hooks/
│   │   ├── useCharge.ts               ✅ Hook Charge
│   │   ├── useAffectations.ts         ✅ Hook Affectations
│   │   ├── useAbsences.ts             ✅ Hook Absences
│   │   ├── useFormations.ts          ✅ Hook Formations
│   │   ├── useRessources.ts          ✅ Hook Ressources
│   │   ├── useRealtime.ts            ✅ Hook Temps réel
│   │   └── useChargeToAffectation.ts ✅ Hook Synchronisation
│   │
│   ├── utils/
│   │   ├── calendar.ts                ✅ Utilitaires calendrier
│   │   ├── validation.ts             ✅ Validation données
│   │   └── format.ts                 ✅ Formatage
│   │
│   └── supabase/
│       ├── client.ts                  ✅ Client Supabase (browser)
│       └── server.ts                  ✅ Client Supabase (server)
│
└── types/
    ├── database.ts                    ✅ Types générés Supabase
    ├── charge.ts                      ✅ Types Charge
    └── affectations.ts                ✅ Types Affectations
```

---

## 🎨 MAQUETTES VISUELLES

### Module Charge - Vue complète

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 PLANIFICATION DE CHARGE                                           │
│  Saisissez les besoins en ressources par compétence et par période    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ [Affaire: PROJET_A ▼]  [Site: BLAYAIS ▼]                        │ │
│  │ [📅 01/01/2026]  [📅 31/01/2026]                                 │ │
│  │ Précision: [● Jour] [○ Semaine] [○ Mois]                        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐ │
│  │ Compétence   │ 01/01│ 02/01│ 03/01│ 04/01│ 05/01│ 06/01│ Total  │ │
│  ├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤ │
│  │ IES          │  [2] │  [2] │  [3] │  [3] │  [2] │  [2] │  98 H  │ │
│  │ INSTRUM       │  [1] │  [1] │  [1] │  [1] │  [1] │  [1] │  35 H  │ │
│  │ MECANIQUE     │  [0] │  [0] │  [1] │  [1] │  [0] │  [0] │  14 H  │ │
│  │ ELECTRIQUE    │  [1] │  [1] │  [2] │  [2] │  [1] │  [1] │  49 H  │ │
│  └──────────────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┘ │
│                                                                        │
│  [💾 Consolider toutes les compétences]  [🔄 Actualiser]              │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Module Affectation - Vue complète

```
┌──────────────────────────────────────────────────────────────────────┐
│  👥 AFFECTATION DES RESSOURCES                                        │
│  Affectez les ressources aux besoins identifiés                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 📋 IES                                                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Besoin:     2   2   3   3   2   2                               │ │
│  │ Affecté:     2   2   3   3   2   2  ✅                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Dupont Jean (P)      ✓   ✓   ✓   ✓   ✓   ✓                  │ │
│  │ 👤 Martin Pierre (P)    ✓   ✓   ✓   ✓   ✓   ✓                  │ │
│  │ 👤 Durand Marie (S)     -   -   -   -   -   -                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ 📋 INSTRUM                                                        │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Besoin:     1   1   1   1   1   1                               │ │
│  │ Affecté:     1   1   1   1   1   1  ✅                           │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 👤 Bernard Luc (P)      ✓   ✓   ✓   ✓   ✓   ✓                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Légende: 🟡 Formation  🔴 Absence  🟠 Conflit  ⚪ Disponible         │
│                                                                        │
│  [💾 Consolider toutes les affectations]                              │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 CODES COULEURS

### Module Charge
- **Cellule avec valeur** : Fond jaune clair (`bg-yellow-100`)
- **Cellule vide** : Fond blanc (`bg-white`)
- **Week-end** : Fond bleu très clair (`bg-blue-50`)
- **En-têtes** : Fond gris clair (`bg-gray-100`)

### Module Affectation
- **Formation** : Fond jaune (`bg-yellow-200`), icône diplôme
- **Absence** : Fond rouge (`bg-red-200`), icône X
- **Affecté** : Fond vert (`bg-green-200`), icône check
- **Disponible** : Fond gris (`bg-gray-100`)
- **Conflit** : Fond orange (`bg-orange-200`), icône alerte

---

## 📊 ÉTATS DES COMPOSANTS

### CelluleCharge
- **État initial** : Vide (0) ou avec valeur
- **État édition** : Input focus avec boutons ✓/✗
- **État sauvegarde** : Désactivée pendant sauvegarde
- **État erreur** : Bordure rouge + message

### CelluleAffectation
- **État 0** : Disponible (gris)
- **État 1** : Affecté (vert)
- **État absent** : Absent (rouge, désactivé)
- **État formation** : Formation (jaune, désactivé)
- **État conflit** : Conflit (orange, alerte)

---

## 🔄 FLUX D'INTERACTION

### Saisie Charge
1. Clic sur cellule → Mode édition
2. Saisie valeur → Validation
3. Enter/✓ → Sauvegarde
4. Escape/✗ → Annulation
5. Temps réel → Mise à jour automatique

### Affectation Ressource
1. Clic sur cellule → Toggle (0 ↔ 1)
2. Validation automatique → Vérification conflits/absences
3. Si OK → Sauvegarde
4. Si erreur → Message + Annulation
5. Temps réel → Mise à jour automatique

---

## ✅ CHECKLIST IMPLÉMENTATION

### Module Charge
- [ ] Page principale (`ChargePage`)
- [ ] Grille interactive (`GrilleCharge`)
- [ ] Cellules éditable (`CelluleCharge`)
- [ ] Sélecteurs (Affaire, Site, Dates, Précision)
- [ ] Hook `useCharge`
- [ ] Consolidation automatique
- [ ] Temps réel

### Module Affectation
- [ ] Page principale (`AffectationsPage`)
- [ ] Grille avec blocs (`GrilleAffectations`)
- [ ] Blocs par compétence (`BlocCompetence`)
- [ ] Lignes (Besoin, Affecté, Ressources)
- [ ] Cellules toggle (`CelluleAffectation`)
- [ ] Hook `useAffectations`
- [ ] Validation automatique
- [ ] Temps réel

### Composants partagés
- [ ] Composants UI (shadcn/ui)
- [ ] Hooks utilitaires
- [ ] Utilitaires (calendar, validation, format)

---

**Tous les composants sont documentés et prêts à être implémentés !** 🚀
