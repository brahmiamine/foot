# payment-api

API NestJS dédiée aux paiements, destinée à être intégrée/consommée par les autres projets du dépôt (ex. `ob`). Le frontend ne parle jamais directement à un provider de paiement : il appelle cette API, qui seule détient les credentials.

Premier provider supporté : **Konnect Network** (Tunisie).

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
        └── konnect/                 # tout ce qui est spécifique à Konnect
            ├── konnect.client.ts       # seul point d'appel HTTP vers Konnect
            ├── konnect.provider.ts     # façade utilisée par PaymentService
            ├── konnect.mapper.ts       # conversion montant + mapping statuts
            ├── konnect.types.ts        # types des requêtes/réponses Konnect
            ├── konnect.exceptions.ts   # erreurs propres + mapping HTTP
            ├── konnect.config.ts       # namespace de config Konnect
            ├── konnect.controller.ts   # POST init + GET webhook
            └── konnect.module.ts
```

Toute la communication HTTP avec Konnect passe par `KonnectClient`. Aucun autre fichier n'appelle Konnect directement. Un futur second provider (ex. Paymee, Flouci) s'ajouterait de la même façon sous `payment/providers/<provider>/`, sans toucher au code Konnect.

## Configuration

Copier `.env.example` vers `.env` et renseigner les valeurs. Toute la configuration passe par `ConfigModule`/`ConfigService` — rien n'est en dur dans le code, et le démarrage échoue explicitement si une variable requise manque (`src/config/env.validation.ts`).

| Variable | Description |
|---|---|
| `KONNECT_BASE_URL` | `https://api.sandbox.konnect.network/api/v2` (sandbox) ou `https://api.konnect.network/api/v2` (production) |
| `KONNECT_API_KEY` | Clé API Konnect. **Jamais** exposée au frontend, jamais loggée, jamais committée. |
| `KONNECT_WALLET_ID` | Wallet Konnect receveur des paiements (`receiverWalletId`). |
| `KONNECT_WEBHOOK_URL` | URL HTTPS publique de `GET /payments/konnect/webhook`. |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Base MySQL/MariaDB où sont stockés les paiements internes. |

## Endpoints

- `POST /payments/konnect/init` — initialise un paiement Konnect, retourne `{ paymentId, payUrl, providerRef }`. Le frontend redirige l'utilisateur vers `payUrl`.
- `GET /payments/konnect/webhook?payment_ref=...` — reçu par Konnect à chaque changement de statut. Récupère le statut réel via `GET /payments/:paymentId` chez Konnect avant toute mise à jour ; idempotent (un même `payment_ref` reçu plusieurs fois ne déclenche l'opération métier "paiement payé" qu'une seule fois).
- `GET /payments/:id` — consultation d'un paiement interne (provider-agnostique).

## Sécurité

- `KONNECT_API_KEY` ne quitte jamais le backend : elle n'est ni retournée dans une réponse HTTP, ni écrite dans un log (`KonnectClient` construit ses erreurs sans jamais sérialiser la config/les headers de la requête).
- Le webhook ne suffit jamais à valider un paiement : le statut est systématiquement revérifié auprès de Konnect (`GET /payments/:paymentId`), et le montant/devise/orderId sont comparés à l'enregistrement interne avant d'accepter un paiement comme `PAID` (`konnect.mapper.ts#assertKonnectPaymentMatchesInternalRecord`).
- Retries contrôlés et bornés : pas de retry sur 401/404, backoff sur 429 (respecte `Retry-After` si présent) et sur 5xx/timeout/erreur réseau, avec un nombre maximum de tentatives.
- `helmet()` est activé globalement, et toutes les entrées (DTOs, query du webhook) sont validées via `class-validator`.

## Développement

```bash
npm install
npm run start:dev
```

## Tests

```bash
npm test
```

Les tests unitaires mockent intégralement les appels HTTP vers Konnect (aucune dépendance au sandbox réel) et couvrent notamment : initialisation réussie, conversion TND → millimes, erreurs 401/404/429/5xx, timeout/erreur réseau, récupération du détail d'un paiement, traitement d'un webhook valide, webhook sur paiement inexistant, webhook reçu plusieurs fois (idempotence), statuts `completed`/`pending`, et la vérification montant/devise.
