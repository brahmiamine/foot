# staff-hub

Espace staff technique générique multi-clubs (coach, adjoint, analyste,
préparateur...) : effectif, calendrier, entraînements, présences, matchs,
convocations, composition, planches tactiques, statistiques et
déplacements — sur les **mêmes données et le même RBAC** que
[`club-hub`](../club-hub) (`cms_roles`/`cms_user_roles`, déjà en place),
avec une interface plus opérationnelle que le back-office administratif
complet.

## Différence avec club-hub

`club-hub` reste le poste de pilotage administratif du club (utilisateurs,
rôles, boutique, sponsors, académie, billetterie, réglages...). `staff-hub`
est l'outil quotidien du staff technique : mêmes comptes (`ADMIN`/
`OBSERVATEUR` via SSO), mêmes rôles/permissions (`cms_roles`), mais un menu
réduit aux modules pertinents pour un coach/adjoint/analyste/préparateur, et
sans les écrans hors de son périmètre (utilisateurs, boutique, sponsors...).

**Aucun changement identity/auth-shared n'était nécessaire** pour cette app
(contrairement à `player-hub`, qui a introduit le rôle `PLAYER`) : le staff
se connecte exactement comme dans `club-hub`, avec le même compte.

## Provisionnement

Rien de spécifique : un compte staff est créé/géré dans `club-hub`
(Utilisateurs, Rôles & permissions), comme aujourd'hui. `staff-hub` ne fait
que lire cette même base de comptes et de rôles.

## Démarrage local

```bash
cp .env.example .env.local   # puis renseigner DB_*, SSO_URL, NOTIFICATION_API_URL
pnpm install
pnpm dev   # http://localhost:3008
```

## Périmètre de cette implémentation

Inclus : tableau de bord, effectif (lecture), calendrier, entraînements
(création + invitation de l'effectif + présences), présences (rapport),
matchs (lecture + création de match amical), convocations (création +
suivi des réponses), composition (formation + titulaires/remplaçants,
tableau plutôt qu'éditeur graphique glisser-déposer), planches tactiques
(lecture seule — l'éditeur graphique reste dans club-hub), statistiques
(lecture + saisie), déplacements (création + ajout de l'effectif + suivi
des réponses de transport), notifications.

Volontairement laissé de côté pour cette itération : édition de fiche
joueur/staff (reste dans club-hub), gestion des véhicules de déplacement
(`cms_trip_vehicles`), éditeur graphique de planches tactiques.

## Gouvernance (STAFF-002 à STAFF-005)

Page `/parametres`, réservée à l'`ADMIN` du club ou à un rôle disposant de la
permission `staffSettings.manage` (catalogue `club-hub`) :

- **Verrouillage de la composition** (`cms_lineup_lock_policies`) : une fois
  activé, la composition (`cms_match_formations`) se verrouille
  automatiquement N minutes avant le coup d'envoi, y compris sans action
  manuelle — la garde vit dans `StaffLineupService.ensureEditable` et
  s'ajoute au workflow DRAFT→PROPOSED→APPROVED→LOCKED existant, elle ne le
  remplace pas.
- **Validation des plans d'entraînement** (`cms_training_approval_policies`,
  colonnes `plan_status`/`submitted_*`/`approved_*` sur `cms_trainings`) :
  quand elle est activée, un plan reste `DRAFT` puis `SUBMITTED` tant qu'un
  autre membre du staff que le proposant ne l'a pas `APPROVED` ; convoquer
  l'effectif à une séance non approuvée est refusé côté serveur.
- **Revue/verrouillage des statistiques post-match**
  (`cms_stat_review_policies`, colonnes `locked_at`/`locked_by` sur
  `cms_player_stats`) : tant que la fenêtre de revue n'est pas écoulée après
  la date du match, les corrections sont libres ; une fois écoulée, un motif
  est obligatoire et la correction est journalisée dans l'audit standard
  (`cms_configuration_audit`, domaine `STAFF_PLAYER_STAT_CORRECTION`). Les
  statistiques saisies sans match identifiable (agrégats de saison) ne sont
  jamais verrouillées.
- **Délégation temporaire de coach principal**
  (`cms_head_coach_delegations`) : bornée à un seul match **ou** à une
  période (jamais les deux, jamais aucun des deux), réservée à un membre du
  staff qualifié du club (`cms_staff.staff_type` = `COACH` ou `ADJOINT`).
  Une délégation active autorise l'approbation/le verrouillage de la
  composition pour ce match en plus du chemin par permission
  `lineups.approve` habituel (voir `canApproveLineup` dans
  `src/app/actions.ts`).

Toutes ces policies sont versionnées et résolues via le contrat partagé
`packages/domain-contracts/src/policy.ts` (GOV-001) : l'absence de ligne de
policy préserve systématiquement le comportement historique.

## Design

Même système que `player-hub`/`seller-portal` (`--sh-*` dans
`src/app/globals.css`), pas le Bootstrap/Skote de `club-hub` — cohérence
visuelle entre les apps « portail » du dépôt.
