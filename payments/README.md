# payments

## Rôle du projet

API NestJS mutualisée d'initialisation, suivi et réception de paiements Konnect, Paymee et Flouci.

## Fonctionnalités publiques

`GET /health`; webhooks fournisseurs `GET /payments/konnect/webhook`, `POST /payments/providers/paymee/webhook` et `POST /payments/providers/flouci/webhook` (publics pour permettre les callbacks, validés selon le fournisseur).

**Pages inventoriées :** Aucune page (service HTTP uniquement).

## Fonctionnalités administratives

API sans pages. `POST` d'initialisation pour chaque fournisseur, `GET /payments/:id` et toute l'API de remboursement (`/payments/:id/refunds/*`, `/refunds/*`) sont réservés aux services appelants — une éventuelle UI opérateur (federation-hub) appelle ces routes avec sa propre clé de service.

## API

Contrôleurs: health; `GET /payments/:id`; initialisation et webhook Konnect, Paymee, Flouci. Les chemins exacts sont résumés dans les fonctionnalités publiques/administratives ci-dessus.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

**Contrat OpenAPI 3.0** (TASK-P0-019) : `openapi.yaml` décrit les routes ci-dessus (schémas de requête/réponse, codes d'erreur). Reflète les routes non versionnées actuelles — le versioning d'URL (`/v1/*`) suggéré par le todo n'a pas été fait, changement cassant pour toutes les apps appelantes sans coordination de déploiement (voir commentaire en tête du fichier). Validé avec `npx @redocly/cli lint openapi.yaml`.

### Remboursements (TASK-P0-001)

- `POST /payments/:paymentId/refunds` (idempotent via header `idempotency-key`) : demande un remboursement total (montant omis) ou partiel. Le montant restant remboursable est toujours recalculé côté serveur sous verrou (`SELECT ... FOR UPDATE` sur `payments`) pour rester correct sous requêtes concurrentes.
- `GET /payments/:paymentId/refunds` / `GET /payments/:paymentId/refunds/remaining` : consultation.
- `GET /refunds?status=MANUAL_REVIEW` (défaut) : file d'attente opérateur.
- `GET /refunds/:id` : détail + historique de statuts (append-only).
- `POST /refunds/:id/retry` : rejoue un remboursement automatisé `FAILED`.
- `POST /refunds/:id/confirm` / `POST /refunds/:id/reject` : réconciliation opérateur d'un remboursement `MANUAL_REVIEW`.

**Seul Flouci expose une API de remboursement automatisée**, vérifié contre la documentation officielle des trois fournisseurs (`https://docs.konnect.network`, `https://www.paymee.tn`, `https://docs.flouci.com/api-reference/refund-payment`) : Konnect et Paymee ne documentent aucun endpoint de remboursement public — leurs remboursements passent systématiquement par `MANUAL_REVIEW`, jamais par un faux succès. Flouci ne documente par ailleurs aucun paramètre de montant partiel sur `refund_payment` (il rembourse le montant total de l'appel) : un remboursement partiel sur un paiement Flouci est donc, lui aussi, orienté vers `MANUAL_REVIEW` plutôt que d'appeler le fournisseur pour plus que ce qui a été demandé.

## Authentification et autorisations

`ServiceAuthGuard` contrôle initialisations et lecture avec `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`, TASK-P0-003 — voir `src/config/service-clients.config.ts`). Les webhooks ne portent pas cette clé; ils valident signature/secret ou relisent le statut fournisseur selon l'implémentation. `PAYMENT_WEBHOOK_SECRET` signe les callbacks sortants. Aucun secret ne doit aller au frontend.

## Données possédées

Base dédiée configurée par `DB_*`, entités Payment (référence externe, fournisseur, montant/devise, état et métadonnées), Refund et RefundStatusHistory (montant, statut, motif, historique append-only des transitions).

**Migrations réellement présentes :** `sql/migration_add_refunds.sql` (tables `refunds`/`refund_status_history`, additive). Le reste du schéma (`payments`, outbox) n'a toujours pas de fichier de migration ; ne pas en déduire un schéma déployable complet à partir des seules entités TypeORM.

## Intégrations

APIs Konnect/Paymee/Flouci; notifications après confirmation; dispatcher vers les URLs `WEBHOOK_URLS` (ticketing/club-hub).

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `NODE_ENV`, `PORT`, `KONNECT_BASE_URL`, `KONNECT_API_KEY`, `KONNECT_WALLET_ID`, `KONNECT_WEBHOOK_URL`, `KONNECT_SUCCESS_URL`, `KONNECT_FAIL_URL`, `PAYMEE_BASE_URL`, `PAYMEE_API_KEY`, `PAYMEE_WEBHOOK_URL`, `PAYMEE_RETURN_URL`, `PAYMEE_CANCEL_URL`, `FLOUCI_BASE_URL`, `FLOUCI_PUBLIC_KEY`, `FLOUCI_PRIVATE_KEY`, `FLOUCI_WEBHOOK_URL`, `FLOUCI_SUCCESS_URL`, `FLOUCI_FAIL_URL`, `SERVICE_API_KEYS`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `WEBHOOK_URLS`, `PAYMENT_WEBHOOK_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3000 par défaut dans `src/main.ts` et `.env.example`; prévoir un autre `PORT` si referee-center tourne aussi.

Le script racine `../start.sh` ne lance que `sso`, `referee-center`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test`, `pnpm test:e2e`, `pnpm test:cov`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Le service n'est pas un ledger comptable (pas d'écritures brut/frais/commission — voir TASK-P1-007 du backlog). Le remboursement automatisé n'existe que pour Flouci et seulement en totalité (voir "Remboursements" ci-dessus) ; Konnect, Paymee et tout remboursement partiel Flouci passent par une file opérateur `MANUAL_REVIEW`, sans SLA ni alerte automatique en cas de file qui grossit (pas de tableau de bord ni d'astreinte — TASK-P2-002 du backlog). La fiabilité des redirections dépend des URLs fournisseur; les consommateurs doivent réconcilier par ID/webhook. Le schéma `payments`/outbox n'a pas de fichier de migration (voir "Données possédées").
