# club-ob

## Rôle du projet

Site public custom de l'Olympique de Béja et hub supporter. Les contenus métier restent administrés dans `club-hub`; `club-ob` ajoute les interactions du compte SSO `MEMBER` sans dupliquer `identity`, `ticketing`, `match-operations`, `notifications` ou `marketplace`.

## Fonctionnalités publiques

Accueil, actualités, calendrier, club/histoire, formation, galerie, partenaires, communiqués, recrutement, contact, boutique et endpoint live par match.

La page `/communaute` ajoute :

- pronostics score + premier buteur ;
- vote homme du match ;
- sondages ;
- mur des supporters ;
- réactions et commentaires modérés ;
- classement supporters et supporter du mois ;
- groupes supporters et événements.

Les actualités acceptent également réactions et commentaires communautaires.

## Espace membre

`/espace-membre` exige explicitement le rôle SSO `MEMBER` et expose :

- profil ;
- parcours supporter (`/espace-membre/communaute`) : points, présences, pronostics, badges, joueur/tribune favoris ;
- notifications et préférences push ;
- billets via l'application `ticketing` ;
- commandes, encore dépendantes de l'API supporter à exposer côté `marketplace`.

Les présences sont dérivées des billets `tk_tickets` réellement scannés (`status = USED`, non révoqués). Les points sont idempotents par source et le supporter du mois n'est jamais calculé sur le montant dépensé.

## Modération et administration

La communauté est administrée dans `club-hub` sur `/admin/supporter-community` :

- approuver/rejeter posts et commentaires ;
- créer/fermer les sondages ;
- publier au nom du club en visibilité publique ou membre ;
- créer des groupes supporters et événements ;
- audit des mutations via `AuditLogService`.

L'accès réutilise la permission de communication `notifications.send`.

## Données

Les tables cœur du club restent en lecture depuis `club-ob`. Les interactions communautaires utilisent les tables `cms_supporter_*`, dont le propriétaire de schéma est `club-hub`.

Migration : `club-hub/sql/migration_add_supporter_community.sql`.

Toutes les requêtes communautaires sont scopées par `team_id`; les Server Actions d'écriture exigent le rôle `MEMBER`.

## API

`/api/health`, `/api/live/[matchId]`.

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Intégrations

- `identity` : session et profil membre ;
- `notifications` : notifications, préférences et push ;
- `ticketing` : billets et preuve de présence ;
- `match-operations` : live, composition, entrants et premier buteur ;
- `club-hub` : modération et gouvernance communautaire ;
- `marketplace` : catalogue; le listing des commandes membre reste à exposer côté service.

## Variables d’environnement

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `OB_TEAM_ID`, `NEXT_PUBLIC_CLUB_HUB_URL`, `NEXT_PUBLIC_TICKETING_URL`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_URL`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`.

Ne jamais committer de valeurs réelles.

## Démarrage

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
```

**Port :** aucun port fixé dans les scripts; défaut Next 3000.

## Tests

Le projet possède des tests Vitest, dont les règles communautaires et la restriction stricte du layout membre. L'audit i18n racine reste applicable via `pnpm test:i18n`.

## Limites connues

Application mono-club par conception (`OB_TEAM_ID`). La boutique et les commandes restent dépendantes des services génériques de plateforme; aucun historique de commandes n'est simulé dans `club-ob` tant que `marketplace` n'expose pas un endpoint MEMBER sécurisé.
