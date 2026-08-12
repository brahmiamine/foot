# `auth-shared` — contrat de lecture des sessions SSO

Ce composant **non déployable** centralise la vérification du JWT émis par
[`sso`](../../sso). Il ne signe aucun jeton et ne contient aucun secret : les
valeurs sensibles restent fournies à l'exécution par l'environnement. Le code
est Edge-safe (pas de `next/headers` ni de dépendance à une version de Next).

## API publique

Le seul point d'entrée est [`src/session.ts`](./src/session.ts). Il exporte :

| Export | Rôle |
|---|---|
| `CookieReader` | Interface structurelle minimale d'une requête ayant un cookie. |
| `CookieWriter` | Interface structurelle minimale d'une réponse sur laquelle supprimer le cookie. |
| `SsoTokenPayload` | Forme normalisée de la session rendue aux applications. |
| `getSsoCookieName()` | Lit `SSO_COOKIE_NAME`, avec `foot_sso_session` par défaut. |
| `verifySsoToken(token)` | Vérifie signature, expiration, issuer et claims obligatoires ; renvoie `null` si le jeton est invalide. |
| `verifySsoTokenWithRevocation(token)` | Ajoute l'introspection auprès de `sso` et un cache de 30 s ; c'est le validateur recommandé. En cas d'indisponibilité de l'introspection, il conserve le résultat cryptographique (fail-open documenté dans le code). |
| `getSsoTokenFromRequest(request)` | Extrait le jeton du cookie partagé sans le valider. |
| `buildSsoRedirectUrl(currentUrl, loginPath?)` | Construit une URL sous `SSO_URL` et ajoute le retour dans `redirect` (`/login` par défaut). |
| `clearSsoCookie(response)` | Expire le cookie sur `/`, en respectant `SSO_COOKIE_DOMAIN`, et rend la réponse reçue. |

Les helpers de validation sont donc `verifySsoToken` (contrôle local) et
`verifySsoTokenWithRevocation` (contrôle local puis révocation distante). Une
application doit préférer le second pour les accès authentifiés. L'extraction
du cookie n'est **pas** une validation.

## Claims de session

Le JWT HS256 émis par `sso` a l'issuer obligatoire `foot-sso`, une durée de vie
de 12 heures et les claims suivants :

| Claim JWT | Champ retourné | Validation / normalisation |
|---|---|---|
| `sub` | `id: string` | Obligatoire. |
| `email` | `email: string` | Obligatoire et chaîne. |
| `name` | `name: string` | Chaîne facultative ; repli sur `email`. |
| `role` | `role: string` | Obligatoire et chaîne ; chaque wrapper consommateur restreint ensuite son union de rôles. |
| `teamId` | `teamId: string \| null` | Chaîne facultative ; toute autre valeur devient `null`. |
| `tokenVersion` | non exposé | Émis par `sso` et contrôlé par l'endpoint d'introspection pour invalider les anciennes sessions. |
| `iss`, `iat`, `exp` | non exposés | Claims standards : issuer vérifié par `jose`, expiration vérifiée lors du `jwtVerify`. |

`SsoTokenPayload` n'est pas une autorisation métier : l'application doit encore
contrôler le rôle et, si nécessaire, le `teamId` attendu.

## Projets consommateurs

Six applications importent directement ce module : `arbinote`, `matchsheet`,
`superadmin`, `teamManager`, `ob` et `billetterie`. Leurs wrappers
`src/lib/ssoSession.ts` ajoutent les unions de rôles et, selon le runtime, les
helpers Server Components. Les middlewares d'`arbinote`, `superadmin` et
`teamManager` l'importent aussi directement. `notification-api` valide le même
contrat dans son service NestJS, mais ne dépend pas de ce module TypeScript.

## Exemple minimal dans une application du monorepo

Exemple pour un middleware Next placé à la racine d'une application sœur :

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../packages/auth-shared/src/session";

export async function middleware(request: NextRequest) {
  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoTokenWithRevocation(token) : null;

  if (!session || session.role !== "SUPERADMIN") {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  return NextResponse.next();
}
```

Configurer `SSO_JWT_SECRET` et, pour l'introspection, `SSO_URL` dans le secret
manager ou le fichier d'environnement local de l'application. Ne jamais mettre
leur valeur dans le code, un exemple ou Git.

## Pourquoi un import relatif

Chaque application conserve son propre lockfile et son déploiement. Ce dossier
n'est donc pas un workspace `pnpm` : les imports utilisent un chemin relatif et
`jose` reste une dépendance directe de chaque application. Une conversion en
package workspace devra être une modification de build explicite.
