# marketplace-api

## Rôle du projet

API NestJS du domaine marketplace pour vendeurs, catalogue, modération et exécution des commandes.

## Fonctionnalités publiques

`GET /health`, `GET /health/inventory`, `GET /health/checkout`; `POST /auth/register|login`; lecture publique des catégories (`GET /categories`); webhook applicatif entrant `POST /payments/webhook` (appelé par payment-api, jamais par un navigateur — voir "Checkout").

**Pages inventoriées :** Aucune page (service HTTP uniquement).

## Fonctionnalités administratives

API sans pages. Routes de service pour catégories, modération produits, lecture commande et gestion/statut des vendeurs; routes vendeur pour profil, produits, variantes, inventaire, commandes, retours, payouts et notifications; routes internes panier/checkout (`/internal/cart`, `/internal/checkout`, TASK-P0-004) pour les applications appelantes (ex. `ob`).

## API

Contrôleurs: health (+ `health/inventory` TASK-P0-005, `health/checkout` TASK-P0-004); auth; categories; sellers; products et internal-products; variants; inventory; cart; checkout (+ webhook payment-api); seller-orders et orders; returns; payouts; notifications; moderation. Les verbes et gardes sont ceux des décorateurs NestJS; Swagger est exposé par l'application en développement.

**Réservation de stock (TASK-P0-005)** : `InventoryService.reserveStock/confirmReservation/releaseReservation/expireStaleReservations` — primitive transactionnelle (UPDATE SQL conditionnel, jamais de stock négatif même sous requêtes concurrentes sur la dernière unité). `GET /health/inventory` expose la métrique d'oversell (compte des `InventoryItem.available < 0`, cible zéro).

**Checkout multi-vendeur (TASK-P0-004)** : `POST /internal/cart` (`GET`/`POST items`/`PATCH items/:id`/`DELETE items/:id`) puis `POST /internal/checkout` — les deux réservés aux applications appelantes (`ServiceAuthGuard`, `memberId` explicite en paramètre : marketplace-api n'a pas de session membre, la confiance vient de l'appelant, ex. `ob`, qui a déjà authentifié le membre lui-même). `checkout` revalide prix/statut publié/vendeur/stock depuis la base (jamais le panier), crée un snapshot immuable par ligne, une `MarketOrder` + une `SellerOrder` par vendeur impliqué, réserve le stock de chaque ligne (TASK-P0-005) et initie un paiement idempotent auprès de payment-api — tout dans une seule transaction pour la création+réservation ; le paiement lui-même s'initie hors transaction et toute commande dont l'initiation échoue est explicitement annulée (stock relâché). `POST /payments/webhook` (signature HMAC `PAYMENT_WEBHOOK_SECRET`) et `CheckoutReconciliationService` (scheduler périodique, filet de sécurité si le webhook est perdu, + expiration des commandes `PENDING` abandonnées) confirment ou annulent la commande une fois le paiement résolu.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

`SellerJwtGuard` protège les ressources vendeur et impose l'identité portée par le JWT. `ServiceAuthGuard` protège `/internal/products`, modération, commandes, mutations catégories et administration vendeurs via une clé appartenant à `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`, TASK-P0-003). Ne jamais exposer ces clés au navigateur.

## Données possédées

Base dédiée configurée par `DB_*`: vendeurs/utilisateurs, catégories, produits/images/variantes, inventaire (+ réservations de stock, TASK-P0-005), panier/lignes (TASK-P0-004), commandes vendeur/lignes, commandes marché, retours, payouts et notifications.

**Migrations réellement présentes :** Aucun dossier `migrations/`, `mysql/` ou `sql/` dans `marketplace-api` lui-même — le schéma des tables `sp_*` est possédé par `sellerPortal` (`sql/schema.sql` + `sql/migration_*.sql`, voir `src/config/database.config.ts`), pas par ce service. `sp_stock_reservations` (TASK-P0-005) et le panier/checkout (`sp_carts`, `sp_cart_items`, colonnes `memberId`/`idempotencyKey`/`status`/`paymentId` sur `sp_market_orders`, `reservationId` sur `sp_seller_order_items`, TASK-P0-004) sont ajoutés par `sellerPortal/sql/migration_add_stock_reservations.sql` et `sellerPortal/sql/migration_add_marketplace_checkout.sql`.

## Intégrations

Consommée par sellerPortal/teamManager via `MARKETPLACE_API_URL` et clé de service. TypeORM crée/accède au schéma configuré. Appelle payment-api (initiation de paiement idempotente, lecture de statut, réception du webhook applicatif — TASK-P0-004) et notification-api (best-effort, confirmation/annulation de commande envoyée au membre acheteur — le `NotificationsService` local ne notifie que les vendeurs).

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `NODE_ENV`, `PORT`, `SELLER_JWT_SECRET`, `SERVICE_API_KEYS`, `SERVICE_API_KEYS_PREVIOUS(_EXPIRES_AT)`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3011 par défaut dans `src/main.ts` et `.env.example`, pour `start`, `start:dev` et `start:prod`.

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:e2e`, `pnpm test:cov`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Aucune migration SQL n'est présente dans ce dépôt (le schéma `sp_*` est possédé par `sellerPortal`, voir "Données possédées"); le déploiement doit s'assurer qu'elle est appliquée là-bas. Le checkout (TASK-P0-004) n'a de surface HTTP que côté `marketplace-api` : aucune page `ob` (panier, tunnel d'achat) n'existe pour l'appeler — voir `todo.md` pour la portée exacte retenue cette passe. Frais de livraison/taxe non calculés dynamiquement (pas de transporteur/zone configurable, voir TASK-P1-006) — seul le sous-total des lignes (prix × quantité) entre dans le total de la commande aujourd'hui. Le webhook de paiement entrant (`POST /payments/webhook`) n'a pas de table de déduplication dédiée (contrairement à billetterie/teamManager) : la réconciliation reste sûre par idempotence des transitions elles-mêmes (rejouer sur une commande déjà résolue est un no-op), mais un webhook rejoué relit toujours le statut auprès de payment-api plutôt que d'être filtré en amont. Pas de paiement/expédition externe réels testés (fournisseurs mockés dans les tests). Deux modèles existent encore avec sellerPortal local.
