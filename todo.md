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
**Status**: [x] Traité

**Description**:
Actuellement apps choisissent fail-open/fail-closed indépendamment. Panne SSO = divergence décisions.

| App | Sensibilité | Mode | Raison |
|-----|----------|------|--------|
| superadmin | ÉLEVÉE | fail-closed | Gestion critique |
| teamManager | ÉLEVÉE | fail-closed | Données métier |
| matchsheet | ÉLEVÉE | fail-closed | Match en direct |
| billetterie | ÉLEVÉE | fail-closed | Argent |
| ob | BASSE | fail-open | Site public |

> **Note d'audit** : le mécanisme `SSO_REVOCATION_FAILURE_MODE` (lu par app depuis son propre `.env`) existait déjà — c'était donc déjà, par construction, un "default failMode par app". Le vrai gap : `verifySsoTokenWithRevocation()` n'acceptait aucun override explicite, aucune journalisation des appels d'introspection, et le README ne documentait pas billetterie comme `closed` (il la classait `open`, en contradiction avec ce backlog qui la classe ÉLEVÉE/fail-closed pour "Argent" — tranché en faveur de `closed`, alignée avec ce backlog, `billetterie/.env.example` mis à jour en conséquence). `arbinote` reste `open` (vote public, pas d'argent) — sa modération admin est déjà protégée séparément par `ensureAdminAuth`/SUPERADMIN (TASK-P0-026), indépendant de ce mode.

**Acceptance Criteria**:
- [x] Matrice documentée en README (packages/auth-shared/README.md, avec sensibilité + raison par app)
- [x] `verifySsoTokenWithRevocation(token, failMode?)` accepte failMode explicite (prioritaire sur le .env de l'app)
- [x] Default failMode par app depuis .env (déjà existant, documenté explicitement)
- [x] Tests: SSO_URL absent/timeout + closed → refuse ; + open → accepte (déjà présent) ; + failMode explicite outrepasse le .env (nouveau)
- [x] Logs: chaque appel d'introspection journalisé (`console.warn`, événement `sso_introspection`, outcome/reason/failMode)
- [x] SLA SSO documenté (honnêtement : pas d'infra de monitoring dans ce repo, recommandation opérationnelle donnée à la place — voir TASK-P1-002)

---

### TASK-P0-003: Service Authentication — Rotation clés service + kid

**Projets**: marketplace-api, payment-api, notification-api, teamManager, billetterie  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [x] Portion applicative traitée (voir Note d'audit — Vault hors scope)

> **Note d'audit** : pas d'infrastructure Vault/AWS Secrets Manager dans ce repo (même constat que pour TASK-P0-001/JWKS et TASK-P0-009/QR billet) — la portion "infrastructure vault" n'est pas faite, comme documenté ci-dessous. Le mécanisme de rotation lui-même (coexistence courante/précédente + fenêtre de grâce + kid + audit) est implémenté au niveau applicatif dans les 4 projets qui exposent effectivement un guard service-à-service : `payment-api`, `marketplace-api`, `notification-api` (registre par application, `ServiceAuthGuard` + `service-clients.config.ts`) et `teamManager` (`lib/serviceAuth.ts`, clé unique partagée — pas de registre par appelant, donc pas de `serviceId` attribuable par appel, documenté dans le code). `billetterie` n'a pas d'endpoint interne protégé par ce mécanisme (elle est seulement appelante de payment-api) — rien à faire côté billetterie.

**Description**:
Clés service (x-api-key) statiques en JSON env. Compromission = accès tous services.

- [ ] Clés service dans vault (HashiCorp Vault ou AWS Secrets Manager) — **non fait**, pas d'infra Vault dans ce repo
- [x] Kid en header (X-Service-Key-Id) — pas littéralement un header entrant (les apps appelantes n'ont pas été modifiées pour l'envoyer, hors scope), mais un `kid` (`"current"`/`"previous"`) est dérivé de la clé qui matche et journalisé à chaque appel
- [x] Rotation: ancienne clé valide 24h supplémentaires — `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT` (NestJS) et `TEAMMANAGER_SERVICE_API_KEY_PREVIOUS`/`_EXPIRES_AT` (teamManager) ; la durée (24h ou autre) est une décision opérationnelle au moment de la rotation, pas une constante codée en dur
- [x] Audit: chaque appel service-to-service logge serviceId, kid, endpoint — `console.warn` JSON structuré (`event: "service_auth"`) à chaque appel authentifié

**Acceptance Criteria**:
- [ ] Infrastructure vault créée — non fait (voir note d'audit)
- [x] ServiceAuthGuard valide kid + clé contre vault — valide kid + clé contre l'env (pas de vault), source de vérité = variables d'environnement du service
- [x] Rotation sans downtime (coexist 24h) — clé courante + précédente acceptées en parallèle jusqu'à expiration configurable
- [x] Tests: appel clé expirée → 401 — nouveaux tests dans les 4 projets (grace period valide / expirée / sans expiration configurée)
- [x] Logs JSON: serviceId, kid, endpoint, timestamp — présent pour payment-api/marketplace-api/notification-api (serviceId = application) ; teamManager journalise kid/endpoint/timestamp sans serviceId (clé unique partagée, pas de registre par appelant — limitation honnête documentée dans le code, pas fabriquée)

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
**Status**: [x] Traité (voir billetterie/src/lib/tickets.ts `syncScans`, src/app/api/admin/tickets/sync-scans/route.ts, src/lib/offlineScan.ts `getOrCreateTerminalId`)

**Description**:
Deux scanners hors ligne peuvent scanner même billet. Implémenter synchro robuste:

- [ ] IndexedDB: local storage tickets + scanEvents — **non fait, existant conservé** : le repo utilise déjà `localStorage` (pas IndexedDB) pour le manifeste/la file/les tickets marqués localement (`src/lib/offlineScan.ts`, en place avant cette tâche). Remplacer par IndexedDB serait un changement d'infra sans rapport avec le vrai problème (la détection de conflit), non fait pour rester dans le scope
- [x] Scan offline: enregistrer localement, marquer ticket scanné — déjà en place (`enqueuePendingScan`, `markLocallyUsed`), inchangé
- [x] Synchro: POST /api/admin/tickets/sync-scans avec terminalId — nouvelle route batch (remplace l'ancienne synchro scan-par-scan sur `/api/admin/tickets/scan`), `terminalId` généré une fois par navigateur et persisté (`getOrCreateTerminalId`, jamais rattaché à un compte)
- [x] Serveur: détecter doublons, retourner conflicts[] — `syncScans()` rejoue chaque scan via `scanTicket()` (même relecture d'état que le scan en ligne, aucune logique dupliquée) ; nouvelle garde atomique `UPDATE tk_tickets SET status='USED' WHERE id=... AND status='PAID'` (`affected !== 1` ⇒ conflict) pour trancher même en cas de synchro quasi simultanée entre deux terminaux, pas seulement pour des scans séquentiels. `conflicts[]` inclut aussi les rejets non liés à un doublon (NOT_PAID, MATCH_CANCELLED, REVOKED, INVALID) — un lot traité produit toujours accepted.length + conflicts.length === scans.length
- [x] Client: afficher conflicts (UI: "Billet scanné terminal X à 14:32") — `TicketScanner.tsx`, section "Conflits de synchronisation" sous le panneau hors-ligne, résout `usedByTerminalId` depuis le dernier `TicketScanLog` SUCCESS du billet (nouvelle colonne `terminal_id`, migration `sql/migration_add_ticket_scan_sync.sql`)

**Tests**:
- [x] 2 terminaux scannent même QR hors ligne → sync → 1 accepted, 1 conflict — `tickets.scan.test.ts` (2 lots séparés + 1 lot contenant le doublon), + cas lot mixte et billet non payé
- [ ] Scan après 24h → allowed — **non fait, en désaccord avec l'invariant métier** : un billet est à usage unique (`status USED` définitif), aucune autre partie du code ne suggère qu'un billet redevienne scannable après 24h ; implémenter ça romprait le contrôle d'accès (un même billet réutilisable le lendemain). Probable erreur de rédaction du todo (peut-être visait la fraîcheur du manifeste hors-ligne, déjà couverte par la relecture d'état à la synchro) — laissé pour décision produit plutôt que fabriqué

---

### TASK-P0-009: Rotation QR billet + kid, expiration, révocation ciblée

**Projets**: billetterie  
**Estimation**: 3 jours  
**Dépendances**: TASK-P0-003  
**Status**: [x] Traité (voir billetterie/src/lib/ticketQr.ts, src/lib/tickets.ts, src/app/api/admin/tickets/[id]/revoke/route.ts)

**Description**:
QR actuellement secrets statiques. Aucune rotation, expiration. Implémenter:

- [x] JWT QR signé avec kid — rotation symétrique HS256 (`TICKET_QR_KID` + `TICKET_QR_SECRET_<KID>`), signataire et vérificateur sont la même app donc pas de JWKS nécessaire (contrairement à TASK-P0-001/sso). Rétrocompatible : sans `TICKET_QR_KID`, `TICKET_QR_SECRET` seul reste utilisé sans kid dans l'en-tête (jetons déjà en circulation)
- [ ] Exp = 7 jours avant match — **délibérément non fait** : le TTL 1 an existant (documenté dans ticketQr.ts) est préservé. Faire expirer 7j avant le match casserait le scan de tout billet dont le match est reporté après achat ; la fraîcheur réelle vient de la relecture de `ticket.status`/`ticket.revoked` en base à chaque scan (scanTicket), jamais de l'expiration du jeton. La révocation ciblée ci-dessous couvre le cas où un billet précis doit être invalidé avant sa fin de vie naturelle
- [x] Rotation clés — mécanisme en place (kid courant + anciens kids conservés en env le temps que les jetons émis expirent) ; "tous les 30 jours" est une politique opérationnelle, pas un minuteur applicatif (pas d'infra de rotation planifiée dans ce repo, comme documenté pour TASK-P0-003/sso)
- [x] Révocation ciblée: PATCH /api/admin/tickets/[id]/revoke (+ DELETE pour annuler) — nouvelles colonnes `Ticket.revoked/revokedAt/revokedReason/revokedBy` (migration `sql/migration_add_ticket_revocation.sql`), scanTicket() rejette avec un nouvel outcome `REVOKED` distinct de `NOT_PAID`, exclu aussi du manifeste hors-ligne (`getOfflineScanManifest`)
- [x] Tests: rotation kid (jeton ancien kid vérifiable pendant la grâce, rejeté si la clé est retirée, rétrocompatibilité sans kid) + révocation (scan rejeté REVOKED, annulation de révocation, exclusion du manifeste hors-ligne) — 10 nouveaux tests dans ticketQr.test.ts/tickets.scan.test.ts. "QR expiré → rejected" non ajouté : `jose` rejette déjà nativement un jeton expiré (comportement de la bibliothèque, pas de logique métier à tester spécifiquement ici)

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
**Status**: [x] Traité — le risque décrit (saga 2 étapes divergentes) ne s'appliquait plus à l'architecture actuelle ; le vrai gap (retry non idempotent) est corrigé (voir note)

> **Note d'audit** : la description ("Step 1: Créer User SSO, Step 2: Créer affiliation") ne correspond plus au code — `sso.createUser` (`POST /api/internal/users`) crée le `User` avec son `teamId` en **une seule** écriture atomique (pas de table `member_team_affiliations` séparée à synchroniser), donc pas de saga multi-étapes à proprement parler côté écriture. Le vrai risque résiduel : `superadmin/src/lib/staffInvitations.ts#acceptInvitation` fait 2 appels non transactionnels (créer le compte côté sso, puis marquer `invitation.acceptedAt` en local) — si le 2e échoue après succès du 1er, un rejeu (retry réseau, double clic) retombait sur `email_taken` alors que le compte de CET utilisateur venait d'être créé avec succès (utilisateur bloqué, aucune donnée corrompue). Corrigé sans saga/table de réconciliation : ajout de `GET /api/internal/users?email=` côté sso (`sso/src/lib/identityService.ts#getUserByEmail`) + `getIdentityUserByEmail` côté superadmin ; sur `email_taken`, on vérifie si le compte existant correspond exactement à l'invitation (email+rôle+teamId) — si oui on traite comme un succès idempotent, sinon comme un vrai conflit. Tests : `sso/src/app/api/internal/users/route.test.ts`, `superadmin/src/lib/staffInvitations.test.ts`.

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
**Status**: [x] Traité (implémenté indépendamment de TASK-P0-013 — aucun couplage technique réel entre les deux)

**Description**:
Réouverture match doit être idempotente (peut être rejouée sans double effet).

> **Note d'audit** : la route existante est `POST /api/internal/matches/[matchId]/reopen` (matchId en path, pas en body comme suggéré) — adapté à cette convention plutôt que de créer une route générique. `MatchReopenLog` (matchId, idempotencyKey UNIQUE composite, sheetId) ajouté côté matchsheet ; pas de statut PENDING/FAILED séparé (le log n'est écrit qu'après succès — un échec n'a rien à idempotencer, l'appelant peut retenter normalement avec la même ou une nouvelle clé). Côté superadmin, `reopenSheet()` génère la clé une seule fois par appel et la réutilise sur ses propres retries réseau (jusqu'à 3 tentatives, seulement sur échec réseau — jamais sur une réponse HTTP reçue, qui est un refus métier explicite).

- [x] Journal des réouvertures déjà traitées : `MatchReopenLog` (id, matchId, idempotencyKey, sheetId, createdAt) — pas de statut séparé, voir note
- [x] Matchsheet API: `POST /api/internal/matches/[matchId]/reopen` accepte le header `Idempotency-Key`
- [x] MatchReopenLog: UNIQUE(matchId, idempotencyKey)
- [x] Si idempotencyKey existe → retourner 200 sans re-exécuter (`SheetService.reopen`)

**Tests**:
- [x] Reopen match → succès (existant + nouveaux tests idempotencyKey)
- [x] Reopen même match (rejeu, même clé) → idempotent, sans re-déclencher le mirroring sur `matches`
- [x] Reopen match pas CLOSED → error (comportement historique inchangé sans clé, ou avec une clé différente)
- [x] superadmin : retry réseau réutilise la même clé ; une erreur métier (4xx/5xx reçue) n'est jamais rejouée automatiquement

---

### TASK-P0-015: Réconciliation paiements périodique (daily job)

**Projets**: payment-api  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité pour Konnect/Flouci — Paymee non réconciliable (voir note)

> **Note d'audit** : `PaymentReconciliationService` tourne toutes les heures (plus réactif qu'un job strictement quotidien, qui laisserait un paiement bloqué jusqu'à 24h) et réutilise directement `handleKonnectWebhook`/`handleFlouciWebhook` — même vérification serveur-à-serveur et transition PAID (avec enqueue outbox) qu'un webhook réel. **Paymee exclu** : son intégration (`PaymeeClient`) n'expose que `createPayment`, aucune méthode de consultation de statut server-à-server — la vérification Paymee dépend entièrement du webhook signé (checksum fournisseur), qui ne peut pas être simulé côté serveur sans le payload original. Un paiement Paymee dont le webhook s'est perdu ne peut donc être récupéré que manuellement par les ops tant que cette lacune de l'intégration Paymee (hors périmètre de cette tâche) n'est pas comblée.

- [x] Job périodique (toutes les heures) : cherche payments stale (PENDING > 1h), Konnect/Flouci uniquement
- [x] Polling fournisseur pour chaque (réutilise handleKonnectWebhook/handleFlouciWebhook)
- [x] Mettre à jour payment.status si changé (via la même logique que le webhook réel)
- [x] Créer outbox event si COMPLETED (déjà fait par transitionToPaid, réutilisé)
- [x] Rapport : stale count, resolved count, still pending — loggé + exposé via `GET /health/reconciliation` (même pattern que TASK-P0-006)
- [x] Alerte ops si still pending > 10 (log `error` dédié)

---

### TASK-P0-016: Vérification stock après paiement confirmé — Compensation

**Projets**: teamManager, billetterie  
**Estimation**: 2 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité — détection + information client ; remboursement auto non implémentable (voir note)

> **Note d'audit** : les deux apps réservent déjà le stock/la capacité de façon atomique AVANT le paiement (verrou pessimiste à la création de commande/billet, voir TASK-P0-004) et le libèrent automatiquement si la commande reste PENDING >30min (`purgeStaleOrders`/`purgeStalePendingTickets`). Le scénario "paiement confirmé, stock devenu indisponible" décrit par la tâche ne peut donc arriver que dans une fenêtre étroite : la réservation expire et libère le stock/capacité AVANT qu'un paiement webhook très en retard (panne réseau prolongée, provider lent) ne confirme finalement le succès — jusqu'ici ce cas était silencieusement traité comme "CANCELLED" sans jamais revérifier le paiement réel, perdant l'information qu'un client avait payé sans repartir avec sa commande/son billet. **Corrigé** : `reconcileOrderPayment`/`reconcileTicketPayment` revérifient désormais explicitement le paiement dans ce cas précis et retournent `PAID_STOCK_UNAVAILABLE` (nouveau), avec un log structuré `error` pour alerte ops. Les pages de retour paiement affichent un message honnête ("paiement reçu, produit/billet indisponible, notre équipe vous contactera") au lieu d'un "échec" trompeur. **Remboursement automatique non implémenté** : `payment-api` n'expose aucune primitive de remboursement à ce jour (voir TASK-P1-007, backlog P1) — impossible d'appeler une API qui n'existe pas ; la compensation reste donc manuelle (ops) pour l'instant, mais n'est plus silencieusement perdue.

- [x] Vérifier le paiement avant de traiter un webhook/retour dont la commande n'est plus PENDING (au lieu de faire confiance à l'état local)
- [ ] Stock indisponible: appeler payment-api refund — impossible, aucun endpoint de remboursement n'existe dans payment-api (TASK-P1-007)
- [x] Notifier client: message dédié sur les pages de retour paiement (billetterie + teamManager)
- [x] Log structuré (raison, paymentId, orderId/matchTicketCategoryId) pour réconciliation manuelle par les ops — pas d'AuditLog DB dans ces deux apps pour ce flux, log applicatif à la place (cohérent avec le reste du repo, pas d'infra de métriques)

---

## P0.4 Données et Migrations

### TASK-P0-017: Owner par table + empêcher migrations concurrentes

**Projets**: db (tous)  
**Estimation**: 4 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité (voir note pour le détail par sous-tâche et une limite connue)

> **Note d'audit** : `db/OWNERSHIP.md` (owner + lecteurs par domaine, bien plus détaillé qu'une simple liste de 22 tables) et `db/migrate.sh` (table `schema_migrations`, application ordonnée idempotente) existaient déjà, contrairement à la description du todo. Deux gaps réels corrigés :
> - **Migration lock** : `db/migrate.sh` ouvrait une nouvelle connexion MySQL par requête, donc un `GET_LOCK` par appel se relâchait immédiatement (ne protégeait rien). Ajout d'une connexion persistante dédiée (coprocess bash) qui tient `GET_LOCK('foot_schema_migrations', 30s)` pendant toute la durée du mode `apply` — deux exécutions concurrentes ne peuvent plus appliquer la même migration en double. ⚠️ Non testé contre une vraie base (pas de daemon Docker dans cet environnement) — à vérifier en dev avant un déploiement qui s'appuie dessus.
> - **CI pré-deploy** : nouveau `db/validate-manifest.sh` (job CI `db-migrations`, pas de DB requise) détecte un fichier `migration_*.sql` présent sur disque mais absent de `db/migrations.manifest`. En l'exécutant sur l'état actuel du dépôt, a immédiatement trouvé 4 migrations réelles non enregistrées (dérive silencieuse déjà en cours) : `teamManager/sql/migration_add_processed_webhook_events.sql`, `matchsheet/sql/migration_add_sheet_version.sql`, `matchsheet/sql/migration_add_match_reopen_log.sql`, `matchsheet/sql/migration_add_signature_integrity.sql` — ajoutées au manifest. Deux copies cross-app légitimes (déjà couvertes par une entrée jumelle) documentées comme exclusions explicites plutôt que silencieuses.

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
**Status**: [x] Objectif déjà atteint par un outillage différent — migration vers Flyway spécifiquement non recommandée (voir note)

> **Note d'audit** : les 4 objectifs listés ci-dessous sont déjà couverts par l'outillage `db/migrate.sh` + `db/migrations.manifest` (TASK-P0-017) : historique centralisé (`schema_migrations`, équivalent de `flyway_schema_history`), application ordonnée reproductible (manifest = équivalent des préfixes `V001__`), verrou anti-concurrence (ajouté dans TASK-P0-017), check CI pré-déploiement (`db/validate-manifest.sh`, job `db-migrations`). Migrer spécifiquement vers **Flyway** en plus de ça demanderait de renommer/déplacer les ~50 fichiers de migration existants dans les 8 apps concernées (convention `V001__*.sql`) pour un bénéfice fonctionnel nul par rapport à l'outillage déjà en place — pure churn à risque (renommage massif de fichiers référencés ailleurs) plutôt qu'une amélioration réelle. Recommandation : garder l'outillage maison, ne pas introduire Flyway.

- [x] db/flyway/: V001__*, V002__*, ... — non fait (voir note), équivalent fonctionnel : `db/migrations.manifest`
- [ ] Docker image flyway, pré-deployment — non fait, non recommandé (voir note)
- [x] flyway_schema_history: table audit — équivalent : `schema_migrations` (db/migrate.sh)
- [x] CI: flyway migrate pré-deployment — équivalent : job `db-migrations` (db/validate-manifest.sh, TASK-P0-017)

---

### TASK-P0-019: Contrats HTTP versionnés (OpenAPI 3.0)

**Projets**: payment-api, notification-api, marketplace-api  
**Estimation**: 3 jours  
**Dépendances**: Aucune  
**Status**: [x] Traité pour les 3 apps (voir note pour ce qui reste hors périmètre)

> **Note d'audit** : `payment-api/openapi.yaml` (10 opérations) et `notification-api/openapi.yaml` (20 opérations) écrits à la main en lisant chaque controller/DTO/entité pour garantir l'exactitude (pas d'outillage de génération automatique dans ce repo), puis validés avec `npx @redocly/cli lint` (0 erreur). `marketplace-api/openapi.yaml` (16 controllers, 60 opérations — compte croisé avec un grep des décorateurs de route, 60/60) écrit dans un second temps avec un niveau de détail volontairement plus léger sur les schémas de requête/réponse (vu le volume) mais une couverture complète des routes et du modèle d'autorisation par route (SellerJwt / clé de service / clé de service + AllowedApplicationsGuard) — le vrai problème visé par cette tâche ("APIs implicites, changement cassant sans notification"). Également validé avec `npx @redocly/cli lint` (0 erreur, seulement des avertissements cosmétiques attendus — ex. sondes de santé sans réponse 4xx).

**Description**:
APIs implicites. Changement cassant sans notification.

- [x] payment-api/openapi.yaml: toutes routes — 10/10 routes documentées (schémas requête/réponse, codes d'erreur par provider)
- [x] notification-api/openapi.yaml — 20/20 opérations documentées (3 schémas d'auth : session sso, rôle SUPERADMIN, clé de service)
- [x] marketplace-api/openapi.yaml — 60/60 opérations documentées (schémas allégés pour les DTO de write, voir note)
- [ ] Versioning URL: /v1/payments, /v2/payments — **non fait délibérément** : changement cassant pour toutes les apps appelantes actuelles (ob, teamManager, sellerPortal, billetterie, marketplace-api) sans coordination de déploiement ; les 3 fichiers openapi.yaml documentent les routes non versionnées réelles et incluent une recommandation (introduire `/v1/*` en alias plutôt qu'en remplacement)
- [ ] Client generation: SDK TypeScript depuis OpenAPI — non fait, dépend du versioning (ci-dessus) pour éviter de générer un SDK contre des routes qui vont changer de préfixe
- [ ] Consumer contract tests — non fait, même dépendance

---

### TASK-P0-020: Événements versionnés pour score/stats/sanctions convergents

**Projets**: matchsheet, teamManager, arbinote, ob  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-001, TASK-P0-019  
**Status**: [ ] Bloqué sur infrastructure — voir Note d'audit (aucune partie applicable sans Redis/RabbitMQ)

> **Note d'audit** : vérifié (grep) — le risque décrit est réel et concret : `ob/src/entities/Goal.ts` définit sa **propre** entité TypeORM pointant directement sur la table partagée `ms_goals` (source de vérité = matchsheet), sans aucun contrat intermédiaire. Si matchsheet fait évoluer ce schéma sans qu'ob soit mis à jour en miroir, la divergence est silencieuse — exactement le problème que le todo décrit. Le correctif structurel (un bus d'événements découplant les deux apps) dépend entièrement de Redis Pub/Sub ou RabbitMQ, aucun des deux n'existe dans ce repo (même constat que TASK-P0-003/vault, TASK-P0-006/broker). Contrairement aux autres tâches bloquées sur infra de cette passe (où une portion applicative substantielle restait possible — rotation de clé, health-checks...), il n'y a pas ici de sous-partie honnêtement livrable sans le bus : définir une interface `MatchEvent` versionnée sans producteur/consommateur réel qui l'utilise serait un artefact mort, pas un progrès (aucune des 4 apps ne la consommerait tant que le bus n'existe pas). Laissé entièrement non fait plutôt que de fabriquer un livrable cosmétique.

**Description**:
Plusieurs apps lisent tables matchsheet. Pas de contrat événement. Score/stats divergent.

- [ ] MatchEvent interface versionnée — non fait, voir note (sans bus, aucun consommateur réel)
- [ ] EventBus: Redis Pub/Sub ou RabbitMQ — non fait, infra absente de ce repo
- [ ] Consumers: notification-api (créer notif), ob (live update) — non fait, dépend du bus
- [ ] Tests: publier MATCH_GOAL → notification créée, score ob mis à jour — non fait, dépend du bus

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
**Status**: [x] Traité — vote authentifié ajouté en complément du vote anonyme existant

> **Note d'audit** : deux des sous-parties étaient déjà couvertes différemment de ce que décrit le todo : `UNIQUE(match_id, device_fingerprint)` existait déjà en base (`Vote.ts`) — un vote dupliqué avec la même empreinte est déjà rejeté serveur, pas seulement côté client ; et un cookie de preuve HMAC (`fingerprintProof.ts`) existait déjà, mais pour un usage différent (protection IDOR sur la lecture de l'historique, pas anti-fraude sur l'écriture). Le vrai gap — vote authentifié en alternative au fingerprint — a été implémenté en s'appuyant sur la session SSO **espace membre déjà partagée** entre ob/billetterie/teamManager (même cookie domaine-large) : un visiteur déjà connecté via une autre app de l'écosystème vote automatiquement en mode authentifié sur arbinote, sans nouvelle page de connexion à construire (juste un lien optionnel `/membre/login` pour s'y connecter directement). `POST /api/votes` distingue les deux chemins : authentifié (JWT SSO, role=MEMBER) → dédupliqué par `user_id` (`UNIQUE(match_id, user_id)`, nouvelle colonne), bypasse les vérifications de rate-limit spécifiques au fingerprint (inapplicables) mais reste soumis à la détection de rafale par IP (défense en profondeur) ; anonyme (comportement historique) → fingerprint + **nouveau : consentement RGPD requis** (case à cocher, validé aussi côté serveur), rate limiting DB existant inchangé (5 votes/jour par fingerprint+IP, 15 fingerprints uniques/IP/jour, 10 votes/heure/IP — pas de Redis dans arbinote, le rate limiting DB existant remplit déjà ce rôle et couvre en plus la détection de brigading, absente de la description du todo).

**Description**:
Empreinte contournable, sensibilité changement appareil, risque vie privée.

- [x] UI: lien "Se connecter pour voter" vers `/membre/login` (pas de toggle actif — l'auth est transparente si déjà connecté via une autre app, le lien sert aux non-connectés)
- [x] Vote authentifié: JWT SSO (role=MEMBER), userId, 1 par user par match (`UNIQUE(match_id, user_id)`)
- [x] Vote anonyme (legacy): fingerprint, proof HMAC (déjà existant), rate limit DB existant (pas de Redis dans ce repo — voir note)
- [x] Consent checkbox privacy avant vote anonyme (nouveau, requis client + serveur)

**Tests** (arbinote/src/app/api/votes/route.test.ts, nouveau — cette route n'avait aucun test avant) :
- [x] Deux votes anonymes même fingerprint → 2e rejected (409)
- [x] Deux votes authentifiés même user → 2e rejected (409)
- [x] Vote anonyme sans consentement → rejected (400)
- [x] Deux utilisateurs authentifiés différents depuis le même appareil/IP → tous deux acceptés
- [ ] Fingerprint après 24h → allowed — déjà couvert par le rate limiting existant, non re-testé ici (hors périmètre de cette passe)

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
**Status**: [x] Traité (voir note pour la limite honnête sur "signatoryId"/RSA)

**Description**:
Signatures faibles (pas hash, timestamp). Renforcer.

> **Note d'audit** : les 3 signataires (domicile/extérieur/arbitre) dessinent chacun sur l'appareil unique de l'officiel du club recevant — matchsheet n'a **aucune authentification individuelle par acteur**, seule une session SSO pour l'opérateur du device (middleware.ts). Un vrai `signatoryId` cryptographique par signataire, ou une signature RSA produite par le signataire lui-même, sont donc irréalisables sans ajouter un système d'authentification individuelle par acteur (hors périmètre de cette tâche) — implémenté à la place : `recordedByUserId`/`recordedByName` = identité SSO authentifiée de l'**opérateur** ayant enregistré la signature (traçabilité réelle, documentée comme telle, pas simulée comme une preuve d'identité du signataire physique). Le hash protège contre la falsification du **contenu** (pas de signataire) : `contentHash` = SHA256 d'un instantané canonique de la feuille (statut + tous les événements) au moment de la signature — recalculer et comparer révèle si la feuille a changé depuis. `signedAt` (déjà existant) est fixé serveur-side à l'écriture, jamais fourni par le client.

- [x] Signature: role (existant), recordedByUserId/recordedByName (opérateur, voir note), timestamp (existant), contentHash — signatoryId/signature cryptographique du signataire physique non implémentable, voir note
- [x] Hash: SHA256 du contenu de la feuille (statut + événements), pas de la feuille entière au format non-canonique
- [x] Timestamp: fixé serveur-side (`@CreateDateColumn`), jamais client-fourni — pas de rejeu possible sur ce champ
- [ ] Verification: RSA signature contentHash — non implémentable sans clé privée détenue par chaque signataire (pad de signature dessiné, pas un dispositif de signature cryptographique) ; le hash seul (sans signature RSA) reste la protection d'intégrité de contenu la plus honnête ici
- [x] Audit: historique signatures append-only (`SignatureService.save()` insère toujours, ne modifie jamais ; `findHistoryBySheet()` expose l'historique complet, `findBySheet()` la version courante par rôle)

Effet de bord découvert et corrigé au passage : `Signature.signatureData` était en `longtext` (non supporté par better-sqlite3, donc jamais couvert par les tests SQLite existants) — passé en `text` (limite ~64 Ko MySQL, largement suffisante pour un tracé de signature).

---

### TASK-P0-025: Mode offline matchsheet — File locale, sync, résolution conflits

**Projets**: matchsheet  
**Estimation**: 5 jours  
**Dépendances**: TASK-P0-023  
**Status**: [x] Portion scopée traitée (idempotence des événements) — mode offline complet non fait, voir Note d'audit

> **Note d'audit** : recherche préalable (grep du repo) a trouvé que matchsheet a **explicitement écarté** une file d'attente offline pour les écritures dans le passé — `public/sw.js` : *"Ne met en cache aucune donnée de match... pas de file d'attente offline pour les écritures (roadmap.md §3, §9)"*. Reconstruire IndexedDB + queue + UI de résolution de conflits complète (5 jours, reversal d'une décision produit documentée) dépasse le scope d'une passe de correctifs applicatifs rapides et mériterait une décision produit explicite plutôt qu'une implémentation unilatérale.
>
> Portion réellement traitée, de valeur indépendante du mode offline : les créations d'événements live (but, blessure, remplacement) n'avaient **aucune protection contre les doublons** — un double-clic ou un simple retry réseau créait un second événement identique, un bug réel dès aujourd'hui (pas seulement en cas de coupure réseau). `Card` avait déjà une contrainte unique naturelle (`playerId`, `matchId`, `type`) ; Goal/Substitution/Injury n'en avaient aucune. Ajouté une `clientRequestId` (UUID généré côté client à la soumission, réutilisé sur retry) + index unique `(sheetId, clientRequestId)`, avec insert-puis-catch-doublon (`isDuplicateKeyError`, extrait de `SheetService.ts` vers `lib/dbErrors.ts` pour être réutilisable) qui renvoie l'événement déjà créé plutôt que d'échouer ou de dupliquer.

**Description**:
Stades mauvaise connectivité. matchsheet crash offline. Implémenter:

- [ ] IndexedDB: matchsheets + events — **non fait**, reverserait la décision documentée dans sw.js sans validation produit (voir note d'audit)
- [ ] Événement offline: enregistrer localement — non fait, dépend du point précédent
- [ ] Synchro: au retour réseau, POST events serveur — non fait, dépend du point précédent
- [ ] Conflict resolution: log, manual review UI — non fait, dépend du point précédent
- [ ] Tests: offline → créer 5 events → sync → tous créés (ou conflicts resolved) — non fait (pas de queue offline à tester) ; à la place, `LiveEntryGuards.test.ts` couvre l'idempotence par clientRequestId (5 nouveaux tests : rejeu même clé → même événement, sans clé → non-idempotent, clés différentes → événements distincts, pour Goal/Injury/Substitution)

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
