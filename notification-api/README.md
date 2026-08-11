# notification-api

Centre de notifications centralisé (NestJS) pour l'écosystème `foot` : in-app, email, push et SMS (TunisieSMS). Les applications métier (`sso`, `teamManager`, `ob`, `matchsheet`, `arbinote`, `superadmin`, `payment-api`, et à terme `marketplace-api`/`seller-portal`) décident **quand** et **pourquoi** notifier ; le `notification-api` décide **comment** (canaux, préférences, langue, retry) et ne contient jamais de logique métier football/billetterie/marketplace.

```
Application métier -> Événement -> Notification API -> Préférences -> Template -> Queue -> Channel -> Provider -> Utilisateur
```

## Architecture

```
src/
├── auth/              # JWT sso (vérification uniquement) + clé de service (/internal/*)
├── notifications/     # entité Notification, API publique /api/notifications, résolution de cible broadcast
├── templates/         # gabarits multilingues (fr/ar/en) + rendu Handlebars
├── preferences/        # canaux par catégorie + langue préférée
├── deliveries/         # historique/audit d'envoi par canal (NotificationDelivery)
├── push-subscriptions/ # appareils enregistrés pour le push
├── channels/           # abstraction NotificationChannel : in-app / email / push / sms
│   ├── in-app/
│   ├── email/
│   ├── push/
│   └── sms/
├── providers/           # implémentations concrètes par canal
│   ├── email/            # SMTP (V1), Resend, SendGrid
│   ├── push/              # Web Push (V1), FCM (stub)
│   └── sms/                # TunisieSMS (SMS_PROVIDER=tunisiesms), sinon stub inactif
│       └── tunisiesms/      # client HTTP, mapper, codes d'erreur — isolé, ajout d'un 2e provider SMS sans y toucher
├── queue/               # BullMQ : queues email/push/sms, workers, retry+backoff
├── events/               # idempotence des événements externes (eventId)
├── internal/             # API service-à-service : POST /internal/notifications
├── admin/                # dashboard technique + administration des templates (SUPERADMIN)
├── audit/                # historique de livraison par notification (SUPERADMIN)
├── branding/             # branding club (nom/logo) pour les templates, sans dupliquer la config club
├── database/              # connexion secondaire lecture seule vers la base partagée `foot`
└── common/                 # enums, DTO, filtres partagés
```

Ajouter un canal (ex: WhatsApp) = une nouvelle classe sous `channels/` + `providers/`, sans toucher à `NotificationsService` ni au schéma `Notification`. Ajouter un nouveau `type` de notification (ex: `SPONSOR_ACCEPTED`) ne nécessite aucun changement de code : il suffit d'appeler `/internal/notifications` avec ce type et, optionnellement, de seeder un template.

## Principes clés

- **Identité SSO uniquement** (§4) : `AuthModule` ne fait que vérifier le JWT HS256 émis par `sso` (`SSO_JWT_SECRET`, issuer `foot-sso`) — jamais de système d'authentification parallèle.
- **Isolation par club** (§5) : chaque `Notification` est rattachée à un `userId` unique (jamais un groupe stocké tel quel) ; un broadcast (`target`) est expansé en une ligne par destinataire résolu, avec `teamId` pour l'audit.
- **`data` libre** (§6) : les métadonnées métier (`matchId`, `orderNumber`, `amount`, …) transitent dans une colonne JSON, jamais dans des colonnes dédiées.
- **Types de notification ouverts** (§7, §32) : `type`/`application` sont des chaînes libres, jamais interprétées avec du `if application === 'teamManager'`.
- **Idempotence** (§19) : `eventId` + `application` (unique en base) garantit qu'un webhook rejoué ne crée jamais deux fois les mêmes notifications.
- **Async par défaut** (§17, §18) : seul le canal in-app est synchrone (la ligne `notifications` EST la notification in-app) ; email/push/sms passent par BullMQ avec retry (5 tentatives, backoff exponentiel 30s→...).
- **Préférences vs obligatoire** (§11, §12) : les types listés dans `common/constants/mandatory-types.ts` (paiement, sécurité, ticket) ignorent totalement les préférences utilisateur.

## Cibles broadcast (§22)

`POST /internal/notifications` accepte soit `userId` (un destinataire), soit `target` :

| `target.type` | Résolution |
|---|---|
| `USER` | `target.userIds` fourni tel quel |
| `TEAM` | Tous les utilisateurs actifs du club (`target.teamId`), via la base partagée `foot` |
| `ROLE` | Tous les utilisateurs actifs d'un rôle (`target.role`), optionnellement scopé à un club |
| `MEMBERS` | Tous les comptes `MEMBER` (espace supporter), optionnellement scopé à un club |
| `CATEGORY` / `SELLER` | **Pré-résolus par l'application appelante** (`target.userIds`) : ce sont des notions propres à teamManager/marketplace-api que le notification-api ne connaît pas (§32) |

`TEAM`/`ROLE`/`MEMBERS` nécessitent `DIRECTORY_DB_HOST` (connexion lecture seule à la base partagée `foot`, table `User`) — sans cette variable, seules les cibles `USER` et `CATEGORY`/`SELLER` (déjà résolues) fonctionnent.

## Endpoints

### Publics (`/api/*`, JWT `sso`)

- `GET /api/notifications` — liste paginée (`page`, `limit`) des notifications de l'utilisateur courant.
- `GET /api/notifications/unread` — idem, non lues uniquement.
- `GET /api/notifications/unread-count` — compteur pour le badge 🔔.
- `GET /api/notifications/:id`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `GET /api/preferences` / `PATCH /api/preferences` — canaux activés par catégorie.
- `GET /api/preferences/locale` / `PATCH /api/preferences/locale` — langue préférée des notifications (fr/ar/en).
- `GET /api/push-subscriptions` / `POST /api/push-subscriptions` / `DELETE /api/push-subscriptions/:deviceId` — appareils Web Push/FCM.

### Interne (`/internal/*`, clé de service `x-api-key`)

- `POST /internal/notifications` — crée une notification (destinataire unique ou broadcast, voir ci-dessus). Idempotent via `eventId`.

### Admin (`/admin/*`, rôle `SUPERADMIN` via JWT `sso`)

- `GET /admin/stats` — volumes du jour, échecs, retries, non lues, ventilation par application/canal (§26).
- `GET /admin/templates` / `PUT /admin/templates/:type/:channel/:locale` — administration des gabarits (§14).
- `GET /admin/audit/notifications/:id/deliveries` — historique de livraison d'une notification (§25).

## Configuration

Copier `.env.example` vers `.env`. Toute la configuration passe par `ConfigModule`, validée au démarrage (`src/config/env.validation.ts`).

| Variable | Description |
|---|---|
| `SSO_JWT_SECRET` | Secret HS256 partagé avec `sso` (voir `sso/.env` → `SSO_JWT_SECRET`). **Jamais** une valeur différente. |
| `SERVICE_API_KEYS` | JSON `{ "application": "clé" }` — une clé par application backend appelant `/internal/*`. |
| `DB_*` | Base MariaDB propre au notification-api (`notification_api`). |
| `DIRECTORY_DB_*` | Connexion lecture seule optionnelle vers la base partagée `foot`, pour les cibles broadcast et le branding club. |
| `REDIS_*` | Connexion BullMQ (queues email/push/sms). |
| `EMAIL_PROVIDER` + `SMTP_*`/`RESEND_API_KEY`/`SENDGRID_API_KEY` | Fournisseur email actif (§15). |
| `WEB_PUSH_*` | Clés VAPID pour le Web Push (§16). |
| `SMS_PROVIDER=tunisiesms` + `TUNISIESMS_*` | Fournisseur SMS actif (voir § SMS ci-dessous). |
| `NOTIFICATION_RETENTION_DAYS` | Purge quotidienne des notifications expirées/anciennes (§24, §27). |

## SMS (TunisieSMS)

`src/providers/sms/tunisiesms/` intègre [TunisieSMS](https://www.tunisiesms.tn/api-sms/), isolé derrière `SmsProvider` (`src/providers/sms/sms-provider.interface.ts`) — un futur second provider SMS (ex: Twilio) s'ajouterait de la même façon sans toucher `SmsChannel` ni le reste de l'architecture. Activation : `SMS_PROVIDER=tunisiesms` + `TUNISIESMS_API_URL`/`TUNISIESMS_ID`/`TUNISIESMS_API_KEY`/`TUNISIESMS_SENDER` (fournis par le compte TunisieSMS — jamais inventés). Sans cette configuration, `NotImplementedSmsProvider` renvoie un échec structuré (`SMS_PROVIDER_NOT_CONFIGURED`).

- **Destinataire** : `notification.data.phone` (et optionnellement `data.smsSender` pour un expéditeur personnalisé autorisé sur le compte) — la table `User` de la base partagée `foot` n'a pas de colonne téléphone, donc l'application appelant `/internal/notifications` doit fournir ce numéro dans `data`.
- **Numéro** : normalisé vers `+216XXXXXXXX` pour les numéros tunisiens (local 8 chiffres ou `216XXXXXXXX`) ; un numéro déjà international avec un autre indicatif n'est jamais modifié — un format non reconnaissable est rejeté plutôt que deviné (`tunisiesms.phone.ts`).
- **Réponse** : `status_code=200` signifie **accepté par TunisieSMS**, pas livré — la delivery correspondante reste au statut `SENT` (jamais `DELIVERED` automatiquement, voir `SmsChannel.deliveryConfirmationRequired`) en attendant un futur accusé de réception (DLR, non implémenté ici, voir `SmsDeliveryResult`). Les codes `400/401/402/420/430/431/440/441/442` sont mappés vers des `errorCode` explicites (`tunisiesms.status-codes.ts`).
- **`message_id`** est conservé dans `NotificationDelivery.providerMessageId` pour l'audit et une future réconciliation DLR.
- **Retry** : aucun retry automatique côté provider (un timeout ne prouve pas l'absence d'envoi) ; le retry avec backoff de la queue (§18) s'applique au niveau job, pas au niveau HTTP TunisieSMS.

> **Format de requête non vérifié contre un compte réel** : cet environnement de développement n'a pas d'accès réseau sortant vers `tunisiesms.tn`, donc le corps de requête HTTP (`tunisiesms.client.ts`, POST JSON `{ id, api_key, destination, content, sender }`) suit les noms de champs donnés dans la spécification de la tâche sans avoir pu être confirmé contre la documentation officielle. Le parsing de réponse (XML/JSON), les codes d'erreur, la normalisation du numéro et l'encodage sont indépendants de ce point et ne sont pas concernés. Avant mise en production : vérifier la méthode HTTP exacte et le format de requête auprès du compte TunisieSMS — un seul fichier à ajuster si besoin.

## Développement

```bash
npm install
npm run start:dev
```

Nécessite MariaDB (base `notification_api`) et Redis en local. `DIRECTORY_DB_*` peut pointer vers la même instance MariaDB que le reste du dépôt (base `foot`, port `3307` par défaut avec `./start.sh` à la racine).

## Tests

```bash
npm test
```

## Sécurité (§27)

- `/internal/*` exige une clé de service par application (`x-api-key`), jamais le JWT utilisateur — une application ne représente pas un utilisateur.
- `/api/*` exige le JWT `sso` (header `Authorization: Bearer` ou cookie partagé) ; chaque requête est scopée à `req.user.id`, aucune notification d'un autre utilisateur n'est jamais accessible (404, pas 403, pour ne pas confirmer l'existence).
- `helmet()` actif globalement, `class-validator` sur tous les DTO (`whitelist`/`forbidNonWhitelisted`), rate limiting global (`@nestjs/throttler`, 120 req/min/IP par défaut).
- Aucun secret (mot de passe, clé API) n'est jamais inclus dans le corps d'une notification ni loggé.
