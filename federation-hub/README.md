# federation-hub

## Rôle du projet

Back-office plateforme des référentiels football, des comptes de clubs et de l'administration fédérale de l'arbitrage.

## Fonctionnalités publiques

Connexion via SSO et acceptation d'une invitation staff par jeton.

**Pages inventoriées :** `/admin/arbitres`, `/admin/audit`, `/admin/card-reasons`, `/admin/club/[teamId]`, `/admin/club`, `/admin/federations`, `/admin/journees`, `/admin/leagues`, `/admin/matches`, `/admin`, `/admin/saisons`, `/admin/teams`, `/invite/[token]`, `/login`, `/`

## Fonctionnalités administratives

Dashboard/statistiques; fédérations, ligues, saisons, journées, équipes et branding, matchs (annulation/réouverture, saga de compensation), arbitres/import CSV, motifs de carton, clubs/utilisateurs/invitations et audit.

### Licence et conformité des clubs (migration-v2 P0-001)

`/admin/club-licensing` fournit la file d'examen réglementaire scopée par
fédération ou ligue. Le workflow couvre le démarrage d'examen, la décision de
chaque exigence, les dérogations motivées, les demandes de correction,
l'approbation, le rejet et la suspension. Chaque transition conserve auteur,
rôle, IP, User-Agent, motif et valeurs avant/après.

### Domaine Arbitrage

- profils officiels des arbitres : fédération, ligue, catégorie, grade, statut et date de début ;
- observateurs SSO et affectations provenant de `match-operations` ;
- évaluations officielles privées (`DRAFT → SUBMITTED → VALIDATED|REJECTED`), avec transitions atomiques ;
- contrôle serveur du match, de l'arbitre désigné, de l'observateur affecté et des scopes ;
- calcul serveur de la note à partir de tous les critères privés actifs et de leurs poids (valeurs 1 à 5) ;
- analytics affichant séparément score officiel et score public ArbiNote ;
- administration ArbiNote : votes, modération, anomalies, alertes, signalements et critères publics.

`votes.note_globale` (public) et `referee_official_evaluations.note_officielle` (privé) ne sont jamais fusionnés.

## API

`/api/admin/arbitres/[id]`, `/api/admin/arbitres/import`, `/api/admin/arbitres`, `/api/admin/audit`, `/api/admin/card-reasons/[id]`, `/api/admin/card-reasons`, `/api/admin/club/[teamId]/invitations`, `/api/admin/club/[teamId]`, `/api/admin/club`, `/api/admin/club/users/[id]`, `/api/admin/federations/[id]`, `/api/admin/federations/[id]/toggle`, `/api/admin/federations`, `/api/admin/journees/[id]`, `/api/admin/journees`, `/api/admin/leagues/[id]`, `/api/admin/leagues/[id]/toggle`, `/api/admin/leagues`, `/api/admin/logout`, `/api/admin/match-sagas`, `/api/admin/match-sagas/[id]/retry`, `/api/admin/match-sagas/[id]/steps`, `/api/admin/matches/[id]/cancel`, `/api/admin/matches/[id]/reopen`, `/api/admin/matches/[id]`, `/api/admin/matches`, `/api/admin/saisons/[id]`, `/api/admin/saisons`, `/api/admin/stats`, `/api/admin/teams/[id]/branding`, `/api/admin/teams/[id]`, `/api/admin/teams/import`, `/api/admin/teams`, `/api/health`, `/api/invite/[token]`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

**Saga d'annulation de match (TASK-P0-003)** : `POST /api/admin/matches/[id]/cancel` bascule `matches.status -> CANCELLED` de façon inconditionnelle puis déclenche une saga de compensation (`src/lib/matchSaga.ts`) — appelle en HTTP `ticketing` (fermeture de vente + remboursement des billets déjà payés) et `club-hub` (annulation des convocations), chaque étape journalisée dans `match_saga_cases`/`match_saga_steps` (append-only). Un échec d'étape ne remet jamais en cause l'annulation elle-même (déjà actée) ; le dossier passe `MANUAL_REVIEW`, consultable via `GET /api/admin/match-sagas?status=MANUAL_REVIEW` et rejouable via `POST /api/admin/match-sagas/[id]/retry` (ne rejoue que les étapes en échec).

## Authentification et autorisations

Toutes les routes `/api/admin/*` exigent une session SSO. `PLATFORM_SUPERADMIN` a un accès global, `FEDERATION_ADMIN` et `LEAGUE_ADMIN` sont filtrés côté serveur, et `REFEREE_OBSERVER` n'accède qu'aux évaluations des matchs où il possède une affectation active. Les outils de modération ArbiNote restent réservés à la plateforme tant qu'aucune permission fine n'est persistée dans le SSO.

## Données possédées

Base partagée `foot`: référentiels, équipes/branding, matchs, arbitres, motifs, comptes/invitations staff et journal d'audit. Le domaine privé possède `referee_official_evaluations` et `official_referee_criteria`; les votes publics restent dans `votes`.

**Migrations réellement présentes :** Dump arbitres et migrations partagées (audit, votes, équipes, tournois); temps réels de match, invitations staff, branding et icônes, activation des fédérations/ligues, unicité des votes; `mysql/migration_add_match_saga.sql` (TASK-P0-003, `match_saga_cases`/`match_saga_steps`), `mysql/migration_extend_referee_profiles.sql` et `mysql/migration_add_official_referee_assessments.sql`.

## Intégrations

SSO; SMTP pour invitations; notifications; MariaDB partagée par les applications métier; match-operations (réouverture de feuille, HTTP authentifié) ; ticketing et club-hub (saga d'annulation de match, TASK-P0-003 — `TICKETING_URL`/`CLUB_HUB_URL` + clés de service).

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_LOGGING`, `SSO_URL`, `NEXT_PUBLIC_SSO_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3002 via `PORT=3002` dans `../start.sh`; sinon défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `arbinote`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Import CSV et uploads exigent validation/sauvegarde opérationnelle. Le secret SSO symétrique est partagé. Les migrations sont des scripts SQL manuels, sans runner/versionnement central.
