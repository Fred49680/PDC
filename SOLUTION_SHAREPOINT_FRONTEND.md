# 🌐 SOLUTION WEB MODERNE - SHAREPOINT BACKEND

## 🎯 ARCHITECTURE PROPOSÉE

### Stack technologique

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND : React + TypeScript + Tailwind CSS           │
│  - Interface utilisateur moderne                        │
│  - Responsive (mobile/tablette/desktop)                 │
│  - Déployé sur Azure Static Web Apps ou Vercel         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ (Microsoft Graph API / REST API)
                       │
┌──────────────────────▼──────────────────────────────────┐
│  BACKEND : SharePoint Online                            │
│  - Listes SharePoint (équivalent tables)              │
│  - Authentification Microsoft 365                       │
│  - Permissions SharePoint                               │
│  - Versioning automatique                               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  SERVICES MICROSOFT                                     │
│  - Microsoft Graph API                                  │
│  - Azure AD (authentification)                          │
│  - Power Automate (automatisations)                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ AVANTAGES DE SHAREPOINT COMME BACKEND

### Avantages
- ✅ **Déjà dans l'écosystème Microsoft** : Pas besoin de nouvelle infrastructure
- ✅ **Authentification intégrée** : Microsoft 365 (SSO)
- ✅ **Permissions granulaires** : Gestion des droits SharePoint
- ✅ **Versioning automatique** : Historique des modifications
- ✅ **Pas de coût supplémentaire** : Si vous avez déjà Microsoft 365
- ✅ **API REST native** : Facile à intégrer
- ✅ **Power Automate** : Automatisations possibles
- ✅ **Mobile** : SharePoint mobile app ou votre app web

### Limitations
- ⚠️ **Performance** : Moins rapide qu'une base de données dédiée
- ⚠️ **Requêtes complexes** : Limitées par l'API REST
- ⚠️ **Temps réel** : Pas de WebSocket natif (mais possible avec polling)
- ⚠️ **Limites** : 5000 items par liste (mais géré avec pagination)

---

## 📊 STRUCTURE SHAREPOINT

### Création des listes SharePoint

#### 1. Liste "Affaires"

**Colonnes** :
- `AffaireID` (Texte sur une seule ligne) - Requis
- `Site` (Choix) - Requis
- `Libelle` (Texte sur plusieurs lignes)
- `Actif` (Oui/Non) - Défaut : Oui
- `DateCreation` (Date et heure) - Défaut : Aujourd'hui
- `DateModification` (Date et heure) - Défaut : Aujourd'hui
- `CreePar` (Personne ou groupe)
- `ModifiePar` (Personne ou groupe)

#### 2. Liste "Ressources"

**Colonnes** :
- `Nom` (Texte sur une seule ligne) - Requis
- `Site` (Choix) - Requis
- `TypeContrat` (Choix) - CDI, CDD, ETT
- `DateDebutContrat` (Date)
- `DateFinContrat` (Date)
- `Actif` (Oui/Non) - Défaut : Oui

#### 3. Liste "RessourcesCompetences"

**Colonnes** :
- `Ressource` (Recherche vers Liste "Ressources") - Requis
- `Competence` (Texte sur une seule ligne) - Requis
- `Niveau` (Choix) - Junior, Senior

#### 4. Liste "PeriodesCharge"

**Colonnes** :
- `Affaire` (Recherche vers Liste "Affaires") - Requis
- `Site` (Texte sur une seule ligne) - Requis
- `Competence` (Texte sur une seule ligne) - Requis
- `DateDebut` (Date) - Requis
- `DateFin` (Date) - Requis
- `NbRessources` (Nombre) - Requis, Min : 1
- `CreePar` (Personne ou groupe)
- `DateCreation` (Date et heure)

#### 5. Liste "Affectations"

**Colonnes** :
- `Affaire` (Recherche vers Liste "Affaires") - Requis
- `Site` (Texte sur une seule ligne) - Requis
- `Ressource` (Recherche vers Liste "Ressources") - Requis
- `Competence` (Texte sur une seule ligne) - Requis
- `DateDebut` (Date) - Requis
- `DateFin` (Date) - Requis
- `Charge` (Nombre avec décimales) - Jours ouvrés
- `CreePar` (Personne ou groupe)
- `DateCreation` (Date et heure)

#### 6. Liste "Absences"

**Colonnes** :
- `Ressource` (Recherche vers Liste "Ressources") - Requis
- `Site` (Texte sur une seule ligne) - Requis
- `DateDebut` (Date) - Requis
- `DateFin` (Date) - Requis
- `Type` (Choix) - Formation, Congés payés, Maladie, Autres
- `Competence` (Texte sur une seule ligne)
- `Commentaire` (Texte sur plusieurs lignes)
- `ValidationSaisie` (Choix) - Oui, Non - Défaut : Non
- `SaisiPar` (Personne ou groupe)
- `DateSaisie` (Date et heure)
- `ValidePar` (Personne ou groupe)
- `DateValidation` (Date et heure)

#### 7. Liste "Transferts"

**Colonnes** :
- `Ressource` (Recherche vers Liste "Ressources") - Requis
- `SiteOrigine` (Texte sur une seule ligne) - Requis
- `SiteDestination` (Texte sur une seule ligne) - Requis
- `DateDebut` (Date) - Requis
- `DateFin` (Date) - Requis
- `Statut` (Choix) - Planifié, Appliqué - Défaut : Planifié
- `CreePar` (Personne ou groupe)
- `DateCreation` (Date et heure)

#### 8. Liste "Interims"

**Colonnes** :
- `Ressource` (Recherche vers Liste "Ressources") - Requis
- `Site` (Texte sur une seule ligne) - Requis
- `DateDebutContrat` (Date) - Requis
- `DateFinContrat` (Date) - Requis
- `ARenouveler` (Choix) - A renouveler, Oui, Non
- `DateMiseAJour` (Date et heure)
- `Commentaire` (Texte sur plusieurs lignes)

#### 9. Liste "Chantiers"

**Colonnes** :
- `ChantierID` (Texte sur une seule ligne) - Requis
- `Affaire` (Recherche vers Liste "Affaires") - Requis
- `Site` (Texte sur une seule ligne) - Requis
- `Libelle` (Texte sur plusieurs lignes) - Requis
- `DateDebut` (Date)
- `DateFinPrevue` (Date)
- `DateFinReelle` (Date)
- `Avancement` (Nombre avec décimales) - 0-100
- `EtatActuel` (Choix) - Lancer, Reporter, Prolonger, Terminer, Suspendre
- `Responsable` (Personne ou groupe)
- `Priorite` (Choix)
- `Commentaire` (Texte sur plusieurs lignes)

#### 10. Liste "Alertes"

**Colonnes** :
- `PriseEnCompte` (Choix) - Oui, Non - Défaut : Non
- `CourrierStatut` (Choix) - A envoyer, Envoyé - Défaut : A envoyer
- `DateAction` (Date et heure)
- `TypeAlerte` (Texte sur une seule ligne) - Requis
- `Ressource` (Recherche vers Liste "Ressources")
- `Affaire` (Recherche vers Liste "Affaires")
- `Site` (Texte sur une seule ligne)
- `Competence` (Texte sur une seule ligne)
- `DateDebut` (Date)
- `DateFin` (Date)
- `Action` (Texte sur plusieurs lignes)
- `CreePar` (Personne ou groupe)
- `DateCreation` (Date et heure)

---

## 💻 FRONTEND : React + Microsoft Graph

### Installation des dépendances

```bash
npm install @microsoft/microsoft-graph-client
npm install @azure/msal-browser
npm install @azure/msal-react
npm install react
npm install react-dom
npm install typescript
npm install tailwindcss
```

### Configuration Microsoft Graph

#### 1. Créer une application Azure AD

1. Aller sur [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Nom : `Plan de Charge App`
4. Redirect URI : `http://localhost:3000` (pour dev)
5. **API permissions** :
   - `Sites.ReadWrite.All` (pour lire/écrire SharePoint)
   - `User.Read` (pour lire le profil utilisateur)
6. **Certificates & secrets** → Créer un secret client (noter la valeur)

#### 2. Configuration MSAL

```typescript
// src/config/msalConfig.ts
import { Configuration, PopupRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: [
    'https://graph.microsoft.com/Sites.ReadWrite.All',
    'https://graph.microsoft.com/User.Read',
  ],
};
```

#### 3. Service SharePoint

```typescript
// src/services/sharepoint.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';

class SharePointService {
  private client: Client | null = null;
  private siteId: string;
  private listNames: { [key: string]: string } = {};

  constructor(siteId: string) {
    this.siteId = siteId;
  }

  async initialize(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    // Récupérer les IDs des listes
    await this.loadListIds();
  }

  private async loadListIds() {
    if (!this.client) return;

    const lists = await this.client
      .api(`/sites/${this.siteId}/lists`)
      .get();

    lists.value.forEach((list: any) => {
      this.listNames[list.displayName] = list.id;
    });
  }

  // ============================================
  // MÉTHODES GÉNÉRIQUES
  // ============================================

  async getItems(listName: string, filter?: string, select?: string[]) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listNames[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    let request = this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items`)
      .expand('fields')
      .top(1000);

    if (filter) {
      request = request.filter(filter);
    }

    if (select && select.length > 0) {
      request = request.select(select.join(','));
    }

    const response = await request.get();
    return response.value.map((item: any) => ({
      id: item.id,
      ...item.fields,
    }));
  }

  async getItem(listName: string, itemId: string) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listNames[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    const item = await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items/${itemId}`)
      .expand('fields')
      .get();

    return {
      id: item.id,
      ...item.fields,
    };
  }

  async createItem(listName: string, fields: any) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listNames[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    const item = await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items`)
      .post({
        fields,
      });

    return {
      id: item.id,
      ...item.fields,
    };
  }

  async updateItem(listName: string, itemId: string, fields: any) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listNames[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    const item = await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items/${itemId}/fields`)
      .patch(fields);

    return item;
  }

  async deleteItem(listName: string, itemId: string) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listNames[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items/${itemId}`)
      .delete();
  }

  // ============================================
  // MÉTHODES SPÉCIFIQUES
  // ============================================

  async getAffaires() {
    return this.getItems('Affaires', "Actif eq 'Oui'");
  }

  async getRessources(site?: string) {
    const filter = site ? `Site eq '${site}' and Actif eq 'Oui'` : "Actif eq 'Oui'";
    return this.getItems('Ressources', filter);
  }

  async getPeriodesCharge(affaireId: string, site: string) {
    const filter = `AffaireId eq '${affaireId}' and Site eq '${site}'`;
    return this.getItems('PeriodesCharge', filter);
  }

  async createPeriodeCharge(periode: any) {
    return this.createItem('PeriodesCharge', {
      AffaireId: periode.affaireId,
      Site: periode.site,
      Competence: periode.competence,
      DateDebut: periode.dateDebut,
      DateFin: periode.dateFin,
      NbRessources: periode.nbRessources,
    });
  }

  async getAffectations(affaireId?: string, ressourceId?: string) {
    let filter = '';
    if (affaireId) filter = `AffaireId eq '${affaireId}'`;
    if (ressourceId) {
      filter = filter ? `${filter} and RessourceId eq '${ressourceId}'` : `RessourceId eq '${ressourceId}'`;
    }
    return this.getItems('Affectations', filter || undefined);
  }

  async createAffectation(affectation: any) {
    return this.createItem('Affectations', {
      AffaireId: affectation.affaireId,
      Site: affectation.site,
      RessourceId: affectation.ressourceId,
      Competence: affectation.competence,
      DateDebut: affectation.dateDebut,
      DateFin: affectation.dateFin,
      Charge: affectation.charge,
    });
  }

  async getAbsences(ressourceId?: string) {
    const filter = ressourceId ? `RessourceId eq '${ressourceId}'` : undefined;
    return this.getItems('Absences', filter);
  }

  async createAbsence(absence: any) {
    return this.createItem('Absences', {
      RessourceId: absence.ressourceId,
      Site: absence.site,
      DateDebut: absence.dateDebut,
      DateFin: absence.dateFin,
      Type: absence.type,
      Competence: absence.competence,
      Commentaire: absence.commentaire || '',
      ValidationSaisie: absence.type === 'Formation' ? 'Oui' : 'Non',
    });
  }
}

export const sharePointService = new SharePointService(
  process.env.REACT_APP_SHAREPOINT_SITE_ID!
);
```

### Hook d'authentification

```typescript
// src/hooks/useAuth.ts
import { useMsal } from '@azure/msal-react';
import { useMemo, useEffect, useState } from 'react';
import { sharePointService } from '../services/sharepoint';
import { loginRequest } from '../config/msalConfig';

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const account = useMemo(() => accounts[0] || null, [accounts]);

  useEffect(() => {
    if (account) {
      getAccessToken();
    } else {
      setLoading(false);
    }
  }, [account]);

  const getAccessToken = async () => {
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account!,
      });
      setAccessToken(response.accessToken);
      await sharePointService.initialize(response.accessToken);
      setLoading(false);
    } catch (error) {
      // Si le token silencieux échoue, demander une interaction
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        setAccessToken(response.accessToken);
        await sharePointService.initialize(response.accessToken);
        setLoading(false);
      } catch (popupError) {
        console.error('Erreur d\'authentification:', popupError);
        setLoading(false);
      }
    }
  };

  const signIn = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  const signOut = async () => {
    await instance.logoutPopup();
    setAccessToken(null);
  };

  return {
    account,
    accessToken,
    loading,
    isAuthenticated: !!account && !!accessToken,
    signIn,
    signOut,
  };
};
```

### Hook pour les périodes de charge

```typescript
// src/hooks/useCharge.ts
import { useState, useEffect } from 'react';
import { sharePointService } from '../services/sharepoint';

export interface PeriodeCharge {
  id: string;
  AffaireId: string;
  Site: string;
  Competence: string;
  DateDebut: string;
  DateFin: string;
  NbRessources: number;
}

export const useCharge = (affaireId: string, site: string) => {
  const [periodes, setPeriodes] = useState<PeriodeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadPeriodes();
  }, [affaireId, site]);

  const loadPeriodes = async () => {
    try {
      setLoading(true);
      const data = await sharePointService.getPeriodesCharge(affaireId, site);
      setPeriodes(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const savePeriode = async (periode: Partial<PeriodeCharge>) => {
    try {
      if (periode.id) {
        await sharePointService.updateItem('PeriodesCharge', periode.id, {
          DateDebut: periode.DateDebut,
          DateFin: periode.DateFin,
          NbRessources: periode.NbRessources,
        });
      } else {
        await sharePointService.createPeriodeCharge({
          affaireId: periode.AffaireId!,
          site: periode.Site!,
          competence: periode.Competence!,
          dateDebut: periode.DateDebut!,
          dateFin: periode.DateFin!,
          nbRessources: periode.NbRessources!,
        });
      }
      await loadPeriodes();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { periodes, loading, error, savePeriode, refresh: loadPeriodes };
};
```

### Composant React

```typescript
// src/components/Charge/GrilleCharge.tsx
import React from 'react';
import { useCharge } from '../../hooks/useCharge';
import { useAuth } from '../../hooks/useAuth';

interface GrilleChargeProps {
  affaireId: string;
  site: string;
}

export const GrilleCharge: React.FC<GrilleChargeProps> = ({
  affaireId,
  site,
}) => {
  const { periodes, loading, error, savePeriode } = useCharge(affaireId, site);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Veuillez vous connecter</div>;
  }

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Périodes de charge</h2>
      <ul className="space-y-2">
        {periodes.map((periode) => (
          <li key={periode.id} className="p-2 bg-gray-100 rounded">
            {periode.Competence} : {periode.NbRessources} ressources
            <br />
            Du {new Date(periode.DateDebut).toLocaleDateString()} au{' '}
            {new Date(periode.DateFin).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### App.tsx avec MSAL Provider

```typescript
// src/App.tsx
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/msalConfig';
import { useAuth } from './hooks/useAuth';
import { GrilleCharge } from './components/Charge/GrilleCharge';

const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  const { isAuthenticated, signIn, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={signIn}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Se connecter avec Microsoft 365
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Plan de Charge</h1>
      <GrilleCharge affaireId="AFF001" site="Site1" />
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  );
}
```

---

## 🔄 TEMPS RÉEL (Polling)

SharePoint n'a pas de WebSocket natif, mais on peut utiliser le polling :

```typescript
// src/hooks/useRealtime.ts
import { useEffect, useRef } from 'react';

export const useRealtime = <T>(
  fetchFunction: () => Promise<T[]>,
  callback: (data: T[]) => void,
  interval: number = 5000 // 5 secondes
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchFunction();
      callback(data);
    };

    // Premier chargement
    fetchData();

    // Polling
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFunction, callback, interval]);
};
```

Utilisation :

```typescript
const { periodes, refresh } = useCharge(affaireId, site);

useRealtime(
  async () => {
    await refresh();
    return periodes;
  },
  (data) => {
    // Données mises à jour
  },
  5000 // Rafraîchir toutes les 5 secondes
);
```

---

## 📊 ALTERNATIVE : Power Apps

Si vous préférez une solution no-code/low-code, **Power Apps** peut aussi créer une interface moderne connectée à SharePoint :

### Avantages Power Apps
- ✅ **No-code** : Pas besoin de développer
- ✅ **Intégration native** : SharePoint, Excel, etc.
- ✅ **Mobile** : Apps natives iOS/Android
- ✅ **Formulaires** : Création rapide de formulaires
- ✅ **Workflows** : Power Automate intégré

### Limites
- ⚠️ **Personnalisation** : Moins flexible qu'un frontend React
- ⚠️ **Performance** : Peut être lent avec beaucoup de données
- ⚠️ **Coût** : Licence Power Apps par utilisateur

---

## 🚀 DÉPLOIEMENT

### Option 1 : Azure Static Web Apps

```bash
# Installer Azure CLI
npm install -g @azure/static-web-apps-cli

# Déployer
swa deploy ./build --app-name plan-de-charge-app
```

### Option 2 : Vercel / Netlify

Comme pour Supabase, mais avec les variables d'environnement SharePoint.

---

## 💰 COÛTS

### SharePoint Online
- **Inclus dans Microsoft 365** : Si vous avez déjà M365
- **SharePoint seul** : ~5€/user/mois

### Azure AD App
- **Gratuit** : Pour les apps internes

### Hébergement Frontend
- **Azure Static Web Apps** : Gratuit jusqu'à 100GB/mois
- **Vercel** : Gratuit pour projets personnels

### Total
- **Si vous avez déjà M365** : **GRATUIT** (juste l'hébergement frontend)
- **Sans M365** : **~5€/user/mois** + hébergement

---

## 📊 COMPARAISON : SharePoint vs Supabase

| Critère | SharePoint Backend | Supabase Backend |
|---------|-------------------|------------------|
| **Écosystème** | ✅ Microsoft | ⚠️ Externe |
| **Authentification** | ✅ Microsoft 365 (SSO) | ⚠️ À configurer |
| **Performance** | ⚠️ Moyenne | ✅ Excellente |
| **Temps réel** | ❌ Polling uniquement | ✅ WebSocket |
| **Coût** | ✅ Inclus M365 | 💰 Gratuit à 45€/mois |
| **API** | ✅ Graph API | ✅ REST + Realtime |
| **Limites** | ⚠️ 5000 items/liste | ✅ Illimité |
| **Mobile** | ✅ Apps natives | ✅ Web responsive |

---

## 🎯 RECOMMANDATION

### Choisir SharePoint si :
- ✅ Vous avez déjà Microsoft 365
- ✅ Vous voulez rester dans l'écosystème Microsoft
- ✅ Vous avez besoin de l'authentification SSO
- ✅ Vous voulez utiliser Power Apps aussi

### Choisir Supabase si :
- ✅ Vous voulez les meilleures performances
- ✅ Vous avez besoin de temps réel (WebSocket)
- ✅ Vous n'avez pas Microsoft 365
- ✅ Vous voulez plus de flexibilité

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Solution SharePoint proposée

