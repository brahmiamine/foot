# billetterie — billetterie générique multi-clubs

Application Next.js indépendante permettant à un supporter (compte `sso`,
rôle `MEMBER`) d'acheter des billets pour n'importe quel match de la base
partagée, quel que soit le club organisateur. Générique au même titre que
`teamManager`/`sellerPortal`/`sso` — voir le README racine, section
« Classification des projets ».

**Ne duplique pas les matchs** : la table `matches` (gérée par
`superadmin`/`teamManager`) reste la source de vérité pour l'« event » —
cette app y ajoute seulement des catégories de billets, des règles de vente
et des billets (tables `tk_*`, voir `sql/schema.sql`). Le schéma est créé
ici, mais **`teamManager` est l'admin** : il écrit `tk_ticket_categories`/
`tk_match_ticket_categories`/`tk_ticket_sale_rules` (`/admin/billetterie`),
cette app les lit pour l'achat et n'écrit que `tk_tickets`.

## Modèle de données

```
tk_ticket_categories       -- catégories définies par club (Gradin/Chaise OB, Virage/Tribune/VIP EST)
tk_match_ticket_categories -- quelle catégorie est vendue pour quel match, à quel prix/quota
tk_ticket_sale_rules       -- restriction d'audience (PUBLIC/HOME_SUPPORTERS/AWAY_SUPPORTERS) + quota/fenêtre de vente
tk_tickets                 -- un billet acheté (organizerTeamId = club organisateur, purchaserId = User.id sso MEMBER)
```

Détail complet dans le README racine, section « Billetterie : séparer
l'identité du supporter de l'organisateur de l'événement ».

⚠️ **Note de sécurité sur `allowedAudience`** : `HOME_SUPPORTERS`/`AWAY_SUPPORTERS`
n'est **pas** vérifié via les affiliations stockées d'un `MEMBER` (table
`member_team_affiliations` de `sso`) — un supporter peut suivre plusieurs
clubs ou aucun, ce n'est pas un mécanisme d'autorisation fiable (voir README
racine). Dans cette V1, la restriction reste une **auto-déclaration** de
l'acheteur au moment de l'achat (case à cocher), pas une vérification
d'identité. À remplacer par un mécanisme fiable (abonnement/carte de membre
vérifiée) avant toute vente réelle sur des catégories sensibles.

## Portée V1

- Pas d'intégration `payment-api` réelle : l'achat (`POST /api/tickets`) est
  un mock qui marque le billet `PAID` immédiatement. Toute la validation
  serveur (fenêtre de vente, quota par utilisateur, capacité restante) reste
  réelle et appliquée en transaction (verrou pessimiste sur
  `tk_match_ticket_categories` pour éviter la survente).
- Pas de scanner/contrôle billetterie : ce sera une app séparée
  (`ticketing-scanner`), hors périmètre.
- L'interface d'administration pour créer les catégories/règles de vente
  d'un club vit dans **`teamManager`** (`/admin/billetterie`, réservé
  `ADMIN` du club), pas ici — cette app ne fait que consommer les tables
  `tk_ticket_categories`/`tk_match_ticket_categories`/`tk_ticket_sale_rules`
  en lecture (+ écrit `tk_tickets` à l'achat). Voir
  `teamManager/src/services/TicketingService.ts`.

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, SSO_URL (voir ../start.sh)
pnpm install
pnpm run dev                 # http://localhost:3005
```

Appliquer `sql/schema.sql` sur la base partagée `foot` avant de démarrer.

## Vérifier son travail

```bash
pnpm install --frozen-lockfile
npx tsc --noEmit
npx eslint <fichiers touchés>
```

Aucune base MariaDB n'étant disponible dans l'environnement d'exécution des
sessions Claude Code, ce filet de sécurité statique est le seul disponible
— pas de `pnpm dev` ni de test contre une vraie requête tant qu'une base
n'est pas provisionnée.
