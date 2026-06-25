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

---

## 🔒 V4 : Sécurisation Complète et Gestion des Rôles (JWT)

Afin de passer d'un prototype à une application prête pour la production, nous avons verrouillé l'API backend pour garantir la sécurité et la confidentialité des données.

### 1. Middlewares Backend
- **`authenticateToken`** : Un middleware Express qui intercepte chaque requête, vérifie la présence du token JWT généré lors de la connexion, et le valide à l'aide d'une clé secrète (`JWT_SECRET`). Les requêtes non authentifiées sont rejetées avec un code d'erreur `401` ou `403`.
- **`requireRole(role)`** : Un middleware de contrôle d'accès basé sur le rôle (RBAC) qui s'assure que seules les personnes ayant le rôle spécifique (ex: `admin`) puissent appeler les routes critiques (comme la création de clients, d'opérations, ou la modification des profils employés).

### 2. Client Frontend Sécurisé
- Le frontend `App.jsx` a été refactorisé pour utiliser un helper asynchrone centralisé : `apiFetch()`.
- Ce helper inclut automatiquement le token JWT du `localStorage` dans l'en-tête `Authorization: Bearer <token>` pour tous les appels sortants.
- Si le token a expiré, le frontend intercepte automatiquement l'erreur `401`, détruit la session locale (`handleLogout`) et redirige l'utilisateur vers la mire de connexion de manière fluide.

---

## 👤 V5 : Mise à jour de la photo de profil de M. Koffi Kouadio

Nous avons remplacé la photo de profil générique couleur (homme blanc souriant) par la photo en noir et blanc d'un jeune homme noir fournie par l'utilisateur.

### Modifications réalisées :
1. **Copie de la photo** : L'image fournie a été enregistrée sous [frontend/public/koffi.jpg](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/frontend/public/koffi.jpg).
2. **Données statiques** : Mise à jour de la propriété `avatar` de `emp_1` dans [frontend/src/mockData.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/frontend/src/mockData.js).
3. **Configuration Backend** : Mise à jour de `avatar` de `emp_1` dans [backend/database.json](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/backend/database.json) et dans le script de peuplement [backend/prisma/seed.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/backend/prisma/seed.js).
4. **Base de données SQL** : Mise à jour directe de la colonne `avatar` de l'employé `emp_1` dans la base SQL SQLite via un script d'exécution.

---

## 🎨 V6 : Améliorations Visuelles Majeures et Polissage UX

Nous avons passé en revue et poli tous les détails de l'application pour offrir une expérience utilisateur et un rendu esthétique de qualité professionnelle.

### 📊 1. Refonte visuelle de la Facture / Rapport PDF
* **Identité visuelle de marque** : Intégration d'un bandeau décoratif bleu profond en haut du rapport et d'un double cercle vectoriel haut de gamme autour du logo officiel de YA Consulting.
* **Icônes vectorielles** : Dessin vectoriel personnalisé de picto-icônes (Pin d'adresse, Téléphone, Enveloppe email) insérés avant les détails de l'entreprise.
* **Tableau de bord de synthèse** : Remplacement des lignes de texte basiques par un bloc de résumé à trois colonnes avec de grands indicateurs colorés thématiques séparés par de fines bordures.
* **Tableau structuré** :
  * Élimination des retours à la ligne disgracieux dans la colonne de la date en élargissant la colonne.
  * Centrage horizontal de la date et des statuts pour une meilleure lisibilité.
  * Remplacement des statuts textuels simples par de véritables cellules en forme de badges colorés pastels (`PLANIFIÉE` en bleu, `EN COURS` en orange, `TERMINÉE` en vert).
* **Ouverture et téléchargement directs** : La facture s'ouvre automatiquement dans un nouvel onglet pour vérifier le rendu en direct tout en déclenchant le téléchargement du fichier sous son nom réel.

### 🗺️ 2. Intégration des cartes Leaflet adaptatives au Mode Sombre
* **Mise à jour en temps réel** : Les cartes de supervision de l'administration et du simulateur mobile détectent désormais le basculement en mode sombre.
* **Tuiles foncées élégantes** : Chargement dynamique des tuiles de carte foncées `dark_all` de CartoDB à la place de la carte claire `voyager` pour une immersion totale dans le thème sombre sans fatigue oculaire.

### 📱 3. Polissage et Réactivité du Simulateur Mobile
* **Horloge temps réel** : La barre de statut du smartphone simulé met à jour son heure de manière dynamique toutes les 15 secondes au lieu d'être figée.
* **Itinéraire automatisé** : Lorsqu'un technicien démarre une mission, l'itinéraire et les informations de temps restant, distance et heure estimée d'arrivée se calculent et s'affichent automatiquement à l'écran sans aucun clic superflu.

---

## 👤 V7 : Résolution de la duplication et Gestion interactive des Avatars

Nous avons corrigé la duplication des photos de profil des collaborateurs et ajouté un système de sélection d'avatars haut de gamme.

### Modifications réalisées :

1. **Séparation des Avatars en Base de Données (SQLite)** :
   * Mis à jour la base de données SQL `dev.db` pour attribuer des portraits professionnels Unsplash distincts à **Diarrasouba yassoungo** et **ange nathan**, éliminant ainsi le portrait identique et doublé.
2. **Support API au niveau du Backend (`server.js`)** :
   * Mis à jour les points de terminaison `POST /api/employees` et `PUT /api/employees/:id` pour accepter le champ `avatar`.
   * Mis en place une liste de presets d'avatars professionnels pour attribuer une photo aléatoire et unique par défaut lors de la création si aucune n'est choisie.
3. **Sélecteur d'Avatar Interactif lors de la Création (`AdminDashboard.jsx`)** :
   * Intégration d'un sélecteur graphique sous forme de grille de portraits professionnels de démonstration dans le formulaire "Ajouter un collaborateur".
4. **Changement d'Avatar Dynamique en Temps Réel (`AdminDashboard.jsx`)** :
   * Ajout d'une section "Modifier la photo de profil" directement au sein du modal de détails d'un collaborateur (clic sur l'employé). L'administrateur peut cliquer sur l'un des 8 presets pour modifier instantanément la photo de profil du collaborateur sans rechargement.



