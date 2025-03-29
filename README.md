# Planificateur de Vacances en Corse

Une application web construite avec React et TypeScript pour planifier votre voyage en Corse du Sud. Cette application permet aux utilisateurs de gérer leurs activités quotidiennes, suivre leur budget, et visualiser leurs dépenses par catégorie.

## Fonctionnalités

- **Authentification** - Système de connexion pour sécuriser les données de votre voyage
- **Gestion des activités** - Ajout, modification et suppression d'activités pour chaque jour
- **Suivi du budget** - Visualisation en temps réel des dépenses par rapport au budget total
- **Filtrage des activités** - Filtrer les activités par statut (réservé / à réserver)
- **Mode sombre/clair** - Basculez entre les thèmes pour un confort visuel optimal
- **Statistiques des dépenses** - Graphique visualisant les dépenses par catégorie

## Technologies utilisées

- **React** - Bibliothèque UI pour construire l'interface utilisateur
- **TypeScript** - Typage statique pour un code plus robuste
- **Firebase** - Authentication, Realtime Database pour le backend
- **Bootstrap** - Framework CSS pour le design responsive
- **Recharts** - Bibliothèque de visualisation de données pour les graphiques

## Installation et démarrage

1. Clonez ce dépôt
2. Installez les dépendances avec `npm install`
3. Créez un fichier `.env` à la racine du projet et ajoutez vos identifiants Firebase
4. Lancez l'application en mode développement avec `npm start`

## Configuration Firebase

Pour utiliser cette application, vous devez créer un projet Firebase et activer :
- Authentication (email/mot de passe)
- Realtime Database

## Structure des données

La base de données Firebase est structurée comme suit :

```
trip/
  ├── days/
  │   ├── jour1/
  │   │   ├── id: "jour1"
  │   │   ├── date: "10/06"
  │   │   ├── title: "Arrivée à Porto-Vecchio"
  │   │   └── activities/
  │   │       ├── [activity-id]/
  │   │       │   ├── name: "Nom de l'activité"
  │   │       │   ├── time: "10h00-12h00"
  │   │       │   ├── price: 50
  │   │       │   ├── link: "https://..."
  │   │       │   ├── notes: "Notes..."
  │   │       │   ├── booked: true/false
  │   │       │   └── tags: ["Plage", "Culture", ...]
  │   │       └── ...
  │   └── ...
  └── budget/
      ├── total: 2000
      └── spent: 500
```

## Captures d'écran

_Captures d'écran de l'application à ajouter ici_

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.