# payment-api

API NestJS dédiée aux paiements, destinée à être intégrée/consommée par les autres projets du dépôt (ex. `ob`). Le frontend ne parle jamais directement à un provider de paiement : il appelle cette API, qui seule détient les credentials.

Providers supportés : **Konnect Network**, **Paymee** et **Flouci** (Tunisie).

## Architecture

```
src/
├── config/                          # config globale (env validation, DB)
└── payment/
    ├── entities/payment.entity.ts   # paiement interne, provider-agnostic
    ├── enums/                       # PaymentStatus, PaymentProviderName
    ├── dto/                         # DTOs de l'API applicative
    ├── interfaces/                  # contrat minimal d'un provider
    ├── payment.service.ts           # orchestration applicative (DB + provider)
    ├── payment.controller.ts        # GET /payments/:id (lecture, agnostique)
    ├── payment.module.ts
    └── providers/
        ├── konnect/                 # tout ce qui est spécifique à Konnect
        │   ├── konnect.client.ts       # seul point d'appel HTTP vers Konnect
        │   ├── konnect.provider.ts     # façade utilisée par PaymentService
        │   ├── konnect.mapper.ts       # conversion montant + mapping statuts
        │   ├── konnect.types.ts        # types des requêtes/réponses Konnect
        │   ├── konnect.exceptions.ts   # erreurs propres + mapping HTTP
        │   ├── konnect.config.ts       # namespace de config Konnect
        │   ├── konnect.controller.ts   # POST init + GET webhook
        │   └── konnect.module.ts
        ├── paymee/                  # tout ce qui est spécifique à Paymee
        │   ├── paymee.client.ts        # seul point d'appel HTTP vers Paymee
        │   ├── paymee.provider.ts      # façade utilisée par PaymentService
        │   ├── paymee.mapper.ts        # conversion montant + mapping payload/statuts
        │   ├── paymee.checksum.ts      # calcul/vérification du check_sum (MD5), isolé et testable
        │   ├── paymee.types.ts         # types des requêtes/réponses Paymee
        │   ├── paymee.exceptions.ts    # erreurs propres + mapping HTTP
        │   ├── paymee.config.ts        # namespace de config Paymee
        │   ├── paymee.controller.ts    # POST init + POST webhook
        │   ├── paymee.module.ts
        │   └── dto/                    # DTOs propres à Paymee (init, résultat, webhook)
        └── flouci/                  # tout ce qui est spécifique à Flouci
            ├── flouci.client.ts        # seul point d'appel HTTP vers Flouci
            ├── flouci.provider.ts      # façade utilisée par PaymentService
            ├── flouci.mapper.ts        # conversion montant (millimes) + mapping statuts
            ├── flouci.types.ts         # types des requêtes/réponses Flouci
            ├── flouci.exceptions.ts    # erreurs propres + mapping HTTP
            ├── flouci.config.ts        # namespace de config Flouci
            ├── flouci.controller.ts    # POST init + POST webhook
            ├── flouci.module.ts
            └── dto/                    # DTO propre à Flouci (webhook)
```

Toute la communication HTTP avec un provider passe exclusivement par son `*.client.ts`. Aucun autre fichier n'appelle Konnect, Paymee ou Flouci directement. Un futur provider supplémentaire s'ajouterait de la même façon sous `payment/providers/<provider>/`, sans toucher au code des providers existants.

## Configuration

Copier `.env.example` vers `.env` et renseigner les valeurs. Toute la configuration passe par `ConfigModule`/`ConfigService` — rien n'est en dur dans le code, et le démarrage échoue explicitement si une variable requise manque (`src/config/env.validation.ts`).

| Variable | Description |
|---|---|
| `KONNECT_BASE_URL` | `https://api.sandbox.konnect.network/api/v2` (sandbox) ou `https://api.konnect.network/api/v2` (production) |
| `KONNECT_API_KEY` | Clé API Konnect. **Jamais** exposée au frontend, jamais loggée, jamais committée. |
| `KONNECT_WALLET_ID` | Wallet Konnect receveur des paiements (`receiverWalletId`). |
| `KONNECT_WEBHOOK_URL` | URL HTTPS publique de `GET /payments/konnect/webhook`. |
| `PAYMEE_BASE_URL` | `https://sandbox.paymee.tn/api/v2` (sandbox) ou `https://app.paymee.tn/api/v2` (production) |
| `PAYMEE_API_KEY` | Clé API Paymee (`Authorization: Token <clé>`). **Jamais** exposée au frontend, jamais loggée, jamais committée. |
| `PAYMEE_WEBHOOK_URL` | URL HTTPS publique de `POST /payments/providers/paymee/webhook`. |
| `PAYMEE_RETURN_URL` | URL de retour du payeur après un paiement réussi (mode avec redirection). |
| `PAYMEE_CANCEL_URL` | URL de retour du payeur après annulation (mode avec redirection). |
| `FLOUCI_BASE_URL` | `https://developers.flouci.com` (Sandbox **et** Production ; seuls les credentials changent). |
| `FLOUCI_PUBLIC_KEY` | Clé publique Flouci. |
| `FLOUCI_PRIVATE_KEY` | Clé privée Flouci (`Authorization: Bearer <PUBLIC_KEY>:<PRIVATE_KEY>`). **Jamais** exposée au frontend, jamais loggée, jamais committée. |
| `FLOUCI_WEBHOOK_URL` | URL HTTPS publique de `POST /payments/providers/flouci/webhook`. |
| `FLOUCI_SUCCESS_URL` | URL de retour du payeur après un paiement réussi. |
| `FLOUCI_FAIL_URL` | URL de retour du payeur après un paiement échoué/annulé. |
| `SERVICE_API_KEYS` | JSON `{ "application": "clé" }` — une clé par application backend interne (`ob`, `teamManager`, `sellerPortal`, `marketplace-api`, …) autorisée à appeler `POST /payments/*/init` et `GET /payments/:id`. |
| `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY` | Optionnelles — voir ../notification-api. Si absentes, un paiement confirmé ne notifie simplement pas le payeur (aucune erreur). |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Base MySQL/MariaDB où sont stockés les paiements internes. |

## Endpoints

### Konnect

- `POST /payments/konnect/init` — initialise un paiement Konnect, retourne `{ paymentId, payUrl, providerRef }`. Le frontend redirige l'utilisateur vers `payUrl`.
- `GET /payments/konnect/webhook?payment_ref=...` — reçu par Konnect à chaque changement de statut. Récupère le statut réel via `GET /payments/:paymentId` chez Konnect avant toute mise à jour ; idempotent (un même `payment_ref` reçu plusieurs fois ne déclenche l'opération métier "paiement payé" qu'une seule fois).

### Paymee

- `POST /payments/providers/paymee/init` — initialise un paiement Paymee (`POST /payments/create` côté Paymee), retourne `{ paymentId, token, payUrl }`. `payUrl` n'est présent qu'en mode `redirect` (le frontend fait `window.location = payUrl`) ; `token` est toujours présent et sert à charger la gateway Paymee dans un `iframe` en mode `iframe` (voir l'évènement JS `paymee.complete` documenté par Paymee — cet évènement ne doit jamais être traité comme une preuve de paiement côté frontend).
- `POST /payments/providers/paymee/webhook` — reçu par Paymee à chaque notification de paiement. Le `check_sum` (`MD5(token + payment_status + PAYMEE_API_KEY)`) est vérifié **avant** toute recherche du paiement interne ; le montant et l'`order_id` sont ensuite vérifiés par rapport à l'enregistrement interne avant d'accepter `payment_status=true` comme `PAID` (`payment_status=false` → `FAILED`). Idempotent comme Konnect.

### Flouci

- `POST /payments/providers/flouci/init` — initialise un paiement Flouci (`POST /api/v2/generate_payment` côté Flouci), retourne `{ paymentId, payUrl, providerRef }`. `developer_tracking_id` envoyé à Flouci est notre `payment.id` interne (pas l'`orderId`), puisque Flouci ne valide pas ce champ et se contente de l'échoïser. Le frontend redirige l'utilisateur vers `payUrl` (`link` Flouci).
- `POST /payments/providers/flouci/webhook` — reçu par Flouci comme simple signal « vérifier maintenant ». Le webhook n'est jamais la source de vérité : il déclenche systématiquement `GET /api/v2/verify_payment/{payment_id}` chez Flouci, dont la réponse doit satisfaire **à la fois** `success === true` **et** `result.status === 'SUCCESS'` avant qu'un paiement soit considéré comme `PAID` (`PENDING`/`EXPIRED`/`FAILURE` mappés respectivement vers `PENDING`/`EXPIRED`/`FAILED`). Le montant et le `developer_tracking_id` retournés sont comparés à l'enregistrement interne avant toute confirmation. Idempotent : un paiement déjà `PAID` court-circuite avant tout nouvel appel `verify_payment`, conformément à la recommandation Flouci d'éviter les vérifications répétées.

### Commun

- `GET /payments/:id` — consultation d'un paiement interne (provider-agnostique).

Les trois DTOs `init` acceptent un champ optionnel `userId` (le `User.id` de la base partagée `foot`, si l'application appelante en a un — un checkout invité peut l'omettre). Quand il est fourni, le paiement confirmé (`payment.paid`, voir `src/notifications/payment-notifications.listener.ts`) déclenche une notification `PAYMENT_SUCCEEDED` au payeur via notification-api (`NOTIFICATION_API_URL`/`NOTIFICATION_API_KEY`, optionnelles). Sans `userId`, ou si notification-api n'est pas configuré, aucune notification n'est envoyée — le paiement lui-même n'est jamais impacté par un échec de notification.

Les trois endpoints `init` ainsi que `GET /payments/:id` sont réservés aux applications backend de l'écosystème : ils exigent un header `x-api-key` valide (voir § Sécurité). Les endpoints `webhook`, appelés directement par Konnect/Paymee/Flouci, restent publics — ils sont authentifiés autrement (re-vérification serveur-à-serveur / checksum).

## Sécurité

- **Authentification service-à-service** : `POST /payments/{konnect,providers/paymee,providers/flouci}/init` et `GET /payments/:id` sont protégés par `ServiceAuthGuard` (`src/auth/guards/service-auth.guard.ts`), qui exige un header `x-api-key` valide contre le registre `SERVICE_API_KEYS`. Un client qui ne connaît pas cette clé ne peut ni déclencher un paiement, ni lire l'état d'un paiement existant. Les webhooks providers ne portent jamais cette clé (Konnect/Paymee/Flouci ne la connaissent pas) et restent donc publics, protégés par leur propre mécanisme de vérification.
- **Rate limiting** : `ThrottlerModule` limite globalement chaque IP (120 requêtes/minute par défaut, `src/app.module.ts`), en défense en profondeur sur les routes publiques (webhooks) comme protégées.
- `KONNECT_API_KEY` / `PAYMEE_API_KEY` / `FLOUCI_PRIVATE_KEY` ne quittent jamais le backend : ni retournées dans une réponse HTTP, ni écrites dans un log (les clients HTTP construisent leurs erreurs sans jamais sérialiser la config/les headers de la requête).
- Le webhook ne suffit jamais à valider un paiement :
  - Konnect : le statut est systématiquement revérifié auprès de Konnect (`GET /payments/:paymentId`), et le montant/devise/orderId sont comparés à l'enregistrement interne avant d'accepter un paiement comme `PAID`.
  - Paymee : le `check_sum` est recalculé et comparé en temps constant avant toute confiance dans le payload, puis le montant/`order_id` sont comparés à l'enregistrement interne. `return_url`/`cancel_url` et l'évènement frontend `paymee.complete` ne sont jamais considérés comme une preuve de paiement — seul le webhook vérifié fait foi.
  - Flouci : le webhook ne fait que déclencher `verify_payment` ; `success_link` seul n'est jamais suffisant pour marquer un paiement `PAID` — c'est toujours `verify_payment` qui fait foi, avec vérification du montant et du `developer_tracking_id`.
- Retries contrôlés et bornés sur les trois providers : pas de retry sur 401/404, backoff sur 429 (respecte `Retry-After` si présent) et sur 5xx/timeout/erreur réseau, avec un nombre maximum de tentatives. Pour Flouci en particulier, `verify_payment` n'est jamais appelé en boucle : le webhook idempotent court-circuite avant tout nouvel appel une fois le paiement `PAID`.
- `helmet()` est activé globalement, et toutes les entrées (DTOs, query/webhook) sont validées via `class-validator`.

## Développement

```bash
npm install
npm run start:dev
```

## Tests

```bash
npm test
```

Les tests unitaires mockent intégralement les appels HTTP vers Konnect, Paymee et Flouci (aucune dépendance aux sandbox réels) et couvrent notamment :

- **Konnect** : initialisation réussie, conversion TND → millimes, erreurs 401/404/429/5xx, timeout/erreur réseau, récupération du détail d'un paiement, traitement d'un webhook valide, webhook sur paiement inexistant, webhook reçu plusieurs fois (idempotence), statuts `completed`/`pending`, et la vérification montant/devise.
- **Paymee** : initialisation réussie (mapping token/payment_url/order_id), montants (`1.00`, `10.50`, `220.25`, `999.99`) sans erreur de précision flottante, erreurs `status: false`/401/429/5xx/timeout/erreur réseau, calcul du `check_sum` pour un paiement réussi/échoué, checksum invalide ou signé avec la mauvaise clé API, webhook réussi/échoué, montant/`order_id` incorrect, token inconnu, webhook dupliqué, paiement déjà `PAID`, payload incomplet, et les deux modes d'intégration (avec/sans redirection).
- **Flouci** : initialisation réussie (mapping payment_id/link/developer_tracking_id), conversion TND → millimes, erreurs d'authentification/HTTP/timeout/réseau, `result.success: false`, vérification des statuts `SUCCESS`/`PENDING`/`EXPIRED`/`FAILURE`, rejet d'un `SUCCESS` dont `success !== true`, montant ou `developer_tracking_id` incorrect, webhook valide/dupliqué, paiement déjà `PAID` (sans nouvel appel `verify_payment`), payload incomplet, et absence de credentials (`FLOUCI_PUBLIC_KEY`/`FLOUCI_PRIVATE_KEY`) rejetée dès la validation d'environnement.
