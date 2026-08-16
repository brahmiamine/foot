# Referee Hub

Espace privé personnel des arbitres et officiels de match. Cette application reste volontairement séparée d'**ArbiNote**, qui demeure publique et dédiée à la perception/statistique publique des arbitres.

## V1

- authentification centralisée par `identity` ;
- accès limité aux rôles `REFEREE`, `MATCH_OFFICIAL` et `REFEREE_OBSERVER` ;
- tableau de bord avec prochaine désignation, nombre de matchs à venir et notifications non lues ;
- désignations à venir, passées et révoquées ;
- détail d'une désignation, compétition, journée, horaire, stade et équipe arbitrale ;
- rapports d'officiels en brouillon puis envoi définitif après un match terminé : rapport complémentaire pour arbitres, rapport de commissaire de match et rapport d'observateur d'arbitres ;
- catégorisation contrôlée des rapports (`GENERAL`, `SECURITY`, `ORGANIZATION`, `DISCIPLINE`, `TECHNICAL`, `OTHER`) ;
- déclaration et annulation des indisponibilités ;
- historique complet des désignations et révocations ;
- profil alimenté par `User` (Identity) et, lorsqu'il existe, par le profil métier `arbitres` ;
- lien sécurisé vers `match-operations`.

## Modèle de sécurité

Le navigateur ne transmet jamais un `userId` pour demander les désignations. Le middleware valide le cookie Identity, puis le service exécute toujours ses lectures avec le `sub` du JWT :

```sql
WHERE match_official_assignments.user_id = :sessionUserId
```

Le détail applique simultanément `assignment.id = :routeId` et `user_id = :sessionUserId`. Un identifiant de désignation appartenant à un autre officiel retourne donc 404. `match-operations` refait ensuite son propre contrôle d'affectation active avant d'ouvrir la feuille.

Le même principe s'applique aux rapports et aux indisponibilités. Les brouillons
ne sont visibles que par leur auteur ; Federation Hub ne lit que les rapports
`SUBMITTED`. Le type de rapport n'est jamais accepté depuis le navigateur :
`referee-hub` le dérive de la désignation officielle (`CENTER_REFEREE`,
`MATCH_DELEGATE`, `REFEREE_OBSERVER`, etc.). Une indisponibilité active est
contrôlée dans `match-operations` avant toute nouvelle affectation, même si le
formulaire Federation Hub est contourné.

Les migrations `sql/migration_add_referee_private_workflows.sql` et
`sql/migration_extend_match_reports_for_officials.sql` sont référencées dans
le manifeste commun `db/migrations.manifest`.

Les nouveaux parcours conservent l’interface responsive bilingue FR/AR et le
support RTL du portail.

## Configuration et lancement

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Port conventionnel dans le script racine : `3009` (`3008` est réservé à `staff-hub`).

## Validation

```bash
pnpm lint
pnpm test
npx tsc --noEmit
pnpm build
```
