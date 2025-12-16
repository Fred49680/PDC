# 🚀 GUIDE DE DÉMARRAGE RAPIDE - SHAREPOINT BACKEND

## 📋 PRÉREQUIS

- Compte Microsoft 365 avec SharePoint Online
- Accès administrateur Azure AD (pour créer l'app)
- Node.js 18+ installé
- Compte GitHub (pour déploiement)

---

## ⚡ DÉMARRAGE EN 45 MINUTES

### Étape 1 : Créer les listes SharePoint (15 min)

#### Option A : Via l'interface SharePoint

1. Aller sur votre site SharePoint
2. **Paramètres** (⚙️) → **Contenu du site**
3. **Ajouter une application** → **Liste personnalisée**
4. Créer les listes selon la structure dans `SOLUTION_SHAREPOINT_FRONTEND.md`

#### Option B : Via PowerShell (plus rapide)

```powershell
# Se connecter à SharePoint Online
Connect-PnPOnline -Url "https://votre-tenant.sharepoint.com/sites/PlanDeCharge" -Interactive

# Créer la liste Affaires
New-PnPList -Title "Affaires" -Template GenericList
Add-PnPField -List "Affaires" -DisplayName "AffaireID" -InternalName "AffaireID" -Type Text -Required
Add-PnPField -List "Affaires" -DisplayName "Site" -InternalName "Site" -Type Choice -Choices "Site1","Site2" -Required
Add-PnPField -List "Affaires" -DisplayName "Libelle" -InternalName "Libelle" -Type Note
Add-PnPField -List "Affaires" -DisplayName "Actif" -InternalName "Actif" -Type Boolean -DefaultValue $true

# Répéter pour les autres listes...
```

#### Option C : Via PnP Provisioning Template (recommandé)

Créer un fichier `template.xml` :

```xml
<pnp:Provisioning xmlns:pnp="http://schemas.dev.office.com/PnP/2020/02/ProvisioningSchema">
  <pnp:Preferences Generator="OfficeDevPnP.Core, Version=3.29.2101.0" />
  <pnp:Templates>
    <pnp:ProvisioningTemplate ID="PlanDeCharge">
      <pnp:Lists>
        <pnp:ListInstance Title="Affaires" TemplateType="100" Url="Lists/Affaires">
          <pnp:Fields>
            <Field Type="Text" DisplayName="AffaireID" Name="AffaireID" Required="TRUE" />
            <Field Type="Choice" DisplayName="Site" Name="Site" Required="TRUE">
              <CHOICES>
                <CHOICE>Site1</CHOICE>
                <CHOICE>Site2</CHOICE>
              </CHOICES>
            </Field>
            <Field Type="Note" DisplayName="Libelle" Name="Libelle" />
            <Field Type="Boolean" DisplayName="Actif" Name="Actif" DefaultValue="TRUE" />
          </pnp:Fields>
        </pnp:ListInstance>
        <!-- Autres listes... -->
      </pnp:Lists>
    </pnp:ProvisioningTemplate>
  </pnp:Templates>
</pnp:Provisioning>
```

Appliquer le template :

```powershell
Apply-PnPProvisioningTemplate -Path "template.xml"
```

### Étape 2 : Créer l'application Azure AD (10 min)

1. Aller sur [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Remplir :
   - **Name** : `Plan de Charge App`
   - **Supported account types** : `Accounts in this organizational directory only`
   - **Redirect URI** : 
     - Type : `Single-page application (SPA)`
     - URI : `http://localhost:3000` (pour développement)
4. **Register**

#### Récupérer les informations

1. **Overview** → Noter :
   - **Application (client) ID**
   - **Directory (tenant) ID**
2. **API permissions** → **Add a permission** :
   - **Microsoft Graph** → **Delegated permissions**
   - Ajouter :
     - `Sites.ReadWrite.All`
     - `User.Read`
   - **Add permissions**
   - **Grant admin consent** (si vous êtes admin)

#### Créer un secret (optionnel, pour app-only auth)

1. **Certificates & secrets** → **New client secret**
2. Noter la **Value** (visible une seule fois)

### Étape 3 : Récupérer l'ID du site SharePoint (5 min)

#### Via l'interface

1. Aller sur votre site SharePoint
2. **Paramètres** (⚙️) → **Informations sur le site**
3. L'**ID du site** est affiché

#### Via PowerShell

```powershell
Connect-PnPOnline -Url "https://votre-tenant.sharepoint.com/sites/PlanDeCharge" -Interactive
Get-PnPSite | Select-Object Id
```

### Étape 4 : Créer le projet React (5 min)

```bash
# Créer le projet
npm create vite@latest plan-de-charge-sharepoint -- --template react-ts

# Aller dans le dossier
cd plan-de-charge-sharepoint

# Installer les dépendances
npm install

# Installer Microsoft Graph et MSAL
npm install @microsoft/microsoft-graph-client
npm install @azure/msal-browser
npm install @azure/msal-react

# Installer Tailwind (optionnel)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Étape 5 : Configuration (5 min)

#### 1. Fichier `.env`

```env
VITE_CLIENT_ID=votre-application-client-id
VITE_TENANT_ID=votre-tenant-id
VITE_SHAREPOINT_SITE_ID=votre-site-id
VITE_SHAREPOINT_SITE_URL=https://votre-tenant.sharepoint.com/sites/PlanDeCharge
```

#### 2. Créer `src/config/msalConfig.ts`

```typescript
import { Configuration, PopupRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
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

#### 3. Créer `src/services/sharepoint.ts`

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

class SharePointService {
  private client: Client | null = null;
  private siteId: string;
  private siteUrl: string;
  private listIds: { [key: string]: string } = {};

  constructor(siteId: string, siteUrl: string) {
    this.siteId = siteId;
    this.siteUrl = siteUrl;
  }

  async initialize(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    await this.loadListIds();
  }

  private async loadListIds() {
    if (!this.client) return;

    try {
      const response = await this.client
        .api(`/sites/${this.siteId}/lists`)
        .get();

      response.value.forEach((list: any) => {
        this.listIds[list.displayName] = list.id;
      });
    } catch (error) {
      console.error('Erreur lors du chargement des listes:', error);
    }
  }

  async getItems(listName: string, filter?: string) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listIds[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    let request = this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items`)
      .expand('fields')
      .top(1000);

    if (filter) {
      request = request.filter(filter);
    }

    const response = await request.get();
    return response.value.map((item: any) => ({
      id: item.id,
      ...item.fields,
    }));
  }

  async createItem(listName: string, fields: any) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listIds[listName];
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

    const listId = this.listIds[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    const item = await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items/${itemId}/fields`)
      .patch(fields);

    return item;
  }

  async deleteItem(listName: string, itemId: string) {
    if (!this.client) throw new Error('Client not initialized');

    const listId = this.listIds[listName];
    if (!listId) throw new Error(`List ${listName} not found`);

    await this.client
      .api(`/sites/${this.siteId}/lists/${listId}/items/${itemId}`)
      .delete();
  }
}

export const sharePointService = new SharePointService(
  import.meta.env.VITE_SHAREPOINT_SITE_ID!,
  import.meta.env.VITE_SHAREPOINT_SITE_URL!
);
```

### Étape 6 : Code de base (5 min)

#### Créer `src/hooks/useAuth.ts`

```typescript
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

#### Créer `src/App.tsx`

```typescript
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/msalConfig';
import { useAuth } from './hooks/useAuth';
import { useState, useEffect } from 'react';
import { sharePointService } from './services/sharepoint';

const msalInstance = new PublicClientApplication(msalConfig);

function AppContent() {
  const { isAuthenticated, signIn, loading, account } = useAuth();
  const [affaires, setAffaires] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAffaires();
    }
  }, [isAuthenticated]);

  const loadAffaires = async () => {
    try {
      setLoadingData(true);
      const data = await sharePointService.getItems('Affaires', "Actif eq 'Oui'");
      setAffaires(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Plan de Charge</h1>
          <button
            onClick={signIn}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Se connecter avec Microsoft 365
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Plan de Charge</h1>
        <div className="text-sm text-gray-600">
          Connecté en tant que : {account?.name}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Affaires</h2>
        {loadingData ? (
          <div>Chargement...</div>
        ) : (
          <ul className="space-y-2">
            {affaires.map((affaire) => (
              <li key={affaire.id} className="p-2 bg-gray-100 rounded">
                <strong>{affaire.AffaireID}</strong> - {affaire.Site}
                <br />
                {affaire.Libelle}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;
```

### Étape 7 : Tester (5 min)

```bash
# Démarrer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

1. Cliquer sur "Se connecter avec Microsoft 365"
2. S'authentifier avec votre compte Microsoft 365
3. Vérifier que les affaires s'affichent

---

## 🔧 RÉCUPÉRER L'ID DU SITE VIA GRAPH API

Si vous ne connaissez pas l'ID du site, vous pouvez le récupérer via l'URL :

```typescript
// Fonction utilitaire pour récupérer l'ID du site
async function getSiteId(siteUrl: string, accessToken: string) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  // Extraire le hostname et le chemin
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const path = url.pathname;

  // Récupérer l'ID du site
  const site = await client
    .api(`/sites/${hostname}:${path}`)
    .get();

  return site.id;
}
```

---

## 📝 EXEMPLE COMPLET : Formulaire de saisie

```typescript
// src/components/Charge/FormulaireCharge.tsx
import React, { useState } from 'react';
import { sharePointService } from '../../services/sharepoint';

interface FormulaireChargeProps {
  affaireId: string;
  site: string;
  onSave: () => void;
}

export const FormulaireCharge: React.FC<FormulaireChargeProps> = ({
  affaireId,
  site,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    competence: '',
    dateDebut: '',
    dateFin: '',
    nbRessources: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await sharePointService.createItem('PeriodesCharge', {
        AffaireId: affaireId,
        Site: site,
        Competence: formData.competence,
        DateDebut: formData.dateDebut,
        DateFin: formData.dateFin,
        NbRessources: formData.nbRessources,
      });

      // Réinitialiser le formulaire
      setFormData({
        competence: '',
        dateDebut: '',
        dateFin: '',
        nbRessources: 1,
      });

      onSave();
      alert('Période enregistrée avec succès !');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Nouvelle période de charge</h3>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Compétence</label>
        <input
          type="text"
          value={formData.competence}
          onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
          required
          className="w-full border rounded p-2"
          placeholder="IES, IEG, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date début</label>
          <input
            type="date"
            value={formData.dateDebut}
            onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date fin</label>
          <input
            type="date"
            value={formData.dateFin}
            onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nombre de ressources</label>
        <input
          type="number"
          min="1"
          value={formData.nbRessources}
          onChange={(e) =>
            setFormData({ ...formData, nbRessources: parseInt(e.target.value) })
          }
          required
          className="w-full border rounded p-2"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
};
```

---

## 🐛 DÉPANNAGE

### Erreur : "AADSTS700016: Application not found"

- Vérifier que le Client ID est correct dans `.env`
- Vérifier que l'app est bien enregistrée dans Azure AD

### Erreur : "Insufficient privileges to complete the operation"

- Vérifier que les permissions sont accordées dans Azure AD
- Vérifier que l'admin a donné son consentement
- Vérifier que l'utilisateur a les droits sur SharePoint

### Erreur : "List not found"

- Vérifier que les noms des listes correspondent exactement
- Vérifier que `loadListIds()` s'est exécuté correctement
- Ajouter des logs pour voir les listes disponibles

### Erreur : "Invalid filter clause"

- Vérifier la syntaxe OData du filtre
- Exemple correct : `"Actif eq 'Oui'"`
- Attention aux guillemets simples pour les chaînes

---

## 📚 RESSOURCES

- [Microsoft Graph API Documentation](https://docs.microsoft.com/graph/api/overview)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [SharePoint REST API](https://docs.microsoft.com/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)

---

**Version** : 1.0  
**Date** : 2025-01-27  
**Statut** : Guide de démarrage SharePoint

