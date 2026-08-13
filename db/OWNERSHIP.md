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
| Matchs — statut opérationnel (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) | `matches.status` | `matchsheet` (`IN_PROGRESS`/`FINISHED`, seul à savoir avec certitude quand un match démarre/finit réellement) ; `superadmin` (`CANCELLED` uniquement, voir alerte ci-dessous) | `ob` (résultats, classement), `billetterie` (fenêtre de vente + refus d'achat sur `CANCELLED`), `teamManager` (formations) |
| Arbitrage : arbitres, votes, alertes, critères | `arbitres`, `votes`, `vote_alerts`, `critere_definitions` | `arbinote` | `superadmin` (consultation) |
| Comptes et sessions | `User`, `member_team_affiliations`, `password_reset_tokens`, `security_events`, `staff_invitations` | `sso` (authentification, `SUPERADMIN`/`MEMBER`) ; `superadmin` (provisioning des comptes club `ADMIN`/`OBSERVATEUR` uniquement — voir alerte ci-dessous) | `arbinote`, `teamManager` (lecture/jointures) |
| **Effectif (`Player`) — écriture partagée, voir alerte ci-dessous** | `Player` | `teamManager` **et** `superadmin` (`Player.teamId` uniquement, module transferts — voir `/admin/players`) | `matchsheet`, `ob` (lecture) ; `arbinote` (lecture, fil des faits de match) |
| Discipline club | `CardReason`, `Suspension`, `Fine`, `Note` | `teamManager` | `matchsheet`, `ob` (lecture) |
| Transferts de joueurs | `player_transfers` | `superadmin` (`/admin/players`) | — |
| **Cartons (`Card`) — écriture partagée, voir alerte ci-dessous** | `Card` | `teamManager` **et** `matchsheet` | `ob` (lecture) ; `arbinote`, `superadmin` (lecture, fil des faits de match — teamManager la lit déjà en écrivain) |
| Compositions d'équipe | `cms_match_lineups` | `teamManager` | `matchsheet` (lecture, verrouillage au coup d'envoi) |
| Feuille de match électronique | `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`, `ms_match_officials`, `ms_player_controls` | `matchsheet` | `ob` (lecture : buts/cartons/blessures/remplacements pour le live) ; `arbinote`, `superadmin`, `teamManager` (lecture : `ms_goals`/`ms_injuries`/`ms_substitutions`, fil des faits de match affiché en timeline sur la fiche match / liste des matchs — voir MatchFactsService de chaque app) |
| Contenu club (actus, médias, académie, staff, historique…) | `cms_*` (~35 tables, préfixe `cms_`) | `teamManager` | `ob` (lecture, sous-ensemble public) |
| Boutique / sponsors (legacy `teamManager`) | `cms_products`, `cms_sponsors`, `shop_*` | `teamManager` | `ob` (lecture) |
| Billetterie — catégories et règles | `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules` | `teamManager` (`/admin/billetterie`) | `billetterie` (lecture) |
| Billetterie — achats et contrôle | `tk_tickets`, `tk_ticket_scans` | `billetterie` | — |
| Abonnements de saison — catégories | `tk_subscription_categories` | `teamManager` (`/admin/billetterie/subscriptions` — nom/prix/couleur/fenêtre de validité) | `billetterie` (lecture, vente) |
| Abonnements de saison — achats et contrôle | `tk_subscriptions`, `tk_subscription_scans` | `billetterie` | `teamManager` (lecture de `tk_subscriptions` uniquement, roster des abonnés du club — jamais `tk_subscription_scans`) |
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

## Point d'attention : `Player` a deux écrivains (module transferts)

Même situation que `Card`, en plus étroit : `teamManager` reste le seul
propriétaire de la fiche joueur (nom, poste, licence, statut, photo...),
mais `superadmin` écrit désormais `Player.teamId` depuis son module
transferts (`/admin/players`, voir `lib/adminPlayerTransfers.ts`) — jamais
une autre colonne. Un transfert est une opération administrative centrale
(la fédération enregistre officiellement le changement de club d'un
joueur), distincte de la gestion quotidienne de l'effectif qui reste dans
teamManager. Chaque transfert est journalisé dans `player_transfers`
(propriété `superadmin`, jamais touchée par `teamManager`) et notifie les
deux clubs via `notification-api`. Conséquences concrètes :

- toute évolution du schéma de `Player` doit rester validée côté
  `teamManager` **et** `superadmin`, même si `superadmin` n'en écrit qu'une
  seule colonne ;
- un conflit d'écriture concurrente (édition de fiche joueur dans
  teamManager pendant qu'un transfert est en cours côté superadmin) n'est
  géré par aucun verrou aujourd'hui, même limitation que pour `Card`.

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

**Corrigé** : `superadmin` peut désormais déclencher `CANCELLED`
(`POST /api/admin/matches/[id]/cancel`, motif obligatoire, restreint aux
matchs `UPCOMING` — voir `cancelMatchAdmin` dans `superadmin/src/lib/adminMatches.ts`),
notifie les deux clubs (`notify()`, même client que `MATCH_CREATED`/
`MATCH_RESCHEDULED`) et journalise l'action dans `/admin/audit`.
`matchsheet` ne peut plus écraser un match `CANCELLED` par
`IN_PROGRESS`/`FINISHED` (`mirrorMatchStatus` exclut désormais
`status = 'CANCELLED'` de sa condition de mise à jour) — un match annulé
reste annulé même si sa feuille de match progresse encore côté opérateur.
`billetterie` refuse désormais l'achat sur un match `CANCELLED`
(`purchaseTickets`, `getMatchDetail`), en plus du filtre déjà en place sur
les listes (`listOpenMatches`).

**Volontairement pas fait** : aucune réactivation possible depuis cette
action (`CANCELLED` est un état terminal du point de vue de cette action),
et aucun workflow multi-étapes (qui prévient qui au-delà de la notification
aux deux clubs, remboursement des billets déjà vendus côté `billetterie`,
etc.) — annuler reste une action simple, pas un processus métier complet.
À étendre séparément si le besoin se confirme.

## Point d'attention : `superadmin` écrit `User` pour les comptes club (`ADMIN`/`OBSERVATEUR`)

Découvert en construisant l'invitation staff en 2 temps (avancement.md,
"Invitation club (staff)") : `superadmin/src/lib/clubAccounts.ts` écrit
directement dans `User` depuis longtemps (`/admin/club/[teamId]`, création/
désactivation/réinitialisation de mot de passe des comptes `ADMIN`/
`OBSERVATEUR`) — la ligne de ce document classait pourtant `superadmin` en
« lecture/jointures » uniquement sur ce domaine. Corrigé ci-dessus : la
répartition réelle est `sso` pour l'authentification et les comptes
`SUPERADMIN`/`MEMBER`, `superadmin` pour le provisioning des comptes club
`ADMIN`/`OBSERVATEUR` (jamais l'inverse — `sso` ne crée jamais de compte
`ADMIN`/`OBSERVATEUR`, `superadmin` ne touche jamais un compte `SUPERADMIN`/
`MEMBER`). Pas de conflit d'écriture réel : les deux apps écrivent des
sous-ensembles de lignes disjoints de la même table, jamais la même ligne.

**Corrigé au passage** : la création d'un compte club exigeait jusqu'ici que
`superadmin` choisisse lui-même le mot de passe (visible en clair côté
formulaire admin, à communiquer hors plateforme). Remplacé par une
invitation par email à usage unique (`staff_invitations`, table propre à
`superadmin`, même pattern `token_hash` SHA-256 que `password_reset_tokens`
côté `sso`) : `superadmin` ne connaît plus jamais le mot de passe d'un
compte club, le destinataire le choisit lui-même en acceptant l'invitation
(`superadmin/src/app/invite/[token]`). La réinitialisation d'un mot de
passe existant (compte déjà créé, admin dépanne un utilisateur bloqué)
reste inchangée — cas différent, toujours géré directement.

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

### Procédure explicite — billetterie et marketplace

- **Billetterie (`tk_*`)** : le script est ajouté dans `billetterie/sql` et
  doit être revu par `billetterie` (achats/contrôle) ainsi que par
  `teamManager` si catégories ou règles de vente sont touchées. Toute
  évolution qui référence `matches`, `teams` ou `User` requiert aussi la revue
  de leurs propriétaires indiqués dans la matrice. Appliquer d'abord une
  migration additive compatible avec les deux applications, déployer les
  lecteurs/écrivains, puis seulement retirer un ancien champ dans une migration
  ultérieure validée par tous.
- **Marketplace (`sp_*`)** : `sellerPortal` est propriétaire et place le script
  dans `sellerPortal/sql`. Tant que ces tables vivent dans `foot`, toute clé ou
  jointure vers `teams` doit être revue par `superadmin`, propriétaire du
  référentiel. Une future extraction vers une base de Marketplace API suit le
  même ordre (schéma compatible, double lecture/écriture ou backfill contrôlé,
  bascule, puis suppression) et ne doit jamais être réalisée par simple
  déplacement ou renommage destructif des tables.
