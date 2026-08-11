# sso — authentification centralisée

Application Next.js dédiée à l'authentification : c'est la seule app du dépôt `foot` qui **émet** la session partagée. Toutes les autres (`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob`) se contentent de **vérifier** le cookie qu'elle produit, avec une copie en lecture seule de la même logique (`src/lib/ssoSession.ts`).

## Fonctionnalités

- **Connexion staff/club** (`/login`) : email + mot de passe, avec sélecteur de club pour les rôles rattachés à une équipe (`ADMIN`, `OBSERVATEUR`) ; endpoint `POST /api/login`, limité en débit par IP.
- **Espace membre public** (`/membre/login`, `/membre/register`) : création de compte et connexion pour le rôle `MEMBER` (espace supporter), y compris connexion Google (`GET /api/auth/google` puis `GET /api/auth/google/callback`, validation d'état signé, email vérifié requis).
- **Déconnexion** (`POST /api/logout`) : supprime le cookie de session (POST uniquement, pour éviter qu'un lien/image tiers ne déclenche une déconnexion en CSRF via une simple requête `GET`).
- **`GET /api/teams`** : liste publique en lecture seule des clubs (id, nom, nom arabe, logo) pour alimenter le sélecteur de club au login.
- **Affiliations supporter** (`GET`/`POST /api/members/me/affiliations`, `DELETE /api/members/me/affiliations/[teamId]`) : clubs suivis par un compte `MEMBER` (0..N), gérées via `member_team_affiliations` — **distinctes** de `User.teamId`/`session.teamId` qui restent réservés au staff (`ADMIN`/`OBSERVATEUR`, un seul club). Ces affiliations sont purement des préférences d'affichage : elles ne conditionnent aucune autorisation (achat de billet, accès aux données, etc.). `GET` accepte aussi `Authorization: Bearer <token>` (en plus du cookie) pour un appel serveur-à-serveur — `billetterie` l'utilise pour calculer un signal de modération non bloquant (`audienceMismatch`), jamais pour restreindre un achat — voir README racine, section « Billetterie : séparer l'identité du supporter de l'organisateur de l'événement ».
- **Journal de sécurité** (table `security_events`, voir `src/lib/securityLog.ts`) : échec de connexion, rate limit atteint, échec MFA, réinitialisation/changement de mot de passe. Écriture best-effort (ne bloque et ne casse jamais le flux appelant) ; pas de viewer admin dédié dans cette app — interrogation directe de la base, ou via le portail (`/`, section « Activité récente », limité au compte connecté) — voir avancement.md, § 3.B pour la portée exacte de ce journal.
- **Portail de compte** (`/`) : identité (nom/email/rôle/club), changement de mot de passe (`/account/password`, `POST /api/account/password` — exige le mot de passe actuel, distinct de la réinitialisation par email ; réémet la session courante après coup pour ne pas déconnecter l'appareil qui vient de faire l'action, comme `/api/mfa/enable`), MFA pour `SUPERADMIN` (`/account/mfa`), déconnexion globale, et activité récente (les 10 derniers `security_events` du compte).

## CSRF

`SameSite=Lax` sur le cookie de session bloque déjà le CSRF venant d'un
site externe, mais pas entre sous-domaines de la même famille
(`SSO_COOKIE_DOMAIN`) : un script compromis/XSS sur l'une des 6 apps
clientes pourrait sinon forger une requête vers `sso` avec le cookie déjà
présent. `src/lib/csrf.ts` (`isTrustedOrigin`) vérifie `Origin` (repli sur
`Referer`) contre cette même famille — appliqué à toutes les actions
authentifiées par cookie qui changent un état : `/api/login`,
`/api/login/mfa` (le formulaire n'est rendu que par `sso`, ferme le "login
CSRF" — forcer la connexion d'une victime à un compte choisi par
l'attaquant), `/api/logout-everywhere`, `/api/account/password`,
`/api/mfa/setup`/`/enable`/`/disable`, `/api/members/me/profile` (`PATCH`
uniquement — jamais sur un appel `Authorization: Bearer`, qui n'est pas
rejouable par un navigateur), `/api/members/me/affiliations`
(`POST`/`DELETE`). Beaucoup de ces routes exigeaient déjà un secret que
l'attaquant ne peut pas deviner en aveugle (mot de passe, code TOTP) : la
vérification d'origine est une défense en profondeur ajoutée par
cohérence, pas la seule protection.

**Volontairement pas couvert** : `/api/register`, `/api/forgot-password`,
`/api/reset-password` — aucune de ces routes ne s'appuie sur un cookie de
session ambiant (la première ne fait qu'accepter les identifiants fournis
par l'appelant, les deux autres reposent sur un jeton à usage unique connu
seulement du destinataire de l'email) : le CSRF classique (rejouer une
requête avec les identifiants déjà présents dans le navigateur de la
victime) ne s'applique pas à ces flux.

## Mécanisme de session (JWT partagé)

- Signature HS256 via `jose`, secret `SSO_JWT_SECRET` — **doit être strictement identique** dans les 6 apps du dépôt.
- Cookie `SSO_COOKIE_NAME` (par défaut `foot_sso_session`), `httpOnly`, `sameSite=lax`, `secure` en production, `Domain=SSO_COOKIE_DOMAIN` (ex. `.foot.tn`) pour un partage multi-sous-domaines ; vide en local.
- Durée de vie : 12 heures.
- Claims du token : `sub` (id utilisateur), `email`, `name`, `role`, `teamId` (nullable) ; issuer `foot-sso`.
- Rôles gérés (`User.role`) : `ADMIN`, `OBSERVATEUR`, `SUPERADMIN`, `MEMBER`. `ADMIN`/`OBSERVATEUR` sont rattachés à un club (`teamId` obligatoire), `SUPERADMIN` et `MEMBER` n'ont pas de club.

## Base de données

Base MySQL/MariaDB `foot` partagée avec les autres apps (table `User` commune). Migration dans `sql/` :

- `migration_add_member_role.sql` — ajoute la valeur `MEMBER` à l'énumération `role` (changement additif, sans impact sur les autres apps).
- `migration_add_member_team_affiliations.sql` — crée `member_team_affiliations` (table additive, sans impact sur `User`).
- `migration_add_member_profile_fields.sql` — ajoute `firstName`/`lastName`/`phoneNumber` (nullable) à `User`, pour permettre à un membre de compléter son profil (`PATCH /api/members/me/profile`) et débloquer Paymee côté `billetterie`, qui les exige à l'initiation d'un paiement.
- `migration_add_security_events.sql` — crée `security_events` (table additive, sans impact sur `User`) : journal des échecs de connexion, rate limit, échecs MFA et réinitialisations de mot de passe, voir `src/lib/securityLog.ts`.

## Script d'amorçage

```bash
pnpm seed:superadmin
```

Script manuel (`scripts/seed-superadmin.ts`) qui lit `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`/`SUPERADMIN_NAME` et les variables `DB_*`, hache le mot de passe (bcrypt, coût 12, 12 caractères minimum) et crée ou met à jour un utilisateur `SUPERADMIN` directement en base. Jamais exécuté automatiquement.

## Variables d'environnement

Voir [`env.example`](./env.example) : `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (base partagée), `SSO_JWT_SECRET`, `SSO_COOKIE_NAME`, `SSO_COOKIE_DOMAIN`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`/`SUPERADMIN_NAME`.

## Démarrage

```bash
cp env.example .env.local
pnpm install
pnpm run dev   # http://localhost:3004
```

> `sso` n'est pas encore intégré à `../start.sh` (voir `../manquants.md` § 1.1) : il doit être démarré manuellement pour que la connexion fonctionne dans les autres apps.
