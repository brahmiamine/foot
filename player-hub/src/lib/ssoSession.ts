import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  clearSsoCookie as clearSharedSsoCookie,
  getSsoCookieName,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

/**
 * Wrapper Server Components au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) — même pattern que club-hub/src/lib/ssoSession.ts,
 * réduit à ce dont player-hub a besoin. `loginPath` par défaut "/joueur/login"
 * (voir identity/src/app/joueur/login), jamais "/login" (staff) ni
 * "/membre/login" (espace membre) : un joueur n'est ni l'un ni l'autre.
 */

export interface SsoPlayerUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  playerId: string | null;
}

export async function verifySessionToken(token: string): Promise<SsoPlayerUser | null> {
  return (await verifySsoTokenWithRevocation(token)) as SsoPlayerUser | null;
}

export async function getSsoSessionFromRequest(request: NextRequest): Promise<SsoPlayerUser | null> {
  const token = getSsoTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoSession(): Promise<SsoPlayerUser | null> {
  const store = await cookies();
  const token = store.get(getSsoCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Jeton brut du cookie de session, pour les appels serveur-à-serveur vers notifications (Authorization: Bearer). */
export async function getSsoToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getSsoCookieName())?.value ?? null;
}

export function buildPlayerLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/joueur/login");
}

export async function buildPlayerLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  return buildPlayerLoginUrl(currentUrl);
}

export function clearSsoCookie(response: NextResponse) {
  return clearSharedSsoCookie(response);
}
