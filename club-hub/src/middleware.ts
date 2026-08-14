import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../packages/auth-shared/src/session";

/**
 * Filet de sécurité global pour /admin/* et /api/admin/* : admin/layout.tsx
 * vérifie déjà la session pour les pages (voir src/lib/auth.ts), mais rien
 * ne protégeait /api/admin/* de la même façon, et un nouveau segment de
 * route qui échapperait à ce layout ne serait pas couvert non plus (voir
 * avancement.md, rang 4). Ce middleware protège tout /admin/* et
 * /api/admin/* même dans ce cas — défense en profondeur, ne remplace pas
 * les vérifications existantes.
 *
 * Règle métier conservée (voir src/lib/auth.ts) : un compte SUPERADMIN
 * (sans club) n'a jamais accès à club-hub — seul un compte avec teamId
 * est accepté ici.
 *
 * Importe packages/auth-shared/src/session directement (pas
 * src/lib/ssoSession.ts, qui importe next/headers pour ses variantes
 * Server Components — API non disponible dans un middleware Edge).
 *
 * /api/logout (hors /api/admin/*) reste public de fait : ce middleware ne
 * couvre pas ce chemin, un cookie de session expiré/invalide peut toujours
 * être effacé.
 */
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoTokenWithRevocation(token) : null;

  if (session && session.role !== "SUPERADMIN" && session.role !== "PLATFORM_SUPERADMIN" && session.teamId) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/login"));
}
