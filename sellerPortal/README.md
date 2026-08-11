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
npm run dev                  # http://localhost:3004
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

## Portée V1 — écart connu avec l'architecture cible multi-clubs

⚠️ Le schéma actuel (`sql/schema.sql`, tables `sp_*`) ne porte **aucune**
colonne de rattachement club (`clubId`/`teamId`) : la V1 a été construite en
contexte mono-club (Olympique de Béja) et reste, en l'état, un déploiement
par club plutôt qu'un vrai multi-tenant à déploiement unique. Le renommage
`ob-seller-portal` → `sellerPortal` et la généralisation des textes de
l'interface (qui ne mentionnent plus explicitement un club) préparent cette
cible mais ne la réalisent pas : pour un vrai multi-clubs, il reste à :

1. ajouter `clubId` sur `sp_sellers` (et le propager aux entités liées) ;
2. filtrer systématiquement les requêtes par le club du vendeur connecté
   (jamais par un `clubId` envoyé par le frontend) ;
3. faire porter le nom/logo/couleurs affichés par le portail par la
   configuration du club du vendeur connecté (`ClubBranding`, voir README
   racine).

Ce chantier n'a pas été fait dans le cadre de cette normalisation pour ne
pas modifier le schéma DB sans nécessité (voir README racine, section
« points nécessitant une intervention manuelle »). Le préfixe `sp_` peut
rester en l'état pour la V1.

## Hors périmètre V1

Paiement direct, intégration transporteur, payout automatique, enchères,
abonnement/publicité vendeur — voir la spec produit. L'architecture
(statuts, abstraction expédition, payouts en lecture seule) est prête pour
ces évolutions sans migration de rupture.
