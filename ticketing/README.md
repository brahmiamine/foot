# ticketing

## Rôle du projet

Billetterie web générique multi-clubs: réservation, paiement, émission et contrôle des billets.

## Fonctionnalités publiques

Liste des matchs, détail et catégories; achat membre; retour de paiement; espace « mes billets » avec QR.

**Pages inventoriées :** `/admin/audience-mismatch`, `/admin/scan`, `/match/[id]`, `/mes-billets`, `/`, `/paiement/retour`

## Fonctionnalités administratives

Scanner `/admin/scan`: téléchargement du manifeste hors ligne, validation en ligne ou locale et resynchronisation batch du journal de scan (`TicketScanLog`) — deux terminaux qui scannent hors-ligne le même billet obtiennent un accepted et un conflict à la synchro (`POST /api/admin/tickets/sync-scans`, TASK-P0-008), grâce à une garde atomique (`UPDATE ... WHERE status = 'PAID'`) qui tranche même en cas de synchro quasi simultanée. Le rapprochement `/admin/audience-mismatch` liste les déclarations HOME/AWAY incohérentes et permet leur traitement. La configuration catégories/règles reste dans club-hub.

## API

`/api/admin/tickets/audience-mismatch/[id]` (traiter un écart), `/api/admin/tickets/audience-mismatch`, `/api/admin/tickets/offline-manifest` (manifeste des QR admis, exclut les billets révoqués), `/api/admin/tickets/scan` (contrôle en ligne, scan unitaire), `/api/admin/tickets/sync-scans` (synchro batch des scans accumulés hors-ligne par un terminal, distingue accepted[]/conflicts[] — TASK-P0-008), `/api/admin/tickets/[id]/revoke` (PATCH révoque un billet ciblé, DELETE annule la révocation — TASK-P0-009), `/api/cron/purge-pending-reservations` (libération des réservations `PENDING` expirées), `/api/cron/reconcile-stock-unavailable-refunds`, `/api/cron/reconcile-match-cancellation-refunds` (TASK-P0-003), `/api/health`, `/api/internal/matches/[matchId]/cancel-tickets` (service-à-service, TASK-P0-003 — voir ci-dessous), `/api/payments/webhook` (confirmation asynchrone signée), `/api/tickets`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Consultation publique; achat et billets exigent un membre SSO. Les routes admin utilisent le garde admin SSO. Le cron exige `CRON_SECRET`; le webhook vérifie `PAYMENT_WEBHOOK_SECRET`; les QR sont signés par `TICKET_QR_SECRET` (rotation optionnelle par `kid` via `TICKET_QR_KID`/`TICKET_QR_SECRET_<KID>`, voir `.env.example` — TASK-P0-009). Un billet peut être révoqué individuellement (`PATCH /api/admin/tickets/[id]/revoke`) sans attendre l'expiration du jeton (1 an, volontairement non lié à la date du match) ni annuler le paiement. `/api/internal/*` (TASK-P0-003) exige `TICKETING_SERVICE_API_KEY` (header `x-api-key`, voir `src/lib/serviceAuth.ts`) — service-à-service uniquement, jamais un navigateur ; première route de ce type dans cette app (les `/api/cron/*` préexistantes utilisent un secret distinct, `CRON_SECRET`).

**Annulation de match (TASK-P0-003)** : `POST /api/internal/matches/[matchId]/cancel-tickets`, appelée par federation-hub juste après avoir marqué le match `CANCELLED` — annule les billets `PENDING` et ouvre un dossier de remboursement (`MatchCancellationRefund`, même modèle que `StockUnavailableRefund`/TASK-P0-002, un seul remboursement par paiement) pour chaque paiement `PAID` sur ce match. Idempotente. Un scheduler périodique (`instrumentation.ts`, 10 min, comme le reste des reconciliations de ce fichier) rattrape tout match `CANCELLED` non entièrement traité (appel federation-hub perdu ou jamais tenté) en lisant directement `matches.status` — pas de dépendance stricte à l'appel HTTP entrant.

## Données possédées

Base `foot`: possède `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules`, `tk_tickets`, `tk_ticket_scan_logs`, `tk_stock_unavailable_refunds` (TASK-P0-002) et `tk_match_cancellation_refunds` (TASK-P0-003); référence les matchs/équipes partagés.

**Migrations réellement présentes :** `sql/schema.sql`; ajout de la déclaration d'audience, de l'identifiant payments, du journal de scan, de la révocation ciblée (`sql/migration_add_ticket_revocation.sql`), du dossier de remboursement stock indisponible (`sql/migration_add_stock_unavailable_refunds.sql`, TASK-P0-002) et du dossier de remboursement match annulé (`sql/migration_add_match_cancellation_refunds.sql`, TASK-P0-003).

## Intégrations

SSO (session/profil), payments (création et lecture du paiement). Le webhook confirme le billet et la page mes billets rattrape également l'état.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_URL`, `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `TICKET_QR_SECRET`, `CRON_SECRET`, `TICKETING_SERVICE_API_KEY`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3005 seulement lorsque lancé avec `PORT=3005` (script racine/documentation); `pnpm dev` ou `pnpm start` seuls utilisent le défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `referee-center`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

`allowedAudience` repose encore sur une déclaration de l'acheteur: aucune preuve d'affiliation HOME/AWAY. Le mode hors ligne exporte un manifeste et journalise localement, mais la convergence dépend d'un retour réseau et les scans concurrents peuvent nécessiter un rapprochement.

**Remboursement automatique (TASK-P0-002)** : un paiement confirmé après libération de la capacité (`PAID_STOCK_UNAVAILABLE`) ouvre automatiquement un dossier de remboursement auprès de payments (voir `src/lib/stockUnavailableRefunds.ts`) au lieu de se limiter à un log pour traitement manuel. Le remboursement lui-même n'est automatisé que pour Flouci (voir `payments/README.md` § Remboursements) ; Konnect/Paymee passent par `MANUAL_REVIEW` côté payments, suivi jusqu'à résolution par le scheduler périodique (`instrumentation.ts`, alerte ops après 24h sans résolution).

**Remboursement sur match annulé (TASK-P0-003)** : même mécanisme que ci-dessus (`src/lib/matchCancellationRefunds.ts`), déclenché par l'annulation d'un match plutôt que par une réconciliation de stock — mêmes limites côté payments (Flouci automatisé, Konnect/Paymee en `MANUAL_REVIEW`). Cette app n'appelle pas notifications (aucune intégration, contrairement à marketplace/ticketing n'ayant jamais eu ce besoin jusqu'ici) : l'acheteur est notifié du remboursement par payments lui-même (`Payment.userId`, sur `REFUND_SUCCEEDED`/`REFUND_FAILED`/`REFUND_MANUAL_REVIEW`, voir TASK-P0-001) — aucune notification dédiée « votre match est annulé » côté ticketing.
