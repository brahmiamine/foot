# match-operations

## Rôle du projet

Kiosque de feuille de match électronique, de la préparation à la clôture.

## Fonctionnalités publiques

La page racine permet de sélectionner un match. Les écrans métier de pré-match, officiels/contrôles, direct (buts, cartons, blessures, remplacements), post-match et consultation live sont protégés par SSO puis par le périmètre du match.

**Pages inventoriées :** `/[matchId]/controls`, `/[matchId]/live`, `/[matchId]/officials`, `/[matchId]`, `/[matchId]/post-match`, `/[matchId]/pre-match`, `/`

## Fonctionnalités administratives

Aucun back-office séparé: les écrans opérationnels modifient directement la feuille via les services serveur, sous les gardes d'identité, de périmètre et d'état du match.

## API

`/api/health`, `/api/logout` et routes internes service-à-service sous `/api/internal/*`.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

`src/middleware.ts` protège les routes métier. Deux populations sont admises :

- comptes club possédant un `teamId` ;
- officiels `REFEREE`, `MATCH_OFFICIAL` ou `REFEREE_OBSERVER`.

Le middleware vérifie la session SSO et transmet l'identité vérifiée aux Server Components via les en-têtes internes `x-sso-*`. La vérification fine est ensuite effectuée dans `src/app/[matchId]/layout.tsx` : un compte club doit être l'une des deux équipes du match et un officiel doit posséder une affectation `ACTIVE` réelle sur ce match. Un rôle arbitre dans le JWT ne suffit donc jamais à ouvrir une feuille arbitraire.

`PLATFORM_SUPERADMIN`, `FEDERATION_ADMIN` et `LEAGUE_ADMIN` n'accèdent pas directement aux écrans de feuille : leurs opérations passent par `federation-hub` et, lorsque nécessaire, par les routes `/api/internal/*` authentifiées service-à-service.

Les signatures terrain restent une preuve métier distincte de l'authentification SSO ; elles ne remplacent pas l'identité technique de l'appelant.

## Données possédées

Base `foot`: feuilles, compositions, officiels, contrôles, réserves, signatures et événements de match (buts, cartons, blessures, remplacements).

**Migrations réellement présentes :** Initialisation match-operations; officiels/contrôles; contrainte unique des cartons; version optimiste des feuilles; intégrité des signatures; clé d'idempotence des événements live (TASK-P0-025, `sql/migration_add_event_client_request_id.sql`) dans `sql/`.

## Intégrations

MariaDB partagée avec matchs/joueurs; SSO `identity`; client notifications pour certains événements; ports typés vers les domaines Club, Fédération et Arbitre pour la composition, l'éligibilité réglementaire et la disponibilité des officiels.

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

Le script racine `../start.sh` lance le noyau local de la plateforme avec MariaDB partagée. Les services complémentaires comme `payments`, `notifications` et `marketplace` se lancent séparément selon le scénario testé.

## Tests

`pnpm test`, `pnpm test:i18n`.

## Limites connues

La PWA ne fournit pas encore une synchronisation robuste de toutes les écritures hors ligne. Les mutations métier passent principalement par actions serveur/services ; les intégrations inter-domaines utilisent progressivement des routes internes typées à la place des accès directs aux tables des autres domaines.

**Blocage de la saisie sur un match annulé (TASK-P0-003)** : `services/sheetGuard.ts#assertSheetEditable`, appelé par les services de saisie live (`GoalService`/`InjuryService`/`SubstitutionService`/`CardEventService`), vérifie également `Match.status !== 'CANCELLED'` (`MatchCancelledError`).

## Éligibilité réglementaire

Avant la transition serveur vers `PRE_MATCH_SIGNED`, `EligibilityService` contrôle chaque joueur de la composition. Une licence, une inscription, un contrat requis, une affiliation, un engagement club, une aptitude médicale requise, l'âge, les suspensions et les transferts sont vérifiés ; tout motif bloquant refuse la signature et est audité.

### Finalisation migration-v2

La transition historique utilise désormais `regulatory_legacy_confirmations` : une confirmation `LEGACY_BACKFILL` bornée à la saison peut remplacer temporairement les nouvelles pièces administratives absentes, mais ne neutralise jamais une suspension, un transfert, l'appartenance au club ni les règles d'âge. Chaque usage apparaît dans les warnings du contrôle d'éligibilité.

`ms_match_staff_assignments` porte le staff officiel déclaré pour un match. Lorsqu'une saison définit `minimum_head_coach_qualification`, `StaffEligibilityService` exige un `HEAD_COACH` pour chaque équipe et vérifie une qualification CAF fédérale `VALID`, non expirée et de niveau suffisant avant `PRE_MATCH_SIGNED`. Les affectations sont exposées par `/api/internal/match-staff` avec authentification service-à-service ; le club ne peut agir que sur son propre `teamId` via `club-hub`.

Une suspension créée depuis une décision disciplinaire fédérale utilise la table `Suspension` historique avec la provenance `DISCIPLINARY_DECISION`; elle est donc consommée automatiquement par le même contrôle d'éligibilité qu'une suspension issue d'un carton.
