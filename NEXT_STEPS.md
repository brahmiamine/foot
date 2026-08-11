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

Toutes ces briques ont été vérifiées avec `pnpm install && npx tsc --noEmit && npx eslint <fichiers touchés>` dans chaque app (pas de build complet ni de test contre une vraie base MariaDB — aucune base n'est disponible dans l'environnement d'exécution).

## Pas fait — à reprendre, dans cet ordre

### A. `sellerPortal` — scoping multi-club réel — ✅ FAIT

`Seller.clubId`/`ProductCategory.clubId` ajoutés (`sql/schema.sql` + `sql/migration_add_club_id.sql` pour les installs existantes), propagés dans le JWT de session (`src/lib/session.ts`), sélecteur de club à l'inscription (`GET /api/teams`, entité `Team` en lecture seule), catégories filtrées par `session.clubId`, et validation serveur que `categoryId` appartient au club du vendeur à la création/modification d'un produit (`POST`/`PATCH /api/products`). Voir `sellerPortal/README.md` § « Multi-clubs ». Reste non fait : `ClubBranding` pour `sellerPortal` (voir B ci-dessous, listé comme reste à faire) et le scoping de `sp_products`/`sp_market_orders` par `clubId` direct (pas nécessaire tant qu'un vendeur = un seul club).

### B. Billetterie générique — nouvelle app (le plus gros chantier, pas commencé)

**Ne pas dupliquer les matchs** : la table `matches` existe déjà (partagée, gérée par `superadmin`/`teamManager`, champs `equipe_home`/`equipe_away`/`date`/`status`, voir `superadmin/src/lib/entities/Match.ts`). L'« event » de billetterie, c'est cette table — pas la peine d'en créer une autre.

Modèle cible détaillé dans le README racine, section « Billetterie : séparer l'identité du supporter de l'organisateur de l'événement ». Schéma proposé (à valider avant migration) :

```sql
tk_ticket_categories       -- catégories définies par club (Gradin/Chaise OB, Virage/Tribune/VIP EST)
  id, club_id, name, slug, description, base_price, is_active, created_at, updated_at
  UNIQUE(club_id, slug)

tk_match_ticket_categories -- quelle catégorie est vendue pour quel match, à quel prix/quota
  id, match_id, category_id, price, capacity, sold_count DEFAULT 0
  UNIQUE(match_id, category_id)

tk_ticket_sale_rules       -- restriction d'audience par match+catégorie (TicketSaleRule)
  id, match_ticket_category_id, allowed_audience ENUM('PUBLIC','HOME_SUPPORTERS','AWAY_SUPPORTERS'),
  max_tickets_per_user DEFAULT 4, starts_at, ends_at, created_at

tk_tickets
  id, match_id, match_ticket_category_id, organizer_team_id (= matches.equipe_home au moment de l'achat),
  purchaser_id (User.id sso, role MEMBER), status ENUM('PENDING','PAID','CANCELLED','USED'),
  reference VARCHAR(32) UNIQUE, price, created_at, paid_at, used_at
```

Règle de sécurité impérative (déjà documentée dans le README racine) : si l'URL expose un slug de club (`/tickets/ob`), le serveur DOIT résoudre `slug → teamId` et filtrer `WHERE team_id = teamId` — jamais faire confiance à un `clubId`/slug envoyé tel quel par le frontend pour une requête d'écriture ou de lecture sensible.

Étapes concrètes :

1. Scaffolder une nouvelle app Next.js `billetterie/` en copiant la structure de `ob/` (même stack : Next.js App Router, TypeORM/mariadb, `src/lib/ssoSession.ts` copié tel quel depuis `ob/src/lib/ssoSession.ts` — vérification en lecture seule du cookie `sso`, jamais d'émission). `.env.example` sur le modèle de `ob/.env.example` (DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, SSO_URL) — **sans** `OB_TEAM_ID` (générique, pas de club par défaut).
2. Entités TypeORM : `Match`/`Team` en lecture seule (copier `superadmin/src/lib/entities/Match.ts` et `Team.ts`, adaptés), + les 4 tables `tk_*` ci-dessus en écriture.
3. Migration SQL `billetterie/sql/schema.sql` (tables `tk_*`, `CREATE TABLE IF NOT EXISTS`, cohérent avec le style `sellerPortal/sql/schema.sql`).
4. Pages : liste des matchs à venir avec billetterie ouverte (`/`), détail d'un match avec catégories dynamiques + règles de vente (`/match/[id]`), achat (mock — pas d'intégration `payment-api` réelle dans cette itération, marquer directement `PAID` ou `PENDING` selon ce qui est raisonnable), « Mes billets » (`/mes-billets`, authentifié MEMBER via SSO).
5. Pas de scanner/contrôle billetterie dans ce chantier — c'est une app séparée (`ticketing-scanner`), hors périmètre de cette normalisation.
6. Vérifier avec `pnpm install && npx tsc --noEmit`.
7. Mettre à jour le README racine : retirer la mention "n'existe pas encore" pour la billetterie une fois faite, ajouter la ligne dans le tableau `## Applications`.

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
