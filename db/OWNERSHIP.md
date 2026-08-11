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
| Mapping API-Football (équipes/matchs) et synchro live | `teams.api_football_id`, `matches.api_football_fixture_id` (`score_home`/`score_away` de la ligne ci-dessus, mis à jour par le job de synchro sur les matchs mappés) | `superadmin` (écran `/admin/api-football` + job `GET/POST /api/cron/live-scores`) | — |
| Matchs — statut opérationnel (`UPCOMING`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`) | `matches.status` | `matchsheet` (seul à savoir, avec certitude, quand un match démarre/finit réellement — voir alerte ci-dessous) | `ob` (résultats, classement), `billetterie` (fenêtre de vente), `teamManager` (formations) |
| Arbitrage : arbitres, votes, alertes, critères | `arbitres`, `votes`, `vote_alerts`, `critere_definitions` | `arbinote` | `superadmin` (consultation) |
| Comptes et sessions | `User`, `member_team_affiliations`, `password_reset_tokens` | `sso` | `arbinote`, `superadmin`, `teamManager` (lecture/jointures) |
| Journal de sécurité (authentification) | `security_logs` | `sso` | — |
| Invitation club (staff) en 2 temps | `club_invitations` | `sso` | — |
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
- ~~un futur conflit d'écriture concurrente... n'est géré par aucun verrou
  aujourd'hui~~ — **corrigé** : une contrainte unique `Card(playerId,
  matchId, type)` (voir `start.sh`, bloc idempotent après `Card.period`)
  empêche désormais deux insertions concurrentes pour le même joueur/match/
  type de créer un doublon, que ce soit une vraie course entre les deux
  écrivains ou un double clic/retry réseau côté client. `CardService`
  (`teamManager`) et `CardEventService` (`matchsheet`) traduisent la
  violation de contrainte SQL (`ER_DUP_ENTRY`) en `DuplicateCardError`
  plutôt que de laisser planter la requête. Un verrou applicatif
  (`SELECT ... FOR UPDATE`) n'aurait pas suffi ici : sur une première
  insertion (aucune ligne existante à verrouiller), il ne protège pas
  contre la « phantom row » — seule une contrainte au niveau de la base,
  imposée par MariaDB indépendamment du process qui écrit, ferme réellement
  la course entre deux apps distinctes.

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

## Point d'attention : `security_logs` n'est pas `audit_logs`/`AuditLog`

`sso` a désormais son propre journal (`security_logs`, entité `SecurityLog`)
pour les événements d'authentification (login échoué, rate limit, jeton
invalide/expiré, mot de passe oublié demandé, MFA activée/désactivée/code
invalide, révocation de session — voir `sso/src/lib/securityLog.ts`). C'est
un journal différent des `audit_logs` (`arbinote`/`superadmin`, actions de
modération/CRUD) et `AuditLog` (`teamManager`, actions d'administration
métier du club) : même s'ils se ressemblent, ce ne sont pas trois vues du
même concept — `security_logs` journalise des événements *d'authentification*
transverses à `sso`, pas des actions métier propres à chaque app. Ne pas les
fusionner sans revoir les trois domaines ensemble.

## Point d'attention : invitation club — émission dans `sso`, pas dans `teamManager`

`teamManager/admin/users` (écran « Utilisateurs du club ») reste l'endroit
où le président d'un club (`ADMIN`) crée un compte `User` en lui choisissant
lui-même un mot de passe (`UserService.create`) — ce flux existant n'a pas
été modifié. L'invitation en 2 temps (`club_invitations`, voir
`sso/src/lib/clubInvitations.ts`) est un flux différent, complémentaire, pas
un remplacement : la personne invitée choisit elle-même son mot de passe en
ouvrant un lien email à usage unique, comme pour la réinitialisation de mot
de passe. Émission et rédemption du jeton vivent entièrement dans `sso`
(seule app propriétaire de `User`) : `sso/admin/invitations` (déclencheur,
réservé à `SUPERADMIN`/`ADMIN`) et `sso/invitation` (rédemption, page
publique protégée par le jeton). Pas de trigger UI ajouté côté
`teamManager` dans cette itération — l'écran `sso/admin/invitations` suffit
et évite un appel réseau cross-app depuis une Server Action `teamManager`
vers `sso` ; à réévaluer si l'expérience « tout dans `teamManager` » devient
un besoin produit confirmé.

## Point d'attention : synchro live API-Football (`superadmin`) et `matchsheet`

`superadmin` a désormais un job de synchro (`GET`/`POST
/api/cron/live-scores`, voir `superadmin/src/lib/liveScoreSync.ts`) qui
interroge API-Football pour les matchs explicitement mappés par un
opérateur (`matches.api_football_fixture_id` renseigné depuis l'écran
`/admin/api-football`) et met à jour `matches.score_home`/`score_away` —
des colonnes déjà possédées par `superadmin` (voir ligne « Matchs —
référentiel » ci-dessus), pas une nouvelle propriété. **Ce job n'écrit
jamais `matches.status`** : cette colonne reste exclusivement pilotée par
`matchsheet` (`SheetService.mirrorMatchStatus`, voir ci-dessus), aucune
exception.

Pour ne jamais concurrencer `matchsheet` sur un match qu'il couvre déjà en
direct, le job lit (en lecture seule, `dataSource.query` brut, aucune
entité déclarée côté `superadmin`) la table `ms_sheets` avant de
synchroniser un match : s'il existe une ligne `ms_sheets` pour ce
`match_id` avec un `status` différent de `CLOSED`, le match est ignoré
(`matchsheet` est en train de le couvrir ou va le couvrir, c'est lui la
source de vérité). Le job ne synchronise donc que les matchs :

- explicitement mappés à un `fixture_id` API-Football (jamais de
  rapprochement automatique par nom/date) ;
- sans feuille de match `matchsheet` active (pas de ligne `ms_sheets`, ou
  une ligne déjà `CLOSED`) — typiquement les matchs à l'extérieur ou d'une
  autre compétition que le kiosque de ce club ne couvre jamais.

C'est un lecteur supplémentaire de `ms_sheets` (aux côtés d'`ob`, voir la
ligne « Feuille de match électronique » ci-dessus), jamais un écrivain.
Si `matchsheet` renomme/supprime un jour la colonne `ms_sheets.status` ou
la sémantique de `CLOSED`, ce job doit être revu en même temps (même règle
que le reste de ce document : toute évolution d'une table lue par une
autre app est un changement cross-app, voir « Processus de migration »
ci-dessous).

Le job est sans effet si `API_FOOTBALL_KEY` n'est pas configuré (log +
réponse `inactive`, aucun appel réseau ni écriture) et refuse toute requête
sans `LIVE_SCORE_SYNC_SECRET` correctement présenté (401) — voir
`superadmin/.env.example`. Aucun process Node planificateur n'est ajouté à
ce dépôt : comme pour le monitoring/alerting externe (voir `avancement.md`
§ « Infra cible non branchée »), déclencher cette route à intervalle
régulier est un choix de déploiement (cron système, cron du PaaS…), pas une
responsabilité du code applicatif.

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
