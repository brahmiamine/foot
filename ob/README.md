# ob

## Rôle du projet

Site public custom de l'Olympique de Béja et espace membre, en lecture sur les données du club.

## Fonctionnalités publiques

Accueil, actualités, calendrier, club/histoire, formation, galerie, partenaires, communiqués, recrutement, contact et boutique; endpoint live par match.

**Pages inventoriées :** `/actualites/[id]`, `/actualites`, `/boutique`, `/calendrier`, `/club/histoire`, `/club`, `/communiques`, `/contact`, `/espace-membre/billets`, `/espace-membre/commandes`, `/espace-membre/notifications`, `/espace-membre`, `/espace-membre/preferences`, `/formation`, `/galerie`, `/`, `/partenaires`, `/recrutement`

## Fonctionnalités administratives

Aucun back-office: les contenus sont administrés dans teamManager.

## API

`/api/health`, `/api/live/[matchId]`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Pages publiques sans session. L'espace membre (profil, billets, commandes, notifications, préférences) consomme la session `MEMBER` SSO; les appels notification sont relayés côté serveur.

## Données possédées

Ne possède pas de schéma/migration. Lit dans `foot` les contenus, équipes, matchs, joueurs, produits et événements, limités par `OB_TEAM_ID`.

**Migrations réellement présentes :** Aucune migration locale; le projet dépend du schéma partagé géré ailleurs.

## Intégrations

SSO/profil membre; notification-api (notifications, préférences, push); liens vers teamManager et billetterie; live issu des données matchsheet partagées.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `OB_TEAM_ID`, `NEXT_PUBLIC_TEAM_MANAGER_URL`, `NEXT_PUBLIC_BILLETTERIE_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_URL`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** Aucun port fixé dans les scripts: défaut Next 3000 (et conflit possible avec arbinote).

Le script racine `../start.sh` ne lance que `sso`, `arbinote`, `matchsheet`, `superadmin` et `teamManager`, avec MariaDB partagée. Les autres projets se lancent séparément. `payment-api` et `notification-api` possèdent leur base; `marketplace-api` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (sellerPortal inclus).

## Tests

`pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

Application mono-club par conception. Boutique surtout catalogue/liaison; commandes et billets redirigent ou dépendent d'autres services. Aucun dossier de migration local.
