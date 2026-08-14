# identity

## Rôle du projet

Fournisseur d'identité central des applications plateforme pour staff, administrateurs et membres.

## Fonctionnalités publiques

Connexion staff et membre, inscription membre, Google OAuth, mot de passe oublié/réinitialisé; compte: changement de mot de passe et MFA; événements de sécurité.

**Pages inventoriées :** `/account/mfa`, `/account/password`, `/forgot-password`, `/login`, `/membre/login`, `/membre/register`, `/`, `/reset-password`, `/security-events`

## Fonctionnalités administratives

Pas de back-office graphique. Script de seed federation-hub et endpoints internes d'introspection/annuaire des équipes.

## API

`/api/account/password`, `/api/auth/google/callback`, `/api/auth/google`, `/api/forgot-password`, `/api/health`, `/api/login/mfa`, `/api/login`, `/api/logout`, `/api/logout-everywhere`, `/api/members/me/affiliations/[teamId]`, `/api/members/me/affiliations`, `/api/members/me/profile`, `/api/mfa/disable`, `/api/mfa/enable`, `/api/mfa/setup`, `/api/register`, `/api/reset-password`, `/api/security-events`, `/api/session/introspect`, `/api/teams`

> Les routes dynamiques (`[id]`, `[matchId]`, etc.) attendent l'identifiant correspondant. Cet inventaire décrit le code présent, pas un contrat d'API versionné.

## Authentification et autorisations

Émet un cookie JWT HS256 (`foot_sso_session` par défaut). Flux MFA: setup avec challenge, activation, validation au login et désactivation; Google utilise state OAuth; CSRF/rate limits sont appliqués aux flux sensibles. Changement/réinitialisation et `logout-everywhere` incrémentent/révoquent les sessions via `tokenVersion`.

## Données possédées

Base `foot`: utilisateurs/équipes partagés; possède profil membre, affiliations membre-équipe 0..N, challenges/enrôlement MFA, jetons de reset et événements de sécurité.

**Migrations réellement présentes :** Ajout rôle/profil membre, affiliations, MFA et challenges, reset de mot de passe, événements de sécurité et `token_version`.

## Intégrations

Google OAuth et SMTP; cookie/secret/issuer partagés avec les consommateurs SSO. Le script racine le lance sur 3004 uniquement si `identity/.env.local` existe.

## Variables d’environnement

Copier le fichier réellement versionné :

```bash
cp .env.example .env.local
```

Variables déclarées dans `.env.example` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME`, `SSO_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Pour les API NestJS, utiliser `.env` si le chargeur de configuration de l'environnement ne lit pas `.env.local`. Ne jamais committer de valeurs réelles.

## Démarrage

Prérequis : Node.js, pnpm, et les dépendances MariaDB/Redis éventuelles configurées.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
```

**Port :** 3004 via `PORT=3004` dans `../start.sh`; sinon défaut Next 3000.

Le script racine `../start.sh` ne lance que `identity`, `referee-center`, `match-operations`, `federation-hub` et `club-hub`, avec MariaDB partagée. Les autres projets se lancent séparément. `payments` et `notifications` possèdent leur base; `marketplace` vise également une base dédiée, tandis que les applications Next métier partagent encore `foot` (seller-portal inclus).

## Tests

`pnpm test:i18n`. Les scripts `lint` des API NestJS utilisent `--fix` et peuvent donc modifier les fichiers.

## Limites connues

JWT symétrique: tous les vérificateurs qui connaissent le secret pourraient signer un token; rotation/gestion des secrets est opérationnelle. Un cookie ne traverse pas `platform.tn` vers `ob.tn`. Pas d'interface d'administration des comptes.
