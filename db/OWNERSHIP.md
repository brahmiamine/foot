# Propriété des tables et processus de migration — base partagée `foot`

Ce document répond à un manque identifié dans `avancement.md` (rang 3) :
7 applications (`referee-center`, `match-operations`, `federation-hub`, `club-hub`, `identity`,
`club-ob`, `seller-portal`) lisent et/ou écrivent la même base MariaDB `foot`
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
sans avoir de route qui écrit dessus (c'est le cas d'`referee-center`, voir plus
bas) : la colonne « Source de vérité » reflète les droits, pas la simple
présence d'une entité.

## Matrice de propriété

| Domaine | Tables | Source de vérité | Lecture seule |
|---|---|---|---|
| Fédérations / ligues / saisons / journées | `federations`, `ligues`, `saisons`, `journees` | `federation-hub` | `referee-center`, `match-operations`, `club-ob`, `club-hub` |
| Équipes / clubs (référentiel) | `teams` | `federation-hub` (CRUD complet) | `referee-center`, `match-operations`, `club-ob`, `identity`, `seller-portal`, `ticketing` |
| Fiche du club connecté (paramètres, branding) | `teams` (sa propre ligne, `WHERE id = teamId`), `team_branding` | `club-hub` (sa ligne), `federation-hub` (branding, toutes lignes) | `seller-portal` |
| Matchs — référentiel (équipes, date, score, arbitre) | `matches` (hors `status`, voir ligne suivante) | `federation-hub` (création/programmation) | `referee-center`, `match-operations`, `club-ob`, `ticketing`, `club-hub` (lecture pour préparation) |
| Matchs — statut opérationnel (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) | `matches.status` | `match-operations` (`IN_PROGRESS`/`FINISHED`, seul à savoir avec certitude quand un match démarre/finit réellement) ; `federation-hub` (`CANCELLED` uniquement, voir alerte ci-dessous) | `club-ob` (résultats, classement), `ticketing` (fenêtre de vente + refus d'achat sur `CANCELLED`), `club-hub` (formations) |
| Arbitrage : arbitres, votes, alertes, critères | `arbitres`, `votes`, `vote_alerts`, `critere_definitions` | `referee-center` | `federation-hub` (consultation) |
| Comptes et sessions | `User`, `member_team_affiliations`, `password_reset_tokens`, `security_events`, `staff_invitations` | `identity` (authentification, `SUPERADMIN`/`MEMBER`) ; `federation-hub` (provisioning des comptes club `ADMIN`/`OBSERVATEUR` uniquement — voir alerte ci-dessous) | `referee-center`, `club-hub` (lecture/jointures) |
| Effectif / discipline club | `Player`, `CardReason`, `Suspension`, `Fine`, `Note` | `club-hub` | `match-operations`, `club-ob` (lecture) ; `referee-center`, `federation-hub` (lecture de `Player` uniquement — noms de joueurs dans le fil des faits de match) |
| **Cartons (`Card`) — écriture partagée, voir alerte ci-dessous** | `Card` | `club-hub` **et** `match-operations` | `club-ob` (lecture) ; `referee-center`, `federation-hub` (lecture, fil des faits de match — club-hub la lit déjà en écrivain) |
| Compositions d'équipe | `cms_match_lineups` | `club-hub` | `match-operations` (lecture, verrouillage au coup d'envoi) |
| Feuille de match électronique | `ms_sheets`, `ms_signatures`, `ms_goals`, `ms_injuries`, `ms_substitutions`, `ms_reservations`, `ms_match_officials`, `ms_player_controls` | `match-operations` | `club-ob` (lecture : buts/cartons/blessures/remplacements pour le live) ; `referee-center`, `federation-hub`, `club-hub` (lecture : `ms_goals`/`ms_injuries`/`ms_substitutions`, fil des faits de match affiché en timeline sur la fiche match / liste des matchs — voir MatchFactsService de chaque app) |
| Contenu club (actus, médias, académie, staff, historique…) | `cms_*` (~35 tables, préfixe `cms_`) | `club-hub` | `club-ob` (lecture, sous-ensemble public) |
| Boutique / sponsors (legacy `club-hub`) | `cms_products`, `cms_sponsors`, `shop_*` | `club-hub` | `club-ob` (lecture) |
| Billetterie — catégories et règles | `tk_ticket_categories`, `tk_match_ticket_categories`, `tk_ticket_sale_rules` | `club-hub` (`/admin/ticketing`) | `ticketing` (lecture) |
| Billetterie — achats et contrôle | `tk_tickets`, `tk_ticket_scans` | `ticketing` | — |
| Marketplace vendeur | `sp_*` (préfixe `sp_`) | `seller-portal` | — |
| Audit | `audit_logs` (arbitrage), `AuditLog` (`club-hub`) | `referee-center`/`federation-hub` et `club-hub` respectivement (deux journaux d'audit distincts, pas un seul) | — |
| Saga d'annulation/report de match (TASK-P0-003) | `match_saga_cases`, `match_saga_steps` | `federation-hub` | — |
| Remboursement de billets sur match annulé (TASK-P0-003) | `tk_match_cancellation_refunds` | `ticketing` | — |

`payments` et `notifications` ont leur propre base, hors de `foot`
(`notifications` ne lit `foot` qu'en lecture seule, via
`DIRECTORY_DB_*`, pour résoudre les destinataires d'un envoi groupé) — pas
listés ci-dessus.

## Point d'attention : `Card` a deux écrivains

Contrairement au reste de la matrice, `Card` n'a pas un seul propriétaire :
`club-hub` y écrit depuis son module discipline (carton administratif,
a posteriori), et `match-operations` y écrit en direct pendant le live du match
(carton saisi pendant le match, voir `match-operations/README.md` : « Les cartons
enregistrés ici écrivent directement dans la table `Card` partagée : ils
sont immédiatement visibles dans le module discipline de `club-hub` »).
C'est un choix produit assumé (source unique de vérité pour les cartons,
peu importe qui les saisit), mais ça veut dire concrètement :

- toute évolution du schéma de `Card` (colonne ajoutée/renommée/supprimée)
  doit être validée côté `club-hub` **et** `match-operations`, jamais l'un
  sans l'autre ;
- un futur conflit d'écriture concurrente (ex. correction manuelle dans
  `club-hub` pendant qu'un match est en direct sur `match-operations`) n'est
  géré par aucun verrou aujourd'hui — à surveiller si ce cas se produit en
  pratique.

## Point d'attention : `matches.status` — la machine d'état commune du match

`matches.status` (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) existe
déjà dans le schéma (voir `db/foot.sql`) et est déjà lu par trois apps :
`club-ob` (filtre les matchs « à venir » vs « résultats », calcule le classement
à partir des matchs `FINISHED`), `ticketing` (n'autorise l'achat que sur
`UPCOMING`/`IN_PROGRESS`), `club-hub` (verrouille la composition une
fois le match `FINISHED`/`CANCELLED`). **Vérifié : avant ce correctif,
aucune app n'écrivait jamais cette colonne** — `federation-hub`/`referee-center` ne
la déclarent même pas dans leur entité `Match`, et aucun `.save()`/
`.update()` dessus n'existait ailleurs. Conséquence concrète : chaque
match restait `UPCOMING` pour toujours (confirmé dans `db/foot.sql`, où
100 % des lignes du dump sont `UPCOMING`), ce qui rendait silencieusement
vides en permanence la page résultats et le classement d'`club-ob`
(`PublicMatchService`/`PublicStandingsService` filtrent sur `FINISHED`,
qui n'arrivait jamais).

Corrigé : `match-operations` (seule app qui sait, avec certitude, quand un match
démarre et finit réellement — pas une estimation basée sur la date
programmée) répercute désormais le statut de sa feuille de match sur
`matches.status` à deux moments (`SheetService.mirrorMatchStatus`,
voir `match-operations/src/services/SheetService.ts`) :

- feuille → `IN_PROGRESS` (coup d'envoi confirmé) ⇒ `matches.status = 'IN_PROGRESS'` ;
- feuille → `CLOSED` (clôture après-match) ⇒ `matches.status = 'FINISHED'`.

**Corrigé** : `federation-hub` peut désormais déclencher `CANCELLED`
(`POST /api/admin/matches/[id]/cancel`, motif obligatoire, restreint aux
matchs `UPCOMING` — voir `cancelMatchAdmin` dans `federation-hub/src/lib/adminMatches.ts`),
notifie les deux clubs (`notify()`, même client que `MATCH_CREATED`/
`MATCH_RESCHEDULED`) et journalise l'action dans `/admin/audit`.
`match-operations` ne peut plus écraser un match `CANCELLED` par
`IN_PROGRESS`/`FINISHED` (`mirrorMatchStatus` exclut désormais
`status = 'CANCELLED'` de sa condition de mise à jour) — un match annulé
reste annulé même si sa feuille de match progresse encore côté opérateur.
`ticketing` refuse désormais l'achat sur un match `CANCELLED`
(`purchaseTickets`, `getMatchDetail`), en plus du filtre déjà en place sur
les listes (`listOpenMatches`).

**Mis à jour (TASK-P0-003, todo.md)** : l'annulation déclenche désormais un
véritable workflow multi-étapes, journalisé — `matches.status` bascule
toujours en premier et de façon inconditionnelle (rien côté saga ne peut
la retarder ou l'empêcher), puis `federation-hub` appelle en HTTP `ticketing`
(fermeture de la vente + ouverture d'un dossier de remboursement pour
chaque paiement déjà `PAID` sur ce match) et `club-hub` (annulation, non
destructive, des convocations de ce match) — voir `MatchSagaCase`/
`MatchSagaStep` dans `federation-hub/src/lib/matchSaga.ts`. `match-operations` bloque
lui-même toute saisie live sur un match `CANCELLED`
(`sheetGuard.ts#assertSheetEditable`) sans appel réseau (table `matches`
partagée) ; `referee-center` n'a nécessité aucun changement, son garde-fou de
vote existant excluait déjà `CANCELLED`. Un échec d'étape (ticketing/
club-hub indisponibles) laisse un dossier `MANUAL_REVIEW` — rejouable
par un opérateur (`POST /api/admin/match-sagas/:id/retry`) ou convergé
indépendamment par le scheduler autonome de chaque app concernée (10 min,
relit `matches.status` directement).

**Volontairement pas fait** : aucune réactivation possible depuis cette
action (`CANCELLED` est un état terminal du point de vue de cette action) ;
le **report** de match (`MATCH_RESCHEDULED`) n'a pas de saga équivalente —
seule la notification préexistante aux deux clubs subsiste, sans politique
de validité des billets configurable côté ticketing (voir todo.md,
TASK-P0-003 § Reste ouvert).

## Point d'attention : `federation-hub` écrit `User` pour les comptes club (`ADMIN`/`OBSERVATEUR`)

Découvert en construisant l'invitation staff en 2 temps (avancement.md,
"Invitation club (staff)") : `federation-hub/src/lib/clubAccounts.ts` écrit
directement dans `User` depuis longtemps (`/admin/club/[teamId]`, création/
désactivation/réinitialisation de mot de passe des comptes `ADMIN`/
`OBSERVATEUR`) — la ligne de ce document classait pourtant `federation-hub` en
« lecture/jointures » uniquement sur ce domaine. Corrigé ci-dessus : la
répartition réelle est `identity` pour l'authentification et les comptes
`SUPERADMIN`/`MEMBER`, `federation-hub` pour le provisioning des comptes club
`ADMIN`/`OBSERVATEUR` (jamais l'inverse — `identity` ne crée jamais de compte
`ADMIN`/`OBSERVATEUR`, `federation-hub` ne touche jamais un compte `SUPERADMIN`/
`MEMBER`). Pas de conflit d'écriture réel : les deux apps écrivent des
sous-ensembles de lignes disjoints de la même table, jamais la même ligne.

**Corrigé au passage** : la création d'un compte club exigeait jusqu'ici que
`federation-hub` choisisse lui-même le mot de passe (visible en clair côté
formulaire admin, à communiquer hors plateforme). Remplacé par une
invitation par email à usage unique (`staff_invitations`, table propre à
`federation-hub`, même pattern `token_hash` SHA-256 que `password_reset_tokens`
côté `identity`) : `federation-hub` ne connaît plus jamais le mot de passe d'un
compte club, le destinataire le choisit lui-même en acceptant l'invitation
(`federation-hub/src/app/invite/[token]`). La réinitialisation d'un mot de
passe existant (compte déjà créé, admin dépanne un utilisateur bloqué)
reste inchangée — cas différent, toujours géré directement.

## Ce que ce document corrige

`referee-center` et `federation-hub` déclarent toutes les deux des entités TypeORM
complètes pour `federations`/`ligues`/`saisons`/`journees`/`teams`/`matches`/
`arbitres`/`votes`, et ont chacune leur propre copie, fichier pour fichier,
des mêmes migrations historiques (`referee-center/mysql/*.sql` ≈
`federation-hub/mysql/*.sql`). En pratique, `referee-center` n'a **aucune route
d'écriture** sur ces tables référentielles (vérifié : aucun `.save()`/
`.update()`/`.delete()` sur `Federation`/`League`/`Team` dans
`referee-center/src/app/api`) — ses entités ne servent qu'à lire/joindre ces
tables depuis ses propres écrans (vote, classement). `federation-hub` est donc
la seule source de vérité réelle pour ce domaine ; les entités d'`referee-center`
sont un résidu de l'époque où `federation-hub` n'existait pas encore comme app
séparée. Ne pas les prendre comme un signal qu'`referee-center` peut/doit écrire
ce référentiel.

**Non traité ici, à faire séparément si jugé utile** : consolider les
migrations dupliquées (`referee-center/mysql/*.sql` vs `federation-hub/mysql/*.sql`)
vers un seul emplacement canonique. Risque réel si fait sans précaution :
`referee-center` pourrait s'appuyer sur ses propres fichiers pour bootstrapper un
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
   `federations`/`ligues`/`saisons`/`journees` (propriété `federation-hub`) et
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

### Procédure explicite — ticketing et marketplace

- **Billetterie (`tk_*`)** : le script est ajouté dans `ticketing/sql` et
  doit être revu par `ticketing` (achats/contrôle) ainsi que par
  `club-hub` si catégories ou règles de vente sont touchées. Toute
  évolution qui référence `matches`, `teams` ou `User` requiert aussi la revue
  de leurs propriétaires indiqués dans la matrice. Appliquer d'abord une
  migration additive compatible avec les deux applications, déployer les
  lecteurs/écrivains, puis seulement retirer un ancien champ dans une migration
  ultérieure validée par tous.
- **Marketplace (`sp_*`)** : `seller-portal` est propriétaire et place le script
  dans `seller-portal/sql`. Tant que ces tables vivent dans `foot`, toute clé ou
  jointure vers `teams` doit être revue par `federation-hub`, propriétaire du
  référentiel. Une future extraction vers une base de Marketplace API suit le
  même ordre (schéma compatible, double lecture/écriture ou backfill contrôlé,
  bascule, puis suppression) et ne doit jamais être réalisée par simple
  déplacement ou renommage destructif des tables.
