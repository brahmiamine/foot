import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../packages/auth-shared/src/session";

/**
 * Filet de sécurité global pour /admin/* et /api/admin/* : chaque page et
 * route de ce périmètre appelle déjà hasAdminSession()/ensureAdminAuth()
 * individuellement (voir src/lib/adminAuth.ts), mais rien n'empêchait
 * jusqu'ici qu'une nouvelle route oublie cet appel (voir avancement.md,
 * rang 4). Ce middleware protège tout /admin/* et /api/admin/* même si
 * l'appel individuel est absent — défense en profondeur, ne remplace pas
 * les vérifications existantes dans les pages/routes elles-mêmes.
 *
 * Importe packages/auth-shared/src/session directement (pas
 * src/lib/ssoSession.ts, qui importe next/headers pour sa variante Server
 * Components getSsoSession() — API non disponible dans un middleware Edge).
 *
 * /api/admin/logout reste public : un cookie de session expiré/invalide
 * doit pouvoir être effacé même sans session SUPERADMIN valide.
 *
 * migration.md §7/§9 : laisse aussi passer PLATFORM_SUPERADMIN (alias
 * cible de SUPERADMIN) et FEDERATION_ADMIN/LEAGUE_ADMIN — ce filet ne fait
 * qu'un contrôle d'authentification (un compte avec un rôle admin valide
 * existe), PAS d'autorisation fine par ressource. Le périmètre réel de
 * FEDERATION_ADMIN/LEAGUE_ADMIN (leur seule fédération/ligue) reste
 * appliqué route par route via ensureFederationAccess/ensureLeagueAccess
 * (src/lib/adminAuth.ts) — ensureAdminAuth (le gate "accès total") n'est,
 * lui, jamais élargi à ces deux rôles.
 */
const ADMIN_PERIMETER_ROLES = new Set([
  "SUPERADMIN",
  "PLATFORM_SUPERADMIN",
  "FEDERATION_ADMIN",
  "LEAGUE_ADMIN",
]);

function isObserverAssessmentPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/arbitrage/evaluations") ||
    pathname.startsWith("/api/admin/arbitrage/evaluations")
  );
}
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoTokenWithRevocation(token) : null;

  if (
    session?.role &&
    (ADMIN_PERIMETER_ROLES.has(session.role) ||
      (session.role === "REFEREE_OBSERVER" && isObserverAssessmentPath(request.nextUrl.pathname)))
  ) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/login"));
}
