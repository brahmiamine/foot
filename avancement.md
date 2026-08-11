# Avancement — audit fonctionnel de l'écosystème `foot`

## Contexte

Ce document remplace `roadmap.md`, `manquants.md` et `NEXT_STEPS.md` (supprimés par les commits `d457ab8`, `98a8e7e`, `820396a` — le `README.md` racine y renvoyait encore, ce qui était lui-même l'un des constats de cet audit). Il regroupe :

1. le panorama des 11 applications du dépôt ;
2. les fonctionnalités manquantes propres à chaque projet ;
3. les processus manquants **entre** les projets (la vraie dette du dépôt) ;
4. une table de suivi, mise à jour à chaque commit poussé sur `claude/analyse-fonctionnalites-processus-0fpdeq`, qui fait aussi office de liste de priorités.

État vérifié sur le code au 11/08/2026.

---

## Suivi & priorités

Mis à jour à chaque push. `✅ Fait` / `🔶 Partiel` / `⬜ À faire`.

| Rang | Action | Statut | Détail |
|---|---|---|---|
| 1 | `sso` dans `start.sh` ; `.env.example` harmonisé sur toutes les apps Next.js | ✅ Fait | `start.sh` lance désormais `sso` (port 3004) ; `.gitignore` de `arbinote`/`matchsheet`/`superadmin`/`teamManager`/`sso`/`sellerPortal` excepte `!.env.example` ; chaque app a maintenant un `.env.example` unique et complet (DB + SSO + notification, `SP_*`/SMTP pour `sellerPortal`, `API_FOOTBALL_KEY` pour `superadmin`) — les anciens `env.sso.example`/`env.notification.example` fragmentaires sont retirés d'`arbinote`/`matchsheet`/`superadmin`/`teamManager` |
| 2 | Extraire un package `auth-shared` (session, rôles, cookies) | ✅ Fait | `packages/auth-shared/src/session.ts` centralise la vérification JWT (issuer, forme du payload, nom du cookie, secret) — voir détail ci-dessous |
| 3 | Documenter la propriété des tables de `foot` + process de migration | ✅ Fait | `db/OWNERSHIP.md` — matrice de propriété par domaine + règles de migration, voir détail ci-dessous |
| 4 | Middleware global sur chaque back-office (`superadmin`, `arbinote`, `teamManager`) | ✅ Fait | `src/middleware.ts` ajouté aux 3 apps, protège `/admin/*` + `/api/admin/*` — voir détail ci-dessous |
| 5 | Machine d'état commune du match | ✅ Fait (recadré, voir détail) | `matches.status` existait déjà dans le schéma mais n'était écrit par aucune app — corrigé, pas remplacé par un nouveau système |
| 6 | CI (lint + tests) sur les 11 projets | ⬜ À faire | Aucun `.github/workflows` |
| 7 | `/api/health` partout + monitoring de base | ⬜ À faire | Seuls `arbinote` et `superadmin` l'exposent |
| 8 | Reset password + MFA + révocation de session dans `sso` | ⬜ À faire | |
| 9 | Brancher `billetterie` sur `payment-api` et sur `ob` | ⬜ À faire | Achat aujourd'hui marqué `PAID` immédiatement (mock) |
| 10 | Backup/restauration testée pour `foot` et les uploads | ⬜ À faire | |
| 11 | Espace supporter, finance/trésorerie, sponsors avancés, RGPD dans `teamManager` | ⬜ À faire | |
| 12 | Passerelle API + domaines de production | ⬜ À faire | Tâche infra, à déclencher au déploiement réel |

---

## 1. Panorama

| Projet | Rôle | Type | Tests | Health | PWA | `.env.example` |
|---|---|---|:---:|:---:|:---:|:---:|
| `sso` | Authentification centralisée | Générique | ❌ | ❌ | ❌ | ✅ |
| `arbinote` | Notation publique des arbitres | Générique | ✅ | ✅ | ✅ | ✅ |
| `matchsheet` | Feuille de match électronique (kiosque) | Générique | ❌ | ❌ | ✅ | ✅ |
| `superadmin` | Référentiels plateforme, audit | Générique | ✅ | ✅ | ✅ | ✅ |
| `teamManager` | Back-office club | Générique | ❌ | ❌ | ✅ | ✅ |
| `ob` | Vitrine + espace membre OB (lecture seule) | Custom | ❌ | ❌ | ❌ | ✅ |
| `payment-api` | Paiement mutualisé (Konnect/Paymee/Flouci) | Service | ✅ | ❌ | — | ✅ |
| `notification-api` | Centre de notifications | Service | ✅ | ❌ | — | ✅ |
| `sellerPortal` | Portail vendeur marketplace | Générique | ❌ | ❌ | ❌ | ✅ |
| `billetterie` | Billetterie multi-clubs (V1 mock) | Générique | ❌ | ❌ | ❌ | ✅ |
| `db` | Dump SQL de référence, pas une app | Référence | — | — | — | — |

---

## 2. Fonctionnalités manquantes, par projet

### `sso` — critique
**En place** : login staff/club + membre public (Google inclus), cookie JWT partagé, rate limiting login, affiliations supporter multi-clubs séparées du `teamId` staff.
**Manquant** : mot de passe oublié, MFA (TOTP) pour `SUPERADMIN`, révocation de session, invitation club en 2 temps, portail SSO (page d'accueil).

### `teamManager` — haute
**En place** : effectif, staff, discipline, actus/médias, boutique, sponsors, académie/recrutement, admin billetterie, PWA dynamique par club.
**Manquant** : espace supporter/communauté, checkout/paiement réel de la boutique, workflow contrat/facturation sponsors, finance/trésorerie (aucun module), RGPD (aucun consentement/export/suppression).

### `matchsheet` — moyenne
**En place** : avant-match, live, signatures, statut local de feuille, PWA, middleware de protection.
**Manquant** : tests automatisés, `/api/health`, verrouillage renforcé après clôture (raison de réouverture, audit dédié).

### `superadmin` — haute
**En place** : référentiels, audit, ClubBranding, lib `apiFootball.ts`.
**Manquant** : colonnes de matching (`api_football_id`/`fixture_id`, live score/minute), job de synchro live, écran de mapping équipes/fixtures, icônes PWA personnalisables par club.

### `billetterie` — haute
**En place** : catégories par club/match, règles de vente, achat, « mes billets », anti-survente, quota, fenêtre de vente.
**Manquant** : paiement réel (`payment-api`), vérification fiable de l'audience réservée (aujourd'hui auto-déclarée), scanner de contrôle stade (jamais commencé).

### `sellerPortal` / `ob` / `payment-api` / `notification-api` — moyenne
**En place** : `sellerPortal` scoping multi-club réel + ClubBranding ; `ob` live match + espace membre branché sur `notification-api` ; `payment-api`/`notification-api` seuls services avec tests + `.env.example` complets dès l'origine.
**Manquant** : backfill `club_id` manuel de `sellerPortal` en prod, pas de tests ; `ob` sans PWA installable et sans événement émis vers `notification-api` ; SMS et Web Push front annoncés mais absents de `notification-api`.

---

## 3. Ce qui manque entre les projets

**Le plus structurant** (✅ traité) : aucun package d'authentification partagé n'existait — la vérification du JWT SSO était réécrite dans `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob` et `billetterie`. `packages/auth-shared/src/session.ts` centralise désormais l'issuer, la forme du payload, le nom du cookie et le secret ; chaque app garde son propre `src/lib/ssoSession.ts` en wrapper fin (typage `SsoUser` propre à ses rôles + helpers Server Components `cookies()`/`headers()`, incompatibles Edge Runtime donc hors du module partagé). Voir `packages/auth-shared/README.md` pour le détail et pourquoi ce n'est pas un package pnpm workspace (import par chemin relatif, pour ne pas changer la topologie de déploiement indépendant de chaque app). **Point à vérifier avant merge** : ce module partagé n'a pas de `node_modules` propre — il résout `jose` via un `node_modules` racine (`package.json`/`pnpm-lock.yaml` ajoutés à cet effet). Ça fonctionne pour `pnpm install` + `tsc --noEmit` de chaque app dans cet environnement, mais si une app est déployée avec un « Root Directory » Vercel strict (sans « Include files outside root directory »), le build ne verra pas `packages/` ni la racine du dépôt — à vérifier par app avant de compter dessus en production.

### A. Démarrage local incohérent — critique
- ~~`start.sh` ne lançait pas `sso`~~ → corrigé (rang 1 du suivi).
- Le port de `sellerPortal` (aucun port fixé dans `package.json`) entre en conflit avec celui documenté pour `sso` (3004) si tout est lancé en même temps — reste à corriger.
- ~~`.env.example` absent pour `sso`, `superadmin`, `teamManager`, `sellerPortal`~~ → corrigé (rang 1 du suivi).

### B. Sécurité transverse fragmentée — critique, en grande partie traité
- ~~Aucun package `auth-shared`~~ → `packages/auth-shared` (rang 2).
- ~~Un seul middleware global existe dans tout le dépôt (`matchsheet/src/middleware.ts`) ; les autres apps s'appuient sur des helpers appelés page par page~~ → `arbinote/src/middleware.ts`, `superadmin/src/middleware.ts`, `teamManager/src/middleware.ts` ajoutés (rang 4). Chacun protège `/admin/:path*` + `/api/admin/:path*` en défense en profondeur (les pages/routes gardent leurs propres vérifications, `hasAdminSession()`/`ensureAdminAuth()` côté `arbinote`/`superadmin`, `auth()` dans `admin/layout.tsx` côté `teamManager`) : une nouvelle route qui oublierait cet appel individuel reste maintenant bloquée par le middleware. `arbinote`/`superadmin` excluent explicitement `/api/admin/logout` du filtre (sinon un cookie de session déjà expiré ne pourrait plus jamais être effacé). Importent `packages/auth-shared/src/session` directement plutôt que le `src/lib/ssoSession.ts` de l'app (qui importe `next/headers`, incompatible avec l'Edge Runtime du middleware). Vérifié avec un build complet (`next build --webpack`) sur les 3 apps : compilation et bundling Edge du middleware OK, `teamManager` a même fini un build complet vert (routes `force-dynamic`) ; `arbinote`/`superadmin` s'arrêtent plus loin sur la génération statique faute de base MariaDB dans cet environnement — limite déjà connue, sans rapport avec le middleware.
  - Note en passant : Next.js 16 affiche `The "middleware" file convention is deprecated. Please use "proxy" instead` — pas bloquant, mais à anticiper le jour d'une montée de version Next majeure (renommage `middleware.ts` → `proxy.ts`, même convention dans les 4 apps qui l'utilisent).
- Pas de politique CSRF formalisée pour les actions sensibles (le logout accepte encore `GET`).
- Pas de journal de sécurité transverse (login échoué, rate limit, token invalide, reset password).

### C. Qualité et CI/CD absents — haute
- Aucun pipeline CI (pas de `.github/workflows`).
- Tests automatisés présents seulement sur 4 des 11 projets (`arbinote`, `superadmin`, `payment-api`, `notification-api`).
- Pas de lint commun ni de règle d'exclusion partagée entre projets Next.js.

### D. Observabilité au minimum — haute
- `/api/health` n'existe que dans `arbinote` et `superadmin`.
- Aucun monitoring/alerting transverse.
- Pas de stratégie de sauvegarde documentée au-delà du volume Docker local.

### E. Gouvernance de la base partagée — critique, en partie traité
- ~~7 applications lisent/écrivent la même base `foot` sans document formel de propriété par table~~ → `db/OWNERSHIP.md` : matrice de propriété par domaine, construite en croisant les entités TypeORM réellement déclarées et leurs routes d'écriture effectives (pas seulement les migrations historiques, qui incluent des tables reprises par plusieurs apps sans refléter les droits d'écriture actuels).
  - Découverte au passage : `arbinote` et `superadmin` ont chacune une copie identique des mêmes migrations et entités référentielles (`federations`/`teams`/`matches`/`arbitres`…), mais `arbinote` n'a aucune route d'écriture dessus — résidu de l'époque où `superadmin` n'existait pas encore comme app séparée. Non consolidé (risque : vérifier d'abord si `arbinote` s'appuie dessus pour bootstrapper un environnement isolé).
  - Découverte au passage : `Card` a deux écrivains (`teamManager` en discipline, `matchsheet` en live) — signalé dans `db/OWNERSHIP.md` comme le seul domaine sans propriétaire unique, sans verrou de concurrence.
  - Vérifié : `synchronize: true` n'est déjà utilisé nulle part contre la base partagée (seulement dans des `test/testDataSource.ts` en SQLite mémoire) — ce point de `manquants.md` était déjà satisfait.
- Processus de migration documenté dans `db/OWNERSHIP.md` (revue cross-app, additif/idempotent, pas de `synchronize: true`) ; le backup/rollback réel reste bloqué sur le rang 10 (aucune stratégie de sauvegarde en place).
- Modèle multi-club toujours partiel : les affiliations supporter couvrent les `MEMBER`, mais un compte staff (`User.teamId`) reste lié à un seul club — non traité par ce rang, reste ouvert.

### F. Pas de cycle de vie commun du match — critique, recadré et en partie traité
Constat initial : un même match traverse quatre applications distinctes, chacune avec son propre statut local (`matchsheet` a un `SheetStatus` local, mais rien ne relie la préparation `teamManager`, la création `superadmin` ou l'ouverture des votes `arbinote` à un état partagé). Aucune machine d'état transversale, aucun workflow bout-en-bout écrit noir sur blanc.

**Ce qui a changé en creusant** : la machine d'état commune n'était pas à inventer, elle existait déjà — `matches.status` (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) est dans le schéma partagé depuis le début et déjà *lue* par 3 apps (`ob` pour les résultats/classement, `billetterie` pour la fenêtre de vente, `teamManager` pour verrouiller la composition). Mais **vérifié : aucune app ne l'écrivait jamais** — `superadmin`/`arbinote` ne la déclarent même pas dans leur entité `Match`. Conséquence réelle, pas théorique : chaque match restait `UPCOMING` pour toujours (100 % des lignes du dump `db/foot.sql` sont `UPCOMING`), ce qui rendait la page résultats et le classement d'`ob` silencieusement vides en permanence (leurs requêtes filtrent sur `status = 'FINISHED'`, qui n'arrivait jamais).

**Corrigé** : `matchsheet` — seule app qui sait avec certitude quand un match démarre/finit réellement — répercute désormais le statut de sa feuille sur `matches.status` (`SheetService.mirrorMatchStatus`) : `IN_PROGRESS` au coup d'envoi confirmé, `FINISHED` à la clôture après-match. Détail complet et alerte dans `db/OWNERSHIP.md` § « `matches.status` — la machine d'état commune du match ».

**Volontairement pas fait** : je n'ai pas construit le système à 12 états (`SCHEDULED`/`LINEUP_SUBMITTED`/`OFFICIALS_CONFIRMED`/`PRE_MATCH_SIGNED`/`PUBLISHED`/`ARCHIVED`/…) envisagé initialement — `CANCELLED` reste un état du schéma qu'aucune app ne permet de déclencher (annuler un match est une décision `superadmin`, donc une vraie nouvelle fonctionnalité produit à concevoir — qui prévient qui, réactivation possible ou non — pas un simple câblage manquant comme `IN_PROGRESS`/`FINISHED`). Item ouvert si le besoin se confirme.

### G. Notifications : câblage émetteur partiel — moyenne
Le service central existe et 5 apps émettent déjà des événements (`arbinote`, `superadmin`, `matchsheet`, `teamManager`, `payment-api`). `ob` ne source rien (lecture seule). Convocation/composition/sponsor non branchables tant que le destinataire n'est pas un `User` résolvable. Web Push, FCM, SMS annoncés mais aucun actif.

### H. Billetterie : chaîne supporter → paiement → contrôle non fermée — haute
`ob/espace-membre/billets` reste un écran d'attente statique. `billetterie` ne parle pas à `payment-api` (achat mock). Le contrôle billetterie à l'entrée du stade (`ticketing-scanner`) n'existe dans aucun dossier du dépôt.

### I. Infra cible non branchée — moyenne
Aucun domaine de production configuré, pas de passerelle API unique, séparation des bases par domaine partielle (`payment-api`/`notification-api` isolées, le reste partage encore `foot`).

---

## 5. Note sur la documentation elle-même

Le `README.md` racine renvoyait vers `roadmap.md`, `manquants.md` et `NEXT_STEPS.md`, supprimés par les trois commits précédant cet audit — ce fichier les remplace et le README a été mis à jour en conséquence.
