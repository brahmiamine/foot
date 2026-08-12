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
| P0 | E04 – Fiabilité événements paiement | ⏳ | garantir les événements post-paiement via outbox transactionnel |
| P1 | E05 – Boutique OB | ✅ | fermer le parcours catalogue → achat → commande |
| P1 | E06 – Fulfillment boutique | ⏳ | gérer préparation, expédition, livraison et retours |
| P1 | E07 – Notifications fiables | ⏳ | éviter la perte d'événements métiers via outbox |
| P1 | E08 – Sécurisation SSO | ⏳ | réduire les risques liés à HS256/fail-open |
| P1 | E09 – Ownership des domaines | ⏳ | réduire les écritures DB cross-projects |
| P1 | E10 – CI et tests | 🔄 | exécuter les tests existants sur tous les projets |
| P1 | E11 – Billetterie supporters | 🔄 | renforcer le contrôle de l'audience avec scanner/offline |
| P2 | E12 – ArbiNote audit | ✅ | compléter traçabilité et modération |
| P2 | E13 – Live temps réel | ⏳ | remplacer progressivement le polling par SSE/WebSocket |
| P2 | E14 – SMS | ⏳ | finaliser le canal SMS (stub actuellement) |
| P2 | E15 – Payout Marketplace | ⏳ | automatiser les paiements vendeurs |
| P2 | E16 – Returns Marketplace | ⏳ | fermer le workflow des retours |
| P2 | E17 – Identity API | ⏳ | déplacer la gestion des comptes vers SSO |
| P3 | E18 – API Gateway | ⏳ | fournir une entrée API globale |
| P3 | E19 – Observabilité | ⏳ | correlation ID, logs, métriques et traces |
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
- Pas de remboursements ni de payouts.
- Pas d'état comptable exploitable.
- Notifications limitées à `PAYMENT_SUCCEEDED` si `userId` fourni.

## TS-12 — Implémenter Transactional Outbox dans Payment API

Aujourd'hui :

```text
Payment → PAID → EventEmitter → webhook / notification
```

Cible :

```text
BEGIN TRANSACTION
  Payment → PAID
  OutboxEvent → PAYMENT_PAID
COMMIT
```

Worker :

```text
outbox → notification-api → business webhook
```

### Table

```text
payment_outbox_events

id
event_type
aggregate_id
payload
status
attempts
next_retry_at
created_at
processed_at
last_error
```

## TS-13 — Retry durable des callbacks métiers

Remplacer les 2 retries courts en mémoire par :

```text
1 min → 5 min → 15 min → 1 h → 6 h → ...
```

avec DLQ ou statut `FAILED`.

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
**Statut :** ⏳ À faire

## TS-20 — Étendre les statuts commande

Cible :

```text
PENDING_PAYMENT → PAID → PREPARING → READY_TO_SHIP → SHIPPED → DELIVERED
                                                             ↘ CANCELLED
                                                             ↘ RETURN_REQUESTED → RETURNED → REFUNDED
```

## US-21 — Préparer une commande

```text
PAID → PREPARING
```

## US-22 — Marquer prête à expédier

```text
PREPARING → READY_TO_SHIP
```

## US-23 — Expédier

Informations obligatoires :

```text
carrier
trackingNumber
shippedAt
```

Transition :

```text
READY_TO_SHIP → SHIPPED
```

## US-24 — Livraison

```text
SHIPPED → DELIVERED
```

Notification membre.

---

# EPIC E07 — Notifications métiers fiables

**Priorité : P1**  
**Statut :** 🔄 Partiellement implémenté

### État actuel

- `notification-api` centralise préférences, templates, queue et canaux ✅
- Chaque application métier doit décider quoi émettre — catalogue d'événements inter-projets non figé.
- Paiements confirmés : événements branchés ✅
- Convocations/compositions/sponsors, billetterie, marketplace, modération de votes, sécurité SSO, actions `superadmin` : non tous branchés avec `eventId` idempotents.
- Modules de notification internes (`teamManager`, `sellerPortal`) coexistent avec `notification-api` — pas de règle de gouvernance.
- Push Web et FCM fonctionnent pour apps branchées ✅
- SMS reste un stub — `NotImplementedSmsProvider` lève une erreur explicite (décision produit).
- FCM jamais testé en conditions réelles (pas de credentials Firebase).

## TS-25 — Ajouter une outbox aux applications critiques

Priorité :

1. TeamManager ;
2. Superadmin ;
3. Matchsheet ;
4. Billetterie.

Au lieu d'un appel `notify(...)` best-effort :

```text
transaction métier + notification_outbox
```

## TS-26 — Worker de publication Notification API

```text
local outbox → POST notification-api → 200 / idempotent → mark processed
```

---

# EPIC E08 — Sécurité SSO

**Priorité : P1**  
**Statut :** ⏳ À faire

### État actuel

- SSO avec HS256 (symétrique) — risque : applications clientes peuvent signer des tokens.
- Aucune audience JWT.
- Fail-open par défaut (révocation SSO en échec = accès permis).

## TS-27 — Migrer HS256 vers signature asymétrique

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

## TS-28 — Ajouter `aud` (audience)

Ajouter :

```text
iss = foot-sso
aud = foot-platform
```

voire audiences différentes :

```text
team-manager, matchsheet, superadmin
```

## TS-29 — Rendre fail-open / fail-closed configurable

Configuration :

```text
SSO_REVOCATION_FAILURE_MODE=open|closed
```

Recommandation :

| App | Mode |
|---|---|
| OB public/member | éventuellement open |
| TeamManager | closed |
| Matchsheet | closed |
| Superadmin | closed |

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
| marketplace | Marketplace API | ⏳ À créer |
| payments | Payment API | ✅ Clair |
| notifications | Notification API | ✅ Clair |

## TS-31 — Supprimer progressivement les écritures cross-domain

Exemple actuel :

```text
Superadmin → ms_sheets
```

Cible :

```text
Superadmin → Match API → Matchsheet
```

### Points à traiter

- Superadmin écrit directement `ms_sheets` et autres tables Matchsheet.
- Plusieurs apps écrivent ou dépendent d'un même domaine (ex: `Card`, `matches.status`).
- Tests de contrat inter-projets et validations CI manquants.

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
**Statut :** 🔄 En cours

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

**Statut :** ⏳ À faire

Tester :

- login ;
- MFA ;
- reset password ;
- tokenVersion ;
- introspection ;
- logout everywhere.

## TS-35 — Tests SellerPortal

**Statut :** ⏳ À faire

Tester :

- isolation vendeurs ;
- accès croisé refusé ;
- transitions produits ;
- transitions commandes ;
- stock ;
- shipping.

## TS-36 — Tests OB

**Statut :** ⏳ À faire

Tester au minimum :

- pages publiques ;
- restrictions membre ;
- live API ;
- notification actions.

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
**Statut :** ⏳ À faire

### État actuel

- Données live (goals, cards, injuries, substitutions) alimentent `ob` en lecture.
- Pas de contrat d'API/versionnement entre `matchsheet` et frontends publics.
- Un changement de schéma peut casser le live sans garde.
- Pas de synchronisation offline des écritures côté stade.

## TS-41 — Créer événements live

```text
GOAL_CREATED
CARD_CREATED
SUBSTITUTION_CREATED
INJURY_CREATED
MATCH_STARTED
MATCH_FINISHED
```

## TS-42 — Ajouter SSE

Première étape :

```text
GET /matches/:id/events/stream
```

## US-43 — Mettre à jour OB instantanément

```text
Matchsheet → event → SSE → OB
```

Polling conservé comme fallback.

---

# EPIC E14 — SMS

**Priorité : P2**  
**Statut :** ⏳ À faire

### État actuel

- SMS reste un stub dans `notification-api`.
- `NotImplementedSmsProvider` lève une erreur explicite (décision produit).
- Notifications critiques en SMS ne doivent pas être promises commercialement.

## TS-44 — Intégrer Tunisiesms

Dans `notification-api` :

```text
SmsChannel → TunisieSmsProvider
```

Configuration :

```text
SMS_PROVIDER
SMS_API_URL
SMS_API_KEY
SMS_SENDER
```

## TS-45 — Ajouter normalisation téléphone

Format cible :

```text
+216XXXXXXXX
```

avec validation E.164.

## TS-46 — Tests provider

- succès ;
- 4xx ;
- 5xx ;
- timeout ;
- retry.

---

# EPIC E15 — Payout Marketplace

**Priorité : P2**  
**Statut :** ⏳ À faire

### État actuel

- Payouts affichés côté vendeur : déclaratifs, lecture seule.
- Aucun déclenchement de virement.
- Aucune preuve de paiement vendeur.
- Aucun rapprochement avec `payment-api`.

## US-47 — Calculer solde vendeur

```text
orders delivered - returns - refunds - club commission = available balance
```

## US-48 — Créer payout

```text
PENDING → PROCESSING → PAID
```

## US-49 — Gérer échec payout

```text
PROCESSING → FAILED
```

avec :

- raison ;
- retry ;
- audit.

---

# EPIC E16 — Returns Marketplace

**Priorité : P2**  
**Statut :** ⏳ À faire

## US-50 — Client demande retour

```text
DELIVERED → RETURN_REQUESTED
```

## US-51 — Marketplace traite retour

```text
REQUESTED → APPROVED ou REJECTED
```

## US-52 — Produit retourné

```text
APPROVED → COMPLETED → refund
```

---

# EPIC E17 — Centraliser Identity

**Priorité : P2**  
**Statut :** ⏳ À faire

## TS-53 — Déplacer invitation staff vers SSO

Aujourd'hui :

```text
Superadmin → password hash → User
```

Cible :

```text
Superadmin → POST SSO/internal/invitations → SSO
```

## TS-54 — API Identity interne

Exemples :

```text
POST /internal/staff-invitations
POST /internal/users/:id/disable
POST /internal/users/:id/enable
GET  /internal/users/:id
```

Avec service authentication.

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
**Statut :** ⏳ À faire

## TS-57 — Correlation ID

Chaque requête :

```text
X-Correlation-Id
```

Exemple :

```text
OB (ID: 123) → Marketplace → Payment API → Notification API
```

Tous les logs portent le même `123`.

## TS-58 — Structured logging

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

## TS-59 — Métriques

Mesurer :

- paiements réussis/échoués ;
- webhook failures ;
- notifications failed ;
- queue delay ;
- ticket scan rejects ;
- vote anomaly rate ;
- DB errors.

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
- Scanner v1 + caméra + mode offline livré.
- QR signé, double scan détecté, journal d'entrée.

### Reste à faire

- File d'événement/retry persistant au-delà des 2 tentatives en mémoire.
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
- SMS : stub (décision produit documentée).
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
⏳ Configurer fail-open / fail-closed
⏳ Ajouter audience JWT
⏳ Tests complets (login, MFA, reset, tokenVersion, introspection, logout)
⏳ Déplacer invitation staff dans SSO
⏳ API Identity interne
```

## `superadmin`

```text
✅ Création fédérations/ligues/saisons/journées/matchs
✅ Réouverture match FINISHED (motif, audit, notification)
⏳ Annulation de match en tant que processus complet
⏳ Ne plus écrire directement tables Matchsheet
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
⏳ Notifications via outbox
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
⏳ SSE/WebSocket live
⏳ Synchronisation offline écritures
```

## `ob`

```text
✅ 3 événements vers notification-api (profil, push)
⏳ Fiche produit
⏳ Checkout
⏳ Page commandes réelle (actuellement dépendante billetterie)
⏳ Live SSE
⏳ Intégration future Marketplace API
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
⏳ Tests isolation multi-vendeurs
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
⏳ Swagger
⏳ Business logic orders/seller-orders/returns/payouts (actuellement scaffolding — E06/E15/E16)
⏳ Jamais démarré contre une vraie base MariaDB (pas de Docker/MariaDB dans ce bac à sable)
⏳ Unification identité vendeur avec sellerPortal (double auth, voir Epic E17)
```

## `payment-api`

```text
✅ Webhook applicatif signé
✅ Reconciliation webhook + retour payeur
⏳ Transactional outbox
⏳ Retry callback durable (au-delà des 2 retries mémoire)
⏳ DLQ / monitoring
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
⏳ SMS Tunisiesms
⏳ Delivery reporting
⏳ Métriques / observabilité
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
⏳ TS-12 payment outbox
⏳ TS-13 retry durable
✅ TS-14 consumer idempotency (billetterie)
```

## Sprint 5 — Fulfillment boutique

```text
⏳ TS-20 order statuses
⏳ US-21 preparing
⏳ US-22 ready
⏳ US-23 shipped
⏳ US-24 delivered
```

## Sprint 6 — Sécurité / découplage

```text
⏳ TS-27 asymmetric JWT
⏳ TS-28 aud
⏳ TS-29 fail mode
⏳ TS-30 ownership
⏳ TS-31 cross-domain cleanup
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
2. **Activer les tests existants dans la CI (TS-33)** avant d'entreprendre les gros refactorings.
3. **Introduire Transactional Outbox dans Payment API (TS-12)**.
4. **Compléter le fulfillment des commandes (TS-20 à US-24)**.
5. **Sécuriser le SSO (TS-27, TS-28, TS-29)** : risques identifiés.
6. **Découpler progressivement les accès directs à la base (TS-31)**.
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
