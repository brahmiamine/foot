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
 * Wrapper Server Components au-dessus de la vérification JWT partagée —
 * même pattern que club-hub/src/lib/ssoSession.ts et
 * player-hub/src/lib/ssoSession.ts. medical-hub réutilise le login STAFF
 * standard ("/login", ADMIN/OBSERVATEUR avec teamId), pas "/joueur/login"
 * ni "/membre/login" : un membre du staff se connecte exactement comme
 * dans club-hub, avec le même compte.
 */

export interface SsoMedicalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
}

export async function verifySessionToken(token: string): Promise<SsoMedicalUser | null> {
  return (await verifySsoTokenWithRevocation(token)) as SsoMedicalUser | null;
}

export async function getSsoSessionFromRequest(request: NextRequest): Promise<SsoMedicalUser | null> {
  const token = getSsoTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoSession(): Promise<SsoMedicalUser | null> {
  const store = await cookies();
  const token = store.get(getSsoCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getSsoCookieName())?.value ?? null;
}

export function buildLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/login");
}

export async function buildLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  return buildLoginUrl(currentUrl);
}

export function clearSsoCookie(response: NextResponse) {
  return clearSharedSsoCookie(response);
}
