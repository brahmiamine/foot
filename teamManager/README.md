# teamManager — back-office de gestion d'un club

Application Next.js (App Router) qui centralise la gestion d'un club de football : effectif, staff, discipline, actualités/médias, boutique, sponsors, académie/recrutement, exports et réglages. Un seul déploiement partagé pour tous les clubs : chaque utilisateur se connecte avec son propre compte `User`, rattaché à son club (`teamId`) via le SSO commun au dépôt `foot`. Issue de la fusion de l'ancien "cardManager" (module discipline) avec la gestion de club.

Le cahier des charges complet vit dans [`doc/cahier-des-charges.md`](./doc/cahier-des-charges.md) et le suivi fonctionnel dans [`doc/plan.md`](./doc/plan.md) ; [`rules.md`](./rules.md)/[`.cursorrules`](./.cursorrules) documentent les conventions techniques du projet (TypeScript strict, TypeORM, RBAC, sécurité, design system Bootstrap 5, i18n FR/AR/EN) plutôt que les fonctionnalités. [`olympique-de-béja.md`](./olympique-de-béja.md) est un contenu éditorial (histoire, palmarès, stade) servant de données d'amorçage pour un club en particulier, pas une spécification.

## Fonctionnalités implémentées (`src/app/admin`)

- **Effectif & staff** : joueurs (`players`), membres d'encadrement (`team-members`, `staff`), statistiques joueurs (`player-stats`), tactiques/formations (`tactics`), convocations (`convocations`), entraînements et présence (`trainings`), déplacements (`trips`), blessures (`injuries`).
- **Discipline** (ex-cardManager) : cartons (`cards`), motifs de cartons paramétrables (`settings` → `card-reasons`), suspensions (`suspensions`), amendes (`fines`), notes internes (`notes`).
- **Matchs** : matchs officiels et amicaux (`matches`, `friendly-matches`).
- **Actualités & médias (CMS)** : actualités (`news`), galeries et fichiers médias (`media`), histoire/figures/palmarès du club (`club`), informations stade (`stadiums`).
- **Boutique & sponsors** (gestion côté admin) : catégories et produits (`shop`), sponsors (`sponsors`).
- **Billetterie** (gestion côté admin, `billetterie`) : catégories de billets du club, et par match à domicile — prix/capacité/règles de vente (audience, quota par acheteur, fenêtre de vente). Écrit dans les tables partagées `tk_*` (voir `../billetterie/README.md`) ; l'app `billetterie` (générique, séparée) est celle qui vend réellement les billets aux supporters.
- **Académie & recrutement** : candidatures académie (`academy`), besoins de recrutement (`recruitment`).
- **Administration** : utilisateurs et rôles/permissions (`users`, `roles`), réglages club (`club-settings`), communiqués (`announcements`), notifications internes (`notifications`), journal d'audit (`audit`), tableau de bord (`stats`), exports Excel/PDF (`exports`, via `exceljs`/`jspdf`).
- **Formulaires publics** (hors `/admin`, un par club via `[teamId]`) : contact (`/contact/[teamId]`), devenir sponsor (`/devenir-sponsor/[teamId]`), inscription académie (`/inscription/[teamId]`), recrutement (`/recrutement/[teamId]`) — ces formulaires sont aussi consommés par le site vitrine `ob` en lecture seule.

La racine (`/`) redirige directement vers `/admin` (ou vers la connexion SSO) : il n'existe pas encore de site public par club servi par `teamManager` lui-même (chaque club aura son propre site public plus tard, sur le modèle de `ob`).

## Rôles

Hiérarchie définie dans la spec et reflétée par `roles`/`users` : `ADMIN`, `SOUS-ADMIN`, `COACH`, `ADJOINT`, `STAFF`, `JOUEUR`, `SUPPORTER`, avec des acteurs additionnels prévus (directeur sportif, analyste performance, préparateur physique, médecin, kiné, préparateur mental, community manager, responsable sécurité, responsable billetterie, secrétaire général, trésorier, responsable juridique, responsable infrastructures).

## Fonctionnalités décrites au cahier des charges mais pas encore implémentées

- **Boutique multi-vendeurs** avec commissions et paiement en ligne (côté produit/client, pas seulement gestion admin).
- **Espace supporter/communauté** : fil d'actualité, vote homme du match, sondages, pronostics, points de fidélité, badges, mur des supporters, contenus exclusifs, live texte, QR code de présence stade, résumé de match généré par IA.
- **Notifications centralisées** (ciblage par club/rôle/joueur/supporter). Le module `notifications` interne (`entities/Notification.ts`, page « Communication » `/admin/notifications`) reste indépendant de `notification-api` ; ce n'est pas ce module qui émet vers `notification-api`. ~~Le câblage vers ce dernier n'est pas encore fait~~ : côté émission, `lib/notificationClient.ts` (`POST /internal/notifications`) est déjà branché ; côté réception, l'abonnement Web Push (voir § PWA ci-dessous) l'est aussi désormais. Reste ouvert : convocation/composition d'équipe/sponsor, où le destinataire n'est pas encore un `User` résolvable (voir avancement.md § 3.G).

## PWA

`manifest.json` + `public/sw.js` (app shell : cache des assets statiques,
page `offline.html` de secours pour la navigation), icônes dans
`public/icons/`, bannière d'installation (`PwaInstallPrompt.tsx`,
évènement `beforeinstallprompt`) — voir [`../roadmap.md`](../roadmap.md) § 3.
Pas de synchronisation offline des écritures (formulaires/CRUD) : hors
périmètre de ce chantier. **Notifications Web Push** : abonnement possible
depuis l'en-tête de l'admin (`PushSubscribeButton`, Server Actions dans
`app/admin/pushActions.ts`, relais du JWT `sso` vers
`notification-api`/`api/push-subscriptions`) — `public/sw.js` gère
`push`/`notificationclick`, même mécanique que `ob` (voir avancement.md,
"Web Push généralisé").

Voir [`../roadmap.md`](../roadmap.md) pour le détail et les priorités de ce backlog.

## Base de données

MySQL/MariaDB (`mariadb`, `mysql2`, TypeORM), base `foot` partagée avec `arbinote`, `matchsheet`, `superadmin`, `sso` et `ob`. Migrations dans [`sql/`](./sql) : matchs et équipes externes, pages club/candidatures académie, blessures, compositions d'équipe (`match_lineups`, prérequis de `matchsheet`), périmètre des notifications, statistiques joueurs, rôles/planning/formations, boutique + sponsors + notifications, tableaux tactiques, catégories jeunes/genre, détails et présence des entraînements, déplacements, unification CMS, unification des joueurs — plus un jeu de données complet (`olympique_beja_db_complete.sql`) et des exemples de seed (joueurs, boutique, sponsors).

## Authentification

Session SSO partagée (cookie JWT `foot_sso_session`, secret `SSO_JWT_SECRET`, issuer `foot-sso`, vérifié via `jose`) — voir [`../sso/README.md`](../sso/README.md). `teamManager` ne fait que vérifier le cookie, il ne l'émet jamais.

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, etc.
pnpm install
pnpm run dev   # http://localhost:3003 (voir aussi ../start.sh à la racine du repo)
```

## Interface

UI Bootstrap 5 (thème SCSS porté du template Skote), édition riche via Tiptap, exports Excel (`exceljs`) et PDF (`jspdf`/`jspdf-autotable`), emails via `nodemailer`, validation des données via `zod`.
