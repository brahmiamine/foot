# identity

## Rôle

Fournisseur d'identité central de FOOT pour staff, administrateurs, arbitres, joueurs et membres. `identity` est le seul service qui signe les sessions SSO.

## Authentification

Les sessions utilisent le cookie `foot_sso_session` et sont signées **RS256 uniquement** :

- issuer `foot-sso` ;
- audience `foot-platform` ;
- `kid` obligatoire ;
- clés publiques exposées par `GET /api/.well-known/jwks.json` ;
- rotation par paire courante/précédente ;
- révocation globale via `tokenVersion` et `/api/session/introspect` ;
- révocation individuelle via le claim `sid` et le registre `identity_user_sessions` ;
- accès temporaire optionnel via la fenêtre `[accessValidFrom, accessValidUntil)` relue en base à chaque login/introspection.

Les tokens HS256 et les tokens de session sans audience ne sont plus acceptés. Les applications consommatrices n'ont pas besoin d'une clé de signature ; elles configurent `SSO_URL`, vérifient le JWKS puis utilisent l'introspection de révocation. Le cache d'introspection partagé borne la propagation d'une révocation ou d'une expiration administrative à 30 secondes côté applications clientes.

Les JWT émis avant le déploiement d'ID-005 ne contiennent pas de `sid`. Ils restent contrôlés par `tokenVersion` et par la fenêtre d'accès persistée, et expirent naturellement au maximum 12 heures après leur émission ; toutes les nouvelles connexions créent une session enregistrée.

Toute modification de `accessValidFrom` ou `accessValidUntil` incrémente `tokenVersion`. Les sessions existantes ne peuvent donc pas redevenir valides si un administrateur prolonge ou supprime ensuite une ancienne fenêtre : une nouvelle authentification est nécessaire après chaque changement de période.

## Fonctionnalités

Connexion staff/membre, inscription membre, Google OAuth, mot de passe oublié/réinitialisé, MFA, profil membre, affiliations équipe, événements de sécurité, gestion des appareils/sessions, accès temporaire des comptes, révocation d'une session, logout global et endpoints internes d'annuaire/provisionnement.

## API principales

`/api/login`, `/api/login/mfa`, `/api/logout`, `/api/logout-everywhere`, `/api/account/sessions`, `/api/account/sessions/[id]`, `/api/register`, `/api/forgot-password`, `/api/reset-password`, `/api/account/password`, `/api/mfa/*`, `/api/security-events`, `/api/session/introspect`, `/api/.well-known/jwks.json`, `/api/health` et les routes internes Identity.

L'écran `/account/sessions` affiche les sessions actives du compte courant avec appareil/navigateur, IP, dernière activité et expiration. Une révocation ciblée est toujours scopée au `userId` authentifié ; révoquer la session courante efface également le cookie local.

Les routes internes de provisioning `POST/PATCH /api/internal/users...` acceptent `accessValidFrom` et `accessValidUntil` sous forme d'instants ISO 8601 (ou `null` pour supprimer une borne). Une fenêtre inversée ou une date invalide est refusée avec `invalid_access_window`.

## Données possédées

Identity possède le cycle de vie `User`, l'unicité email, le hash de mot de passe, l'activation, les fenêtres d'accès temporaire, les rôles/scopes de compte, profils, affiliations membre, challenges MFA, tokens de reset, `tokenVersion`, le registre `identity_user_sessions` et les événements de sécurité. Les autres domaines utilisent les ports/clients Identity ou leurs adapters shared-DB de transition.

## Variables d'environnement

Copier `.env.example` vers `.env.local`. Variables de session critiques :

```env
SSO_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
SSO_JWT_KID=key-id-current
SSO_JWT_PRIVATE_KEY_PREVIOUS=
SSO_JWT_KID_PREVIOUS=
SSO_URL=http://localhost:3004
SSO_COOKIE_NAME=foot_sso_session
SSO_COOKIE_DOMAIN=
```

Ne jamais committer de clé privée réelle. Voir [`docs/jwt-rotation-runbook.md`](./docs/jwt-rotation-runbook.md).

## Démarrage et tests

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Le port utilisé par `start.sh` est 3004. `/api/health` vérifie désormais la base ainsi que `SSO_JWT_PRIVATE_KEY`, `SSO_JWT_KID`, `SSO_COOKIE_NAME` et `SSO_URL`.