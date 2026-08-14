# player-hub

Espace joueur générique multi-clubs : un joueur consulte son calendrier, répond
à ses convocations et invitations d'entraînement, suit ses statistiques, sa
discipline, ses déplacements, sa disponibilité et ses notifications — le tout
en lisant les données déjà gérées par [`club-hub`](../club-hub) (même base
"foot"), sans les redéfinir.

## Périmètre de cette implémentation

C'est la première des trois interfaces spécialisées envisagées
(`player-hub`, `staff-hub`, `medical-hub`) à côté de `club-hub`. Elle inclut :

- le rôle `PLAYER` dans `identity` (compte scopé à un club **et** à un joueur
  — `User.playerId`, voir `identity/src/entities/User.ts`) ;
- le claim `playerId` dans le JWT SSO partagé (`packages/auth-shared`) ;
- une page de connexion dédiée `identity` → `/joueur/login` (même mécanique
  que `/login` et `/membre/login`) ;
- cette application : lecture des tables `Player`, `cms_convocations`,
  `cms_trainings`/`cms_training_invitations`, `cms_player_stats`,
  `Card`/`Suspension`/`Fine`, `cms_trips`/`cms_trip_participants`,
  `cms_injuries` ; écriture strictement limitée à la réponse du joueur
  connecté sur ses propres lignes (présence à un match/entraînement, offre de
  transport pour un déplacement).

`staff-hub` et `medical-hub` restent à faire — voir la discussion
architecture qui a motivé ce chantier.

## Provisionnement d'un compte joueur

Un compte `PLAYER` est **provisionné par le club**, jamais en
auto-inscription (contrairement à `MEMBER`) : `club-hub` n'a pas encore
d'écran dédié pour ça, donc le seul point d'entrée actuel est un script côté
`identity` :

```bash
cd ../identity
PLAYER_EMAIL=ahmed@example.tn PLAYER_PASSWORD=... PLAYER_NAME="Ahmed Ben Ali" \
PLAYER_TEAM_ID=<uuid Team> PLAYER_PLAYER_ID=<id Player existant dans club-hub> \
DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=foot \
pnpm create-player-account
```

Le joueur se connecte ensuite sur `identity` (`/joueur/login`), avec le même
cookie SSO partagé que les autres apps — voir `packages/auth-shared/README.md`.

## Démarrage local

```bash
cp .env.example .env.local   # puis renseigner DB_*, SSO_URL, NOTIFICATION_API_URL
pnpm install
pnpm dev   # http://localhost:3007
```

Nécessite `identity` démarré (émission/vérification du cookie SSO) et la
base `foot` déjà peuplée par `club-hub` (au minimum un `Player` et un
compte `PLAYER` lié — voir ci-dessus). `notifications` est optionnel : sans
lui, la page notifications reste simplement vide (voir
`src/lib/notificationApi.ts`).

## Design

Même palette/tokens que `seller-portal` (`--ph-*` dans `src/app/globals.css`,
calqué sur `--sp-*`) plutôt que le Bootstrap/Skote de `club-hub` : un portail
mono-population comme celui-ci est plus proche en esprit de `seller-portal`
(vendeur) que du back-office multi-métiers de `club-hub`. Couleurs de marque
résolues dynamiquement depuis `team_branding` (voir `src/lib/clubBranding.ts`),
jamais hardcodées à un club.
