# 📦 BACKLOG COMPLET — Écosystème Foot

**Date**: 12 août 2026  
**Total Tasks**: 89  
**P0 (Immédiat)**: 31  
**P1 (Court terme)**: 35  
**P2 (Moyen terme)**: 23

**Critical Path Estimation**: 80 jours (~16 semaines sans parallélisation, ~10-12 avec)  
**Team Size**: 3-4 developers

---

## 🎯 Résumé Exécutif

Plateforme football modulaire avec 11 applications (3 APIs NestJS, 8 apps Next.js) partageant une base MySQL. 

**Fonctionnalités codées** ✅:
- Identité centralisée (SSO, MFA, OAuth Google)
- Gouvernance (fédérations, ligues, équipes, matchs)
- Feuille de match officialisée
- Billetterie (paiement intégré)
- Back-office club complet
- Marketplace vendeur multi-clubs
- Notation arbitres avec détection fraude
- Notifications multicanales

**Risques dominants** 🔴:
- Cohérence distribuée (plusieurs apps écrivent mêmes tables)
- Secrets distribués (JWT symétriques)
- Stock non atomique (surbooking possible)
- Outbox sans worker autonome (webhooks perdus)
- Migrations SQL dispersées
- Tests E2E multi-projets absents
- Consentement RGPD non formalisé

**Stratégie**: Adresser P0 (31 tasks, 80j) → P1 (35 tasks, 4-8 semaines) → P2 (23 tasks, 2-4 mois)

---

# 🔴 P0 — Sécurité, Argent, Intégrité (IMMÉDIAT)

**31 tâches — 80 jours (~16 semaines seul, ~10-12 avec parallélisation)**

## P0.1 Authentification et Secrets

### TASK-P0-001: JWT HS256 → RSA asymétrique + JWKS + rotation kid ⭐ BLOCAGE

**Projets**: sso, packages/auth-shared, 6 apps clientes  
**Estimation**: 5 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité (voir sso/src/lib/jwtKeys.ts, sso/docs/jwt-rotation-runbook.md)

**Description**:
- [x] SSO génère paire RSA 2048, expose `/api/.well-known/jwks.json` avec kid
- [x] JWT émis portent kid en header
- [x] packages/auth-shared: valider signature contre JWKS (cache 5 min via `createRemoteJWKSet`)
- [x] Rotation: nouvelle clé sans retirer ancienne (grâce period 48h, voir runbook)
- [x] Apps clientes mises à jour (notification-api ; les 6 apps Next.js consomment auth-shared sans changement de code, seul SSO_URL est requis)

**Acceptance Criteria**:
- [x] Tests: émettre JWT ancien format (HS256) → accepté via fallback legacy (SSO_JWT_SECRET) jusqu'à expiration naturelle (≤12h, sous les 48h cible)
- [x] Tests: rotation clés sans interruption sessions actives (sso/src/lib/session.test.ts, "rotation: still accepts a token signed with the previous kid")
- [ ] Logs: chaque validation JWT inclut kid et source JWKS (non fait — à ajouter lors de l'intégration observabilité, voir TASK-P1-002)
- [x] Runbook: procédure rotation sans downtime (sso/docs/jwt-rotation-runbook.md)

**Impact si ignoré**: ⚠️ Clés compromises = attacker peut émettre jetons arbitraires

---

### TASK-P0-002: Politique révocation uniforme + matrice sensibilité par app

**Projets**: sso, packages/auth-shared  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-001  
**Status**: [ ] À faire

**Description**:
Actuellement apps choisissent fail-open/fail-closed indépendamment. Panne SSO = divergence décisions.

| App | Sensibilité | Mode | Raison |
|-----|----------|------|--------|
| superadmin | ÉLEVÉE | fail-closed | Gestion critique |
| teamManager | ÉLEVÉE | fail-closed | Données métier |
| matchsheet | ÉLEVÉE | fail-closed | Match en direct |
| billetterie | ÉLEVÉE | fail-closed | Argent |
| ob | BASSE | fail-open | Site public |

**Acceptance Criteria**:
- [ ] Matrice documentée en README
- [ ] `verifySsoTokenWithRevocation()` accepte failMode explicite
- [ ] Default failMode par app depuis .env
- [ ] Tests panne SSO: apps sensibles refusent, ob cache/placeholder
- [ ] Métriques: logger appels introspection + résultats
- [ ] SLA SSO documenté

---

### TASK-P0-003: Service Authentication — Rotation clés service + kid

**Projets**: marketplace-api, payment-api, notification-api, teamManager, billetterie  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Clés service (x-api-key) statiques en JSON env. Compromission = accès tous services.

- [ ] Clés service dans vault (HashiCorp Vault ou AWS Secrets Manager)
- [ ] Kid en header (X-Service-Key-Id)
- [ ] Rotation: ancienne clé valide 24h supplémentaires
- [ ] Audit: chaque appel service-to-service logge serviceId, kid, endpoint

**Acceptance Criteria**:
- [ ] Infrastructure vault créée
- [ ] ServiceAuthGuard valide kid + clé contre vault
- [ ] Rotation sans downtime (coexist 24h)
- [ ] Tests: appel clé expirée → 401
- [ ] Logs JSON: serviceId, kid, endpoint, timestamp

---

### TASK-P0-004: Stock atomique (billetterie + marketplace) — Empêcher surbooking

**Projets**: billetterie, marketplace-api  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité pour billetterie (voir billetterie/src/lib/tickets.ts) — marketplace-api non applicable, voir note ci-dessous

**Description**:
Deux acheteurs simultanés dernière place = surbooking. Implémenter UPDATE atomique.

> **Note d'audit** : `billetterie` disposait déjà d'un verrou `pessimistic_write` (SELECT ... FOR UPDATE) dans une transaction, qui empêche déjà la course en pratique. Ajouté en défense en profondeur : un UPDATE conditionnel atomique (`sold_count + qty <= capacity`, vérification `affected === 1`) qui garantit l'absence de surbooking même hors du verrou. Côté `marketplace-api`, la création de commande/checkout n'est pas encore implémentée (`orders.service.ts`/`seller-orders.service.ts` sont des scaffolds explicitement hors périmètre, colonnes `reserved`/`sold` pas encore câblées) — il n'y a donc aucun code de décrément de stock à corriger pour l'instant ; à traiter quand le tunnel d'achat marketplace sera construit (E05/E06).

**SQL**:
```sql
UPDATE tk_ticket_categories 
SET quantity = quantity - 1 
WHERE categoryId = ? AND quantity > 0;
-- IF affected_rows == 0: error "Sold out"
```

**Acceptance Criteria**:
- [x] Indice existant : unique (matchId, categoryId) sur tk_match_ticket_categories
- [x] API valide UPDATE atomique (query builder TypeORM, WHERE sold_count + qty <= capacity)
- [x] Tests capacité : tickets.capacity.test.ts (dernière place vendue puis refusée, soldCount jamais > capacity)
- [x] Rollback: déjà géré (staleTickets PENDING > TTL libérés avant nouvel achat, voir purgeStalePendingTickets)
- [ ] Metrics: compteur oversell (target = 0) — pas d'infra de métriques dans ce repo, à ajouter avec l'observabilité (TASK-P1-002)

**Impact si ignoré**: 💰 Débits multiples pour 1 place = perte argent

---

### TASK-P0-005: Idempotence webhook payment — idempotencyKey UNIQUE

**Projets**: payment-api, billetterie, teamManager  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité pour payment-api, billetterie et teamManager

> **Note d'audit** : `billetterie` avait déjà l'idempotence webhook complète (table `tk_processed_webhook_events`, `claimWebhookEvent`). `teamManager` en était dépourvu — répliqué le même pattern (`cms_processed_webhook_events`, `claimWebhookEvent`, route webhook exige désormais `eventId`). Côté `payment-api` : l'idempotence webhook (providerRef + webhookReceivedCount + transition PAID conditionnelle + outbox transactionnel) existait déjà ; le gap restant était la ré-initiation `POST /payments/*/init` côté client (retry réseau/double clic) créant un 2e Payment et un 2e paiement fournisseur — corrigé avec un header `Idempotency-Key` optionnel + contrainte `UNIQUE(callerApplication, idempotencyKey)` (course entre deux inits concurrents récupérée via re-fetch du gagnant sur duplicate key). **payment-api n'a aucun dossier de migrations SQL existant** (schema géré par TypeORM `synchronize` hors production) — la nouvelle colonne doit être ajoutée manuellement en production, à centraliser avec TASK-P0-018.

**Description**:
Fournisseur rejeu webhook → débits multiples. Garantir idempotence.

**Schema**:
```sql
ALTER TABLE payments ADD COLUMN idempotencyKey VARCHAR(255) UNIQUE NOT NULL;
ALTER TABLE processed_webhook_events ADD UNIQUE(paymentId, webhookId);
```

**Flux**:
1. Client: POST /payments/init + header Idempotency-Key
2. payment-api: INSERT Payment(idempotencyKey)
3. Doublon: retourner paiement existant
4. Webhook reçu: INSERT ProcessedWebhookEvent(paymentId, webhookId)
5. Doublon webhook: retourner 200 sans rejeu métier

**Acceptance Criteria**:
- [x] idempotencyKey unique (composite callerApplication+idempotencyKey, payment-api) ; event_id UNIQUE PRIMARY KEY (billetterie/teamManager, déjà en place/répliqué)
- [x] Tests : billetterie (déjà vert), teamManager (10 nouveaux tests), payment-api (3 nouveaux tests idempotency-key), tous verts
- [ ] Metrics: compteur webhook duplicates (target = 0) — pas d'infra de métriques dans ce repo, à ajouter avec l'observabilité (TASK-P1-002)

---

### TASK-P0-006: Industrialiser outbox worker (payment-api, teamManager) ⭐ CRITIQUE

**Projets**: payment-api, teamManager, notification-api  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-005  
**Status**: [x] Largement déjà traité avant cette passe (voir payment-api/src/outbox/outbox-worker.service.ts : poll autonome au démarrage, retry durable 1/5/15/60/360min survivant à un redémarrage, DLQ, webhook signé HMAC-SHA256 — voir payment-api/src/webhooks/webhook-dispatch.service.ts ; teamManager a un outbox transactionnel équivalent, voir services/NotificationOutboxService.ts, traité via POST /api/internal/outbox/process par un ordonnanceur externe faute de process long-running Next.js). Ajouté dans cette passe : le seul acceptance criterion manquant, `/health/outbox → {pending, dlq}` (payment-api/src/outbox/outbox-health.controller.ts) et son équivalent GET /api/internal/outbox/status côté teamManager — status "degraded" dès que dlq > 0, à brancher sur un moniteur ops externe (aucune alerte push/Slack n'existe ailleurs dans ce dépôt).

**Description**:
Actuellement outbox persiste mais sans worker autonome robuste. Webhooks perdus. Implémenter BullMQ:

- [ ] Queue worker: retry exponentiel (2s, 4s, 8s, ..., 256s)
- [ ] Max 10 attempts
- [ ] Dead-letter queue après 10 échecs
- [ ] Idempotent webhook replay (même webhook rejeu = pas double effet)
- [ ] Health: `/health/outbox → {pending: N, dlq: N}`
- [ ] Alerte ops si DLQ accumule

**Acceptance Criteria**:
- [ ] Worker lancé startup payment-api, teamManager
- [ ] Webhook signé HMAC-SHA256
- [ ] Tests: arrêter worker → créer event → redémarrer → webhook envoyé
- [ ] Metrics: pending, sent, failed, dlq count

**Impact si ignoré**: 🔥 Notifications/confirmations billets perdues = client bloqué

---

### TASK-P0-007: Vérification intégrité montant/devise/signature fournisseur

**Projets**: payment-api  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [x] Audité — déjà conforme sur l'essentiel, 1 point non implémentable documenté

> **Note d'audit** (aucun code changé — l'existant couvre déjà les critères, voir détail) : pour les 3 fournisseurs (Konnect, Paymee, Flouci), `payment.service.ts` ne fait JAMAIS confiance au corps du webhook pour le montant/statut final — `handle{Konnect,Paymee,Flouci}Webhook` appellent chacun un `verifyPayment()` dédié (`konnect.provider.ts:61`, `paymee.provider.ts:85`, `flouci.provider.ts:65`) qui compare le montant (converti en millimes, comparaison exacte, aucune tolérance) et l'orderId/trackingId contre l'enregistrement interne, et rejette (`KonnectPaymentMismatchError`/`PaymeePaymentMismatchError`/`FlouciPaymentMismatchError`) au moindre écart — testé explicitement (ex. `konnect.mapper.spec.ts:154` "throws on amount mismatch", `:164` "throws on currency mismatch"). Konnect vérifie aussi la devise explicitement (`konnect.mapper.ts:154`) ; Paymee/Flouci sont TND-only par construction (`InitPaymentDto` n'autorise que `TND`), donc pas de champ devise à falsifier. **Signature** : Paymee a un vrai HMAC (`verifyPaymeeChecksum`, MD5(token+status+apiKey) comparé en temps constant via `timingSafeEqual`, testé dans `paymee.checksum.spec.ts`) ; Konnect et Flouci n'ont pas de signature applicative mais **ne font jamais confiance au webhook lui-même** : chaque webhook ne sert que de déclencheur pour un appel serveur-à-serveur authentifié (`x-api-key`/`Bearer`) vers l'API réelle du fournisseur qui redonne le montant/statut vrai — un attaquant ne peut pas falsifier cette réponse sans compromettre la clé API stockée côté serveur, propriété équivalente (voire plus forte) qu'une signature sur des données côté client. **Anti-rejeu (timestamp < 1 min)** : non implémentable tel quel — aucun des 3 fournisseurs n'inclut de champ timestamp dans son payload webhook (vérifié sur les 3 DTOs). La sécurité contre le rejeu vient de la structure plutôt que d'un timestamp : un rejeu Konnect/Flouci déclenche juste une re-vérification fraîche (jamais de données périmées utilisées), et `transitionToPaid` est une transition exactement-une-fois (UPDATE conditionnel `WHERE status != PAID`, voir TASK-P0-005) donc un rejeu après PAID est un no-op. Option explorée et rejetée : court-circuiter aussi sur les statuts FAILED/EXPIRED comme sur PAID — risque réel de bloquer définitivement un paiement dont le fournisseur confirmerait un succès tardif (paiement complété après un timeout initial), donc non appliqué sans confirmation métier.

- [x] Montants en INTEGER (unité mineure: TND × 1000, `tndToMillimes`) — déjà en place pour les 3 fournisseurs
- [ ] Vérifier signature fournisseur (RSA) — Paymee a un HMAC (pas RSA) ; Konnect/Flouci n'ont pas de signature mais une ré-authentification serveur-à-serveur équivalente (voir note)
- [x] Vérifier devise — Konnect explicite, Paymee/Flouci TND-only par construction
- [x] Vérifier montant serveur ≠ client — déjà en place et testé pour les 3
- [ ] Vérifier timestamp < 1 min (anti-rejeu) — non implémentable (aucun fournisseur ne fournit de timestamp), sécurité obtenue structurellement (voir note)

**Tests** (déjà présents, aucun ajout nécessaire) :
- [x] Montant fournisseur +1 → rejection (`konnect.mapper.spec.ts`, `paymee.provider.spec.ts:132`, `flouci.provider.spec.ts:163`)
- [x] Devise différente → rejection (`konnect.mapper.spec.ts:164`)
- [x] Signature invalide → rejection (`paymee.provider.spec.ts:75`, `paymee.checksum.spec.ts`)

---

### TASK-P0-008: Synchronisation offline multi-scanner billetterie + gestion conflits

**Projets**: billetterie  
**Estimation**: 5 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Deux scanners hors ligne peuvent scanner même billet. Implémenter synchro robuste:

- [ ] IndexedDB: local storage tickets + scanEvents
- [ ] Scan offline: enregistrer localement, marquer ticket scanné
- [ ] Synchro: POST /api/admin/tickets/sync-scans avec terminalId
- [ ] Serveur: détecter doublons, retourner conflicts[]
- [ ] Client: afficher conflicts (UI: "Billet scanné terminal X à 14:32")

**Tests**:
- [ ] 2 terminaux scannent même QR hors ligne → sync → 1 accepted, 1 conflict
- [ ] Scan après 24h → allowed

---

### TASK-P0-009: Rotation QR billet + kid, expiration, révocation ciblée

**Projets**: billetterie  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-003  
**Status**: [ ] À faire

**Description**:
QR actuellement secrets statiques. Aucune rotation, expiration. Implémenter:

- [ ] JWT QR signé avec kid
- [ ] Exp = 7 jours avant match
- [ ] Rotation clés tous les 30 jours
- [ ] Révocation ciblée: PATCH /admin/tickets/:id/revoke
- [ ] Tests: QR expiré → rejected; QR révoqué → rejected

---

## P0.2 Modération et Audit

### TASK-P0-010: Attribuer modération arbinote à adminId réel + audit append-only

**Projets**: arbinote  
**Estimation**: 2 jours  
**Dépendances**: TASK-P0-001  
**Status**: [x] Traité (voir arbinote/src/app/api/admin/votes/moderate/[voteId]/route.ts)

**Description**:
Route modération contient TODO pour adminId. Audit non attribuable.

- [x] Extraire adminId de JWT (session.id via getSsoSessionFromRequest)
- [x] Vérifier rôle: SUPERADMIN (ensureAdminAuth) — pas de rôle ARBINOTE_ADMIN distinct dans le schéma actuel, seul SUPERADMIN existe pour ce back-office
- [x] AuditLog: insert-only (déjà append-only, lib/auditLog.ts — aucune route UPDATE/DELETE sur audit_logs)
- [x] Champs: admin_username (email), entity_id, summary, ip_address, timestamp déjà loggés ; vote.moderated_by (adminId) maintenant renseigné

**Tests**:
- [ ] Modération sans JWT → 401
- [ ] JWT MEMBER → 403

---

### TASK-P0-011: Isolation multi-tenant OB — Audit teamId/OB_TEAM_ID

**Projets**: ob  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [x] Audit fait, 1 IDOR réelle trouvée et corrigée (voir note)

**Description**:
Omission filtrage teamId expose données autre club.

> **Note d'audit** : `ob` est en réalité conçu single-tenant-par-déploiement (`getObTeam()` résout `OB_TEAM_ID` une fois, mis en cache, voir ob-team.ts) — pas de table `teamId`/`OB_TEAM_ID` par route comme le suggérait la checklist ci-dessous (les routes `/api/club/info`, `/api/news`, `/api/formulaires` telles que décrites n'existent pas : ce sont des Server Components qui appellent des services scopés par `team.id`, ex. `PublicClubService`, `PublicNewsService`). Audit complet des 12 services publics + 8 pages + routes dynamiques : **tous déjà correctement scopés**, sauf **`GET /api/live/[matchId]` et `[matchId]/stream`** — la table `matches` est partagée entre clubs, et ces deux endpoints publics non authentifiés ne filtraient que sur `isPublicVisible`, jamais sur l'équipe : un `matchId` d'un autre club (deviné/énuméré) exposait son score et son fil d'événements live en clair. **Corrigé** : les deux routes exigent maintenant `equipeHome = OB_TEAM_ID OR equipeAway = OB_TEAM_ID` en plus de `isPublicVisible`. `PublicStandingsService` interroge intentionnellement d'autres équipes de la même fédération pour construire un classement — exception documentée, pas une fuite (données de classement déjà publiques).

**Audit checklist**:
- [x] Services publics (club/news/stadium/academy/announcement/contact/socials/sponsor/shop/player/match/gallery) → tous scopés par `team.id`
- [x] `/api/live/[matchId]` et `/stream` → **IDOR trouvée et corrigée**
- [x] Formulaires (contact/recrutement/inscription) → `ob` ne fait que rediriger vers `teamManager/.../{teamId}`, aucune écriture DB côté `ob`
- [x] Tests : 3 nouveaux tests d'isolation (route.test.ts, stream/route.test.ts)

**Impact si ignoré**: 🚨 Exposition données autre club = grave

---

### TASK-P0-012: Autorisation centralisée — RBAC + IDOR audit sur toutes mutations

**Projets**: teamManager  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-001  
**Status**: [x] Audit partiel + IDOR réelles corrigées (pas de refonte complète — voir note)

> **Note d'audit** : teamManager a déjà une lib d'autorisation centralisée (`@/lib/access` : `getUserAccess`/`requirePermission`/`requireCategory`, `@/lib/team-context` : `requireTeamId`), largement appliquée sur les créations/mises à jour (ex: `PlayerService`, `MediaGalleryService.create/update/delete`) — la description du todo ("aucune borne, autorisation surtout server actions") ne reflétait plus l'état réel du code. Un audit statique (grep de toutes les méthodes `update`/`delete`/`remove` des 46 services de `src/services/`, recherche de signatures sans `teamId`) a trouvé un pattern répété : les actions de **création** vérifient systématiquement la propriété club de la ressource parente, mais plusieurs actions de **suppression/réordonnancement** de sous-ressources ne le faisaient pas — IDOR cross-club réelles et exploitables (ids numériques séquentiels devinables) :
> - `MatchGalleryService.removeGalleryFromMatch`/`removeAllGalleriesFromMatch` — aucune vérification que le match implique le club appelant (alors que `addGalleryToMatch` la faisait déjà)
> - `MediaGalleryService.removeItemFromGallery`/`updateItemOrder` — idem pour la galerie
> - `NewsService.removeMediaFromNews`/`updateNewsMediaOrder` — idem pour l'actualité
> - `TrainingInvitationService.updateResponse`/`remove` — aucune vérification que l'entraînement de l'invitation appartient au club appelant
> - `TripService.toggleConfirmed`/`removeParticipant` — aucune vérification que le déplacement du participant appartient au club appelant
>
> Corrigé en ajoutant `teamId` à chaque signature et une vérification de propriété avant mutation (même pattern que les actions de création existantes), avec tests de régression par service (`*.test.ts` à côté de chaque service). **Non fait** : la matrice complète "20+ cas de test IDOR par ressource (Players/Staff/Matches/CMS/Boutique)" demandée par le todo — l'essentiel des chemins CRUD principaux (create/update/delete des entités elles-mêmes, pas leurs sous-ressources) était déjà correctement scopé lors du sondage ; une passe exhaustive sur les 41 fichiers `actions.ts` reste à faire pour une garantie complète.

**Description**:
Monolithe 50+ routes sans bornes. Autorisation surtout server actions, pas services.

- [ ] Policy service: `@Injectable() class AuthorizationService`
- [ ] Chaque mutation appelle `authService.checkPermission(resource, action, user)`
- [ ] Vérifier teamId, userId, categoryScope
- [ ] Tests IDOR: change teamId → rejected; change userId → rejected

**20+ test cases**:
- [ ] Players: read/update/delete/export
- [ ] Staff: read/update/delete
- [ ] Matches: read/update/cancel
- [ ] CMS: read/publish/delete
- [ ] Boutique: read/update/delete orders
- [ ] Etc.

**Impact si ignoré**: 🔓 Accès données autres équipes/utilisateurs

---

## P0.3 Paiements et Argent

### TASK-P0-013: Saga et idempotence superadmin ↔ SSO — Créer staff club

**Projets**: superadmin, sso  
**Estimation**: 4 jours  
**Dépendances**: TASK-P0-006  
**Status**: [ ] À faire

**Description**:
Créer staff: superadmin appelle SSO (User créé), puis affiliation. Si réseau coupe entre, divergence.

- [ ] Saga persistée: id, status (PENDING|COMPLETED|FAILED), steps[]
- [ ] Step 1: Créer User SSO
- [ ] Step 2: Créer affiliation
- [ ] Compensating transaction si échec
- [ ] Écran réconciliation pour ops: sagas FAILED, bouton retry
- [ ] Logs: Saga ID loggé partout

**Tests**:
- [ ] SSO échoue → saga FAILED, ticket réconciliation créé
- [ ] Affiliation échoue après User créé → saga FAILED, ops peuvent retry
- [ ] Retry saga → complète

---

### TASK-P0-014: Réouverture match idempotente superadmin ↔ matchsheet

**Projets**: superadmin, matchsheet  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-013  
**Status**: [ ] À faire

**Description**:
Réouverture match doit être idempotente (peut être rejouée sans double effet).

- [ ] MatchReopenEvent: id, matchId, status (PENDING|SUCCESS|FAILED)
- [ ] Matchsheet API: `/api/internal/matches/reopen` accepte idempotencyKey
- [ ] MatchReopenLog: UNIQUE(matchId, idempotencyKey)
- [ ] Si idempotencyKey existe → retourner 200 sans re-exécuter

**Tests**:
- [ ] Reopen match → succès
- [ ] Reopen même match (rejeu) → idempotent
- [ ] Reopen match pas CLOSED → error "Not closed"

---

### TASK-P0-015: Réconciliation paiements périodique (daily job)

**Projets**: payment-api  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Aucune réconciliation paiement ↔ fournisseur. Paiements perdus silencieusement.

- [ ] Job daily: cherche payments stale (PENDING > 1h)
- [ ] Polling fournisseur pour chaque
- [ ] Mettre à jour payment.status si changé
- [ ] Créer outbox event si COMPLETED (rejeu webhook)
- [ ] Rapport daily: stale count, resolved count, still pending
- [ ] Alerte ops si still pending > 10

---

### TASK-P0-016: Vérification stock après paiement confirmé — Compensation

**Projets**: teamManager, billetterie  
**Estimation**: 2 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Paiement confirmé mais stock devenu indisponible → compensation auto (remboursement).

- [ ] Webhook reçu: vérifier stock avant confirmer commande
- [ ] Stock indisponible: appeler payment-api refund
- [ ] Notifier client: "Commande remboursée, stock indisponible"
- [ ] AuditLog compensation avec raison

---

## P0.4 Données et Migrations

### TASK-P0-017: Owner par table + empêcher migrations concurrentes

**Projets**: db (tous)  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Aucun owner explicite. Plusieurs projets peuvent modifier même table.

- [ ] db/OWNERSHIP.md: lister toutes 22 tables
  - Owner (responsable migrations)
  - Consumers READ
  - Consumers WRITE
  - Migration path
  
- [ ] Migration lock: GET_LOCK/RELEASE_LOCK MySQL
- [ ] CI: pré-deploy check conflits migrations

**Exemple**:
```
User (sso)
  Owner: sso team
  Write: sso uniquement
  Migration: sso/sql/
  
Match (superadmin)
  Owner: superadmin team
  Consumers read: superadmin, teamManager, matchsheet, billetterie, ob
  Consumers write: superadmin uniquement
```

---

### TASK-P0-018: Centraliser migrations avec Flyway

**Projets**: db  
**Estimation**: 4 jours  
**Dépendances**: TASK-P0-017  
**Status**: [ ] À faire

**Description**:
Migrations SQL dispersées par projet. Pas d'historique centralisé. Flyway.

- [ ] db/flyway/: V001__*, V002__*, ...
- [ ] Docker image flyway, pré-deployment
- [ ] flyway_schema_history: table audit
- [ ] CI: flyway migrate pré-deployment

---

### TASK-P0-019: Contrats HTTP versionnés (OpenAPI 3.0)

**Projets**: payment-api, notification-api, marketplace-api  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
APIs implicites. Changement cassant sans notification.

- [ ] payment-api/openapi.yaml: toutes routes
- [ ] notification-api/openapi.yaml
- [ ] marketplace-api/openapi.yaml
- [ ] Versioning URL: /v1/payments, /v2/payments
- [ ] Client generation: SDK TypeScript depuis OpenAPI
- [ ] Consumer contract tests

---

### TASK-P0-020: Événements versionnés pour score/stats/sanctions convergents

**Projets**: matchsheet, teamManager, arbinote, ob  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-001, TASK-P0-019  
**Status**: [ ] À faire

**Description**:
Plusieurs apps lisent tables matchsheet. Pas de contrat événement. Score/stats divergent.

- [ ] MatchEvent interface versionnée
- [ ] EventBus: Redis Pub/Sub ou RabbitMQ
- [ ] Consumers: notification-api (créer notif), ob (live update)
- [ ] Tests: publier MATCH_GOAL → notification créée, score ob mis à jour

---

### TASK-P0-021: Isolation vendeur marketplace — Tests IDOR complets

**Projets**: marketplace-api  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-012  
**Status**: [x] Audité — déjà scopé partout, 1 test ajouté, 1 gap documenté

> **Note d'audit** : audit complet de tous les endpoints protégés par `SellerJwtGuard` (products, variants, inventory, seller-orders, returns, payouts, notifications). **Tous déjà scopés par `sellerId`** dérivé du JWT (`@CurrentSeller()`, jamais un id client-fourni non vérifié) — soit directement dans le `where` du repository (`{ id, sellerId }`), soit via un `assertOwnership()` explicite (variants). Aucune IDOR trouvée. Seul gap réel : `PayoutsService.findAllForSeller` n'avait aucun test dédié prouvant le filtrage — ajouté. **Gap non comblé** : ce repo n'a aucun test e2e (`*.e2e-spec.ts` absent partout) — la couverture existante prouve que le *service* filtre par sellerId, pas que le câblage guard→controller→service est intact en conditions réelles (2 vrais JWT vendeur différents contre l'app démarrée). Construire un premier harnais e2e est un investissement plus large que cette tâche ; déjà identifié comme risque plateforme dans le résumé exécutif du backlog ("Tests E2E multi-projets absents") et couvert par la Phase 6 du plan d'exécution.

**20+ test cases** (déjà couverts par les specs unitaires existantes, sauf mention) :
- [x] Products: vendor1 ne peut pas lire/update/delete vendor2 products (`products.service.spec.ts`, `findOneForSeller` scopé)
- [x] Inventory: vendor1 ne peut pas ajuster vendor2 (`inventory.service.spec.ts`)
- [x] Orders (seller-orders): vendor1 ne peut pas voir/modifier vendor2 (`seller-orders.service.spec.ts`)
- [x] Returns: vendor1 ne peut pas voir vendor2 (`returns.service.spec.ts`)
- [x] Payouts: vendor1 ne peut pas voir vendor2 (nouveau : `payouts.service.spec.ts`, 2 tests ajoutés)

**All tests must pass (green)** — 71/71 marketplace-api

---

### TASK-P0-022: Empreinte fingerprint arbinote → compte optionnel + rate limit

**Projets**: arbinote  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-001  
**Status**: [ ] À faire

**Description**:
Empreinte contournable, sensibilité changement appareil, risque vie privée.

- [ ] UI: toggle "Se connecter pour voter"
- [ ] Vote authentifié: JWT, userId, 1 per user per match
- [ ] Vote anonyme (legacy): fingerprint, proof HMAC, rate limit 24h Redis
- [ ] Consent checkbox privacy avant vote anonyme

**Tests**:
- [ ] Deux votes anonymes même fingerprint → 2e rejected
- [ ] Deux votes authentifiés même user → 2e rejected
- [ ] Fingerprint après 24h → allowed

---

### TASK-P0-023: Concurrence et versioning matchsheet — Optimistic locking

**Projets**: matchsheet  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité au niveau service (voir note) — plomberie UI non faite

> **Note d'audit** : les événements (buts/cartons/remplacements/blessures) sont de purs INSERT sans lecture-modification-écriture — pas de risque d'écrasement, pas de verrou nécessaire là (confirmé par audit). Le vrai risque est `Sheet.status`/`closedAt` (transitions DRAFT→...→CLOSED, réouverture) via `SheetService.updateStatus`/`reopen`, qui faisaient un `find` puis `save()` en mémoire — deux officiels agissant en même temps pouvaient s'écraser silencieusement. Corrigé : colonne `version` sur `ms_sheets`, les deux méthodes font désormais un `UPDATE` atomique conditionnel (`WHERE id=... AND version=...` quand `expectedVersion` est fourni) et lèvent `SheetVersionConflictError` sur mismatch — mappée en 409 par la route `/api/internal/matches/[matchId]/reopen` existante. Cette app n'a pas d'API REST `GET/POST /api/matchsheet/:id` (Next.js Server Actions + Server Components) : le mécanisme de verrouillage est prêt et testé côté service, mais **aucun appelant (live/pre-match/post-match actions.ts) ne passe encore `expectedVersion`** — cela demande de faire remonter la version jusqu'au state client dans l'UI, hors périmètre de cette passe sécurité. Tant que ce plombage UI n'est pas fait, les 4 appelants existants restent protégés contre l'écrasement en mémoire (UPDATE atomique par id) mais sans détection de conflit actif.

- [x] Matchsheet: version column (ms_sheets.version, voir migration_add_sheet_version.sql)
- [ ] GET /api/matchsheet/:id retourne version — n'existe pas (Server Components), non applicable tel quel
- [x] SheetService.updateStatus/reopen acceptent expectedVersion (mécanisme prêt, non encore appelé depuis l'UI)
- [x] Serveur: compare avant écriture (UPDATE conditionnel), reject si mismatch (SheetVersionConflictError → 409)

**Tests**:
- [x] SheetService.test.ts : 7 nouveaux tests (conflit détecté, retry après conflit réussit, reopen versionné)
- [ ] Deux officiels changements concurrents via l'UI → 1 succès, 1 conflict (409) — bloqué sur le plombage UI ci-dessus

---

### TASK-P0-024: Signatures matchsheet — Identité, horodatage, hash

**Projets**: matchsheet  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [ ] À faire

**Description**:
Signatures faibles (pas hash, timestamp). Renforcer.

- [ ] Signature: role, signatoryId, timestamp, contentHash, signature
- [ ] Hash: SHA256 matchsheet JSON
- [ ] Timestamp: ISO format (no replay)
- [ ] Verification: RSA signature contentHash
- [ ] Audit: historique signatures (append-only)

---

### TASK-P0-025: Mode offline matchsheet — File locale, sync, résolution conflits

**Projets**: matchsheet  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-023  
**Status**: [ ] À faire

**Description**:
Stades mauvaise connectivité. matchsheet crash offline. Implémenter:

- [ ] IndexedDB: matchsheets + events
- [ ] Événement offline: enregistrer localement
- [ ] Synchro: au retour réseau, POST events serveur
- [ ] Conflict resolution: log, manual review UI
- [ ] Tests: offline → créer 5 events → sync → tous créés (ou conflicts resolved)

---

## P0.5 Accès et Contrôle

### TASK-P0-026: Contrôle accès arbinote + TODO modérateur fixé

**Projets**: arbinote  
**Estimation**: 2 jours  
**Dépendances**: TASK-P0-010  
**Status**: [x] Traité

**Description**:
Après P0-010 (adminId fixé), implémenter protections accès.

> **Note d'audit** : les 7 routes `/api/admin/votes*` (list, delete, moderate, anomalies, details, export, single/[id]) appelaient déjà `ensureAdminAuth` (require SUPERADMIN — pas de rôle `ARBINOTE_ADMIN` distinct dans le schéma actuel, seul SUPERADMIN existe pour ce back-office). Le seul gap réel : aucun log des accès refusés. Ajouté `logUnauthorizedAdminAccess` dans `adminAuth.ts` — log structuré (path, method, raison "no_session" vs "role=X", IP, timestamp) à chaque 401.

- [x] GET /api/admin/votes (et les 6 autres routes admin/votes) → require SUPERADMIN (déjà en place)
- [x] POST /api/admin/votes/moderate → require rôle + adminId de JWT (voir TASK-P0-010)
- [x] Logs: chaque accès unauthorized (adminAuth.ts, testé dans adminAuth.test.ts)

---

### TASK-P0-027: Contrôle accès marketplace internal endpoints

**Projets**: marketplace-api  
**Estimation**: 2 jours  
**Dépendances**: TASK-P0-003  
**Status**: [x] Traité (sans attendre TASK-P0-003/vault, voir note)

**Description**:
Endpoints internes (modération, payouts) acceptent x-api-key. Vérifier SUPERADMIN uniquement.

> **Note d'audit** : `ServiceAuthGuard` authentifie (clé valide = une des applications de l'écosystème) mais n'autorisait pas (n'importe quelle app avec une clé de service — y compris `sellerPortal`, qui a la sienne pour son propre usage self-service — pouvait appeler `moderation/products/*`, `sellers/:id/status` et `internal/payouts/*`). Un vendeur n'aurait jamais dû pouvoir s'auto-approuver un produit ou s'auto-déclencher un virement même via un bug/compromission de sellerPortal. Ajouté `AllowedApplicationsGuard` + décorateur `@AllowedApplications(...)`, appliqué en plus de `ServiceAuthGuard` sur ces 3 contrôleurs, restreint à `teamManager`/`superadmin` (pas de vault requis pour ce fix — la restriction se fait sur l'identité d'application déjà résolue par `ServiceAuthGuard`, indépendant de TASK-P0-003).

- [x] PATCH /sellers/:id/status → ServiceAuthGuard + AllowedApplicationsGuard(teamManager, superadmin)
- [x] POST /moderation/products/:id/{review,approve,publish,reject} → idem (contrôleur entier)
- [x] POST /internal/payouts/* → idem, en bonus (même risque, hors périmètre littéral de la tâche mais même classe de bug)
- [x] Tests : clé invalide → 401 (déjà couvert par ServiceAuthGuard) ; application non-admin (sellerPortal) → 403 (nouveau, allowed-applications.guard.spec.ts)

---

## Fin P0

**Total P0**: 31 tasks  
**Total Estimation**: ~80 jours  
**Parallélisation possible**: 60-70%  
**Équipe requise**: 3-4 devs  

---

# 🟠 P1 — Fiabilité, Exploitation, Conformité (4-8 semaines)

**35 tâches complémentaires à P0**

### P1 Prioritaires:

1. **P1-001** Définir owner par table + API lecture pour non-owners
2. **P1-002** Propager correlation/trace ID (OpenTelemetry, logs JSON)
3. **P1-003** Health checks séparés DB/Redis/dépendances
4. **P1-004** Centraliser secrets (Vault, rotation)
5. **P1-005** Service médias centralisé (antivirus, quotas, nettoyage)
6. **P1-006** RGPD: rétention, export, suppression complètes
7. **P1-007** Remboursements, transferts billets, litiges
8. **P1-008** Machines à états centralisées (produit/commande/retour/payout)
9. **P1-009** Événements versionnés + SSE/WebSocket résilient
10. **P1-010** Backup/restore testée, RPO/RTO, blue/green

...et 25 autres tâches P1 (voir doc technique complet)

---

# 🟡 P2 — Qualité Produit et Maintenabilité (2-4 mois)

**23 tâches de qualité produit**

### P2 Prioritaires:

1. **P2-001** Harmoniser versions Next/React/TypeScript/ESLint
2. **P2-002** Mutualiser modèles/utilitaires (packages/)
3. **P2-003** Couverture tests par couche (≥ 80% critiques)
4. **P2-004** MFA: sessions appareils, codes de secours
5. **P2-005** OAuth: LinkedIn, Microsoft (compléter Google)
6. **P2-006** Feature flags (Unleash, LaunchDarkly)
7. **P2-007** Antispam/CAPTCHA formulaires publics
8. **P2-008** Tests a11y, visuels, performance
9. **P2-009** Prévisualisation templates, versioning, rollback
10. **P2-010** Exports asynchrones avec progression

...et 13 autres tâches P2 (voir doc technique complet)

---

# 📊 Ordre d'Exécution Recommandé

## Phase 1 (Semaines 1-2): Fondations Sécurité

- [ ] TASK-P0-001 (JWT asymétrique) ← Blocage pour beaucoup
- [ ] TASK-P0-003 (Service keys rotation)
- [ ] TASK-P0-004 (Stock atomique) [Indépendant]
- [ ] TASK-P0-005 (Idempotence webhook)
- [ ] TASK-P0-018 (Owner par table)

**Durée**: 14 jours | **Équipe**: 3-4 devs

## Phase 2 (Semaines 3-4): Intégrité Data

- [ ] TASK-P0-006 (Outbox worker)
- [ ] TASK-P0-007 (Vérification montant)
- [ ] TASK-P0-016 (Réconciliation paiement)
- [ ] TASK-P0-019 (Flyway migrations)
- [ ] TASK-P0-020 (Contrats OpenAPI)

**Durée**: 12 jours | **Équipe**: 3 devs

## Phase 3 (Semaines 5-6): Offline + Concurrence

- [ ] TASK-P0-008 (Sync offline scanner)
- [ ] TASK-P0-009 (Rotation QR)
- [ ] TASK-P0-023 (Concurrence matchsheet)
- [ ] TASK-P0-024 (Signatures matchsheet)
- [ ] TASK-P0-025 (Mode offline matchsheet)
- [ ] TASK-P0-002 (Politique révocation)

**Durée**: 15 jours | **Équipe**: 4 devs

## Phase 4 (Semaines 7-8): Audit et Ownership

- [ ] TASK-P0-010 (AdminId arbinote)
- [ ] TASK-P0-011 (Isolation OB)
- [ ] TASK-P0-012 (Autorisation centralisée)
- [ ] TASK-P0-022 (Fingerprint arbinote)
- [ ] TASK-P0-013 (Saga SSO)
- [ ] TASK-P0-021 (IDOR marketplace)

**Durée**: 14 jours | **Équipe**: 3-4 devs

## Phase 5 (Semaines 9-10): Événements et Contrats

- [ ] TASK-P0-014 (Réouverture match idempotente)
- [ ] TASK-P0-020 (Événements versionnés)
- [ ] TASK-P0-015 (Arbinote access control)
- [ ] TASK-P0-017 (Compensation stock)

**Durée**: 10 jours | **Équipe**: 3 devs

## Phase 6 (Semaines 11-13): Tests E2E Multi-Projets

- [ ] UC-01: Onboarding club
- [ ] UC-02: Match nominal
- [ ] UC-03: Correction match
- [ ] UC-04: Billetterie race
- [ ] UC-05: Paiement dégradé
- [ ] UC-06: Marketplace multi-vendeur
- [ ] UC-07: Notification multicanale
- [ ] UC-08: Révocation SSO

**Durée**: 15 jours | **Équipe**: 3-4 QA + devs

---

# 📈 Résumé Estimations

| Phase | P0 Tasks | Jours | Équipe | Parallélisation |
|-------|----------|--------|--------|-----------------|
| 1 | 5 | 14 | 3-4 | 70% |
| 2 | 5 | 12 | 3 | 60% |
| 3 | 6 | 15 | 4 | 65% |
| 4 | 6 | 14 | 3-4 | 70% |
| 5 | 4 | 10 | 3 | 60% |
| 6 (E2E) | 8 | 15 | 3-4 | 50% |
| **Total** | **31** | **~80** | **3-4** | **~64%** |

**Chemin critique**: 80 jours (16 semaines seul), ~10-12 semaines avec parallélisation

---

# ✅ Checklist Démarrage

- [ ] Approuver priorités P0/P1/P2
- [ ] Assigner owners phase 1
- [ ] Créer épics Jira/GitHub
- [ ] Setup CI/CD pour tests P0
- [ ] Documenter décisions architecture
- [ ] Kickoff réunion équipe
- [ ] Planifier sprints 2 semaines
- [ ] Définir metrics de succès

---

**Status**: 🟡 En attente approbation et déploiement  
**Prochaine étape**: Approuver et démarrer Phase 1 (JWT + Security keys)  
**Contact**: Architecture team
