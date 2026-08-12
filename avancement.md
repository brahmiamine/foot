# Backlog & Avancement — Plateforme `foot`

**État du code vérifié : 12/08/2026**

Ce document fusionne le backlog produit/technique avec l'audit fonctionnel du code source du dépôt `brahmiamine/foot` (11 apps partageant MariaDB `foot`). Pour chaque élément, un statut indique ce qui est **✅ Livré**, en **🔄 Cours**, ou **⏳ À faire**.

Les correctifs déjà livrés restent documentés pour traçabilité, mais seul ce qui reste ouvert est priorisé pour les sprints.

---

## Vue d'ensemble du backlog

| Priorité | Epic | Statut | Objectif |
|---|---|---|---|
| P0 | E01 – Cohérence Match / ArbiNote | ✅ | empêcher les votes sur matchs non réellement commencés |
| P0 | E02 – Marketplace API | 🔄 | compléter le domaine marketplace multi-vendeurs |
| P0 | E03 – Modération Marketplace | ✅ | permettre au club de valider/rejeter les produits vendeurs |
| P0 | E04 – Fiabilité événements paiement | 🔄 | garantir les événements post-paiement via outbox transactionnel |
| P1 | E05 – Boutique OB | ✅ | fermer le parcours catalogue → achat → commande |
| P1 | E06 – Fulfillment boutique | 🔄 | gérer préparation, expédition, livraison et retours |
| P1 | E07 – Notifications fiables | 🔄 | éviter la perte d'événements métiers via outbox |
| P1 | E08 – Sécurisation SSO | 🔄 | réduire les risques liés à HS256/fail-open |
| P1 | E09 – Ownership des domaines | ⏳ | réduire les écritures DB cross-projects |
| P1 | E10 – CI et tests | ✅ | exécuter les tests existants sur tous les projets (TS-33/34/35/36 ✅) |
| P1 | E11 – Billetterie supporters | 🔄 | renforcer le contrôle de l'audience avec scanner/offline |
| P2 | E12 – ArbiNote audit | ✅ | compléter traçabilité et modération |
| P2 | E13 – Live temps réel | 🔄 | remplacer progressivement le polling par SSE/WebSocket |
| P2 | E14 – SMS | ✅ | finaliser le canal SMS (Tunisiesms activable via SMS_PROVIDER) |
| P2 | E15 – Payout Marketplace | 🔄 | automatiser les paiements vendeurs |
| P2 | E16 – Returns Marketplace | 🔄 | fermer le workflow des retours |
| P2 | E17 – Identity API | 🔄 | déplacer la gestion des comptes vers SSO |
| P3 | E18 – API Gateway | ⏳ | fournir une entrée API globale |
| P3 | E19 – Observabilité | 🔄 | correlation ID, logs, métriques et traces |
| P3 | E20 – Event Bus | ⏳ | découpler les projets par événements |

---

# EPIC E01 — Cohérence Matchsheet / ArbiNote

**Priorité : P0**  
**Statut :** ✅ Livré

## US-01 — Utiliser le statut réel du match pour autoriser les votes

**Projet :** `arbinote`  
**Statut :** ✅ Livré

### Problème (résolu)

`canVoteMatch()` utilisait `arbitre attribué + date programmée dépassée de 30 minutes`, sans jamais lire `matches.status`. Elle utilise désormais `arbitre_id`, `matches.status` et `matches.actual_started_at` (voir TS-02).

### User Story

> En tant que plateforme ArbiNote, je veux autoriser un vote uniquement lorsqu'un match a réellement commencé afin d'empêcher les votes prématurés ou sur un match annulé.

### Règle cible

```text
arbitre_id != null
AND status IN (IN_PROGRESS, FINISHED)
AND actual_started_at + 30 min <= now
```

### Critères d'acceptation

- `UPCOMING` → vote impossible. ✅
- `CANCELLED` → vote impossible. ✅
- `IN_PROGRESS` depuis moins de 30 minutes → impossible. ✅
- `IN_PROGRESS` depuis au moins 30 minutes → possible. ✅
- `FINISHED` → possible selon la politique de délai. ✅
- les règles sont contrôlées côté API, pas uniquement côté frontend. ✅ (`POST /api/votes` relit `status`/`actual_started_at` en base et rejette avec 400 si `canVoteMatch()` renvoie faux — le frontend ne fait que refléter la même règle pour l'UX, il ne peut pas la contourner).
- tests unitaires présents. ✅ (`arbinote/src/lib/utils.test.ts`, 9 cas : arbitre absent, `UPCOMING`, `CANCELLED`, `IN_PROGRESS` < 30 min, `IN_PROGRESS`/`FINISHED` ≥ 30 min, `FINISHED` sans `actual_started_at`, `IN_PROGRESS` sans `actual_started_at`, statut absent).

### Notes d'avancement

- Vote actuellement sans compte : repose sur empreinte appareil/cookie, pas d'authentification (hors périmètre de cette US, reste ouvert).
- 4 erreurs de lint react-hooks non traitées : `HomeClient`, `LiveMatchBadge`, `ThemeToggle`, `VotedBadge` (hors périmètre de cette US, reste ouvert).

## TS-02 — Ajouter l'heure réelle de début du match

**Projet :** `matchsheet` / référentiel `matches`  
**Statut :** ✅ Livré

Ajouter les champs :

```text
actual_started_at
actual_finished_at
```

### Séquence

```text
Sheet → IN_PROGRESS
        ↓
matches.status = IN_PROGRESS
matches.actual_started_at = now
```

Puis :

```text
Sheet → CLOSED
        ↓
matches.status = FINISHED
matches.actual_finished_at = now
```

### Critères

- l'heure programmée reste séparée de l'heure réelle ; ✅ (`matches.date` reste l'horaire programmé, `actual_started_at`/`actual_finished_at` sont des colonnes distinctes, migration `superadmin/mysql/migration_add_match_actual_times.sql`).
- une réouverture de feuille ne doit pas écraser l'heure initiale sans règle explicite. ✅ (`SheetService.mirrorMatchStatus` ne fixe `actual_started_at` qu'au tout premier passage `IN_PROGRESS` ; `reopenMatchAdmin` côté superadmin efface `actual_finished_at` sans jamais toucher `actual_started_at`).

### Notes d'avancement

- Les services de saisie live (`CardEventService`, `GoalService`, `InjuryService`, `SubstitutionService`) refusent désormais toute écriture quand la feuille est `CLOSED` ✅
- Une feuille rouverte par `superadmin` redevient éditable ✅
- Réouverture d'un match `FINISHED` en place : motif requis, audit horodaté, notification aux clubs ✅
- `matches.actual_started_at`/`actual_finished_at` alimentés par `SheetService.mirrorMatchStatus` (`matchsheet`), consommés par `canVoteMatch()` (`arbinote`, voir US-01) ✅ — tests `matchsheet/src/services/SheetService.test.ts` (4 cas) et `superadmin/src/lib/adminMatches.reopen.test.ts` (assertions ajoutées sur la préservation/nettoyage de ces deux colonnes à la réouverture).

---

# EPIC E02 — Marketplace API

**Priorité : P0**  
**Statut :** ✅ Livré

Nouveau projet backend créé :

```text
marketplace-api
```

**NestJS**, comme `payment-api` et `notification-api` — mais connecté à la
base **partagée `foot`** (pas une base dédiée) : marketplace-api lit/écrit
les tables `sp_*` déjà créées et migrées par `sellerPortal`, exactement le
schéma cible documenté par le backlog original
(`sellerPortal → HTTP → marketplace-api → sp_products`). `synchronize`
TypeORM désactivé partout : marketplace-api n'est jamais responsable du
schéma de ces tables, seulement de leur contenu.

### État actuel

- `sellerPortal` et `teamManager` appellent désormais `marketplace-api` en
  HTTP pour toute écriture sur les produits/la modération (voir TS-04) —
  plus aucun accès cross-DB direct ni écriture TypeORM directe sur
  `sp_products`/`sp_sellers` depuis ces deux apps.
- `teamManager` a un tunnel d'achat client complet (`/boutique/[teamId]` :
  panier, paiement réel via `payment-api`, décrément de stock atomique) ✅
  — domaine boutique du club, distinct de la marketplace multi-vendeurs.
- Pas de frontend d'achat marketplace unifié entre `teamManager` et
  `sellerPortal`.
- `sellerPortal` garde sa propre session (`SP_JWT_SECRET`) pour l'UI vendeur
  ; `marketplace-api` a son propre JWT self-service (`SELLER_JWT_SECRET`),
  les deux vérifient contre le même hash bcrypt en base mais un token de
  l'un n'est pas valide pour l'autre — unification d'identité non traitée
  (Epic E17).

## TS-03 — Initialiser Marketplace API

**Statut :** ✅ Livré

### Modules livrés

```text
auth          — JWT vendeur (self-service) + clé API service-à-service (club)
sellers       — inscription, profil, décision club sur le compte
categories    — catégories produit définies par le club
products      — catalogue self-service vendeur (US-05, voir plus bas)
moderation    — transitions club SUBMITTED->UNDER_REVIEW->APPROVED/REJECTED->PUBLISHED
notifications — notification vendeur (canal interne)
variants      — variantes produit (US-06, voir plus bas)
inventory     — stock disponible (US-06, voir plus bas)
```

### Modules en scaffolding (entité + lecture minimale, logique métier à venir)

```text
orders        — commande globale multi-vendeurs (E05/E06)
seller-orders — sous-commande par vendeur, fulfillment (E06)
returns       — workflow retours (E16)
payouts       — reversement vendeur (E15)
```

Pas de module `commissions` séparé : le taux vit sur `Seller.commissionRate`
et `ProductCategory.commissionRate`, comme dans `sellerPortal`.

### Critères

- NestJS ✅ ; validation DTO (`class-validator`) ✅ ; TypeORM ✅ ; healthcheck
  (`GET /health`) ✅ ; API key pour services internes (`ServiceAuthGuard`,
  header `x-api-key`) ✅ ; JWT/SSO adapté selon acteurs (JWT vendeur propre,
  indépendant du SSO commun — un vendeur est un tiers externe) ✅.
- **Swagger : non fait** — ni `payment-api` ni `notification-api` ne l'ont
  non plus, choix de cohérence avec l'existant plutôt qu'un ajout isolé.
- **Migrations : `synchronize` TypeORM (dev)**, comme `payment-api`/
  `notification-api`, pas de fichiers SQL versionnés — cohérent avec les
  deux autres services NestJS du dépôt, pas avec la convention `db/
  migrations.manifest` (réservée aux apps partageant la base `foot`).
- Tests unitaires : `ServiceAuthGuard`, `ProductsService` (matrice de
  transitions vendeur), `ModerationService` (matrice de transitions club,
  motif de rejet obligatoire, notification) — 16 tests, tous verts.
- Build/lint validés (`nest build`, `eslint`) ; **jamais démarré contre une
  vraie base MariaDB** dans ce bac à sable (pas de daemon Docker/MariaDB
  disponible ici) — à valider en conditions réelles avant le premier déploiement.

## TS-04 — Transférer la propriété des produits Marketplace

**Statut :** ✅ Livré

Aujourd'hui :

```text
sellerPortal → HTTP (internal/products, x-api-key + sellerId explicite) → marketplace-api → sp_products
teamManager  → HTTP (moderation/*, sellers, categories, x-api-key)      → marketplace-api → sp_products/sp_sellers
```

Aucune migration de données n'a été nécessaire : `marketplace-api` lit/écrit
directement les tables `sp_*` existantes dans la base partagée `foot` (choix
tranché avec l'utilisateur — voir Epic E02), pas une base séparée à
synchroniser.

### Critères

- SellerPortal n'importe plus l'entité TypeORM `Product` pour écrire :
  create/update/delete/submit/withdraw/toggle-active passent par
  `src/lib/marketplaceApiClient.ts` → `marketplace-api` (`internal/products/*`,
  authentifié par clé de service, `sellerId` passé explicitement car
  sellerPortal a déjà authentifié le vendeur via sa propre session). Lectures
  (GET list/détail) restées en TypeORM direct : même table, pas un problème
  de cohérence, hors périmètre littéral du critère.
- Images (`ProductImage`) et stock initial (`InventoryItem`) restent gérés en
  TypeORM direct côté sellerPortal — non couverts par le critère TS-04
  (entités distinctes de `Product`), marketplace-api n'a pas d'endpoint de
  création d'inventaire aujourd'hui.
- Comportements existants préservés pendant la migration (vérifiés contre le
  code sellerPortal avant réécriture, pas juste supposés) :
  suppression **logique** uniquement (jamais physique, historique des
  commandes préservé), toggle `isActive` **sans restriction de statut**
  (distinct d'une modification de contenu), validation du prix avant
  soumission.
- `teamManager` n'accède plus directement à `sp_products`/`sp_sellers`
  (l'ancien `MarketplaceModerationService.ts` cross-DB et les 4 entités
  `Marketplace*` associées ont été supprimés, remplacés par
  `src/lib/marketplaceApiClient.ts`).

### Limite connue

L'authentification vendeur reste double (`sellerPortal` via `SP_JWT_SECRET`,
`marketplace-api` via `SELLER_JWT_SECRET`) — non traité ici, voir Epic E17.

## US-05 — Catalogue vendeur

**Statut :** ✅ Livré (`marketplace-api/src/products`)

> En tant que vendeur, je veux créer et gérer mes produits via Marketplace API.

Fonctions livrées (JWT vendeur, scopées au vendeur authentifié) :

```text
POST   /products
GET    /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id                — suppression logique
POST   /products/:id/submit         — DRAFT -> SUBMITTED
POST   /products/:id/withdraw       — SUBMITTED/REJECTED -> DRAFT
POST   /products/:id/toggle-active  — sans restriction de statut
```

Miroir server-to-server `internal/products/*` (clé API + `sellerId`
explicite) pour `sellerPortal` — mêmes opérations, même logique métier
(`ProductsService`), voir TS-04.

## US-06 — Variantes et stock

**Statut :** ✅ Livré (`marketplace-api/src/variants`, `src/inventory`)

Fonctions livrées :

- tailles/couleurs (`attributes` libre en JSON) ;
- SKU ;
- prix (hérite du produit si non renseigné) ;
- stock disponible (`available`, ajustable par le vendeur) ;
- seuil d'alerte bas-stock (`InventoryItem.lowStockThreshold`, optionnel
  par ligne de stock) : notification `LOW_STOCK` envoyée au vendeur au
  moment précis où `available` franchit le seuil vers le bas (pas à
  chaque sauvegarde tant que le stock reste sous le seuil, pour éviter le
  spam) ; réglable via le même `PATCH /inventory/:id` que `available` ;
- désactivation dédiée d'une variante : `POST /products/:productId/
  variants/:id/toggle-active` (même logique que `ProductsService.
  toggleActive` — bascule `isActive` sans autre modification).

Reste à faire :

- décrément/réservation automatique du stock lors d'une commande (dépend de
  `seller-orders`, actuellement en scaffolding, voir E06).

---

# EPIC E03 — Modération Marketplace club

**Priorité : P0**  
**Statut :** ✅ Livré

`teamManager` ferme désormais le processus de modération marketplace :

```text
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED
                                  ↘ REJECTED → DRAFT (resubmit, côté sellerPortal)
```

### État actuel ✅

- `/admin/marketplace/products` : liste des produits soumis par les vendeurs
  du club, avec filtres vendeur/statut/catégorie/nom/date — servie par
  `marketplace-api` en HTTP (`src/lib/marketplaceApiClient.ts`, voir TS-04),
  plus d'accès cross-DB direct depuis teamManager.
- Transitions `SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED` et
  `UNDER_REVIEW → REJECTED` (motif obligatoire) appliquées par
  `marketplace-api` (`ModerationService`), appelées par `teamManager`
  réservées aux comptes ayant la permission `marketplace.moderate`, scopées
  au club courant côté API (`seller.clubId = clubId`).
  `reviewedBy`/`reviewedAt` alimentés sur la décision finale
  (APPROVED/REJECTED) avec l'identifiant `User` teamManager de l'agent.
- Chaque transition journalisée dans `AuditLog` (entité `MarketplaceProduct`)
  côté teamManager, à partir de la réponse de `marketplace-api`.
- Notification du vendeur à l'approbation/au rejet : écrite directement dans
  `sp_notifications` par `marketplace-api` (sellerPortal ne consomme pas
  encore `notification-api`, voir circuit "Notifications plateforme").
- Republication d'un produit corrigé (REJECTED → DRAFT → SUBMITTED) : gérée
  côté `sellerPortal`, qui appelle désormais `marketplace-api` (TS-04) plutôt
  que d'écrire directement dans `sp_products`.

---

# EPIC E04 — Fiabilité post-paiement

**Priorité : P0**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Webhook applicatif signé en place : `payment-api → billetterie` (`POST /api/payments/webhook`, HMAC-SHA256) ✅
- Configuré pour `billetterie` uniquement ; autres apps (`ob`, `teamManager`, `sellerPortal`) n'ont pas d'URL dans `WEBHOOK_URLS` et restent en polling.
- Transactional outbox + retry durable livrés (TS-12/TS-13, voir ci-dessous) ✅
- Pas de remboursements ni de payouts.
- Pas d'état comptable exploitable.
- Notifications limitées à `PAYMENT_SUCCEEDED` si `userId` fourni.

## TS-12 — Implémenter Transactional Outbox dans Payment API

**Statut :** ✅ Livré

Avant :

```text
Payment → PAID → EventEmitter2 → listeners (transitoire, perdu si le
                                             process crashe entre le
                                             commit et l'émission, ou si
                                             un listener échoue)
```

Désormais :

```text
BEGIN TRANSACTION
  Payment → PAID
  OutboxEvent → PAYMENT_PAID
COMMIT
```

`PaymentService.transitionToPaid()` (`payment-api/src/payment/payment.service.ts`)
fait l'UPDATE conditionnel (`status != PAID`, garantie exactly-once déjà en
place) et l'insertion `OutboxEvent` dans **la même transaction**
(`DataSource.transaction`, voir `outbox/outbox.service.ts`) — les deux
committent ensemble ou aucun des deux. Remplace `EventEmitter2` et les
anciens `PaymentNotificationsListener`/`PaymentWebhookListener` (supprimés),
dont l'exécution ne survivait jamais à un redémarrage entre le commit et la
livraison.

Worker (`OutboxWorkerService`, poll toutes les 5s, pas de dépendance
`@nestjs/schedule` — cohérent avec le reste du monorepo) :

```text
outbox (PENDING dû) → notification-api (best-effort, payeur) → business webhook (bloquant, TS-13)
```

Seul le webhook métier (application appelante) détermine le succès/échec de
l'événement — c'est lui que d'autres apps attendent pour confirmer une
commande. La notification du payeur via notification-api reste best-effort
(elle avalait déjà ses propres erreurs avant ce chantier) : jamais
bloquante, jamais retentée par le worker.

### Table

```text
payment_outbox_events

id
event_type
aggregate_id
payload
status        -- PENDING | PROCESSED | FAILED
attempts
next_retry_at
created_at
processed_at
last_error
```

`synchronize` TypeORM (dev, comme le reste de payment-api) — pas de fichier
SQL versionné, cohérent avec la convention déjà en place pour cette app.

## TS-13 — Retry durable des callbacks métiers

**Statut :** ✅ Livré

Remplace les 2 retries courts en mémoire de l'ancien `WebhookDispatchService`
(~2 secondes, perdus au moindre redémarrage) par un calendrier durable porté
par `OutboxEvent.attempts`/`next_retry_at` (survit à un redémarrage entre
deux tentatives) :

```text
1 min → 5 min → 15 min → 1 h → 6 h → FAILED (DLQ)
```

`WebhookDispatchService.dispatch()` ne retente plus lui-même : un seul essai,
lève en cas d'échec — c'est `OutboxWorkerService` qui possède le calendrier
et rejoue tout l'événement (`computeNextRetryAt()`,
`outbox/retry-schedule.ts`). Après épuisement du calendrier (6 tentatives),
l'événement passe `FAILED` (DLQ) : billetterie garde son filet de sécurité
existant (retour payeur / `/mes-billets`) pour ce cas résiduel.

Tests : `outbox/retry-schedule.spec.ts`,
`outbox/outbox-worker.service.spec.ts` (9 cas — livraison réussie, retry
programmé, DLQ après épuisement, type d'événement inconnu, garde-fou contre
le chevauchement de deux passages), `outbox/outbox.service.spec.ts`,
`payment/payment.service.spec.ts` (réécrit pour la transaction réelle).

## TS-14 — Idempotence côté consommateur

**Statut :** ✅ Livré pour `billetterie` (seul consommateur webhook branché aujourd'hui)

Doit mémoriser `eventId` afin de garantir :

```text
same event × N retries = 1 traitement métier
```

Table `tk_processed_webhook_events` (`event_id` en clé primaire) : le
premier appel avec un `eventId` donné insère la ligne et déclenche
`reconcileTicketPayment` ; tout appel suivant échoue sur la contrainte
d'unicité et reçoit `{ status: "ALREADY_PROCESSED" }` sans ré-exécuter le
traitement métier ni le nouvel appel réseau à `payment-api` qu'il implique
— y compris en cas de course entre deux retries reçus quasi
simultanément (la contrainte d'unicité fait office de verrou).
`reconcileTicketPayment` restait déjà idempotent sur l'état des billets
(ne mute que les billets encore `PENDING`), mais rien n'empêchait de le
ré-exécuter — et le réseau vers payment-api — à chaque retry avant ce
correctif.

`teamManager` n'est pas concerné aujourd'hui : `WEBHOOK_URLS` ne le
référence pas encore (voir Epic E04), donc aucun webhook n'y arrive pour
l'instant — ce point sera à traiter quand ce circuit sera branché.

---

# EPIC E05 — Boutique OB complète

**Priorité : P1**  
**Statut :** ✅ Livré

### État actuel ✅

- `/boutique/[productId]` : fiche produit avec images, nom, description, prix, disponibilité, stock.
- Ajouter au panier depuis `/boutique`.
- Panier avec ajout, suppression, modification quantité, recalcul total, contrôle stock.
- Checkout : panier → adresse → provider → payment-api → confirmation.
- `/espace-membre/commandes` : affichage des commandes avec numéro, date, montant, statut, articles, paiement, livraison, tracking.

### Hors périmètre v1

- Gestion de livraison/expédition côté staff (affichage lecture seule uniquement).
- Remboursement d'une commande déjà payée.
- Variantes de produit (taille/couleur).

---

# EPIC E06 — Fulfillment boutique

**Priorité : P1**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Workflow de fulfillment vendeur (TS-20 à US-24) livré côté
  `marketplace-api` (`src/seller-orders`) : préparation, prêt à expédier,
  expédition, livraison — voir détail ci-dessous.
- Toujours pas de tunnel d'achat marketplace multi-vendeurs côté frontend
  (`sellerPortal`/`teamManager`/`ob`) : `OrdersService`/`SellerOrdersService`
  n'ont aucune route de création, seulement des transitions sur des
  `SellerOrder` déjà existantes (voir Epic E05/E06, `MarketOrder`). Pas de
  vue vendeur/club pour déclencher ces transitions depuis une UI — API
  uniquement pour l'instant.
- **Découverte (voir TS-35)** : `sellerPortal` a sa propre implémentation
  TypeORM directe de ce même cycle de fulfillment (`sp_seller_orders`),
  antérieure et non migrée par TS-04 — les deux implémentations coexistent
  sans conflit actif tant qu'aucun flux de création de commande réel
  n'existe, mais devront être réconciliées (une seule source de vérité,
  probablement `marketplace-api` via HTTP comme pour les produits) avant
  qu'un vrai tunnel d'achat ne soit branché.
- Notification membre (US-24) hors périmètre : `MarketOrder` ne porte
  qu'un email/nom déclaratif, pas de compte SSO, et `marketplace-api` n'a
  pas d'outbox notification à ce jour (voir Epic E07/TS-25).

## TS-20 — Étendre les statuts commande

**Statut :** ✅ Livré (`marketplace-api/src/seller-orders/enums/seller-order-status.enum.ts`)

`SellerOrderStatus` (déjà scaffoldé par TS-03) porte la séquence cible sous
des noms légèrement différents mais équivalents :

```text
PENDING (= PENDING_PAYMENT) → CONFIRMED (= PAID) → PROCESSING (= PREPARING) → READY_TO_SHIP → SHIPPED → DELIVERED
                                                                                                       ↘ CANCELLED
                                                                                                       ↘ RETURN_REQUESTED → RETURNED → REFUNDED
```

`SELLER_ALLOWED_ORDER_TRANSITIONS` (nouveau) formalise les transitions
autorisées côté vendeur, sur le même modèle que
`SELLER_ALLOWED_PRODUCT_TRANSITIONS` (US-05) : CONFIRMED→PROCESSING,
PROCESSING→READY_TO_SHIP, READY_TO_SHIP→SHIPPED, SHIPPED→DELIVERED.
CANCELLED/RETURN_REQUESTED/RETURNED/REFUNDED restent hors périmètre de ce
ticket (annulation : cascade match non traitée ; retours : Epic E16 ;
remboursement : Epic E15).

## US-21 — Préparer une commande

**Statut :** ✅ Livré — `POST /seller-orders/:id/prepare` (JWT vendeur, scopé au vendeur authentifié).

```text
CONFIRMED → PROCESSING
```

## US-22 — Marquer prête à expédier

**Statut :** ✅ Livré — `POST /seller-orders/:id/ready-to-ship`.

```text
PROCESSING → READY_TO_SHIP
```

## US-23 — Expédier

**Statut :** ✅ Livré — `POST /seller-orders/:id/ship`.

Informations obligatoires (`ShipSellerOrderDto`, validées par
`class-validator`) :

```text
carrier
trackingNumber
```

`shippedAt` alimenté automatiquement par le service à la transition (pas
un champ saisi par le vendeur).

Transition :

```text
READY_TO_SHIP → SHIPPED
```

## US-24 — Livraison

**Statut :** 🔄 Transition livrée, notification membre hors périmètre (voir « État actuel » ci-dessus).

`POST /seller-orders/:id/deliver` :

```text
SHIPPED → DELIVERED
```

`deliveredAt` alimenté automatiquement à la transition.

Tests : `marketplace-api/src/seller-orders/seller-orders.service.spec.ts`
(8 cas — transitions autorisées/refusées pour chaque étape, y compris
préparation depuis un statut non `CONFIRMED`, expédition hors
`READY_TO_SHIP`, livraison avant expédition).

---

# EPIC E07 — Notifications métiers fiables

**Priorité : P1**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- `notification-api` centralise préférences, templates, queue et canaux ✅
- Chaque application métier doit décider quoi émettre — catalogue d'événements inter-projets non figé.
- Paiements confirmés : événements branchés ✅
- Outbox transactionnelle livrée pour `teamManager` (TS-25/TS-26, voir
  ci-dessous — premier des 4 apps de la liste de priorité) ; `superadmin`,
  `matchsheet`, `billetterie` restent en `notify(...)` best-effort.
- Convocations/compositions/sponsors, billetterie, marketplace, modération de votes, sécurité SSO, actions `superadmin` : non tous branchés avec `eventId` idempotents.
- Modules de notification internes (`teamManager`, `sellerPortal`) coexistent avec `notification-api` — pas de règle de gouvernance.
- Push Web et FCM fonctionnent pour apps branchées ✅
- SMS reste un stub — `NotImplementedSmsProvider` lève une erreur explicite (décision produit).
- FCM jamais testé en conditions réelles (pas de credentials Firebase).

## TS-25 — Ajouter une outbox aux applications critiques

**Statut :** 🔄 1/4 livré (TeamManager)

Priorité :

1. TeamManager ; ✅
2. Superadmin ; ⏳
3. Matchsheet ; ⏳
4. Billetterie. ⏳

Au lieu d'un appel `notify(...)` best-effort :

```text
transaction métier + notification_outbox
```

`teamManager` n'avait qu'un seul point d'émission de notification
(`notifyNewsPublished`, publication d'actualité — `app/admin/news/
actions.ts`) : `notification_outbox_events` (table dédiée,
`migration_add_notification_outbox.sql`) est désormais insérée dans **la
même transaction DB** que l'écriture `News` (`dataSource.transaction(...)`,
`NotificationOutboxService.enqueue`) — `NewsService.create`/`update`
acceptent un `EntityManager` optionnel pour participer à cette transaction
plutôt que d'ouvrir la leur. Si l'insertion outbox échoue, toute la
transaction (y compris l'écriture `News`) est annulée — testé
explicitement (`actions.test.ts`, « rolls back the News row if the outbox
enqueue fails »).

## TS-26 — Worker de publication Notification API

**Statut :** 🔄 Livré pour TeamManager, sous une forme poll-once plutôt qu'un worker persistant

```text
local outbox → POST notification-api → 200 / idempotent → mark processed
```

`NotificationOutboxService.processDue()` traite un lot d'événements dus
(`PENDING`, `nextRetryAt` NULL ou passé), calendrier de retry durable
identique à `payment-api` (TS-13 : 1min → 5min → 15min → 1h → 6h → `FAILED`
en DLQ, voir `notificationOutboxRetrySchedule.ts`). Exposé via `POST
/api/internal/outbox/process` (service-à-service, `x-api-key`,
`TEAMMANAGER_SERVICE_API_KEY`), **pas** un worker persistant en boucle
comme `OutboxWorkerService` côté `payment-api` : `teamManager` (Next.js)
n'a pas de process long-running dédié dans ce dépôt — cette route est
conçue pour être invoquée périodiquement par un ordonnanceur externe
(cron), à provisionner (même limite que le reste du monitoring/
scheduling externe documenté ailleurs dans ce fichier).

### Reste à faire

Généraliser le même pattern (table outbox + `POST /api/internal/outbox/
process` + ordonnanceur externe) à `superadmin`, `matchsheet` et
`billetterie` — chacun devra d'abord recenser ses propres points
d'émission `notify(...)` (plus nombreux que le point unique de
`teamManager`) avant de les faire participer à une transaction.

Tests : `NotificationOutboxService.test.ts` (8 cas — enqueue/rollback,
livraison, retry programmé, DLQ après épuisement, jamais retraiter un
événement déjà terminé), `notificationOutboxRetrySchedule.test.ts` (2
cas), `route.test.ts` de `/api/internal/outbox/process` (3 cas),
`actions.test.ts` (5 cas — dont l'atomicité News/outbox).

---

# EPIC E08 — Sécurité SSO

**Priorité : P1**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- SSO toujours en HS256 (symétrique) — risque persistant : applications clientes peuvent signer des tokens (TS-27, toujours ouvert — migration vers signature asymétrique non traitée dans cette passe, voir note sous TS-27).
- Audience JWT ajoutée ✅ (TS-28, `aud = foot-platform`).
- Mode d'échec de la révocation configurable ✅ (TS-29) — `closed` appliqué à `matchsheet`/`superadmin`/`teamManager`, `open` (par défaut) conservé ailleurs.

## TS-27 — Migrer HS256 vers signature asymétrique

**Statut :** ⏳ À faire

Recommandation :

```text
EdDSA ou RS256
```

Architecture :

```text
SSO (private key) → JWT → applications (public key)
```

### Critères

Les applications clientes ne peuvent plus signer de tokens.

### Note d'avancement

Non traité dans cette passe (contrairement à TS-28/TS-29, plus ciblés) :
migrer l'algorithme de signature change la nature du secret partagé
(`SSO_JWT_SECRET`, un seul secret symétrique aujourd'hui) en une paire
clé privée (uniquement `sso`) / clé publique (les 6 apps clientes +
`notification-api`) — ça implique de générer et distribuer une nouvelle
paire de clés, de mettre à jour la configuration des 7 services
concernés de façon coordonnée, et de gérer la fenêtre de transition (les
JWT déjà émis avec l'ancien secret doivent rester vérifiables jusqu'à
expiration, 12h). Un changement de cette nature touche la configuration
de production de tout l'écosystème et mérite sa propre revue, séparée
des correctifs TS-28/TS-29 qui ne changent que la vérification côté
`packages/auth-shared` sans toucher au secret ni à l'algorithme.

## TS-28 — Ajouter `aud` (audience)

**Statut :** ✅ Livré

```text
iss = foot-sso     (déjà en place avant ce ticket)
aud = foot-platform
```

Une seule audience partagée plutôt que des audiences différentes par app
(`team-manager`, `matchsheet`, `superadmin`, mentionnées comme option par le
critère original) : `sso` émet un unique cookie de session consommé
indifféremment par les 6 apps clientes (voir
`packages/auth-shared/README.md`), il n'y a pas de destinataire unique à
distinguer par jeton — introduire des audiences par app sans revoir aussi
l'émission (un jeton par app cible) n'aurait fait qu'ajouter une vérification
sans valeur de sécurité réelle.

`sso/src/lib/session.ts` (`SSO_JWT_AUDIENCE = "foot-platform"`) signe
désormais avec `.setAudience(...)` ; `verifySessionToken` (côté `sso`) et
`verifySsoToken` (`packages/auth-shared/src/session.ts`, consommé par les 6
apps clientes) vérifient `aud` manuellement après `jwtVerify` plutôt que via
son option `audience` — un jeton signé avant ce ticket n'a pas de claim
`aud` : traité comme valide (même politique transitoire que `tokenVersion`,
voir TS-02/US-01), pour ne forcer aucune déconnexion à la mise en
production. Un jeton qui porte un `aud` incorrect est rejeté.

Tests : `billetterie/src/lib/ssoTokenAudience.test.ts` (4 cas — audience
attendue, jeton pré-migration sans `aud`, audience incorrecte rejetée,
`aud` sous forme de tableau contenant la valeur attendue). Exécuté via le
harnais vitest de `billetterie`, comme `ssoRevocationFailureMode.test.ts`
(TS-29) — `packages/auth-shared` n'a pas son propre outillage de test.

## TS-29 — Rendre fail-open / fail-closed configurable

**Statut :** ✅ Livré

Configuration (`packages/auth-shared/src/session.ts`,
`getSsoRevocationFailureMode()`) :

```text
SSO_REVOCATION_FAILURE_MODE=open|closed
```

`open` reste la valeur par défaut si la variable est absente (comportement
historique inchangé, aucune app n'est affectée tant qu'elle ne définit pas
explicitement `closed`) — décision cohérente avec le reste du dépôt (ex:
`audienceValidationMode` par défaut `DECLARATIVE`, voir Epic E11). En mode
`closed`, `verifySsoTokenWithRevocation()` refuse l'accès (renvoie `null`)
dès que la révocation ne peut pas être confirmée par `sso` — `SSO_URL` non
configuré, panne/timeout de l'appel d'introspection, ou réponse non-200 —
au lieu de retomber sur le résultat cryptographique local. Une révocation
confirmée (`active: false`) reste toujours honorée, quel que soit le mode.

Recommandation (appliquée dans les `.env.example` correspondants) :

| App | Mode |
|---|---|
| OB public/member | `open` (par défaut, non modifié) |
| `billetterie` | `open` (par défaut, non modifié) |
| `arbinote` | `open` (par défaut, non modifié) |
| TeamManager | `closed` ✅ (`teamManager/.env.example`) |
| Matchsheet | `closed` ✅ (`matchsheet/.env.example`) |
| Superadmin | `closed` ✅ (`superadmin/.env.example`) |

Le changement vit dans `packages/auth-shared`, source unique importée par
chemin relatif par les 6 apps clientes (voir README.md de ce dossier) :
aucune duplication de logique à maintenir par app.

Tests : `billetterie/src/lib/ssoRevocationFailureMode.test.ts` (8 cas —
défaut `open`, valeur invalide traitée comme `open`, `closed` explicite,
`SSO_URL` absent × 2 modes, échec réseau × 2 modes, révocation confirmée
honorée indépendamment du mode). Exécuté via le harnais vitest de
`billetterie` (une des 6 apps consommatrices) car `packages/auth-shared`
n'a pas son propre outillage de test (pas de `node_modules` — voir
README.md du dossier).

### Notes

- `sellerPortal` utilise une session propre (`SP_JWT_SECRET`) au lieu du SSO commun — pas de MFA, pas de révocation centrale.

---

# EPIC E09 — Ownership des données

**Priorité : P1**  
**Statut :** ⏳ À faire

Objectif : une table métier = un owner principal.

## TS-30 — Définir ownership officiel

| Domaine | Owner | Statut |
|---|---|---|
| users/sessions | SSO | ✅ Clair |
| teams/leagues/seasons | Superadmin | ✅ Clair |
| players/staff/training | TeamManager | ✅ Clair |
| match sheet/live events | Matchsheet | ✅ Clair |
| tickets/scans | Billetterie | ✅ Clair |
| marketplace | Marketplace API | ✅ Clair (créée, voir Epic E02) |
| payments | Payment API | ✅ Clair |
| notifications | Notification API | ✅ Clair |

## TS-31 — Supprimer progressivement les écritures cross-domain

**Statut :** 🔄 Premier cas traité (le seul écrivain cross-domain concret identifié)

Avant :

```text
Superadmin → ms_sheets (TypeORM direct, reopenMatchAdmin)
```

Désormais :

```text
Superadmin → POST /api/internal/matches/:id/reopen (x-api-key) → Matchsheet → ms_sheets/matches
```

`matchsheet` expose son premier endpoint interne service-à-service
(`matchsheet/src/app/api/internal/matches/[matchId]/reopen`, authentifié par
`MATCHSHEET_SERVICE_API_KEY` — voir `lib/serviceAuth.ts`, même pattern que
`x-api-key` déjà utilisé par marketplace-api/notification-api).
`SheetService.reopen()` (nouveau, `matchsheet/src/services/SheetService.ts`)
fait la transition sheet `CLOSED → IN_PROGRESS` (efface `closed_at`) et
`matches.status → IN_PROGRESS` (efface `actual_finished_at`, préserve
`actual_started_at`) — matchsheet reste seul propriétaire, plus d'écriture
TypeORM directe depuis superadmin (`reopenMatchAdmin` dans
`superadmin/src/lib/adminMatches.ts` appelle désormais
`matchsheetClient.reopenSheet()`, propage l'erreur si l'appel échoue plutôt
que de l'avaler). `src/middleware.ts` de matchsheet exempte `/api/internal/*`
de la vérification de session SSO (service-à-service, pas un utilisateur).

Tests : `SheetService.test.ts` (4 cas ajoutés pour `reopen()`),
`adminMatches.reopen.test.ts` (réécrit — vérifie la délégation à
`matchsheetClient`, plus l'écriture DB locale directe ; nouveau cas
d'erreur propagée).

### Points à traiter

- Superadmin écrivait directement `ms_sheets` — ✅ traité (voir ci-dessus),
  c'était le seul point d'écriture cross-domain concret identifié dans le
  code (les autres tables Matchsheet ne sont lues nulle part ailleurs).
- Plusieurs apps écrivent ou dépendent d'un même domaine (ex: `Card`,
  `matches.status` — `matchsheet` et `superadmin` écrivent tous deux
  `matches.status`, chacun sur un sous-ensemble de valeurs disjoint et
  documenté : reste un partage assumé, pas une duplication accidentelle,
  hors périmètre de ce ticket).
- Tests de contrat inter-projets et validations CI manquants (aucun test qui
  vérifie que le contrat HTTP matchsheet/superadmin reste stable dans le
  temps — les tests actuels couvrent chaque côté isolément, avec mocks).

## TS-32 — Centraliser discipline officielle

Décider qui possède :

```text
cards
suspensions
fines
```

Recommandation :

```text
Matchsheet → événement CARD_RECORDED → TeamManager (projection)
```

au lieu de deux écrivains sur les mêmes tables.

---

# EPIC E10 — CI / qualité

**Priorité : P1**  
**Statut :** ✅ Livré

## TS-33 — Activer tous les tests existants en CI

**Statut :** ✅ Livré

Activé au minimum pour :

```text
matchsheet ✅
teamManager ✅
billetterie ✅
```

Étendu à toutes les suites de tests existantes qui n'étaient pas encore
dans la matrice CI (`.github/workflows/ci.yml`), pas seulement le minimum
demandé : `sellerPortal` (vitest), `sso` (`node --test`, nouveau script
`test` ajouté — n'existait que sous `test:i18n`), `marketplace-api` (jest,
**absente de la matrice CI jusqu'ici**, ajoutée entièrement). `ob` reste
`test: false` : aucun fichier de test dans ce projet à ce jour.

`marketplace-api` a aussi nécessité un correctif du step de lint : comme
`payment-api`/`notification-api`, son script `lint` local (scaffolding
NestJS) inclut `--fix` — la CI l'invoque désormais directement sans
`--fix` (même traitement que les deux apps npm), pour ne pas corriger
silencieusement au lieu de faire échouer le job.

## TS-34 — Ajouter tests SSO

**Statut :** ✅ Livré

`sso` n'avait jusqu'ici que des tests `node --test` sur le texte source
(parité des dictionnaires i18n, présence de clés de traduction — voir
`test/*.test.mjs`), aucune exécution réelle de la logique métier. Ajout
d'un harnais vitest + SQLite en mémoire (même pattern que `arbinote`/
`billetterie` : `src/test/testDataSource.ts`, `setupSqliteTypes.ts`,
`fixtures.ts`), le script `test` exécute désormais les deux runtimes
(`node --test test/*.test.mjs && vitest run`).

Testé (49 tests au total, dont 43 nouveaux) :

- **login** — `src/lib/authenticate.test.ts` (7 cas : identifiants valides,
  mot de passe erroné, email inconnu, compte désactivé, SUPERADMIN avec
  teamId refusé, ADMIN scopé à son club, MEMBER sans teamId) ;
- **MFA** — `src/lib/mfa.test.ts` (11 cas : challenge d'enrôlement
  (créé/consommé/remplacé), `isMfaEnabled` (secret+flag requis ensemble),
  format du code TOTP, génération/hash/consommation à usage unique des
  codes de récupération) ;
- **reset password** — `src/lib/passwordReset.test.ts` (11 cas :
  `requestPasswordReset` anti-énumération, `resetPassword` — jeton
  inconnu/expiré/déjà utilisé/à usage unique, `tokenVersion` incrémenté et
  hash effectivement changé —, `changePassword` avec mot de passe actuel
  invalide/compte désactivé) ;
- **tokenVersion** — `src/lib/session.test.ts` (6 cas : génération à jour
  acceptée, génération périmée rejetée, jeton pré-migration sans claim
  traité comme génération 0, compte désactivé/supprimé rejeté, mauvais
  secret rejeté) ;
- **introspection** — `src/app/api/session/introspect/route.test.ts` (4
  cas : header manquant, `tokenVersion` périmé, jeton forgé sans 500,
  jeton valide) — c'est l'endpoint que `packages/auth-shared` interroge
  pour la révocation (TS-29) ;
- **logout everywhere** — `src/app/api/logout-everywhere/route.test.ts` (4
  cas : origine non fiable, non authentifié, `tokenVersion` incrémenté +
  cookie effacé, compte supprimé). `getCurrentSession()` dépend de
  `next/headers` (indisponible hors contexte de requête réel) : la session
  courante est mockée via `vi.mock("@/lib/session", ...)`, comme les autres
  tests de route de ce dépôt mockent les dépendances liées au runtime Next
  plutôt que le HTTP lui-même.

## TS-35 — Tests SellerPortal

**Statut :** ✅ Livré

`sellerPortal` avait déjà un harnais vitest + SQLite en mémoire et un
premier test (`src/lib/authz.test.ts`, couvrant déjà l'essentiel de
« isolation vendeurs » et « accès croisé refusé » : `requireSellerSession`,
`requireActiveSeller` selon le statut du compte, `assertOwnedBySeller` —
404 jamais 403, pour ne rien révéler à un vendeur non autorisé). Complété
avec 4 nouveaux fichiers de test (37 tests au total sur ce périmètre) :

- **transitions commandes** — `src/app/api/orders/[id]/status/route.test.ts`
  (5 cas : progression autorisée, saut d'étape refusé, `SHIPPED` refusé sur
  cet endpoint — doit passer par `/shipping` —, 404 cross-vendeur, session
  requise) ;
- **shipping** — `src/app/api/orders/[id]/shipping/route.test.ts` (4 cas :
  expédition depuis `READY_TO_SHIP` avec transporteur/suivi/date
  enregistrés, refus hors `READY_TO_SHIP`, validation du corps, 404
  cross-vendeur) ;
- **stock** — `src/app/api/inventory/[id]/route.test.ts` (4 cas : mise à
  jour de `available`, 404 cross-vendeur sans mutation, valeur négative
  refusée, session requise) ;
- **transitions produits** — `src/lib/marketplaceApiClient.test.ts` (7 cas)
  : depuis TS-04, `sellerPortal` ne fait plus les transitions produit
  elle-même, elle les délègue en HTTP à `marketplace-api`
  (`internal/products/*`) — testé ici : configuration manquante,
  construction de la requête (URL, `x-api-key`, `sellerId` encodé), et
  propagation d'une transition refusée (409) ou d'une erreur non-JSON
  comme erreur côté appelant.

### Découverte annexe (à traiter séparément, hors périmètre de ce ticket)

En testant `/api/orders/[id]/status` et `/api/orders/[id]/shipping`, on
constate que `sellerPortal` a déjà sa **propre** implémentation complète du
cycle de fulfillment `SellerOrder` (mêmes statuts, même table
`sp_seller_orders`) en TypeORM direct — assumé et documenté au niveau de
l'entité (`sellerPortal/src/entities/MarketOrder.ts` : *« Dans
l'architecture cible cette table appartient à la Marketplace API ; elle
est répliquée ici uniquement pour permettre au Seller Portal de
fonctionner de façon autonome en V1 »*), mais jamais mentionné dans ce
document jusqu'ici. Cela signifie que le fulfillment `seller-orders`
livré côté `marketplace-api` (Epic E06, TS-20 à US-24) et celui déjà
présent côté `sellerPortal` sont aujourd'hui **deux implémentations
parallèles** de la même logique sur la même table, avec des règles de
transition et des mécanismes d'authentification distincts (JWT vendeur
`marketplace-api` vs session propre `SP_JWT_SECRET`) — sans conflit actif
aujourd'hui puisqu'aucune des deux n'est branchée à un vrai flux de
création de commande (aucun tunnel d'achat marketplace n'existe encore,
voir Epic E05/E06). À réconcilier avant qu'un vrai flux de commande
n'existe : migrer `sellerPortal` vers `marketplace-api` pour le
fulfillment aussi, sur le modèle déjà appliqué aux produits (TS-04),
plutôt que de laisser les deux coexister.

## TS-36 — Tests OB

**Statut :** ✅ Livré

`ob` n'avait jusqu'ici aucun harnais de test (seul `test:i18n` existait).
Ajout du même harnais vitest + SQLite en mémoire que les autres apps
(`src/test/testDataSource.ts`, `setupSqliteTypes.ts`, `fixtures.ts`),
nouveau script `test`, activé dans la matrice CI (`.github/workflows/
ci.yml`, `ob` passe de `test: false` à `test: true`). 17 tests :

- **pages publiques** — `src/services/PublicMatchService.test.ts` (6 cas :
  un match `isPublicVisible=false` n'apparaît jamais, ni dans
  `getNextMatch` ni dans `getRecentResults`, tri par date, exclusion des
  matchs déjà passés sauf `IN_PROGRESS`) ;
- **live API** — `src/app/api/live/[matchId]/route.test.ts` (3 cas : match
  inconnu → 404, match masqué par le club → 404, match visible → statut/
  score/événements) ;
- **restrictions membre** — `src/app/espace-membre/layout.test.ts` (3 cas :
  redirection vers `/membre/login` sans session, rendu normal pour un
  membre authentifié, dégradation propre si `notification-api` est
  indisponible — le compteur de notifications reste best-effort) ;
- **notification actions** — `src/lib/notificationApi.test.ts` (5 cas :
  401 local sans appel réseau si pas de session, `Authorization: Bearer`
  relayé, marquage lu, propagation d'une erreur HTTP avec son statut,
  enregistrement d'un abonnement push).

---

# EPIC E11 — Billetterie / contrôle supporters

**Priorité : P1**  
**Statut :** 🔄 Partiellement implémenté

### État actuel ✅

- **Scanner v1 + caméra + mode offline livré** ✅
  - QR signé par billet (jose HS256)
  - Scan admin `/admin/scan` : relit statut réel, marque `USED`, détecte double scan, journalise
  - Caméra (CameraScanner.tsx, jsqr), mode offline (manifeste + file locale)
  - Un jeton scanné offline reconnu par `ticketId` sans vérification signature
  - Vérification cryptographique réelle à la synchronisation
  - Non vérifié en conditions réelles (pas de caméra réelle ni réseau réel coupé) — à valider

- **Webhook post-paiement en place** ✅
  - `payment-api → billetterie` signé
  - Reconciliation par retour utilisateur / `/mes-billets` comme filet de sécurité

- **Audience auto-déclarée par défaut, vérification stricte désormais disponible en option par catégorie** (`audienceValidationMode`, voir US-37/US-38 ci-dessous) — toujours pas de mécanisme d'identité fiable si l'organisateur laisse le mode par défaut.

## US-37 — Vérification d'affiliation avant paiement

**Statut :** ✅ Livré (`purchaseTickets`, `src/lib/tickets.ts`)

Pour `HOME_SUPPORTERS` et `AWAY_SUPPORTERS`, ajoute vérification d'affiliation quand `TicketSaleRule.audienceValidationMode = STRICT` (voir US-38).

### Séquence cible

```text
User → SSO profile → affiliated teams → Ticketing → allowed ?
```

Implémentée avec `fetchMemberAffiliatedTeamIds()` (déjà utilisée pour le
signal de modération non bloquant en mode DECLARATIVE, voir
`flagAudienceMismatchIfNeeded`) — mais en mode STRICT le résultat bloque
l'achat au lieu de simplement flaguer le billet après coup.

### Critères

- seuls les affiliés à une équipe peuvent acheter billets supporters. ✅ (en mode STRICT uniquement — `ForbiddenError` avant toute réservation/paiement si non affilié)
- vérification côté API. ✅ (`purchaseTickets`, jamais côté frontend seul)
- **fail-closed** : si l'appel sso échoue ou ne répond pas (`fetchMemberAffiliatedTeamIds()` renvoie `null`), l'achat est refusé plutôt qu'autorisé par défaut — à l'inverse du mode DECLARATIVE, où une panne sso ne doit justement jamais bloquer une vente (simple signal de modération, voir `flagAudienceMismatchIfNeeded`).

## US-38 — Politique configurable

**Statut :** ✅ Livré

Ajouté :

```text
audienceValidationMode
```

avec :

```text
STRICT (affiliation vérifiée, bloquant)
DECLARATIVE (auto-déclaration, défaut — comportement historique inchangé)
```

Par catégorie de billet (`TicketSaleRule.audience_validation_mode`, donc de
facto par match+catégorie — pas de granularité par compétition dans cette
V1, non demandée par le reste du critère). Migration additive
(`billetterie/sql/migration_add_audience_validation_mode.sql`), défaut
`DECLARATIVE` : aucune règle existante ne change de comportement tant
qu'elle n'est pas explicitement repassée en `STRICT`. Pas d'interface
d'administration pour éditer `TicketSaleRule` dans cette app (aucune
n'existe non plus pour `allowedAudience` lui-même — même limite
préexistante, hors périmètre de cette US).

Tests : `billetterie/src/lib/tickets.audienceValidation.test.ts` (6 cas —
DECLARATIVE avec/sans confirmation, STRICT autorisé/refusé/fail-closed,
catégorie PUBLIC sans appel sso).

---

# EPIC E12 — Audit ArbiNote

**Priorité : P2**  
**Statut :** ✅ Livré

## TS-39 — Alimenter `reviewed_by`

**Statut :** ✅ Livré

Lors d'une résolution d'alerte (`POST /api/admin/alerts/[id]/resolve` et
`/dismiss`) :

```text
reviewed_by = session.user.id
reviewed_at = now
```

`session.user.id` provient de la session SSO (`getSsoSessionFromRequest`,
rôle `SUPERADMIN`) — plus le `// TODO: Récupérer l'ID de l'admin depuis la
session` laissé après la migration ADMIN_USER/ADMIN_PASS → SSO.

## US-40 — Historique de modération

**Statut :** ✅ Livré (`/admin/alerts/[id]`, section « Historique de modération »)

Affiche :

- admin ; ✅ (`admin_username`, désormais l'email de la session SSO — voir
  ci-dessous, la correction était nécessaire pour que ce champ soit rempli)
- date ; ✅
- état précédent ; ✅
- nouvel état ; ✅
- motif. ✅ (repris du `notes` envoyé à la résolution/l'ignorance)

Reconstruit depuis `audit_logs` (`entity_type='alert'`, filtré par
`entity_id`) via `GET /api/admin/alerts/[id]/history` — `vote_alerts.
reviewed_by`/`reviewed_at` (TS-39) ne portent que la dernière décision, pas
l'historique complet des transitions.

### Correctif connexe : attribution `admin_username`

`logAdminAction()` lisait un cookie/header `Basic` legacy
(`ADMIN_USER`/`ADMIN_PASS`) resté après la migration du back-office vers une
vraie session SSO (voir `adminAuth.ts`) — ce cookie n'étant plus jamais posé
en pratique, `admin_username` restait `null` pour **toute** action
journalisée (pas seulement les alertes), ce qui aurait rendu la colonne
« admin » de l'historique vide. Corrigé : la session SSO (email) prime,
fallback sur le cookie/header legacy s'il existe encore. Tests :
`arbinote/src/lib/auditLog.test.ts` (4 cas).

---

# EPIC E13 — Live temps réel

**Priorité : P2**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Données live (goals, cards, injuries, substitutions) alimentent `ob` en lecture.
- SSE livré côté `ob` pour réduire la latence perçue (TS-42/US-43, voir
  ci-dessous) — reste bâti sur la même lecture DB partagée que le polling
  existant, pas sur un vrai bus d'événements `matchsheet → ob` (voir note
  sous TS-41).
- Pas de contrat d'API/versionnement entre `matchsheet` et frontends publics.
- Un changement de schéma peut casser le live sans garde.
- Pas de synchronisation offline des écritures côté stade.

## TS-41 — Créer événements live

**Statut :** ⏳ Partiellement — types déjà présents côté lecture, pas d'émission event-driven

```text
GOAL_CREATED
CARD_CREATED
SUBSTITUTION_CREATED
INJURY_CREATED
MATCH_STARTED
MATCH_FINISHED
```

Les 4 premiers types existent déjà comme `LiveEventType` côté `ob`
(`ob/src/services/LiveMatchService.ts` : `GOAL` | `CARD` | `SUBSTITUTION` |
`INJURY`), mais dérivés par lecture DB (`ms_goals`/`Card`/
`ms_substitutions`/`ms_injuries`), pas émis par `matchsheet` au moment de
l'écriture — il n'existe aucun canal (event bus, webhook, SSE
serveur-à-serveur) entre `matchsheet` et `ob`, seulement la base MySQL
partagée que les deux lisent/écrivent chacun de leur côté. `MATCH_STARTED`/
`MATCH_FINISHED` ne sont pas non plus des événements émis : `ob` déduit
l'état live de `matches.status`, lu à chaque poll. Une vraie émission
d'événements nécessiterait un event bus (Epic E20, toujours ⏳) ou un
webhook dédié `matchsheet → ob` (sur le modèle de `payment-api →
billetterie`, voir Epic E04) — non traité ici : TS-42/US-43 apportent déjà
un vrai gain de latence sans cette dépendance, voir note ci-dessous.

## TS-42 — Ajouter SSE

**Statut :** ✅ Livré

Première étape :

```text
GET /matches/:id/events/stream
```

Implémenté côté `ob` (`GET /api/live/[matchId]/stream`, qui lit la même
base partagée que `GET /api/live/[matchId]`, voir Epic E05/US-43
ci-dessous) plutôt que côté `matchsheet` : c'est déjà `ob` qui possède le
seul point de lecture live existant (`LiveMatchService`, filtré
`isPublicVisible`), `matchsheet` n'a aucune route publique. Le flux
interroge la base côté serveur toutes les 3s (au lieu des 20s du polling
client existant) et ne pousse au navigateur que lorsque le contenu change
réellement ; il envoie un événement `closed` et termine le flux quand le
match passe `FINISHED`/`CANCELLED`, avec un heartbeat toutes les 15s pour
garder la connexion ouverte à travers les proxys.

### Limite assumée

Ce n'est **pas** un event bus `matchsheet → ob` (TS-41 reste ouvert) : le
serveur `ob` continue d'interroger la base toutes les 3s en interne, il ne
reçoit aucune notification de `matchsheet` au moment de l'écriture — le
gain est la latence perçue côté navigateur (jusqu'à 3s au lieu de jusqu'à
20s), pas la suppression du polling sous-jacent. Passer à un vrai push
event-driven nécessiterait l'Epic E20 (Event Bus) ou un webhook dédié.

Tests : `ob/src/app/api/live/[matchId]/stream/route.test.ts` (4 cas — match
inconnu/masqué → 404, événement `update` initial avec statut/score/
événements, événement `closed` + fin du flux pour un match déjà terminé).

## US-43 — Mettre à jour OB instantanément

**Statut :** ✅ Livré (repli polling conservé)

```text
Matchsheet → event → SSE → OB
```

Réalisé par `ob → SSE (lecture DB) → navigateur` plutôt que par un vrai
événement émis par `matchsheet` (voir limite assumée sous TS-42).
`LiveMatchSection.tsx` ouvre un `EventSource` vers `/api/live/[matchId]/
stream` quand le match est `IN_PROGRESS` et remplace l'affichage à chaque
événement `update` reçu.

Polling conservé comme fallback. ✅ — le `setInterval` fetch existant
(20s) continue de tourner en parallèle sans coût réel (conditionné par
`IN_PROGRESS`, comme avant) : si l'`EventSource` échoue (`onerror`, proxy
qui coupe le flux, navigateur sans support SSE), la connexion se ferme
silencieusement et le polling existant garde l'affichage à jour, sans état
d'erreur visible pour l'utilisateur.

---

# EPIC E14 — SMS

**Priorité : P2**  
**Statut :** ✅ Livré

### État actuel

- `TunisieSmsProvider` livré et activable via `SMS_PROVIDER=tunisiesms`
  (`notification-api/.env.example`) — `NotImplementedSmsProvider` reste le
  provider par défaut tant que cette variable n'est pas positionnée
  (comportement historique inchangé, décision produit toujours valable :
  ne pas activer le canal SMS avant d'avoir un vrai compte Tunisiesms).
- Numéro de téléphone propagé jusqu'aux canaux : `ChannelRecipient` (et
  `SharedDirectoryService.getUserContact`) exposent désormais
  `phoneNumber`, jusqu'ici absent du contrat de livraison (seuls
  email/name/locale existaient).

## TS-44 — Intégrer Tunisiesms

**Statut :** ✅ Livré

Dans `notification-api` :

```text
SmsChannel → TunisieSmsProvider
```

`SmsProviderModule` sélectionne le provider par `useFactory` selon
`SMS_PROVIDER`, même pattern que `EmailProviderModule`
(`SMS_PROVIDER=tunisiesms` → `TunisieSmsProvider`, sinon
`NotImplementedSmsProvider`). `TunisieSmsProvider` (`fetch` brut, pas de
SDK officiel maintenu — cohérent avec `FcmProvider`) : `POST SMS_API_URL`,
`Authorization: Bearer SMS_API_KEY`, corps `{ sender: SMS_SENDER, to,
text }`, timeout 10s. Lève systématiquement en cas d'échec (jamais avalé)
pour laisser BullMQ piloter le retry au niveau du worker (voir
`queue/processors/base-channel.processor.ts`, déjà générique à tous les
canaux — pas de logique de retry propre au provider).

Configuration :

```text
SMS_PROVIDER
SMS_API_URL
SMS_API_KEY
SMS_SENDER
```

## TS-45 — Ajouter normalisation téléphone

**Statut :** ✅ Livré (`src/common/phone-number.ts`)

Format cible :

```text
+216XXXXXXXX
```

avec validation E.164.

`normalizeTunisianPhoneNumber()` accepte les formats de saisie libre
attendus sur `User.phoneNumber` (0XX XXX XXX, +216XXXXXXXX, 216XXXXXXXX,
avec espaces/tirets/points) et renvoie `+216XXXXXXXX` ou `null` si non
reconnaissable — un numéro non tunisien ou mal formé ne casse jamais
l'envoi des autres canaux, `SmsChannel.deliver()` lève une erreur
explicite plutôt que de laisser `TunisieSmsProvider` recevoir un numéro
invalide. `isValidE164()` est le dernier filet de sécurité côté provider
(défense en profondeur, pas dupliqué avec le format de sortie de la
normalisation).

## TS-46 — Tests provider

**Statut :** ✅ Livré

- succès ✅ (payload `sender`/`to`/`text` avec `Authorization: Bearer`) ;
- 4xx ✅ (`Tunisiesms send failed: 400 …`) ;
- 5xx ✅ (`Tunisiesms send failed: 503 …`) ;
- timeout ✅ (erreur réseau/`AbortSignal.timeout` propagée avec contexte) ;
- retry ✅ (contrat vérifié : chaque échec est propagé sans être avalé,
  ce qui permet au worker BullMQ générique de retenter — le retry
  lui-même n'est pas réimplémenté dans le provider, voir TS-44).

Tests : `notification-api/src/providers/sms/tunisiesms.provider.spec.ts`
(8 cas), `src/common/phone-number.spec.ts` (12 cas), `src/channels/sms/
sms.channel.spec.ts` (3 cas) — 23 tests au total.

---

# EPIC E15 — Payout Marketplace

**Priorité : P2**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Calcul de solde, création et transitions de payout livrés côté
  `marketplace-api` (`src/payouts`) — voir US-47 à US-49 ci-dessous.
- Aucun rapprochement avec `payment-api` : ces routes ne déclenchent aucun
  virement réel, `payment-api` n'a pas de « payout provider abstraction »
  (voir sa propre section « Reste à faire »). Le workflow PENDING →
  PROCESSING → PAID/FAILED est piloté manuellement par l'app appelante
  (`internal/payouts/*`, `ServiceAuthGuard`) tant que cette intégration
  n'existe pas.
- Aucune preuve de paiement vendeur (pas de justificatif/relevé attaché à
  `Payout`).

## US-47 — Calculer solde vendeur

**Statut :** ✅ Livré (`PayoutsService.computeAvailableBalance`)

```text
orders delivered - returns - refunds - club commission = available balance
```

Implémenté comme `SUM(SellerOrder.netAmount WHERE status=DELIVERED) -
SUM(Payout.amount WHERE status IN (PENDING, PROCESSING, PAID))` pour ce
vendeur. La commission est déjà déduite dans `netAmount` au moment de la
commande (voir Epic E02), pas recalculée ici. Un retour complet
(`RETURNED`, voir Epic E16) sort mécaniquement la commande du total
`DELIVERED` — pas de soustraction séparée : le modèle `SellerOrderStatus`
ne supporte pas les retours partiels par ligne, une commande retournée
n'est donc jamais comptée deux fois. Les payouts déjà PENDING/PROCESSING/
PAID sont déduits pour ne jamais recompter un montant déjà réclamé par un
payout antérieur. Jamais négatif (`Math.max(0, …)`).

## US-48 — Créer payout

**Statut :** ✅ Livré

```text
PENDING → PROCESSING → PAID
```

`POST /internal/payouts?sellerId=…` (`ServiceAuthGuard`, jamais
auto-déclenché par le vendeur) crée un `Payout PENDING` pour la totalité
du solde disponible (US-47) ; `POST /internal/payouts/:id/processing` et
`/paid` font avancer le cycle. `periodStart`/`periodEnd` : approximation
V1 documentée dans le code (de la plus ancienne commande `DELIVERED` du
vendeur à aujourd'hui) — pas de lien explicite payout ↔ commandes
couvertes, à affiner si un vrai rapprochement comptable est requis.

## US-49 — Gérer échec payout

**Statut :** ✅ Livré

```text
PROCESSING → FAILED
```

`POST /internal/payouts/:id/failed` (motif obligatoire, `FailPayoutDto`)
et `POST /internal/payouts/:id/retry` (`FAILED → PENDING`) :

- raison ✅ (`Payout.lastError`, obligatoire à l'échec) ;
- retry ✅ (`retry()`, remet `PENDING` pour rejouer le virement) ;
- audit ✅ (`Payout.attempts`, incrémenté à chaque passage
  `PENDING → PROCESSING` — jamais réinitialisé par `retry()`, pour garder
  la trace des tentatives précédentes ; `lastError` reste lisible jusqu'à
  la tentative suivante).

Tests : `marketplace-api/src/payouts/payouts.service.spec.ts` (12 cas —
calcul de solde avec/sans plancher à 0, création refusée à solde nul,
création avec période dérivée, toutes les transitions autorisées/refusées,
audit `attempts`/`lastError` préservé au retry).

---

# EPIC E16 — Returns Marketplace

**Priorité : P2**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Workflow de retour livré côté `marketplace-api` (`src/returns`) — voir
  US-50 à US-52 ci-dessous.
- Aucune app cliente n'authentifie encore un acheteur marketplace (pas de
  tunnel d'achat réel, voir Epic E05/E06) : la demande de retour (US-50)
  est donc exposée en `internal/returns` (service-à-service,
  `ServiceAuthGuard`), sur le modèle de `internal/products` (TS-04) —
  l'identité du client est passée explicitement par l'app appelante,
  faute de JWT acheteur.
- Remboursement réel non déclenché (voir US-52).

## US-50 — Client demande retour

**Statut :** ✅ Livré (`POST /internal/returns`, `ReturnsService.request`)

```text
DELIVERED → RETURN_REQUESTED
```

Ne gère que le retour de la commande dans son ensemble : le modèle
`SellerOrderStatus` n'a pas d'état par ligne. `sellerOrderItemId` est
validé (doit appartenir à la commande) et conservé pour documenter quel
article est concerné, pas pour permettre un retour partiel côté statut.

## US-51 — Marketplace traite retour

**Statut :** ✅ Livré (`POST /returns/:id/approve`, `/reject` — JWT vendeur)

```text
REQUESTED → APPROVED ou REJECTED
```

« La marketplace » = le vendeur ici (c'est lui qui reçoit physiquement
l'article retourné) — `ReturnsController`, scopé au vendeur authentifié
comme le reste de l'API self-service. Un rejet restaure `DELIVERED` côté
`SellerOrder` (le retour n'a pas eu lieu) ; une approbation laisse
`RETURN_REQUESTED` (article pas encore reçu, voir US-52).

## US-52 — Produit retourné

**Statut :** 🔄 Transition livrée, remboursement hors périmètre

```text
APPROVED → COMPLETED → refund
```

`POST /returns/:id/complete` fait `APPROVED → COMPLETED` (`ReturnRequest`)
et `SellerOrder.status → RETURNED` quand l'article est physiquement reçu
en retour. Ne déclenche **aucun** remboursement réel : `payment-api`
n'expose pas encore de Refund API (voir sa section « Reste à faire ») —
le statut `REFUNDED` de `SellerOrderStatus` reste donc hors de portée de
cette méthode, un remboursement retenu comme geste manuel jusqu'à ce que
cette API existe côté `payment-api`.

Tests : `marketplace-api/src/returns/returns.service.spec.ts` (10 cas —
création avec validation de statut/appartenance, décision
approuvée/rejetée avec restauration `DELIVERED`, refus hors `REQUESTED`,
scoping vendeur — 404 jamais une autre commande —, complétion et refus
hors `APPROVED`).

---

# EPIC E17 — Centraliser Identity

**Priorité : P2**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Le cycle de vie du compte staff (`User` : création, activation/
  désactivation, changement de rôle, mot de passe, suppression) passe
  désormais par une API Identity interne côté `sso` — `superadmin` n'écrit
  plus jamais directement dans `User` pour ces opérations (voir TS-53/
  TS-54 ci-dessous). `sso` reste l'unique propriétaire de cette table
  (TS-30).
- La création/l'acceptation d'invitation (table `StaffInvitation`, emails,
  page `/invite/[token]`) reste hébergée dans `superadmin` — seule
  l'écriture finale dans `User` (à l'acceptation) a été migrée, pas tout
  le sous-domaine « invitation ». Voir note sous TS-53.

## TS-53 — Déplacer invitation staff vers SSO

**Statut :** 🔄 Écriture `User` migrée, sous-domaine invitation non déplacé

Aujourd'hui, au moment de l'acceptation d'une invitation :

```text
Superadmin → POST sso/api/internal/users → sso → User
```

(remplace l'ancienne écriture TypeORM directe dans `User`, effectuée
depuis `staffInvitations.ts`, `acceptInvitation()`). `sso` reste seul à
hacher le mot de passe (`identityService.createUser`, bcrypt coût 12) —
`superadmin` relaie le mot de passe brut choisi par l'utilisateur sur un
appel service-à-service (`x-api-key`, jamais connu en clair au repos côté
`superadmin`), il ne le connaît ni ne le stocke jamais lui-même.
`clubAccounts.ts` (`updateClubUser`/`deleteClubUser`, utilisés par
`PUT`/`DELETE /api/admin/club/users/[id]`, l'écran d'administration des
comptes club) délègue de la même façon.

### Note d'avancement

Migration volontairement bornée à l'écriture `User` elle-même (le
problème d'ownership concret identifié, cf. TS-30) — pas à tout le
sous-domaine « invitation » : la table `StaffInvitation`, l'envoi
d'email, et la page `/invite/[token]` restent dans `superadmin`. Les
déplacer vers `sso` reviendrait à transférer une fonctionnalité UI/email
entière entre apps (pas seulement corriger un accès base cross-domaine),
un chantier de nature différente et plus large que ce qui a été traité
ici. `createClubUser` (`clubAccounts.ts`) — chemin de création "à la
main", déjà remplacé par le flux d'invitation et non branché à l'UI
actuelle (voir son commentaire dans le code) — n'a pas été migré : code
mort, hors périmètre.

## TS-54 — API Identity interne

**Statut :** 🔄 Livré pour le cycle de vie du compte, staff-invitations non traité

Exemples du critère original :

```text
POST /internal/staff-invitations   ⏳ non traité (voir note ci-dessus)
POST /internal/users/:id/disable   ✅
POST /internal/users/:id/enable    ✅
GET  /internal/users/:id           ✅
```

Complété par ce qui manquait pour couvrir les usages réels de
`superadmin` (`clubAccounts.ts` gère aussi le rôle et le mot de passe, pas
seulement l'activation) :

```text
POST   /internal/users              — création (sso/src/app/api/internal/users)
PATCH  /internal/users/:id          — isActive/role/password
DELETE /internal/users/:id
```

`/disable` et `/enable` sont des raccourcis sur `PATCH { isActive }`, pas
une logique dupliquée. Authentification service (`x-api-key`,
`SSO_SERVICE_API_KEY`, même pattern que `MATCHSHEET_SERVICE_API_KEY` /
`ServiceAuthGuard` de marketplace-api/notification-api) via
`sso/src/lib/serviceAuth.ts` — mêmes contours que
`matchsheet/src/lib/serviceAuth.ts` (TS-31), jamais une session SSO
utilisateur. Une désactivation ou un changement de mot de passe
incrémente `User.tokenVersion` (révoque les sessions déjà émises pour ce
compte, même principe que `sso/src/lib/passwordReset.ts`) — amélioration
par rapport au comportement précédent, qui ne le faisait pas.

Tests : `sso/src/lib/identityService.test.ts` (12 cas), les 5 fichiers de
route sous `sso/src/app/api/internal/users/` (17 cas), et côté
`superadmin` : `identityClient.test.ts` (5 cas), `clubAccounts.test.ts` (5
cas), `staffInvitations.test.ts` (6 cas) — 45 tests au total sur ce
chantier.

---

# EPIC E18 — API Gateway

**Priorité : P3**  
**Statut :** ⏳ À faire après création des API de domaine

À faire **après** E02 (Marketplace API) et une fois que chaque domaine a un owner clairement défini.

## TS-55 — Créer Gateway

Possibilités :

- Kong ;
- Traefik ;
- Nginx ;
- NestJS gateway léger ;
- APISIX.

Le gateway ne contient pas la logique métier.

### Routes proposées

```text
/api/auth/*          → sso
/api/clubs/*         → club API
/api/matches/*       → match API
/api/tickets/*       → ticketing
/api/marketplace/*   → marketplace-api
/api/payments/*      → payment-api
/api/notifications/* → notification-api
/api/referees/*      → arbinote
```

## TS-56 — Auth centralisée gateway

Le gateway peut :

- vérifier signature JWT ;
- limiter les requêtes ;
- propager correlation ID ;
- gérer CORS.

Les autorisations métiers restent dans les services.

### Note importante

**Ne pas commencer par le gateway** : le problème actuel n'est pas l'absence d'URL API unique, mais le fait que certains domaines n'ont pas encore un propriétaire/API clairement définis. Une fois Marketplace, Ticketing, Identity et Match correctement séparés, le gateway devient simple à ajouter et réellement utile.

---

# EPIC E19 — Observabilité

**Priorité : P3**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- Correlation ID (TS-57) et logs structurés (TS-58) livrés pour les 3 API
  NestJS (`payment-api`, `notification-api`, `marketplace-api`) — les 6
  apps Next.js (arbinote/matchsheet/superadmin/teamManager/ob/billetterie)
  et `sso` n'en bénéficient pas encore (voir note sous TS-57).
- TS-59 (métriques) reste hors périmètre : nécessite un backend de
  métriques réel (Prometheus, Datadog…) à provisionner, cohérent avec la
  note déjà présente ailleurs dans ce document (« Monitoring/alerting
  externe absent, suppose outil externe à provisionner »).

## TS-57 — Correlation ID

**Statut :** 🔄 Livré pour les 3 API NestJS uniquement

Chaque requête :

```text
X-Correlation-Id
```

Exemple :

```text
OB (ID: 123) → Marketplace → Payment API → Notification API
```

Tous les logs portent le même `123`.

`CorrelationIdMiddleware` (dupliqué dans les 3 apps sous
`src/common/correlation/`, comme le reste des petits utilitaires
NestJS de ce dépôt — pas de package partagé entre apps déployées
indépendamment) : reprend `X-Correlation-Id` de la requête entrante s'il
existe (propagé par un appelant amont), sinon en génère un nouveau ; le
renvoie dans la réponse ; le rend disponible à tout code exécuté pendant
le traitement de la requête via `AsyncLocalStorage`
(`correlation-context.ts`) — sans avoir à le faire transiter en paramètre
explicite de chaque fonction/service.

### Limite assumée

- Pas branché sur les 6 apps Next.js ni sur `sso` — seulement les 3 API
  NestJS qui se répondent déjà entre elles par HTTP.
- Pas propagé sur les appels HTTP *sortants* de `payment-api` vers
  `billetterie` (webhook, `WebhookDispatchService`) ni vers
  `notification-api` (`NotificationClientService`) : ces deux appels
  partent du worker `OutboxWorkerService` (poll toutes les 5s), détaché de
  toute requête HTTP entrante — il n'y a donc pas de `correlationId` en
  cours à propager à ce point de la chaîne (l'`AsyncLocalStorage` ne
  survit pas au-delà du traitement de la requête qui l'a créé). Fermer ce
  point nécessiterait de stocker le `correlationId` sur `OutboxEvent` à sa
  création, hors périmètre de cette passe.

## TS-58 — Structured logging

**Statut :** ✅ Livré pour les 3 API NestJS

Exemple :

```json
{
  "service": "payment-api",
  "event": "payment_confirmed",
  "paymentId": "...",
  "orderId": "...",
  "correlationId": "..."
}
```

`StructuredLoggerService` (`src/common/logging/`, dupliqué dans les 3
apps) étend `ConsoleLogger` (Nest 11, sortie JSON native via `{ json:
true }`) et ajoute `service` (nom fixe de l'app) et `correlationId` (TS-57,
lu depuis `AsyncLocalStorage`, absent hors traitement de requête — ex:
bootstrap, job planifié). Remplace le logger par défaut via
`NestFactory.create(AppModule, { logger: new StructuredLoggerService(...) })`
dans `main.ts` : le reste du code continue d'utiliser `new
Logger(MyClass.name)` sans modification, Nest route tout vers cette
implémentation. Pas de champ `event` dédié comme dans l'exemple du
critère original — le `message` texte existant (`Logger.log('Payment ...
confirmed')`) reste le contenu principal, un champ `event` structuré à
part entière nécessiterait de revoir chaque site d'appel `Logger.log(...)`
individuellement, hors périmètre de cette passe.

Tests : `correlation-id.middleware.spec.ts` (4 cas) et
`structured-logger.service.spec.ts` (3 cas) par app, soit 21 tests au
total sur les 3 API.

## TS-59 — Métriques

**Statut :** ⏳ À faire

Mesurer :

- paiements réussis/échoués ;
- webhook failures ;
- notifications failed ;
- queue delay ;
- ticket scan rejects ;
- vote anomaly rate ;
- DB errors.

Nécessite un backend de métriques provisionné (Prometheus + Grafana,
Datadog…) avant de pouvoir instrumenter le code de façon utile — non
traité ici (même limite que le monitoring/alerting des healthchecks,
déjà documentée ailleurs dans ce fichier).

---

# EPIC E20 — Event Bus

**Priorité : P3**  
**Statut :** ⏳ À faire

Technologies possibles :

```text
RabbitMQ
NATS
Kafka
Redis Streams
```

Pour le volume actuel, RabbitMQ ou NATS serait probablement suffisant avant d'envisager Kafka.

## TS-60 — Événements match

```text
match.created
match.rescheduled
match.started
match.finished
match.cancelled
```

## TS-61 — Événements live

```text
match.goal.created
match.card.created
match.substitution.created
match.injury.created
```

## TS-62 — Événements commerce

```text
order.created
order.paid
order.shipped
order.delivered
order.refunded
```

## TS-63 — Événements marketplace

```text
product.submitted
product.approved
product.rejected

seller-order.created
seller-order.shipped

payout.created
payout.paid
```

---

# Circuits inter-projets critiques à fermer

Ces flux traversent plusieurs projets et restent incomplets, fragiles ou non audités de bout en bout.

## Référentiel sportif → feuille de match → résultats publics

### État actuel

- `superadmin` crée les fédérations/ligues/saisons/journées/matchs.
- `matchsheet` fait évoluer `matches.status` vers `IN_PROGRESS`/`FINISHED`.
- Statut `CANCELLED` existe côté `superadmin`.

### Reste à faire

- Annulation de match implémentée comme action simple, mais pas comme processus complet.
- Pas de cascade métier : fermeture/gel de la feuille, arrêt des ventes, remboursement/avoir des billets, message aux acheteurs, trace métier unique.
- Réouverture d'un match `FINISHED` en place (motif requis, audit horodaté, notification aux clubs) ✅
- Reste un geste manuel au cas par cas : pas de règle produit sur qui peut/doit demander une réouverture, ni de délai limite.
- Données live (goals, cards, injuries, substitutions) → `ob` sans contrat d'API/versionnement.

## Billetterie / paiement / contrôle d'accès

### État actuel ✅

- Parcours achat complet : `billetterie` → `payment-api` → webhook signé → billets `PAID`.
- Webhook applicatif en place (HMAC-SHA256, réconciliation via lecture API).
- File d'événement/retry persistante côté `payment-api` (TS-12/TS-13 : outbox transactionnel, calendrier 1min→5min→15min→1h→6h puis DLQ).
- Idempotence du webhook côté `billetterie` (TS-14 : eventId mémorisé).
- Scanner v1 + caméra + mode offline livré.
- QR signé, double scan détecté, journal d'entrée.

### Reste à faire

- Autres apps (`ob`, `teamManager`, `sellerPortal`) n'ont pas d'URL dans `WEBHOOK_URLS` — polling pur.
- Annulation de match non reliée à `payment-api` : remboursements, avoirs, notifications, rapprochement comptable absent.
- Lecture caméra + mode offline jamais testés en conditions réelles (pas de caméra/réseau réels).

## Notifications plateforme

### État actuel

- `notification-api` centralise préférences, templates, queue et canaux ✅
- Paiements confirmés : événements branchés ✅
- Push Web et FCM fonctionnent ✅

### Reste à faire

- Catalogue d'événements inter-projets non figé.
- Convocations/compositions/sponsors, billetterie, marketplace, modération de votes, sécurité SSO, actions `superadmin` : non tous branchés avec `eventId` idempotents.
- Modules de notification internes (`teamManager`, `sellerPortal`) coexistent — pas de gouvernance.
- SMS : provider Tunisiesms disponible (TS-44), inactif tant que `SMS_PROVIDER=tunisiesms` n'est pas configuré en production (décision produit documentée).
- FCM jamais testé avec vrai compte Firebase.
- Monitoring/alerting externe absent (suppose outil externe à provisionner).

## Marketplace / boutique / seller portal

### État actuel

- `teamManager` a tunnel d'achat client complet ✅ (`/boutique/[teamId]` : panier, paiement réel, décrément stock, webhook + retour payeur, suivi commande).
- `sellerPortal` et `teamManager` appellent `marketplace-api` en HTTP pour toute écriture produit/modération ✅ (TS-04) — plus d'accès cross-DB ni d'écriture TypeORM directe sur `sp_products`/`sp_sellers` depuis ces deux apps.
- Modération club des produits vendeurs fermée ✅ (`teamManager` : `/admin/marketplace/products`, via `marketplace-api` — voir Epic E03).
- `marketplace-api` créée ✅ (NestJS, base **partagée `foot`**, tables `sp_*` existantes) : auth vendeur, catalogue, catégories, modération, notifications interne, scaffolding variantes/stock/commandes/retours/payouts — voir Epic E02/TS-03/TS-04.

### Reste à faire

- Pas de frontend d'achat marketplace unifié entre `teamManager` et `sellerPortal`.
- Pas de circuit vendeur → payout fermé.
- `sellerPortal` utilise session propre (`SP_JWT_SECRET`) au lieu du SSO commun — pas de MFA, pas de révocation centrale.
- Paiements directs, transporteur/logistique, payout automatique, enchères, abonnement publicité : tous hors périmètre actuel.
- Pas d'intégration `payment-api`/`notification-api` pour cycle commande vendeur.

## Données partagées / migrations / déploiement

### État actuel

- Migrations SQL dispersées dans les apps, mais `db/migrate.sh` + `db/migrations.manifest` donnent un ordre reproductible ✅
- Table de version globale `schema_migrations` ✅
- Logique testée via harnais simulation docker/mariadb, jamais exécutée contre vrai `mariadb_container`.

### Reste à faire

- Valider logique en conditions réelles (`--baseline` d'abord sur base de dev existante).
- Tests de contrat inter-projets et validations CI manquants : plusieurs apps peuvent écrire/dépendre d'un même domaine (ex: `Card`, `matches.status`).
- Domaines publics, reverse proxy/API gateway, secrets production, backups/restores, monitoring `/health` : tous hors repo.
- Processus d'exploitation complet non fermé.

---

# Reste à faire, par projet

## `sso`

```text
✅ Codage/validation JWT
✅ Module base
⏳ Migration HS256 → asymétrique
✅ Configurer fail-open / fail-closed (par app, packages/auth-shared)
✅ Ajouter audience JWT (aud = foot-platform)
✅ Tests complets (login, MFA, reset, tokenVersion, introspection, logout)
🔄 Déplacer invitation staff dans SSO — écriture User migrée (TS-53), sous-domaine invitation (table/email/UI) toujours dans superadmin
✅ API Identity interne (TS-54) — création/lecture/isActive/role/password/suppression, service-à-service
```

## `superadmin`

```text
✅ Création fédérations/ligues/saisons/journées/matchs
✅ Réouverture match FINISHED (motif, audit, notification)
⏳ Annulation de match en tant que processus complet
✅ Ne plus écrire directement tables Matchsheet (TS-31 : réouverture passe par matchsheetClient → matchsheet)
✅ Ne plus écrire directement dans User (TS-53 : identityClient → sso pour création/activation/rôle/mot de passe/suppression des comptes club)
⏳ Contrôles métier avant suppression match
⏳ Améliorer audit inter-domaines
```

## `teamManager`

```text
✅ Boutique client avec paiement réel
✅ Comptes MEMBER reconnus
✅ Modération marketplace (/admin/marketplace/products)
⏳ Facturation sponsors (aucun module comptable)
⏳ Finance/trésorerie
⏳ RGPD (consentement, export, suppression)
⏳ Espace supporter/communauté
⏳ Workflow validation juridique/comptable conventions
⏳ Notifications convocation/composition/sponsor branchées
⏳ Fulfillment boutique (gestion livraison/expédition)
✅ Notifications via outbox (TS-25/TS-26 : publication d'actualité — seul point d'émission existant)
⏳ Réduire accès direct tables externes
✅ Activer tests CI
⏳ Projections discipline depuis événements Matchsheet
```

## `matchsheet`

```text
✅ Services saisie live refusent écriture si CLOSED
✅ Réouverture de feuille editable
✅ actual_started_at / actual_finished_at
⏳ Event publishing
⏳ Réduire écritures dans domaines TeamManager
✅ Activer tests CI
⏳ SSE/WebSocket live event-driven depuis matchsheet (SSE livré côté ob par lecture DB, TS-42 — matchsheet n'émet toujours aucun événement)
⏳ Synchronisation offline écritures
```

## `ob`

```text
✅ 3 événements vers notification-api (profil, push)
⏳ Fiche produit
⏳ Checkout
⏳ Page commandes réelle (actuellement dépendante billetterie)
✅ Live SSE (TS-42/US-43) — repli polling conservé ; pas un event bus matchsheet → ob (TS-41 reste ouvert)
⏳ Intégration future Marketplace API
✅ Tests (TS-36) — pages publiques, live API (polling), restrictions membre, notification actions
```

## `billetterie`

```text
✅ Scanner v1 + caméra + mode offline
✅ QR signé, double scan, journal d'entrée
✅ Webhook post-paiement signé
✅ Idempotence webhook (TS-14, eventId mémorisé)
⏳ Valider caméra/offline en conditions réelles
✅ Contrôle supporter strict (affiliation vérifiée, opt-in par catégorie)
✅ Politique configurable (STRICT/DECLARATIVE)
⏳ Outbox notifications
✅ Tests CI
⏳ Events ticket.purchased / scanned
```

## `arbinote`

```text
✅ Utiliser statut réel match pour autoriser votes
✅ Bloquer CANCELLED
⏳ Vote authentifié (actuellement sans compte)
✅ reviewed_by alimenté
✅ Historique de modération des alertes
⏳ Consommer match events
✅ Corriger lint react-hooks (4 erreurs)
```

## `sellerPortal`

```text
✅ Portail vendeur fonctionnel
✅ Workflow de modération fermé (côté teamManager, cf. `teamManager` ci-dessus)
✅ Migré vers Marketplace API pour les écritures produit (TS-04) — create/update/delete/submit/withdraw/toggle-active
✅ Tests isolation multi-vendeurs (TS-35) — authz + transitions commandes/shipping/stock + délégation produit
⏳ Intégration payment-api
⏳ Intégration notification-api
⏳ Returns API
⏳ Payout API
⏳ Aligner SSO/MFA/révocation/audit avec écosystème
```

## `marketplace-api`

```text
✅ Initialisation NestJS (TS-03) : auth vendeur JWT + clé API service, sellers, categories, products, moderation, notifications interne
✅ Connectée à la base partagée `foot` (tables sp_* existantes, synchronize désactivé)
✅ Catalogue vendeur (US-05)
✅ sellerPortal/teamManager branchés dessus (TS-04) — endpoints internal/products pour sellerPortal, moderation/sellers/categories pour teamManager
✅ Variantes et stock (US-06) — seuil d'alerte bas-stock + désactivation dédiée livrés ; décrément automatique toujours dépendant de seller-orders (E06)
✅ Tests CI (TS-33) — absente de la matrice CI jusqu'ici, ajoutée
✅ Fulfillment seller-orders (TS-20 à US-24) — préparation/prêt à expédier/expédition/livraison
✅ Payouts (US-47 à US-49) — solde, création, transitions, retry/audit ; aucun virement réel (dépend d'une intégration payment-api absente)
✅ Returns (US-50 à US-52) — demande/décision/complétion ; remboursement réel hors périmètre (Refund API absente côté payment-api)
✅ Correlation ID + logs structurés (TS-57/TS-58)
⏳ Swagger
⏳ Business logic orders (toujours scaffolding — E06) ; création de commande toujours hors périmètre (pas de tunnel d'achat marketplace côté frontend)
⏳ Jamais démarré contre une vraie base MariaDB (pas de Docker/MariaDB dans ce bac à sable)
⏳ Unification identité vendeur avec sellerPortal (double auth, voir Epic E17)
```

## `payment-api`

```text
✅ Webhook applicatif signé
✅ Reconciliation webhook + retour payeur
✅ Transactional outbox (TS-12)
✅ Retry callback durable (TS-13, 1min→5min→15min→1h→6h puis DLQ)
✅ DLQ (statut FAILED en base) — monitoring/alerting externe hors périmètre (voir E19)
✅ Correlation ID + logs structurés (TS-57/TS-58) — pas propagé sur les appels sortants de l'outbox worker (voir note E19/TS-57)
⏳ Configurer webhooks pour autres apps (ob, teamManager, sellerPortal)
⏳ Refund API
⏳ Payout provider abstraction
⏳ État comptable exploitable
```

## `notification-api`

```text
✅ Centralisation préférences/templates/queue/canaux
✅ Push Web et FCM
⏳ Fiabilisation ingress (outbox apps → notification-api)
⏳ Gouvernance événements (catalogue, destinataires, templates)
✅ SMS Tunisiesms (TS-44/45/46) — inactif tant que SMS_PROVIDER=tunisiesms n'est pas configuré en prod
✅ Correlation ID + logs structurés (TS-57/TS-58)
⏳ Delivery reporting
⏳ Métriques (TS-59, nécessite un backend de métriques provisionné)
⏳ FCM tester avec vrai compte Firebase
⏳ Monitoring/alerting externe (Datadog, Uptime Kuma…)
```

## `arbinote` (site statique)

```text
⏳ Pas de synchronisation offline ni file retry
```

## Infra / `db`

```text
✅ db/backup.sh / db/restore.sh (dump + uploads)
✅ db/migrate.sh + db/migrations.manifest (ordre reproductible)
⏳ Valider backup/restore en conditions réelles
⏳ Valider migrate.sh contre vrai mariadb_container
⏳ Passerelle API unique
⏳ Domaines de production configurés
⏳ Séparation des bases par domaine complétée
⏳ Monitoring/alerting des healthchecks
⏳ Modèle multi-club complété (staff multi-club)
```

---

# Roadmap proposée

## Sprint 1 — Cohérence et sécurité critique

```text
✅ TS-33 tests CI existants (activé)
✅ US-01 ArbiNote status réel
✅ TS-02 actualStartedAt
✅ TS-39 reviewed_by
```

## Sprint 2 — Marketplace fondations

```text
✅ TS-03 marketplace-api (NestJS)
✅ US-05 catalogue vendeur
✅ TS-04 bascule sellerPortal/teamManager vers marketplace-api
✅ US-06 variantes/stock (seuil d'alerte + désactivation dédiée ; décrément auto reste dépendant de E06)
```

## Sprint 4 — Paiement fiable

```text
✅ TS-12 payment outbox
✅ TS-13 retry durable
✅ TS-14 consumer idempotency (billetterie)
```

## Sprint 5 — Fulfillment boutique

```text
✅ TS-20 order statuses
✅ US-21 preparing
✅ US-22 ready
✅ US-23 shipped
🔄 US-24 delivered (transition livrée, notification membre hors périmètre)
```

## Sprint 6 — Sécurité / découplage

```text
⏳ TS-27 asymmetric JWT
✅ TS-28 aud
✅ TS-29 fail mode
⏳ TS-30 ownership
🔄 TS-31 cross-domain cleanup (premier cas traité : reopenMatchAdmin)
```

## Sprint 7+ — Architecture événementielle

```text
⏳ Event Bus
⏳ Outbox généralisée
⏳ SSE live
⏳ Marketplace returns
⏳ Payouts
⏳ SMS
⏳ Observability
⏳ API Gateway
```

---

# Priorités immédiates recommandées

1. ~~Corriger ArbiNote / statut réel du match (US-01, TS-02)~~ ✅ Livré (12/08/2026).
2. ~~Activer les tests existants dans la CI (TS-33)~~ ✅ Livré (12/08/2026).
3. ~~Introduire Transactional Outbox dans Payment API (TS-12)~~ ✅ Livré (12/08/2026, avec TS-13 retry durable).
4. ~~Compléter le fulfillment des commandes (TS-20 à US-24)~~ ✅ Livré côté `marketplace-api` (12/08/2026) — reste : tunnel d'achat marketplace multi-vendeurs côté frontend et notification membre à la livraison (voir Epic E06/E07).
5. 🔄 **Sécuriser le SSO (TS-27, TS-28, TS-29)** — TS-28 (audience) et TS-29 (fail-open/closed configurable) livrés (12/08/2026) ; TS-27 (signature asymétrique) reste à faire, voir la note sous TS-27 (migration de secret coordonnée sur 7 services, hors périmètre de cette passe).
6. 🔄 **Découpler progressivement les accès directs à la base (TS-31)** — premier cas traité (12/08/2026, `reopenMatchAdmin`), reste à généraliser au fur et à mesure que d'autres cas apparaissent.
7. Seulement ensuite, mettre en place **Event Bus + API Gateway**.

### Point important

**Ne pas commencer immédiatement par le Gateway** : le problème actuel n'est pas l'absence d'une URL API unique, mais le fait que certains domaines n'ont pas encore un propriétaire/API clairement définis. Une fois Marketplace, Ticketing, Identity et Match correctement séparés, le gateway devient simple à ajouter et réellement utile.

---

# Notes méthodologiques

Ce document fusionne :

1. **Backlog produit/technique** (structure Epics → User Stories / Technical Stories → critères d'acceptation → priorité → dépendances)
2. **Audit fonctionnel** (état du code au 12/08/2026, ce qui est livré vs ce qui reste à faire)

Chaque élément porte un statut :

- **✅ Livré** : fonctionnalité complète et testée (ou testée partiellement dans le sandbox)
- **🔄 Partiellement implémenté** : structure en place, reste des éléments à compléter
- **⏳ À faire** : élément identifié mais pas encore commencé

Le document reste un backlog exploitable : seul ce qui reste ouvert est priorisé pour les sprints. Le contexte sur *comment* un point fermé a été traité est consultable dans l'historique git.
