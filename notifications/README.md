# notifications

## Rôle

API NestJS centralisant notifications in-app, email et Web Push, préférences, templates, idempotence et livraison asynchrone.

## Authentification

- routes utilisateur : session SSO vérifiée en **RS256/JWKS**, `iss=foot-sso`, `aud=foot-platform` ;
- `SSO_URL` est obligatoire ; aucun `SSO_JWT_SECRET` symétrique n'est utilisé ;
- routes admin : rôle/scopes supplémentaires ;
- `/internal/*` : clés service-to-service distinctes par application ;
- une clé précédente n'est acceptée que si `SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT` est configurée et encore future.

## Données possédées

Base dédiée : `notifications`, `notification_deliveries`, `notification_events`, `notification_preferences`, `notification_user_locales`, `notification_templates`, `push_subscriptions`.

`notifications` ouvre séparément un accès **lecture seule** à `foot` via `DIRECTORY_DB_*` pour résoudre les destinataires.

## Migrations

La base autonome possède désormais une baseline TypeORM versionnée :

`src/database/migrations/1786841100000-BaselineNotificationsSchema.ts`

En production :

```bash
npm run build
npm run migration:run:prod
npm run start:prod
```

La baseline utilise `CREATE TABLE IF NOT EXISTS` afin d'adopter sans destruction les bases historiquement initialisées par `synchronize`. `DB_RUN_MIGRATIONS=true` est disponible, mais une étape de déploiement séparée reste recommandée. Voir [`../docs/architecture/database-migrations.md`](../docs/architecture/database-migrations.md).

## Intégrations

Redis/BullMQ, SMTP/Resend/SendGrid, Web Push/FCM, annuaire MariaDB partagé en lecture et SSO Identity.

## Démarrage et validation

```bash
npm ci
npm run build
npm test
npm run lint
```

Port par défaut : 3010. `openapi.yaml` documente les routes HTTP courantes.

## Limites connues

Le canal SMS reste non implémenté. La disponibilité réelle dépend également de Redis, des workers et des fournisseurs externes ; leur supervision relève de l'infrastructure de déploiement.
