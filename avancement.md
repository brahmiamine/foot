# Avancement — audit fonctionnel de l'écosystème `foot`

## Contexte

Ce document remplace `roadmap.md`, `manquants.md` et `NEXT_STEPS.md` (supprimés par les commits `d457ab8`, `98a8e7e`, `820396a` — le `README.md` racine y renvoyait encore, ce qui était lui-même l'un des constats de cet audit). Il regroupe :

1. le panorama des 11 applications du dépôt ;
2. les fonctionnalités manquantes propres à chaque projet ;
3. les processus manquants **entre** les projets (la vraie dette du dépôt) ;
4. une synthèse en table de tous les **circuits inter-projets** (flux qui traversent plusieurs apps) avec leur état — fermé, partiel ou ouvert — pour répondre d'un coup d'œil à « qu'est-ce qui n'est pas encore bouclé ? » sans relire toute la section 3 ;
5. une table de suivi, mise à jour à chaque commit poussé sur `claude/analyse-fonctionnalites-processus-0fpdeq`, qui fait aussi office de liste de priorités.

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
| 6 | CI (lint + tests) sur les 10 apps | ✅ Fait | `.github/workflows/ci.yml` — voir détail ci-dessous |
| 7 | `/api/health` partout | ✅ Fait (10/10 apps) | Monitoring/alerting externe reste hors périmètre — voir détail |
| 8 | Reset password + MFA + révocation de session dans `sso` | ✅ Fait (dans `sso`, limite assumée côté apps clientes) | Voir détail — `User.tokenVersion` vérifié par `sso` à chaque requête, pas encore par les 6 apps clientes |
| 9 | Brancher `billetterie` sur `payment-api` et sur `ob` | ✅ Fait (limite Konnect documentée) | Voir détail — premier vrai appelant de `payment-api` dans le dépôt |
| 10 | Backup/restauration testée pour `foot` et les uploads | ⬜ À faire | |
| 11 | Espace supporter, finance/trésorerie, sponsors avancés, RGPD dans `teamManager` | ⬜ À faire | |
| 12 | Passerelle API + domaines de production | ⬜ À faire | Tâche infra, à déclencher au déploiement réel |

---

## 1. Panorama

| Projet | Rôle | Type | Tests | Health | PWA | `.env.example` |
|---|---|---|:---:|:---:|:---:|:---:|
| `sso` | Authentification centralisée | Générique | ❌ | ✅ | ❌ | ✅ |
| `arbinote` | Notation publique des arbitres | Générique | ✅ | ✅ | ✅ | ✅ |
| `matchsheet` | Feuille de match électronique (kiosque) | Générique | ❌ | ✅ | ✅ | ✅ |
| `superadmin` | Référentiels plateforme, audit | Générique | ✅ | ✅ | ✅ | ✅ |
| `teamManager` | Back-office club | Générique | ❌ | ✅ | ✅ | ✅ |
| `ob` | Vitrine + espace membre OB (lecture seule) | Custom | ❌ | ✅ | ❌ | ✅ |
| `payment-api` | Paiement mutualisé (Konnect/Paymee/Flouci) | Service | ✅ | ✅ | — | ✅ |
| `notification-api` | Centre de notifications | Service | ✅ | ✅ | — | ✅ |
| `sellerPortal` | Portail vendeur marketplace | Générique | ❌ | ✅ | ❌ | ✅ |
| `billetterie` | Billetterie multi-clubs (achat réel via `payment-api`) | Générique | ❌ | ✅ | ❌ | ✅ |
| `db` | Dump SQL de référence, pas une app | Référence | — | — | — | — |

---

## 2. Fonctionnalités manquantes, par projet


### Rapport complémentaire 11/08/2026 — fonctionnalités/flux manquants ajoutés après comparaison README ↔ audit

Cette sous-section complète les listes ci-dessus avec les manques ressortis de la relecture systématique des README projet par projet. Elle ne remplace pas les sections détaillées suivantes : elle sert de checklist exhaustive et consolidée pour éviter qu'un manque soit perdu parce qu'il est documenté dans un README applicatif mais pas encore visible dans la table des circuits.

| Projet | Manques fonctionnels ou process restants | Impact / décision attendue |
|---|---|---|
| `sso` | Invitation staff/club en 2 temps ; vrai portail compte SSO ; propagation transverse de la révocation `tokenVersion` aux apps clientes ; données profil membre encore trop pauvres pour Paymee (`firstName`/`lastName`/`phoneNumber`) | Décider entre vérification DB/cache partagé côté apps clientes ou TTL court ; ajouter un modèle d'invitation et enrichir le profil membre si Paymee doit être supporté côté billetterie |
| `superadmin` | Annulation de match (`CANCELLED`) non déclenchable ; colonnes de matching API-Football (`api_football_id`/`fixture_id`) et job live absents ; écran de mapping équipes/fixtures absent ; icônes PWA personnalisables par club absentes | Créer un workflow produit d'annulation + notifications ; ajouter migration/mapping/synchronisation API-Football ; étendre `ClubBranding` aux assets PWA |
| `teamManager` | Espace supporter/communauté ; tunnel boutique client + paiement ; boutique multi-vendeurs côté supporter ; contrats/factures sponsors ; finance/trésorerie ; RGPD ; notifications centralisées non câblées pour tous les cas métier ; concurrence `Card` avec `matchsheet` non verrouillée | Gros lots produit à prioriser ; besoin d'un modèle destinataire fiable (`User`) pour notifications joueurs/staff/supporters ; définir propriétaire ou verrou transactionnel pour `Card` |
| `arbinote` | Intégration API-Football encore limitée par le mapping live ; dépendance à une empreinte appareil/cookie pour le vote sans compte ; règles anti-fraude avancées au-delà anomalies/statistiques non décrites ; tests présents mais dette lint historique signalée par la CI | Finaliser mapping fixtures quand l'API le permet ; décider si un vote authentifié devient nécessaire ; garder la modération humaine et l'export comme filet de contrôle |
| `matchsheet` | Tests automatisés absents ; pas de synchronisation offline des écritures ; réouverture après clôture non modélisée/auditée ; pas de mot de passe de match/compte FMI dédié ; concurrence des cartons avec `teamManager` à encadrer | Ajouter tests service/API ; décider si kiosque sans auth reste acceptable ; définir workflow de correction post-clôture |
| `ob` | Pas de PWA installable ; pas de tunnel achat boutique/billetterie intégré ; pas d'émission d'événements vers `notification-api` ; pages billets/commandes encore dépendantes des apps génériques ; site custom limité à OB | Garder `ob` lecture seule ou ajouter des appels backend ; éviter de réimplémenter billetterie/marketplace dans le site custom |
| `billetterie` | Audience réservée auto-déclarée ; scanner stade absent ; Paymee non supporté faute de champs profil membre ; redirection Konnect non automatique (`successUrl`/`failUrl` absents côté `payment-api`) ; pas de tâche planifiée de purge des réservations `PENDING` ; pas de tests | Prioriser contrôle d'accès et preuve d'audience avant vente réelle sensible ; ajouter tests et éventuellement cron de nettoyage ; corriger Konnect côté `payment-api` si retour direct obligatoire |
| `payment-api` | Pas de callback applicatif vers apps métier ; Konnect ne reçoit pas `successUrl`/`failUrl` ; pas de remboursements/payouts ; notifications uniquement `PAYMENT_SUCCEEDED` si `userId` fourni ; pas de passerelle API publique unifiée | Décider si les apps doivent consommer par polling/reconciliation ou recevoir des webhooks internes ; étendre modèle paiement aux remboursements/payouts |
| `notification-api` | SMS non implémenté ; FCM stub ; Web Push consommé seulement par `ob` ; plusieurs notifications métier non branchées faute de destinataires résolvables ; monitoring/alerting externe absent ; purge/rétention dépendante de configuration runtime | Prioriser généralisation du composant d'abonnement push et clarifier les identités destinataires ; choisir provider SMS/FCM et outil d'observabilité |
| `sellerPortal` | Tests absents ; backfill `club_id` manuel en production ; paiement direct/transporteur/payout automatique/enchères/abonnement publicité vendeur hors périmètre ; dépendance temporaire aux tables `sp_*` dans `foot` au lieu d'une Marketplace API | Préparer migration vers Marketplace API ; automatiser backfill ou écrire runbook ; prioriser paiement/logistique/payout selon lancement marketplace |
| `db` / infra | Backup/restauration `foot` + uploads non testés ; API Gateway et domaines de production absents ; séparation des bases par domaine partielle ; monitoring des healthchecks absent | Travail infra obligatoire avant production : sauvegardes restaurées en test, reverse proxy/API gateway, alerting, runbooks de migration |

### `sso` — rang 8 fait (limite assumée documentée), reste : invitation club, portail
**En place** : login staff/club + membre public (Google inclus), cookie JWT partagé, rate limiting login, affiliations supporter multi-clubs séparées du `teamId` staff, **mot de passe oublié** (`/forgot-password` → email avec lien à usage unique valable 1h → `/reset-password`, jeton stocké hashé SHA-256, jamais en clair — voir `sso/src/lib/passwordReset.ts`), **MFA TOTP pour `SUPERADMIN`** (`/account/mfa` : QR code + confirmation par code → 10 codes de récupération affichés une seule fois ; connexion en deux temps via `/api/login` → `mfaRequired` → `/api/login/mfa`, jeton intermédiaire signé avec un issuer distinct pour qu'il ne puisse jamais être accepté comme une vraie session — voir `sso/src/lib/mfa.ts`/`mfaPendingToken.ts`), **révocation de session** (`User.tokenVersion`, embarqué dans le JWT, comparé à la base à chaque `getCurrentSession()`/`verifySessionToken()` de `sso` — incrémenté automatiquement au changement de mot de passe et à l'activation/désactivation MFA, plus un bouton « Se déconnecter de tous les appareils » explicite sur `/`).

**Limite assumée, pas un oubli** : la vérification de `tokenVersion` n'existe que dans `sso` lui-même. Les 6 apps clientes (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob`, `billetterie`) continuent de vérifier uniquement la signature/expiration du JWT (`packages/auth-shared`, volontairement sans DB pour rester Edge-safe et utilisable en middleware) — un jeton « révoqué » côté `sso` reste donc utilisable sur ces apps jusqu'à son expiration naturelle (12h). Étendre la vérification à ces apps demanderait soit un appel DB sur chaque requête authentifiée dans 6 apps déployées indépendamment (latence, charge DB, et deux apps — `arbinote`/`matchsheet`/`ob`/`billetterie` — n'ont même pas d'entité `User` aujourd'hui), soit un mécanisme différent (cache partagé, révocation courte plutôt que permanente). Décision d'architecture à prendre consciemment, pas à faire glisser dans ce rang sans base pour la tester.

**Manquant** : invitation club en 2 temps, portail SSO (page d'accueil — des liens « Authentification à deux facteurs » et « Se déconnecter de tous les appareils » ont été ajoutés sur `/` pour `SUPERADMIN`, mais ça reste la même page minimale, pas un vrai portail).

### `teamManager` — haute
**En place** : effectif, staff, discipline, actus/médias, boutique, sponsors, académie/recrutement, admin billetterie, PWA dynamique par club.
**Manquant** : espace supporter/communauté, checkout/paiement réel de la boutique, workflow contrat/facturation sponsors, finance/trésorerie (aucun module), RGPD (aucun consentement/export/suppression).

### `matchsheet` — moyenne
**En place** : avant-match, live, signatures, statut local de feuille, PWA, middleware de protection.
**Manquant** : tests automatisés, verrouillage renforcé après clôture (raison de réouverture, audit dédié), règles explicites de concurrence avec `teamManager` sur les cartons écrits dans `Card`.

### `superadmin` — haute
**En place** : référentiels, audit, ClubBranding, lib `apiFootball.ts`.
**Manquant** : colonnes de matching (`api_football_id`/`fixture_id`, live score/minute), job de synchro live, écran de mapping équipes/fixtures, icônes PWA personnalisables par club.

### `billetterie` — rang 9 fait, reste : audience fiable, scanner
**En place** : catégories par club/match, règles de vente, « mes billets », anti-survente, quota, fenêtre de vente, **paiement réel via `payment-api`** (réservation `PENDING` → `POST /payments/konnect/init` → redirection → confirmation relue via `GET /payments/:id`, jamais poussée par `payment-api` — voir rang 9 ci-dessous), **réservations abandonnées libérées automatiquement** après 30 min.
**Manquant** : vérification fiable de l'audience réservée (aujourd'hui auto-déclarée), scanner de contrôle stade (jamais commencé).

### `sellerPortal` / `ob` / `payment-api` / `notification-api` — moyenne
**En place** : `sellerPortal` scoping multi-club réel + ClubBranding ; `ob` live match + espace membre branché sur `notification-api` ; `payment-api`/`notification-api` seuls services avec tests + `.env.example` complets dès l'origine. ~~SMS et Web Push front annoncés mais absents de `notification-api`~~ — **corrigé en re-vérifiant le code (11/08/2026) : le canal Web Push est réellement implémenté**, pas juste annoncé : `notification-api/src/providers/push/web-push.provider.ts` signe avec les vraies clés VAPID et appelle `web-push`, et `ob` le consomme de bout en bout (`PushSubscribeButton.tsx` + `ServiceWorkerRegistration.tsx` + `POST /push-subscriptions` via `notificationApi.ts`) — seule app du dépôt à le faire, voir § 4.
**Manquant** : backfill `club_id` manuel de `sellerPortal` en prod, pas de tests ; `ob` sans PWA installable et sans événement émis vers `notification-api` (`ob` reste un émetteur muet — la relation avec le canal Web Push, qui va dans l'autre sens, ne change rien à ce point) ; SMS (`NotImplementedSmsProvider`, hors périmètre assumé §36) et FCM (`FcmProvider`, stub non implémenté, hors périmètre assumé) toujours sans provider réel — décision produit documentée dans le code, pas un oubli.

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

### C. Qualité et CI/CD absents — haute, traité
- ~~Aucun pipeline CI~~ → `.github/workflows/ci.yml` : une entrée de matrice par app (10 apps, `db` exclu — c'est un dump SQL, pas une app), `pnpm install --frozen-lockfile`/`npm ci` + `tsc --noEmit` (ou `npm run build` pour les 2 apps NestJS, qui type-check via `nest build`) + lint + tests quand un script `test` existe (`arbinote`, `superadmin`, `payment-api`, `notification-api`). Déclenché sur push `main` et sur chaque pull request.
- **Ce que ce workflow ne cache pas** : `arbinote` (~106 erreurs) et `superadmin` (~11 erreurs) ont une dette de lint réelle et pré-existante (`@typescript-eslint/no-explicit-any` en quasi-totalité, + 6 warnings React `setState` synchrone dans un effet côté `arbinote`) — volontairement laissée telle quelle, le job de lint de ces deux apps sera rouge dans la CI et c'est correct : la dette redevient visible au lieu de rester invisible faute de CI. Remplacer progressivement les `any` reste un chantier séparé (déjà identifié dans l'historique `manquants.md`), pas à absorber en une fois sans pouvoir tester chaque changement de type contre une vraie base.
- **Ce qui a été corrigé au passage, parce que ça empêchait la CI d'être utile dès le premier run** (tous des changements mécaniques, zéro risque comportemental, vérifiés avec `tsc --noEmit` + `eslint` + un `next build --webpack` complet après coup) :
  - `teamManager/eslint.config.mjs` excluait `.next`/`out`/`build` mais pas `public/**`, qui contient du JS vendored (`bootstrap.min.js`, `ScrollTrigger.min.js`…) jamais écrit par ce projet — ça noyait 5 vraies erreurs sous ~1600 avertissements de fichiers qu'on ne devrait jamais linter. Exclu ; les 5 erreurs restantes (apostrophes non échappées dans `TeamMembersManagement.tsx`) corrigées.
  - `require()` dans les `webpack()` de `next.config.ts` (`sso`, `matchsheet`, `superadmin`, `arbinote`) : légitime à cet endroit (build client uniquement, un import statique le chargerait aussi côté serveur/Edge) mais interdit par `@typescript-eslint/no-require-imports` — un commentaire `eslint-disable-next-line` documenté remplace la suppression silencieuse.
  - `arbinote` : 7 apostrophes non échappées (`d'Équipe` → `d&apos;Équipe`, même motif que `teamManager`) et un `let` jamais réassigné (`prefer-const`) corrigés — le reste de la dette (`any`, `setState` synchrone) laissé visible, voir ci-dessus.
- Note : le script `lint` local de `payment-api`/`notification-api` inclut `--fix` (corrige et avale silencieusement les erreurs auto-fixables) — la CI appelle `eslint` directement sans `--fix` pour que le job échoue réellement en cas d'erreur, sans modifier le script local existant.

### D. Observabilité au minimum — haute, healthcheck traité
- ~~`/api/health` n'existe que dans `arbinote` et `superadmin`~~ → ajouté aux 8 apps qui n'en avaient pas (`sso`, `matchsheet`, `teamManager`, `sellerPortal`, `billetterie`, `ob` : `GET /api/health`, même format que `arbinote`/`superadmin` — statut + `SELECT 1` sur la base + temps de réponse ; `payment-api`, `notification-api` : `GET /health`, ajouté un `AppController` pour `payment-api` qui n'en avait aucun). `sso` vérifie en plus la présence de `SSO_JWT_SECRET`/`SSO_COOKIE_NAME`/`SSO_URL` (statut `degraded` si l'un manque, sans quoi une session émise ne serait vérifiable par aucune autre app) ; `notification-api` expose l'état de sa connexion optionnelle à la base partagée `foot` (`directoryDb: configured/not_configured`) en plus de sa propre base. Vérifié en conditions réelles (pas seulement `tsc`) : serveur `teamManager` démarré sans base disponible, `curl /api/health` répond bien `503 {"status":"error","database":"error",...}` plutôt que de planter.
- **Non traité, hors périmètre code** : monitoring/alerting transversal (agréger ces endpoints, alerter si un `/health` répond en erreur) suppose un service externe (Datadog, Uptime Kuma, healthcheck Docker/Kubernetes…) à provisionner et configurer — rien à câbler côté dépôt tant que ce choix d'outillage n'est pas fait.
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
Le service central existe et 5 apps émettent déjà des événements (`arbinote`, `superadmin`, `matchsheet`, `teamManager`, `payment-api`). `ob` ne source rien (lecture seule). Convocation/composition/sponsor non branchables tant que le destinataire n'est pas un `User` résolvable. Le Web Push est actif côté `notification-api` et consommé par `ob`, mais pas généralisé aux autres frontends ; SMS et FCM restent des providers stub/non implémentés.

### H. Billetterie : chaîne supporter → paiement → contrôle — traité pour paiement + lien ob, contrôle stade toujours absent

~~`ob/espace-membre/billets` reste un écran d'attente statique~~ → renvoie maintenant vers `{NEXT_PUBLIC_BILLETTERIE_URL}/mes-billets`.

~~`billetterie` ne parle pas à `payment-api` (achat mock)~~ → `billetterie` est le premier vrai appelant de `payment-api` dans tout le dépôt (aucune autre app ne l'intégrait avant). Détail du flux (`billetterie/src/lib/tickets.ts`, `paymentApiClient.ts`) :

1. `purchaseTickets` réserve les billets en `PENDING` dans une transaction (verrou pessimiste inchangé, anti-survente déjà présente en V1), **après avoir libéré les réservations `PENDING` abandonnées depuis plus de 30 min** de la même catégorie (pas de tâche planifiée dans ce dépôt pour un nettoyage périodique — ce rattrapage opportuniste en tient lieu) ;
2. hors transaction (jamais d'appel réseau pendant qu'un verrou DB est tenu), appelle `POST /payments/konnect/init` avec `orderId`/`amount`/`email`/`userId` ; si l'appel échoue, compensation : la réservation est libérée plutôt que de laisser des billets `PENDING` orphelins ;
3. le client redirige le navigateur vers le `payUrl` reçu.

**`payment-api` ne rappelle jamais `billetterie`** (pas de webhook applicatif entre les deux apps, seuls les providers rappellent `payment-api`) : la confirmation est relue via `GET /payments/:id`, soit sur `/paiement/retour`, soit — filet de sécurité principal — opportunément à chaque chargement de `/mes-billets` (`reconcileTicketPayment`, idempotent).

**Limite découverte en creusant le code de `payment-api`, pas un oubli côté `billetterie`** : son intégration Konnect (`payment-api/src/payment/providers/konnect/konnect.types.ts`) ne transmet pas de `successUrl`/`failUrl` à Konnect — avec le provider par défaut, le payeur n'est **pas** automatiquement redirigé vers `/paiement/retour` après paiement. Le rattrapage sur `/mes-billets` reste donc le mécanisme réel de confirmation pour la plupart des achats tant que ce n'est pas ajouté côté `payment-api` (changement volontairement pas fait ici : toucher à l'intégration Konnect existante sans base pour tester contre le vrai provider est plus risqué que documenter la limite).

Seuls **Konnect** et **Flouci** sont supportés (`PAYMENT_PROVIDER`, `konnect` par défaut) : Paymee exige `firstName`/`lastName`/`phoneNumber` à l'initiation, des champs que le profil `MEMBER` de `sso` ne collecte pas aujourd'hui — non câblé plutôt que deviné.

**Bug pré-existant découvert en testant réellement (pas juste `tsc`), sans rapport direct avec ce rang mais corrigé au passage** : `billetterie/package.json` n'a jamais eu `mysql2` en dépendance. `type: "mariadb"` de TypeORM en a besoin en interne malgré le nom (c'est un alias du driver MySQL, pas le package npm `mariadb`, que `billetterie` a aussi mais qui ne sert à rien ici) — `ob`/`sellerPortal` ont les deux packages, `billetterie` n'avait que `mariadb`. Sans base disponible dans cet environnement, aucune route de `billetterie` n'avait jamais été testée en conditions réelles avant cette session (seulement `tsc`/`eslint`/`next build`, qui ne touchent jamais la DB) — la première requête HTTP réelle contre une route qui appelle `getDataSource()` (`/paiement/retour`) a immédiatement révélé `DriverPackageNotInstalledError`. Corrigé (`mysql2` ajouté), revérifié : la même page échoue maintenant proprement en `ECONNREFUSED` (pas de vraie base ici) au lieu de planter — ce qui confirme au passage que `/api/health` de `billetterie` (rang 7) était affecté par le même bug et fonctionne correctement maintenant.

**Toujours absent** : le contrôle billetterie à l'entrée du stade (`ticketing-scanner`) n'existe dans aucun dossier du dépôt — hors périmètre de ce rang.

### I. Infra cible non branchée — moyenne
Aucun domaine de production configuré, pas de passerelle API unique, séparation des bases par domaine partielle (`payment-api`/`notification-api` isolées, le reste partage encore `foot`).

---

## 4. Circuits inter-projets — synthèse des flux ouverts, partiels ou fermés

Les sections 2 et 3 détaillent le constat app par app et flux par flux. Cette section les recoupe en une seule table, dans l'ordre où un même utilisateur (staff, arbitre, supporter) les traverserait, pour répondre directement à la question « quel circuit n'est pas encore bouclé, et où est le manque ». `✅ Fermé` = le flux fonctionne bout-en-bout tel qu'observé dans le code ; `🔶 Partiel` = une partie du circuit fonctionne réellement, une autre partie manque ou repose sur un filet de rattrapage ; `⬜ Ouvert` = rien de fonctionnel n'existe pour ce circuit, ou une décision produit reste à prendre. Vérifié sur le code au 11/08/2026 (relecture indépendante de la table de suivi ci-dessus, pas une recopie).

| Circuit | Apps traversées | État | Ce qui manque encore | Détail |
|---|---|:---:|---|---|
| Démarrage local unifié | toutes (`start.sh`) | 🔶 Partiel | Port de `sellerPortal` non fixé dans `package.json` — collision possible avec `sso` (3004) si tout tourne en même temps | § 3.A, rang 1 |
| Session SSO partagée (JWT + cookie) | `sso` → 6 apps clientes | ✅ Fermé | — | `packages/auth-shared` |
| Révocation de session (déconnexion forcée) | `sso` ↔ 6 apps clientes | 🔶 Partiel | `tokenVersion` vérifié uniquement dans `sso` ; un JWT révoqué reste valide jusqu'à 12h dans les 6 apps clientes (limite d'architecture assumée, pas un oubli) | § « `sso` » rang 8 |
| Invitation club (staff) en 2 temps | `sso` | ⬜ Ouvert | Aucun flux d'invitation — création de compte staff hors périmètre actuel | § « `sso` » |
| Portail SSO (page d'accueil) | `sso` | 🔶 Partiel | Page minimale (2 liens ajoutés pour MFA/déconnexion globale), pas un vrai portail de compte | § « `sso` » |
| Middleware admin (`/admin`, `/api/admin`) | `arbinote`/`superadmin`/`teamManager`/`matchsheet` | ✅ Fermé | — | rang 4 |
| CSRF sur actions sensibles | `sso`/`matchsheet`/`teamManager` (logout) | ⬜ Ouvert | Le logout accepte encore `GET` sur ces 3 apps (vérifié : `src/app/api/logout/route.ts` exporte un handler `GET`) | § 3.B |
| Journal de sécurité transverse | toutes | ⬜ Ouvert | Aucun log centralisé des échecs de connexion, rate limit, jeton invalide, reset password | § 3.B |
| CI qualité (lint + tests) | 10 apps | ✅ Fermé (visibilité) | La CI rend la dette de lint *visible* (`arbinote` ~106 erreurs, `superadmin` ~11) sans la corriger — volontaire, pas un flux cassé | rang 6 |
| Observabilité `/api/health` | 10 apps | ✅ Fermé | Monitoring/alerting externe (agrégation, alerte) hors périmètre code | rang 7 |
| Sauvegarde/restauration `foot` + uploads | infra | ⬜ Ouvert | Aucune stratégie au-delà du volume Docker local | rang 10 |
| Gouvernance de la base partagée (propriété par table) | 7 apps lisant/écrivant `foot` | ✅ Fermé (doc) | `Card` reste à deux écrivains (`teamManager` discipline, `matchsheet` live) sans verrou de concurrence — vérifié : aucun `SELECT ... FOR UPDATE` sur `Card` dans les deux apps | § 3.E, `db/OWNERSHIP.md` |
| Cycle de vie du match — `UPCOMING`/`IN_PROGRESS`/`FINISHED` | `matchsheet` (écrit) → `ob`/`billetterie`/`teamManager` (lisent) | ✅ Fermé | — | rang 5, § 3.F |
| Cycle de vie du match — `CANCELLED` | `superadmin` (déciderait) → toutes | ⬜ Ouvert | Vérifié : aucune app n'écrit jamais ce statut (`grep CANCELLED` ne remonte que des lectures/labels). Annulation = décision produit à concevoir (qui prévient qui, réactivation possible ou non), pas un simple câblage | § 3.F |
| Notifications — émission métier | `arbinote`/`superadmin`/`matchsheet`/`teamManager`/`payment-api` → `notification-api` | ✅ Fermé (5/6 émetteurs) | `ob` n'émet toujours aucun événement (lecture seule côté métier — sans rapport avec le canal Web Push ci-dessous, où `ob` est consommateur) | § 3.G |
| Notifications — convocation / composition d'équipe / sponsor | `teamManager` → `notification-api` | ⬜ Ouvert | Le destinataire n'est pas un `User` résolvable dans le modèle actuel | § 3.G |
| Notifications — canal Web Push | `notification-api` ↔ `ob` uniquement | 🔶 Partiel — **corrigé par cette relecture**, la doc précédente le disait absent à tort | Réellement implémenté (VAPID, `webpush.sendNotification`) et câblé de bout en bout dans `ob` (`PushSubscribeButton.tsx`, `ServiceWorkerRegistration.tsx`, `POST /push-subscriptions`) — mais **aucune des 6 autres apps** (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sellerPortal`, `billetterie`) ne l'utilise, alors que 4 d'entre elles ont déjà un `ServiceWorkerRegistration` PWA générique (donc la brique manquante est seulement le bouton d'abonnement + l'appel à `notification-api`, pas le Service Worker lui-même) | `notification-api/src/providers/push/web-push.provider.ts`, `ob/src/components/PushSubscribeButton.tsx` |
| Notifications — canal SMS | `notification-api` | ⬜ Ouvert, assumé | `NotImplementedSmsProvider` lève explicitement une erreur — hors périmètre V1 documenté (§36 du code), décision produit et non un oubli | `notification-api/src/providers/sms/not-implemented-sms.provider.ts` |
| Notifications — canal FCM (mobile natif) | `notification-api` | ⬜ Ouvert, assumé | `FcmProvider` est un stub qui lève une erreur : intégration HTTP v1 Firebase non faite, pas de besoin V1 (repose sur Web Push) | `notification-api/src/providers/push/fcm.provider.ts` |
| Billetterie — réservation → paiement (Konnect/Flouci) | `billetterie` ↔ `payment-api` | ✅ Fermé | — | rang 9 |
| Billetterie — confirmation retour paiement | `payment-api` → `billetterie` | 🔶 Partiel | `successUrl`/`failUrl` non transmis à Konnect côté `payment-api` : pas de redirection automatique après paiement, la confirmation repose sur le rattrapage au chargement de `/mes-billets` (fonctionnel mais pas le circuit direct) | § 3.H |
| Billetterie — Paymee | `billetterie` ↔ `payment-api` | ⬜ Ouvert | Le profil `MEMBER` de `sso` ne collecte pas `firstName`/`lastName`/`phoneNumber`, requis par Paymee à l'initiation | § « `billetterie` », § 3.H |
| Billetterie — audience réservée fiable | `billetterie` | 🔶 Partiel | Auto-déclarée aujourd'hui, aucune vérification indépendante | § « `billetterie` » |
| Billetterie — contrôle d'accès au stade (scanner) | inexistant | ⬜ Ouvert | Vérifié : aucun dossier/route `scanner` ou équivalent dans le dépôt, jamais commencé | § « `billetterie` », § 3.H |
| `ob` espace membre → billetterie | `ob` → `billetterie` | ✅ Fermé | Renvoie vers `{NEXT_PUBLIC_BILLETTERIE_URL}/mes-billets` | rang 9 |
| Boutique club — checkout/paiement | `teamManager` ↔ `payment-api` | ⬜ Ouvert | Vérifié : aucune référence à `payment-api` dans `teamManager` — la boutique n'a que la gestion admin du catalogue (`admin/shop/`), aucun tunnel d'achat | § « `teamManager` » |
| Sponsors club — demande → contrat → facturation | `teamManager` | 🔶 Partiel | Formulaire de demande (`devenir-sponsor`) et champs de contrat (`contractStart`/`contractEnd`/`contractAmount` sur `Sponsor`) existent déjà ; aucun document de contrat généré, aucune facturation | § « `teamManager` » |
| RGPD (consentement, export, suppression) | `teamManager` | ⬜ Ouvert | Aucun module — vérifié, aucun fichier lié au consentement/export/suppression de données personnelles | § « `teamManager` » |
| Finance / trésorerie club | `teamManager` | ⬜ Ouvert | Aucun module | § « `teamManager` » |
| Espace supporter / communauté | `teamManager` | ⬜ Ouvert | Aucun module | § « `teamManager` » |
| Live score / synchro `api-football` | `superadmin` | ⬜ Ouvert | Colonnes de matching (`api_football_id`/`fixture_id`) absentes du schéma, aucun job de synchro (vérifié : aucun `cron`/`setInterval` dans `superadmin/src`), aucun écran de mapping équipe/fixture | § « `superadmin` » |
| `sellerPortal` — rattachement `club_id` en prod | `sellerPortal` | ⬜ Ouvert | Backfill manuel, pas automatisé | § « `sellerPortal`… » |
| Infra cible (passerelle API unique, domaines de prod, séparation des bases par domaine) | toutes | ⬜ Ouvert | Hors périmètre code tant que le déploiement réel n'est pas déclenché | rang 12, § 3.I |

**Lecture rapide** : sur les 33 circuits recensés, 9 sont fermés bout-en-bout, 7 sont partiels (un filet de rattrapage ou une moitié du flux existe), 17 sont encore ouverts — dont la majorité concentrée dans `teamManager` (boutique, sponsors, RGPD, finance, espace supporter) et dans les circuits produits jamais commencés ailleurs (scanner billetterie, synchro live `superadmin`, invitation club `sso`). Aucun de ces 17 n'est bloquant pour ce que le dépôt fait déjà fonctionner ; ce sont des extensions de périmètre, pas des régressions à corriger en urgence.

---

## 5. Note sur la documentation elle-même

Le `README.md` racine renvoyait vers `roadmap.md`, `manquants.md` et `NEXT_STEPS.md`, supprimés par les trois commits précédant cet audit — ce fichier les remplace et le README a été mis à jour en conséquence.
