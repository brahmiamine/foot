# match-operations

## Rôle du projet

Kiosque de feuille de match électronique, de la préparation à la clôture.

## Fonctionnalités publiques

Sélection d'un match; pré-match, officiels et contrôles; direct (buts, cartons, blessures, remplacements); post-match et consultation live.

**Pages inventoriées :** `/[matchId]/controls`, `/[matchId]/live`, `/[matchId]/officials`, `/[matchId]`, `/[matchId]/post-match`, `/[matchId]/pre-match`, `/`

## Fonctionnalités administratives

Aucun back-office séparé: les écrans du kiosque modifient directement la feuille via les services serveur.

## API

`/api/health`, `/api/logout`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Aucune authentification applicative des pages métier. Les gardes d'état (`sheetGuard`, `LiveEntryGuards`) imposent la séquence et les signatures, mais une signature sur place n'authentifie pas techniquement l'appelant.

## Données possédées

Base `foot`: feuilles, compositions, officiels, contrôles, réserves, signatures et événements de match (buts, cartons, blessures, remplacements).

**Migrations réellement présentes :** Initialisation match-operations; officiels/contrôles; contrainte unique des cartons; version optimiste des feuilles; intégrité des signatures; clé d'idempotence des événements live (TASK-P0-025, `sql/migration_add_event_client_request_id.sql`) dans `sql/`.

## Intégrations

MariaDB partagée avec matchs/joueurs; client notifications présent pour certains événements; paramètres SSO présents mais pas de garde utilisateur sur les pages métier.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SSO_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3001 via `PORT=3001` dans `../start.sh`; sinon défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `arbinote`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Kiosque volontairement sans session: à isoler réseau/physiquement avant production. PWA sans synchronisation robuste des écritures hors ligne. Seulement `/api/health`, `/api/internal/matches/[matchId]/reopen` et `/api/logout`; les mutations passent par actions serveur/services.

**Blocage de la saisie sur un match annulé (TASK-P0-003)** : `services/sheetGuard.ts#assertSheetEditable`, déjà appelé par tous les services de saisie live (`GoalService`/`InjuryService`/`SubstitutionService`/`CardEventService`), vérifie désormais aussi `Match.status !== 'CANCELLED'` (nouvelle `MatchCancelledError`) — lecture directe de la table `matches` partagée (federation-hub, seul écrivain de ce statut), aucun appel réseau nécessaire.

## Éligibilité réglementaire

Avant la transition serveur vers `PRE_MATCH_SIGNED`, `EligibilityService` contrôle chaque joueur de la composition. Une licence, une inscription, un contrat requis, une affiliation, un engagement club, une aptitude médicale requise, l'âge, les suspensions et les transferts sont vérifiés ; tout motif bloquant refuse la signature et est audité.
