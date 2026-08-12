import { jwtVerify } from "jose";

/**
 * Vérification bas niveau du JWT émis par l'app `sso` (voir
 * sso/src/lib/session.ts pour l'émission). Source unique pour l'issuer, la
 * forme du payload, le nom du cookie et le secret — voir README.md de ce
 * dossier pour pourquoi ce module reste importé par chemin relatif plutôt
 * qu'en package pnpm workspace.
 *
 * Edge-safe à dessein (aucun import de `next/headers`) : utilisable depuis
 * un middleware Next.js, comme dans matchsheet/src/middleware.ts.
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
}

const ISSUER = "foot-sso";

export function getSsoCookieName(): string {
  return process.env.SSO_COOKIE_NAME || "foot_sso_session";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("SSO_JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function verifySsoToken(token: string): Promise<SsoTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: ISSUER });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role,
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
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
 * verifySsoToken() PUIS révocation réelle auprès de `sso`
 * (GET /api/session/introspect, voir sso/src/app/api/session/introspect),
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
 * court" plutôt que "cache partagé" documenté dans avancement.md). Si `sso`
 * est injoignable (panne, timeout) ou si `SSO_URL` n'est pas configuré, on
 * retombe sur le résultat de verifySsoToken() (fail-open) plutôt que de
 * couper tout le trafic authentifié des 6 apps clientes pour un incident
 * réseau transitoire — seule une révocation confirmée par `sso` invalide le
 * jeton.
 */
export async function verifySsoTokenWithRevocation(token: string): Promise<SsoTokenPayload | null> {
  const payload = await verifySsoToken(token);
  if (!payload) return null;

  const now = Date.now();
  const cached = revocationCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.active ? payload : null;
  }

  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) return payload;

  try {
    const res = await fetch(`${ssoUrl.replace(/\/$/, "")}/api/session/introspect`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REVOCATION_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return payload;

    const body = (await res.json()) as { active?: boolean };
    const active = body.active === true;

    pruneRevocationCacheIfNeeded(now);
    revocationCache.set(token, { active, expiresAt: now + REVOCATION_CACHE_TTL_MS });

    return active ? payload : null;
  } catch {
    return payload;
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
