# payment-api

API NestJS dédiée aux paiements, destinée à être intégrée/consommée par les autres projets du dépôt (ex. `ob`). Le frontend ne parle jamais directement à un provider de paiement : il appelle cette API, qui seule détient les credentials.

Providers supportés : **Konnect Network** et **Paymee** (Tunisie).

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
        └── paymee/                  # tout ce qui est spécifique à Paymee
            ├── paymee.client.ts        # seul point d'appel HTTP vers Paymee
            ├── paymee.provider.ts      # façade utilisée par PaymentService
            ├── paymee.mapper.ts        # conversion montant + mapping payload/statuts
            ├── paymee.checksum.ts      # calcul/vérification du check_sum (MD5), isolé et testable
            ├── paymee.types.ts         # types des requêtes/réponses Paymee
            ├── paymee.exceptions.ts    # erreurs propres + mapping HTTP
            ├── paymee.config.ts        # namespace de config Paymee
            ├── paymee.controller.ts    # POST init + POST webhook
            ├── paymee.module.ts
            └── dto/                    # DTOs propres à Paymee (init, résultat, webhook)
```

Toute la communication HTTP avec un provider passe exclusivement par son `*.client.ts`. Aucun autre fichier n'appelle Konnect ou Paymee directement. Un futur provider supplémentaire (ex. Flouci) s'ajouterait de la même façon sous `payment/providers/<provider>/`, sans toucher au code des providers existants.

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
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Base MySQL/MariaDB où sont stockés les paiements internes. |

## Endpoints

### Konnect

- `POST /payments/konnect/init` — initialise un paiement Konnect, retourne `{ paymentId, payUrl, providerRef }`. Le frontend redirige l'utilisateur vers `payUrl`.
- `GET /payments/konnect/webhook?payment_ref=...` — reçu par Konnect à chaque changement de statut. Récupère le statut réel via `GET /payments/:paymentId` chez Konnect avant toute mise à jour ; idempotent (un même `payment_ref` reçu plusieurs fois ne déclenche l'opération métier "paiement payé" qu'une seule fois).

### Paymee

- `POST /payments/providers/paymee/init` — initialise un paiement Paymee (`POST /payments/create` côté Paymee), retourne `{ paymentId, token, payUrl }`. `payUrl` n'est présent qu'en mode `redirect` (le frontend fait `window.location = payUrl`) ; `token` est toujours présent et sert à charger la gateway Paymee dans un `iframe` en mode `iframe` (voir l'évènement JS `paymee.complete` documenté par Paymee — cet évènement ne doit jamais être traité comme une preuve de paiement côté frontend).
- `POST /payments/providers/paymee/webhook` — reçu par Paymee à chaque notification de paiement. Le `check_sum` (`MD5(token + payment_status + PAYMEE_API_KEY)`) est vérifié **avant** toute recherche du paiement interne ; le montant et l'`order_id` sont ensuite vérifiés par rapport à l'enregistrement interne avant d'accepter `payment_status=true` comme `PAID` (`payment_status=false` → `FAILED`). Idempotent comme Konnect.

### Commun

- `GET /payments/:id` — consultation d'un paiement interne (provider-agnostique).

## Sécurité

- `KONNECT_API_KEY` / `PAYMEE_API_KEY` ne quittent jamais le backend : ni retournées dans une réponse HTTP, ni écrites dans un log (les clients HTTP construisent leurs erreurs sans jamais sérialiser la config/les headers de la requête).
- Le webhook ne suffit jamais à valider un paiement :
  - Konnect : le statut est systématiquement revérifié auprès de Konnect (`GET /payments/:paymentId`), et le montant/devise/orderId sont comparés à l'enregistrement interne avant d'accepter un paiement comme `PAID`.
  - Paymee : le `check_sum` est recalculé et comparé en temps constant avant toute confiance dans le payload, puis le montant/`order_id` sont comparés à l'enregistrement interne. `return_url`/`cancel_url` et l'évènement frontend `paymee.complete` ne sont jamais considérés comme une preuve de paiement — seul le webhook vérifié fait foi.
- Retries contrôlés et bornés sur les deux providers : pas de retry sur 401/404, backoff sur 429 (respecte `Retry-After` si présent) et sur 5xx/timeout/erreur réseau, avec un nombre maximum de tentatives.
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

Les tests unitaires mockent intégralement les appels HTTP vers Konnect et Paymee (aucune dépendance aux sandbox réels) et couvrent notamment :

- **Konnect** : initialisation réussie, conversion TND → millimes, erreurs 401/404/429/5xx, timeout/erreur réseau, récupération du détail d'un paiement, traitement d'un webhook valide, webhook sur paiement inexistant, webhook reçu plusieurs fois (idempotence), statuts `completed`/`pending`, et la vérification montant/devise.
- **Paymee** : initialisation réussie (mapping token/payment_url/order_id), montants (`1.00`, `10.50`, `220.25`, `999.99`) sans erreur de précision flottante, erreurs `status: false`/401/429/5xx/timeout/erreur réseau, calcul du `check_sum` pour un paiement réussi/échoué, checksum invalide ou signé avec la mauvaise clé API, webhook réussi/échoué, montant/`order_id` incorrect, token inconnu, webhook dupliqué, paiement déjà `PAID`, payload incomplet, et les deux modes d'intégration (avec/sans redirection).
