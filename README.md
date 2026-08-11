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
| [`payment-api`](./payment-api) | API de paiement (NestJS) mutualisée : intègre les providers tunisiens Konnect Network et Paymee derrière une interface unique. | — | Clé API interne |
| [`db`](./db) | Dump SQL de référence du schéma partagé `foot`. | — | — |
| [`skote`](./skote) | Template d'admin React (Themesbrand Skote) vendored à titre de référence visuelle — non branché au produit. | — | — |

D'autres documents complètent ce README :

- [`roadmap.md`](./roadmap.md) — backlog produit/fonctionnel (API-Football live, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD).
- [`manquants.md`](./manquants.md) — dette technique (infrastructure, sécurité, qualité, gouvernance des données).

## Démarrage local

```bash
./start.sh
```

Ce script démarre un conteneur MariaDB partagé (`mariadb_container`, port `3307`) et phpMyAdmin (port `9090`), applique un correctif de schéma idempotent, puis lance en parallèle `arbinote`, `matchsheet`, `superadmin` et `teamManager`. `sso` n'est pas encore intégré à ce script (voir `manquants.md` § 1.1) : il doit être démarré manuellement (`cd sso && pnpm run dev`, port `3004`) pour que la connexion fonctionne dans les autres apps. `ob` et `payment-api` sont des déploiements séparés, à démarrer indépendamment depuis leur propre dossier.

## Architecture partagée

- **Base de données** : une seule base MariaDB `foot`, partagée par `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso` et `ob` (lecture seule pour ce dernier). Les tables communes (`teams`, `matches`, `Player`, `Card`, `User`, …) permettent à chaque app de lire/écrire les mêmes données sans duplication.
- **Authentification** : `sso` signe un JWT (HS256, `jose`) placé dans un cookie partagé (`foot_sso_session` par défaut, domaine configurable via `SSO_COOKIE_DOMAIN` pour du multi-sous-domaine). Les autres apps ne font que vérifier ce cookie avec le même secret (`SSO_JWT_SECRET`) et le même issuer (`foot-sso`) — elles n'émettent jamais de session elles-mêmes. `matchsheet` est volontairement hors de ce périmètre (kiosque sans authentification).
- **API-Football** : intégration externe en cours de finalisation (voir `arbinote/matching.md` et `roadmap.md` § 1) pour le rapprochement des équipes/matchs locaux avec les identifiants de l'API et le suivi des scores en direct.
