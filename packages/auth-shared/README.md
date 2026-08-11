# auth-shared

Vérification bas niveau du JWT émis par [`sso`](../../sso) (voir
`sso/src/lib/session.ts` pour l'émission) : c'est le point unique où le
format du token, l'`issuer` (`foot-sso`), le nom du cookie et le secret sont
lus — auparavant réécrits à l'identique dans six apps clientes
(`arbinote`, `matchsheet`, `superadmin`, `teamManager`, `ob`, `billetterie`),
avec le risque qu'une correction de sécurité (validation du payload, rotation
de secret, changement d'`issuer`) soit appliquée dans certaines copies et
oubliée dans d'autres.

## Pourquoi un import relatif, pas un package pnpm workspace

Chaque app du dépôt a son propre `pnpm-lock.yaml` et se déploie
indépendamment (voir le README racine, § « Écarts connus »). Transformer ce
dossier en vrai package pnpm workspace (`workspace:*`) changerait la
topologie de build de chaque déploiement — à faire consciemment, pas comme
effet de bord de cette extraction. En attendant, chaque
`ssoSession.ts` importe directement les fichiers de ce dossier par chemin
relatif (`../../../packages/auth-shared/src/session`) ; `jose` reste une
dépendance directe de chaque app (déjà présente partout), ce module ne
déclare donc pas ses propres dépendances npm.

## Contenu

- `src/session.ts` — `verifySsoToken`, `getSsoCookieName`,
  `getSsoTokenFromRequest`, `buildSsoRedirectUrl`, `clearSsoCookie`.
  N'importe que `jose` et des types de `next/server` : compatible Edge
  Runtime, utilisable depuis un `middleware.ts` (cas de `matchsheet`).
  N'importe **pas** `next/headers` (API Server Components, non disponible en
  Edge Middleware).

Chaque app garde son propre `src/lib/ssoSession.ts`, qui :

1. type `SsoUser` avec l'union de rôles pertinente pour cette app (les apps
   back-office staff n'ont pas de rôle `MEMBER`, `ob`/`billetterie` si) ;
2. ajoute ses propres helpers Server Components quand nécessaire
   (`getSsoSession` via `cookies()`, `buildLoginUrlForPath` via `headers()`)
   — ces API ne sont pas dans `auth-shared` car incompatibles Edge Runtime ;
3. délègue toute la vérification JWT et la résolution du cookie/secret à
   `auth-shared`.

Un changement de forme de payload, d'issuer ou de nom de cookie se fait
désormais à un seul endroit (`src/session.ts`), plus dans six fichiers.
