# arbinote

## Rôle du projet

Site public multi-ligues de notation des arbitres et back-office de modération.

## Fonctionnalités publiques

Accueil, matchs et journées; fiches équipes/arbitres; vote anonyme protégé par empreinte et preuve signée; classement, statistiques, crédibilité, mes votes; contact, transparence et pages légales.

**Pages inventoriées :** `/arbitres/[id]`, `/arbitres`, `/classement`, `/conditions-generales`, `/contact`, `/journees/[id]`, `/matches/[id]`, `/matches`, `/mentions-legales`, `/mes-votes`, `/`, `/politique-cookies`, `/politique-de-confidentialite`, `/statistic`, `/teams/[id]`, `/teams`, `/transparence`, `/admin/alerts/[id]`, `/admin/alerts`, `/admin/anomalies`, `/admin/contact`, `/admin/criteres`, `/admin`, `/admin/votes`, `/login`

## Fonctionnalités administratives

Tableau de bord; critères; liste, détail, export et modération des votes; détection d'anomalies; alertes à résoudre/ignorer; messages de contact.

## API

`/api/admin/alerts/[id]/dismiss`, `/api/admin/alerts/[id]/resolve`, `/api/admin/alerts/[id]`, `/api/admin/alerts`, `/api/admin/alerts/stats`, `/api/admin/contact`, `/api/admin/criteres/[id]`, `/api/admin/criteres`, `/api/admin/logout`, `/api/admin/votes/[matchId]/anomalies`, `/api/admin/votes/[matchId]/details`, `/api/admin/votes/anomalies`, `/api/admin/votes/export`, `/api/admin/votes/moderate/[voteId]`, `/api/admin/votes`, `/api/admin/votes/single/[id]`, `/api/arbitres/[id]/stats`, `/api/arbitres`, `/api/classement/export`, `/api/contact`, `/api/contact/user`, `/api/federations`, `/api/health`, `/api/journees/[id]/matches`, `/api/matches/[id]/credibility`, `/api/matches/[id]`, `/api/matches`, `/api/preferences/league`, `/api/push-subscriptions/[deviceId]`, `/api/push-subscriptions`, `/api/uploads/arbitre/[filename]`, `/api/uploads/arbitre`, `/api/uploads/federation/[filename]`, `/api/uploads/federation`, `/api/uploads/league/[filename]`, `/api/uploads/league`, `/api/votes/[matchId]`, `/api/votes/[matchId]/user`, `/api/votes`, `/api/votes/user/[fingerprint]/matches`, `/api/votes/user/[fingerprint]`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Lecture et vote publics. Le vote combine fingerprint, limitation de débit et unicité en base; ce n'est pas une identité forte. Les routes `/api/admin/*` vérifient le cookie JWT SSO et le rôle `SUPERADMIN` (sauf login délégué au SSO).

## Données possédées

Base partagée `foot`: fédérations, ligues, saisons, journées, matchs, équipes, arbitres; possède votes, critères, contacts, alertes et audit associés.

**Migrations réellement présentes :** `mysql/arbitres.sql` et `drop-old-schema.sql`; migrations audit, IP de vote, champs équipes/catégories, tournois, alertes et modération; `migrations/` active fédérations/ligues et ajoute l'unicité vote-match-device.

## Intégrations

MariaDB partagée; SSO pour l'administration; notification-api pour les alertes/push.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_LOGGING`, `NEXT_PUBLIC_BASE_URL`, `SSO_URL`, `NEXT_PUBLIC_SSO_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `FINGERPRINT_PROOF_SECRET`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_YAHOO_VERIFICATION`, `NEXT_PUBLIC_YANDEX_VERIFICATION`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3000 via `PORT=3000` dans `../start.sh`; sinon Next choisit 3000.

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test`, `pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Le fingerprint peut être contourné et ne remplace pas un compte. Les uploads sont locaux. Les alertes/anomalies sont une aide à la modération, pas une preuve de fraude.
