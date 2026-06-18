# YA CONSULTING — Application de Géolocalisation & Guidage (Abidjan, CI)

Ce dépôt contient le prototype interactif complet développé pour répondre au cahier des charges de l'**Application mobile de géolocalisation des clients et de guidage pour les employés**. Le projet a été entièrement adapté et localisé pour la **Côte d'Ivoire (Abidjan)**.

L'application unifiée réunit sur un même écran :
1. **Le Tableau de bord Administrateur (Web)** (partie gauche) : gestion des clients, planification des missions, supervision sur carte.
2. **Le Simulateur d'Application Mobile (Employé)** (partie droite) : cartographie Leaflet interactive, point GPS pulsé, calcul d'itinéraires et mise à jour de statuts.

---

## 🇨🇮 Spécificités de la Localisation (Abidjan, Côte d'Ivoire)

Le prototype intègre les données locales d'Abidjan :
* **Centrage Cartographique** : Initialisation automatique de la carte sur Abidjan (`5.3600`, `-4.0083`).
* **Relocalisations Rapides** : Options pour tester le guidage depuis plusieurs communes (Plateau, Cocody, Angré, Marcory, Yopougon).
* **Données de Test Réelles** :
  * Techniciens : Koffi Kouadio (Plateau) et Aminata Diallo (Cocody).
  * Clients : Société Ivoirienne de Banque (Plateau), Orange Côte d'Ivoire (Marcory), Clinique Médicale de l'Indénié (Plateau), Mme. Konan (Angré Cité CNPS).

---

## 🛠️ Fonctionnalités Clés

* **Cartographie Leaflet** : Affiche en temps réel la position des techniciens et des clients.
* **Calcul d'Itinéraire** : Trace le parcours optimal (ligne brisée colorée), calcule la distance réelle en kilomètres et le temps de trajet estimé.
* **Redirection GPS** : Possibilité d'ouvrir l'itinéraire dans Google Maps, Waze ou Apple Plans.
* **Simulateur de déplacement GPS** : Permet d'animer pas-à-pas le trajet du technicien jusqu'au client pour observer la mise à jour en temps réel sur la carte de supervision admin.
* **Gestionnaire Hors-ligne** : Simulation de perte de réseau avec bascule sur le cache local (`localStorage`) pour le fonctionnement en mode dégradé.

---

## 🚀 Lancement Rapide

### Prérequis
* [Node.js](https://nodejs.org/) (version 18+)
* npm (installé par défaut avec Node)

### Installation
1. Clonez le projet :
   ```bash
   git clone https://github.com/quenumnathan17-collab/application-mobile-de-g-olocalisation-des-et-de-guidage-pour-les-employ-s.git
   cd application-mobile-de-g-olocalisation-des-et-de-guidage-pour-les-employ-s
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

4. Ouvrez votre navigateur sur **[http://localhost:5173/](http://localhost:5173/)**.

---

## 📂 Structure du Code

* `DOCUMENTATION.md` : Guide d'architecture et de conception technique détaillé du projet.
* `src/mockData.js` : Base de données locale pré-remplie (techniciens, clients et missions en Côte d'Ivoire).
* `src/components/AdminDashboard.jsx` : Tableau de bord web d'administration.
* `src/components/MobileSimulator.jsx` : Simulateur mobile avec tracé cartographique et panneaux de simulation.
* `src/index.css` : Système de design, variables CSS de thèmes et animations.
