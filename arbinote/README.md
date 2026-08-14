# ArbiNote

## Rôle du projet

ArbiNote est la plateforme **publique** de perception des performances des arbitres. Elle expose les arbitres, leurs profils, les matchs, les statistiques publiques, le classement et les votes protégés contre les abus.

> Un score public ArbiNote n'est jamais une évaluation officielle fédérale.

## Périmètre public

- `/`, `/arbitres`, `/arbitres/[id]` ;
- `/matches`, `/matches/[id]`, `/journees/[id]` ;
- `/classement`, `/statistic`, `/mes-votes` ;
- votes publics par critères, fingerprint, preuve signée, rate limiting et unicité match/appareil ;
- crédibilité et détection automatique des comportements suspects ;
- pages équipes, contact, transparence et pages légales.

Les API publiques sont limitées aux fédérations/ligues de navigation, arbitres, matchs, journées, statistiques, contact et votes. Il n'existe plus de `/admin`, `/api/admin` ni `/api/officiel` dans cette application. Les uploads historiques restent servis en lecture seule.

## Administration

La modération des votes, les anomalies, alertes, signalements et critères publics sont administrés depuis `federation-hub` sous `/admin/arbitrage/arbinote/*`. Les évaluations officielles confidentielles vivent également dans `federation-hub`, dans un modèle et des routes séparés.

## Données

ArbiNote écrit les votes publics (`votes`) et les contacts publics. Il lit le référentiel partagé (`federations`, `ligues`, `saisons`, `journees`, `matches`, `teams`, `arbitres`). Il ne déclare ni ne lit `referee_official_evaluations`.

## Démarrage et tests

```bash
cp .env.example .env.local
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm build
```

Le port injecté par `../start.sh` est 3000. Les migrations publiques restent enregistrées dans `../db/migrations.manifest`.
