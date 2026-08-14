import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";

/**
 * Vérification bas niveau du JWT émis par l'app `sso` (voir
 * identity/src/lib/session.ts pour l'émission). Source unique pour l'issuer, la
 * forme du payload, le nom du cookie et le secret — voir README.md de ce
 * dossier pour pourquoi ce module reste importé par chemin relatif plutôt
 * qu'en package pnpm workspace.
 *
 * Edge-safe à dessein (aucun import de `next/headers`) : utilisable depuis
 * un middleware Next.js, comme dans match-operations/src/middleware.ts.
 *
 * N'importe volontairement pas `next/server` : ce dossier n'a pas son
 * propre node_modules (voir README.md) et chaque app dépend d'une version
 * de Next différente. `NextRequest`/`NextResponse` satisfont ces
 * interfaces structurellement (mêmes formes que `request.cookies` /
 * `response.cookies` de l'App Router), donc les apps appelantes continuent
 * de passer leurs vrais objets Next sans cast.
 */

export interface CookieReader {
  cookies: { get(name: string): { value?: string } | undefined };
}

export interface CookieWriter {
  cookies: {
    set(options: { name: string; value: string; path?: string; maxAge?: number; domain?: string }): void;
  };
}

export interface SsoTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  /**
   * Scope fédéral/ligue (migration.md §7-8) — présents uniquement pour les
   * rôles FEDERATION_ADMIN/LEAGUE_ADMIN, `null` sinon. Un jeton signé avant
   * TS-28-bis n'a pas ces claims : traités comme `null`, comme pour
   * `teamId` avant lui — aucun compte existant n'est cassé par cet ajout.
   */
  federationId: string | null;
  leagueId: string | null;
  /** Scope PLAYER (club-hub `Player.id`, même base "foot") — `null` pour tout rôle autre que PLAYER. Voir identity/src/entities/User.ts. */
  playerId: string | null;
}

const ISSUER = "foot-sso";

/**
 * TS-28 : audience du JWT émis par `sso` (voir identity/src/lib/session.ts,
 * `SSO_JWT_AUDIENCE`) — une seule audience partagée, pas une par app (voir
 * README.md de ce dossier).
 */
export const SSO_JWT_AUDIENCE = "foot-platform";

export function getSsoCookieName(): string {
  return process.env.SSO_COOKIE_NAME || "foot_sso_session";
}

/**
 * Legacy uniquement (vérification) : SSO_JWT_SECRET signait les jetons
 * HS256 avant TASK-P0-001. `sso` ne signe plus jamais en HS256 — ce
 * fallback ne sert qu'à accepter les jetons émis juste avant un déploiement
 * de cette migration, jusqu'à leur expiration naturelle (≤12h).
 */
function getLegacyHs256Secret(): Uint8Array | null {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * TASK-P0-001 : JWKS distant de `sso` (RS256 + kid), avec cache mémoire —
 * `createRemoteJWKSet` de `jose` gère lui-même le cache (rafraîchi au plus
 * une fois toutes les `cooldownDuration`, ici 5 minutes, conformément aux
 * critères d'acceptation). Un seul JWKS partagé par process (edge-safe :
 * fetch uniquement, pas d'état au-delà du cache interne de `jose`).
 */
let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let remoteJwksUrl: string | null = null;

function getRemoteJwks(): ReturnType<typeof createRemoteJWKSet> {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set to verify RS256 session tokens (JWKS)");
  const jwksUrl = `${ssoUrl.replace(/\/$/, "")}/api/.well-known/jwks.json`;
  if (!remoteJwks || remoteJwksUrl !== jwksUrl) {
    remoteJwks = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 5 * 60 * 1000 });
    remoteJwksUrl = jwksUrl;
  }
  return remoteJwks;
}

/**
 * `aud` vérifié manuellement après `jwtVerify` (pas via son option
 * `audience`, qui rejetterait les jetons pré-migration TS-28 sans ce
 * claim) : un jeton sans `aud` reste accepté (transitoire, voir
 * identity/src/lib/session.ts), un jeton avec un `aud` incorrect est rejeté.
 *
 * TASK-P0-001 : jetons RS256 (courants) vérifiés contre le JWKS de `sso` —
 * `jwtVerify` sélectionne lui-même la bonne clé via le `kid` du header,
 * parmi celles publiées (courante + précédente pendant une rotation).
 * Jetons HS256 (legacy, pré-migration) vérifiés contre SSO_JWT_SECRET s'il
 * est encore configuré, sinon rejetés.
 */
export async function verifySsoToken(token: string): Promise<SsoTokenPayload | null> {
  try {
    const header = decodeProtectedHeader(token);
    let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
    if (header.alg === "HS256") {
      const legacySecret = getLegacyHs256Secret();
      if (!legacySecret) return null;
      ({ payload } = await jwtVerify(token, legacySecret, { issuer: ISSUER }));
    } else {
      ({ payload } = await jwtVerify(token, getRemoteJwks(), { issuer: ISSUER }));
    }
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    if (payload.aud !== undefined) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(SSO_JWT_AUDIENCE)) return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role,
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
      federationId: typeof payload.federationId === "string" ? payload.federationId : null,
      leagueId: typeof payload.leagueId === "string" ? payload.leagueId : null,
      playerId: typeof payload.playerId === "string" ? payload.playerId : null,
    };
  } catch {
    return null;
  }
}

export function getSsoTokenFromRequest(request: CookieReader): string | null {
  return request.cookies.get(getSsoCookieName())?.value ?? null;
}

const REVOCATION_CACHE_TTL_MS = 30_000;
const REVOCATION_FETCH_TIMEOUT_MS = 2_000;
const REVOCATION_CACHE_PRUNE_THRESHOLD = 5_000;

interface RevocationCacheEntry {
  active: boolean;
  expiresAt: number;
}

const revocationCache = new Map<string, RevocationCacheEntry>();

function pruneRevocationCacheIfNeeded(now: number) {
  if (revocationCache.size < REVOCATION_CACHE_PRUNE_THRESHOLD) return;
  for (const [key, entry] of revocationCache) {
    if (entry.expiresAt <= now) revocationCache.delete(key);
  }
}

/**
 * TS-29 : que faire quand la révocation ne peut pas être confirmée
 * (`SSO_URL` absent, panne/timeout de `sso`, réponse non-200) ?
 *
 * - `"open"` (compatibilité historique, valeur par défaut si la variable
 *   n'est pas définie) : on retombe sur le résultat cryptographique de
 *   `verifySsoToken()` — un incident réseau transitoire sur `sso` ne coupe
 *   pas tout le trafic authentifié des apps clientes.
 * - `"closed"` : on refuse l'accès tant que `sso` n'a pas confirmé
 *   explicitement que la session est toujours active — recommandé pour les
 *   back-offices (match-operations, federation-hub, club-hub, voir
 *   avancement.md Epic E08/TS-29) où une fenêtre de tolérance en cas de
 *   panne SSO est un risque plus grand qu'une indisponibilité temporaire.
 *
 * Lu à chaque appel (pas mis en cache au chargement du module) pour rester
 * testable et pour qu'un changement de variable d'environnement soit pris
 * en compte sans redémarrage forcé du process dans les runtimes qui le
 * permettent.
 */
export type SsoRevocationFailureMode = "open" | "closed";

export function getSsoRevocationFailureMode(): SsoRevocationFailureMode {
  return process.env.SSO_REVOCATION_FAILURE_MODE === "closed" ? "closed" : "open";
}

/**
 * verifySsoToken() PUIS révocation réelle auprès de `sso`
 * (GET /api/session/introspect, voir identity/src/app/api/session/introspect),
 * avec un cache en mémoire de 30s par jeton pour ne pas appeler `sso` à
 * chaque requête authentifiée — voir avancement.md, "Propagation de la
 * révocation de session (tokenVersion) aux 6 apps clientes". C'est la
 * fonction à utiliser à la place de verifySsoToken() partout où une
 * révocation (mot de passe changé, MFA modifiée, déconnexion partout) doit
 * fermer l'accès en quelques secondes plutôt qu'en jusqu'à 12h (durée de
 * vie du JWT).
 *
 * Edge-safe (fetch uniquement, cache en mémoire du runtime — best-effort,
 * pas partagé entre instances, ce qui reste cohérent avec le choix "TTL
 * court" plutôt que "cache partagé" documenté dans avancement.md). Quand la
 * révocation ne peut pas être confirmée (SSO injoignable, timeout, `SSO_URL`
 * non configuré), le comportement dépend de `SSO_REVOCATION_FAILURE_MODE`
 * — voir getSsoRevocationFailureMode() (TS-29).
 *
 * TASK-P0-002 : `failMode` (paramètre explicite, optionnel) permet à un
 * appelant de forcer "closed" pour une route précise, indépendamment du
 * réglage global de l'app (ex: une route de paiement dans une app par
 * ailleurs "open" pour son trafic public) — sans ce paramètre, le
 * comportement historique s'applique : `getSsoRevocationFailureMode()` lit
 * `SSO_REVOCATION_FAILURE_MODE` depuis l'environnement de CETTE app (déjà,
 * par construction, un "default failMode par app" : chaque app a son
 * propre .env, voir packages/auth-shared/README.md pour la matrice
 * recommandée).
 */
export async function verifySsoTokenWithRevocation(
  token: string,
  failMode?: SsoRevocationFailureMode,
): Promise<SsoTokenPayload | null> {
  const payload = await verifySsoToken(token);
  if (!payload) return null;

  const effectiveFailMode = failMode ?? getSsoRevocationFailureMode();

  const now = Date.now();
  const cached = revocationCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.active ? payload : null;
  }

  const logIntrospection = (outcome: string, extra: Record<string, unknown> = {}): void => {
    console.warn(
      JSON.stringify({
        event: "sso_introspection",
        outcome,
        failMode: effectiveFailMode,
        timestamp: new Date().toISOString(),
        ...extra,
      }),
    );
  };

  const onUnconfirmedRevocation = (reason: string): SsoTokenPayload | null => {
    logIntrospection("unconfirmed", { reason });
    return effectiveFailMode === "closed" ? null : payload;
  };

  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) return onUnconfirmedRevocation("sso_url_missing");

  try {
    const res = await fetch(`${ssoUrl.replace(/\/$/, "")}/api/session/introspect`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REVOCATION_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return onUnconfirmedRevocation(`http_${res.status}`);

    const body = (await res.json()) as { active?: boolean };
    const active = body.active === true;

    pruneRevocationCacheIfNeeded(now);
    revocationCache.set(token, { active, expiresAt: now + REVOCATION_CACHE_TTL_MS });

    logIntrospection(active ? "active" : "revoked");
    return active ? payload : null;
  } catch (error) {
    return onUnconfirmedRevocation(error instanceof Error ? error.name : "unknown_error");
  }
}

/**
 * @param loginPath Chemin sur l'app `sso` vers lequel rediriger — `/login`
 * (staff/club), `/membre/login` (espace membre), `/api/logout`, etc.
 */
export function buildSsoRedirectUrl(currentUrl: string, loginPath = "/login"): string {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set");
  const url = new URL(loginPath, ssoUrl);
  url.searchParams.set("redirect", currentUrl);
  return url.toString();
}

export function clearSsoCookie<R extends CookieWriter>(response: R): R {
  response.cookies.set({
    name: getSsoCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
    domain: process.env.SSO_COOKIE_DOMAIN || undefined,
  });
  return response;
}
