# notification-api

## Rôle du projet

API NestJS centralisant notifications in-app, email et Web Push, préférences, templates et livraison asynchrone.

## Fonctionnalités publiques

`GET /health`. Sous `/api`: notifications (liste, unread, compteur, détail, lecture/suppression), préférences/locale et abonnements push.

**Pages inventoriées :** Aucune page (service HTTP uniquement).

## Fonctionnalités administratives

API sans pages. `/admin/templates` lit/met à jour les templates; `/admin/stats` agrège; `/admin/audit/notifications/:id/deliveries` détaille les livraisons. `/internal/notifications` accepte les émissions interservices.

## API

Contrôleurs: health; `/api/notifications`, `/api/preferences`, `/api/push-subscriptions`; émission `/internal/notifications`; administration templates/stats et audit des livraisons.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Les routes `/api/*` sont protégées globalement par `JwtAuthGuard` et le JWT SSO. Les contrôleurs admin ajoutent `RolesGuard`; l'interne utilise `ServiceAuthGuard` et `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`, TASK-P0-003). La santé reste publique. Les clés restent uniquement serveur.

## Données possédées

Base dédiée: notifications, événements/idempotence, livraisons, préférences, locale, abonnements push et templates. Accès lecture seule à `foot` via `DIRECTORY_DB_*` pour résoudre clubs/rôles/destinataires.

**Migrations réellement présentes :** Aucun dossier SQL/migration; les entités TypeORM ne constituent pas une migration reproductible.

## Intégrations

Redis/BullMQ; SMTP/Resend/SendGrid selon configuration; Web Push/FCM; annuaire MariaDB partagé en lecture; SSO JWT.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `NODE_ENV`, `PORT`, `SSO_JWT_SECRET`, `SSO_JWT_ISSUER`, `SSO_COOKIE_NAME`, `SSO_URL`, `SERVICE_API_KEYS`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DIRECTORY_DB_HOST`, `DIRECTORY_DB_PORT`, `DIRECTORY_DB_USERNAME`, `DIRECTORY_DB_PASSWORD`, `DIRECTORY_DB_DATABASE`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `RESEND_API_KEY`, `SENDGRID_API_KEY`, `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_CONTACT_EMAIL`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `NOTIFICATION_RETENTION_DAYS`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3010 par défaut dans `src/main.ts` et `.env.example`.

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:e2e`, `pnpm test:cov`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Canal SMS non implémenté malgré l'abstraction. La garantie dépend de Redis/workers/providers et de leur supervision. Aucune migration SQL présente; rétention pilotée par tâche/configuration. CORS/observabilité de production à configurer.
