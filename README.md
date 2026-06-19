# YA CONSULTING — Application de Géolocalisation & Guidage (Abidjan, CI)

Ce dépôt contient le prototype interactif complet développé pour répondre au cahier des charges de l'**Application mobile de géolocalisation des clients et de guidage pour les employés**. Le projet a été entièrement adapté et localisé pour la **Côte d'Ivoire (Abidjan)**.

L'application unifiée réunit sur un même écran :
1. **Le Tableau de bord Administrateur (Web)** (partie gauche) : gestion des clients, planification des missions, supervision sur carte (refactorisé avec **Material UI**).
2. **Le Simulateur d'Application Mobile (Employé)** (partie droite) : cartographie Leaflet interactive, point GPS pulsé, calcul d'itinéraires et mise à jour de statuts.

---

## 🇨🇮 Spécificités de la Localisation (Abidjan, Côte d'Ivoire)

Le prototype intègre les données locales d'Abidjan :
* **Centrage Cartographique** : Initialisation automatique de la carte sur Abidjan (`5.3600`, `-4.0083`).
* **Relocalisations Rapides** : Options pour tester le guidage depuis plusieurs communes (Plateau, Cocody, Angré, Marcory, Yopougon).
* **Données de Test Réelles** (stockées en base de données SQL) :
  * Techniciens : Koffi Kouadio (Plateau) et Aminata Diallo (Cocody).
  * Clients : Société Ivoirienne de Banque (Plateau), Orange Côte d'Ivoire (Marcory), Clinique Médicale de l'Indénié (Plateau), Mme. Konan (Angré Cité CNPS).

---

## 🛠️ Architecture & Technologies (V3)

* **Frontend Client** : React (Vite) styled with **Material UI (MUI)**.
* **Backend API** : Node.js / Express.
* **Base de données & ORM** : **SQLite** géré par **Prisma ORM** (facilement basculable vers PostgreSQL/PostGIS).

---

## 🚀 Lancement Rapide

### Prérequis
* [Node.js](https://nodejs.org/) (version 18+)
* npm (installé par défaut avec Node)

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

3. Initialisez la base de données SQLite et appliquez les migrations :
   ```bash
   npx prisma migrate dev --name init
   ```

4. Remplissez la base de données avec les données de test ivoiriennes :
   ```bash
   npx prisma db seed
   ```

5. Lancez simultanément le serveur d'API backend et le client frontend :
   ```bash
   npm run dev:all
   ```

6. Ouvrez votre navigateur sur **[http://localhost:5173/](http://localhost:5173/)**.

---

## 📂 Structure du Code

* `DOCUMENTATION.md` : Guide d'architecture et de conception technique détaillé du projet.
* `walkthrough.md` : Journal des modifications et résultats des tests.
* `server.js` : Moteur d'API backend Express.
* `prisma/schema.prisma` : Schéma de données Prisma SQL.
* `prisma/seed.js` : Script de peuplement de la base de données.
* `src/components/AdminDashboard.jsx` : Tableau de bord web d'administration en Material UI.
* `src/components/MobileSimulator.jsx` : Simulateur mobile avec tracé cartographique et panneaux de simulation.
* `src/index.css` : Système de design, variables CSS de thèmes et animations.
