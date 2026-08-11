import { jwtVerify } from "jose";

/**
 * Vérification bas niveau du JWT émis par l'app `sso` (voir
 * sso/src/lib/session.ts pour l'émission). Source unique pour l'issuer, la
 * forme du payload, le nom du cookie et le secret — voir README.md de ce
 * dossier pour pourquoi ce module reste importé par chemin relatif plutôt
 * qu'en package pnpm workspace.
 *
 * Edge-safe à dessein (aucun import de `next/headers`) : utilisable depuis
 * un middleware Next.js, comme dans matchsheet/src/middleware.ts.
 *
 * N'importe volontairement pas `next/server` : ce dossier n'a pas son
 * propre node_modules (voir README.md) et chaque app dépend d'une version
 * de Next différente. `NextRequest`/`NextResponse` satisfont ces
 * interfaces structurellement (mêmes formes que `request.cookies` /
 * `response.cookies` de l'App Router), donc les apps appelantes continuent
 * de passer leurs vrais objets Next sans cast.
 */

export interface CookieReader {
  cookies: { get(name: string): { value?: string } | undefined };
}

export interface CookieWriter {
  cookies: {
    set(options: { name: string; value: string; path?: string; maxAge?: number; domain?: string }): void;
  };
}

export interface SsoTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
}

const ISSUER = "foot-sso";

export function getSsoCookieName(): string {
  return process.env.SSO_COOKIE_NAME || "foot_sso_session";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) throw new Error("SSO_JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}

export async function verifySsoToken(token: string): Promise<SsoTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: ISSUER });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: payload.role,
      teamId: typeof payload.teamId === "string" ? payload.teamId : null,
    };
  } catch {
    return null;
  }
}

export function getSsoTokenFromRequest(request: CookieReader): string | null {
  return request.cookies.get(getSsoCookieName())?.value ?? null;
}

/**
 * @param loginPath Chemin sur l'app `sso` vers lequel rediriger — `/login`
 * (staff/club), `/membre/login` (espace membre), `/api/logout`, etc.
 */
export function buildSsoRedirectUrl(currentUrl: string, loginPath = "/login"): string {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) throw new Error("SSO_URL must be set");
  const url = new URL(loginPath, ssoUrl);
  url.searchParams.set("redirect", currentUrl);
  return url.toString();
}

export function clearSsoCookie<R extends CookieWriter>(response: R): R {
  response.cookies.set({
    name: getSsoCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
    domain: process.env.SSO_COOKIE_DOMAIN || undefined,
  });
  return response;
}
