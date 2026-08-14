# club-hub

## Rôle du projet

Back-office multi-clubs couvrant sport, contenus, commerce et organisation.

## Fonctionnalités publiques

Formulaires contact/sponsor/inscription/recrutement par équipe; boutique, commandes et retour paiement.

**Pages inventoriées :** `/admin/academy/applications`, `/admin/academy/info`, `/admin/academy`, `/admin/announcements`, `/admin/audit`, `/admin/ticketing/categories`, `/admin/ticketing/matches/[matchId]`, `/admin/ticketing/matches`, `/admin/cards/create`, `/admin/cards`, `/admin/club/figures`, `/admin/club/history`, `/admin/club/honors`, `/admin/club`, `/admin/club-settings/contact`, `/admin/club-settings/messages`, `/admin/club-settings`, `/admin/convocations`, `/admin/exports`, `/admin/fines/create`, `/admin/fines`, `/admin/friendly-matches/[id]/lineup`, `/admin/friendly-matches`, `/admin/injuries`, `/admin/marketplace/products`, `/admin/matches/[id]/lineup`, `/admin/matches`, `/admin/media/galleries`, `/admin/media/items`, `/admin/news/[id]/edit`, `/admin/news/create`, `/admin/news`, `/admin/notes/create`, `/admin/notes`, `/admin/notifications`, `/admin`, `/admin/player-stats`, `/admin/players/[id]/edit`, `/admin/players/create`, `/admin/players`, `/admin/recruitment/applications`, `/admin/recruitment`, `/admin/roles`, `/admin/settings/card-reasons`, `/admin/settings`, `/admin/shop/categories`, `/admin/shop/orders`, `/admin/shop/products`, `/admin/sponsors`, `/admin/stadiums`, `/admin/staff/[id]/edit`, `/admin/staff/create`, `/admin/staff`, `/admin/stats`, `/admin/suspensions`, `/admin/tactics/[id]`, `/admin/tactics/new`, `/admin/tactics`, `/admin/team-members`, `/admin/trainings`, `/admin/trips`, `/admin/users`, `/boutique/[teamId]`, `/boutique/commandes`, `/boutique`, `/boutique/retour`, `/contact/[teamId]`, `/devenir-sponsor/[teamId]`, `/inscription/[teamId]`, `/`, `/recrutement/[teamId]`

## Fonctionnalités administratives

Académie (infos/candidatures), annonces, ticketing (catégories et matchs), club (histoire, chiffres, palmarès, contact/messages), convocations, exports CSV/PDF, discipline (cartons, suspensions, amendes, notes), matchs et compositions dont amicaux, blessures, marketplace, médias/galeries/actualités, recrutement, boutique, tactiques, entraînements/invitations et déplacements/participants/véhicules; aussi joueurs/stats, staff, sponsors, stades, rôles, utilisateurs, notifications, audit et réglages.

### Dossier fédéral (migration-v2 P0-001)

`/admin/federation/compliance` permet au club connecté de créer son dossier de
licence pour une saison, joindre une version de chaque pièce obligatoire,
soumettre le dossier et suivre les observations et décisions. Toutes les APIs
relisent le `teamId` depuis la session SSO : aucun identifiant de club fourni
par le navigateur n'est utilisé comme scope d'autorisation.

## API

`/api/admin/media-items`, `/api/exports/cards`, `/api/exports/fines`, `/api/exports/players`, `/api/exports/sponsor-contract/[id]`, `/api/exports/suspensions`, `/api/health`, `/api/internal/matches/[matchId]/cancel-convocations` (service-à-service, TASK-P0-003), `/api/internal/outbox/process`, `/api/internal/outbox/status`, `/api/logout`, `/api/payments/webhook`, `/api/stadiums/[id]`, `/api/stadiums`, `/api/teams`, `/api/upload/application-document`, `/api/upload/media/chunked/complete`, `/api/upload/media/chunked/init`, `/api/upload/media/chunked`, `/api/upload/media`, `/api/upload/news`, `/api/upload/players`, `/api/upload/product`, `/api/upload`, `/api/upload/sponsor-logo`, `/api/upload/stadium`, `/api/upload/staff`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

**Annulation de match (TASK-P0-003)** : `POST /api/internal/matches/[matchId]/cancel-convocations`, appelée par federation-hub juste après avoir marqué le match `CANCELLED` — annule (soft, `Convocation.cancelledAt`/`cancelledReason`, jamais de suppression) toutes les convocations officielles de ce match, tous clubs confondus. Service-à-service (`x-api-key`, `CLUB_HUB_SERVICE_API_KEY`, voir `src/lib/serviceAuth.ts`, même garde que `/api/internal/outbox/*`). Idempotente ; `updateResponse` refuse toute nouvelle réponse sur une convocation annulée. Un scheduler périodique (`instrumentation.ts`, 10 min) rattrape tout match `CANCELLED` dont des convocations resteraient actives (appel federation-hub perdu ou jamais tenté), en lisant `matches.status` directement.

## Authentification et autorisations

Session SSO staff; contexte `teamId` calculé côté serveur et permissions/rôles contrôlés par `access`/`permissions`. Les pages/actions doivent conserver ce filtrage et ne jamais faire confiance à un teamId client. Webhook paiement signé.

## Données possédées

Base `foot`: possède les données club listées par les entités (effectif, discipline, CMS, académie/recrutement, boutique, ticketing de configuration, tactiques, entraînements, voyages, RBAC/audit); référence les référentiels plateforme.

**Migrations réellement présentes :** Scripts réels pour CMS, joueurs, blessures, compositions, stats, rôles/planification/formations, boutique/sponsors/notifications, tactiques, entraînements, déplacements, académie et ticketing; exemples/seeds séparés et non migrations.

## Intégrations

SSO/profil; notifications; payments pour boutique; marketplace pour publication; SMTP; stockage local des uploads.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_LOGGING`, `SSO_URL`, `NEXT_PUBLIC_SSO_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `MARKETPLACE_API_URL`, `MARKETPLACE_API_KEY`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3003 via `PORT=3003` dans `../start.sh`; sinon défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `arbinote`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Très large monolithe et schéma SQL appliqué manuellement. Uploads locaux/chunkés sans stockage objet ni antivirus. Certaines intégrations sont optionnelles selon variables; marketplace local et API peuvent coexister. Les PWA n'assurent pas la synchro CRUD hors ligne.

**Remboursement automatique (TASK-P0-002)** : un paiement confirmé après restockage (`PAID_STOCK_UNAVAILABLE`) ouvre automatiquement un dossier de remboursement auprès de payments (voir `src/lib/stockUnavailableRefunds.ts`) au lieu de se limiter à un log pour traitement manuel. Même limite que ticketing : le remboursement lui-même n'est automatisé que pour Flouci ; Konnect/Paymee passent par `MANUAL_REVIEW` côté payments, suivi jusqu'à résolution par le scheduler périodique (`instrumentation.ts`, alerte ops après 24h sans résolution).
