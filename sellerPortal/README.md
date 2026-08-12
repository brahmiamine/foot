# sellerPortal

## Rôle du projet

Portail autonome des vendeurs marketplace: catalogue, stock et traitement des commandes.

## Fonctionnalités publiques

Inscription, connexion, oubli/réinitialisation du mot de passe.

**Pages inventoriées :** `/forgot-password`, `/login`, `/register`, `/reset-password`, `/categories`, `/dashboard`, `/earnings`, `/inventory`, `/notifications`, `/orders/[id]`, `/orders/[id]/shipping`, `/orders`, `/orders/returns`, `/payouts`, `/products/[id]`, `/products/new`, `/products`, `/settings/account`, `/settings/profile`, `/`

## Fonctionnalités administratives

Tableau vendeur: produits/variantes, catégories, inventaire, commandes/expédition/retours, revenus, payouts, notifications et paramètres de compte/profil.

## API

`/api/auth/change-password`, `/api/auth/forgot-password`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`, `/api/auth/reset-password`, `/api/categories`, `/api/dashboard/summary`, `/api/earnings`, `/api/health`, `/api/inventory/[id]`, `/api/inventory`, `/api/notifications/[id]/read`, `/api/notifications/read-all`, `/api/notifications`, `/api/orders/[id]`, `/api/orders/[id]/shipping`, `/api/orders/[id]/status`, `/api/orders`, `/api/payouts`, `/api/product-variants/[id]`, `/api/products/[id]/duplicate`, `/api/products/[id]`, `/api/products/[id]/submit`, `/api/products/[id]/toggle-active`, `/api/products/[id]/variants`, `/api/products`, `/api/returns`, `/api/sellers/me`, `/api/teams`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Cookie JWT vendeur signé par `SP_JWT_SECRET`, distinct du SSO. Les helpers d'autorisation vérifient vendeur et club sur les ressources; marketplace-api dispose par ailleurs de son propre JWT vendeur lorsque activée.

## Données possédées

Tables `sp_*` dans `foot`: vendeurs/utilisateurs, catégories, produits/images/variantes, inventaire, commandes/lignes, retours, payouts et notifications, avec `club_id` pour le cloisonnement.

**Migrations réellement présentes :** `sql/schema.sql`; ajout des champs de modération et migration/backfill manuel de `club_id`.

## Intégrations

MariaDB partagée; SMTP pour récupération de compte; client marketplace-api présent mais le portail conserve encore ses entités/accès locaux; branding d'équipe partagé.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SP_JWT_SECRET`, `SP_COOKIE_NAME`, `NEXT_PUBLIC_APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3006, fixé dans `dev` et `start`.

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Architecture de transition: duplication entre tables locales et marketplace-api, donc cette dernière n'est pas encore l'unique source de vérité. Vérifier/backfiller `club_id` sur installations existantes. Payouts en lecture, pas de déclenchement bancaire.
