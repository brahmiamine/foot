import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoCookieName,
  getSsoTokenFromRequest,
  verifySsoToken,
} from "../../../packages/auth-shared/src/session";

/**
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) : type `SsoUser` propre à `billetterie`
 * (rôles staff + `MEMBER`). Copie en lecture seule, comme dans
 * ob/matchsheet/arbinote/superadmin/teamManager — ce site ne signe jamais
 * de session, il ne fait que lire celle posée par `sso`.
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER";
  teamId: string | null;
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  return (await verifySsoToken(token)) as SsoUser | null;
}

export async function getSsoSession(): Promise<SsoUser | null> {
  const store = await cookies();
  const token = store.get(getSsoCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSsoSessionFromRequest(request: NextRequest): Promise<SsoUser | null> {
  const token = getSsoTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Jeton brut du cookie de session, pour les appels serveur-à-serveur vers
 * `sso` (`Authorization: Bearer <token>`, voir src/lib/ssoProfileClient.ts).
 * Ne jamais exposer cette valeur au client.
 */
export async function getSsoToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getSsoCookieName())?.value ?? null;
}

export function buildMemberLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/login");
}

/**
 * Login staff (ADMIN/SUPERADMIN/OBSERVATEUR) — distinct de
 * buildMemberLoginUrl, qui redirige vers l'espace membre. Utilisé par les
 * pages sous /admin (voir src/lib/adminAuth.ts).
 */
export function buildAdminLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/login");
}

/**
 * Variante pour les Server Components (pas de NextRequest disponible) :
 * reconstruit l'URL absolue de l'app à partir des en-têtes de la requête
 * entrante, pour que `sso` puisse rediriger vers le bon hôte après connexion.
 */
export async function buildMemberLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  return buildMemberLoginUrl(currentUrl);
}

/** Variante staff de buildMemberLoginUrlForPath, voir buildAdminLoginUrl. */
export async function buildAdminLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  return buildAdminLoginUrl(currentUrl);
}
