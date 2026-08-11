# superadmin — back-office interne

Application Next.js (App Router) réservée au rôle `SUPERADMIN` : c'est l'outil de référence qui alimente les fédérations, ligues, saisons, journées, équipes, matchs et arbitres utilisés par toutes les autres apps de l'écosystème `foot` (`arbinote`, `matchsheet`, `teamManager`, `ob`). Base MariaDB `foot` partagée, hébergée dans le conteneur Docker `mariadb_container` commun à tout le dépôt.

## Fonctionnalités

- **Tableau de bord** (`/admin`) : statistiques générales.
- **Fédérations** (`/admin/federations`) : CRUD + activation/désactivation.
- **Ligues** (`/admin/leagues`) : CRUD + activation/désactivation.
- **Saisons** (`/admin/saisons`) : CRUD.
- **Journées** (`/admin/journees`) : CRUD des journées de championnat.
- **Équipes** (`/admin/teams`) : CRUD + import CSV en masse.
- **Matchs** (`/admin/matches`) : CRUD.
- **Arbitres** (`/admin/arbitres`) : CRUD + import CSV en masse.
- **Motifs de cartons** (`/admin/card-reasons`) : référentiel disciplinaire utilisé par `teamManager` et `matchsheet`.
- **Comptes club** (`/admin/club`, `/admin/club/[teamId]`) : gestion des utilisateurs rattachés à une équipe (accès à `teamManager`).
- **Journal d'audit** (`/admin/audit`) : historique des actions effectuées dans le back-office.
- **Test/mapping API-Football** (`/admin/testapi`) : panneau de test de l'intégration externe (voir [`matching.md`](./matching.md) et [`../roadmap.md`](../roadmap.md) § 1).

Chaque ressource expose une API REST classique sous `src/app/api/admin/*` (liste/création en `GET`/`POST`, lecture/modification/suppression par identifiant en `GET`/`PUT`/`DELETE`), plus un endpoint `stats` pour le tableau de bord et un `health` pour le healthcheck.

## Authentification

Session SSO partagée avec les autres apps du dépôt : cookie JWT (`foot_sso_session` par défaut) émis par `sso`, vérifié ici avec `jose` (issuer `foot-sso`, secret `SSO_JWT_SECRET` identique partout). Rôles reconnus : `SUPERADMIN`, `ADMIN`, `OBSERVATEUR` — seul `SUPERADMIN` accède au back-office (`ensureAdminAuth`/`hasAdminSession`). Redirection automatique vers `SSO_URL` si non authentifié. L'ancien login local en dur (`ADMIN_USER`/`ADMIN_PASS`) est déprécié.

## Base de données

MySQL/MariaDB (`mysql2` + TypeORM), base `foot` partagée. Migrations dans `migrations/` (`add_is_active_to_federations.sql`, `add_is_active_to_leagues.sql`, `add_unique_vote_per_match_device.sql`) et scripts complémentaires dans `mysql/` (schéma arbitres, purge de l'ancien schéma, ajout du journal d'audit, IP des votes, champs équipe, catégories jeunes/genre, type de tournoi, alertes et modération de votes).

## Démarrage

```bash
cp env.sso.example .env.local   # renseigner DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, etc.
pnpm install
pnpm run start:dev   # ./start.sh : démarre Docker + MariaDB/phpMyAdmin partagés puis `pnpm run dev`
# ou, si la base est déjà démarrée (ex. via ../start.sh à la racine du repo) :
pnpm run dev          # http://localhost:3002
```

## Tests

```bash
pnpm test        # Vitest
```

## Interface

UI construite avec Bootstrap 5 / Reactstrap (thème SCSS custom porté du template Skote), `react-icons`, `react-toastify`, `sweetalert2`. Internationalisation FR/EN/AR.
