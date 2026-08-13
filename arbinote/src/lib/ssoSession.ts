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
 * packages/auth-shared/README.md) : type `SsoUser` propre à arbinote
 * (rôles staff + `MEMBER`, voir TASK-P0-022) et helpers Server Components
 * (`cookies()`, non disponibles dans packages/auth-shared car incompatibles
 * Edge Runtime).
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER" | "PLATFORM_SUPERADMIN" | "FEDERATION_ADMIN" | "LEAGUE_ADMIN" | "REFEREE" | "MATCH_OFFICIAL" | "REFEREE_OBSERVER";
  teamId: string | null;
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

/**
 * Jeton brut du cookie de session, pour les appels serveur-à-serveur vers
 * notification-api (`Authorization: Bearer <token>`, voir lib/notificationApi.ts).
 * Ne jamais exposer cette valeur au client.
 */
export async function getSsoToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getSsoCookieName())?.value ?? null;
}

export function buildLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/login");
}

export function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildLoginUrl(request.url));
}

/**
 * TASK-P0-022 : login espace membre (distinct du login staff ci-dessus) —
 * un visiteur public souhaitant voter avec une identité vérifiée plutôt
 * qu'anonymement. Même pattern que billetterie/ob (buildMemberLoginUrl).
 */
export function buildMemberLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/login");
}

export function clearSsoCookie(response: NextResponse) {
  return clearSharedSsoCookie(response);
}
