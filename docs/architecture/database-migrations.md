# Migrations des bases autonomes

`payments` et `notifications` disposent de leur propre base et de migrations TypeORM versionnées. `synchronize` reste désactivé en production ; une création ou évolution de schéma de production doit passer par une migration.

## Baselines

Les premières migrations sont des **baselines non destructives** :

- `payments/src/database/migrations/1786841000000-BaselinePaymentsSchema.ts` ;
- `notifications/src/database/migrations/1786841100000-BaselineNotificationsSchema.ts`.

Elles utilisent `CREATE TABLE IF NOT EXISTS`. Cela permet d'adopter une base qui aurait historiquement été initialisée par TypeORM `synchronize` sans supprimer ni recréer ses tables. Sur une base vide, elles créent le schéma courant.

Leur `down()` est volontairement bloqué : une baseline peut avoir adopté des tables préexistantes et ne peut donc pas garantir qu'un rollback destructif serait sûr.

## Déploiement

Après le build et avant le démarrage de la nouvelle version :

```bash
cd payments
npm run migration:run:prod

cd ../notifications
npm run migration:run:prod
```

Les runners utilisent respectivement `payments_migrations` et `notifications_migrations` comme tables de suivi TypeORM.

`DB_RUN_MIGRATIONS=true` permet également d'appliquer les migrations lors du bootstrap NestJS. La stratégie recommandée en production reste une étape de déploiement séparée afin qu'un échec de migration arrête le rollout avant que des instances applicatives nouvelles ne prennent du trafic.

## Nouvelle évolution de schéma

1. modifier l'entité ;
2. ajouter une migration avec un timestamp strictement supérieur à la dernière ;
3. ajouter la migration au tableau `migrations` du data source/config du service ;
4. vérifier `npm run build`, `npm test` et le lint ;
5. tester la migration sur une copie de schéma représentative ;
6. déployer la migration avant les nouvelles instances applicatives.

Ne jamais réactiver `synchronize=true` en production pour remplacer cette procédure.
