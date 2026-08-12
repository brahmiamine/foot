import { NextRequest, NextResponse } from "next/server";
import { getSsoSessionFromRequest, redirectToLogin } from "@/lib/ssoSession";

/**
 * Protège toutes les routes de feuille de match ([matchId]/*). La page
 * d'accueil ("/", simple écran "sélectionnez un match") reste publique.
 *
 * Seuls les comptes de club (ADMIN/OBSERVATEUR, avec teamId) sont acceptés
 * ici — SUPERADMIN n'a pas accès à matchsheet, même règle que teamManager
 * (voir teamManager/src/lib/auth.ts).
 *
 * L'utilisateur vérifié est transmis aux Server Components via des en-têtes
 * (x-sso-*) pour éviter de revérifier le JWT à chaque page.
 *
 * `/api/internal/*` (TS-31, avancement.md) échappe à cette règle : ce sont
 * des routes service-à-service (clé API, voir lib/serviceAuth.ts), jamais
 * une session SSO — c'est justement par ce chemin que superadmin (qui n'a
 * pas de session matchsheet) doit désormais passer au lieu d'écrire
 * directement dans `ms_sheets`.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }

  const session = await getSsoSessionFromRequest(request);
  if (!session || !session.teamId || session.role === "SUPERADMIN") {
    return redirectToLogin(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sso-user-id", session.id);
  requestHeaders.set("x-sso-team-id", session.teamId);
  requestHeaders.set("x-sso-role", session.role);
  requestHeaders.set("x-sso-name", session.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
