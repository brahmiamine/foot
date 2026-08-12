# marketplace-api

API NestJS dédiée à la marketplace multi-vendeurs de la plateforme `foot` : comptes vendeurs, catalogue produits, modération club, et scaffolding pour variantes/stock/commandes/retours/payouts.

Base de l'initialisation du service (voir `avancement.md`, Epic E02 — TS-03). Réplique le modèle de données déjà établi par `sellerPortal` (`sp_*`) dans une base **dédiée**, indépendante de la base partagée `foot`, comme `payment-api`/`notification-api`.

## Architecture

```
src/
├── config/                  # env validation, DB, clés de service
├── common/filters/          # exception filter global
├── auth/                    # JWT vendeur (self-service) + clé API service-à-service (club)
├── sellers/                 # compte vendeur (inscription, profil, décision club sur le compte)
├── categories/              # catégories produit définies par le club
├── products/                # catalogue self-service vendeur (US-05)
├── moderation/               # transitions club SUBMITTED->UNDER_REVIEW->APPROVED/REJECTED->PUBLISHED (US-07 à US-11)
├── notifications/           # notification vendeur (canal interne, en attendant notification-api)
├── variants/                # variantes produit (taille/couleur) — self-service vendeur (US-06)
├── inventory/                # stock disponible — self-service vendeur (US-06)
├── orders/                  # commande globale multi-vendeurs — scaffolding (E05/E06)
├── seller-orders/           # sous-commande par vendeur — scaffolding (E06)
├── returns/                  # demande de retour — scaffolding (E16)
└── payouts/                  # reversement vendeur — scaffolding (E15)
```

Les modules marqués **scaffolding** exposent l'entité et une lecture minimale ; leur workflow métier complet est un backlog item séparé (voir en-tête de chaque `*.service.ts`), pas dans le périmètre de cette initialisation.

## Deux acteurs, deux mécanismes d'authentification

- **Vendeur** (self-service : catalogue, variantes, stock, commandes, retours, payouts, notifications) : JWT émis par `POST /auth/login`, header `Authorization: Bearer <token>` (voir `SellerJwtGuard`). Compte indépendant du SSO commun — un vendeur est un tiers externe, pas un `User` SSO.
- **Application backend interne** (modération club, gestion des catégories, décision sur un compte vendeur) : clé API statique, header `x-api-key` (voir `ServiceAuthGuard`), enregistrée dans `SERVICE_API_KEYS`.

Aucun des deux ne couvre un accès public/navigateur direct : ce service est appelé par d'autres backends (`teamManager`) ou par un futur frontend marketplace, jamais exposé tel quel au grand public sans passerelle.

## Configuration

Copier `.env.example` vers `.env`. Le démarrage échoue explicitement si une variable requise manque (`src/config/env.validation.ts`).

| Variable | Description |
|---|---|
| `SELLER_JWT_SECRET` | Secret HS256 des JWT vendeur — propre à ce service, jamais partagé. |
| `SERVICE_API_KEYS` | JSON `{ "application": "clé" }` des applications internes autorisées (ex. `teamManager`). |
| `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE` | Base MariaDB **dédiée** (`marketplace_api`), jamais la base partagée `foot`. |

## Lien avec sellerPortal (TS-04, pas dans ce périmètre)

`sellerPortal` reste aujourd'hui la source de vérité opérationnelle (tables `sp_*` dans la base partagée `foot`) et `teamManager` accède à ces mêmes tables en cross-DB direct pour la modération (voir `teamManager/src/services/MarketplaceModerationService.ts`). Cette API réplique le même modèle de données et les mêmes règles de transition dans sa propre base, prête à devenir la source de vérité unique — mais la bascule effective (migration des données, `sellerPortal` et `teamManager` appelant cette API au lieu d'écrire directement en base) est un chantier séparé, documenté comme TS-04 dans `avancement.md`.

## Santé

`GET /health` — vérifie la connexion DB, retourne `503` si indisponible.
