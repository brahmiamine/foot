# Suite de la normalisation d'architecture — contexte et TODO

Ce document sert de relais entre sessions Claude Code sur la même mission
(normalisation générique vs custom OB, voir README racine). Écrit en fin de
session pour qu'une session/​compte différent puisse reprendre sans
redécouvrir le contexte.

## Fait (commité directement sur `main` depuis cette session — voir note ci-dessous)

1. **Renommage `ob-seller-portal` → `sellerPortal`** — dossier, package.json, README, toutes les chaînes d'UI hardcodées à "Olympique de Béja" généralisées ("l'administration du club"), JWT issuer, seed de démo générique. Voir `sellerPortal/README.md`.
2. **README racine** — classification générique/custom, table Projet/Type/Scope, mapping URLs de production cible (`admin.platform.tn`, `sellers.platform.tn`, `tickets.platform.tn`, `scanner.platform.tn`, `api.platform.tn`, `sso.platform.tn`, `superadmin.platform.tn`, `www.ob.tn`), principe "un domaine par appli générique sert tous les clubs" (exemple OB vs EST), passerelle API par chemin, modèle billetterie cible (Member/affiliation/Event/Ticket/TicketSaleRule). **C'est la référence à relire en premier.**
3. **`sso` : affiliations supporter** (`sso/src/entities/MemberTeamAffiliation.ts`, migration `sso/sql/migration_add_member_team_affiliations.sql`, endpoints `GET`/`POST /api/members/me/affiliations`, `DELETE .../[teamId]`) — un `MEMBER` peut suivre 0..N clubs, séparé de `User.teamId` (réservé staff, un seul club).
4. **`superadmin` : ClubBranding** (`src/lib/entities/TeamBranding.ts`, migration `superadmin/migrations/add_team_branding.sql`, API `GET`/`PUT /api/admin/teams/[id]/branding`, UI `TeamBrandingPanel.tsx` branchée dans `AdminTeamsManager.tsx`) — favicon/couleurs/police par club, `name`/`shortName`/`logo` restent portés par `teams` (pas dupliqués).
5. **`teamManager` : consommation de ClubBranding** (`src/lib/clubBranding.ts`, `src/entities/TeamBranding.ts` en lecture seule, `app/manifest.ts` dynamique remplaçant l'ancien `public/manifest.json` hardcodé OB, `generateMetadata`/`generateViewport` dynamiques, logo dans `AdminSidebar`, couleur d'accent de `PwaInstallPrompt` passée en prop). Défauts identiques à l'ancien hardcodage (`#c8102e`/`#0d0d0d`) tant qu'un club n'a pas de ligne dans `team_branding`.
6. **`sellerPortal` : scoping multi-club réel** — `club_id` ajouté à `sp_sellers`/`sp_product_categories` (`sql/schema.sql`, `sql/migration_add_club_id.sql` pour les installs existantes), `src/entities/Seller.ts`/`ProductCategory.ts` avec `clubId`, `src/entities/Team.ts` en lecture seule + `GET /api/teams?type=club` (sélecteur de club sur l'écran d'inscription, `src/app/(auth)/register/page.tsx`), `POST /api/auth/register` exige et valide `clubId`, `clubId` porté par la session JWT (`src/lib/session.ts`, dérivé au login), `GET /api/categories` filtré par `session.clubId`, et `categoryId` revalidé comme appartenant au club du vendeur dans `POST /api/products` et `PATCH /api/products/[id]` (jamais fait confiance à un id de catégorie envoyé par le client sans vérifier son club). `scripts/seed.ts` mis à jour pour résoudre un club existant (`teams` partagée) avant de créer le vendeur/catégorie de démo.
7. **`sellerPortal` : consommation de ClubBranding** — `src/lib/clubBranding.ts`, `src/entities/TeamBranding.ts` en lecture seule (mêmes tables que `superadmin`/`teamManager`), `generateMetadata` dynamique dans `(dashboard)/layout.tsx` (titre de page), logo/couleurs (`--sp-primary`/`--sp-sidebar-bg`/`--sp-accent`) injectés comme variables CSS scopées au `DashboardShell` et consommés par `Sidebar` (nom + logo du club). Défauts identiques au thème actuel (`globals.css`, vert `#0d6e4f`) tant qu'un club n'a pas de ligne dans `team_branding`. Les écrans publics (`/login`, `/register`) restent sur le thème générique, sans session pour résoudre un club.
8. **`billetterie` : nouvelle app générique** — scaffold Next.js App Router + TypeORM/mariadb sur le modèle de `ob/` (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.env.example` sans `OB_TEAM_ID`), `src/lib/ssoSession.ts` copié en lecture seule depuis `ob/`. Entités `Team`/`Match` en lecture seule (`matches` reste la table partagée, pas dupliquée) + `TicketCategory`/`MatchTicketCategory`/`TicketSaleRule`/`Ticket` en écriture (tables `tk_*`, `sql/schema.sql`). `src/lib/tickets.ts` centralise la logique métier (`listOpenMatches`, `getMatchDetail`, `purchaseTickets`, `listMyTickets`) — achat en transaction avec verrou pessimiste sur `tk_match_ticket_categories` pour éviter la survente, quota par utilisateur et fenêtre de vente appliqués serveur. Pages `/` (liste matchs à billetterie ouverte), `/match/[id]` (catégories + achat mock via `POST /api/tickets`, marque `PAID` immédiatement), `/mes-billets` (authentifié `MEMBER` via SSO, sinon redirection vers `sso`). Pas de scanner (`ticketing-scanner`, app séparée hors périmètre) ni d'UI d'admin pour créer les catégories/règles de vente (à faire en base directement pour cette V1). Voir `billetterie/README.md`, notamment sa note de sécurité sur `allowedAudience` HOME_SUPPORTERS/AWAY_SUPPORTERS (auto-déclaration à l'achat dans cette V1, **pas** vérifié via les affiliations `sso` — voir README racine § « Billetterie »).

READMEs (racine + `sellerPortal/README.md` § « Portée V1 » + `billetterie/README.md`) mis à jour en conséquence à chaque étape. Toutes ces briques ont été vérifiées avec `pnpm install && npx tsc --noEmit && npx eslint <fichiers touchés>` dans chaque app (pas de build complet ni de test contre une vraie base MariaDB — aucune base n'est disponible dans l'environnement d'exécution).

> **Note process** : sur demande explicite de l'utilisateur, le travail de cette session a été poussé directement sur `main` (pas de branche de travail intermédiaire ni de PR) — écart volontaire par rapport aux sessions précédentes qui passaient par une branche `claude/...` fusionnée ensuite.

## Pas fait — à reprendre, dans cet ordre

### A. `sellerPortal` multi-clubs — reste à faire (petit)

Le scoping serveur et le branding (points 6-7 ci-dessus) sont faits. Reste uniquement :

1. **Backfill production** : pour une install déjà bootstrapée avant l'ajout de `club_id`, exécuter `sellerPortal/sql/migration_add_club_id.sql` puis renseigner manuellement `club_id` sur les lignes existantes de `sp_sellers`/`sp_product_categories` (nécessite une décision produit : quel club pour quelles lignes existantes) avant de pouvoir compter dessus pour filtrer une requête en prod. Pas une tâche de code — à traiter au moment du déploiement.

### B. `billetterie` — reste à faire (le scaffold V1 est fait, point 8 ci-dessus)

1. **UI d'admin pour les catégories/règles de vente** : `tk_ticket_categories`/`tk_match_ticket_categories`/`tk_ticket_sale_rules` n'ont aujourd'hui aucune interface — à créer manuellement en base pour tester, ou à brancher dans `superadmin`/`teamManager` (probablement `teamManager`, par club, comme le reste de l'admin club).
2. **Intégration `payment-api` réelle** : remplacer le mock `PAID` immédiat de `purchaseTickets` (`billetterie/src/lib/tickets.ts`) par un vrai flux de paiement (créer le ticket `PENDING`, rediriger vers `payment-api`, webhook de confirmation → `PAID`).
3. **Vérification fiable de `allowedAudience`** : la restriction HOME_SUPPORTERS/AWAY_SUPPORTERS reste une auto-déclaration de l'acheteur (case à cocher) — pas un mécanisme d'autorisation vérifié. À concevoir avant toute vente réelle sur une catégorie réservée (carte de membre/abonnement vérifié, pas les affiliations `sso` — voir la note de sécurité dans `billetterie/src/entities/TicketSaleRule.ts` et le README racine).
4. **Lien depuis `ob`** : `ob/espace-membre/billets` reste un écran d'attente statique — le brancher vers `billetterie` (lien externe suffit, pas besoin de fusionner les deux apps).
5. **Scanner/contrôle billetterie** : `ticketing-scanner`, app séparée, non commencée — hors périmètre de cette normalisation.

### C. Non prioritaire / infra (pas du code applicatif)

- DNS/SSL/reverse proxy, `SSO_COOKIE_DOMAIN` en prod, CORS, callback OAuth Google, secrets — voir README racine § « Points nécessitant une intervention manuelle », inchangé.
- Passerelle API par chemin (`api.platform.tn/payment/*`, `/notifications/*`) — tâche reverse proxy, pas de code à écrire dans ce repo.

## Comment vérifier son travail dans cet environnement

Aucune base MariaDB n'est disponible ici (pas de Docker) : impossible de lancer `pnpm dev` ou de tester une vraie requête. Le seul filet de sécurité est statique :

```bash
cd <app>
pnpm install --frozen-lockfile
npx tsc --noEmit
npx eslint <fichiers touchés>
```

Faire ça après **chaque** app touchée, avant de commit.
