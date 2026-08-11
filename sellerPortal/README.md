# sellerPortal — portail vendeur générique multi-clubs

> Anciennement `ob-seller-portal`. Renommé dans le cadre de la normalisation
> de l'architecture (voir le README racine, section « Classification des
> projets ») : ce portail est une application **générique**, au même titre
> que `teamManager`, `billetterie` ou `sso` — elle ne doit contenir aucune
> logique spécifique à un club particulier (voir « Portée V1 » ci-dessous
> pour l'écart encore existant avec cet objectif).

Application Next.js indépendante destinée aux **vendeurs tiers** qui
proposent leurs produits sur le marketplace d'un club. Ce n'est **pas** une
copie de `teamManager` : `teamManager` reste l'outil d'administration
interne du club (validation des vendeurs, modération des produits,
commissions, payouts...) ; `sellerPortal` ne fait que consommer/exposer
les données scopées au vendeur connecté.

```
Site vitrine du club → Marketplace → Supporters
                                    → Seller Portal → Marketplace API → Sellers / Products / Orders
teamManager (admin club)           → Marketplace API
```

Un vendeur est rattaché au marketplace d'un club donné (ex. vendeur A →
Club A, vendeur B → Olympique de Béja) et ne doit jamais voir les produits,
commandes, stocks ou données du marketplace d'un autre club.

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, SP_JWT_SECRET (voir ../start.sh pour la base partagée)
npm install
# importer sql/schema.sql dans la base "foot" (une seule fois)
mariadb -h 127.0.0.1 -P 3307 -u "$DB_USER" -p foot < sql/schema.sql
npm run seed                 # optionnel : jeu de données de démo
npm run dev                  # http://localhost:3006
```

Identifiants de démo (après `npm run seed`) : voir la sortie du script
(`demo@vendeur.example` par défaut).

## Principes d'architecture

- **Multi-tenant** : un seul déploiement sert tous les vendeurs, de tous
  les clubs. Le vendeur courant est déterminé **exclusivement** côté serveur
  à partir du cookie de session (`src/lib/session.ts` + `src/lib/authz.ts`),
  jamais d'un `sellerId` envoyé par le frontend. Toute route API charge une
  ressource par son id puis vérifie `resource.sellerId === session.sellerId`
  (`assertOwnedBySeller`) — un vendeur qui devine l'id d'une ressource d'un
  autre vendeur reçoit un 404, jamais un 403 qui confirmerait son existence.
- **Authentification indépendante** du SSO club (`../sso`) : les vendeurs
  ne sont pas des utilisateurs d'un club. Cookie httpOnly signé (`jose`),
  mots de passe hashés (`bcryptjs`). Le modèle `Seller` → `SellerUser`
  supporte déjà plusieurs comptes par vendeur (OWNER/MANAGER/STAFF) même si
  la V1 n'en crée qu'un (OWNER) à l'inscription.
- **Modération réservée à l'administration du club** : le vendeur ne peut
  jamais publier un produit directement. Les transitions qu'il a le droit
  de déclencher lui-même sont explicitement listées dans
  `src/entities/enums.ts` (`SELLER_ALLOWED_PRODUCT_TRANSITIONS`,
  `SELLER_ORDER_FORWARD_TRANSITIONS`) — tout le reste (APPROVED, REJECTED,
  DELIVERED, remboursements, commission...) est piloté par la Marketplace
  API / teamManager du club.
- **Stock backend-only** : `available` est la seule quantité modifiable par
  le vendeur ; `reserved`/`sold` sont dérivés du traitement des commandes.
- **Pas de credentials de paiement** ici : `/payouts` n'est qu'un historique
  en lecture, le déclenchement réel sera assuré par le futur Payment API.

## Où vit vraiment la donnée ?

Pour rester autonome en V1 sans dépendre d'une Marketplace API déjà
existante, cette app gère elle-même ses tables (`sp_*`, voir
`sql/schema.sql`) dans la base MariaDB partagée `foot`, via TypeORM
(`src/lib/database.ts`) — même mécanisme que `teamManager`/`ob`. Toute la
logique métier est isolée derrière les routes `src/app/api/**` : le jour où
une vraie Marketplace API séparée existera, ces routes peuvent être
déplacées telles quelles sans toucher au frontend, qui ne parle qu'à
`/api/*` via `src/lib/apiClient.ts`.

`sp_market_orders` (commandes globales multi-vendeurs) est une réplique de
lecture : dans l'architecture cible, cette table appartient entièrement à
la Marketplace API et `sellerPortal` n'expose jamais que la sous-commande
d'un vendeur (`SellerOrder`), jamais la commande globale en entier.

## Portée V1 — scoping multi-clubs

Le schéma (`sql/schema.sql`, tables `sp_*`) porte désormais un rattachement
club réel : `sp_sellers.club_id` et `sp_product_categories.club_id`
(FK logique vers `teams.id` de la base partagée, comme le reste de l'app —
pas de contrainte FK réelle cross-connexion TypeORM). Un vrai déploiement
unique peut donc servir plusieurs clubs :

1. `clubId` est choisi par le vendeur à l'inscription (`GET /api/teams?type=club`
   alimente le sélecteur, `POST /api/auth/register` valide qu'il correspond
   à un club existant) et stocké sur `Seller`.
2. `clubId` est porté par la session (JWT, comme `sellerId`/`role`), dérivé
   de `seller.clubId` au login — jamais lu depuis un paramètre client.
3. Le référentiel de catégories (`sp_product_categories`) est filtré par
   `session.clubId` (`GET /api/categories`), et tout `categoryId` fourni à
   la création/modification d'un produit est revalidé comme appartenant à
   ce club avant d'être accepté.

Pour une installation déjà bootstrapée avant cet ajout, voir
`sql/migration_add_club_id.sql` (colonne nullable, à backfiller
manuellement club par club avant d'en dépendre pour filtrer une requête).

Le tableau de bord (routes `(dashboard)`) consomme aussi `ClubBranding`
(`src/lib/clubBranding.ts`, table `team_branding` en lecture seule,
gérée depuis superadmin) : titre de page et logo/couleurs de la barre
latérale résolus dynamiquement à partir du `clubId` du vendeur connecté
(`(dashboard)/layout.tsx` → `DashboardShell`/`Sidebar`). Défauts identiques
au thème actuel (`globals.css`, vert `#0d6e4f`) tant qu'un club n'a pas de
ligne dans `team_branding`. Les écrans publics (`/login`, `/register`)
restent volontairement sur le thème générique, sans session pour résoudre
un club.

## Hors périmètre V1

Paiement direct, intégration transporteur, payout automatique, enchères,
abonnement/publicité vendeur — voir la spec produit. L'architecture
(statuts, abstraction expédition, payouts en lecture seule) est prête pour
ces évolutions sans migration de rupture.
