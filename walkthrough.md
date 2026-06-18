# Walkthrough — Application de Géolocalisation & Guidage (Découplage V2 - Abidjan)

Ce document présente l'architecture finale et découplée implémentée pourYA CONSULTING, intégrant un **véritable serveur Backend API (Node.js/Express)** et un **Frontend réactif (Vite/React)**, tous deux configurés pour la **Côte d'Ivoire**.

---

## 🚀 Lancement & Accès Rapide

Les deux serveurs démarrent ensemble avec une seule commande :
```bash
npm run dev:all
```
* **Frontend Client (Vite/React)** : Accessible sur **[http://localhost:5173/](http://localhost:5173/)**
* **Backend API (Node.js/Express)** : Écoute sur **[http://localhost:3001/](http://localhost:3001/)**

> [!NOTE]
> Le serveur de développement de Vite intègre un proxy qui redirige automatiquement tous les appels vers `/api/*` du port `5173` vers le port `3001` du backend, évitant ainsi les erreurs de CORS en développement.

---

## 🛠️ Restructuration Réalisée (V2)

### 1. Backend API (`server.js`)
* Fournit des routes REST pour la gestion :
  * Des clients (`GET /api/clients`, `POST /api/clients`, `PUT /api/clients/:id`)
  * Des techniciens (`GET /api/employees`, `PUT /api/employees/:id/gps`)
  * Des interventions (`GET /api/operations`, `POST /api/operations`, `PUT /api/operations/:id/status`)
* **Géocodage centralisé** : Le serveur gère lui-même la conversion des adresses textuelles en coordonnées GPS dans le périmètre d'Abidjan (Plateau, Cocody, Marcory, etc.).
* **Base de données persistante (`database.json`)** : Les données sont lues et sauvegardées automatiquement dans un fichier JSON structuré dans votre workspace, simulant le comportement d'une base PostgreSQL/PostGIS.

### 2. Frontend React (`src/App.jsx`)
* Les données ne sont plus gérées en local mais récupérées dynamiquement via des requêtes HTTP asynchrones `fetch()` au montage du composant principal.
* Lors d'actions de modification (planifier une mission, changer le statut ou bouger le GPS d'un technicien), le frontend communique avec l'API backend Express.
* **Mise à jour optimiste du GPS** : Les déplacements GPS simulés du technicien mettent à jour le state local de façon instantanée pour garantir des animations de cartes fluides à 60 fps sur l'interface, tout en transmettant la nouvelle position en tâche de fond au serveur backend API.

### 3. Localisation Côte d'Ivoire
* Utilisation systématique de la locale `fr-CI` pour le formatage des dates d'interventions et de l'horloge du smartphone.
* Numéros de téléphone à 10 chiffres (norme ivoirienne active depuis 2021).
* Points GPS calés sur Abidjan et communes environnantes (Yopougon, Marcory, Cocody, Plateau).

---

## 📂 Fichiers Livrés & Modifiés

* [server.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/server.js) : Serveur backend Node.js en syntaxe ES Modules.
* [vite.config.js](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/vite.config.js) : Ajout du bloc de proxying `/api` $\rightarrow$ `3001`.
* [package.json](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/package.json) : Scripts `"server"` et `"dev:all"`, dépendances `express`, `cors`, `concurrently`.
* [src/App.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/App.jsx) : Intégration des flux HTTP asynchrones.
* [src/components/AdminDashboard.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/components/AdminDashboard.jsx) : Soumission asynchrone du formulaire et formatage locale `fr-CI`.
* [src/components/MobileSimulator.jsx](file:///c:/Users/quenu/Downloads/application-mobile-de-g%C3%A9olocalisation-des-clients-et-de-guidage-pour-les-employ%C3%A9s/src/components/MobileSimulator.jsx) : Formatage horloge locale `fr-CI`.
