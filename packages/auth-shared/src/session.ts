import { createRemoteJWKSet, jwtVerify } from "jose";

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
  federationId: string | null;
  leagueId: string | null;
  playerId: string | null;
  /** Epoch milliseconds of the latest MFA verification represented by this session. */
  mfaVerifiedAt: number | null;
}

const ISSUER = "foot-sso";
export const SSO_JWT_AUDIENCE = "foot-platform";

export function getSsoCookieName(): string {
  return process.env.SSO_COOKIE_NAME || "foot_sso_session";
}

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

export async function verifySsoToken(token: string): Promise<SsoTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRemoteJwks(), {
      issuer: ISSUER,
      audience: SSO_JWT_AUDIENCE,
      algorithms: ["RS256"],
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
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
      mfaVerifiedAt:
        typeof payload.mfaVerifiedAt === "number" && Number.isFinite(payload.mfaVerifiedAt)
          ? payload.mfaVerifiedAt
          : null,
    };
  } catch {
    return null;
  }
}

/** True only when the session contains an MFA proof no older than maxAgeSeconds. */
export function hasRecentMfa(
  payload: Pick<SsoTokenPayload, "mfaVerifiedAt">,
  maxAgeSeconds: number,
  nowMs: number = Date.now(),
): boolean {
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 0) return false;
  if (payload.mfaVerifiedAt == null || !Number.isFinite(payload.mfaVerifiedAt)) return false;
  const ageMs = nowMs - payload.mfaVerifiedAt;
  return ageMs >= 0 && ageMs <= maxAgeSeconds * 1000;
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

export type SsoRevocationFailureMode = "open" | "closed";

export function getSsoRevocationFailureMode(): SsoRevocationFailureMode {
  return process.env.SSO_REVOCATION_FAILURE_MODE === "closed" ? "closed" : "open";
}

export async function verifySsoTokenWithRevocation(
  token: string,
  failMode?: SsoRevocationFailureMode,
): Promise<SsoTokenPayload | null> {
  const payload = await verifySsoToken(token);
  if (!payload) return null;
  const effectiveFailMode = failMode ?? getSsoRevocationFailureMode();
  const now = Date.now();
  const cached = revocationCache.get(token);
  if (cached && cached.expiresAt > now) return cached.active ? payload : null;

  const logIntrospection = (outcome: string, extra: Record<string, unknown> = {}): void => {
    console.warn(JSON.stringify({
      event: "sso_introspection",
      outcome,
      failMode: effectiveFailMode,
      timestamp: new Date().toISOString(),
      ...extra,
    }));
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
