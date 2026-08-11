# ob-seller-portal — portail vendeur de la marketplace Olympique de Béja

Application Next.js indépendante destinée aux **vendeurs tiers** qui
proposent leurs produits sur la marketplace du club. Ce n'est **pas** une
copie de `teamManager` : `teamManager` reste l'outil d'administration
interne de l'OB (validation des vendeurs, modération des produits,
commissions, payouts...) ; `ob-seller-portal` ne fait que consommer/exposer
les données scopées au vendeur connecté.

```
Site OB public → Marketplace → Supporters
                              → Seller Portal → Marketplace API → Sellers / Products / Orders
teamManager (admin OB)       → Marketplace API
```

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, SP_JWT_SECRET (voir ../start.sh pour la base partagée)
npm install
# importer sql/schema.sql dans la base "foot" (une seule fois)
mariadb -h 127.0.0.1 -P 3307 -u "$DB_USER" -p foot < sql/schema.sql
npm run seed                 # optionnel : jeu de données de démo
npm run dev                  # http://localhost:3004
```

Identifiants de démo (après `npm run seed`) : `demo@vendeur-ob.tn` /
`Vendeur123!`.

## Principes d'architecture

- **Multi-tenant** : un seul déploiement sert tous les vendeurs. Le
  vendeur courant est déterminé **exclusivement** côté serveur à partir du
  cookie de session (`src/lib/session.ts` + `src/lib/authz.ts`), jamais
  d'un `sellerId` envoyé par le frontend. Toute route API charge une
  ressource par son id puis vérifie `resource.sellerId === session.sellerId`
  (`assertOwnedBySeller`) — un vendeur qui devine l'id d'une ressource d'un
  autre vendeur reçoit un 404, jamais un 403 qui confirmerait son existence.
- **Authentification indépendante** du SSO club (`../sso`) : les vendeurs
  ne sont pas des utilisateurs OB. Cookie httpOnly signé (`jose`), mots de
  passe hashés (`bcryptjs`). Le modèle `Seller` → `SellerUser` supporte déjà
  plusieurs comptes par vendeur (OWNER/MANAGER/STAFF) même si la V1 n'en
  crée qu'un (OWNER) à l'inscription.
- **Modération réservée à l'OB** : le vendeur ne peut jamais publier un
  produit directement. Les transitions qu'il a le droit de déclencher
  lui-même sont explicitement listées dans
  `src/entities/enums.ts` (`SELLER_ALLOWED_PRODUCT_TRANSITIONS`,
  `SELLER_ORDER_FORWARD_TRANSITIONS`) — tout le reste (APPROVED, REJECTED,
  DELIVERED, remboursements, commission...) est piloté par la Marketplace
  API / teamManager.
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
la Marketplace API et ob-seller-portal n'expose jamais que la sous-commande
d'un vendeur (`SellerOrder`), jamais la commande globale en entier.

## Hors périmètre V1

Paiement direct, intégration transporteur, payout automatique, marketplace
multi-clubs, enchères, abonnement/publicité vendeur — voir la spec produit.
L'architecture (statuts, abstraction expédition, payouts en lecture seule)
est prête pour ces évolutions sans migration de rupture.
