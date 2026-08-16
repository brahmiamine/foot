# Runbook — Rotation des clés JWT de session

Les JWT du cookie `foot_sso_session` sont signés **exclusivement en RS256** par `identity`. Chaque clé porte un `kid` et la clé publique correspondante est exposée par `GET /api/.well-known/jwks.json`.

Les consommateurs exigent `iss=foot-sso`, `aud=foot-platform`, un algorithme `RS256` et un `kid` connu. HS256 et les sessions sans audience sont rejetés.

## Rotation sans interruption

1. Générer une nouvelle paire :
   ```bash
   cd identity
   pnpm jwt:generate-keypair
   ```
2. Copier la clé actuelle vers :
   ```env
   SSO_JWT_KID_PREVIOUS=<ancien kid>
   SSO_JWT_PRIVATE_KEY_PREVIOUS=<ancienne clé privée>
   ```
3. Installer la nouvelle clé dans `SSO_JWT_KID` / `SSO_JWT_PRIVATE_KEY`.
4. Déployer `identity`. Le JWKS publie alors la clé courante et la précédente ; les nouvelles sessions utilisent la nouvelle clé.
5. Attendre au moins la durée maximale d'une session (12 h ; 48 h est une marge opérationnelle confortable).
6. Supprimer les variables `*_PREVIOUS` et redéployer.

En cas de compromission de la clé courante, ne conserver aucune fenêtre de grâce pour cette clé : la retirer du JWKS immédiatement et accepter la reconnexion forcée des sessions correspondantes.

## HS256 retiré

La migration HS256 → RS256 est terminée. `SSO_JWT_SECRET` ne doit plus être configuré pour les sessions SSO. Sa présence ne rend aucun jeton HS256 valide dans `identity`, `auth-shared` ou `notifications`.

## Vérification

Après rotation :

- le JWKS contient le nouveau `kid` ;
- une session nouvellement émise porte `alg=RS256`, le nouveau `kid` et `aud=foot-platform` ;
- une session signée par la clé précédente reste valide uniquement tant que cette clé est publiée ;
- un token HS256, sans audience ou avec une autre audience est refusé.
