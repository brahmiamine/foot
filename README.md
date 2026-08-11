# foot

Plateforme de gestion d'une ligue de football (fédérations, ligues, clubs, matchs, arbitrage) organisée en plusieurs applications indépendantes qui partagent une même base de données MariaDB (`foot`) et un mécanisme d'authentification centralisé (SSO par cookie JWT).

## Applications

| Projet | Rôle | Port local | Authentification |
|---|---|---:|---|
| [`sso`](./sso) | Authentification centralisée (connexion staff/club et compte membre public, y compris Google) : émet le cookie JWT partagé par toutes les autres apps. | 3004 | Émetteur du SSO |
| [`arbinote`](./arbinote) | Site public de notation des arbitres : votes, critères, classement, anomalies, alertes, transparence. | 3000 | Public (anonyme, fingerprint) + back-office `SUPERADMIN` via SSO |
| [`matchsheet`](./matchsheet) | Feuille de match électronique (kiosque tablette) : avant-match, live (cartons/buts/blessures/remplacements), après-match, signatures. | 3001 | Aucune (preuve = signature sur place) |
| [`superadmin`](./superadmin) | Back-office interne : référentiels fédérations/ligues/saisons/journées/équipes/matchs/arbitres, journal d'audit, test/mapping API-Football, gestion des comptes club. | 3002 | `SUPERADMIN` via SSO |
| [`teamManager`](./teamManager) | Back-office de gestion d'un club : effectif, staff, discipline (cartons/suspensions/amendes), actualités/médias, boutique, sponsors, académie/recrutement, exports, réglages. | 3003 | Rôles club (`ADMIN`, `SOUS-ADMIN`, `COACH`, …) via SSO |
| [`ob`](./ob) | Site public (vitrine) **custom** de l'Olympique de Béja, en lecture seule sur la base partagée. Live match (buts/cartons/remplacements/blessures lus depuis `matchsheet`) et espace membre (profil, notifications, préférences, push) consommant `notification-api`. | — | Public + `MEMBER` via SSO |
| [`payment-api`](./payment-api) | API de paiement (NestJS) mutualisée : intègre les providers tunisiens Konnect Network, Paymee et Flouci derrière une interface unique. | — | Clé API interne |
| [`notification-api`](./notification-api) | Centre de notifications centralisé (NestJS) : in-app, email et push (SMS à venir) pour toutes les apps de l'écosystème, avec préférences utilisateur, templates multilingues, queue asynchrone (BullMQ) et idempotence. | 3010 | JWT `sso` (public) + clé de service (interne) |
| [`sellerPortal`](./sellerPortal) | Portail vendeur générique du marketplace d'un club : catalogue produits/variantes, stock, commandes, retours, payouts (lecture seule), notifications — les vendeurs sont des comptes indépendants du SSO club. Anciennement `ob-seller-portal` (voir note ⚠️ ci-dessous et son README pour l'écart encore existant avec le multi-clubs). | ⚠️ voir note | Cookie de session propre (`SP_JWT_SECRET`), indépendant du SSO |
| [`db`](./db) | Dump SQL de référence du schéma partagé `foot`. | — | — |
| [`skote`](./skote) | Template d'admin React (Themesbrand Skote) vendored à titre de référence visuelle — non branché au produit. | — | — |

D'autres documents complètent ce README :

- [`roadmap.md`](./roadmap.md) — backlog produit/fonctionnel (API-Football live, notifications, PWA, espace supporter, boutique, sponsors, finance, RGPD).
- [`manquants.md`](./manquants.md) — dette technique (infrastructure, sécurité, qualité, gouvernance des données).
- [`NEXT_STEPS.md`](./NEXT_STEPS.md) — état d'avancement et TODO détaillé de la normalisation générique/custom (ce qui est fait, ce qui reste, comment reprendre dans une autre session).

## Classification des projets — générique vs custom

Cette classification est la source de vérité pour toute contribution future : **rien de générique ne doit connaître un club en particulier ; tout ce qui est spécifique à l'identité et au contenu de l'Olympique de Béja reste dans `ob`.**

```
GENERIC PLATFORM (multi-clubs)
├── sso            — authentification centralisée
├── superadmin     — back-office plateforme (fédérations, ligues, clubs, saisons, arbitres, audit)
├── teamManager    — back-office de gestion d'un club (le club est déterminé par teamId)
├── sellerPortal   — portail vendeur du marketplace d'un club
├── arbinote       — notation publique des arbitres
├── matchsheet     — feuille de match électronique (kiosque)
├── payment-api    — paiement mutualisé (Konnect, Paymee, Flouci)
└── notification-api — notifications in-app / email / push

CUSTOM APPLICATIONS
└── ob             — site vitrine + espace membre, spécifique à l'Olympique de Béja
```

| Projet | Type | Scope |
|---|---|---|
| `sso` | Générique | Multi-club |
| `superadmin` | Générique | Plateforme |
| `teamManager` | Générique | Multi-club |
| `sellerPortal` | Générique (⚠️ V1 mono-club en pratique, voir son README) | Multi-club (cible) |
| `arbinote` | Générique | Multi-club |
| `matchsheet` | Générique | Multi-club |
| `payment-api` | Générique | Plateforme |
| `notification-api` | Générique | Plateforme |
| `ob` | Custom | Olympique de Béja uniquement |

Règle pour tout code ajouté aux projets génériques : ne jamais hardcoder le nom du club, son sigle, son logo, ses couleurs ou son favicon — ces éléments doivent provenir de la configuration du club courant (`ClubBranding` : `clubId`, `name`, `shortName`, `logo`, `favicon`, `primaryColor`, `secondaryColor`, `accentColor`, `font`, `metadata`), résolue à partir du `teamId` authentifié, jamais d'une valeur envoyée par le frontend.

### URLs de production (architecture cible)

Aucun de ces domaines n'est actuellement configuré (DNS/SSL/reverse proxy) — voir « Points nécessitant une intervention manuelle » ci-dessous. La table ci-dessous documente le mapping cible à mettre en place :

| Domaine cible | Application |
|---|---|
| `www.ob.tn` | `ob` (custom, exclusivement OB) |
| `sso.platform.tn` | `sso` |
| `admin.platform.tn` | `teamManager` (le club connecté est déterminé par `teamId` après authentification) |
| `sellers.platform.tn` | `sellerPortal` |
| `tickets.platform.tn` | Billetterie générique — **n'existe pas encore comme application séparée dans ce repo** ; la billetterie/l'espace membre `ob/espace-membre/billets` est aujourd'hui couplée à l'app custom `ob` (écart avec la cible, voir ci-dessous) |
| `scanner.platform.tn` | Contrôle billetterie générique — **n'existe pas encore dans ce repo** |
| `api.platform.tn` | Passerelle API générique — **n'existe pas encore** ; `payment-api` et `notification-api` sont aujourd'hui exposées séparément |
| `superadmin.platform.tn` | `superadmin` |

#### Principe : un seul domaine par appli générique, jamais un sous-domaine par club

`admin.platform.tn`, `sellers.platform.tn`, `tickets.platform.tn` et `scanner.platform.tn` servent **tous les clubs à la fois** — il ne faut jamais créer `admin-ob.platform.tn` ou `admin-est.platform.tn`. Ce qui change n'est pas l'URL mais le **contexte authentifié** (`teamId` résolu par le SSO) :

| Application | Olympique de Béja | Espérance de Tunis |
|---|---|---|
| Site public custom | `www.ob.tn` | — (pas de projet custom EST tant qu'il n'est pas développé) |
| TeamManager | `admin.platform.tn` | `admin.platform.tn` |
| Seller Portal | `sellers.platform.tn` | `sellers.platform.tn` |
| Billetterie | `tickets.platform.tn` | `tickets.platform.tn` |
| Contrôle billets | `scanner.platform.tn` | `scanner.platform.tn` |

```
admin.platform.tn/login → SSO → teamId=OB  → branding/joueurs/couleurs OB
                                → teamId=EST → branding/joueurs/couleurs EST
```

Même URL, contenu différent selon le club authentifié — c'est exactement le rôle du `ClubBranding` décrit plus haut. `ob` reste le seul cas différent : c'est un **second projet, custom**, pas un tenant de plus dans une appli générique. Si l'Espérance de Tunis commande un jour un site vitrine équivalent, ce serait un nouveau projet custom (`est`, `www.est.tn`) indépendant de `ob`, pas une évolution de `ob` ni de `teamManager`.

Pour la billetterie, le club peut aussi apparaître dans le chemin plutôt qu'être déduit uniquement de la session (`tickets.platform.tn/ob`, `tickets.platform.tn/est`) : `/ob` et `/est` ne sont pas deux déploiements différents, seulement deux contextes de la même application. **Règle de sécurité** : le slug d'URL ne doit jamais servir directement de filtre de données. Le serveur doit toujours le résoudre en `teamId` (`resolveTeam("ob") → teamId`), vérifier l'autorisation, puis filtrer `WHERE team_id = teamId` — jamais `WHERE team_slug = request.params.slug` sans ce contrôle, qui laisserait n'importe quel appelant changer de club en changeant l'URL.

Dans la même logique, les catégories de billets ne doivent pas être un enum fixe dans le code (`GRADIN`, `CHAISE`, …) : chaque club doit pouvoir définir les siennes (ex. OB : Gradin/Chaise ; EST : Virage/Tribune/VIP) via une configuration par club, pas via une modification de code.

#### Billetterie : séparer l'identité du supporter de l'organisateur de l'événement

Un compte membre (`sso`, rôle `MEMBER`) est **global à la plateforme**, pas rattaché à un seul club : un supporter peut suivre plusieurs clubs, ou n'en suivre aucun et simplement acheter un billet ponctuel. Il ne faut donc **pas** conditionner l'achat d'un billet à un `teamId` unique porté par le compte membre — ce serait trop restrictif (un supporter EST doit pouvoir acheter un billet pour un match organisé par OB).

Le club intervient à trois niveaux distincts, à ne pas confondre :

```
Member (sso)                 → identité globale à la plateforme
Member ↔ Team (optionnel)    → affiliations/clubs favoris (0, 1 ou plusieurs)
Event/Match                  → homeTeam, awayTeam, stade, club organisateur (teamId)
Ticket                       → eventId, matchId, purchaserId, teamId (organisateur), categoryId, status
```

Le `teamId` porté par un billet est celui du **club organisateur/vendeur** de cette billetterie (l'équipe à domicile, en général), pas celui du supporter acheteur. Pour gérer les catégories réservées à un camp (ex. `OB vs EST` : Gradin/Chaise en vente publique, mais une tribune réservée aux seuls supporters visiteurs), la billetterie a besoin d'une règle de vente par catégorie plutôt que d'un simple filtre par club de l'acheteur — typiquement une `TicketSaleRule` (`eventId`, `categoryId`, `allowedAudience` : public/supporters-domicile/supporters-visiteurs, `allowedTeamId` optionnel, fenêtre de vente, quota par utilisateur).

Point d'attention sur le modèle existant : l'entité `User` de `sso` (`sso/src/entities/User.ts`) porte aujourd'hui un seul champ `teamId` nullable. C'est correct pour un compte staff/`ADMIN` (rattaché à un seul club par construction), mais **ne doit pas être réutilisé tel quel pour représenter l'affiliation supporter** d'un `MEMBER` une fois la billetterie construite — il faudrait alors un modèle d'affiliations séparé (0..N clubs favoris par membre), indépendant de la relation billet/événement. Ce n'est pas un problème aujourd'hui (la billetterie n'existe pas encore, voir plus haut), mais c'est à garder en tête au moment de sa conception plutôt que de prolonger le champ `teamId` existant.

#### Passerelle API : un domaine, des chemins par service — pas un sous-domaine par service

`api.platform.tn` doit rester un point d'entrée unique routé par chemin vers les services internes, plutôt qu'un sous-domaine par service :

```
api.platform.tn/payment/*        → payment-api
api.platform.tn/notifications/*  → notification-api
api.platform.tn/marketplace/*    → marketplace-api (futur)
api.platform.tn/ticketing/*      → ticketing (futur)
```

au lieu de `payment-api.platform.tn`, `notification-api.platform.tn`, etc. Les services (`payment-api`, `notification-api`, …) peuvent rester des projets et des déploiements totalement séparés en interne ; seul le préfixe de chemin derrière la passerelle/reverse proxy est public. Cela permet de changer l'infrastructure (Docker, Kubernetes, autre hébergeur) sans jamais changer les URLs consommées par les frontends. **Nom de projet Git ≠ nom de service interne ≠ URL publique** : par exemple le projet `payment-api` peut rester `payment-api` en interne tout en étant exposé publiquement sous `api.platform.tn/payment`.

### Écarts connus avec l'architecture cible

- **`sellerPortal`** : le renommage (`ob-seller-portal` → `sellerPortal`) et la généralisation des textes d'interface sont faits, mais le schéma (`sp_*`) n'a pas de colonne `clubId`/`teamId` — c'est encore un déploiement mono-club en pratique. Voir `sellerPortal/README.md` § « Portée V1 » et `NEXT_STEPS.md` § A pour le plan de scoping multi-club.
- **`ClubBranding`** : implémenté (`superadmin` : table `team_branding` + admin CRUD ; `teamManager` : manifest PWA/metadata/logo sidebar résolus dynamiquement par club, voir `lib/clubBranding.ts`). Reste non fait : personnalisation des icônes PWA par club (au-delà nom/couleurs/favicon) et branchement dans `sellerPortal`/la future billetterie.
- **Billetterie / contrôle billetterie** : n'existent pas comme services génériques indépendants dans ce repo (`ob/espace-membre/billets` n'est aujourd'hui qu'un écran d'attente, aucune vente réelle). L'extraction en service générique multi-clubs est un chantier de roadmap, pas fait dans le cadre de cette normalisation (pas de réécriture non nécessaire, cf. contrainte de la mission) — voir « Billetterie : séparer l'identité du supporter de l'organisateur de l'événement » ci-dessus pour le modèle de données à suivre le jour où ce chantier démarre (ne pas réutiliser le `teamId` unique de `User` pour représenter l'affiliation supporter).
- **API Gateway** : pas de domaine `api.platform.tn` unifié ; `payment-api`/`notification-api` restent des services distincts avec leurs propres bases. Le routage par chemin (`/payment`, `/notifications`, …) décrit ci-dessus n'est pas encore en place — c'est une tâche d'infrastructure (reverse proxy), pas de code applicatif.
- **Base de données par domaine** : `payment-api` et `notification-api` ont déjà leur propre base, mais les applications métier (`teamManager`, `sellerPortal`, `arbinote`, `matchsheet`, `ob`) partagent encore la base `foot`. Une séparation en bases par domaine (référentiel/clubs/matchs, marketplace, …) est une évolution possible à moyen terme, à ne déclencher que lorsque ces domaines évoluent réellement de façon indépendante — pas une priorité de cette normalisation.

## Démarrage local

```bash
./start.sh
```

Ce script démarre un conteneur MariaDB partagé (`mariadb_container`, port `3307`) et phpMyAdmin (port `9090`), applique un correctif de schéma idempotent, puis lance en parallèle `arbinote`, `matchsheet`, `superadmin` et `teamManager`. `sso` n'est pas encore intégré à ce script (voir `manquants.md` § 1.1) : il doit être démarré manuellement (`cd sso && pnpm run dev`, port `3004`) pour que la connexion fonctionne dans les autres apps. `ob`, `payment-api`, `notification-api` et `sellerPortal` sont des déploiements séparés, à démarrer indépendamment depuis leur propre dossier.

> ⚠️ Le README de `sellerPortal` indique le port `3004` comme exemple, alors que ce port est déjà celui de `sso`. Aucun port fixe n'est défini dans son `package.json` (Next.js démarre par défaut sur `3000`) : à clarifier/fixer avant un lancement simultané de toutes les apps.

## Architecture partagée

- **Base de données** : une seule base MariaDB `foot`, partagée par `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso` et `ob` (lecture seule pour ce dernier). Les tables communes (`teams`, `matches`, `Player`, `Card`, `User`, …) permettent à chaque app de lire/écrire les mêmes données sans duplication. `sellerPortal` ajoute ses propres tables (`sp_*`) dans cette même base `foot` en attendant une future Marketplace API dédiée. `payment-api` et `notification-api` ont chacune leur propre base (paiements, notifications) ; `notification-api` ne lit `foot` qu'en lecture seule (`DIRECTORY_DB_*`), pour résoudre les destinataires d'un envoi groupé (par club, rôle, ou espace supporter).
- **Authentification** : `sso` signe un JWT (HS256, `jose`) placé dans un cookie partagé (`foot_sso_session` par défaut, domaine configurable via `SSO_COOKIE_DOMAIN` pour du multi-sous-domaine). Les autres apps ne font que vérifier ce cookie avec le même secret (`SSO_JWT_SECRET`) et le même issuer (`foot-sso`) — elles n'émettent jamais de session elles-mêmes. `matchsheet` est volontairement hors de ce périmètre (kiosque sans authentification).
- **API-Football** : intégration externe en cours de finalisation (voir `arbinote/matching.md` et `roadmap.md` § 1) pour le rapprochement des équipes/matchs locaux avec les identifiants de l'API et le suivi des scores en direct.
- **PWA** : `teamManager` et `matchsheet` exposent chacun un `manifest.json` + service worker (app shell, page de secours hors-ligne, bannière d'installation) — voir `roadmap.md` § 3. Aucune synchronisation offline des écritures (formulaires/CRUD) : ce chantier reste à faire.
- **Notifications côté `ob`** : l'espace membre (`ob/espace-membre`) est le premier frontend supporter branché sur `notification-api` — liste des notifications, préférences de langue et abonnement Web Push, via des appels serveur-à-serveur authentifiés par le JWT `sso` de l'utilisateur (jamais d'écriture directe dans la base `foot`). `teamManager`, `payment-api` et le reste de `ob` n'envoient pas encore d'événements vers `notification-api` (voir `roadmap.md` § 2.1) : les listes resteront vides tant que ce câblage émetteur n'existe pas.

## Points nécessitant une intervention manuelle

Ce qui suit ne peut pas être fait depuis ce repo seul et doit être traité séparément (infra/DNS/secrets) :

- **DNS / SSL / reverse proxy** : aucun des domaines cibles (`www.ob.tn`, `sso.platform.tn`, `admin.platform.tn`, `sellers.platform.tn`, `tickets.platform.tn`, `scanner.platform.tn`, `api.platform.tn`, `superadmin.platform.tn`) n'existe aujourd'hui — achat/délégation de domaine, certificats et configuration Nginx/Traefik sont à faire hors repo.
- **`SSO_COOKIE_DOMAIN`** : pour un cookie SSO partagé entre plusieurs sous-domaines `*.platform.tn` (`admin.`, `sellers.`, `tickets.`, `scanner.`, `superadmin.`, …), cette variable (déjà supportée par `sso`, voir son README) doit être positionnée en production sur le domaine parent (`.platform.tn`), avec `HttpOnly`, `Secure` et `SameSite=Lax`. Vérifier aussi le domaine séparé `ob.tn`, hors du périmètre `*.platform.tn`, qui ne peut pas partager ce cookie sans mécanisme dédié (SSO cross-domaine, à concevoir si le besoin apparaît). Ne pas mélanger ce cookie avec celui de `sellerPortal` (`SP_JWT_SECRET`, cookie propre) : un vendeur n'est pas un utilisateur `sso`, les deux identités et les deux cookies doivent rester indépendants même une fois tous les sous-domaines déployés sous `.platform.tn`.
- **CORS** : chaque app back-end (`payment-api`, `notification-api`, `sso`) doit avoir ses origines autorisées mises à jour avec les domaines de production définitifs une fois connus.
- **Callback OAuth (Google)** : `sso` gère la connexion Google — les URIs de redirection autorisées côté Google Cloud Console devront être mises à jour pour `https://sso.platform.tn/...` en production.
- **Secrets/variables d'environnement** : `SSO_JWT_SECRET`, `SP_JWT_SECRET`, `SERVICE_API_KEYS`, clés des providers de paiement (Konnect/Paymee/Flouci) et clés push (VAPID) doivent être générées/gérées via un secret manager en production — aucune valeur réelle n'est commitée (seuls des `*.env.example` existent), mais leur provisioning reste une action manuelle par environnement.
- **`sellerPortal` multi-clubs** : ajouter `clubId` au schéma (`sp_*`), migrer les données existantes et brancher le filtrage serveur par club (voir `sellerPortal/README.md` § « Portée V1 ») — nécessite une décision produit sur la stratégie de migration avant toute exécution en base de production.
- **`ClubBranding` dynamique** : n'existe pas encore comme entité/API dans `superadmin`/`teamManager`/`sellerPortal` — à concevoir (stockage, endpoint de résolution par `teamId`, injection dans le manifest PWA et les métadonnées de page) avant de pouvoir réellement démontrer « Club A → branding A, Club B → branding B » en generique.
