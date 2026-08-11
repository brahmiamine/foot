import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  clearSsoCookie as clearSharedSsoCookie,
  getSsoCookieName,
  getSsoTokenFromRequest,
  verifySsoToken,
} from "../../../packages/auth-shared/src/session";

/**
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) : type `SsoUser` propre à teamManager
 * (rôles staff uniquement) et helpers Server Components (`cookies()`/
 * `headers()`, non disponibles dans packages/auth-shared car incompatibles
 * Edge Runtime).
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";
  teamId: string | null;
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  return (await verifySsoToken(token)) as SsoUser | null;
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
 * Variante pour les Server Components (pas de NextRequest disponible) :
 * reconstruit l'URL absolue de l'app à partir des en-têtes de la requête
 * entrante, pour que `sso` puisse rediriger vers le bon hôte après connexion.
 */
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
