import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  clearSsoCookie,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

/**
 * Wrapper local au-dessus de la vérification JWT partagée (voir
 * packages/auth-shared/README.md), avec le type `SsoUser` propre à
 * match-operations.
 *
 * Contrairement aux autres apps (referee-center/federation-hub/club-hub), ce
 * fichier n'importe volontairement PAS `next/headers` (cookies()) : il est
 * chargé par le middleware, qui tourne dans un contexte où `next/headers`
 * n'est pas utilisable. Les Server Components lisent l'utilisateur via les
 * en-têtes que le middleware transmet (x-sso-*), pas en revérifiant le JWT.
 */

export interface SsoUser {
  id: string;
  email: string;
  name: string;
  role:
    | "ADMIN"
    | "OBSERVATEUR"
    | "SUPERADMIN"
    | "PLATFORM_SUPERADMIN"
    | "FEDERATION_ADMIN"
    | "LEAGUE_ADMIN"
    | "REFEREE"
    | "MATCH_OFFICIAL"
    | "REFEREE_OBSERVER";
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

export function buildLoginUrl(currentUrl: string): string {
  return buildSsoRedirectUrl(currentUrl, "/login");
}

export function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildLoginUrl(request.url));
}

export { clearSsoCookie };
