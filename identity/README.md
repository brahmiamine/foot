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
- révocation via `tokenVersion` et `/api/session/introspect`.

Les tokens HS256 et les tokens de session sans audience ne sont plus acceptés. Les applications consommatrices n'ont pas besoin d'une clé de signature ; elles configurent `SSO_URL` et vérifient le JWKS.

## Fonctionnalités

Connexion staff/membre, inscription membre, Google OAuth, mot de passe oublié/réinitialisé, MFA, profil membre, affiliations équipe, événements de sécurité, logout global et endpoints internes d'annuaire/provisionnement.

## API principales

`/api/login`, `/api/login/mfa`, `/api/logout`, `/api/logout-everywhere`, `/api/register`, `/api/forgot-password`, `/api/reset-password`, `/api/account/password`, `/api/mfa/*`, `/api/security-events`, `/api/session/introspect`, `/api/.well-known/jwks.json`, `/api/health` et les routes internes Identity.

## Données possédées

Identity possède le cycle de vie `User`, l'unicité email, le hash de mot de passe, l'activation, les rôles/scopes de compte, profils, affiliations membre, challenges MFA, tokens de reset, `tokenVersion` et événements de sécurité. Les autres domaines utilisent les ports/clients Identity ou leurs adapters shared-DB de transition.

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
