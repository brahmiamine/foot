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

## Paiement (`payment-api`)

`POST /api/tickets` réserve les billets (`PENDING`) et initie un paiement
auprès de `payment-api` (`PAYMENT_PROVIDER`, `konnect` par défaut — voir
`.env.example`) ; le client redirige le navigateur vers le `payUrl` reçu.
`payment-api` ne rappelle jamais `billetterie` : la confirmation
(`PENDING` → `PAID`) est relue via `GET /payments/:id`, soit sur
`/paiement/retour`, soit — filet de sécurité principal, ne dépend d'aucune
redirection — opportunément à chaque chargement de `/mes-billets` (voir
`reconcileTicketPayment` dans `src/lib/tickets.ts`).

L'intégration Konnect de `payment-api` transmet `successUrl`/`failUrl` (avec
`?paymentId=...` ajouté automatiquement, voir `konnect.mapper.ts`,
`withPaymentId`), construits à partir de `KONNECT_SUCCESS_URL`/
`KONNECT_FAIL_URL` côté `payment-api` — à pointer vers
`{BILLETTERIE_URL}/paiement/retour` en production pour que le payeur soit
redirigé automatiquement. Si ces variables ne sont pas configurées, le
payeur n'est pas redirigé automatiquement, mais ça fonctionne quand même
grâce au rattrapage sur `/mes-billets` (un supporter qui ne revient jamais
sur le site ne verra simplement pas la confirmation avant sa prochaine
visite).

Une réservation `PENDING` sans confirmation après 30 minutes est traitée
comme abandonnée et sa capacité libérée automatiquement à la prochaine
tentative d'achat sur la même catégorie (pas de tâche planifiée dans ce
dépôt — voir `PENDING_RESERVATION_TTL_MS` dans `src/lib/tickets.ts`).

**Konnect**, **Flouci** et **Paymee** sont supportés (`PAYMENT_PROVIDER`).
Paymee exige `firstName`/`lastName`/`phoneNumber` à l'initiation (DTO dédié
côté `payment-api`) : avant de réserver le moindre billet, `purchaseTickets`
appelle `sso` (`GET /api/members/me/profile`, voir `src/lib/ssoProfileClient.ts`)
et refuse l'achat avec un message clair si l'un des trois champs manque —
le membre les complète depuis son profil (`ob/espace-membre`, formulaire
prénom/nom/téléphone, optionnel partout ailleurs).

## Portée

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
