# payments

## Rôle du projet

API NestJS mutualisée d'initialisation, suivi et réception de paiements Konnect, Paymee et Flouci. Le service est aussi la source de vérité des remboursements, de leur gouvernance d'approbation et de la file opérateur `MANUAL_REVIEW`.

## Fonctionnalités publiques

`GET /health`; webhooks fournisseurs `GET /payments/konnect/webhook`, `POST /payments/providers/paymee/webhook` et `POST /payments/providers/flouci/webhook` (publics pour permettre les callbacks, validés selon le fournisseur).

**Pages inventoriées :** Aucune page dans `payments` (service HTTP uniquement). La console opérateur des remboursements manuels est rendue par `federation-hub` et consomme Payments côté serveur.

## Fonctionnalités administratives

Les initialisations, lectures et remboursements sont réservés aux services appelants via `ServiceAuthGuard`. Les routes opérateur globales (`/refunds/*`, `/refund-policies/*`, `/refund-manual-review/*`) exigent en plus `RefundOperatorGuard` et ne sont accessibles qu'à l'application `federation-hub`.

Dans Federation Hub, la console `/admin/payments/manual-review` est volontairement limitée à `PLATFORM_SUPERADMIN` / legacy `SUPERADMIN` : les remboursements Payments ne portent pas encore de `federationId`, donc les exposer aux administrateurs fédération/ligue créerait une fuite de périmètre. La clé de service Payments reste exclusivement côté serveur Federation Hub ; le navigateur ne la reçoit jamais.

## API

Contrôleurs: health; `GET /payments/:id`; initialisation et webhook Konnect, Paymee, Flouci ; remboursement et gouvernance opérateur. Les chemins principaux sont résumés ci-dessous.

> Les routes dynamiques (`:id`, `:paymentId`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

**Contrat OpenAPI 3.0** (TASK-P0-019) : `openapi.yaml` décrit les routes historiques de paiement et de remboursement (schémas de requête/réponse, codes d'erreur). Les routes internes de gouvernance ajoutées après ce contrat sont documentées dans ce README et protégées par les guards serveur ; le versioning d'URL (`/v1/*`) n'a pas été introduit car il serait cassant pour les applications appelantes sans coordination de déploiement.

### Remboursements

- `POST /payments/:paymentId/refunds` (idempotent via header `idempotency-key`) : demande un remboursement total (montant omis) ou partiel. Le montant restant remboursable est toujours recalculé côté serveur sous verrou (`SELECT ... FOR UPDATE` sur `payments`) pour rester correct sous requêtes concurrentes.
- `GET /payments/:paymentId/refunds` / `GET /payments/:paymentId/refunds/remaining` : consultation.
- `GET /refunds?status=MANUAL_REVIEW` (défaut) : file d'attente opérateur.
- `GET /refunds/:id` : détail + historique de statuts append-only.
- `POST /refunds/:id/retry` : rejoue un remboursement automatisé `FAILED` quand son état d'approbation le permet.
- `POST /refunds/:id/confirm` / `POST /refunds/:id/reject` : réconciliation opérateur d'un remboursement `MANUAL_REVIEW` avec identité humaine de confiance dans `x-operator-user-id`.

**Seul Flouci expose une API de remboursement automatisée** dans les intégrations actuellement implémentées. Konnect et Paymee ne disposent pas d'endpoint automatisé utilisé par ce service ; leurs remboursements passent par `MANUAL_REVIEW`. Flouci est automatisé seulement pour le remboursement total admissible ; les remboursements partiels sont orientés vers la revue manuelle plutôt que de rembourser un montant différent de celui demandé.

### Politique d'approbation des remboursements — PAY-002

`GET/PUT /refund-policies/:consumerApplication` permet à l'opérateur Payments de gérer une policy par application consommatrice :

- `AUTO` sous le seuil configuré ;
- `SINGLE_APPROVAL` par défaut / dans la plage intermédiaire ;
- `DUAL_APPROVAL` à partir du seuil élevé ;
- maker/checker configurable et version de policy persistée.

Chaque remboursement conserve un snapshot immuable du mode/version de policy utilisé. `AWAITING_APPROVAL` réserve le montant contre le paiement. En `DUAL_APPROVAL`, deux opérateurs distincts sont requis et le maker ne peut pas s'auto-approuver quand maker/checker est actif. Les chemins `retry`/`confirm` ne permettent pas de ressusciter un remboursement rejeté avant approbation.

### SLA de `MANUAL_REVIEW` — PAY-003

Les routes opérateur suivantes sont protégées par `ServiceAuthGuard` + `RefundOperatorGuard` :

- `GET /refund-manual-review/dashboard` : file courante avec état `IN_SLA`, `DUE_SOON`, `OVERDUE`, `ESCALATED` ou `UNSCHEDULED` ;
- `GET /refund-manual-review/policies/:consumerApplication` : policy SLA effective ;
- `PUT /refund-manual-review/policies/:consumerApplication` : modification versionnée par opérateur identifié.

Policy par défaut quand aucune configuration n'existe :

- SLA : **24 h** (`1440` minutes) ;
- reminder : **4 h avant** l'échéance (`240` minutes) ;
- escalation : **1 h après** l'échéance (`60` minutes).

Lors de chaque entrée dans `MANUAL_REVIEW`, Payments calcule et conserve un snapshot du cycle (`manualReviewStartedAt`, `manualReviewReminderAt`, `manualReviewDueAt`, `manualReviewEscalateAt`, version de policy). Modifier une policy ne déplace donc pas rétroactivement l'échéance d'un dossier déjà ouvert.

`RefundManualReviewSlaWorkerService` vérifie périodiquement les dossiers. Les reminders et escalades utilisent :

- verrou pessimiste sur le remboursement ;
- marqueurs persistés `manualReviewReminderSentAt` / `manualReviewEscalatedAt` ;
- `eventId` déterministe incluant le remboursement, le cycle et le rôle destinataire ;
- déduplication côté Notifications ;
- livraison aux rôles `PLATFORM_SUPERADMIN` et legacy `SUPERADMIN`.

La livraison SLA est volontairement **required** : si Notifications est indisponible ou non configuré, le marqueur local n'est pas avancé et le cycle suivant réessaie. Cela évite de déclarer un reminder/escalation traité sans notification réellement acceptée.

## Authentification et autorisations

`ServiceAuthGuard` contrôle initialisations et lecture avec `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`). `RefundOperatorGuard` réduit encore les routes d'administration des remboursements à `federation-hub`. Les webhooks fournisseurs ne portent pas la clé de service ; ils valident signature/secret ou relisent le statut fournisseur selon l'implémentation. `PAYMENT_WEBHOOK_SECRET` signe les callbacks sortants. Aucun secret ne doit aller au frontend.

## Données possédées et migrations

Base dédiée configurée par `DB_*`, avec notamment :

- `Payment` : référence externe, fournisseur, montant/devise, état et métadonnées ;
- `Refund` : montant, statut, snapshots d'approbation et de SLA ;
- `RefundStatusHistory` : historique append-only des transitions ;
- policies de routing, d'approbation remboursement et de SLA `MANUAL_REVIEW` ;
- outbox transactionnelle des événements sortants.

Le schéma autonome Payments est versionné par migrations TypeORM dans `src/database/migrations/` :

- `1786841000000-BaselinePaymentsSchema.ts` ;
- `1786990000000-AddPaymentRoutingPolicies.ts` ;
- `1787000000000-AddRefundApprovalGovernance.ts` ;
- `1787010000000-AddRefundManualReviewSla.ts`.

`src/database/data-source.ts` et `src/config/database.config.ts` référencent la même séquence. En production, appliquer les migrations avant le rollout avec `npm run migration:run:prod` (ou `DB_RUN_MIGRATIONS=true` si ce mode de déploiement est explicitement choisi). Le fichier historique `sql/migration_add_refunds.sql` reste conservé pour l'ancien schéma partagé, mais ne remplace pas la chaîne TypeORM de la base autonome.

Voir aussi `../docs/architecture/database-migrations.md`.

## Intégrations

APIs Konnect/Paymee/Flouci ; Notifications pour confirmations, reminders et escalades ; dispatcher vers les URLs `WEBHOOK_URLS` des applications consommatrices ; Federation Hub pour la console financière plateforme.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `NODE_ENV`, `PORT`, `KONNECT_BASE_URL`, `KONNECT_API_KEY`, `KONNECT_WALLET_ID`, `KONNECT_WEBHOOK_URL`, `KONNECT_SUCCESS_URL`, `KONNECT_FAIL_URL`, `PAYMEE_BASE_URL`, `PAYMEE_API_KEY`, `PAYMEE_WEBHOOK_URL`, `PAYMEE_RETURN_URL`, `PAYMEE_CANCEL_URL`, `FLOUCI_BASE_URL`, `FLOUCI_PUBLIC_KEY`, `FLOUCI_PRIVATE_KEY`, `FLOUCI_WEBHOOK_URL`, `FLOUCI_SUCCESS_URL`, `FLOUCI_FAIL_URL`, `SERVICE_API_KEYS`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `WEBHOOK_URLS`, `PAYMENT_WEBHOOK_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, npm/pnpm selon le script utilisé et une base MySQL/MariaDB compatible configurée.

```bash
npm ci
npm run build
npm test
npm run start:dev
```

**Port :** 3000 par défaut dans `src/main.ts` et `.env.example`; prévoir un autre `PORT` si un autre service utilise déjà ce port.

Le script racine `../start.sh` ne lance qu'un sous-ensemble des applications du monorepo ; `payments` et `notifications` disposent de leur propre base et se lancent séparément selon l'environnement.

## Tests

`npm test`, `npm run test:e2e`, `npm run test:cov`. Le job CI Payments exécute lint, build et tests. Les scripts `lint` locaux utilisent `--fix` ; la CI appelle ESLint sans `--fix` afin de détecter les écarts de formatage sans modifier le checkout.

## Limites connues

Le service n'est pas encore un ledger comptable détaillé : `gross/providerFee/platformFee/clubNet/sellerNet/refund/settlement` reste suivi par `PAY-004`. La réconciliation financière provider/interne avec file d'écarts et résolution auditée reste `PAY-005`. Le SLA de revue manuelle est maintenant présent, mais il reste spécifique au domaine Payments ; sa généralisation en moteur transversal commun aux workflows est suivie séparément par `GOV-008`.