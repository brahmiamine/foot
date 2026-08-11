# arbinote — site public de notation des arbitres

Application Next.js (App Router) qui remplace l'ancien "ArbiNote" : un site public permettant aux internautes de noter les arbitres après chaque match, et un back-office pour modérer ces votes, gérer les critères de notation et surveiller les anomalies. Fait partie de l'écosystème `foot` : même base MariaDB partagée (`teams`, `matches`, `Player`, …) que `superadmin`, `teamManager` et `matchsheet`, même SSO que `superadmin`, `teamManager`, `sso`, `matchsheet` et `ob`.

## Fonctionnalités

### Partie publique

- **Accueil, équipes, matchs, journées** : navigation de la hiérarchie fédération → ligue → saison → journée → match, avec fiches équipes et matchs.
- **Fiches arbitres** (`/arbitres`, `/arbitres/[id]`) avec statistiques individuelles.
- **Classement des arbitres** (`/classement`) calculé par un algorithme de classement bayésien (`bayesianRanking.ts`), pondérant les votes pour limiter l'effet des petits échantillons ou du vote massif orienté ; export CSV disponible (rate-limité).
- **Vote** : un formulaire par critère sur la page d'un match ; la note globale n'est jamais envoyée telle quelle par le client, elle est **recalculée côté serveur** à partir des critères soumis pour limiter la triche. Un seul vote par (match, appareil) est autorisé, l'identification se faisant par empreinte d'appareil (`@fingerprintjs/fingerprintjs`) plutôt que par compte utilisateur, avec une contrainte d'unicité en base et un cookie de preuve.
- **Score de crédibilité d'un match** (`/matches/[id]`) : détection automatique d'anomalies statistiques dans les votes reçus (`voteAnomalyDetection.ts`, `matchCredibility.ts`), affiché en clair pour la transparence.
- **`/mes-votes`** : historique des votes de l'appareil courant.
- **`/transparence`** : explication publique de la méthodologie de notation et de détection d'anomalies.
- **Contact** (`/contact`) et pages légales (mentions légales, CGU, politique de cookies, politique de confidentialité).
- **`/testapi`** : page de test de l'intégration API-Football (proxy à liste blanche d'endpoints côté serveur, quota du plan gratuit surveillé).
- Multi-ligue : une préférence de ligue active peut être sélectionnée côté client.
- PWA basique : `manifest.json` + service worker minimal avec mise en cache statique.
- i18n : français, anglais, arabe.

### Back-office (`/admin`, réservé au rôle `SUPERADMIN`)

- **Tableau de bord** de synthèse.
- **Modération des votes** (`/admin/votes`) : liste, détail par match, export CSV.
- **Anomalies** (`/admin/anomalies`) détectées automatiquement dans les votes.
- **Alertes** (`/admin/alerts`) de crédibilité (types `critical`/`important`, statuts `new/reviewed/resolved/dismissed`) avec résolution/rejet.
- **Critères de notation** (`/admin/criteres`) : CRUD des critères utilisés dans le formulaire de vote.
- **Messages de contact** (`/admin/contact`) reçus depuis le formulaire public.

## Authentification

- Aucune authentification côté public : identification par empreinte d'appareil uniquement (pas de compte).
- L'accès au back-office (`/admin/*` et `api/admin/*`) est protégé via `src/lib/adminAuth.ts`, qui délègue à `src/lib/ssoSession.ts` — vérification du cookie JWT partagé (`SSO_COOKIE_NAME`, secret `SSO_JWT_SECRET`, issuer `foot-sso`, bibliothèque `jose`), rôle requis : `SUPERADMIN`. Les comptes sont créés côté `sso` (`pnpm seed:superadmin`) ; l'ancien couple `ADMIN_USER`/`ADMIN_PASS` codé en dur est déprécié.

## Modèle de données (TypeORM)

`Federation` → `League` → `Saison` → `Journee` → `Match`, avec `Team` et `Arbitre`. Votes (`Vote`, unicité `match_id` + empreinte d'appareil), `VoteAlert` (table `vote_alerts`), `CritereDefinitionEntity` (table `critere_definitions`), `Contact` (table `contact_messages`), `AuditLog`.

## Base de données

Base MySQL/MariaDB (`mysql2` + TypeORM), partagée avec `superadmin` et `teamManager`. Migrations SQL dans `migrations/` :

- `add_is_active_to_federations.sql`
- `add_is_active_to_leagues.sql`
- `add_unique_vote_per_match_device.sql`

## Démarrage

```bash
cp env.sso.example .env.local   # renseigner DB_*, SSO_JWT_SECRET, SSO_COOKIE_NAME, etc.
pnpm install
pnpm run dev        # http://localhost:3000 (voir aussi ./start.sh à la racine du repo)
```

## Tests

```bash
pnpm test        # Vitest : bayesianRanking, voteAnomalyDetection, voteWeighting, apiError, imageHost, voteFiltering
```

## Intégration API-Football

Le rapprochement entre les matchs locaux et les fixtures de l'API externe (identifiants, score en direct) est documenté dans [`matching.md`](./matching.md) et suivi dans [`../roadmap.md`](../roadmap.md) § 1 : le plan gratuit de l'API interdit d'interroger le calendrier de la saison en cours à l'avance, le mapping des identifiants ne peut donc se faire qu'au moment où un match passe en direct.
