# ob — site public de l'Olympique de Béja

Site public (landing page) du club, servi par un déploiement Next.js séparé
de `teamManager`. Lecture seule sur la base `foot` partagée avec
arbinote/superadmin/teamManager/matchsheet (mêmes tables `teams`, `matches`,
`Player`, `Card`, `ms_goals`/`ms_substitutions`/`ms_injuries`, et les tables
`cms_*` propres à teamManager) — ce projet n'écrit jamais dans la base `foot`
partagée ; toute la gestion de contenu (matchs, actus, effectif, galerie,
boutique) reste dans teamManager (`/admin`). L'espace membre appelle en plus
`notification-api` par HTTP (jamais une écriture DB) pour les notifications,
préférences et l'abonnement Web Push.

## Démarrage

```bash
cp .env.example .env.local   # renseigner DB_*, OB_TEAM_ID, NEXT_PUBLIC_TEAM_MANAGER_URL, NOTIFICATION_API_URL
npm install
npm run dev
```

La base MariaDB partagée peut être démarrée via `../start.sh` (voir la
racine du repo `foot`).

## Ce qui est branché en base vs statique

- **Base de données** : prochain match / résultats récents (`matches`,
  filtrés sur `is_public_visible`), actualités publiées (`cms_news`),
  effectif senior actif (`Player`), galerie publique (`cms_media_galleries`),
  boutique (`cms_products`), stade et installations (`cms_stadiums`),
  présentation du club (`cms_club_info`), histoire et palmarès
  (`cms_history`, `cms_history_figures`, `cms_honors` — page
  `/club/histoire`), formation/académie (`cms_academy_categories`,
  `cms_academy_info` — page `/formation`), postes recherchés
  (`cms_recruitment_needs` — page `/recrutement`), communiqués officiels
  publiés (`cms_announcements` — page `/communiques`), sponsors actifs
  (`cms_sponsors` — page `/partenaires`), réseaux sociaux
  (`cms_team_socials` — footer) et coordonnées du club (`cms_contact_info`
  — page `/contact`). Fil d'événements en direct (`ms_goals`,
  `ms_substitutions`, `Card`, `ms_injuries`, table possédées par
  `matchsheet`) affiché sur la page d'accueil quand `matches.status =
  IN_PROGRESS` (`LiveMatchService`, polling client toutes les 20s via
  `/api/live/[matchId]`).
- **API externe (notification-api)** : l'espace membre (`/espace-membre`,
  compte `MEMBER` du SSO) affiche les notifications, préférences de langue
  et abonnement Web Push réels via `notification-api` (voir
  `src/lib/notificationApi.ts`) — jamais de simulation ni de données figées.
  Reste vide tant qu'aucune app émettrice (`teamManager`, `payment-api`, ou
  une future billetterie/marketplace) n'appelle
  `notification-api:/internal/notifications` pour ces utilisateurs (voir
  `../roadmap.md` § 2.1, hors périmètre de ce projet).
- **Calculé** : le classement (`PublicStandingsService`) est reconstruit à
  la volée à partir des matchs `FINISHED` entre équipes de la même
  fédération/catégorie/sport — il n'existe pas encore de table "classement"
  dans le schéma partagé (voir `../roadmap.md` § 1, intégration
  API-Football pas encore faite). Le classement n'est donc fiable que si
  tous les matchs de la ligue sont saisis côté ArbiNote/cardManager.
- **Statique** : la section "Histoire du club" de la page d'accueil
  (`HistorySection.tsx`) reste un teaser éditorial en dur — la page
  `/club/histoire` (récit, palmarès, grandes figures) est, elle, branchée
  sur `cms_history`/`cms_honors`/`cms_history_figures`.
- **Écriture** : les formulaires publics qui créent des données
  (inscription académie `/inscription`, recrutement `/recrutement`,
  contact `/contact`, demande de sponsoring `/devenir-sponsor`) sont
  hébergés côté `teamManager` (voir `NEXT_PUBLIC_TEAM_MANAGER_URL`) — ce
  site, lecture seule, renvoie simplement vers ces pages (`lib/publicForms.ts`,
  `lib/sponsor.ts`) au lieu de dupliquer les flux d'écriture.
- **Billetterie/paiement boutique** : le tunnel d'achat (panier, checkout,
  paiement) n'existe pas encore (voir `../roadmap.md` § 4.2 et la Phase 1 de
  la marketplace/billetterie) — les CTA billetterie/boutique de la page
  d'accueil renvoient toujours vers la section contact. `/espace-membre/billets`
  et `/espace-membre/commandes` sont des emplacements déjà en place dans le
  hub membre, avec un message explicite indiquant qu'ils se peupleront une
  fois ce tunnel ouvert — volontairement pas de fausses données.

## Espace membre

`/espace-membre` (garde `MEMBER`/session SSO dans `layout.tsx`) :

- `/espace-membre` — profil (nom/email depuis le JWT `sso`, déconnexion).
- `/espace-membre/notifications` — liste des notifications (`notification-api`), marquer comme lue/tout lire.
- `/espace-membre/preferences` — langue des notifications + abonnement Web Push (bouton d'activation, service worker `public/sw.js`, clé VAPID `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`).
- `/espace-membre/billets`, `/espace-membre/commandes` — emplacements réservés, en attente de la billetterie/marketplace supporter (voir ci-dessus).

Toutes les mutations (marquer lu, changer de langue, (dés)abonnement push) passent par des Server Actions (`espace-membre/actions.ts`) qui revérifient la session SSO puis appellent `notification-api` — aucune n'écrit dans la base `foot`.

## Design

Recrée le prototype Claude Design `project/ob/Olympique de Béja.dc.html`
(thème rouge/noir "Les Cigognes de Béja", inspiré d'arsenal.com) en
composants Next.js App Router, tokens CSS dans `src/app/globals.css`.
