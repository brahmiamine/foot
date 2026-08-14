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
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) : type `SsoUser` propre à club-hub
 * (rôles staff uniquement) et helpers Server Components (`cookies()`/
 * `headers()`, non disponibles dans packages/auth-shared car incompatibles
 * Edge Runtime).
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  // MEMBER ajouté pour la boutique client (/boutique, voir avancement.md) :
  // jusqu'ici cette app ne reconnaissait que les comptes staff. Le
  // middleware (/admin/*, /api/admin/*) reste inchangé et continue
  // d'exiger un teamId de staff — /boutique fait sa propre vérification de
  // rôle, comme /espace-membre côté ob/ticketing.
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER" | "PLATFORM_SUPERADMIN" | "FEDERATION_ADMIN" | "LEAGUE_ADMIN" | "CLUB_ADMIN" | "CLUB_STAFF" | "REFEREE" | "MATCH_OFFICIAL" | "REFEREE_OBSERVER" | "PLAYER";
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
 * notifications (`Authorization: Bearer <token>`, voir lib/notificationApi.ts).
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

/** Variante MEMBER de buildLoginUrl (redirige vers /membre/login, pas /login) — voir /boutique. */
export function buildMemberLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/login");
}

/** Variante MEMBER de buildLoginUrlForPath, voir buildMemberLoginUrl. */
export async function buildMemberLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  return buildMemberLoginUrl(currentUrl);
}

export function clearSsoCookie(response: NextResponse) {
  return clearSharedSsoCookie(response);
}
