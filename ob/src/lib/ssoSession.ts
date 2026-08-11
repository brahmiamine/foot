import { jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

/**
 * Vérification du cookie de session émis par l'app `sso` (voir
 * sso/src/lib/session.ts pour l'émission). Copie en lecture seule, comme
 * dans matchsheet/arbinote/superadmin/teamManager — ce site ne signe jamais
 * de session, il ne fait que lire celle posée par `sso`.
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "MEMBER";
  teamId: string | null;
}

const COOKIE_NAME = process.env.SSO_COOKIE_NAME || "foot_sso_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("SSO_JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(token: string): Promise<SsoUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: "foot-sso" });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role as SsoUser["role"],
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
    };
  } catch {
    return null;
  }
}

export async function getSsoSession(): Promise<SsoUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
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
  return store.get(COOKIE_NAME)?.value ?? null;
}

export function buildMemberLoginUrl(currentUrl: string): string {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set");
  const loginUrl = new URL("/membre/login", ssoUrl);
  loginUrl.searchParams.set("redirect", currentUrl);
  return loginUrl.toString();
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

export function buildLogoutUrl(currentUrl: string): string {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set");
  const logoutUrl = new URL("/api/logout", ssoUrl);
  logoutUrl.searchParams.set("redirect", currentUrl);
  return logoutUrl.toString();
}
