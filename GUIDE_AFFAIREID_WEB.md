# 📋 Guide d'utilisation : Génération automatique AffaireID dans l'application web

## ✅ Migration appliquée

La migration `MIGRATION_AFFAIRES_AFFAIREID.sql` a été appliquée avec succès à votre base de données Supabase.

## 🎯 Fonctionnement

L'`AffaireID` est maintenant généré **automatiquement** dans l'application web, exactement comme dans Excel, selon la formule :

```
=SI(ET([@Statut]<>"Ouverte";[@Statut]<>"Prévisionnelle");"";"["&[@Tranche]&"]["&[@SiteMap]&"]["&[@Affaire]&"]")
```

### Format généré
- **Format** : `[Tranche][SiteMap][Affaire]`
- **Exemples** :
  - `[TOUTE][BEL][PACK TEM]`
  - `[1][BEL][PNPE 3313]`

### Conditions de génération
- ✅ **Généré** si `Statut` = `"Ouverte"` ou `"Prévisionnelle"`
- ❌ **Vidé** si `Statut` ≠ `"Ouverte"` ET ≠ `"Prévisionnelle"`
- ❌ **Vidé** si `Tranche`, `Site` ou `Affaire` sont vides

## 📊 Structure de la table `affaires`

### Colonnes ajoutées

| Colonne | Type | Description | Obligatoire |
|---------|------|-------------|-------------|
| `tranche` | TEXT | Tranche ou segment (ex: "TOUTE", "1") | ✅ Pour générer AffaireID |
| `affaire_nom` | TEXT | Nom de l'affaire (ex: "PACK TEM", "PNPE 3313") | ✅ Pour générer AffaireID |
| `statut` | TEXT | Statut (ex: "Ouverte", "Prévisionnelle") | ✅ Pour générer AffaireID |
| `compte` | TEXT | Code compte interne (ex: "2VPBA0") | ❌ |
| `date_debut_dem` | DATE | Date début demande | ❌ |
| `date_fin_dem` | DATE | Date fin demande | ❌ |
| `responsable` | TEXT | Responsable de l'affaire | ❌ |
| `budget_heures` | NUMERIC(10,2) | Budget en heures | ❌ |
| `raf` | NUMERIC(10,2) | Reste À Faire (heures) | ❌ |
| `date_maj` | TIMESTAMP | Date dernière mise à jour | ❌ |
| `total_planifie` | NUMERIC(10,2) | Total heures planifiées | ❌ |

### Colonnes existantes utilisées

| Colonne | Type | Description |
|---------|------|-------------|
| `affaire_id` | TEXT | **Généré automatiquement** (format: `[Tranche][SiteMap][Affaire]`) |
| `site` | TEXT | Site physique (ex: "BELLEVILLE") - utilisé pour obtenir SiteMap |
| `libelle` | TEXT | Description de l'affaire |

## 🔧 Utilisation dans l'application web

### 1. Créer une nouvelle affaire

```typescript
// Exemple avec Supabase Client
const { data, error } = await supabase
  .from('affaires')
  .insert({
    tranche: 'TOUTE',
    site: 'BELLEVILLE',
    affaire_nom: 'PACK TEM',
    statut: 'Ouverte',
    libelle: 'Description de l\'affaire',
    compte: '2VPBA0',
    date_debut_dem: '2026-01-05',
    date_fin_dem: '2026-12-18',
    responsable: 'BARBEROT Matthieu',
    budget_heures: 3402,
    total_planifie: 3402
  })
  .select();

// L'AffaireID sera automatiquement généré : [TOUTE][BEL][PACK TEM]
console.log(data[0].affaire_id); // "[TOUTE][BEL][PACK TEM]"
```

### 2. Mettre à jour une affaire

```typescript
// Changer le statut (AffaireID sera automatiquement vidé si ≠ "Ouverte"/"Prévisionnelle")
const { data, error } = await supabase
  .from('affaires')
  .update({ statut: 'Fermée' })
  .eq('id', affaireId)
  .select();

// L'AffaireID sera automatiquement vidé car statut = "Fermée"
console.log(data[0].affaire_id); // ""

// Changer la tranche (AffaireID sera automatiquement régénéré)
const { data, error } = await supabase
  .from('affaires')
  .update({ tranche: '1' })
  .eq('id', affaireId)
  .select();

// L'AffaireID sera automatiquement régénéré : [1][BEL][PACK TEM]
console.log(data[0].affaire_id); // "[1][BEL][PACK TEM]"
```

### 3. Récupérer le SiteMap depuis le Site

Le `SiteMap` est automatiquement récupéré depuis la table `sites` en fonction du nom du site.

**Mapping automatique** (via la table `sites`) :
- `"BELLEVILLE"` → `"BEL"`
- `"BLAYAIS"` → `"BLA"`
- `"GOLFECH"` → `"GOL"`
- etc.

Si le site n'est pas trouvé dans la table `sites`, le `SiteMap` sera le nom du site en majuscules (fallback).

## 🎨 Exemple d'interface utilisateur

### Formulaire de création d'affaire

```typescript
// Composant React/Next.js exemple
const CreateAffaireForm = () => {
  const [formData, setFormData] = useState({
    tranche: '',
    site: '',
    affaire_nom: '',
    statut: 'Ouverte',
    libelle: '',
    compte: '',
    date_debut_dem: '',
    date_fin_dem: '',
    responsable: '',
    budget_heures: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { data, error } = await supabase
      .from('affaires')
      .insert(formData)
      .select();
    
    if (error) {
      console.error('Erreur:', error);
      return;
    }
    
    // L'AffaireID est automatiquement généré
    console.log('Affaire créée avec AffaireID:', data[0].affaire_id);
    // Exemple: "[TOUTE][BEL][PACK TEM]"
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Tranche (ex: TOUTE, 1)"
        value={formData.tranche}
        onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
        required
      />
      
      <select
        value={formData.site}
        onChange={(e) => setFormData({ ...formData, site: e.target.value })}
        required
      >
        <option value="">Sélectionner un site</option>
        <option value="BELLEVILLE">BELLEVILLE</option>
        <option value="BLAYAIS">BLAYAIS</option>
        {/* ... autres sites ... */}
      </select>
      
      <input
        type="text"
        placeholder="Nom de l'affaire (ex: PACK TEM)"
        value={formData.affaire_nom}
        onChange={(e) => setFormData({ ...formData, affaire_nom: e.target.value })}
        required
      />
      
      <select
        value={formData.statut}
        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
        required
      >
        <option value="Ouverte">Ouverte</option>
        <option value="Prévisionnelle">Prévisionnelle</option>
        <option value="Fermée">Fermée</option>
        {/* ... autres statuts ... */}
      </select>
      
      {/* Autres champs ... */}
      
      <button type="submit">Créer l'affaire</button>
    </form>
  );
};
```

### Affichage de l'AffaireID généré

```typescript
// Composant pour afficher l'AffaireID
const AffaireIDDisplay = ({ affaire }) => {
  return (
    <div>
      <h3>AffaireID</h3>
      {affaire.affaire_id ? (
        <p className="affaire-id">{affaire.affaire_id}</p>
      ) : (
        <p className="affaire-id-empty">
          (AffaireID non généré - Statut doit être "Ouverte" ou "Prévisionnelle")
        </p>
      )}
    </div>
  );
};
```

## 🔍 Vérification dans Supabase

### Tester la génération manuellement

```sql
-- Test 1 : Créer une affaire avec statut "Ouverte"
INSERT INTO affaires (tranche, site, affaire_nom, statut, libelle)
VALUES ('TOUTE', 'BELLEVILLE', 'PACK TEM', 'Ouverte', 'Test affaire');

-- Vérifier l'AffaireID généré
SELECT affaire_id, tranche, site, affaire_nom, statut
FROM affaires
WHERE affaire_nom = 'PACK TEM';
-- Résultat attendu : affaire_id = "[TOUTE][BEL][PACK TEM]"

-- Test 2 : Changer le statut vers "Fermée"
UPDATE affaires
SET statut = 'Fermée'
WHERE affaire_nom = 'PACK TEM';

-- Vérifier que l'AffaireID est vidé
SELECT affaire_id, statut
FROM affaires
WHERE affaire_nom = 'PACK TEM';
-- Résultat attendu : affaire_id = ""

-- Test 3 : Remettre le statut à "Ouverte"
UPDATE affaires
SET statut = 'Ouverte'
WHERE affaire_nom = 'PACK TEM';

-- Vérifier que l'AffaireID est régénéré
SELECT affaire_id, statut
FROM affaires
WHERE affaire_nom = 'PACK TEM';
-- Résultat attendu : affaire_id = "[TOUTE][BEL][PACK TEM]"
```

## 📝 Notes importantes

### 1. AffaireID est en lecture seule
- ❌ **Ne pas modifier manuellement** `affaire_id` dans l'interface
- ✅ **Laisser le trigger** le générer automatiquement
- ✅ **Afficher** `affaire_id` en lecture seule dans l'interface

### 2. Validation côté client (optionnel)
```typescript
// Validation avant soumission
const validateAffaire = (formData) => {
  const errors = {};
  
  if (!formData.tranche) {
    errors.tranche = 'La tranche est obligatoire';
  }
  
  if (!formData.site) {
    errors.site = 'Le site est obligatoire';
  }
  
  if (!formData.affaire_nom) {
    errors.affaire_nom = 'Le nom de l\'affaire est obligatoire';
  }
  
  if (!formData.statut) {
    errors.statut = 'Le statut est obligatoire';
  }
  
  // Vérifier que si statut = "Ouverte" ou "Prévisionnelle", 
  // tous les champs nécessaires sont remplis
  if (['Ouverte', 'Prévisionnelle'].includes(formData.statut)) {
    if (!formData.tranche || !formData.site || !formData.affaire_nom) {
      errors.general = 'Tranche, Site et Nom sont obligatoires pour générer l\'AffaireID';
    }
  }
  
  return errors;
};
```

### 3. Affichage conditionnel
```typescript
// Afficher un message si AffaireID n'est pas généré
{affaire.affaire_id ? (
  <Badge color="success">{affaire.affaire_id}</Badge>
) : (
  <Badge color="warning">
    AffaireID non généré (Statut: {affaire.statut})
  </Badge>
)}
```

## 🚀 Prochaines étapes

1. **Mettre à jour votre interface** pour utiliser les nouvelles colonnes
2. **Tester la génération** avec quelques affaires de test
3. **Migrer les données existantes** si nécessaire (ajouter `tranche`, `affaire_nom`, `statut`)
4. **Documenter** pour votre équipe comment utiliser cette fonctionnalité

## ❓ Questions fréquentes

### Q: Que se passe-t-il si je modifie manuellement `affaire_id` ?
**R:** Le trigger le régénérera automatiquement lors de la prochaine modification de `tranche`, `site`, `affaire_nom` ou `statut`.

### Q: Comment obtenir le SiteMap dans mon code frontend ?
**R:** Vous pouvez créer une fonction utilitaire :
```typescript
// Fonction utilitaire pour obtenir SiteMap
const getSiteMap = async (siteName: string) => {
  const { data, error } = await supabase
    .from('sites')
    .select('site_map')
    .or(`site.eq.${siteName},site_key.eq.${siteName}`)
    .single();
  
  return data?.site_map || siteName.toUpperCase();
};
```

### Q: Puis-je désactiver la génération automatique ?
**R:** Oui, vous pouvez supprimer le trigger :
```sql
DROP TRIGGER IF EXISTS trigger_update_affaire_id ON affaires;
```
Mais ce n'est **pas recommandé** car cela casse la cohérence avec Excel.

---

✅ **Migration appliquée avec succès !** L'AffaireID est maintenant généré automatiquement comme dans Excel.
