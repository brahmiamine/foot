import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoTokenFromRequest,
  verifySsoToken,
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
 */
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoToken(token) : null;

  if (session?.role === "SUPERADMIN") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/login"));
}
