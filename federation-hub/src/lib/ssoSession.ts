import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  clearSsoCookie as clearSharedSsoCookie,
  getSsoCookieName,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

/**
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) : type `SsoUser` propre à federation-hub
 * (rôles staff uniquement) et helpers Server Components (`cookies()`, non
 * disponibles dans packages/auth-shared car incompatibles Edge Runtime).
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "PLATFORM_SUPERADMIN" | "FEDERATION_ADMIN" | "LEAGUE_ADMIN" | "REFEREE" | "MATCH_OFFICIAL" | "REFEREE_OBSERVER";
  teamId: string | null;
  /** Scope FEDERATION_ADMIN (migration.md §7-8), `null` pour tout autre rôle. */
  federationId: string | null;
  /** Scope LEAGUE_ADMIN (migration.md §7-8), `null` pour tout autre rôle. */
  leagueId: string | null;
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  return (await verifySsoTokenWithRevocation(token)) as SsoUser | null;
}

export async function getSsoSessionFromRequest(request: NextRequest): Promise<SsoUser | null> {
  const token = getSsoTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoSession(): Promise<SsoUser | null> {
  const store = await cookies();
  const token = store.get(getSsoCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function buildLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/login");
}

export function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildLoginUrl(request.url));
}

export function clearSsoCookie(response: NextResponse) {
  return clearSharedSsoCookie(response);
}
