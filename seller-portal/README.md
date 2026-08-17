# seller-portal

## Rôle du projet

Portail privé des vendeurs marketplace : catalogue, stock et traitement des commandes. **Ce projet n'est plus un point d'entrée d'inscription publique.**

## Onboarding vendeur

Le parcours canonique est :

```text
site officiel du club (ex. club-ob)
  → demande vendeur
  → marketplace
  → revue/approbation club-hub selon settings
  → création Seller + SellerUser INVITED
  → invitation d'activation
  → seller-portal /activate
  → choix du mot de passe
  → compte ACTIVE
```

`/register` reste uniquement une page d'information/redirection vers le site du club. `/api/auth/register` est volontairement désactivé et ne crée plus de vendeur.

## Fonctionnalités accessibles sans session vendeur

Connexion, activation par invitation, oubli/réinitialisation du mot de passe et page d'orientation pour devenir vendeur.

**Pages inventoriées :** `/activate`, `/forgot-password`, `/login`, `/register`, `/reset-password`, `/categories`, `/dashboard`, `/earnings`, `/inventory`, `/notifications`, `/orders/[id]`, `/orders/[id]/shipping`, `/orders`, `/orders/returns`, `/payouts`, `/products/[id]`, `/products/new`, `/products`, `/settings/account`, `/settings/profile`, `/`.

## Fonctionnalités vendeur

Tableau vendeur : produits/variantes, catégories, inventaire, commandes/expédition/retours, revenus, payouts, notifications et paramètres de compte/profil. La publication des produits suit la policy du club portée par Marketplace ; un produit peut nécessiter une approbation ou une nouvelle approbation après modification sensible.

## API

`/api/auth/activate`, `/api/auth/change-password`, `/api/auth/forgot-password`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register` (**désactivé / 410**), `/api/auth/reset-password`, `/api/categories`, `/api/dashboard/summary`, `/api/earnings`, `/api/health`, `/api/inventory/[id]`, `/api/inventory`, `/api/notifications/[id]/read`, `/api/notifications/read-all`, `/api/notifications`, `/api/orders/[id]`, `/api/orders/[id]/shipping`, `/api/orders/[id]/status`, `/api/orders`, `/api/payouts`, `/api/product-variants/[id]`, `/api/products/[id]/duplicate`, `/api/products/[id]`, `/api/products/[id]/submit`, `/api/products/[id]/toggle-active`, `/api/products/[id]/variants`, `/api/products`, `/api/returns`, `/api/sellers/me`, `/api/teams`.

## Authentification et autorisations

Cookie JWT vendeur signé par `SP_JWT_SECRET`, distinct du SSO staff/membre. Le compte vendeur doit avoir été activé par invitation. Les helpers d'autorisation vérifient vendeur et club sur les ressources ; Marketplace dispose également de son JWT vendeur pour ses routes dédiées.

L'invitation d'activation est générée côté Marketplace avec un jeton aléatoire, stocké sous forme de hash, limité dans le temps et à usage unique. Le navigateur ne reçoit jamais une clé de service Marketplace.

## Données possédées / transition d'architecture

Tables historiques `sp_*` dans `foot` : vendeurs/utilisateurs, catégories, produits/images/variantes, inventaire, commandes/lignes, retours, payouts et notifications, avec `club_id` pour le cloisonnement.

Le schéma SQL reste actuellement versionné sous `seller-portal/sql`, tandis que la logique métier Marketplace est progressivement centralisée dans le service `marketplace`. Cette coexistence est une architecture de transition : aucune nouvelle règle métier ne doit être dupliquée dans le portail.

**Migrations pertinentes :** `sql/schema.sql`, migrations de modération/club_id, checkout/stock/retours et `sql/migration_add_seller_governance.sql` pour demandes vendeurs, settings et invitations.

## Intégrations

- `marketplace` : source métier des demandes vendeurs, activation, products/modération et workflows marketplace ;
- notifications/SMTP selon le flux : invitation, décisions et événements vendeur ;
- branding d'équipe partagé.

La demande publique est portée par le site du club (`club-ob` pour l'Olympique de Béja), jamais par ce portail.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Renseigner les variables présentes dans `.env.example`, notamment DB, secret/cookie vendeur, URL publique du portail et configuration Marketplace/notifications/SMTP selon le parcours activé. Ne jamais committer de valeurs réelles.

## Démarrage

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3006, fixé dans `dev` et `start`.

## Tests

`pnpm test`, `pnpm test:i18n` ainsi que typecheck/build dans la CI du monorepo.

## Limites connues

- architecture de transition : des accès/entités locaux coexistent encore avec Marketplace ;
- Marketplace doit devenir progressivement l'unique source de vérité métier ;
- vérifier/backfiller `club_id` sur les installations historiques ;
- payouts présents mais sans grand livre financier complet par commande.

Voir [`../docs/platform-capabilities.md`](../docs/platform-capabilities.md) pour le statut canonique et [`../platform-governance-roadmap.md`](../platform-governance-roadmap.md) pour les améliorations planifiées.
