# payment-api

## Rôle du projet

API NestJS mutualisée d'initialisation, suivi et réception de paiements Konnect, Paymee et Flouci.

## Fonctionnalités publiques

`GET /health`; webhooks fournisseurs `GET /payments/konnect/webhook`, `POST /payments/providers/paymee/webhook` et `POST /payments/providers/flouci/webhook` (publics pour permettre les callbacks, validés selon le fournisseur).

**Pages inventoriées :** Aucune page (service HTTP uniquement).

## Fonctionnalités administratives

API sans pages. `POST` d'initialisation pour chaque fournisseur et `GET /payments/:id` sont réservés aux services appelants.

## API

Contrôleurs: health; `GET /payments/:id`; initialisation et webhook Konnect, Paymee, Flouci. Les chemins exacts sont résumés dans les fonctionnalités publiques/administratives ci-dessus.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

`ServiceAuthGuard` contrôle initialisations et lecture avec `SERVICE_API_KEYS` (rotation sans interruption via `SERVICE_API_KEYS_PREVIOUS`/`SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT`, TASK-P0-003 — voir `src/config/service-clients.config.ts`). Les webhooks ne portent pas cette clé; ils valident signature/secret ou relisent le statut fournisseur selon l'implémentation. `PAYMENT_WEBHOOK_SECRET` signe les callbacks sortants. Aucun secret ne doit aller au frontend.

## Données possédées

Base dédiée configurée par `DB_*`, entité Payment (référence externe, fournisseur, montant/devise, état et métadonnées).

**Migrations réellement présentes :** Aucun dossier SQL/migration; ne pas déduire un schéma déployable de la seule entité TypeORM.

## Intégrations

APIs Konnect/Paymee/Flouci; notification-api après confirmation; dispatcher vers les URLs `WEBHOOK_URLS` (billetterie/teamManager).

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

**Port :** 3000 par défaut dans `src/main.ts` et `.env.example`; prévoir un autre `PORT` si arbinote tourne aussi.

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:e2e`, `pnpm test:cov`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Le service ne rembourse pas automatiquement et n'est pas un ledger comptable. La fiabilité des redirections dépend des URLs fournisseur; les consommateurs doivent réconcilier par ID/webhook. Aucun fichier de migration présent.
