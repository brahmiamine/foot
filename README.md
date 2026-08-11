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
| [`sellerPortal`](./sellerPortal) | Portail vendeur générique du marketplace d'un club : catalogue produits/variantes, stock, commandes, retours, payouts (lecture seule), notifications — les vendeurs sont des comptes indépendants du SSO club. Anciennement `ob-seller-portal`. | ⚠️ voir note | Cookie de session propre (`SP_JWT_SECRET`), indépendant du SSO |
| [`billetterie`](./billetterie) | Billetterie générique multi-clubs : achat de billets (catégories définies par club, règles de vente par audience/quota) pour n'importe quel match de la base partagée — ne duplique pas `matches`. Admin des catégories/prix/règles de vente dans `teamManager` (`/admin/billetterie`) ; cette app ne fait que vendre. Achat réel via `payment-api` (Konnect par défaut, voir son README pour la limite de redirection automatique). | 3005 | Public (liste/détail matchs) + `MEMBER` via SSO (achat, mes billets) |
| [`db`](./db) | Dump SQL de référence du schéma partagé `foot`. | — | — |
| [`skote`](./skote) | Template d'admin React (Themesbrand Skote) vendored à titre de référence visuelle — non branché au produit. | — | — |

Un autre document complète ce README :

- [`avancement.md`](./avancement.md) — panorama des 11 apps, fonctionnalités manquantes par projet, processus manquants entre les projets (auth partagée, gouvernance des données, cycle de vie du match, CI/CD…) et suivi des actions au fil des sessions.

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
| `tickets.platform.tn` | Billetterie générique — app séparée [`billetterie`](./billetterie) (voir tableau `## Applications` et son README pour le détail de l'intégration paiement). Admin des catégories/règles de vente dans `teamManager` (`/admin/billetterie`). `ob/espace-membre/billets` pointe vers cette billetterie générique plutôt que de la réimplémenter dans l'app custom |
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

Point d'attention sur le modèle existant : l'entité `User` de `sso` (`sso/src/entities/User.ts`) porte un seul champ `teamId` nullable. C'est correct pour un compte staff/`ADMIN` (rattaché à un seul club par construction), mais **n'est pas réutilisé pour représenter l'affiliation supporter** d'un `MEMBER` dans `billetterie` — voir le modèle d'affiliations séparé (`sso/src/entities/MemberTeamAffiliation.ts`, 0..N clubs favoris par membre), indépendant de la relation billet/événement, et surtout : **`billetterie` ne s'appuie pas sur ces affiliations pour autoriser un achat** (un supporter peut suivre plusieurs clubs ou aucun, ce n'est pas un mécanisme d'autorisation fiable) — voir `billetterie/README.md` pour la limite actuelle de `TicketSaleRule.allowedAudience` (auto-déclaration à l'achat, pas une vérification d'identité, à revoir avant toute vente réelle sur catégorie réservée).

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

- **`sellerPortal`** : renommage (`ob-seller-portal` → `sellerPortal`), généralisation des textes d'interface, scoping multi-clubs réel (`sp_sellers.club_id`/`sp_product_categories.club_id`, choix du club à l'inscription, `clubId` porté par la session, catégories filtrées par club) et consommation de `ClubBranding` (titre de page, logo/couleurs de la barre latérale du tableau de bord) faits. Voir `sellerPortal/README.md` § « Portée V1 ».
- **`ClubBranding`** : implémenté (`superadmin` : table `team_branding` + admin CRUD ; `teamManager` et `sellerPortal` : manifest/metadata/logo résolus dynamiquement par club, voir leurs `lib/clubBranding.ts` respectifs). Reste non fait : personnalisation des icônes PWA par club (au-delà nom/couleurs/favicon) et branchement dans `billetterie` (pages publiques, sans branding club pour l'instant).
- **`billetterie`** : app générique créée (voir tableau `## Applications` et `billetterie/README.md`) — modèle `tk_*` (catégories par club, catégories par match, règles de vente, billets), pages liste/détail match + achat + « mes billets ». Administration des catégories/prix/capacité/règles de vente faite dans `teamManager` (`/admin/billetterie`, réservé `ADMIN` du club, voir `teamManager/src/services/TicketingService.ts`). Achat réel via `payment-api` (réservation `PENDING` → paiement Konnect/Flouci → confirmation relue depuis `payment-api`, qui ne rappelle jamais `billetterie` — voir `billetterie/README.md` pour la redirection automatique via `KONNECT_SUCCESS_URL`/`KONNECT_FAIL_URL`, en plus du rattrapage systématique sur `/mes-billets`) ; `ob/espace-membre/billets` renvoie vers cette billetterie générique. Reste non fait : vérification fiable de `allowedAudience` HOME_SUPPORTERS/AWAY_SUPPORTERS (actuellement une auto-déclaration à l'achat, voir README de l'app) et le contrôle billetterie au point d'entrée du stade (`ticketing-scanner`, app séparée, pas commencée).
- **API Gateway** : pas de domaine `api.platform.tn` unifié ; `payment-api`/`notification-api` restent des services distincts avec leurs propres bases. Le routage par chemin (`/payment`, `/notifications`, …) décrit ci-dessus n'est pas encore en place — c'est une tâche d'infrastructure (reverse proxy), pas de code applicatif.
- **Base de données par domaine** : `payment-api` et `notification-api` ont déjà leur propre base, mais les applications métier (`teamManager`, `sellerPortal`, `arbinote`, `matchsheet`, `ob`) partagent encore la base `foot`. Une séparation en bases par domaine (référentiel/clubs/matchs, marketplace, …) est une évolution possible à moyen terme, à ne déclencher que lorsque ces domaines évoluent réellement de façon indépendante — pas une priorité de cette normalisation.

## Démarrage local

```bash
./start.sh
```

Ce script démarre un conteneur MariaDB partagé (`mariadb_container`, port `3307`) et phpMyAdmin (port `9090`), applique un correctif de schéma idempotent, puis lance en parallèle `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`. `sso` ne démarre que si `sso/.env.local` existe déjà (`cp sso/.env.example sso/.env.local` puis renseigner les secrets) — sans quoi le script continue mais les autres apps ne pourront pas authentifier. `ob`, `payment-api`, `notification-api`, `sellerPortal` et `billetterie` sont des déploiements séparés, à démarrer indépendamment depuis leur propre dossier.

`sellerPortal` a désormais un port fixe (`3006`, `next dev -p 3006`/`next start -p 3006` dans son `package.json`), qui ne collisionne plus avec `sso` (3004) ni avec aucune autre app démarrée par `start.sh` (3000-3003) ou `billetterie` (3005).

## Architecture partagée

- **Base de données** : une seule base MariaDB `foot`, partagée par `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso` et `ob` (lecture seule pour ce dernier). Les tables communes (`teams`, `matches`, `Player`, `Card`, `User`, …) permettent à chaque app de lire/écrire les mêmes données sans duplication. `sellerPortal` ajoute ses propres tables (`sp_*`) dans cette même base `foot` en attendant une future Marketplace API dédiée. `payment-api` et `notification-api` ont chacune leur propre base (paiements, notifications) ; `notification-api` ne lit `foot` qu'en lecture seule (`DIRECTORY_DB_*`), pour résoudre les destinataires d'un envoi groupé (par club, rôle, ou espace supporter).
- **Authentification** : `sso` signe un JWT (HS256, `jose`) placé dans un cookie partagé (`foot_sso_session` par défaut, domaine configurable via `SSO_COOKIE_DOMAIN` pour du multi-sous-domaine). Les autres apps ne font que vérifier ce cookie avec le même secret (`SSO_JWT_SECRET`) et le même issuer (`foot-sso`) — elles n'émettent jamais de session elles-mêmes. `matchsheet` est volontairement hors de ce périmètre (kiosque sans authentification).
- **API-Football** : intégration externe en cours de finalisation (voir `arbinote/matching.md` et `roadmap.md` § 1) pour le rapprochement des équipes/matchs locaux avec les identifiants de l'API et le suivi des scores en direct.
- **PWA** : `teamManager` et `matchsheet` exposent chacun un `manifest.json` + service worker (app shell, page de secours hors-ligne, bannière d'installation) — voir `roadmap.md` § 3. Aucune synchronisation offline des écritures (formulaires/CRUD) : ce chantier reste à faire.
- **Notifications côté `ob`** : l'espace membre (`ob/espace-membre`) est le premier frontend supporter branché sur `notification-api` — liste des notifications, préférences de langue et abonnement Web Push, via des appels serveur-à-serveur authentifiés par le JWT `sso` de l'utilisateur (jamais d'écriture directe dans la base `foot`). `teamManager` (hors actus déjà branchées), `payment-api` (hors paiement confirmé déjà branché) et le reste de `ob` n'envoient pas encore d'événements vers `notification-api` : les listes resteront vides tant que ce câblage émetteur n'existe pas pour ces cas.

## Points nécessitant une intervention manuelle

Ce qui suit ne peut pas être fait depuis ce repo seul et doit être traité séparément (infra/DNS/secrets) :

- **DNS / SSL / reverse proxy** : aucun des domaines cibles (`www.ob.tn`, `sso.platform.tn`, `admin.platform.tn`, `sellers.platform.tn`, `tickets.platform.tn`, `scanner.platform.tn`, `api.platform.tn`, `superadmin.platform.tn`) n'existe aujourd'hui — achat/délégation de domaine, certificats et configuration Nginx/Traefik sont à faire hors repo.
- **`SSO_COOKIE_DOMAIN`** : pour un cookie SSO partagé entre plusieurs sous-domaines `*.platform.tn` (`admin.`, `sellers.`, `tickets.`, `scanner.`, `superadmin.`, …), cette variable (déjà supportée par `sso`, voir son README) doit être positionnée en production sur le domaine parent (`.platform.tn`), avec `HttpOnly`, `Secure` et `SameSite=Lax`. Vérifier aussi le domaine séparé `ob.tn`, hors du périmètre `*.platform.tn`, qui ne peut pas partager ce cookie sans mécanisme dédié (SSO cross-domaine, à concevoir si le besoin apparaît). Ne pas mélanger ce cookie avec celui de `sellerPortal` (`SP_JWT_SECRET`, cookie propre) : un vendeur n'est pas un utilisateur `sso`, les deux identités et les deux cookies doivent rester indépendants même une fois tous les sous-domaines déployés sous `.platform.tn`.
- **CORS** : chaque app back-end (`payment-api`, `notification-api`, `sso`) doit avoir ses origines autorisées mises à jour avec les domaines de production définitifs une fois connus.
- **Callback OAuth (Google)** : `sso` gère la connexion Google — les URIs de redirection autorisées côté Google Cloud Console devront être mises à jour pour `https://sso.platform.tn/...` en production.
- **Secrets/variables d'environnement** : `SSO_JWT_SECRET`, `SP_JWT_SECRET`, `SERVICE_API_KEYS`, clés des providers de paiement (Konnect/Paymee/Flouci) et clés push (VAPID) doivent être générées/gérées via un secret manager en production — aucune valeur réelle n'est commitée (seuls des `*.env.example` existent), mais leur provisioning reste une action manuelle par environnement.
- **`sellerPortal` multi-clubs — backfill en production** : le scoping applicatif est fait (voir `sellerPortal/README.md` § « Portée V1 »), mais une installation déjà en production doit exécuter `sellerPortal/sql/migration_add_club_id.sql` puis backfiller manuellement `club_id` sur les lignes existantes de `sp_sellers`/`sp_product_categories` avant de compter dessus pour filtrer une requête — nécessite une décision produit sur la stratégie de migration (quel club pour quelles lignes existantes) avant toute exécution en base de production.
- **`ClubBranding` — personnalisation des icônes PWA par club** : nom/couleurs/favicon sont résolus dynamiquement (`superadmin`, `teamManager`, `sellerPortal`), mais les icônes PWA (`icon-192x192.png`, `icon-512x512.png`) restent des assets statiques partagés par tous les clubs — les personnaliser demanderait de valider des images fournies par chaque club (formats/tailles requis pour rester installable), hors périmètre de cette normalisation.
