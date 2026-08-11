# Propriété des tables et processus de migration — base partagée `foot`

Ce document répond à un manque identifié dans `avancement.md` (rang 3) :
7 applications (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `sso`,
`ob`, `sellerPortal`) lisent et/ou écrivent la même base MariaDB `foot`
sans qu'aucun document ne dise, table par table, qui a le droit d'écrire
quoi. Établi en croisant les entités TypeORM (`@Entity`) réellement
déclarées par chaque app avec leurs routes d'écriture effectives (pas
seulement les migrations historiques, qui contiennent des tables reprises
par plusieurs apps sans que ça reflète leurs droits d'écriture actuels —
voir « Ce que ce document corrige » plus bas).

## Comment lire ce document

**Source de vérité** = l'app qui a le droit de créer/modifier/supprimer les
lignes de ce domaine. **Lecture** = les apps qui consomment ces données
sans jamais les écrire. Une app peut avoir une entité TypeORM sur une table
sans avoir de route qui écrit dessus (c'est le cas d'`arbinote`, voir plus
bas) : la colonne « Source de vérité » reflète les droits, pas la simple
présence d'une entité.

## Matrice de propriété

| Domaine | Tables | Source de vérité | Lecture seule |
|---|---|---|---|
| Fédérations / ligues / saisons / journées | `federations`, `ligues`, `saisons`, `journees` | `superadmin` | `arbinote`, `matchsheet`, `ob`, `teamManager` |
| Équipes / clubs (référentiel) | `teams` | `superadmin` (CRUD complet) | `arbinote`, `matchsheet`, `ob`, `sso`, `sellerPortal`, `billetterie` |
| Fiche du club connecté (paramètres, branding) | `teams` (sa propre ligne, `WHERE id = teamId`), `team_branding` | `teamManager` (sa ligne), `superadmin` (branding, toutes lignes) | `sellerPortal` |
| Matchs — référentiel (équipes, date, score, arbitre) | `matches` (hors `status`, voir ligne suivante) | `superadmin` (création/programmation) | `arbinote`, `matchsheet`, `ob`, `billetterie`, `teamManager` (lecture pour préparation) |
| Matchs — statut opérationnel (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) | `matches.status` | `matchsheet` (seul à savoir, avec certitude, quand un match démarre/finit réellement — voir alerte ci-dessous) | `ob` (résultats, classement), `billetterie` (fenêtre de vente), `teamManager` (formations) |
| Arbitrage : arbitres, votes, alertes, critères | `arbitres`, `votes`, `vote_alerts`, `critere_definitions` | `arbinote` | `superadmin` (consultation) |
| Comptes et sessions | `User`, `member_team_affiliations`, `password_reset_tokens`, `security_events` | `sso` | `arbinote`, `superadmin`, `teamManager` (lecture/jointures) |
| Effectif / discipline club | `Player`, `CardReason`, `Suspension`, `Fine`, `Note` | `teamManager` | `matchsheet`, `ob` (lecture) |
| **Cartons (`Card`) — écriture partagée, voir alerte ci-dessous** | `Card` | `teamManager` **et** `matchsheet` | `ob` (lecture) |
| Compositions d'équipe | `cms_match_lineups` | `teamManager` | `matchsheet` (lecture, verrouillage au coup d'envoi) |
| Feuille de match électronique | `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`, `ms_match_officials`, `ms_player_controls` | `matchsheet` | `ob` (lecture : buts/cartons/blessures/remplacements pour le live) |
| Contenu club (actus, médias, académie, staff, historique…) | `cms_*` (~35 tables, préfixe `cms_`) | `teamManager` | `ob` (lecture, sous-ensemble public) |
| Boutique / sponsors (legacy `teamManager`) | `cms_products`, `cms_sponsors`, `shop_*` | `teamManager` | `ob` (lecture) |
| Billetterie — catégories et règles | `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules` | `teamManager` (`/admin/billetterie`) | `billetterie` (lecture) |
| Billetterie — achats | `tk_tickets` | `billetterie` | — |
| Marketplace vendeur | `sp_*` (préfixe `sp_`) | `sellerPortal` | — |
| Audit | `audit_logs` (arbitrage), `AuditLog` (`teamManager`) | `arbinote`/`superadmin` et `teamManager` respectivement (deux journaux d'audit distincts, pas un seul) | — |

`payment-api` et `notification-api` ont leur propre base, hors de `foot`
(`notification-api` ne lit `foot` qu'en lecture seule, via
`DIRECTORY_DB_*`, pour résoudre les destinataires d'un envoi groupé) — pas
listés ci-dessus.

## Point d'attention : `Card` a deux écrivains

Contrairement au reste de la matrice, `Card` n'a pas un seul propriétaire :
`teamManager` y écrit depuis son module discipline (carton administratif,
a posteriori), et `matchsheet` y écrit en direct pendant le live du match
(carton saisi pendant le match, voir `matchsheet/README.md` : « Les cartons
enregistrés ici écrivent directement dans la table `Card` partagée : ils
sont immédiatement visibles dans le module discipline de `teamManager` »).
C'est un choix produit assumé (source unique de vérité pour les cartons,
peu importe qui les saisit), mais ça veut dire concrètement :

- toute évolution du schéma de `Card` (colonne ajoutée/renommée/supprimée)
  doit être validée côté `teamManager` **et** `matchsheet`, jamais l'un
  sans l'autre ;
- un futur conflit d'écriture concurrente (ex. correction manuelle dans
  `teamManager` pendant qu'un match est en direct sur `matchsheet`) n'est
  géré par aucun verrou aujourd'hui — à surveiller si ce cas se produit en
  pratique.

## Point d'attention : `matches.status` — la machine d'état commune du match

`matches.status` (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) existe
déjà dans le schéma (voir `db/foot.sql`) et est déjà lu par trois apps :
`ob` (filtre les matchs « à venir » vs « résultats », calcule le classement
à partir des matchs `FINISHED`), `billetterie` (n'autorise l'achat que sur
`UPCOMING`/`IN_PROGRESS`), `teamManager` (verrouille la composition une
fois le match `FINISHED`/`CANCELLED`). **Vérifié : avant ce correctif,
aucune app n'écrivait jamais cette colonne** — `superadmin`/`arbinote` ne
la déclarent même pas dans leur entité `Match`, et aucun `.save()`/
`.update()` dessus n'existait ailleurs. Conséquence concrète : chaque
match restait `UPCOMING` pour toujours (confirmé dans `db/foot.sql`, où
100 % des lignes du dump sont `UPCOMING`), ce qui rendait silencieusement
vides en permanence la page résultats et le classement d'`ob`
(`PublicMatchService`/`PublicStandingsService` filtrent sur `FINISHED`,
qui n'arrivait jamais).

Corrigé : `matchsheet` (seule app qui sait, avec certitude, quand un match
démarre et finit réellement — pas une estimation basée sur la date
programmée) répercute désormais le statut de sa feuille de match sur
`matches.status` à deux moments (`SheetService.mirrorMatchStatus`,
voir `matchsheet/src/services/SheetService.ts`) :

- feuille → `IN_PROGRESS` (coup d'envoi confirmé) ⇒ `matches.status = 'IN_PROGRESS'` ;
- feuille → `CLOSED` (clôture après-match) ⇒ `matches.status = 'FINISHED'`.

**Non traité, volontairement** : `CANCELLED` reste un état défini dans le
schéma mais qu'aucune app ne permet de déclencher — annuler un match est
une décision de `superadmin` (référentiel), pas de `matchsheet`, et
construire cet écran est une nouvelle fonctionnalité produit (qui prévient
qui, un match peut-il être réactivé, etc.), pas une simple correction de
câblage manquant comme le point ci-dessus. À faire séparément si le besoin
se confirme.

## Ce que ce document corrige

`arbinote` et `superadmin` déclarent toutes les deux des entités TypeORM
complètes pour `federations`/`ligues`/`saisons`/`journees`/`teams`/`matches`/
`arbitres`/`votes`, et ont chacune leur propre copie, fichier pour fichier,
des mêmes migrations historiques (`arbinote/mysql/*.sql` ≈
`superadmin/mysql/*.sql`). En pratique, `arbinote` n'a **aucune route
d'écriture** sur ces tables référentielles (vérifié : aucun `.save()`/
`.update()`/`.delete()` sur `Federation`/`League`/`Team` dans
`arbinote/src/app/api`) — ses entités ne servent qu'à lire/joindre ces
tables depuis ses propres écrans (vote, classement). `superadmin` est donc
la seule source de vérité réelle pour ce domaine ; les entités d'`arbinote`
sont un résidu de l'époque où `superadmin` n'existait pas encore comme app
séparée. Ne pas les prendre comme un signal qu'`arbinote` peut/doit écrire
ce référentiel.

**Non traité ici, à faire séparément si jugé utile** : consolider les
migrations dupliquées (`arbinote/mysql/*.sql` vs `superadmin/mysql/*.sql`)
vers un seul emplacement canonique. Risque réel si fait sans précaution :
`arbinote` pourrait s'appuyer sur ses propres fichiers pour bootstrapper un
environnement local isolé de la base partagée — à vérifier avant de
supprimer quoi que ce soit.

## Processus de migration

Aucun outil de migration commun n'existe (chaque app a son propre dossier
`sql/`/`migrations/`/`mysql/` avec des scripts `.sql` bruts, appliqués à la
main). En attendant un vrai outil (ex. un migrateur unique par-dessus la
base partagée), les règles suivantes s'appliquent dès maintenant :

1. **Une migration touchant une table qui n'appartient pas à l'app qui la
   modifie doit être revue par l'app propriétaire** (voir la matrice
   ci-dessus) avant d'être appliquée — en particulier `teams`, `matches`,
   `federations`/`ligues`/`saisons`/`journees` (propriété `superadmin`) et
   `Card` (double écrivain, voir plus haut).
2. **Jamais `synchronize: true` contre la base partagée.** Déjà respecté
   partout aujourd'hui (`synchronize: false` dans les 7 apps, vérifié dans
   chaque `src/lib/db.ts`/`database.ts`) — les seules occurrences de
   `synchronize: true` du dépôt sont dans des `test/testDataSource.ts`
   pointant vers une base SQLite en mémoire, jamais vers `foot`. À
   maintenir : toute nouvelle app qui rejoint la base partagée doit partir
   de `synchronize: false` dès le premier commit.
3. **Migrations toujours additives et idempotentes** (`ADD COLUMN IF NOT
   EXISTS` ou vérification préalable, `CREATE TABLE IF NOT EXISTS`) — c'est
   déjà la pratique dans les scripts existants (voir le correctif
   `Card.period` de `start.sh`, qui vérifie la colonne avant de l'ajouter).
   Une migration qui renomme ou supprime une colonne lue par une autre app
   casse cette app silencieusement (elle continue de démarrer, mais ses
   requêtes sur cette colonne échouent) : à traiter comme un changement
   cross-app, jamais comme un détail interne.
4. **Backup avant toute migration en production** — voir la limite déjà
   notée dans `avancement.md` § 3.D (« Observabilité ») : aucune stratégie
   de sauvegarde documentée aujourd'hui au-delà du volume Docker local, ce
   qui rend ce point théorique tant que ce chantier n'est pas fait.
5. **Un `CHANGELOG` par domaine plutôt que par app** serait l'évolution
   naturelle une fois plusieurs apps modifient réellement le même domaine
   en parallèle — pas nécessaire tant que la matrice ci-dessus reste à peu
   près stable (un seul écrivain par domaine, sauf `Card`).
