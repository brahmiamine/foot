# Schéma partagé — qui possède quoi

Les 5 apps (`sso`, `matchsheet`, `arbinote`, `superadmin`, `teamManager`) partagent la même base MySQL "foot" (`db/foot.sql`), chacune avec ses propres entités TypeORM sur les mêmes tables — il n'y a **pas** de schéma/migration commun. Ce document sert de référence pour savoir qui a le droit d'altérer une table donnée, et qui doit être prévenu en cas de changement de colonne.

**Convention** : "propriétaire" = l'app dont la migration fait foi pour cette table (celle où l'ajout/suppression de colonne doit être fait en premier, puis répliqué dans les entités des autres apps). "Consommatrices" = apps qui lisent et/ou écrivent la table sans en être propriétaires.

| Table | Propriétaire | Consommatrices | Remarques |
|---|---|---|---|
| `User` | superadmin (`lib/clubAccounts.ts`) | sso (auth), teamManager, matchsheet (lecture via en-têtes SSO, pas de requête directe) | Comptes SUPERADMIN (sans `teamId`) et club (ADMIN/OBSERVATEUR, avec `teamId`). Le mot de passe n'est vérifié que par `sso`. |
| `teams` | superadmin | arbinote, teamManager, matchsheet | Référentiel des clubs/équipes nationales. |
| `federations`, `ligues`, `saisons`, `journees` | superadmin | arbinote, matchsheet | Référentiel de compétition. |
| `matches` | superadmin (`lib/adminMatches.ts`) | arbinote, teamManager, matchsheet | `status`/`score_home`/`score_away` : matchsheet déclenche leur mise à jour via `POST /api/internal/matches/[id]/status` (superadmin reste le seul à écrire réellement en base — voir `src/lib/matchStatusSync.ts` côté matchsheet). |
| `arbitres` | superadmin | arbinote | |
| `Card`, `CardReason` | teamManager (`services/CardService.ts`, règles d'amende/suspension) | matchsheet (délègue la création/suppression via `POST/DELETE /api/internal/cards`, ne modifie jamais la table directement) | `Card.period` est renseigné par matchsheet (mi-temps/prolongation), lu par teamManager. |
| `Suspension`, `Fine`, `Note` | teamManager | — | Conséquences disciplinaires, jamais touchées par matchsheet directement (passent par `CardService.create`). |
| `Player` | teamManager | matchsheet (lecture, composition d'équipe) | |
| `votes`, `vote_alerts` | arbinote | superadmin (lecture seule, dashboard + widget alertes) | |
| `audit_logs` | arbinote (schéma d'origine) | superadmin, matchsheet (écrivent aussi, avec `app_source` pour distinguer) | Voir migration `add_app_source_to_audit_logs.sql`. |
| `AuditLog` | teamManager | superadmin (lecture seule, fusionné avec `audit_logs` dans `/admin/audit`) | Schéma différent de `audit_logs` (avant/après JSON plutôt que résumé texte). |
| `contact_messages`, `critere_definitions` | arbinote | — | |

## Points d'intégration au-delà de la base partagée

Depuis ce fix, deux appels HTTP internes existent entre apps (protégés par `INTERNAL_API_SECRET`, jamais par une session SSO) :

- `matchsheet → teamManager` : `POST /api/internal/cards`, `DELETE /api/internal/cards/[id]` (règles d'amende/suspension centralisées dans teamManager).
- `matchsheet → superadmin` : `PATCH /api/internal/matches/[id]/status` (statut réel du match).

Tout le reste de l'intégration inter-apps se fait par lecture directe de la base partagée — aucune queue, aucun webhook.

## Hors périmètre (dette assumée)

Ce document réduit le risque de dérive silencieuse en rendant la propriété explicite, mais ne l'élimine pas : chaque app garde sa propre copie de chaque entité TypeORM, donc une migration mal répliquée reste possible. Une vraie solution (schéma/migrations partagés, package commun) demanderait de transformer les 5 apps en monorepo/workspace — non fait ici, chantier disproportionné par rapport à la demande initiale.
