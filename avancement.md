# Backlog & Avancement — Plateforme `foot`

**État du code vérifié : 12/08/2026**

Ce document fusionne le backlog produit/technique avec l'audit fonctionnel du code source du dépôt `brahmiamine/foot` (11 apps partageant MariaDB `foot`). Pour chaque élément, un statut indique ce qui est **✅ Livré**, en **🔄 Cours**, ou **⏳ À faire**.

Les correctifs déjà livrés restent documentés pour traçabilité, mais seul ce qui reste ouvert est priorisé pour les sprints.

---

## Vue d'ensemble du backlog

| Priorité | Epic | Statut | Objectif |
|---|---|---|---|
| P0 | E01 – Cohérence Match / ArbiNote | ⏳ | empêcher les votes sur matchs non réellement commencés |
| P0 | E02 – Marketplace API | ⏳ | compléter le domaine marketplace multi-vendeurs |
| P0 | E03 – Modération Marketplace | ⏳ | permettre au club de valider/rejeter les produits vendeurs |
| P0 | E04 – Fiabilité événements paiement | ⏳ | garantir les événements post-paiement via outbox transactionnel |
| P1 | E05 – Boutique OB | ✅ | fermer le parcours catalogue → achat → commande |
| P1 | E06 – Fulfillment boutique | ⏳ | gérer préparation, expédition, livraison et retours |
| P1 | E07 – Notifications fiables | ⏳ | éviter la perte d'événements métiers via outbox |
| P1 | E08 – Sécurisation SSO | ⏳ | réduire les risques liés à HS256/fail-open |
| P1 | E09 – Ownership des domaines | ⏳ | réduire les écritures DB cross-projects |
| P1 | E10 – CI et tests | 🔄 | exécuter les tests existants sur tous les projets |
| P1 | E11 – Billetterie supporters | 🔄 | renforcer le contrôle de l'audience avec scanner/offline |
| P2 | E12 – ArbiNote audit | ⏳ | compléter traçabilité et modération |
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

## US-01 — Utiliser le statut réel du match pour autoriser les votes

**Projet :** `arbinote`  
**Statut :** ⏳ À faire

### Problème

La fonction `canVoteMatch()` utilise actuellement `arbitre attribué + date programmée dépassée de 30 minutes`. Elle n'utilise pas `matches.status`.

### User Story

> En tant que plateforme ArbiNote, je veux autoriser un vote uniquement lorsqu'un match a réellement commencé afin d'empêcher les votes prématurés ou sur un match annulé.

### Règle cible

```text
arbitre_id != null
AND status IN (IN_PROGRESS, FINISHED)
AND actual_started_at + 30 min <= now
```

### Critères d'acceptation

- `UPCOMING` → vote impossible.
- `CANCELLED` → vote impossible.
- `IN_PROGRESS` depuis moins de 30 minutes → impossible.
- `IN_PROGRESS` depuis au moins 30 minutes → possible.
- `FINISHED` → possible selon la politique de délai.
- les règles sont contrôlées côté API, pas uniquement côté frontend.
- tests unitaires présents.

### Notes d'avancement

- Vote actuellement sans compte : repose sur empreinte appareil/cookie, pas d'authentification.
- 4 erreurs de lint react-hooks non traitées : `HomeClient`, `LiveMatchBadge`, `ThemeToggle`, `VotedBadge`.

## TS-02 — Ajouter l'heure réelle de début du match

**Projet :** `matchsheet` / référentiel `matches`  
**Statut :** ⏳ À faire

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

- l'heure programmée reste séparée de l'heure réelle ;
- une réouverture de feuille ne doit pas écraser l'heure initiale sans règle explicite.

### Notes d'avancement

- Les services de saisie live (`CardEventService`, `GoalService`, `InjuryService`, `SubstitutionService`) refusent désormais toute écriture quand la feuille est `CLOSED` ✅
- Une feuille rouverte par `superadmin` redevient éditable ✅
- Réouverture d'un match `FINISHED` en place : motif requis, audit horodaté, notification aux clubs ✅

---

# EPIC E02 — Marketplace API

**Priorité : P0**  
**Statut :** ⏳ À créer

Créer un nouveau projet backend :

```text
marketplace-api
```

Recommandation : **NestJS**, comme `payment-api` et `notification-api`.

### État actuel

- `sellerPortal` existe avec vendeurs/produits/commandes (`sp_*`) mais pas d'intégration `payment-api`.
- `teamManager` a un tunnel d'achat client complet (`/boutique/[teamId]` : panier, paiement réel via `payment-api`, décrément de stock atomique) ✅
- Pas de frontend d'achat marketplace unifié entre les deux.
- `sellerPortal` utilise une session propre (`SP_JWT_SECRET`) au lieu du SSO commun.

## TS-03 — Initialiser Marketplace API

### Modules

```text
auth
sellers
products
categories
variants
inventory
orders
seller-orders
returns
commissions
payouts
moderation
```

### Critères

- NestJS ;
- validation DTO ;
- Swagger ;
- TypeORM ;
- migrations ;
- healthcheck ;
- API key pour services internes ;
- JWT/SSO adapté selon acteurs.

## TS-04 — Transférer la propriété des produits Marketplace

Aujourd'hui :

```text
sellerPortal → sp_products
```

Cible :

```text
sellerPortal → HTTP → marketplace-api → sp_products
```

### Critères

SellerPortal ne doit plus :

- importer directement l'entité TypeORM `Product` pour écrire ;
- utiliser directement le repository ;
- connaître la structure DB interne marketplace.

## US-05 — Catalogue vendeur

> En tant que vendeur, je veux créer et gérer mes produits via Marketplace API.

Fonctions :

```text
POST   /seller/products
GET    /seller/products
GET    /seller/products/:id
PATCH  /seller/products/:id
DELETE /seller/products/:id
```

## US-06 — Variantes et stock

Fonctions :

- tailles ;
- couleurs ;
- SKU ;
- prix ;
- stock ;
- seuil d'alerte ;
- désactivation.

---

# EPIC E03 — Modération Marketplace club

**Priorité : P0**  
**Statut :** ⏳ À faire

Le workflow produit possède les statuts :

```text
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED
                                  ↘ REJECTED → DRAFT (resubmit)
```

Mais `teamManager` ne ferme pas encore ce processus côté UI/modération.

## US-07 — Liste des produits soumis

**Projet UI :** `teamManager`  
**Backend :** `marketplace-api`  
**Statut :** ⏳ À faire

Ajouter :

```text
/admin/marketplace/products
```

Filtres : vendeur, statut, catégorie, date, nom.

## US-08 — Mettre un produit en review

Transition :

```text
SUBMITTED → UNDER_REVIEW
```

### Critères

- seuls les administrateurs autorisés du club peuvent effectuer l'action ;
- produit appartenant au club courant ;
- audit obligatoire.

## US-09 — Approuver un produit

Transition :

```text
UNDER_REVIEW → APPROVED → PUBLISHED
```

## US-10 — Rejeter un produit

```text
UNDER_REVIEW → REJECTED
```

Informations obligatoires :

```text
rejectionReason
reviewedBy
reviewedAt
```

Notification envoyée au vendeur.

## US-11 — Republier un produit corrigé

```text
REJECTED → DRAFT → SUBMITTED
```

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

Billetterie / TeamManager doivent mémoriser `eventId` afin de garantir :

```text
same event × N retries = 1 traitement métier
```

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

**Statut :** 🔄 Partiellement activé

Activer au minimum pour :

```text
matchsheet
teamManager
billetterie
```

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

- **Audience auto-déclarée** — pas de mécanisme d'identité fiable.

## US-37 — Vérification d'affiliation avant paiement

Pour `HOME_SUPPORTERS` et `AWAY_SUPPORTERS`, ajouter vérification d'affiliation.

### Séquence cible

```text
User → SSO profile → affiliated teams → Ticketing → allowed ?
```

### Critères

- seuls les affiliés à une équipe peuvent acheter billets supporters.
- vérification côté API.

## US-38 — Politique configurable

Ajouter :

```text
audienceValidationMode
```

avec par exemple :

```text
STRICT (affiliation vérifiée)
DECLARATIVE (auto-déclaration)
```

par match ou compétition.

---

# EPIC E12 — Audit ArbiNote

**Priorité : P2**  
**Statut :** ⏳ À faire

## TS-39 — Alimenter `reviewed_by`

**Statut :** ⏳ À faire

Lors d'une résolution d'alerte :

```text
reviewed_by = session.user.id
reviewed_at = now
```

## US-40 — Historique de modération

Afficher :

- admin ;
- date ;
- état précédent ;
- nouvel état ;
- motif.

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
- `sellerPortal` reste séparé (vendeurs/produits/commandes `sp_*`, pas d'intégration `payment-api`).

### Reste à faire

- Aucune Marketplace API dédiée (recommandé NestJS).
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
⏳ Facturation sponsors (aucun module comptable)
⏳ Finance/trésorerie
⏳ RGPD (consentement, export, suppression)
⏳ Espace supporter/communauté
⏳ Workflow validation juridique/comptable conventions
⏳ Notifications convocation/composition/sponsor branchées
⏳ Modération marketplace
⏳ Fulfillment boutique (gestion livraison/expédition)
⏳ Notifications via outbox
⏳ Réduire accès direct tables externes
⏳ Activer tests CI
⏳ Projections discipline depuis événements Matchsheet
```

## `matchsheet`

```text
✅ Services saisie live refusent écriture si CLOSED
✅ Réouverture de feuille editable
⏳ actual_started_at / actual_finished_at
⏳ Event publishing
⏳ Réduire écritures dans domaines TeamManager
⏳ Activer tests CI
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
⏳ Valider caméra/offline en conditions réelles
⏳ Contrôle supporter strict (affiliation vérifiée)
⏳ Politique configurable (STRICT/DECLARATIVE)
⏳ Outbox notifications
⏳ Tests CI
⏳ Events ticket.purchased / scanned
```

## `arbinote`

```text
⏳ Utiliser statut réel match pour autoriser votes
⏳ Bloquer CANCELLED
⏳ Vote authentifié (actuellement sans compte)
⏳ reviewed_by alimenté
⏳ Audit complet modération
⏳ Consommer match events
⏳ Corriger lint react-hooks (4 erreurs)
```

## `sellerPortal`

```text
✅ Portail vendeur fonctionnel
⏳ Migrer vers Marketplace API
⏳ Fermer workflow modération
⏳ Tests isolation multi-vendeurs
⏳ Intégration payment-api
⏳ Intégration notification-api
⏳ Returns API
⏳ Payout API
⏳ Aligner SSO/MFA/révocation/audit avec écosystème
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
⏳ US-01 ArbiNote status réel
⏳ TS-02 actualStartedAt
⏳ TS-39 reviewed_by
```

## Sprint 2 — Marketplace fondations

```text
⏳ TS-03 marketplace-api (NestJS)
⏳ TS-04 migration product API
⏳ US-05 catalogue vendeur
⏳ US-06 variantes/stock
```

## Sprint 3 — Modération marketplace

```text
⏳ US-07 liste submitted
⏳ US-08 review
⏳ US-09 approve
⏳ US-10 reject
⏳ US-11 resubmit
```

## Sprint 4 — Paiement fiable

```text
⏳ TS-12 payment outbox
⏳ TS-13 retry durable
⏳ TS-14 consumer idempotency
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

1. **Corriger ArbiNote / statut réel du match (US-01, TS-02)** : petit développement, impact métier élevé.
2. **Activer les tests existants dans la CI (TS-33)** avant d'entreprendre les gros refactorings.
3. **Créer Marketplace API (TS-03)**, car c'est aujourd'hui le plus grand processus incomplet.
4. **Implémenter la modération marketplace dans TeamManager (US-07 à US-11)**.
5. **Introduire Transactional Outbox dans Payment API (TS-12)**.
6. **Compléter le fulfillment des commandes (TS-20 à US-24)**.
7. **Sécuriser le SSO (TS-27, TS-28, TS-29)** : risques identifiés.
8. **Découpler progressivement les accès directs à la base (TS-31)**.
9. Seulement ensuite, mettre en place **Event Bus + API Gateway**.

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
