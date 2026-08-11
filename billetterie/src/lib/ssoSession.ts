import { cookies, headers } from "next/headers";
import {
  buildSsoRedirectUrl,
  getSsoCookieName,
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

export function buildMemberLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/login");
}

/**
 * Vers /membre/profil sur `sso` — page "compléter mon profil" (firstName/
 * lastName/phoneNumber), utilisée quand un achat Paymee est bloqué faute de
 * ces champs (voir lib/memberProfile.ts et app/api/tickets/route.ts).
 */
export function buildMemberProfileUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/profil");
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
