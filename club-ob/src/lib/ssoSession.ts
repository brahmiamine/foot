import { cookies, headers } from "next/headers";
import {
  buildSsoRedirectUrl,
  getSsoCookieName,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";
import { getObTeam } from "@/lib/ob-team";

/**
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md) : type `SsoUser` propre à `ob` (rôles
 * staff + `MEMBER`). Copie en lecture seule, comme dans
 * match-operations/arbinote/federation-hub/club-hub/ticketing — ce site ne signe
 * jamais de session, il ne fait que lire celle posée par `sso`.
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

export function buildMemberLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/membre/login");
}

/**
 * Variante pour les Server Components : reconstruit l'URL absolue de l'app
 * et transporte aussi l'identifiant OB vers Identity. Ainsi un nouvel
 * utilisateur qui passe par « créer un compte » reste soumis à la policy
 * d'inscription MEMBER du club au lieu de retomber sur le parcours global.
 */
export async function buildMemberLoginUrlForPath(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const currentUrl = `${proto}://${host}${path}`;
  const loginUrl = new URL(buildMemberLoginUrl(currentUrl));
  const team = await getObTeam();
  if (team?.id) loginUrl.searchParams.set("teamId", team.id);
  return loginUrl.toString();
}

export function buildLogoutUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/api/logout");
}