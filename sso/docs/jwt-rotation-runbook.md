# Runbook — Rotation des clés JWT de session (TASK-P0-001)

Les JWT de session (cookie `foot_sso_session`) sont signés en **RS256** par
`sso`. Chaque clé porte un `kid` (key id) publié publiquement sur
`GET /api/.well-known/jwks.json`. Les 6 apps clientes et `notification-api`
vérifient contre ce JWKS (cache 5 min côté client via `jose`
`createRemoteJWKSet`).

## Procédure de rotation (sans interruption de service)

1. **Générer une nouvelle paire de clés** :
   ```bash
   cd sso && pnpm jwt:generate-keypair
   ```
   Affiche `SSO_JWT_KID=...` et `SSO_JWT_PRIVATE_KEY=...` (nouvelle clé).

2. **Basculer l'ancienne clé courante en "previous"** dans le `.env` de
   `sso` :
   ```bash
   SSO_JWT_KID_PREVIOUS=<ancien SSO_JWT_KID>
   SSO_JWT_PRIVATE_KEY_PREVIOUS=<ancien SSO_JWT_PRIVATE_KEY>
   ```

3. **Installer la nouvelle clé comme courante** : remplacer
   `SSO_JWT_KID`/`SSO_JWT_PRIVATE_KEY` par les valeurs générées à l'étape 1.

4. **Déployer `sso`**. À partir de ce déploiement :
   - Les **nouveaux** jetons sont signés avec la nouvelle clé (`kid` mis à
     jour dans `/api/.well-known/jwks.json`).
   - Les jetons déjà émis avec l'**ancienne** clé restent valides : le JWKS
     publie encore les deux clés, `jwtVerify` sélectionne la bonne via le
     `kid` du header du jeton.
   - Les sessions actives (jusqu'à 12h) ne sont donc jamais interrompues.

5. **Attendre la fenêtre de grâce** (recommandé : 48h — supérieure à la
   durée de vie max d'un jeton, 12h pour une session, 5min pour un jeton
   MFA pending) pour être certain qu'aucun jeton signé avec l'ancienne clé
   ne circule plus.

6. **Retirer l'ancienne clé** : supprimer
   `SSO_JWT_KID_PREVIOUS`/`SSO_JWT_PRIVATE_KEY_PREVIOUS` du `.env`,
   redéployer `sso`. Le JWKS ne publie plus que la clé courante.

## Fréquence recommandée

Rotation tous les 30 jours (alignée sur TASK-P0-009, rotation des clés QR
billetterie), ou immédiatement en cas de suspicion de compromission de la
clé privée courante — dans ce cas, sauter l'étape 5 (retirer l'ancienne clé
immédiatement après déploiement, quitte à forcer une reconnexion des
sessions actives signées avec la clé compromise).

## Migration HS256 → RS256 (une seule fois)

`sso` ne signe plus jamais en HS256 depuis TASK-P0-001. `SSO_JWT_SECRET`
reste supporté en **vérification seule** (par `sso`, `packages/auth-shared`
et `notification-api`) jusqu'à ce que tous les jetons HS256 émis avant la
migration aient expiré naturellement (≤12h après le déploiement). Une fois
cette fenêtre passée, `SSO_JWT_SECRET` peut être retiré des `.env` de
toutes les apps sans effet (il ne sert plus qu'à ce fallback).

## Logs

Chaque validation de jeton passe par `decodeProtectedHeader()` pour lire le
`kid` avant vérification. En cas de besoin d'audit, ajouter un log
applicatif au point d'appel (`verifySessionToken` / `verifySsoToken` /
`SsoJwtService.verify`) incluant `header.kid` et l'app appelante.
