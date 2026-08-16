# `db` — instantané de la base partagée `foot`

Ce dossier est un composant **non déployable**. [`foot.sql`](./foot.sql) est un dump MariaDB de référence pour amorcer le développement local ; ce n'est ni un migrateur ni la source exhaustive du schéma courant. Les migrations incrémentales restent réparties dans les domaines. Les droits d'écriture et la procédure cross-app sont dans [`OWNERSHIP.md`](./OWNERSHIP.md).

## Périmètre des bases

| Base | Projets / accès | Tables |
|---|---|---|
| **`foot` partagée** | `arbinote`, `match-operations`, `referee-hub`, `player-hub`, `federation-hub`, `club-hub`, `identity`, `seller-portal`, `ticketing`, `marketplace` | Référentiel, matchs, arbitrage, comptes, effectif, CMS, feuille de match, ticketing et famille marketplace `sp_*`. |
| **base propre à `payments`** (`DB_DATABASE`) | `payments` seulement | `payments`, `refunds`, `refund_status_history`, `payment_outbox_events`. |
| **base propre à `notifications`** (`DB_DATABASE`) | `notifications` seulement | `notifications`, `notification_deliveries`, `notification_events`, `notification_preferences`, `notification_user_locales`, `notification_templates`, `push_subscriptions`. |

`notifications` ouvre en plus une connexion **lecture seule** vers `foot` (`DIRECTORY_DB_*`) pour résoudre des destinataires.

## Schéma partagé `foot`

Le dump racine est volontairement en retard sur plusieurs migrations applicatives. Il contient les 23 tables historiques suivantes :

```text
arbitres, AuditLog, audit_logs, Card, CardReason, contact_messages,
Convocation, critere_definitions, federations, Fine, journees, ligues,
matches, Note, Player, saisons, Settings, Suspension, teams, User, votes,
vote_alerts, _prisma_migrations
```

Les évolutions plus récentes sont réparties notamment dans :

- `arbinote/migrations` et `arbinote/mysql` ;
- `federation-hub/migrations` et `federation-hub/mysql` ;
- `identity/sql` ;
- `match-operations/sql` ;
- `club-hub/sql` ;
- `ticketing/sql` ;
- `seller-portal/sql` pour l'historique de la famille `sp_*`.

Le dump ne représente donc jamais à lui seul la production.

## Bases autonomes

Contrairement à l'ancien état, `payments` et `notifications` possèdent maintenant des migrations TypeORM versionnées :

- `payments/src/database/migrations/1786841000000-BaselinePaymentsSchema.ts` ;
- `notifications/src/database/migrations/1786841100000-BaselineNotificationsSchema.ts`.

Le runbook de déploiement se trouve dans [`../docs/architecture/database-migrations.md`](../docs/architecture/database-migrations.md). Les baselines sont non destructives (`CREATE TABLE IF NOT EXISTS`) afin d'adopter les bases historiques sans perdre de données. `synchronize` ne doit jamais être utilisé comme migrateur de production.

## Domaines fonctionnels de `foot`

- **Référentiel et compétition** : `federations`, `ligues`, `saisons`, `journees`, `teams`, `team_branding`, `matches`.
- **Arbitrage** : `arbitres`, `votes`, `vote_alerts`, `critere_definitions`, `audit_logs`.
- **Identité partagée** : `User`, `member_team_affiliations`, `password_reset_tokens`, `security_events`, `mfa_enrollment_challenges`, `staff_invitations`.
- **Effectif et discipline** : `Player`, `Card`, `CardReason`, `Suspension`, `Fine`, `Note`, `Convocation`.
- **Club et feuille de match** : familles `cms_*`, `shop_*` et `ms_*`.
- **Billetterie partagée** : famille `tk_*`.
- **Marketplace** : famille `sp_*`. `marketplace` porte les mutations produit/images/variantes/inventaire et profil vendeur ; `seller-portal` conserve encore des lectures directes pendant la transition ainsi que son mécanisme d'authentification vendeur.

Les noms `notifications` ou `payments` rencontrés dans d'anciens scripts de bootstrap ne doivent pas être confondus avec les tables courantes de leurs API isolées : c'est `DB_DATABASE` de chaque service qui fixe sa base.
