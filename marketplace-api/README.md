# marketplace-api

## Rôle du projet

API NestJS du domaine marketplace pour vendeurs, catalogue, modération et exécution des commandes.

## Fonctionnalités publiques

`GET /health`; `POST /auth/register|login`; lecture publique des catégories (`GET /categories`).

**Pages inventoriées :** Aucune page (service HTTP uniquement).

## Fonctionnalités administratives

API sans pages. Routes de service pour catégories, modération produits, lecture commande et gestion/statut des vendeurs; routes vendeur pour profil, produits, variantes, inventaire, commandes, retours, payouts et notifications.

## API

Contrôleurs: health; auth; categories; sellers; products et internal-products; variants; inventory (+ `health/inventory`, sonde ops non authentifiée — TASK-P0-005); seller-orders et orders; returns; payouts; notifications; moderation. Les verbes et gardes sont ceux des décorateurs NestJS; Swagger est exposé par l'application en développement.

**Réservation de stock (TASK-P0-005)** : `InventoryService.reserveStock/confirmReservation/releaseReservation/expireStaleReservations` — primitive transactionnelle (UPDATE SQL conditionnel, jamais de stock négatif même sous requêtes concurrentes sur la dernière unité), pas encore exposée en HTTP : aucun appelant aujourd'hui, le tunnel de commande qui en aura besoin (TASK-P0-004) reste à construire. `GET /health/inventory` expose la métrique d'oversell (compte des `InventoryItem.available < 0`, cible zéro).

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

`SellerJwtGuard` protège les ressources vendeur et impose l'identité portée par le JWT. `ServiceAuthGuard` protège `/internal/products`, modération, commandes, mutations catégories et administration vendeurs via une clé appartenant à `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`, TASK-P0-003). Ne jamais exposer ces clés au navigateur.

## Données possédées

Base dédiée configurée par `DB_*`: vendeurs/utilisateurs, catégories, produits/images/variantes, inventaire (+ réservations de stock, TASK-P0-005), commandes vendeur/lignes, commandes marché, retours, payouts et notifications.

**Migrations réellement présentes :** Aucun dossier `migrations/`, `mysql/` ou `sql/` dans `marketplace-api` lui-même — le schéma des tables `sp_*` est possédé par `sellerPortal` (`sql/schema.sql` + `sql/migration_*.sql`, voir `src/config/database.config.ts`), pas par ce service. La table `sp_stock_reservations` (TASK-P0-005) est ajoutée par `sellerPortal/sql/migration_add_stock_reservations.sql`.

## Intégrations

Consommée par sellerPortal/teamManager via `MARKETPLACE_API_URL` et clé de service. TypeORM crée/accède au schéma configuré.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `NODE_ENV`, `PORT`, `SELLER_JWT_SECRET`, `SERVICE_API_KEYS`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

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

Aucune migration SQL n'est présente dans ce dépôt (le schéma `sp_*` est possédé par `sellerPortal`, voir "Données possédées"); le déploiement doit s'assurer qu'elle est appliquée là-bas. Pas de tunnel de commande/panier (checkout) : `TASK-P0-004` reste à construire, donc `InventoryService.reserveStock` et consorts (TASK-P0-005) n'ont aujourd'hui aucun appelant réel — voir `todo.md`. Pas de paiement/expédition externe. Deux modèles existent encore avec sellerPortal local.
