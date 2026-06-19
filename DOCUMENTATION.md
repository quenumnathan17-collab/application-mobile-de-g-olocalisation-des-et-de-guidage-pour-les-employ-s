# DOCUMENTATION TECHNIQUE — Géolocalisation & Guidage (Abidjan, CI)

Cette documentation détaille l'architecture logicielle, la stack technologique et l'alignement fonctionnel du prototype par rapport au cahier des charges de l'application.

---

## 🏗️ Architecture et Flux de Données

Le prototype utilise une architecture **découplée (Full-stack)** réunissant un serveur API backend et une interface client réactive :

```
             ┌──────────────────────────────────────┐
             │       Frontend Client (Portail)      │
             │             (Vite/React)             │
             └──────┬────────────────────────▲──────┘
                    │                        │
       Requêtes API │                        │ Synchronisation
       HTTP REST    │                        │ Temps Réel
                    ▼                        │ (Mise à jour d'état)
             ┌───────────────────────────────┴──────┐
             │         Backend API                  │
             │       (Node.js/Express)              │
             └──────┬────────────────────────▲──────┘
                    │                        │
     Lecture/Écriture│                        │ Données Sérialisées
       via Prisma   │                        │ (Employees/Clients)
                    ▼                        │
             ┌───────────────────────────────┴──────┐
             │     Base de données SQL              │
             │           (SQLite)                   │
             └──────────────────────────────────────┘
```

### 1. Gestion de l'État et Appels API (`src/App.jsx`)
L'état de l'application (clients, techniciens, interventions) est géré au niveau racine de l'application frontend. Au chargement, le client effectue des requêtes HTTP asynchrones `fetch()` pour récupérer les données.
* Les modifications d'état (création d'un client, assignation de mission, mise à jour de statut, ou déplacements GPS) effectuent des requêtes `POST`, `PUT` vers le backend Express.

### 2. Couche Backend API (`server.js`)
Le serveur Express sert d'intermédiaire logique pour le frontend. Il expose des points de terminaison REST sécurisés pour :
* **Les clients** (`/api/clients`) : liste, création, modification, archivage.
* **Les employés/techniciens** (`/api/employees`) : liste, mise à jour des positions GPS.
* **Les opérations/interventions** (`/api/operations`) : liste, création, mise à jour du statut.
* **Géocodage centralisé** : Le serveur gère la simulation de géocodage pour attribuer des coordonnées valides à Abidjan à partir de l'adresse fournie par l'utilisateur.

### 3. Couche d'Accès aux Données & SQL Database (Prisma ORM)
* **ORM** : **Prisma** (v5.22.0) est configuré pour gérer le schéma de base de données.
* **Base de données** : Une base de données locale **SQLite** (`prisma/dev.db`) stocke les données des employés, des clients et des opérations.
* **Seeding** : Un script de peuplement (`prisma/seed.js`) initialise la base de données SQL avec les profils ivoiriens par défaut pour YA CONSULTING.

---

## 🛠️ Stack Technique Réelle du Prototype

* **Frontend** : React 19 (Vite)
* **Système de Design Frontend** : **Material UI (MUI)** avec intégration d'icônes Material Design (`@mui/icons-material`).
* **Cartographie** : **Leaflet** (importé et géré de manière native).
* **Serveur Backend** : Node.js avec le framework **Express** et configuration **CORS**.
* **Base de données** : **SQLite** avec **Prisma Client**.
* **Lanceur Concomitant** : `concurrently` (démarre l'API backend et le client frontend ensemble via `npm run dev:all`).

---

## 🎯 Correspondance avec le Cahier des Charges

Voici comment chaque point clé des spécifications fonctionnelles (Section 3 du Cahier des Charges) est adressé :

### 3.1 Authentification et Gestion des Profils
* **Simulé** : L'écran initial du simulateur mobile propose de choisir un compte technicien (Koffi Kouadio ou Aminata Diallo) stockés dans la base SQLite. L'avatar en haut à droite indique l'identité de l'utilisateur actif. Le bouton de déconnexion permet de changer d'identité.

### 3.2 Gestion des Clients (CRUD)
* **Implémenté** : L'onglet "Clients" du dashboard admin en Material UI permet d'afficher la table complète des clients.
* **Géocodage automatique** : Lors de la soumission d'une adresse dans le formulaire de création, l'API Express calcule une coordonnée GPS à partir d'un hachage de la chaîne de caractères (autour du centre d'Abidjan).
* **Alertes géocodage** : Si l'adresse est trop courte ou absente, une alerte d'erreur MUI s'affiche dans le formulaire. En cas de succès, les coordonnées exactes sont affichées avant enregistrement dans la base SQLite.

### 3.3 Gestion des Opérations
* **Implémenté** : Création d'interventions reliant un client, une description technique, une date d'intervention et un technicien.
* **Statuts** : Les badges dynamiques reflètent l'état (« planifiée », « en cours », « terminée », « annulée »).
* **Ciblage mobile** : Seules les opérations assignées au technicien connecté et n'étant pas terminées s'affichent sur sa carte ou dans sa liste mobile.

### 3.4 Application Mobile — Carte et Itinéraire
* **Centrage GPS** : Un bouton 🎯 permet de recentrer la carte mobile sur la position géographique actuelle du technicien.
* **Bottom Sheet descriptive** : Un clic sur un marqueur client affiche la Bottom Sheet avec le nom, l'adresse, la mission et les actions associées.
* **Bouton Itinéraire & Tracé** : Le clic sur "Itinéraire" calcule instantanément la distance géodésique (Haversine) et le temps de parcours estimé (basé sur une moyenne urbaine de 30 km/h). Le trajet est dessiné sous forme de polyligne colorée sur la carte.
* **Passerelle Navigation externe** : Le bouton "GPS" ouvre un sélecteur simulant le lancement des applications de navigation natives (Google Maps, Waze, Apple Plans) en renseignant les points de départ et d'arrivée.
* **Mode Hors-ligne (Sec. 4.4)** : L'interrupteur réseau permet de couper la connexion. L'application mobile passe en mode dégradé : une bannière rouge s'affiche, les cartes et interventions restent consultables grâce au cache local (`localStorage`), mais le calcul d'itinéraires et le déplacement temps réel sont désactivés pour illustrer le comportement hors-ligne.

### 3.5 Supervision Cartographique Administrateur
* **Implémenté** : L'onglet "Supervision Carte" côté administration affiche sur une carte globale les clients actifs et les icônes de techniciens en temps réel.
* **Mise à jour en temps réel** : Si vous cliquez sur "Simuler trajet GPS" dans le panneau mobile, le technicien se déplace pas-à-pas vers son lieu d'intervention. En regardant simultanément l'écran de supervision administrateur à gauche, sa position s'y déplace à la même vitesse !
