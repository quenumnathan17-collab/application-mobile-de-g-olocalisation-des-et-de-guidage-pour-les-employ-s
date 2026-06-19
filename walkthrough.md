# Walkthrough — Application de Géolocalisation & Guidage (V3 - Prisma, Material UI & Flexible Layout)

Ce document présente l'architecture finale, les améliorations visuelles et la flexibilité de disposition apportées lors de la **V3** pour **YA CONSULTING**.

---

## 🚀 Fonctionnalités Majeures de la V3

### 1. Base de données SQL avec Prisma ORM
* **Transition technologique** : Nous avons abandonné la persistance sur fichier simple (`database.json`) pour utiliser **Prisma ORM** connecté à une base SQL **SQLite** (`prisma/dev.db`).
* **Schéma relationnel (`prisma/schema.prisma`)** : Modélisation robuste des tables `Employee`, `Client`, et `Operation` avec des types stricts.
* **Script de Seeding (`prisma/seed.js`)** : Peuplement automatique de la base SQL avec des techniciens ivoiriens réels, des clients et des coordonnées géo-localisées à Abidjan.
* **Migration vers PostgreSQL facilitée** : La configuration Prisma permet de basculer sur un serveur PostgreSQL en changeant simplement le provider de `"sqlite"` à `"postgresql"` dans le schéma.

### 2. Dashboard Web modernisé avec Material UI (MUI)
L'interface d'administration a été entièrement réécrite pour utiliser les composants officiels **Material UI** afin de proposer un rendu professionnel de type SaaS d'entreprise.
* **Synchronisation Dynamique du Thème** : Un observateur de mutation écoute les changements sur l'attribut `data-theme` du DOM. L'interface MUI passe automatiquement en **mode sombre** ou **mode clair** en phase avec l'interrupteur global du portail.
* **Composants Premium** :
  * Navigation moderne via `MuiTabs` et `MuiTab` avec icônes.
  * Formulaires et dialogues de création (`Dialog`, `TextField`, `Select`, `MenuItem`) parfaitement harmonisés.
  * Tables interactives stylisées avec effet de survol (`TableRow`, `TableCell`).
  * Puces de statut (`Chip`) colorées pour suivre l'avancement des interventions.
  * Alertes visuelles lors du géocodage.

### 3. Navigation Flexible et Plein Écran (Nouveau !)
Pour offrir une meilleure expérience utilisateur, un groupe de boutons de basculement de disposition a été intégré au centre de l'en-tête de l'application :
* **Double Vue (Split View)** : Affiche simultanément le tableau de bord d'administration à gauche et le simulateur mobile à droite (mode par défaut).
* **Portail Admin (Full width)** : Masque le simulateur mobile et élargit le tableau de bord d'administration pour occuper toute la largeur, permettant de consulter de grands tableaux de données ou des cartes de supervision géantes de manière confortable.
* **Simulateur Mobile (Centered)** : Masque le dashboard admin et centre le smartphone sur l'écran pour se focaliser uniquement sur l'expérience mobile du technicien sur le terrain.
* **Redimensionnement dynamique des cartes** : Les instances de cartes Leaflet appellent automatiquement `map.invalidateSize()` lors de chaque basculement de layout pour recalculer instantanément le rendu des tuiles géographiques sans aucun bug visuel.

---

## 🎥 Démonstrations Vidéo & Vérification

### A. Démo de Navigation Flexible (Basculements Plein Écran)
Voici l'enregistrement de la session de test démontrant la flexibilité des nouvelles options de disposition :

![Enregistrement des tests de disposition flexible](file:///C:/Users/quenu/.gemini/antigravity-ide/brain/6c871afa-ef22-4f37-9d4a-a881c24586dd/layout_switch_test_1781863933254.webp)

### B. Démo Fonctionnelle Globale (Ajout client & Géocodage)
Voici l'enregistrement montrant le changement de thème, la navigation entre les onglets et la création réussie d'un nouveau client géocodé à Abidjan et stocké en base SQL :

![Enregistrement des tests fonctionnels de l'application](file:///C:/Users/quenu/.gemini/antigravity-ide/brain/6c871afa-ef22-4f37-9d4a-a881c24586dd/mui_dashboard_verify_1781861547756.webp)

---

## 📂 Fichiers Importants du Projet

* [prisma/schema.prisma](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/prisma/schema.prisma) : Définition des modèles de base de données.
* [prisma/seed.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/prisma/seed.js) : Script de peuplement de la base de données SQL.
* [server.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/server.js) : API Express utilisant le `PrismaClient` pour exécuter les requêtes SQL.
* [src/App.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/App.jsx) : Composant principal gérant l'état et le sélecteur de layout flexible.
* [src/components/AdminDashboard.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/components/AdminDashboard.jsx) : Dashboard web en Material UI adapté pour la bascule de taille.
* [src/components/MobileSimulator.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/components/MobileSimulator.jsx) : Simulateur mobile avec recalcul automatique de carte.

---

## 🧪 Validation Technique

### 1. Compilation
La commande `npm run build` a été validée avec succès en 3.79 secondes. Aucun warning ou conflit n'a été signalé.

### 2. Comportement des Cartes
Grâce au déclenchement différé de `invalidateSize()`, le passage de la vue double à une vue simple (plein écran) ajuste dynamiquement la carte sans aucune perte de qualité des tuiles OpenStreetMap, préservant également les popups de marqueurs et l'avancement du technicien.
