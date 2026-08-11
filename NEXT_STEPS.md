# Suite de la normalisation d'architecture — contexte et TODO

Ce document sert de relais entre sessions Claude Code sur la même mission
(normalisation générique vs custom OB, voir README racine). Écrit en fin de
session pour qu'une session/​compte différent puisse reprendre sans
redécouvrir le contexte.

## Fait (déjà commité sur `claude/architecture-normalization-generic-ob-1gz6l8`, mergé sur `main`)

1. **Renommage `ob-seller-portal` → `sellerPortal`** — dossier, package.json, README, toutes les chaînes d'UI hardcodées à "Olympique de Béja" généralisées ("l'administration du club"), JWT issuer, seed de démo générique. Voir `sellerPortal/README.md`.
2. **README racine** — classification générique/custom, table Projet/Type/Scope, mapping URLs de production cible (`admin.platform.tn`, `sellers.platform.tn`, `tickets.platform.tn`, `scanner.platform.tn`, `api.platform.tn`, `sso.platform.tn`, `superadmin.platform.tn`, `www.ob.tn`), principe "un domaine par appli générique sert tous les clubs" (exemple OB vs EST), passerelle API par chemin, modèle billetterie cible (Member/affiliation/Event/Ticket/TicketSaleRule). **C'est la référence à relire en premier.**
3. **`sso` : affiliations supporter** (`sso/src/entities/MemberTeamAffiliation.ts`, migration `sso/sql/migration_add_member_team_affiliations.sql`, endpoints `GET`/`POST /api/members/me/affiliations`, `DELETE .../[teamId]`) — un `MEMBER` peut suivre 0..N clubs, séparé de `User.teamId` (réservé staff, un seul club).
4. **`superadmin` : ClubBranding** (`src/lib/entities/TeamBranding.ts`, migration `superadmin/migrations/add_team_branding.sql`, API `GET`/`PUT /api/admin/teams/[id]/branding`, UI `TeamBrandingPanel.tsx` branchée dans `AdminTeamsManager.tsx`) — favicon/couleurs/police par club, `name`/`shortName`/`logo` restent portés par `teams` (pas dupliqués).
5. **`teamManager` : consommation de ClubBranding** (`src/lib/clubBranding.ts`, `src/entities/TeamBranding.ts` en lecture seule, `app/manifest.ts` dynamique remplaçant l'ancien `public/manifest.json` hardcodé OB, `generateMetadata`/`generateViewport` dynamiques, logo dans `AdminSidebar`, couleur d'accent de `PwaInstallPrompt` passée en prop). Défauts identiques à l'ancien hardcodage (`#c8102e`/`#0d0d0d`) tant qu'un club n'a pas de ligne dans `team_branding`.
6. **`sellerPortal` : scoping multi-club réel** (`Seller.clubId`, `ProductCategory.clubId`, sélecteur de club à l'inscription, `clubId` dans le JWT de session, catégories + validation produit filtrées par club). Détails § A ci-dessous.
7. **`billetterie` : nouvelle app générique** (achat de billets multi-clubs, catégories/quotas/règles de vente par club organisateur, réutilise `matches`/`teams`). Détails § B ci-dessous.

Toutes ces briques ont été vérifiées avec `pnpm install && npx tsc --noEmit && npx eslint <fichiers touchés>` dans chaque app (pas de build complet ni de test contre une vraie base MariaDB — aucune base n'est disponible dans l'environnement d'exécution).

## Reste à faire (résumé — détails dans chaque section ci-dessous)

- Intégrer `payment-api` dans `billetterie` (achat actuellement marqué `PAID` sans paiement réel).
- UI d'administration des catégories/quotas/règles de vente de `billetterie` (aujourd'hui : insertion SQL manuelle) — probablement à ajouter dans `teamManager`, pas dans `billetterie` elle-même.
- Brancher `ob/espace-membre/billets` sur `billetterie` (aujourd'hui deux choses séparées).
- `ClubBranding` pour `sellerPortal` (nom/logo/couleurs du club affichés dans le portail vendeur) — fait pour `teamManager` uniquement.
- Contrôle billetterie / scanner : application séparée, pas commencée (hors périmètre de cette normalisation).
- Infra : DNS/SSL/reverse proxy, CORS, OAuth, secrets (§ C, README racine).

## Détail des chantiers (A et B sont faits, sous-points restants listés dans chacun)

### A. `sellerPortal` — scoping multi-club réel — ✅ FAIT

`Seller.clubId`/`ProductCategory.clubId` ajoutés (`sql/schema.sql` + `sql/migration_add_club_id.sql` pour les installs existantes), propagés dans le JWT de session (`src/lib/session.ts`), sélecteur de club à l'inscription (`GET /api/teams`, entité `Team` en lecture seule), catégories filtrées par `session.clubId`, et validation serveur que `categoryId` appartient au club du vendeur à la création/modification d'un produit (`POST`/`PATCH /api/products`). Voir `sellerPortal/README.md` § « Multi-clubs ». Reste non fait : `ClubBranding` pour `sellerPortal` (voir B ci-dessous, listé comme reste à faire) et le scoping de `sp_products`/`sp_market_orders` par `clubId` direct (pas nécessaire tant qu'un vendeur = un seul club).

### B. Billetterie générique — nouvelle app — ✅ FAIT (MVP)

Nouvelle app `billetterie/` scaffoldée sur le modèle de `ob/` (Next.js App Router, TypeORM/mariadb, `src/lib/ssoSession.ts` copié). Réutilise `matches`/`teams` en lecture seule (pas de table Event dupliquée) ; ajoute `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules`, `tk_tickets` (`sql/schema.sql`, exactement le schéma qui était proposé ici). Logique métier dans `src/lib/tickets.ts` : liste des matchs à billetterie ouverte (`/`), détail par match avec catégories/quotas/règles de vente (`/match/[id]`), achat transactionnel avec verrou pessimiste anti-survente (`POST /api/match/[id]/purchase`), « Mes billets » (`/mes-billets`). L'éligibilité `HOME_SUPPORTERS`/`AWAY_SUPPORTERS` d'une `TicketSaleRule` s'appuie sur `member_team_affiliations` (créée au point A du fait précédent, item sso).

**Reste non fait dans ce MVP** (voir `billetterie/README.md`) :

1. **Pas d'intégration paiement réelle** — achat marqué `PAID` directement, sans passer par `payment-api`. À brancher : appeler `payment-api` avant de marquer `PAID`, garder `PENDING` en attendant confirmation.
2. **Pas d'administration des catégories/quotas** — `tk_ticket_categories`/`tk_match_ticket_categories`/`tk_ticket_sale_rules` doivent être créées à la main (SQL) aujourd'hui. Il manque une UI, probablement à ajouter dans `teamManager` (le club organisateur configure sa billetterie depuis son propre back-office) plutôt qu'une UI d'admin dans `billetterie` elle-même.
3. **`ob/espace-membre/billets` n'est pas branché sur `billetterie`** — reste un écran d'attente statique côté `ob`. À terme, ce lien devrait rediriger/embarquer `billetterie` filtrée sur les matchs de l'OB.
4. **Pas de QR code / preuve d'entrée** — `Ticket.reference` est un code texte, pas encore matérialisé ni vérifié par un scanner (contrôle billetterie = app séparée, hors périmètre).
5. **Pas de seed de données de démo** — pour tester manuellement, insérer à la main une ligne `tk_ticket_categories` + `tk_match_ticket_categories` pour un match `UPCOMING`/`is_public_visible=1` existant.

Vérifié avec `pnpm install && npx tsc --noEmit && npx eslint src` (0 erreur) — pas de test contre une vraie base ni de `pnpm dev` (pas de MariaDB disponible dans cet environnement).

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
