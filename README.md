# YA CONSULTING — Application de Géolocalisation & Guidage (Abidjan, CI)

Ce dépôt contient le prototype interactif complet développé pour
répondre au cahier des charges de l'**Application mobile de
géolocalisation des clients et de guidage pour les employés**.
Le projet a été entièrement adapté et localisé pour la
**Côte d'Ivoire (Abidjan)**.

L'application unifiée réunit sur un même écran :

1. **Le Tableau de bord Administrateur (Web)** (partie gauche) :
   gestion des clients, planification des missions, supervision
   sur carte (refactorisé avec **Material UI**).
2. **Le Simulateur d'Application Mobile (Employé)** (partie droite) :
   cartographie Leaflet interactive, point GPS pulsé, calcul
   d'itinéraires et mise à jour de statuts.

---

## 🇨🇮 Spécificités de la Localisation (Abidjan, Côte d'Ivoire)

Le prototype intègre les données locales d'Abidjan :

* **Centrage Cartographique** : Initialisation automatique de la
  carte sur Abidjan (`5.3600`, `-4.0083`).
* **Relocalisations Rapides** : Options pour tester le guidage depuis
  plusieurs communes (Plateau, Cocody, Angré, Marcory, Yopougon).
* **Données de Test Réelles** (stockées en base de données SQL) :
  * Techniciens : Koffi Kouadio (Plateau) et Aminata Diallo (Cocody).
  * Clients : SIB (Plateau), Orange CI (Marcory), Clinique de l'Indénié
    (Plateau), Mme. Konan (Angré).

---

## 🛠️ Architecture & Technologies

| Couche      | Technologies                              |
|-------------|-------------------------------------------|
| Frontend    | React (Vite), Material UI (MUI), Leaflet  |
| Backend API | Node.js / Express (modulaire)             |
| ORM & DB    | Prisma ORM → PostgreSQL                   |
| PWA         | vite-plugin-pwa, Web Push Notifications   |

---

## 📂 Structure du Code

```
├── backend/
│   ├── config/
│   │   └── constants.js        # Constantes centralisées
│   ├── middleware/
│   │   └── auth.js             # JWT auth & role middleware
│   ├── routes/
│   │   ├── auth.js             # Login, register, onboarding
│   │   ├── clients.js          # CRUD clients
│   │   ├── employees.js        # CRUD employés, profil, GPS
│   │   ├── operations.js       # CRUD opérations
│   │   ├── push.js             # Web Push subscriptions
│   │   └── reports.js          # Signalements d'adresse + logo
│   ├── utils/
│   │   ├── logger.js           # Logger structuré avec timestamps
│   │   ├── mappers.js          # Mapping Prisma → API response
│   │   ├── push.js             # Envoi notifications push
│   │   └── sse.js              # Server-Sent Events manager
│   ├── prisma/
│   │   ├── schema.prisma       # Schéma de données
│   │   └── seed.js             # Peuplement de la base
│   ├── server.js               # Point d'entrée (~45 lignes)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx   # Tableau de bord admin (MUI)
│   │   │   ├── MobileSimulator.jsx  # Simulateur mobile
│   │   │   ├── Login.jsx            # Écran de connexion
│   │   │   ├── BrandLogo.jsx        # Logo SVG
│   │   │   ├── ErrorBoundary.jsx    # Gestion d'erreurs React
│   │   │   └── InstallPrompt.jsx    # Bannière d'installation PWA
│   │   ├── App.jsx                  # Composant racine
│   │   ├── main.jsx                 # Point d'entrée React
│   │   ├── index.css                # Design system & thèmes
│   │   └── sw.js                    # Service Worker (push + cache)
│   ├── vite.config.js
│   └── package.json
├── DOCUMENTATION.md
└── README.md
```

---

## 🚀 Lancement Rapide

### Prérequis

* [Node.js](https://nodejs.org/) (version 18+)
* npm (installé par défaut avec Node)
* PostgreSQL (local ou distant)

### Installation & Initialisation

1. Clonez le projet :
   ```bash
   git clone https://github.com/quenumnathan17-collab/application-mobile-de-g-olocalisation-des-et-de-guidage-pour-les-employ-s.git
   cd application-mobile-de-g-olocalisation-des-et-de-guidage-pour-les-employ-s
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Configurez la base de données (`.env` dans `backend/`) :
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/ya_consulting"
   JWT_SECRET="votre-clé-secrète-unique"
   ```

4. Initialisez la base de données et appliquez les migrations :
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

5. Remplissez la base avec les données de test ivoiriennes :
   ```bash
   npx prisma db seed
   ```

6. Lancez simultanément le backend et le frontend :
   ```bash
   cd ..
   npm run dev:all
   ```

7. Ouvrez votre navigateur sur
   **[http://localhost:5173/](http://localhost:5173/)**.
