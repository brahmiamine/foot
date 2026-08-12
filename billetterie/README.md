# billetterie

## Rôle du projet

Billetterie web générique multi-clubs: réservation, paiement, émission et contrôle des billets.

## Fonctionnalités publiques

Liste des matchs, détail et catégories; achat membre; retour de paiement; espace « mes billets » avec QR.

**Pages inventoriées :** `/admin/audience-mismatch`, `/admin/scan`, `/match/[id]`, `/mes-billets`, `/`, `/paiement/retour`

## Fonctionnalités administratives

Scanner `/admin/scan`: téléchargement du manifeste hors ligne, validation en ligne ou locale et resynchronisation du journal de scan (`TicketScanLog`). Le rapprochement `/admin/audience-mismatch` liste les déclarations HOME/AWAY incohérentes et permet leur traitement. La configuration catégories/règles reste dans teamManager.

## API

`/api/admin/tickets/audience-mismatch/[id]` (traiter un écart), `/api/admin/tickets/audience-mismatch`, `/api/admin/tickets/offline-manifest` (manifeste des QR admis), `/api/admin/tickets/scan` (contrôle et ingestion du journal hors ligne), `/api/cron/purge-pending-reservations` (libération des réservations `PENDING` expirées), `/api/health`, `/api/payments/webhook` (confirmation asynchrone signée), `/api/tickets`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Consultation publique; achat et billets exigent un membre SSO. Les routes admin utilisent le garde admin SSO. Le cron exige `CRON_SECRET`; le webhook vérifie `PAYMENT_WEBHOOK_SECRET`; les QR sont signés par `TICKET_QR_SECRET`.

## Données possédées

Base `foot`: possède `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules`, `tk_tickets` et `tk_ticket_scan_logs`; référence les matchs/équipes partagés.

**Migrations réellement présentes :** `sql/schema.sql`; ajout de la déclaration d'audience, de l'identifiant payment-api et du journal de scan.

## Intégrations

SSO (session/profil), payment-api (création et lecture du paiement). Le webhook confirme le billet et la page mes billets rattrape également l'état.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_URL`, `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `TICKET_QR_SECRET`, `CRON_SECRET`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

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

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

`allowedAudience` repose encore sur une déclaration de l'acheteur: aucune preuve d'affiliation HOME/AWAY. Le mode hors ligne exporte un manifeste et journalise localement, mais la convergence dépend d'un retour réseau et les scans concurrents peuvent nécessiter un rapprochement. Pas de remboursement automatique.
