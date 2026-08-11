# db — schéma de référence partagé

Ce dossier contient uniquement un dump SQL ([`foot.sql`](./foot.sql)) de la base MariaDB `foot`, partagée par `arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso` et `ob` (lecture seule pour ce dernier). Ce n'est pas une application : c'est une photo du schéma utile pour amorcer un environnement local sans repartir des migrations une par une, ou pour consulter la structure des tables communes.

En local, la base réelle est gérée par un conteneur Docker (`mariadb_container`, port `3307`) créé et alimenté par [`../start.sh`](../start.sh) ; les migrations incrémentales vivent dans chaque app (`arbinote/migrations`, `superadmin/migrations`, `superadmin/mysql`, `matchsheet/sql`, `sso/sql`, `teamManager/sql`).

## Tables principales

- **Référentiel fédéral** : `federations`, `ligues`, `saisons`, `journees`.
- **Compétition** : `teams`, `matches`.
- **Arbitrage** : `arbitres`, `votes`, `vote_alerts`, `critere_definitions`.
- **Effectif/discipline** (`teamManager`/`matchsheet`) : `Player`, `Card`, `CardReason`, `Suspension`, `Fine`, `Note`, `Convocation`.
- **Comptes et sécurité** : `User`, `AuditLog`, `audit_logs`.
- **Divers** : `contact_messages`, `Settings`, `_prisma_migrations` (historique).

Pour le détail des colonnes et des relations, se référer directement au dump ou aux entités TypeORM/Prisma de chaque application.
