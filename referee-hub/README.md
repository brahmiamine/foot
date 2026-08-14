# Referee Hub

Espace privé personnel des arbitres et officiels de match. Cette application reste volontairement séparée d'**ArbiNote**, qui demeure publique et dédiée à la perception/statistique publique des arbitres.

## V1

- authentification centralisée par `identity` ;
- accès limité aux rôles `REFEREE`, `MATCH_OFFICIAL` et `REFEREE_OBSERVER` ;
- tableau de bord avec prochaine désignation, nombre de matchs à venir et notifications non lues ;
- désignations à venir, passées et révoquées ;
- détail d'une désignation, compétition, journée, horaire, stade et équipe arbitrale ;
- rapports complémentaires en brouillon puis envoi définitif après un match terminé ;
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
`SUBMITTED`. Une indisponibilité active est contrôlée dans `match-operations`
avant toute nouvelle affectation, même si le formulaire Federation Hub est
contourné.

La migration `sql/migration_add_referee_private_workflows.sql` est référencée
dans le manifeste commun `db/migrations.manifest`.

## Configuration et lancement

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Port conventionnel dans le script racine : `3008`.

## Validation

```bash
pnpm lint
pnpm test
npx tsc --noEmit
pnpm build
```
