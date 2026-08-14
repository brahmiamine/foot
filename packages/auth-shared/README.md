# `auth-shared` — contrat de lecture des sessions SSO

Ce composant **non déployable** centralise la vérification du JWT émis par
[`identity`](../../identity). Il ne signe aucun jeton et ne contient aucun secret : les
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
| `verifySsoTokenWithRevocation(token, failMode?)` | Ajoute l'introspection auprès de `identity` et un cache de 30 s ; c'est le validateur recommandé. Le comportement en cas d'indisponibilité de l'introspection dépend de `failMode` si fourni, sinon de `getSsoRevocationFailureMode()` (TS-29 / TASK-P0-002). Chaque appel d'introspection est journalisé (`console.warn`, événement `sso_introspection`). |
| `getSsoRevocationFailureMode()` | Lit `SSO_REVOCATION_FAILURE_MODE` (`"open"` par défaut, ou `"closed"`) — voir ci-dessous. |
| `getSsoTokenFromRequest(request)` | Extrait le jeton du cookie partagé sans le valider. |
| `buildSsoRedirectUrl(currentUrl, loginPath?)` | Construit une URL sous `SSO_URL` et ajoute le retour dans `redirect` (`/login` par défaut). |
| `clearSsoCookie(response)` | Expire le cookie sur `/`, en respectant `SSO_COOKIE_DOMAIN`, et rend la réponse reçue. |

Les helpers de validation sont donc `verifySsoToken` (contrôle local) et
`verifySsoTokenWithRevocation` (contrôle local puis révocation distante). Une
application doit préférer le second pour les accès authentifiés. L'extraction
du cookie n'est **pas** une validation.

## Claims de session

Le JWT HS256 émis par `identity` a l'issuer obligatoire `foot-sso`, une durée de vie
de 12 heures et les claims suivants :

| Claim JWT | Champ retourné | Validation / normalisation |
|---|---|---|
| `sub` | `id: string` | Obligatoire. |
| `email` | `email: string` | Obligatoire et chaîne. |
| `name` | `name: string` | Chaîne facultative ; repli sur `email`. |
| `role` | `role: string` | Obligatoire et chaîne ; chaque wrapper consommateur restreint ensuite son union de rôles. |
| `teamId` | `teamId: string \| null` | Chaîne facultative ; toute autre valeur devient `null`. |
| `tokenVersion` | non exposé | Émis par `identity` et contrôlé par l'endpoint d'introspection pour invalider les anciennes sessions. |
| `iss`, `iat`, `exp` | non exposés | Claims standards : issuer vérifié par `jose`, expiration vérifiée lors du `jwtVerify`. |

`SsoTokenPayload` n'est pas une autorisation métier : l'application doit encore
contrôler le rôle et, si nécessaire, le `teamId` attendu.

## Projets consommateurs

Neuf applications importent directement ce module : `arbinote`, `match-operations`,
`federation-hub`, `club-hub`, `ob`, `ticketing`, `player-hub`, `staff-hub` et
`medical-hub`. Leurs wrappers `src/lib/ssoSession.ts` ajoutent les unions de
rôles et, selon le runtime, les helpers Server Components. Les middlewares
d'`arbinote`, `federation-hub`, `club-hub`, `player-hub`, `staff-hub` et
`medical-hub` l'importent aussi directement. `notifications` valide le même
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

## Mode d'échec de la révocation (TS-29 / TASK-P0-002)

`verifySsoTokenWithRevocation()` ne peut pas toujours confirmer qu'une
session n'a pas été révoquée (`SSO_URL` non configuré, `identity` injoignable,
timeout, réponse non-200). Le mode appliqué dans ce cas est déterminé par,
dans l'ordre de priorité :

1. Le paramètre `failMode` explicite passé à l'appel (permet à une route
   précise — ex: une confirmation de paiement — de forcer `closed`
   indépendamment du réglage global de l'app).
2. Sinon, `SSO_REVOCATION_FAILURE_MODE` lu dans l'environnement de l'app
   appelante (`getSsoRevocationFailureMode()`) — c'est le "default failMode
   par app depuis .env" : chaque app définit sa propre valeur dans son
   `.env`, aucune configuration centralisée.

Valeurs possibles :

- `open` (par défaut si absent, comportement historique) : on retombe sur le
  résultat cryptographique local (signature/expiration/`tokenVersion`
  valides) — un incident réseau transitoire sur `identity` ne coupe pas le trafic
  authentifié de l'app cliente.
- `closed` : on refuse l'accès tant que `identity` n'a pas confirmé explicitement
  que la session est active.

Matrice de sensibilité et mode recommandé par app :

| App | Sensibilité | Mode recommandé | Raison |
|---|---|---|---|
| `ob` (public/espace membre) | Basse | `open` | Site public, dégrader plutôt que bloquer une panne SSO transitoire |
| `arbinote` (vote public) | Basse | `open` | Même raisonnement — la modération admin reste, elle, `closed` (voir ci-dessous) |
| `ticketing` | Élevée | `closed` | Argent — un incident réseau transitoire sur `identity` ne doit jamais laisser passer une session révoquée sur un parcours de paiement |
| `club-hub` | Élevée | `closed` | Données métier club |
| `match-operations` | Élevée | `closed` | Match en direct, feuille de match officielle |
| `federation-hub` | Élevée | `closed` | Gestion critique de la plateforme |

Chaque app définit sa propre valeur dans son `.env` — voir
`match-operations/.env.example`, `federation-hub/.env.example`,
`club-hub/.env.example` et `ticketing/.env.example` pour l'exemple
`closed`. `ticketing` est fail-**closed** par défaut malgré son trafic
public (contrairement à `ob`/`arbinote`) : c'est la seule des 3 apps
"publiques" à manipuler de l'argent directement, ce qui change l'arbitrage
disponibilité/sécurité.

### SLA `identity`

`identity` est une dépendance critique pour toutes les apps en mode `closed` : une
indisponibilité de `identity` bloque alors l'accès aux apps concernées, pas
seulement l'introspection de révocation (l'ensemble du flux d'authentification
transite par `identity` — connexion, JWKS pour la vérification des jetons, voir
TASK-P0-001). Il n'existe pas d'infrastructure de monitoring/SLA formalisée
dans ce repo à ce jour (pas de dashboard, pas d'alerting) — un SLA chiffré ne
peut donc pas être documenté honnêtement ici tant que cette instrumentation
n'existe pas (voir TASK-P1-002, observabilité). Recommandation opérationnelle
en attendant : `identity` doit être déployé avec une disponibilité au moins égale
à celle de l'app la plus stricte qui en dépend (`federation-hub`/`match-operations`,
`closed`), et son incident le plus courant (timeout d'introspection) est déjà
borné à 2s côté client (`REVOCATION_FETCH_TIMEOUT_MS`, session.ts).

## Pourquoi un import relatif

Chaque application conserve son propre lockfile et son déploiement. Ce dossier
n'est donc pas un workspace `pnpm` : les imports utilisent un chemin relatif et
`jose` reste une dépendance directe de chaque application. Une conversion en
package workspace devra être une modification de build explicite.
