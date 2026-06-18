# DOCUMENTATION TECHNIQUE — Géolocalisation & Guidage (Abidjan, CI)

Cette documentation détaille l'architecture logicielle, les technologies employées et l'alignement fonctionnel du prototype par rapport au cahier des charges de l'application.

---

## 🏗️ Architecture et Flux de Données

Le prototype utilise une architecture **unifiée et réactive** pour simuler l'écosystème complet en une seule application web :

```
                  ┌──────────────────────────────┐
                  │           App.jsx            │
                  │   (État global centralisé)   │
                  └──────┬────────────────┬──────┘
                         │                │
       Synchronisation   │                │   Synchronisation
       bidirectionnelle  │                │   bidirectionnelle
                         ▼                ▼
     ┌───────────────────────┐        ┌───────────────────────┐
     │  AdminDashboard.jsx   │        │  MobileSimulator.jsx  │
     │  (Portail Superviseur)│        │ (Simulateur Employé)  │
     └───────────────────────┘        └───────────────────────┘
                         │                │
                         ▼                ▼
                 ┌────────────────────────────────┐
                 │          localStorage          │
                 │   (Simul. Base de données)     │
                 └────────────────────────────────┘
```

### 1. Gestion de l'État Local (`App.jsx`)
L'état de l'application est maintenu au niveau supérieur afin de permettre une communication instantanée entre l'administration et le mobile :
* `clients` : Tableau des fiches clients avec leurs positions GPS (Abidjan).
* `employees` : Profils des techniciens et de l'administrateur, incluant leurs coordonnées GPS en temps réel.
* `operations` : Liste des interventions planifiées ou en cours avec liaisons `clientId` et `employeeId`.

### 2. Persistance des Données (Simulateur PostgreSQL/PostGIS)
Pour simuler la base de données, toutes les modifications (ajout de client, planification d'intervention, déplacement GPS d'un technicien, mise à jour de statut) sont automatiquement sauvegardées et rechargées depuis le **`localStorage`** du navigateur. Le rechargement de la page conserve l'historique de vos tests.

---

## 🛠️ Stack Technique Réelle du Prototype

* **Framework** : React 19 (Vite)
* **Cartographie** : **Leaflet** (intégration directe via API DOM `window.L` pour une compatibilité parfaite avec React 19 et le rendu de cartes fluides à 60 fps).
* **Fonds de cartes** : OpenStreetMap (Standard et CartoDB Voyager).
* **Styles et Design System** : CSS Variables (Vanilla CSS) avec prise en charge native des thèmes Clair et Sombre, effets de glassmorphisme et animations de transition de composants.
* **Icônes** : Lucide React.

---

## 🎯 Correspondance avec le Cahier des Charges

Voici comment chaque point clé des spécifications fonctionnelles (Section 3 du Cahier des Charges) est adressé :

### 3.1 Authentification et Gestion des Profils
* **Simulé** : L'écran initial du simulateur mobile propose de choisir un compte technicien (Koffi Kouadio ou Aminata Diallo). L'avatar en haut à droite indique l'identité de l'utilisateur actif. Le bouton de déconnexion permet de changer d'identité.

### 3.2 Gestion des Clients (CRUD)
* **Implémenté** : L'onglet "Clients" du dashboard admin permet d'afficher la table complète des clients.
* **Géocodage automatique** : Lors de la soumission d'une adresse dans le formulaire de création, le script `simulateGeocode` calcule une coordonnée GPS à partir d'un hachage de la chaîne de caractères (autour du centre d'Abidjan).
* **Alertes géocodage** : Si l'adresse est trop courte ou absente, une alerte d'erreur s'affiche dans le formulaire. En cas de succès, les coordonnées exactes sont affichées avant enregistrement.

### 3.3 Gestion des Opérations
* **Implémenté** : Création d'interventions reliant un client, une description technique, une date d'intervention et un technicien.
* **Statuts** : Les badges dynamiques reflètent l'état (« planifiée », « en cours », « terminée »).
* **Ciblage mobile** : Seules les opérations assignées au technicien connecté et n'étant pas terminées s'affichent sur sa carte ou dans sa liste mobile.

### 3.4 Application Mobile — Carte et Itinéraire
* **Centrage GPS** : Un bouton 🎯 permet de recentrer la carte mobile sur la position géographique actuelle du technicien.
* **Bottom Sheet descriptive** : Un clic sur un marqueur client affiche la Bottom Sheet avec le nom, l'adresse, la mission et les actions associées.
* **Bouton Itinéraire & Tracé** : Le clic sur "Itinéraire" calcule instantanément la distance géodésique (Haversine) et le temps de parcours estimé (basé sur une moyenne urbaine de 30 km/h). Le trajet est dessiné sous forme de polyligne colorée sur la carte.
* **Passerelle Navigation externe** : Le bouton "GPS" ouvre un sélecteur simulant le lancement des applications de navigation natives (Google Maps, Waze, Apple Plans) en renseignant les points de départ et d'arrivée.
* **Mode Hors-ligne (Sec. 4.4)** : L'interrupteur réseau permet de couper la connexion. L'application mobile passe en mode dégradé : une bannière rouge s'affiche, les cartes et interventions restent consultables grâce au cache local (`localStorage`), mais le calcul d'itinéraires et le déplacement temps réel sont désactivés pour illustrer le comportement hors-ligne.

### 3.5 Supervision Cartographique Administrateur
* **Implémenté** : L'onglet "Supervision Carte" côté administration affiche sur une carte globale les clients actifs et les icônes de techniciens en temps réel.
* **Mise à jour en temps réel** : Si vous cliquez sur "Simuler trajet GPS" dans le panneau mobile, vous verrez le technicien se déplacer pas-à-pas vers son lieu d'intervention. En regardant simultanément l'écran de supervision administrateur à gauche, vous constaterez que sa position s'y déplace à la même vitesse !
