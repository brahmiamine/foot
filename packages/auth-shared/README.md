# `auth-shared` — contrat de lecture des sessions SSO

Ce composant non déployable centralise la vérification des JWT de session émis par [`identity`](../../identity). Il ne signe aucun jeton et ne contient aucune clé privée. Le code est Edge-safe.

## Contrat cryptographique

Les sessions SSO sont désormais **RS256 uniquement** :

- issuer obligatoire : `foot-sso` ;
- audience obligatoire : `foot-platform` ;
- `kid` sélectionné dans le JWKS publié par `identity` ;
- JWKS : `${SSO_URL}/api/.well-known/jwks.json` ;
- expiration vérifiée par `jose` ;
- les jetons HS256 et les jetons sans `aud` sont rejetés.

`SSO_JWT_SECRET` n'est plus une variable reconnue par ce package. Les applications clientes configurent `SSO_URL` et ne reçoivent aucune clé de signature de session.

## API publique

| Export | Rôle |
|---|---|
| `CookieReader` / `CookieWriter` | Interfaces minimales pour lire/expirer le cookie. |
| `SsoTokenPayload` | Session normalisée. |
| `getSsoCookieName()` | Nom du cookie (`foot_sso_session` par défaut). |
| `verifySsoToken(token)` | Vérification RS256/JWKS, issuer, audience, expiration et claims obligatoires. |
| `verifySsoTokenWithRevocation(token, failMode?)` | Vérification précédente puis introspection de révocation auprès d'Identity, cache 30 s. |
| `getSsoRevocationFailureMode()` | `open` par défaut ou `closed`. |
| `getSsoTokenFromRequest(request)` | Extraction du cookie sans validation. |
| `buildSsoRedirectUrl(...)` | URL de retour vers Identity. |
| `clearSsoCookie(response)` | Expiration du cookie partagé. |

## Claims

| Claim | Normalisation |
|---|---|
| `sub` | `id`, obligatoire. |
| `email` | obligatoire. |
| `name` | repli sur `email`. |
| `role` | obligatoire ; l'autorisation métier reste à la charge de l'application. |
| `teamId` | chaîne ou `null`. |
| `federationId`, `leagueId`, `playerId` | chaîne ou `null`. |
| `iss`, `aud`, `iat`, `exp` | standards ; `iss`, `aud` et `exp` sont vérifiés. |

`SsoTokenPayload` n'est pas une autorisation métier : le consommateur doit toujours appliquer son rôle, son scope et ses permissions.

## Révocation et disponibilité

`verifySsoTokenWithRevocation()` appelle `GET /api/session/introspect` avec un timeout de 2 s et un cache de 30 s.

- `open` : si l'introspection est indisponible, une session cryptographiquement valide reste acceptée ;
- `closed` : l'accès est refusé tant qu'Identity ne confirme pas la session.

Mode recommandé : `closed` pour `ticketing`, `club-hub`, `match-operations`, `referee-hub`, `player-hub`, `staff-hub`, `medical-hub` et `federation-hub`; `open` peut rester acceptable sur les parcours publics non sensibles d'`arbinote` et `club-ob`.

## Dépendances

Le dossier est inclus sous `packages/*` dans le workspace pnpm racine et son install passe désormais par le lockfile partagé unique (`pnpm-lock.yaml` à la racine). Les applications clientes continuent toutefois de l'importer par chemin relatif plutôt que via une dépendance `@foot/auth-shared` déclarée — ce choix architectural est indépendant de la normalisation de l'installation et n'est pas modifié ici.
