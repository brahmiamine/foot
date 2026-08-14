> **Note (normalisation d'architecture) :** ce cahier des charges est le
> document fondateur historique de `club-hub`, rédigé avec l'Olympique de
> Béja comme club pilote. `club-hub` est depuis devenu une application
> **générique multi-clubs** (voir README racine, section « Classification des
> projets ») : le club connecté est déterminé dynamiquement par le contexte
> d'authentification (`teamId`), et aucune référence à un club particulier ne
> doit être hardcodée dans le code. Ce document est conservé tel quel pour sa
> valeur de spécification fonctionnelle d'origine ; les mentions de
> l'Olympique de Béja ci-dessous décrivent le contexte initial du projet, pas
> une contrainte du produit actuel.

<div align="center">

# CAHIER DES CHARGES
## Application Web Responsive PWA - Gestion de club (club pilote : Olympique de Béja)

**Version:** 1.0  
**Date:** 2024  
**Type:** Application Web Progressive (PWA)

</div>

---

## TABLE DES MATIÈRES

1. [Introduction et Contexte](#1-introduction-et-contexte)
2. [Objectifs du Projet](#2-objectifs-du-projet)
3. [Spécifications Fonctionnelles](#3-spécifications-fonctionnelles)
4. [Système de Rôles et Permissions](#4-système-de-rôles-et-permissions)
5. [Spécifications Techniques](#5-spécifications-techniques)
6. [Modèle de Données](#6-modèle-de-données)
7. [Priorités et Versions](#7-priorités-et-versions)
8. [Exigences de Sécurité](#8-exigences-de-sécurité)
9. [Exigences de Performance et Accessibilité](#9-exigences-de-performance-et-accessibilité)

---

## 1. INTRODUCTION ET CONTEXTE

### 1.1. Présentation du Projet

Le Club Olympique de Béja souhaite développer une application web progressive (PWA) complète pour gérer l'ensemble de ses activités sportives, administratives et communautaires. Cette plateforme doit servir de point central pour tous les acteurs du club : supporters, joueurs, parents, staff, entraîneurs et administration.

### 1.2. Contexte du Club

Le Club Olympique de Béja est une structure sportive qui gère :
- Plusieurs catégories d'âge (U7, U9, U11, U13, U15, U17, Seniors, etc.)
- Sections Hommes et Femmes
- Potentiellement plusieurs sports (Football, Handball, Rugby, Basket)
- Une communauté de supporters active
- Des partenaires et sponsors
- Une boutique de produits dérivés

### 1.3. Enjeux

- **Engagement des supporters** : Créer une communauté active et fidèle
- **Gestion efficace** : Centraliser toutes les informations et processus
- **Communication** : Faciliter la communication entre tous les acteurs
- **Monétisation** : Développer les revenus via sponsors et boutique
- **Professionnalisation** : Moderniser la gestion du club

---

## 2. OBJECTIFS DU PROJET

### 2.1. Objectifs Principaux

1. **Centraliser la gestion du club** : Un seul outil pour tout gérer
2. **Engager la communauté** : Faire revenir les supporters quotidiennement
3. **Faciliter la communication** : Entre joueurs, staff, supporters et administration
4. **Gérer efficacement** : Matchs, convocations, statistiques, finances
5. **Monétiser** : Sponsors, boutique, abonnements

### 2.2. Objectifs Spécifiques

- Application responsive fonctionnant sur tous les appareils
- Application PWA installable sur mobile
- Interface intuitive et moderne
- Système de notifications en temps réel
- Gestion multi-sport et multi-catégories
- Système de gamification pour les supporters
- Plateforme e-commerce intégrée
- Gestion administrative complète

---

## 3. SPÉCIFICATIONS FONCTIONNELLES

### 3.1. ESPACE UTILISATEUR (Supporters, Joueurs, Parents)

#### 3.1.1. Compte & Profil

**Fonctionnalités :**
- Inscription avec validation selon le type de compte
- Connexion / Déconnexion
- Authentification via NextAuth (avec Google Auth)
- Récupération de mot de passe
- Modification du profil :
  - Photo de profil
  - Nom / Prénom
  - Email
  - Téléphone
  - Rôle (supporter, joueur, parent)
  - Catégorie et section (pour joueurs)

**Règles de validation :**
- Supporters : Validation automatique
- Joueurs : Validation par Admin
- Staff : Validation par Admin
- Adjoint : Validation par Admin
- Coach : Validation par Admin
- Sous-admin : Création par Admin uniquement
- Admin : Création par Admin uniquement

#### 3.1.2. Accès au Contenu du Club

**Contenu accessible :**
- Actualités du club
- Résultats des matchs
- Classement du championnat
- Calendrier des matchs et entraînements
- Galerie photos et vidéos
- Effectif des équipes

#### 3.1.3. Espace Matchs

**Fonctionnalités :**
- Liste des prochains matchs avec filtres (catégorie, date)
- Détails du match :
  - Date et heure
  - Stade
  - Adversaire
  - Score (après match)
  - Composition
  - Buteurs
  - Cartons
  - Changements
- Historique des matchs
- Statistiques des matchs

#### 3.1.4. Notifications

**Types de notifications :**
- Match programmé
- Changement d'horaire
- Résultat final
- Convocation (pour les joueurs)
- Nouvelle actualité
- Nouveau contenu exclusif
- Sondage disponible
- But marqué (live)

**Canaux :**
- Notifications PWA (push notifications)
- Email
- Notifications in-app

#### 3.1.5. Fonctionnalités Spécifiques aux Joueurs

**Espace joueur :**
- Visualisation des convocations
- Confirmation de présence / absence
- Consultation des statistiques personnelles :
  - Buts marqués
  - Cartons reçus
  - Temps de jeu
  - Matchs joués
  - Historique complet
- Planning des entraînements
- Messages du coach
- Annonces de l'équipe

#### 3.1.6. Fonctionnalités Supporters

**Engagement et interaction :**
- Commentaires sur les articles et matchs
- Vote pour l'homme du match (après chaque match)
- Participation aux sondages
- Fil d'actualité interactif (like, commentaire, partage)
- Pronostics hebdomadaires (score, buteur)
- Mur des supporters (messages de soutien)
- Messages d'encouragement avant match

**Gamification :**
- Système de points de fidélité :
  - Points gagnés pour : commentaires, votes, pronostics, partages, présence au stade (QR)
- Badges de supporter :
  - Supporter Bronze (10 interactions)
  - Supporter Argent (50 interactions)
  - Supporter Or (100 interactions)
  - Ultra du club
  - Leader des pronos
- Classement des supporters les plus fidèles
- Utilisation des points :
  - Bons de réduction boutique
  - Maillots
  - Photos dédicacées
  - Tirages au sort

**Contenus exclusifs :**
- Vidéos d'entraînements
- Interviews
- Coulisses
- Photos vestiaire après match
- Accès réservé aux supporters connectés

**Live Match :**
- Score en direct
- Buts en temps réel
- Cartons
- Changements
- Messages en temps réel
- Timeline émotionnelle du match

**Interaction avec le stade :**
- Scan QR code à l'entrée du stade
- Gain de points et badges
- Photo officielle du match (identification, réactions, partage)

**Innovations :**
- Résumé automatique du match généré par IA
- Timeline émotionnelle du match
- Classement des meilleurs pronostiqueurs

#### 3.1.7. Boutique & Billets

**Fonctionnalités :**
- Parcourir les produits (club et sponsors)
- Ajouter au panier
- Paiement en ligne (Stripe)
- Options de livraison :
  - Livraison à domicile
  - Retrait au stade
- Suivi des commandes
- Historique des achats
- Codes promo (liés aux points de fidélité)
- Avis et notes sur les produits
- Réservation de billets pour les matchs

---

### 3.2. ESPACE ADMINISTRATION

#### 3.2.1. Gestion des Utilisateurs

**Fonctionnalités Admin :**
- Visualisation de tous les comptes avec filtres
- Création de comptes
- Modification des rôles et permissions
- Validation des demandes d'inscription
- Blocage / Suspension de comptes
- Historique des actions (logs)
- Export des données utilisateurs

#### 3.2.2. Gestion des Joueurs & Staff

**Gestion des joueurs :**
- Ajout d'un joueur (avec catégorie et section)
- Modification des informations :
  - Numéro de maillot
  - Poste
  - Photo
  - Statistiques
  - Catégorie
  - Section (Homme/Femme)
- Suppression d'un joueur
- Transfert entre catégories
- Historique des performances

**Gestion du staff :**
- Ajout de membres du staff
- Attribution des rôles (Coach, Adjoint, Staff médical, etc.)
- Gestion des permissions par rôle
- Historique des actions

#### 3.2.3. Gestion des Matchs

**Création et modification :**
- Créer un match :
  - Date et heure
  - Stade
  - Adversaire
  - Catégorie
  - Section (Homme/Femme)
  - Type de compétition
- Modifier un match existant
- Annuler un match

**Saisie des résultats :**
- Score final
- Buteurs (avec minute)
- Cartons (jaunes, rouges)
- Changements (entrées/sorties)
- Composition de départ
- Statistiques du match
- Résumé du match

#### 3.2.4. Convocations

**Gestion des convocations :**
- Sélection des joueurs convoqués
- Envoi automatique de notifications
- Suivi des réponses (présent / absent)
- Gestion des indisponibilités
- Historique des convocations
- Export de la liste

#### 3.2.5. Gestion des Actualités

**Création de contenu :**
- Créer un article avec :
  - Titre
  - Contenu (éditeur riche)
  - Images
  - Vidéos
  - Catégorie
  - Tags
- Modifier un article
- Supprimer un article
- Publier / Dépublier
- Planifier la publication
- Statistiques de vues et interactions

#### 3.2.6. Galerie

**Gestion des médias :**
- Upload de photos (multiples)
- Upload de vidéos
- Organisation par albums
- Tags et descriptions
- Suppression de contenus
- Modération des contenus utilisateurs

#### 3.2.7. Classement & Championnat

**Gestion du classement :**
- Ajout d'équipes au championnat
- Saisie des points
- Calcul automatique du classement
- Gestion des matchs joués
- Différences de buts
- Historique des classements par saison

#### 3.2.8. Gestion de la Boutique

**Administration boutique :**
- Ajouter un produit :
  - Nom, description
  - Images multiples
  - Prix
  - Stock
  - Catégorie
  - Vendeur (club ou sponsor)
- Modifier prix et stock
- Gérer les promotions
- Voir toutes les commandes
- Valider les commandes
- Gérer les retours
- Statistiques de ventes

#### 3.2.9. Notifications Globales

**Envoi de notifications :**
- Message à tous les utilisateurs
- Message ciblé :
  - Seulement les joueurs
  - Une catégorie spécifique
  - Une section (Homme/Femme)
  - Un rôle spécifique
- Planification d'envoi
- Historique des notifications

#### 3.2.10. Statistiques Admin

**Tableaux de bord :**
- Nombre d'utilisateurs par rôle
- Nombre de joueurs par catégorie
- Nombre de matchs joués
- Statistiques de victoires / défaites / nuls
- Taux d'engagement des supporters
- Statistiques de la boutique
- Statistiques des sponsors
- Graphiques et rapports

#### 3.2.11. Gestion Administrative (Secrétaire Général)

**Fonctionnalités :**
- Gestion des licences :
  - Suivi des licences par joueur
  - Dates d'expiration
  - Renouvellements
- Gestion des certificats médicaux :
  - Upload des certificats
  - Dates de validité
  - Alertes d'expiration
- Gestion des autorisations parentales
- Suivi des dossiers joueurs
- Communication avec les fédérations
- Export de documents PDF :
  - Listes de joueurs
  - Feuilles de match
  - Documents administratifs
- Archivage des saisons

#### 3.2.12. Gestion Financière (Trésorier)

**Fonctionnalités :**
- Suivi des cotisations joueurs :
  - Montants
  - Dates de paiement
  - Statut (payé/en attente)
- Paiement des licences
- Gestion des dépenses :
  - Catégorisation
  - Justificatifs
  - Approbations
- Historique financier par saison
- Export comptable (CSV, PDF)
- Rapports financiers pour dirigeants
- Budget prévisionnel

#### 3.2.13. Gestion Juridique / Administrative

**Fonctionnalités :**
- Validation des contrats :
  - Contrats joueurs
  - Contrats coachs
  - Contrats sponsors
- Gestion des assurances
- Gestion RGPD :
  - Consentements
  - Droit à l'oubli
  - Export des données
- Gestion des conflits et sanctions
- Archivage des règlements

#### 3.2.14. Gestion des Infrastructures

**Fonctionnalités :**
- Gestion des terrains :
  - Liste des terrains
  - Disponibilités
  - Réservations
- Gestion des salles
- Gestion des créneaux horaires
- Détection des conflits d'occupation
- Planning multi-disciplines
- Maintenance des équipements

---

### 3.3. SYSTÈME DE SPONSORING

#### 3.3.1. Inscription & Validation Sponsor

**Côté Sponsor :**
- Inscription avec :
  - Nom de l'entreprise
  - Logo
  - Email
  - Téléphone
  - Site web
  - Description
- Demande de partenariat

**Côté Admin :**
- Validation / Refus de la demande
- Attribution d'un niveau de sponsor :
  - Or (Sponsor principal)
  - Argent (Sponsor officiel)
  - Bronze (Partenaire)
  - Local (Petit commerce)

#### 3.3.2. Visibilité des Sponsors

**Emplacements d'affichage :**
- Page d'accueil
- Page Sponsors dédiée
- Pages Matchs
- Page Boutique
- Espace Supporter
- Footer du site

**Informations affichées :**
- Logo
- Lien vers le site
- Description
- Promotions actives

#### 3.3.3. Offres Exclusives pour Supporters

**Types d'offres :**
- Réductions
- Bons de promotion
- Jeux concours
- Cadeaux
- Codes promo

**Accessibilité :**
- Uniquement pour supporters connectés
- Selon le niveau de sponsor

#### 3.3.4. Statistiques pour Sponsors

**Tableau de bord sponsor :**
- Nombre de vues du logo
- Nombre de clics
- Nombre d'offres utilisées
- Nombre de supporters touchés
- Taux de conversion
- Graphiques d'évolution

#### 3.3.5. Intégration Sponsor-Boutique

**Fonctionnalités :**
- Vendre ses produits sur la plateforme
- Gérer sa propre boutique
- Publier des offres promotionnelles
- Sponsoriser un match
- Offrir le prix "Homme du match"

---

### 3.4. BOUTIQUE MULTI-VENDEURS

#### 3.4.1. Rôles de la Boutique

**Admin :**
- Validation des vendeurs
- Configuration des commissions
- Gestion des paiements
- Vue globale sur toutes les ventes
- Résolution des litiges

**Vendeur / Sponsor :**
- Gestion de sa boutique
- Ajout de produits
- Gestion du stock
- Suivi des commandes
- Gestion des avis clients
- Demande de retrait d'argent

**Supporter / Client :**
- Parcourir les boutiques
- Ajouter au panier
- Paiement en ligne
- Suivi des commandes
- Avis et notes

#### 3.4.2. Système de Commission

**Fonctionnement :**
- Commission paramétrable par l'admin (ex: 10%)
- Calcul automatique sur chaque vente
- Répartition :
  - Commission club
  - Montant vendeur
- Historique des commissions
- Paiements aux vendeurs

#### 3.4.3. Gestion des Commandes

**États des commandes :**
- En attente
- En préparation
- Expédiée
- Livrée
- Annulée

**Fonctionnalités :**
- Suivi par le client
- Gestion par le vendeur
- Notifications automatiques
- Historique complet

#### 3.4.4. Paiements

**Modes de paiement :**
- Stripe (paiement en ligne)
- Paiement à la livraison
- Virement bancaire

**Sécurité :**
- Chiffrement des données bancaires
- Conformité PCI-DSS
- Gestion sécurisée des transactions

---

### 3.5. ACTEURS SPORTIFS COMPLÉMENTAIRES

#### 3.5.1. Directeur Sportif (Multi-Sport)

**Fonctionnalités :**
- Supervision de tous les sports
- Validation des recrutements
- Coordination entre sections
- Vision sportive long terme
- Harmonisation des méthodes

#### 3.5.2. Analyste de Performance

**Fonctionnalités :**
- Analyse des matchs
- Statistiques avancées
- Rapports post-match
- Comparaison de joueurs
- Suivi de progression

#### 3.5.3. Préparateur Physique

**Fonctionnalités :**
- Planning physique
- Charge d'entraînement
- Tests physiques
- Suivi de la fatigue
- Prévention des blessures

---

### 3.6. ACTEURS MÉDICAUX

#### 3.6.1. Médecin du Club

**Fonctionnalités :**
- Gestion des certificats médicaux
- Autorisation de reprise après blessure
- Diagnostics
- Historique médical des joueurs

#### 3.6.2. Kinésithérapeute / Ostéopathe

**Fonctionnalités :**
- Suivi des soins
- Suivi de rééducation
- Gestion des temps d'arrêt
- Historique des blessures
- Planning de soins

#### 3.6.3. Préparateur Mental

**Fonctionnalités :**
- Suivi de la confiance
- Gestion du stress
- Préparation à la compétition
- Accompagnement retour après blessure

---

### 3.7. ACTEURS COMMUNICATION

#### 3.7.1. Responsable Communication / Media

**Fonctionnalités :**
- Publication d'actualités
- Gestion des réseaux sociaux (intégration)
- Gestion des vidéos
- Interviews
- Relations presse

#### 3.7.2. Community Manager

**Fonctionnalités :**
- Modération des commentaires
- Réponses aux supporters
- Animation des concours
- Gestion du mur des supporters
- Gestion des sondages

---

### 3.8. ACTEURS LOGISTIQUES

#### 3.8.1. Responsable Sécurité

**Fonctionnalités :**
- Gestion de l'accueil public
- Gestion des accès au stade
- Gestion des incidents
- Coordination avec les forces de l'ordre

#### 3.8.2. Responsable Billetterie

**Fonctionnalités :**
- Ventes de billets
- Contrôle d'accès
- Gestion des QR codes
- Statistiques de fréquentation

---

## 4. SYSTÈME DE RÔLES ET PERMISSIONS

### 4.1. Hiérarchie des Rôles

```
ADMIN (Super Administrateur)
  ↓
SOUS-ADMIN (Administrateur secondaire)
  ↓
DIRECTEUR SPORTIF
  ↓
COACH (Entraîneur principal)
  ↓
ADJOINT (Entraîneur adjoint)
  ↓
STAFF (Médical, Logistique, etc.)
  ↓
JOUEUR
  ↓
SUPPORTER
```

### 4.2. Détail des Rôles

#### 4.2.1. ADMIN (Super Administrateur)

**Pouvoirs complets :**
- Valider tous les comptes (sauf supporters → auto-acceptés)
- Gérer les rôles et permissions
- Créer / modifier / supprimer :
  - Sous-admins
  - Coachs
  - Adjoints
  - Staffs
  - Joueurs
- Gérer TOUTES les catégories (Hommes / Femmes)
- Gérer TOUTES les équipes
- Créer les matchs
- Modifier les matchs
- Publier les résultats officiels
- Valider les convocations créées par les coachs (optionnel)
- Publier actualités / articles / photos
- Accéder aux statistiques globales du club
- Voir l'historique des actions (logs)
- Gérer les sponsors
- Gérer la boutique
- Gérer les finances
- Gérer les infrastructures

**Restrictions :**
Aucune → c'est le rôle suprême.

#### 4.2.2. SOUS-ADMIN (Administrateur secondaire)

**Pouvoirs :**
- Gérer joueurs (ajouter, modifier, supprimer)
- Gérer staff
- Gérer matchs (créer, modifier, résultats)
- Gérer actualités
- Gérer galerie photos/vidéos
- Accéder aux statistiques des catégories
- Aider l'admin sur la gestion quotidienne

**Restrictions :**
- Ne peut PAS valider les comptes
- Ne peut PAS créer d'admin ou sous-admin
- Ne peut PAS modifier les permissions des rôles
- Ne peut PAS supprimer un coach principal

#### 4.2.3. COACH (Entraîneur principal)

**Important :** Le coach appartient à une catégorie Homme ou Femme.

**Pouvoirs :**
- Gérer son équipe uniquement :
  - Voir ses joueurs
  - Ajouter notes, stats (buts, cartons, temps de jeu)
  - Créer les convocations
  - Gérer planning d'entraînement
- Valider la liste des joueurs convoqués
- Voir les disponibilités (présent / absent)
- Envoyer notifications à son équipe
- Voir l'historique des matchs de sa catégorie
- Publier des posts publics pour son équipe

**Restrictions :**
- Ne peut pas gérer les autres catégories
- Ne peut pas modifier un autre coach
- Ne peut pas créer des rôles
- Ne gère pas la boutique ou les actualités du club entier

#### 4.2.4. ADJOINT (Entraîneur adjoint)

**Rattaché à :**
- Un coach précis
- Une catégorie
- Homme / Femme

**Pouvoirs :**
- Voir toutes les infos de l'équipe
- Assister dans :
  - Convocations
  - Analyse des joueurs
  - Statistiques
  - Organisation des entraînements
- Proposer une composition
- Gérer la communication avec les joueurs

**Restrictions :**
- Ne peut pas valider les convocations finales
- Ne crée pas de matchs
- Ne valide pas les résultats officiels
- Ne modifie pas un joueur sans validation du coach

#### 4.2.5. STAFF

**Types de staff :**
- Kinésithérapeute
- Médecin
- Dirigeant
- Secrétaire
- Responsable matériel
- Préparateur physique
- Analyste de performance

**Pouvoirs possibles (selon type) :**
- Voir calendrier des matchs
- Voir convocations
- Ajouter informations médicales (blessures, retour au jeu)
- Gérer équipements (maillots, ballons…)
- Mettre à jour l'état des joueurs (fit / blessé / en reprise)

**Restrictions :**
- Ne gère pas les joueurs (modification de profil)
- Ne gère pas le contenu du site
- Ne crée pas de matchs

#### 4.2.6. JOUEUR

**Attributs obligatoires :**
- Catégorie
- Homme / Femme

**Pouvoirs :**
- Voir ses convocations
- Confirmer Présent / Absent
- Voir ses statistiques personnelles
- Voir les matchs de sa catégorie
- Voir les entraînements
- Voir les annonces du coach
- Modifier son profil (photo, tel, etc.)

**Restrictions :**
- Ne peut rien modifier sur le club
- Ne voit pas les autres équipes (optionnel)
- Ne publie pas de contenu

#### 4.2.7. SUPPORTER

**Pouvoirs :**
- Voir actualités
- Voir galerie
- Voir résultats et classement
- Voir effectifs (si public)
- Commenter les articles
- Voter pour homme du match
- Participer aux sondages
- Faire des pronostics
- Poster sur le mur des supporters
- Gagner des points et badges

**Restrictions :**
- Aucun accès privé
- Pas de convocations
- Pas de stats personnelles
- Pas de gestion d'équipe

### 4.3. Rôles Administratifs Spécialisés

#### 4.3.1. SECRÉTAIRE GÉNÉRAL

**Fonctionnalités :**
- Gestion des licences
- Gestion des certificats médicaux
- Gestion des autorisations parentales
- Suivi des dossiers joueurs
- Communication avec les fédérations
- Export de documents PDF
- Archivage des saisons

#### 4.3.2. TRÉSORIER

**Fonctionnalités :**
- Suivi des cotisations joueurs
- Paiement des licences
- Gestion des dépenses
- Historique financier par saison
- Export comptable
- Rapports financiers dirigeant

#### 4.3.3. RESPONSABLE JURIDIQUE / ADMINISTRATIF

**Fonctionnalités :**
- Validation des contrats (Joueurs, Coach, Sponsors)
- Gestion des assurances
- Gestion RGPD
- Gestion conflits & sanctions
- Archivage des règlements

#### 4.3.4. RESPONSABLE INFRASTRUCTURES

**Fonctionnalités :**
- Gestion des terrains
- Gestion des salles
- Gestion des créneaux horaires
- Détection des conflits d'occupation
- Maintenance
- Planning multi-disciplines

#### 4.3.5. RESPONSABLE SPONSORING

**Fonctionnalités :**
- Prospection sponsors
- Négociation contrats
- Gestion visibilité
- Fidélisation partenaires

#### 4.3.6. RESPONSABLE BOUTIQUE

**Fonctionnalités :**
- Gestion des produits
- Gestion des stocks
- Gestion des prix
- Gestion des promotions
- Logistique des commandes

---

## 5. SPÉCIFICATIONS TECHNIQUES

### 5.1. Stack Technique

| Élément | Technologie |
|---------|------------|
| **Frontend** | Next.js 14+ (App Router) + TypeScript |
| **Backend** | API Routes Next.js |
| **Base de données** | MariaDB 10.6+ |
| **ORM** | TypeORM |
| **Authentification** | NextAuth.js (avec Google OAuth) |
| **UI Framework** | Bootstrap 5 |
| **Paiements** | Stripe |
| **Notifications** | Service Worker (PWA) + Email |
| **Stockage fichiers** | À définir (local ou cloud) |

### 5.2. Architecture PWA

#### 5.2.1. Service Worker

**Fonctionnalités :**
- Mise en cache des assets statiques
- Mise en cache des pages visitées
- Mode hors ligne basique
- Gestion des notifications push
- Mise à jour en arrière-plan

#### 5.2.2. Manifest

**Configuration :**
- Nom de l'application
- Icônes (multiple tailles)
- Thème de couleur
- Mode d'affichage (standalone)
- Orientation (portrait/landscape)
- Écran de démarrage

#### 5.2.3. Installation

**Critères d'installation :**
- Service Worker actif
- Manifest valide
- HTTPS (ou localhost en développement)
- Engagement utilisateur (interaction)

### 5.3. Architecture Application

#### 5.3.1. Structure Frontend

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (public)/
│   ├── page.tsx (accueil)
│   ├── actualites/
│   ├── matchs/
│   ├── classement/
│   ├── effectif/
│   └── galerie/
├── (user)/
│   ├── dashboard/
│   ├── profil/
│   ├── convocations/
│   └── statistiques/
├── (admin)/
│   ├── dashboard/
│   ├── utilisateurs/
│   ├── joueurs/
│   ├── matchs/
│   └── ...
├── api/
│   ├── auth/
│   ├── users/
│   ├── matchs/
│   └── ...
└── components/
```

#### 5.3.2. API Routes

**Endpoints principaux :**
- `/api/auth/*` - Authentification
- `/api/users/*` - Gestion utilisateurs
- `/api/players/*` - Gestion joueurs
- `/api/matches/*` - Gestion matchs
- `/api/news/*` - Actualités
- `/api/gallery/*` - Galerie
- `/api/sponsors/*` - Sponsors
- `/api/shop/*` - Boutique
- `/api/notifications/*` - Notifications
- `/api/stats/*` - Statistiques

### 5.4. Base de Données

#### 5.4.1. Tables Principales

**Utilisateurs et Rôles :**
- `users` - Utilisateurs
- `roles` - Rôles
- `user_roles` - Relation utilisateur-rôle
- `permissions` - Permissions
- `role_permissions` - Relation rôle-permission

**Sport :**
- `players` - Joueurs
- `teams` - Équipes
- `categories` - Catégories (U7, U9, Seniors, etc.)
- `matches` - Matchs
- `match_events` - Événements match (buts, cartons, etc.)
- `convocations` - Convocations
- `convocation_responses` - Réponses aux convocations
- `trainings` - Entraînements
- `player_stats` - Statistiques joueurs
- `standings` - Classements

**Contenu :**
- `news` - Actualités
- `news_comments` - Commentaires actualités
- `gallery` - Galerie
- `media` - Médias (photos, vidéos)

**Supporters :**
- `supporter_points` - Points de fidélité
- `badges` - Badges
- `user_badges` - Badges utilisateurs
- `polls` - Sondages
- `poll_votes` - Votes sondages
- `predictions` - Pronostics
- `supporter_wall` - Mur des supporters
- `match_votes` - Votes homme du match

**Sponsors :**
- `sponsors` - Sponsors
- `sponsor_levels` - Niveaux de sponsor
- `sponsor_offers` - Offres sponsors
- `sponsor_stats` - Statistiques sponsors

**Boutique :**
- `vendors` - Vendeurs
- `products` - Produits
- `product_images` - Images produits
- `orders` - Commandes
- `order_items` - Articles commandes
- `payments` - Paiements
- `commissions` - Commissions
- `reviews` - Avis produits

**Administratif :**
- `licenses` - Licences
- `medical_certificates` - Certificats médicaux
- `parental_authorizations` - Autorisations parentales
- `financial_transactions` - Transactions financières
- `contracts` - Contrats
- `infrastructures` - Infrastructures
- `bookings` - Réservations

**Système :**
- `notifications` - Notifications
- `logs` - Logs d'actions
- `sessions` - Sessions utilisateurs

### 5.5. Sécurité

#### 5.5.1. Authentification

- NextAuth.js avec stratégies multiples
- Google OAuth 2.0
- Authentification par email/mot de passe
- Hashage des mots de passe (bcrypt)
- Tokens JWT sécurisés
- Refresh tokens
- Expiration des sessions

#### 5.5.2. Autorisation

- Système de rôles et permissions (RBAC)
- Vérification des permissions côté serveur
- Protection des routes API
- Middleware d'authentification
- Validation des données d'entrée

#### 5.5.3. Protection des Données

- Chiffrement des données sensibles
- Protection CSRF
- Protection XSS
- Validation et sanitization des inputs
- Protection SQL Injection (via ORM)
- HTTPS obligatoire en production

#### 5.5.4. Conformité RGPD

- Gestion des consentements
- Droit à l'oubli
- Export des données utilisateur
- Politique de confidentialité
- Mentions légales
- Cookies et tracking

### 5.6. Performance

#### 5.6.1. Optimisations Frontend

- Code splitting automatique (Next.js)
- Lazy loading des images
- Optimisation des images (next/image)
- Minification CSS/JS
- Tree shaking
- Compression Gzip/Brotli

#### 5.6.2. Optimisations Backend

- Mise en cache (Redis recommandé)
- Pagination des listes
- Requêtes optimisées (indexes DB)
- Lazy loading des relations
- Compression des réponses API

#### 5.6.3. Performance PWA

- Service Worker pour cache
- Préchargement des pages critiques
- Mise en cache des assets
- Mode hors ligne basique

### 5.7. Responsive Design

#### 5.7.1. Breakpoints

- Mobile : < 576px
- Tablet : 576px - 992px
- Desktop : > 992px

#### 5.7.2. Approche

- Mobile-first design
- Bootstrap 5 Grid System
- Composants adaptatifs
- Navigation mobile optimisée
- Touch-friendly (boutons, zones de clic)

### 5.8. Accessibilité

- Conformité WCAG 2.1 niveau AA
- Navigation au clavier
- Support lecteurs d'écran
- Contraste des couleurs
- Textes alternatifs pour images
- Labels de formulaire appropriés

---

## 6. MODÈLE DE DONNÉES

### 6.1. Diagramme Entité-Relation (Simplifié)

```
Users (1) ────< (N) UserRoles (N) >─── (1) Roles
Users (1) ────< (N) Players
Users (1) ────< (N) Orders
Users (1) ────< (N) NewsComments

Players (N) >─── (1) Categories
Players (N) >─── (1) Teams
Players (N) ────< (N) Convocations
Players (N) ────< (N) PlayerStats

Matches (N) >─── (1) Teams
Matches (N) >─── (1) Categories
Matches (N) ────< (N) MatchEvents
Matches (N) ────< (N) Convocations

Sponsors (1) ────< (N) SponsorOffers
Sponsors (1) ────< (N) Products

Products (N) >─── (1) Vendors
Products (N) ────< (N) OrderItems

Orders (N) >─── (1) Users
Orders (N) ────< (N) OrderItems
Orders (N) ────< (1) Payments
```

### 6.2. Entités Principales

#### 6.2.1. User (Utilisateur)

**Champs :**
- id (UUID)
- email (unique)
- password (hashé)
- firstName
- lastName
- phone
- avatar (URL)
- emailVerified (boolean)
- createdAt
- updatedAt
- deletedAt (soft delete)

#### 6.2.2. Player (Joueur)

**Champs :**
- id (UUID)
- userId (FK → User)
- jerseyNumber
- position
- categoryId (FK → Category)
- teamId (FK → Team)
- gender (M/F)
- photo (URL)
- createdAt
- updatedAt

#### 6.2.3. Match (Match)

**Champs :**
- id (UUID)
- date
- time
- stadium
- opponent
- homeScore
- awayScore
- categoryId (FK → Category)
- teamId (FK → Team)
- status (scheduled, live, finished, cancelled)
- createdAt
- updatedAt

#### 6.2.4. Product (Produit)

**Champs :**
- id (UUID)
- name
- description
- price
- stock
- vendorId (FK → Vendor)
- category
- createdAt
- updatedAt

#### 6.2.5. Sponsor (Sponsor)

**Champs :**
- id (UUID)
- companyName
- logo (URL)
- email
- phone
- website
- level (gold, silver, bronze, local)
- status (pending, approved, rejected)
- createdAt
- updatedAt

---

## 7. PRIORITÉS ET VERSIONS

### 7.1. Version 1 (V1) - MVP

#### 7.1.1. Côté Utilisateur

**Fonctionnalités essentielles :**
- Inscription / Connexion
- Voir les matchs (liste et détails)
- Voir les résultats
- Voir l'effectif
- Voir les actualités
- Profil utilisateur basique

**Fonctionnalités supporters (prioritaires) :**
- Fil d'actualité interactif
- Commentaires
- Votes Homme du match
- Pronostics
- Notifications
- Mur des supporters
- Points + Badges (système basique)

#### 7.1.2. Côté Administration

**Fonctionnalités essentielles :**
- Gestion des utilisateurs
- Gestion des joueurs
- Gestion des matchs
- Publication des résultats
- Publication des actualités
- Gestion de la galerie (basique)
- Gestion du classement

#### 7.1.3. Sponsors et Boutique (V1 Basique)

**Fonctionnalités :**
- Page Sponsors
- Demande de partenariat
- Boutique club (1 vendeur)
- Commandes simples
- Offres sponsor
- Codes promo

### 7.2. Version 2 (V2) - Fonctionnalités Avancées

#### 7.2.1. Fonctionnalités Supporters Avancées

- Live Match complet
- Timeline émotionnelle
- Résumé IA du match
- Classement des supporters
- Contenus exclusifs avancés
- Scan QR code stade
- Photo officielle du match

#### 7.2.2. Gestion Administrative Complète

- Secrétaire général (licences, certificats)
- Trésorier (finances complètes)
- Responsable juridique
- Responsable infrastructures
- Gestion multi-sport

#### 7.2.3. Boutique Multi-Vendeurs

- Système multi-vendeurs complet
- Gestion des commissions avancée
- Retraits d'argent vendeurs
- Avis et notes produits
- Gestion des retours

#### 7.2.4. Fonctionnalités Médicales

- Gestion médicale complète
- Suivi des blessures
- Planning de soins
- Historique médical

#### 7.2.5. Analytics et Rapports

- Tableaux de bord avancés
- Rapports personnalisés
- Export de données
- Statistiques détaillées

### 7.3. Roadmap Future (V3+)

- Application mobile native (optionnel)
- Intégration réseaux sociaux avancée
- Streaming vidéo
- Chat en temps réel
- Système de parrainage
- Abonnements supporters premium
- API publique pour partenaires

---

## 8. EXIGENCES DE SÉCURITÉ

### 8.1. Authentification et Autorisation

- Authentification multi-facteurs (optionnel V2)
- Gestion des sessions
- Protection contre les attaques par force brute
- Rate limiting sur les API
- Expiration automatique des tokens

### 8.2. Protection des Données

- Chiffrement des données sensibles en base
- Chiffrement des communications (HTTPS)
- Sauvegarde régulière des données
- Plan de récupération en cas d'incident
- Audit des accès aux données sensibles

### 8.3. Conformité

- RGPD (Europe)
- Protection des données personnelles
- Consentement explicite pour les cookies
- Droit à l'oubli
- Portabilité des données

### 8.4. Journalisation

- Logs des actions administratives
- Logs des accès aux données sensibles
- Logs des erreurs
- Conservation des logs (durée à définir)

---

## 9. EXIGENCES DE PERFORMANCE ET ACCESSIBILITÉ

### 9.1. Performance

**Objectifs :**
- Temps de chargement initial < 3 secondes
- Time to Interactive < 5 secondes
- Score Lighthouse > 90
- First Contentful Paint < 1.5 secondes
- Largest Contentful Paint < 2.5 secondes

**Optimisations :**
- Lazy loading des images
- Code splitting
- Mise en cache agressive
- CDN pour les assets statiques

### 9.2. Accessibilité

- Conformité WCAG 2.1 niveau AA
- Navigation au clavier complète
- Support des lecteurs d'écran
- Contraste minimum 4.5:1 pour le texte
- Labels et descriptions appropriés

### 9.3. Compatibilité Navigateurs

**Navigateurs supportés :**
- Chrome (dernières 2 versions)
- Firefox (dernières 2 versions)
- Safari (dernières 2 versions)
- Edge (dernières 2 versions)
- Navigateurs mobiles (iOS Safari, Chrome Mobile)

### 9.4. Compatibilité Appareils

- Smartphones (iOS, Android)
- Tablettes (iOS, Android)
- Desktop (Windows, macOS, Linux)
- Résolutions : 320px à 4K

---

## 10. DÉPLOIEMENT ET INFRASTRUCTURE

### 10.1. Environnements

- **Développement** : Local
- **Staging** : Environnement de test
- **Production** : Serveur de production

### 10.2. Hébergement

**Recommandations :**
- Vercel (pour Next.js) ou
- Serveur VPS/Dedicated avec Node.js
- Base de données MariaDB dédiée
- CDN pour les assets statiques

### 10.3. Monitoring

- Monitoring des performances
- Monitoring des erreurs
- Alertes en cas d'incident
- Analytics d'utilisation

### 10.4. Sauvegardes

- Sauvegardes quotidiennes de la base de données
- Rétention des sauvegardes (30 jours minimum)
- Tests de restauration réguliers

---

## 11. DOCUMENTATION ET FORMATION

### 11.1. Documentation Technique

- Documentation API
- Documentation du code
- Guide de déploiement
- Guide de maintenance

### 11.2. Documentation Utilisateur

- Guide utilisateur (supporters, joueurs)
- Guide administrateur
- FAQ
- Tutoriels vidéo (optionnel)

### 11.3. Formation

- Formation des administrateurs
- Formation des modérateurs
- Support initial post-lancement

---

## 12. CRITÈRES D'ACCEPTATION

### 12.1. Fonctionnels

- Toutes les fonctionnalités V1 implémentées et testées
- Tous les rôles fonctionnent correctement
- Système de permissions opérationnel
- Notifications fonctionnelles
- Paiements sécurisés

### 12.2. Techniques

- Application responsive sur tous les appareils
- PWA installable et fonctionnelle
- Performance conforme aux objectifs
- Sécurité validée
- Accessibilité conforme WCAG 2.1 AA

### 12.3. Qualité

- Code propre et documenté
- Tests unitaires (couverture minimale à définir)
- Tests d'intégration
- Tests utilisateurs
- Pas de bugs critiques

---

## 13. GLOSSAIRE

- **PWA** : Progressive Web App - Application web progressive
- **RBAC** : Role-Based Access Control - Contrôle d'accès basé sur les rôles
- **ORM** : Object-Relational Mapping - Mapping objet-relationnel
- **API** : Application Programming Interface - Interface de programmation
- **JWT** : JSON Web Token - Token web JSON
- **CSRF** : Cross-Site Request Forgery - Falsification de requête inter-sites
- **XSS** : Cross-Site Scripting - Injection de script inter-sites
- **WCAG** : Web Content Accessibility Guidelines - Directives d'accessibilité du contenu web
- **RGPD** : Règlement Général sur la Protection des Données

---

## 14. CONTACTS ET RÉFÉRENCES

### 14.1. Références Techniques

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)
- [Stripe Documentation](https://stripe.com/docs)
- [PWA Guidelines](https://web.dev/progressive-web-apps/)

### 14.2. Standards

- WCAG 2.1 : Accessibilité web
- RGPD : Protection des données
- PCI-DSS : Sécurité des paiements

---

**Fin du Cahier des Charges**

*Document version 1.0 - Club Olympique de Béja*

