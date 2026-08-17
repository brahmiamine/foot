# marketplace

## Rôle du projet

API NestJS du domaine Marketplace : demandes vendeurs, comptes vendeurs, catalogue, modération, stock, checkout multi-vendeur, commandes, retours, payouts et notifications vendeur.

## Onboarding vendeur

Depuis la gouvernance vendeur introduite par la PR #93, Marketplace possède le workflow d'admission :

```text
site public du club
  → SellerApplication
  → revue club-hub (ou auto-approval selon settings)
  → Seller ACTIVE + SellerUser INVITED
  → SellerInvite à usage unique
  → seller-portal /activate
  → SellerUser ACTIVE
```

`POST /auth/register` est volontairement conservé comme endpoint de compatibilité mais renvoie `410 Gone`. Il ne crée plus de vendeur. Le mot de passe n'est choisi qu'au moment de l'activation de l'invitation.

## Fonctionnalités publiques / externes

- `GET /health`, `GET /health/inventory`, `GET /health/checkout`, `GET /health/returns` ;
- `POST /auth/login` ;
- `POST /auth/activate` ;
- `POST /auth/register` : désactivé (`410 Gone`) ;
- lecture publique des catégories lorsque le contrôleur l'autorise ;
- webhook applicatif entrant `POST /payments/webhook`, signé et destiné aux services.

## Fonctionnalités administratives et internes

- demandes vendeurs : création depuis une application publique autorisée, listing/revue par le club, approbation/rejet ;
- settings marketplace par club : ouverture des demandes, approbation vendeur, approbation produit, revalidation après modification sensible ;
- administration vendeurs : statut, commission, suspension/réactivation ;
- catégories et modération produits ;
- routes vendeur pour profil, produits, variantes, inventaire, commandes, retours, payouts et notifications ;
- panier/checkout interne service-to-service.

Les identifiants de club venant d'une application publique doivent être résolus côté serveur par cette application. Une clé `SERVICE_API_KEYS` n'est jamais exposée au navigateur.

## Authentification et autorisations

- `SellerJwtGuard` protège les ressources vendeur ;
- `ServiceAuthGuard` protège les routes service-to-service ;
- les clés service supportent la rotation via `SERVICE_API_KEYS_PREVIOUS` / `SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT` ;
- le login vendeur exige à la fois `Seller.status=ACTIVE` et `SellerUser.status=ACTIVE` ;
- les invitations d'activation sont aléatoires, stockées uniquement sous forme de hash, expirables et à usage unique.

## Politique produit

Marketplace est la source métier de la policy de publication :

- si `productApprovalRequired=true`, la soumission suit la modération club ;
- si `productApprovalRequired=false`, la soumission peut être publiée automatiquement selon le workflow serveur ;
- si `productReapprovalOnSensitiveChange=true`, une modification sensible d'un produit publié le renvoie vers la validation ;
- une mise à jour de stock seule ne doit pas contourner ni redéclencher une validation de contenu sans raison métier.

## Stock et checkout

`InventoryService.reserveStock/confirmReservation/releaseReservation/expireStaleReservations` fournit une réservation transactionnelle avec UPDATE conditionnel afin d'éviter le stock négatif sous concurrence.

Le checkout interne revalide toujours produit publié, vendeur actif, prix et stock depuis la base. Il crée les snapshots de lignes, commandes marché/sous-commandes vendeur, réserve le stock et initie le paiement de façon idempotente. Les webhooks et la réconciliation périodique rattrapent les callbacks perdus.

## Retours et remboursements

La réception d'un retour déclenche la demande de remboursement auprès de `payments`. Un retour n'est `REFUNDED` qu'après confirmation financière. Les échecs restent visibles et rejouables avec une clé d'idempotence stable ; une réconciliation périodique suit les remboursements `REQUESTED/PROCESSING/MANUAL_REVIEW`.

## Données et migrations

Marketplace accède aux tables `sp_*`. Le schéma SQL reste historiquement versionné sous `seller-portal/sql` : `marketplace` ne doit pas activer `synchronize` pour modifier la base implicitement.

Migrations pertinentes côté `seller-portal/sql` :

- schéma et cloisonnement `club_id` ;
- modération produits ;
- stock reservations ;
- checkout ;
- retours/remboursements ;
- `migration_add_seller_governance.sql` : demandes vendeurs, settings et invitations.

Cette propriété de schéma est transitoire ; la logique métier nouvelle doit rester centralisée dans Marketplace.

## Intégrations

- `club-ob` ou autre site de club : dépôt public de demande vendeur via backend autorisé ;
- `club-hub` : revue des demandes, vendeurs, commissions, settings et modération ;
- `seller-portal` : espace privé vendeur et activation ;
- `payments` : checkout, lecture de statut et remboursements ;
- `notifications` : notifications administrateurs, candidats, membres et vendeurs selon l'événement.

## Variables d'environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables principales : `NODE_ENV`, `PORT`, `SELLER_JWT_SECRET`, `SERVICE_API_KEYS`, rotation des clés service, `DB_*`, `PAYMENT_*`, `NOTIFICATION_*` et `SELLER_PORTAL_URL` pour les invitations. Ne jamais committer de secret réel.

## Démarrage / validation

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
```

Port conventionnel : `3011`.

## Limites connues

- propriété du schéma `sp_*` encore située sous `seller-portal/sql` ;
- transition vers Marketplace comme source de vérité unique encore incomplète dans certaines lectures historiques du portail ;
- payout sans grand livre financier complet par commande ;
- frais de livraison/taxe non pilotés par un moteur de zones/transporteur ;
- les fournisseurs externes ne sont pas tous vérifiés en environnement réel dans les tests.

Voir [`../docs/platform-capabilities.md`](../docs/platform-capabilities.md) pour le statut canonique et [`../platform-governance-roadmap.md`](../platform-governance-roadmap.md) pour les prochaines policies/workflows.
