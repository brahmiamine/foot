# marketplace-api

API NestJS dédiée à la marketplace multi-vendeurs de la plateforme `foot` : comptes vendeurs, catalogue produits, modération club, et scaffolding pour variantes/stock/commandes/retours/payouts.

Contrairement à `payment-api`/`notification-api` (bases dédiées), marketplace-api se connecte à la base **partagée `foot`** et lit/écrit les tables `sp_*` déjà créées et migrées par `sellerPortal` — c'est le schéma cible explicite du backlog (`sellerPortal → HTTP → marketplace-api → sp_products`, voir `avancement.md`, Epic E02 — TS-03/TS-04). `synchronize` TypeORM est désactivé partout : marketplace-api n'est jamais responsable du schéma de ces tables, seulement de leur contenu.

## Architecture

```
src/
├── config/                  # env validation, DB, clés de service
├── common/filters/          # exception filter global
├── auth/                    # JWT vendeur (self-service) + clé API service-à-service (club/backend)
├── sellers/                 # compte vendeur (inscription, profil, décision club sur le compte)
├── categories/              # catégories produit définies par le club
├── products/                # catalogue self-service vendeur (US-05) + endpoints internes pour sellerPortal (TS-04)
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

## Trois types d'appelants, trois mécanismes d'authentification

- **Vendeur** (self-service : catalogue, variantes, stock, commandes, retours, payouts, notifications) : JWT émis par `POST /auth/login`, header `Authorization: Bearer <token>` (voir `SellerJwtGuard`). Compte indépendant du SSO commun — un vendeur est un tiers externe, pas un `User` SSO. Table `sp_seller_users`, partagée avec l'ancien mécanisme de session de `sellerPortal` (même hash bcrypt, secrets JWT différents et non interchangeables).
- **Application backend interne agissant pour le club** (modération, gestion des catégories, décision sur un compte vendeur) : clé API statique, header `x-api-key` (voir `ServiceAuthGuard`), enregistrée dans `SERVICE_API_KEYS`. Utilisé par `teamManager`.
- **`sellerPortal` agissant pour un vendeur déjà authentifié chez lui** : même `ServiceAuthGuard` (`x-api-key`), mais sur les routes `internal/products/*` qui acceptent un `sellerId` explicite au lieu d'un JWT vendeur — sellerPortal a déjà vérifié l'identité du vendeur via sa propre session, marketplace-api fait confiance à l'application appelante (même principe que `payment-api` acceptant un `userId` explicite d'un appelant de confiance).

## Configuration

Copier `.env.example` vers `.env`. Le démarrage échoue explicitement si une variable requise manque (`src/config/env.validation.ts`).

| Variable | Description |
|---|---|
| `SELLER_JWT_SECRET` | Secret HS256 des JWT vendeur — propre à ce service, jamais partagé (ni avec le SSO commun, ni avec `SP_JWT_SECRET` de sellerPortal). |
| `SERVICE_API_KEYS` | JSON `{ "application": "clé" }` des applications internes autorisées (`teamManager`, `sellerPortal`, `superadmin`). |
| `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE` | Base MariaDB **partagée `foot`** — mêmes identifiants que `teamManager`/`sellerPortal`. |

## Lien avec sellerPortal / teamManager (TS-04)

- `teamManager` appelle cette API en HTTP pour la modération (`src/lib/marketplaceApiClient.ts`, `MarketplaceModerationService`) au lieu d'accéder directement à `sp_products`/`sp_sellers` en cross-DB.
- `sellerPortal` appelle cette API en HTTP pour les écritures produit (création/modification/suppression/soumission), via `internal/products/*` (`ServiceAuthGuard` + `sellerId` explicite) — les lectures produit restent en TypeORM direct côté sellerPortal (mêmes tables, pas un problème de cohérence, juste pas encore migré).
- L'authentification vendeur (`sp_seller_users`) reste double le temps que l'unification d'identité (Epic E17) ne soit pas traitée : `sellerPortal` garde sa propre session (`SP_JWT_SECRET`) pour l'UI vendeur, marketplace-api sa propre auth JWT (`SELLER_JWT_SECRET`) pour ses endpoints self-service — les deux vérifient contre le même hash bcrypt en base, mais un token de l'un n'est pas valide pour l'autre.

## Santé

`GET /health` — vérifie la connexion DB, retourne `503` si indisponible.
