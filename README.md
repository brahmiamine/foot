# foot

Plateforme de gestion d'une ligue de football (fédérations, ligues, clubs, matchs, arbitrage) organisée en plusieurs applications indépendantes qui partagent une même base de données MariaDB (`foot`) et un mécanisme d'authentification centralisé (SSO par cookie JWT).

## Applications

| Projet | Rôle | Port local | Authentification |
|---|---|---:|---|
| [`sso`](./sso) | Authentification centralisée (connexion staff/club et compte membre public, y compris Google) : émet le cookie JWT partagé par toutes les autres apps. | 3004 | Émetteur du SSO |
| [`arbinote`](./arbinote) | Site public de notation des arbitres : votes, critères, classement, anomalies, alertes, transparence. | 3000 | Public (anonyme, fingerprint) + back-office `SUPERADMIN` via SSO |
| [`matchsheet`](./matchsheet) | Feuille de match électronique (kiosque tablette) : avant-match, live (cartons/buts/blessures/remplacements), après-match, signatures. | 3001 | Aucune (preuve = signature sur place) |
| [`superadmin`](./superadmin) | Back-office interne : référentiels fédérations/ligues/saisons/journées/équipes/matchs/arbitres, journal d'audit, test/mapping API-Football, gestion des comptes club. | 3002 | `SUPERADMIN` via SSO |
| [`teamManager`](./teamManager) | Back-office de gestion d'un club : effectif, staff, discipline (cartons/suspensions/amendes), actualités/médias, boutique, sponsors, académie/recrutement, exports, réglages. | 3003 | Rôles club (`ADMIN`, `SOUS-ADMIN`, `COACH`, …) via SSO |
| [`ob`](./ob) | Site public (vitrine) d'un club — Olympique de Béja — en lecture seule sur la base partagée. | — | Public |
| [`payment-api`](./payment-api) | API de paiement (NestJS) mutualisée : intègre les providers tunisiens Konnect Network, Paymee et Flouci derrière une interface unique. | — | Clé API interne |
| [`notification-api`](./notification-api) | Centre de notifications centralisé (NestJS) : in-app, email et push (SMS à venir) pour toutes les apps de l'écosystème, avec préférences utilisateur, templates multilingues, queue asynchrone (BullMQ) et idempotence. | 3010 | JWT `sso` (public) + clé de service (interne) |
| [`ob-seller-portal`](./ob-seller-portal) | Portail vendeur de la marketplace du club : catalogue produits/variantes, stock, commandes, retours, payouts (lecture seule), notifications — les vendeurs sont des comptes indépendants du SSO club. | ⚠️ voir note | Cookie de session propre (`SP_JWT_SECRET`), indépendant du SSO |
| [`db`](./db) | Dump SQL de référence du schéma partagé `foot`. | — | — |
| [`skote`](./skote) | Template d'admin React (Themesbrand Skote) vendored à titre de référence visuelle — non branché au produit. | — | — |

D'autres documents complètent ce README :

- [`roadmap.md`](./roadmap.md) — backlog produit/fonctionnel (API-Football live, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD).
- [`manquants.md`](./manquants.md) — dette technique (infrastructure, sécurité, qualité, gouvernance des données).

## Démarrage local

```bash
./start.sh
```

Ce script démarre un conteneur MariaDB partagé (`mariadb_container`, port `3307`) et phpMyAdmin (port `9090`), applique un correctif de schéma idempotent, puis lance en parallèle `arbinote`, `matchsheet`, `superadmin` et `teamManager`. `sso` n'est pas encore intégré à ce script (voir `manquants.md` § 1.1) : il doit être démarré manuellement (`cd sso && pnpm run dev`, port `3004`) pour que la connexion fonctionne dans les autres apps. `ob`, `payment-api`, `notification-api` et `ob-seller-portal` sont des déploiements séparés, à démarrer indépendamment depuis leur propre dossier.

> ⚠️ Le README de `ob-seller-portal` indique le port `3004` comme exemple, alors que ce port est déjà celui de `sso`. Aucun port fixe n'est défini dans son `package.json` (Next.js démarre par défaut sur `3000`) : à clarifier/fixer avant un lancement simultané de toutes les apps.

## Architecture partagée

- **Base de données** : une seule base MariaDB `foot`, partagée par `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso` et `ob` (lecture seule pour ce dernier). Les tables communes (`teams`, `matches`, `Player`, `Card`, `User`, …) permettent à chaque app de lire/écrire les mêmes données sans duplication. `ob-seller-portal` ajoute ses propres tables (`sp_*`) dans cette même base `foot` en attendant une future Marketplace API dédiée. `payment-api` et `notification-api` ont chacune leur propre base (paiements, notifications) ; `notification-api` ne lit `foot` qu'en lecture seule (`DIRECTORY_DB_*`), pour résoudre les destinataires d'un envoi groupé (par club, rôle, ou espace supporter).
- **Authentification** : `sso` signe un JWT (HS256, `jose`) placé dans un cookie partagé (`foot_sso_session` par défaut, domaine configurable via `SSO_COOKIE_DOMAIN` pour du multi-sous-domaine). Les autres apps ne font que vérifier ce cookie avec le même secret (`SSO_JWT_SECRET`) et le même issuer (`foot-sso`) — elles n'émettent jamais de session elles-mêmes. `matchsheet` est volontairement hors de ce périmètre (kiosque sans authentification).
- **API-Football** : intégration externe en cours de finalisation (voir `arbinote/matching.md` et `roadmap.md` § 1) pour le rapprochement des équipes/matchs locaux avec les identifiants de l'API et le suivi des scores en direct.
