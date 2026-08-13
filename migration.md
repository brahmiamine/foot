# Foot — Évolution vers un modèle Fédération / Ligue / Club

## 0. Suivi de migration

**Statut :** `[ ]` à faire · `[~]` partiel · `[x]` terminé

Ce document sert de source de vérité pour le suivi de ce chantier. Les travaux de finalisation sont regroupés dans la branche `agent/finish-federation-migration` et la Draft PR [#65](https://github.com/brahmiamine/foot/pull/65). La PR reste en Draft jusqu'à fermeture des points ouverts et validation des checks CI.

| Phase | Contenu | Statut |
|---|---|---|
| Phase 1 | Modèle d'autorisation (rôles `PLATFORM_SUPERADMIN` / `FEDERATION_ADMIN` / `LEAGUE_ADMIN`, scopes, guards) | `[~]` |
| Phase 2 | Affiliations historiques club ↔ fédération/ligue/saison | `[~]` |
| Phase 3 | Joueurs & transferts (`player_transfers`, workflow, transaction) | `[~]` |
| Phase 4 | Officiels de match (`match_official_assignments`, contrôle serveur `matchsheet`) | `[~]` |
| Phase 5 | ArbiNote officiel (évaluation fédérale séparée du score public) | `[~]` |

**État global (14 août 2026 — Draft PR #65) :** les cinq phases disposent d'une base fonctionnelle. Cette PR ajoute le backfill des affiliations historiques, la pagination réelle des joueurs, le workflow de transfert multi-acteurs avec homologation et notifications, la vérification temporelle des joueurs dans `matchsheet`, les primitives de scope match/ligue et les analytics officielles ArbiNote. Les deux nouvelles migrations sont désormais enregistrées dans `db/migrations.manifest`.

La migration n'est pas encore considérée comme terminée : `LEAGUE_ADMIN` doit encore être branché sur l'ensemble des routes journées/matchs/affectations d'officiels, l'UI des anciens joueurs reste à créer, l'audit IP/User-Agent des affectations/révocations doit être enrichi, et les analytics officielles doivent être exposées par `/stats` avec pagination/recherche des sélecteurs. Les échecs CI qui surviennent dans `actions/setup-node@v4` avant le build doivent être suivis séparément des erreurs de code.

### Bilan priorisé (14 août 2026)

**Terminé dans la Draft PR #65**
1. Backfill idempotent `teams.federation_id → team_affiliations` et enregistrement de la migration dans le manifeste.
2. Pagination backend et UI de `/admin/joueurs`.
3. Workflow `PENDING → APPROVED → COMPLETED` avec approbation/rejet du club destination et homologation fédérale.
4. Transaction atomique sur `cms_team_members` et `Player.teamId`, champs d'audit et notifications `PLAYER_TRANSFER_*`.
5. Vérification temporelle de l'appartenance joueur dans `matchsheet`.
6. Primitives `getMatchLeagueId()` et `listMatchesForLeague()`.
7. Calcul des analytics officielles ArbiNote : évolution chronologique et comparaison par observateur.

**P0 — écarts fonctionnels ou de sécurité restant à fermer**
1. Rendre `LEAGUE_ADMIN` réellement opérationnel sur les journées, matchs et affectations/révocations des officiels, avec tests négatifs cross-ligue.
2. Exposer les analytics officielles ArbiNote sur l'endpoint `/stats` sans mélanger note publique et note officielle.
3. Enrichir l'audit des affectations/révocations d'officiels avec IP et User-Agent.

**P1 — compléments fonctionnels**
4. Ajouter dans `teamManager` la vue « Anciens joueurs » et l'historique d'appartenance en lecture seule.
5. Terminer pagination et recherche des sélecteurs match/arbitre de l'écran officiel ArbiNote.
6. Ajouter les tests d'intégration manquants pour les scopes `LEAGUE_ADMIN` et le contrôle temporel.

**À valider comme choix d'architecture (pas des bugs, mais des décisions à confirmer)**
11. `GET /api/admin/teams`/`/arbitres`/`/saisons`/`/officials` sont ouverts en lecture à tout `FEDERATION_ADMIN` sans filtre par fédération (considérés comme référentiel non sensible) — sur une plateforme réellement multi-fédérations, à revalider : veut-on qu'une fédération voie les clubs/arbitres des autres ?
12. `/admin/teams`/`/admin/matches` (CRUD complet équipe/match, y compris saisons et journées) restent `PLATFORM_SUPERADMIN`-only — cohérent avec le point P0 n°3 ci-dessus (tant que `LEAGUE_ADMIN`/`FEDERATION_ADMIN` n'ont pas de pouvoir réel sur journées/matchs/arbitres, ouvrir ces écrans n'aurait pas de sens) ; **ne pas** lire cette limitation comme "hors périmètre du modèle" — §9 assigne bien ces responsabilités à `LEAGUE_ADMIN`/`FEDERATION_ADMIN`, c'est le P0 n°3 qui doit être traité en premier.
13. Le scope `FEDERATION_ADMIN` du tableau de bord Transferts et de `/joueurs` s'appuie sur l'historique COMPLET d'affiliation (un club qui a quitté la fédération reste visible pour l'historique) — comportement voulu, à confirmer.
14. `PLATFORM_SUPERADMIN` volontairement absent du flux d'invitation self-service (§0) — choix de sécurité assumé, pas un manque.

### Provisioning des comptes `[x]`

Le flux d'invitation staff existant (`superadmin` → email → `sso`, jusqu'ici limité aux comptes club `ADMIN`/`OBSERVATEUR`) est élargi aux rôles cibles : `FEDERATION_ADMIN`, `LEAGUE_ADMIN`, `REFEREE`, `MATCH_OFFICIAL`, `REFEREE_OBSERVER`. `PLATFORM_SUPERADMIN` volontairement absent de ce flux self-service (compte le plus privilégié).

- `superadmin/src/lib/entities/StaffInvitation.ts` : `teamId` devient nullable, `federationId`/`leagueId` ajoutés — exactement un des trois scopes selon le rôle (`teamId` pour ADMIN/OBSERVATEUR, `federationId` pour FEDERATION_ADMIN, `leagueId` pour LEAGUE_ADMIN, aucun pour REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER — leur périmètre réel est vérifié match par match, pas figé à la création du compte). Migration `superadmin/mysql/migration_widen_staff_invitations_scope.sql`.
- `staffInvitations.ts#createInvitation` impose et vérifie le scope requis par le rôle (fédération/ligue/club réellement existante), génère un email adapté au rôle. `acceptInvitation` propage `federationId`/`leagueId` jusqu'à `sso` via `identityClient.ts`.
- `sso/src/lib/identityService.ts` écrit désormais `federationId`/`leagueId` sur `User` à la création (jusqu'ici ces colonnes, ajoutées en Phase 1, n'étaient lues qu'au login — jamais écrites nulle part).
- Nouvelle route `POST /api/admin/staff-invitations` (complète, sans la remplacer, `/api/admin/club/:teamId/invitations` qui reste réservée à ADMIN/OBSERVATEUR) : `FEDERATION_ADMIN` réservé à `PLATFORM_SUPERADMIN` ; `LEAGUE_ADMIN` à `PLATFORM_SUPERADMIN` ou au `FEDERATION_ADMIN` de la fédération RÉELLE de la ligue ciblée ; `REFEREE`/`MATCH_OFFICIAL`/`REFEREE_OBSERVER` à `PLATFORM_SUPERADMIN` ou tout `FEDERATION_ADMIN`.
- Tests : 19 cas `staffInvitations.test.ts` (dont la couverture de `createInvitation`, absente avant ce chantier) + 8 cas de garde (`staff-invitations/route.test.ts`) + 1 cas `sso` (`internal/users/route.test.ts`, propagation `federationId`). `vitest run` + `tsc --noEmit` verts sur `superadmin` (124 tests) et `sso` (79 tests).
- **Écran (13 août 2026, branche `claude/migration-ui-screens-hok3qk`)** : `/admin/staff-invitations` (`AdminStaffInvitationsManager.tsx`) — formulaire d'invitation (rôle, fédération/ligue selon le rôle) + tableau des invitations envoyées (`GET /api/admin/staff-invitations`, nouveau, `listStaffInvitations()` dans `staffInvitations.ts`), statut `PENDING`/`ACCEPTED`/`EXPIRED` calculé côté serveur. Accessible depuis le menu latéral ("Invitations staff").
- **Ouvert à `FEDERATION_ADMIN` (13 août 2026)** : nouveau `getAdminPageSession()` (Server Component, `lib/adminAuth.ts`) remplace `hasAdminSession` sur cette page — un `FEDERATION_ADMIN` peut désormais se connecter et inviter `LEAGUE_ADMIN`/`REFEREE`/`MATCH_OFFICIAL`/`REFEREE_OBSERVER` (l'option `FEDERATION_ADMIN` est masquée côté formulaire pour ce rôle, réservée plateforme côté API). `GET /api/admin/staff-invitations` filtre désormais la liste à sa fédération (`listStaffInvitations(scopeFederationId)`) ; `GET /api/admin/federations`/`/leagues` acceptent aussi `FEDERATION_ADMIN` (nouveau `ensureAdminOrFederationAuth`), filtrés à sa fédération.
- **Reste ouvert** : `PLATFORM_SUPERADMIN` reste hors de ce flux par choix (à provisionner autrement, ex. script `sso/scripts/seed-superadmin.ts` déjà existant).

Détail des sous-tâches par phase, mis à jour au fil de l'implémentation :

### Phase 1 — Modèle d'autorisation `[~]`
- [x] Inspecter les rôles/guards/middlewares existants (`sso`, `superadmin`, `matchsheet`, `teamManager`, `arbinote`, `billetterie`, `ob`) — audit complet, rien dupliqué (rôles stockés en `enum` sur `User.role`, dupliqué en union TS par app ; pas de scope fédéral/ligue existant avant ce chantier).
- [x] Introduire `PLATFORM_SUPERADMIN`, `FEDERATION_ADMIN`, `LEAGUE_ADMIN` dans l'enum `User.role` (migration SQL additive, `sso/sql/migration_add_federation_league_scope.sql`) en conservant `SUPERADMIN`/`ADMIN`/`OBSERVATEUR`/`MEMBER` — `PLATFORM_SUPERADMIN` traité comme un alias strict de `SUPERADMIN` partout (aucun élargissement d'accès).
- [x] Définir les scopes serveur : `federationId`/`leagueId` ajoutés à `User` (colonnes), au JWT (`sso/src/lib/session.ts`, `packages/auth-shared/src/session.ts`) et modélisés dans `packages/auth-shared/src/roles.ts` (`normalizeRole`, `canAccessFederation`, `canAccessLeague`, `canAccessPlatform`) — `teamId`/`matchId` existaient déjà (Phase 4 les exploitera pour `MATCH_OFFICIAL`).
- [x] Ajouter les guards serveur : `superadmin/src/lib/adminAuth.ts` (`ensureFederationAccess`, `ensureLeagueAccess`, `getAdminSession`), branchés sur `federations/route.ts` (POST), `federations/[id]/route.ts` (PUT/DELETE), `leagues/route.ts` (POST), `leagues/[id]/route.ts` (PUT/DELETE) — `ensureAdminAuth` (accès plateforme complet) explicitement **non élargi** à `FEDERATION_ADMIN`/`LEAGUE_ADMIN` pour ne pas leur donner par erreur un accès complet aux ~40 autres routes qui ne font que cette vérification. `matchsheet`/`teamManager`/`arbinote`/`billetterie` : `PLATFORM_SUPERADMIN` reconnu comme alias de `SUPERADMIN` dans leurs middlewares/guards existants (comportement inchangé pour les comptes actuels).
- [x] Tests négatifs : `superadmin/src/lib/roles.test.ts` (24 cas — dont `FEDERATION_ADMIN A` ne peut pas accéder à la fédération B, `LEAGUE_ADMIN X` ne peut pas accéder à la ligue Y, refus sans scope) + `superadmin/src/lib/adminAuth.test.ts` (guards HTTP 401/403). `pnpm vitest run` et `pnpm tsc --noEmit` verts sur `sso`, `superadmin`, `matchsheet`, `teamManager`, `arbinote`, `billetterie`, `ob`.
- [x] **Adaptation des écrans `superadmin` à `FEDERATION_ADMIN` (13 août 2026)** : `getAdminPageSession()` (Server Component, `PLATFORM_SUPERADMIN`/`FEDERATION_ADMIN` — pas `LEAGUE_ADMIN`, qu'aucune route Phase 2/3/4 ne reconnaît encore, voir `canAccessFederation`/`canAccessLeague`) remplace `hasAdminSession` sur les pages `/admin/staff-invitations`, `/admin/player-transfers`, et les deux nouveaux écrans dédiés `/admin/clubs-affilies`/`/admin/officiels-matchs` (évitent d'ouvrir entièrement les gros écrans génériques `/admin/teams`/`/admin/matches`, qui restent `hasAdminSession`-only). Nouveau `ensureAdminOrFederationAuth` (`lib/adminAuth.ts`) ouvre en LECTURE seule à `FEDERATION_ADMIN` les routes de référence consommées par ces écrans — `GET /api/admin/federations`/`/leagues` (filtrées à sa fédération), `/api/admin/teams`, `/api/admin/teams/:id/players`, `/api/admin/saisons`, `/api/admin/arbitres`, `/api/admin/officials` (non filtrées : référentiel non sensible) — l'ÉCRITURE (POST/PUT/DELETE) sur fédérations/équipes/arbitres/saisons reste `PLATFORM_SUPERADMIN`-only, inchangée.
- [ ] **Reste ouvert — écart réel avec la cible, pas un simple report** : `LEAGUE_ADMIN` existe dans l'enum de rôles, le JWT (`leagueId`), et `canAccessLeague`/`ensureLeagueAccess` (`packages/auth-shared`, `superadmin/src/lib/adminAuth.ts`) sont implémentés et testés (§27) — mais **aucune route Phase 2/3/4 ne les appelle**. §9 assigne pourtant explicitement à `LEAGUE_ADMIN`, dans sa ligue : gérer les journées, gérer les matchs, affecter les arbitres autorisés, consulter les clubs de la ligue. Aujourd'hui, `LEAGUE_ADMIN` n'a donc aucun pouvoir opérationnel réel : c'est un rôle "coquille vide" côté guards métier. Tant que ce n'est pas traité, les gros écrans génériques `/admin/teams` (CRUD équipe : création, import, branding, suppression) et `/admin/matches` (CRUD match, y compris saisons/journées) restent `PLATFORM_SUPERADMIN`-only par cohérence — les ouvrir à `FEDERATION_ADMIN`/`LEAGUE_ADMIN` sans scope réel derrière n'aurait pas de sens, et demanderait de toute façon de scoper leurs routes d'écriture (aujourd'hui `ensureAdminAuth` simple, sans vérification de propriété par fédération/ligue). Provisioning des comptes `FEDERATION_ADMIN`/`LEAGUE_ADMIN` : fait, voir "Provisioning des comptes" §0.

### Phase 2 — Affiliations `[~]`
- [x] Modèle `team_affiliations` (`superadmin/src/lib/entities/TeamAffiliation.ts`) : `teamId`, `federationId` obligatoires, `leagueId`/`saisonId` nullable, `status` (`ACTIVE`/`ENDED`/`SUSPENDED`), `startDate`/`endDate`, `notes`, `createdBy`. Pas de `competitionId` séparé : ce dépôt n'a pas de table Competition, `Saison.type_competition` en tient déjà lieu (décision documentée dans l'entité et la migration).
- [x] Migration DB versionnée : `superadmin/mysql/migration_add_team_affiliations.sql` (additive, FK vers `teams`/`federations`/`ligues`/`saisons`), enregistrée dans `db/migrations.manifest`. `teams.federation_id` (lien courant non historisé) conservé tel quel, pas remplacé.
- [x] Service `superadmin/src/lib/teamAffiliations.ts` : `changeAffiliation` (clôture l'affiliation `ACTIVE` précédente dans la même transaction avant d'en créer une nouvelle — jamais un simple UPDATE, l'historique n'est jamais écrasé), `endAffiliation` (désaffiliation), `setAffiliationStatus` (suspension), `getAffiliationAt` (appartenance historique à une date donnée, §22 — réutilisable par `matchsheet` en Phase 4), avec vérification serveur qu'une ligue/saison fournie appartient réellement à la fédération/ligue indiquée (§3).
- [x] Routes API : `POST/GET /api/admin/teams/:id/affiliations`, `PATCH /api/admin/teams/:id/affiliations/:affiliationId` — écriture gardée par `ensureFederationAccess`/`canAccessFederation` sur la fédération réellement propriétaire de la ressource (Phase 1), jamais sur un `federation_id` fourni par le client sans revérification.
- [x] Tests (8 cas, `superadmin/src/lib/teamAffiliations.test.ts`) : première affiliation, changement de ligue clôturant l'ancienne sans la supprimer, rejet ligue ↔ fédération incohérente, rejet d'antidatage, désaffiliation, appartenance historique à une date passée (avant/à/après un changement), suspension sans clôture. `vitest run` + `tsc --noEmit` verts.
- **Écran (13 août 2026, branche `claude/migration-ui-screens-hok3qk`)** : panneau "Affiliations" (`AffiliationsPanel.tsx`) intégré à `/admin/teams` (affiché à l'édition d'un club, à côté du panneau de branding existant) — historique des affiliations, formulaire de rattachement (fédération/ligue/saison/date de début), actions Suspendre/Réactiver/Clôturer sur `GET/POST /api/admin/teams/:id/affiliations` et `PATCH .../affiliations/:affiliationId` (routes déjà existantes, aucune n'a été ajoutée). Réservé `PLATFORM_SUPERADMIN` (intégré au gros écran `/admin/teams`, voir Phase 1).
- **Écran dédié `FEDERATION_ADMIN` (13 août 2026)** : `/admin/clubs-affilies` (`AdminFederationAffiliationsManager.tsx`) — même fonctionnalité que le panneau ci-dessus mais autonome du gros écran `/admin/teams`, donc utilisable par un `FEDERATION_ADMIN` réel. Nouvelle fonction `listAffiliationsForFederation()` (`teamAffiliations.ts`) et route `GET /api/admin/federations/:id/affiliations` (gardée par `canAccessFederation` sur la fédération de l'URL) listent tous les clubs affiliés (tous statuts) à une fédération ; `PLATFORM_SUPERADMIN` choisit la fédération via un sélecteur, `FEDERATION_ADMIN` voit directement la sienne. Le "affilier un club" réutilise le sélecteur `GET /api/admin/teams` (recherche par nom, tous clubs — le POST de rattachement revérifie déjà côté serveur que l'appelant a autorité sur la fédération ciblée).
- [ ] **Reste ouvert** : migration/rétro-remplissage d'une affiliation initiale pour les clubs déjà en base (`teams.federation_id` existant) — à faire avant de considérer l'historique fiable pour tous les clubs existants.

### Phase 3 — Joueurs & transferts `[~]`
- [x] Table `player_transfers` (`teamManager/src/entities/PlayerTransfer.ts`, migration `teamManager/sql/migration_add_player_transfers.sql`) : types `PERMANENT`/`LOAN`/`LOAN_RETURN`/`FREE_TRANSFER`, statuts `DRAFT`/`PENDING`/`APPROVED`/`COMPLETED`/`CANCELLED`/`REJECTED` — propriété `teamManager` (seul à posséder à la fois `Player` et `cms_team_members`, condition nécessaire pour la transaction unique du §20).
- [x] Workflow + transaction atomique : `teamManager/src/services/PlayerTransferService.ts#completeTransfer` clôture l'affiliation `cms_team_members` du club source, en ouvre une au club destination et met à jour `Player.teamId` dans **une seule transaction DB** — jamais un enchaînement d'appels séparés. `Player.id` n'est jamais recréé. Idempotent : un transfert déjà `COMPLETED` ne peut pas être rejoué (double validation concurrente rejetée) ; rejette aussi si le joueur a déjà changé de club entre la création et l'homologation.
- [x] Orchestration `superadmin` → `teamManager` : `superadmin` ne possède ni n'écrit `Player`/`cms_team_members`/`player_transfers` — `POST /api/admin/player-transfers` (superadmin) appelle les routes internes service-à-service `POST /api/internal/player-transfers`, `.../:id/complete`, `.../:id/close` (teamManager, `ensureServiceAuth`), même pattern que la saga d'annulation de match (TASK-P0-003, `matchSagaClients.ts`). Version v1 simplifiée (explicitement autorisée par le §19) : create + complete enchaînés en un seul appel superadmin, pas de workflow de validation à deux clubs pour l'instant.
- [x] Autorisation dérivée de `team_affiliations` (Phase 2) : la fédération autorisée à transférer un joueur est celle qui gouverne ACTUELLEMENT le club source (`getActiveAffiliation`), jamais un `federation_id` fourni par le client ; un club sans affiliation active ne peut être transféré que par `PLATFORM_SUPERADMIN`.
- [x] Tests : 10 cas côté `teamManager` (`PlayerTransferService.test.ts` — même club rejeté, joueur/club inconnu, club source incorrect, transaction atomique avec vérification `Player.id` préservé + anciennes/nouvelles affiliations, double validation concurrente, joueur déjà transféré ailleurs, transfert `CANCELLED` non compétable) + 5 cas côté `superadmin` (`route.test.ts` — fédération A ne peut pas transférer un club de fédération B, club sans affiliation réservé à `PLATFORM_SUPERADMIN`, champs requis manquants). `vitest run` + `tsc --noEmit` verts sur `teamManager` (102 tests) et `superadmin` (98 tests).
- **Écran (13 août 2026, branche `claude/migration-ui-screens-hok3qk`)** : `/admin/player-transfers` (`AdminPlayerTransfersManager.tsx`) — formulaire de création/homologation (club source → sélecteur joueur peuplé via la nouvelle route `GET /api/admin/teams/:id/players`/`listPlayersForTeam()`, club destination, type, date d'effet, saison, indemnité, dates de prêt) qui appelle `POST /api/admin/player-transfers` (route déjà existante, create+complete v1). **Ouvert à `FEDERATION_ADMIN`** (`getAdminPageSession()`, comme le reste de cette branche) — cohérent avec le POST qui n'a de toute façon jamais autorisé que `PLATFORM_SUPERADMIN`/`FEDERATION_ADMIN` (`canAccessFederation` sur le club source, `LEAGUE_ADMIN` toujours exclu). Pas encore de tableau de bord : voir "reste ouvert".
- [x] **Tableau de bord Transferts (13 août 2026)** : nouvelle `listTransfers(status?)` (`teamManager/src/services/PlayerTransferService.ts`) + `GET /api/internal/player-transfers` (service-à-service, filtre `?status=`) exposent enfin une lecture — jusqu'ici seule la création existait. `superadmin` : `listPlayerTransfers()` (`playerTransferClient.ts`) + `GET /api/admin/player-transfers` scope le résultat pour un `FEDERATION_ADMIN` (relit `team_affiliations`, absente de la base `teamManager`, pour ne garder que les transferts dont le club source OU destination est/a été affilié à sa fédération — jamais un `federationId` fourni par le client) et enrichit les IDs avec les noms club/joueur pour l'affichage. Écran : la liste complète est chargée une fois puis filtrée côté client par onglet (Tous/En attente/Approuvés/**Historique** = COMPLETED/**Prêts** = `transferType=LOAN`/Annulés = CANCELLED+REJECTED) — pas six routes séparées.
- **Vue globale `/joueurs` (13 août 2026)** : `AdminPlayersManager.tsx` — filtres fédération (masqué pour `FEDERATION_ADMIN`, forcé côté serveur)/ligue/saison (résolus via `team_affiliations`, une correspondance suffit, pas nécessairement `ACTIVE`) /club/catégorie/poste (`LIKE`, tolérant à la casse/variance)/statut (enum exact)/recherche par nom. Nouvelle `listPlayersGlobal()` (`players.ts`) et route `GET /api/admin/players`. A nécessité d'élargir le mapping local `superadmin/src/lib/entities/Player.ts` (jusqu'ici 4 colonnes pour le fil des faits de match) avec `category`/`position`/`status`/`isActive` — déjà présentes côté `teamManager`, simplement absentes de ce mapping partiel en lecture seule. Pas de pagination (limite 200, message si atteinte) ; pas d'écran `/clubs/{clubId}/joueurs` séparé (le filtre club de cette vue le couvre).
- [ ] **Reste ouvert** : pagination réelle de `/admin/joueurs` au-delà de la limite 200. Workflow de validation à deux acteurs (club source propose, club destination confirme, fédération homologue) — la v1 simplifiée saute cette étape. Notifications (`PLAYER_TRANSFER_*` vers `notification-api`) — non câblées. Vérification temporelle dans `matchsheet` (§22, `player.teamId === match.teamId` actuel à remplacer par une lecture de l'historique d'appartenance à la date du match) — prévue en Phase 4 avec les officiels de match, réutilisera `getAffiliationAt`/l'équivalent côté `cms_team_members`. Historique clubs en lecture seule pour un ancien joueur dans `teamManager` (§23) — non fait. Le scope `FEDERATION_ADMIN` du tableau de bord Transferts et de la vue `/joueurs` repose sur l'historique COMPLET d'affiliation (même un club qui a QUITTÉ la fédération reste visible pour l'historique) — comportement voulu mais à documenter si un `FEDERATION_ADMIN` s'en étonne.

### Phase 4 — Officiels de match `[~]`
- [x] Rôles SSO `REFEREE`/`MATCH_OFFICIAL`/`REFEREE_OBSERVER` ajoutés à l'enum `User.role` (`sso/sql/migration_add_match_official_roles.sql`, additif) — ces comptes n'ont pas de `teamId`.
- [x] Table `match_official_assignments` (`matchsheet/src/entities/MatchOfficialAssignment.ts`, migration `matchsheet/sql/migration_add_match_official_assignments.sql`) : `matchId`, `userId` (compte SSO réel), `refereeId` optionnel, `role` (`CENTER_REFEREE`/`ASSISTANT_REFEREE`/`FOURTH_OFFICIAL`/`MATCH_DELEGATE`/`REFEREE_OBSERVER`/`TEAM_REPRESENTATIVE`), `status` (`ACTIVE`/`REVOKED`), `assignedBy`/`assignedAt`, `revokedBy`/`revokedAt` — jamais de suppression, l'historique reste l'audit (§11). Distincte de `ms_match_officials` (saisie libre nom/licence existante, conservée telle quelle, aucun lien avec un compte).
- [x] Contrôle serveur : `src/middleware.ts` (edge, authentification seulement — ne peut pas interroger la base) laisse passer un rôle REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER sans `teamId` ; `[matchId]/layout.tsx` (runtime Node, choke-point déjà existant pour les comptes club) vérifie ENSUITE une affectation `ACTIVE` réelle via `MatchOfficialAssignmentService.findActiveAssignment` avant de laisser passer — jamais uniquement le rôle porté par le JWT (§3). SUPERADMIN/PLATFORM_SUPERADMIN restent refusés (aucun changement de comportement pour les comptes existants).
- [x] Orchestration `superadmin` → `matchsheet` (même pattern que la Phase 3) : `POST/GET /api/admin/matches/:id/officials`, `POST .../:assignmentId/revoke` appellent les routes internes service-à-service de `matchsheet`. Autorisation dérivée de la fédération qui gouverne RÉELLEMENT le match (`match → journée → saison → ligue → fédération`, `lib/matchFederationScope.ts`), pas d'un identifiant fourni par le client ; une saison sans ligue (tournoi hors championnat) réserve l'action à `PLATFORM_SUPERADMIN`.
- [x] Tests : 8 cas `matchsheet` (`MatchOfficialAssignmentService.test.ts` — affectation/révocation idempotentes, deux officiels sur le même rôle, ré-affectation après révocation, aucune fuite entre deux matchs) + 3 cas `superadmin` (`matchFederationScope.test.ts`) + 4 cas de guard (`route.test.ts` — fédération A ne peut pas affecter un officiel sur un match de fédération B, match sans fédération résolvable réservé à `PLATFORM_SUPERADMIN`). `vitest run` + `tsc --noEmit` verts sur `sso`, `matchsheet` (70 tests), `superadmin` (105 tests), et re-vérifiés sans régression sur `teamManager`/`arbinote`/`billetterie`/`ob`.
- **Écran (13 août 2026, branche `claude/migration-ui-screens-hok3qk`)** : panneau "Officiels" (`MatchOfficialsPanel.tsx`) intégré à `/admin/matches` (deuxième bascule d'expansion par ligne, à côté de "Faits" déjà existant) — liste des affectations, formulaire d'affectation (compte SSO officiel + rôle + arbitre lié optionnel), révocation, sur `GET/POST /api/admin/matches/:id/officials` et `POST .../officials/:assignmentId/revoke` (routes déjà existantes). Nouvelle route `GET /api/admin/officials` (`listOfficialAccounts()` dans `clubAccounts.ts`) pour peupler le sélecteur de comptes `REFEREE`/`MATCH_OFFICIAL`/`REFEREE_OBSERVER` — a mis en évidence que l'entité locale `superadmin/src/lib/entities/User.ts` avait un type `role` resté figé sur `ADMIN`/`OBSERVATEUR`/`SUPERADMIN` malgré les migrations Phase 1/4 qui ont élargi l'enum réel en base ; élargi pour correspondre à `IdentityUserRole` (`identityClient.ts`). Réservé `PLATFORM_SUPERADMIN` (intégré au gros écran `/admin/matches`, voir Phase 1).
- **Écran dédié `FEDERATION_ADMIN` (13 août 2026)** : `/admin/officiels-matchs` (`AdminFederationMatchOfficialsManager.tsx`) — liste les matchs RÉELLEMENT gouvernés par une fédération (nouvelle `listMatchesForFederation()` dans `matchFederationScope.ts`, jointure match→journée→saison→ligue, et route `GET /api/admin/federations/:id/matches`) et réutilise le même `MatchOfficialsPanel` par match (déjà correctement gardé côté API : POST/revoke vérifient `canAccessFederation` sur la fédération réelle du match, pas de changement nécessaire là). `PLATFORM_SUPERADMIN` choisit la fédération, `FEDERATION_ADMIN` voit directement la sienne.
- [ ] **Reste ouvert** : vérification temporelle `player.teamId === match.teamId` dans `matchsheet` (§22, distincte des officiels — reste à câbler sur `cms_team_members`/`getAffiliationAt` équivalent côté joueurs) ; audit nominatif enrichi (terminal/IP) au-delà de `assignedBy`/`revokedBy`.

### Phase 5 — ArbiNote officiel `[~]`
- [x] Évaluation fédérale séparée : `arbinote/src/lib/entities/RefereeOfficialEvaluation.ts` (table `referee_official_evaluations`, migration `arbinote/mysql/migration_add_referee_official_evaluations.sql`) — domaine et code strictement distincts de la notation publique (`votes`) : `refereeOfficialEvaluations.ts` n'importe jamais `adminVotes.ts`, aucune fonction ne calcule de score combiné entre `note_officielle` et `votes.note_globale`.
- [x] Workflow `DRAFT → SUBMITTED → VALIDATED|REJECTED` : rédigé par `REFEREE_OBSERVER` (auteur, `observer_user_id` = sa propre session), homologué (`VALIDATED`) ou renvoyé (`REJECTED`, avec motif) par le `FEDERATION_ADMIN` de la fédération qui gouverne RÉELLEMENT le match évalué (résolu serveur via `match → journée → saison → ligue → fédération`, `lib/matchFederationScope.ts` — jamais un `federation_id` fourni par le client). Routes `/api/officiel/evaluations` (create/submit/validate/reject), distinctes de `/api/admin/*` (accès plateforme complet) et non couvertes par le middleware existant.
- [x] Historique par arbitre (`GET /api/officiel/arbitres/:arbitreId/evaluations`, tous statuts) et statistiques de performance (`GET .../stats`, moyenne uniquement sur les évaluations `VALIDATED` — jamais `DRAFT`/`SUBMITTED`/`REJECTED`) — migration.md §12 "aide aux promotions/désignations/formations".
- [x] Tests : 9 cas service (`refereeOfficialEvaluations.test.ts` — création, doublon refusé, deux observateurs sur le même match, workflow complet validation/rejet, transitions invalides refusées, moyenne excluant les statuts non validés) + 3 cas résolution fédération (`matchFederationScope.test.ts`) + 4 cas de garde (`validate/route.test.ts` — REFEREE_OBSERVER ne peut pas valider, fédération A ne peut pas valider un match de fédération B, PLATFORM_SUPERADMIN passe toujours). `vitest run` (140 tests) + `tsc --noEmit` verts sur `arbinote`.
- **Écran (13 août 2026, branche `claude/migration-ui-screens-hok3qk`)** : `/admin/officiel` dans `arbinote` (`OfficielEvaluationsManager.tsx`) — trois blocs selon le rôle de la session : "Nouveau rapport"/"Mes rapports" (`REFEREE_OBSERVER`, création DRAFT puis soumission séparée via `POST .../submit`), "File d'homologation" (`FEDERATION_ADMIN`, valider/rejeter avec motif), "Historique par arbitre" (tout rôle officiel, réutilise les routes déjà existantes `GET /api/officiel/arbitres/:id/evaluations`+`/stats`). `PLATFORM_SUPERADMIN` voit les trois blocs. Contrairement aux écrans `superadmin` de cette même branche, la page est bien ouverte à `FEDERATION_ADMIN`/`REFEREE_OBSERVER` (nouveau `getOfficialEvalPageSession()` dans `lib/adminAuth.ts`, variant Server Component de `getOfficialEvalSession`), pas seulement à `PLATFORM_SUPERADMIN` — les sélecteurs match/arbitre réutilisent les routes publiques déjà existantes `GET /api/matches`/`GET /api/arbitres` (aucun nouvel accès n'était nécessaire, ces routes sont déjà ouvertes à tout visiteur). A nécessité deux nouvelles fonctions de listing côté serveur (`listEvaluationsForObserver`, `listEvaluationsPendingReview` — cette dernière jointe match→journée→saison→ligue pour ne montrer à un `FEDERATION_ADMIN` que les rapports `SUBMITTED` de matchs RÉELLEMENT sous sa fédération) exposées via un nouveau `GET /api/officiel/evaluations` (le POST existant n'avait pas de pendant en lecture).
- [x] **Édition d'un rapport `DRAFT` (13 août 2026)** : nouvelle `updateEvaluation()` (`refereeOfficialEvaluations.ts`, refuse toute transition hors `DRAFT`) et route `PATCH /api/officiel/evaluations/:id` (même garde que `.../submit` : auteur du rapport ou `PLATFORM_SUPERADMIN`) — bouton "Modifier" dans "Mes rapports" ouvrant un formulaire d'édition inline (critères/points forts/points faibles/recommandations, note recalculée).
- [ ] **Reste ouvert** : agrégats plus riches (tendance dans le temps, comparaison entre observateurs) au-delà de la moyenne simple ; pagination de `GET /api/matches`/`GET /api/arbitres` pour les sélecteurs (limite actuelle 200 matchs, pas de recherche câblée dans l'écran alors que les routes la supportent).

---

## 1. Mission

Analyser le monorepo `foot` existant et faire évoluer l’architecture vers un modèle fédéral propre, multi-clubs et extensible à plusieurs fédérations, **sans réécrire inutilement les modules déjà fonctionnels**.

Le but est de clarifier les responsabilités entre :

- la plateforme globale ;
- les fédérations ;
- les ligues ;
- les clubs ;
- les officiels de match ;
- les supporters ;
- les vendeurs.

L’implémentation doit préserver les fonctionnalités existantes et respecter le code réel du dépôt.

---

## 2. Règle fondamentale

Ne pas considérer durablement :

```text
SUPERADMIN = Fédération
```

La cible doit être :

```text
PLATFORM_SUPERADMIN
        │
        ├── Fédération A
        │      └── FEDERATION_ADMIN
        │
        ├── Fédération B
        │      └── FEDERATION_ADMIN
        │
        └── ...
```

Même si la plateforme ne gère qu’une seule fédération aujourd’hui, conserver cette séparation conceptuelle afin d’éviter une refonte future.

---

## 3. Architecture fonctionnelle cible

```text
PLATEFORME FOOT
│
├── PLATFORM_SUPERADMIN
│
├── Fédération
│   └── FEDERATION_ADMIN
│
├── Ligue
│   └── LEAGUE_ADMIN
│
├── Clubs
│   ├── CLUB_ADMIN
│   └── CLUB_STAFF
│
├── Officiels
│   ├── REFEREE
│   ├── MATCH_OFFICIAL
│   └── REFEREE_OBSERVER
│
├── Supporters
│   └── MEMBER
│
└── Commerce
    └── SELLER
```

Les permissions doivent être contrôlées côté serveur selon un **scope explicite** :

```text
platform
federationId
leagueId
teamId
matchId
```

Ne jamais faire confiance à un identifiant de scope envoyé uniquement par le frontend.

---

## 4. Classification des projets

### Plateforme globale

- `superadmin`
- `sso`
- `payment-api`
- `notification-api`
- `marketplace-api`

### Fédération / compétition

- `arbinote`
- `matchsheet`

### Clubs

- `teamManager`
- `billetterie`

### Vendeurs

- `sellerPortal`

### Application custom

- `ob` — uniquement Olympique de Béja

---

## 5. État actuel important à respecter

### 5.1 `matchsheet` est déjà authentifié

Ne pas réimplémenter inutilement son authentification.

Le projet possède déjà :

- middleware SSO ;
- vérification du JWT ;
- contrôle de révocation ;
- `teamId` obligatoire ;
- accès club `ADMIN` / `OBSERVATEUR` ;
- refus de `SUPERADMIN` ;
- routes internes protégées par authentification service-à-service.

Le besoin restant n’est donc pas « ajouter une authentification basique », mais **introduire une identité officielle de match plus précise** :

```text
MATCH_OFFICIAL
REFEREE
REFEREE_OBSERVER
```

et vérifier qu’un utilisateur est réellement affecté au match concerné.

### 5.2 `superadmin` est actuellement global

Le middleware actuel protège les routes avec le rôle :

```text
SUPERADMIN
```

Il n’existe pas encore de scope fédéral strict.

Le rôle actuel doit donc être interprété comme :

```text
PLATFORM_SUPERADMIN
```

La compatibilité avec `SUPERADMIN` peut être conservée temporairement pendant la migration.

### 5.3 Relation Federation → League existante

Le modèle contient déjà une relation de type :

```text
Federation
   ↓
League
```

avec un `federation_id`.

Ne pas recréer ce lien.

### 5.4 Les clubs ne sont pas encore correctement scopés par fédération / saison

L’entité `Team` ne porte pas actuellement un modèle complet de rattachement historique à une fédération, une ligue, une compétition et une saison.

Ne pas ajouter naïvement un simple :

```text
team.leagueId
```

comme unique vérité historique.

Un club peut changer de ligue selon la saison.

---

## 6. Nouveau modèle d’affiliation

Créer un modèle d’affiliation historique permettant de représenter :

```text
Club
 └── Affiliation
      ├── federationId
      ├── leagueId
      ├── competitionId
      ├── seasonId
      ├── teamId
      ├── status
      ├── startDate
      └── endDate
```

Nom possible :

```text
team_affiliations
```

ou un nom cohérent avec le schéma existant.

### Contraintes

- `teamId` obligatoire ;
- `federationId` obligatoire ;
- `leagueId` nullable si nécessaire ;
- `competitionId` nullable si nécessaire ;
- `seasonId` obligatoire lorsqu’on représente une participation saisonnière ;
- ne pas écraser l’historique ;
- permettre promotion / relégation ;
- permettre changement de ligue ;
- permettre désaffiliation ;
- prévoir statut `ACTIVE`, `ENDED`, `SUSPENDED` si pertinent.

---

## 7. Évolution des rôles SSO

Faire évoluer progressivement les rôles existants.

### Rôles cibles

```text
PLATFORM_SUPERADMIN
FEDERATION_ADMIN
LEAGUE_ADMIN

CLUB_ADMIN
CLUB_STAFF

REFEREE
MATCH_OFFICIAL
REFEREE_OBSERVER

MEMBER
SELLER
```

### Compatibilité

Ne pas casser immédiatement :

```text
SUPERADMIN
ADMIN
OBSERVATEUR
MEMBER
```

Créer une stratégie de migration compatible.

Par exemple :

```text
SUPERADMIN → PLATFORM_SUPERADMIN
ADMIN → CLUB_ADMIN
OBSERVATEUR → CLUB_STAFF ou rôle plus précis selon contexte
```

Ne pas faire de migration destructrice sans vérifier tous les projets consommateurs.

---

## 8. Scopes d’autorisation

Le contexte utilisateur doit pouvoir représenter :

```json
{
  "userId": "...",
  "role": "FEDERATION_ADMIN",
  "federationId": "...",
  "leagueIds": [],
  "teamId": null
}
```

ou :

```json
{
  "userId": "...",
  "role": "LEAGUE_ADMIN",
  "federationId": "...",
  "leagueIds": ["..."],
  "teamId": null
}
```

ou :

```json
{
  "userId": "...",
  "role": "CLUB_ADMIN",
  "federationId": "...",
  "teamId": "..."
}
```

Le JWT peut transporter des informations de contexte, mais les ressources demandées doivent toujours être vérifiées côté serveur.

Exemple :

```text
FEDERATION_ADMIN(federation=A)
```

ne doit jamais pouvoir modifier :

```text
League appartenant à Federation=B
```

---

## 9. `superadmin` — évolution attendue

Transformer progressivement `superadmin` en administration multi-niveaux.

### PLATFORM_SUPERADMIN

Peut :

- gérer les fédérations ;
- gérer la configuration plateforme ;
- gérer les administrateurs fédéraux ;
- consulter l’ensemble du système ;
- superviser sécurité, audit et infrastructure fonctionnelle.

### FEDERATION_ADMIN

Peut uniquement dans sa fédération :

- gérer les ligues ;
- gérer les compétitions ;
- gérer les saisons ;
- gérer les journées ;
- gérer les clubs affiliés ;
- gérer les arbitres ;
- gérer les règles fédérales ;
- superviser les matchs ;
- homologuer certaines opérations ;
- gérer les transferts/homologations si le module l’exige.

### LEAGUE_ADMIN

Peut uniquement dans sa ou ses ligues :

- gérer les journées ;
- gérer les matchs ;
- affecter les arbitres autorisés ;
- consulter les clubs de la ligue ;
- gérer les opérations autorisées de compétition.

### Tests indispensables

Ajouter des tests négatifs :

```text
FEDERATION_ADMIN A → impossible de modifier fédération B
LEAGUE_ADMIN X → impossible de modifier ligue Y
CLUB_ADMIN OB → impossible de modifier EST
```

---

## 10. `teamManager` — rôle inchangé : application club

`teamManager` doit rester une application générique multi-clubs.

Il appartient au niveau CLUB et continue à gérer :

- joueurs ;
- staff ;
- entraînements ;
- convocations ;
- tactiques ;
- blessures ;
- discipline interne ;
- déplacements ;
- actualités ;
- médias ;
- sponsors ;
- académie ;
- recrutement ;
- boutique ;
- configuration locale de billetterie ;
- branding club.

Ne pas transformer `teamManager` en back-office fédéral.

### Règle

```text
Fédération
    ↓ supervision
Club
    ↓
teamManager
```

et non :

```text
Fédération
    ↓
gestion quotidienne de tous les clubs
```

---

## 11. `matchsheet` — évolution officielle

Conserver l’authentification SSO existante.

Ajouter un modèle permettant de prouver qui est officiellement autorisé à intervenir sur un match.

Exemple :

```text
match_official_assignments
├── id
├── matchId
├── userId
├── refereeId
├── role
├── status
├── assignedBy
├── assignedAt
└── revokedAt
```

Rôles possibles :

```text
CENTER_REFEREE
ASSISTANT_REFEREE
FOURTH_OFFICIAL
MATCH_DELEGATE
REFEREE_OBSERVER
TEAM_REPRESENTATIVE
```

### Avant toute mutation sensible

Vérifier :

- utilisateur authentifié ;
- rôle autorisé ;
- affectation au match ;
- statut du match ;
- état de la feuille ;
- club/périmètre si applicable.

### Audit

Journaliser :

- auteur ;
- match ;
- action ;
- ancien état ;
- nouvel état ;
- date ;
- terminal/IP si disponible ;
- correction post-signature ;
- autorité ayant autorisé une correction.

---

## 12. `arbinote` — séparer public et officiel

Conserver la notation publique existante.

Ajouter éventuellement un deuxième domaine clairement séparé :

```text
Évaluation publique
≠
Évaluation fédérale officielle
```

### Public

- supporters ;
- score communautaire ;
- anti-fraude ;
- classement bayésien ;
- aucune conséquence réglementaire directe.

### Officiel

Réservé à :

```text
REFEREE_OBSERVER
FEDERATION_ADMIN
```

Possibilités :

- note officielle ;
- critères techniques ;
- rapport d’observation ;
- points forts/faibles ;
- recommandations ;
- validation finale ;
- historique par arbitre ;
- statistiques de performance ;
- aide aux promotions/désignations/formations.

Ne jamais fusionner automatiquement les deux scores.

---

## 13. Billetterie — gouvernance

La billetterie reste un service générique multi-clubs.

### Fédération

Peut définir :

- politiques globales ;
- règles de sécurité ;
- contraintes visiteurs ;
- restrictions par compétition ;
- règles réglementaires.

### Club organisateur

Gère :

- catégories ;
- capacité ;
- prix ;
- quotas ;
- fenêtres de vente ;
- audience ;
- ouverture/fermeture des ventes.

### Billetterie

Gère :

- réservation ;
- achat ;
- paiement ;
- émission ;
- QR ;
- contrôle ;
- scan ;
- statut billet.

Ne pas centraliser toutes les opérations quotidiennes dans le compte fédéral.

---

## 14. Marketplace

Conserver :

```text
sellerPortal
      ↓
marketplace-api
```

### Responsabilités

#### Seller

- catalogue ;
- stock ;
- commandes ;
- expéditions ;
- retours autorisés ;
- données de son périmètre.

#### Club

- validation de l’utilisation de sa marque ;
- modération des produits liés au club ;
- règles de commission club.

#### Fédération

Optionnellement :

- politiques globales ;
- catégories interdites ;
- règles de conformité sportive.

#### Plateforme

- sécurité ;
- litiges globaux ;
- paiements ;
- supervision ;
- conformité technique.

---

## 15. Paiement

`payment-api` reste un service mutualisé.

Ne pas déplacer sa logique métier dans `superadmin`.

Chaque transaction doit permettre d’identifier :

- application source ;
- fédération éventuelle ;
- club bénéficiaire ;
- utilisateur ;
- commande/billet ;
- montant ;
- frais plateforme ;
- reversement ;
- provider.

Conserver l’authentification service-à-service.

---

## 16. Notifications

`notification-api` reste transversal.

Les autres projets doivent publier des événements métier et ne pas recréer chacun leurs propres systèmes d’email/push.

Exemples :

```text
MATCH_ASSIGNED
MATCH_STARTED
MATCH_FINISHED
TRANSFER_COMPLETED
TICKET_PAID
TICKET_ISSUED
ORDER_CONFIRMED
REFEREE_EVALUATION_PUBLISHED
```

---

## 17. `ob`

`ob` reste une application **custom Olympique de Béja uniquement**.

Ne pas la rendre générique.

Elle peut consommer les données de la plateforme pour :

- actualités ;
- équipe ;
- matchs ;
- live ;
- billetterie ;
- boutique ;
- espace membre ;
- transferts publics ;
- annonces officielles.

Le branding OB peut rester spécifique dans ce projet.

---

## 18. Module joueurs global dans `superadmin`

Ajouter une vue globale des joueurs.

### Écrans

```text
/joueurs
```

Filtres :

- fédération ;
- ligue ;
- saison ;
- club ;
- catégorie ;
- poste ;
- statut ;
- recherche.

Ajouter également :

```text
/clubs/{clubId}/joueurs
```

La fédération peut consulter le référentiel complet selon son scope.

---

## 19. Module transferts

Créer un module central de transfert/homologation.

### Règle fondamentale

Ne jamais supprimer puis recréer un joueur lors d’un transfert.

Conserver :

```text
Player.id
```

pendant toute la carrière.

`Player.teamId` représente le club courant.

L’historique d’appartenance et les événements de transfert doivent être conservés séparément.

### Table suggérée

```text
player_transfers
├── id
├── playerId
├── fromTeamId
├── toTeamId
├── transferType
├── transferDate
├── effectiveDate
├── seasonId
├── status
├── fee
├── currency
├── loanStartDate
├── loanEndDate
├── notes
├── createdBy
├── approvedBy
├── createdAt
└── updatedAt
```

### Types

```text
PERMANENT
LOAN
LOAN_RETURN
FREE_TRANSFER
```

### Statuts

```text
DRAFT
PENDING
APPROVED
COMPLETED
CANCELLED
REJECTED
```

### Workflow cible

```text
Club vendeur
    ↓
demande
    ↓
Club acheteur
    ↓
validation
    ↓
Fédération / Ligue
    ↓
homologation
    ↓
transfert COMPLETED
    ↓
Player.teamId mis à jour
```

Le workflow peut être simplifié dans une première version si seuls les administrateurs fédéraux créent les transferts.

---

## 20. Historique d’appartenance joueur

Le dépôt possède déjà un concept `TeamMember` avec :

```text
teamId
playerId
status
startDate
endDate
```

Réutiliser cette logique lorsque possible.

Lors d’un transfert :

```text
ancienne affiliation
status = ENDED
endDate = effectiveDate
```

puis :

```text
nouvelle affiliation
status = ACTIVE
startDate = effectiveDate
```

et seulement ensuite :

```text
Player.teamId = toTeamId
```

Toutes ces opérations doivent être effectuées dans **une seule transaction DB**.

---

## 21. Historique sportif

Les données historiques doivent rester attachées au club correspondant au moment où elles ont été créées.

Ne jamais recalculer l’historique simplement à partir du `Player.teamId` courant.

Exemples concernés :

- statistiques ;
- compositions ;
- buts ;
- cartons ;
- blessures ;
- convocations ;
- feuilles de match.

Pour une donnée historique :

```text
club au moment de l’événement
```

doit être conservé.

---

## 22. Vérification temporelle dans `matchsheet`

Ne pas utiliser uniquement :

```text
player.teamId === match.teamId
```

pour vérifier historiquement l’appartenance.

Exemple :

```text
match : 10/08/2026
transfert : 16/08/2026
```

Le joueur doit rester considéré comme joueur de son ancien club pour le match du 10/08.

Utiliser l’historique d’affiliation :

```text
startDate <= matchDate
AND
(endDate IS NULL OR endDate >= matchDate)
```

---

## 23. Exploitation des transferts dans les autres projets

### `teamManager`

Ajouter :

```text
Effectif
├── Joueurs actuels
└── Anciens joueurs
```

Pour un ancien joueur :

- dates d’appartenance ;
- club de destination ;
- historique sportif en lecture seule.

Un ancien club ne doit pas modifier arbitrairement les données actuelles du joueur appartenant désormais à un autre club.

### `ob`

Possibilité d’ajouter une page :

```text
Mercato
├── Arrivées
└── Départs
```

Uniquement pour les transferts :

```text
COMPLETED
```

et explicitement publics.

### `notification-api`

Publier :

```text
PLAYER_TRANSFER_REQUESTED
PLAYER_TRANSFER_APPROVED
PLAYER_TRANSFER_REJECTED
PLAYER_TRANSFER_COMPLETED
```

### `superadmin`

Ajouter :

```text
Transferts
├── Nouveau
├── En attente
├── Approuvés
├── Historique
├── Prêts
└── Annulés
```

---

## 24. Matrice de responsabilité cible

| Domaine | Responsable principal |
|---|---|
| Fédérations | Platform SuperAdmin |
| Ligues | Federation Admin |
| Compétitions | Federation / League Admin |
| Saisons | Federation / League Admin |
| Journées | League Admin |
| Clubs affiliés | Federation Admin |
| Matchs officiels | Federation / League |
| Arbitres | Federation / League |
| Feuille officielle | Match Official |
| Joueurs club | Club |
| Transferts homologués | Federation / League |
| Entraînements | Club |
| Blessures internes | Club |
| Contenu club | Club |
| Billetterie commerciale | Club organisateur |
| Paiement | payment-api |
| Notifications | notification-api |
| Marketplace | marketplace-api |
| Vendeur | sellerPortal |
| Site OB | OB uniquement |

---

## 25. Contraintes d’implémentation

### Ne pas faire

- ne pas réécrire toutes les applications ;
- ne pas casser le SSO existant ;
- ne pas supprimer l’auth existante de `matchsheet` ;
- ne pas remplacer toutes les relations par de nouvelles tables sans migration ;
- ne pas mettre toute la logique fédérale dans `teamManager` ;
- ne pas transformer `ob` en application générique ;
- ne pas faire confiance au scope fourni par le navigateur ;
- ne pas supprimer l’historique joueur lors d’un transfert ;
- ne pas déplacer paiement/notifications dans `superadmin`.

### Faire

- analyser le code existant avant chaque modification ;
- préserver la compatibilité ;
- utiliser migrations SQL/TypeORM versionnées ;
- ajouter les nouveaux rôles progressivement ;
- ajouter tests de permissions négatifs ;
- ajouter audit sur actions sensibles ;
- utiliser transactions pour les transferts ;
- documenter les changements.

---

## 26. Ordre recommandé d’implémentation

### Phase 1 — modèle d’autorisation

1. introduire `PLATFORM_SUPERADMIN` conceptuellement ;
2. ajouter `FEDERATION_ADMIN` ;
3. ajouter `LEAGUE_ADMIN` ;
4. définir les scopes ;
5. ajouter les guards serveur correspondants ;
6. conserver la compatibilité avec les anciens rôles.

### Phase 2 — affiliations

1. créer le modèle historique d’affiliation ;
2. rattacher clubs / fédérations / ligues / saisons ;
3. adapter les écrans `superadmin` ;
4. ajouter tests promotion / relégation / changement de ligue.

### Phase 3 — joueurs et transferts

1. liste globale des joueurs dans `superadmin` ;
2. fiche joueur ;
3. historique clubs ;
4. table `player_transfers` ;
5. workflow transfert ;
6. transaction atomique ;
7. audit ;
8. notifications.

### Phase 4 — officiels

1. rôles `REFEREE`, `MATCH_OFFICIAL`, `REFEREE_OBSERVER` ;
2. affectations par match ;
3. contrôle serveur dans `matchsheet` ;
4. audit nominatif.

### Phase 5 — ArbiNote officiel

1. conserver notation publique ;
2. ajouter évaluations officielles séparées ;
3. permissions observateur ;
4. historique arbitre.

---

## 27. Tests obligatoires

### Autorisations

```text
PLATFORM_SUPERADMIN → toutes fédérations
FEDERATION_ADMIN A → uniquement A
LEAGUE_ADMIN X → uniquement X
CLUB_ADMIN OB → uniquement OB
MATCH_OFFICIAL → uniquement matchs affectés
```

### Transferts

Tester :

- transfert permanent ;
- prêt ;
- retour de prêt ;
- transfert même club interdit ;
- joueur inexistant ;
- club source incorrect ;
- club destination inexistant ;
- double validation concurrente ;
- rollback si une étape échoue ;
- conservation du `Player.id` ;
- conservation des anciennes stats ;
- nouvelle affiliation active ;
- ancienne affiliation clôturée.

### Historique temporel

Vérifier qu’un joueur transféré après un match reste correctement associé à son ancien club pour ce match.

### Multi-fédération

Créer au minimum :

```text
Federation A
Federation B
```

et vérifier qu’aucun administrateur de A ne peut accéder en écriture aux données de B.

---

## 28. Audit

Toutes les actions sensibles doivent produire un audit :

- création/modification fédération ;
- rattachement club ;
- promotion/relégation ;
- transfert joueur ;
- homologation ;
- affectation arbitre ;
- correction feuille de match ;
- modification post-signature ;
- changement de rôle.

Champs recommandés :

```text
actorUserId
actorRole
federationId
leagueId
teamId
matchId
entityType
entityId
action
before
after
createdAt
```

---

## 29. Résultat attendu

À la fin, la plateforme doit pouvoir représenter proprement :

```text
Platform
   │
   ├── Federation A
   │      ├── League 1
   │      │    ├── Club A
   │      │    └── Club B
   │      └── League 2
   │
   └── Federation B
          └── ...
```

avec :

- isolation stricte ;
- permissions par niveau ;
- clubs autonomes ;
- compétition fédérale ;
- officiels authentifiés ;
- historique fiable ;
- transferts homologués ;
- services techniques mutualisés ;
- applications club génériques ;
- `ob` conservé comme site custom OB.

---

## 30. Instruction finale à l’agent IA

Avant de coder :

1. inspecter les entités, guards, middleware, routes, services et migrations existants ;
2. identifier ce qui est déjà implémenté ;
3. ne pas dupliquer les mécanismes existants ;
4. proposer une migration compatible ;
5. implémenter par étapes ;
6. ajouter les migrations ;
7. ajouter les tests ;
8. exécuter lint, TypeScript, tests et build sur les projets touchés ;
9. corriger toutes les régressions introduites ;
10. fournir un bilan final précis des fichiers modifiés, migrations, nouvelles permissions, tests et éventuelles actions manuelles.

**Ne pas s’arrêter à une simple analyse : appliquer les changements nécessaires jusqu’à obtenir un modèle Fédération / Ligue / Club cohérent, sécurisé et rétrocompatible.**
