import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../packages/auth-shared/src/session";

/**
 * Filet de sécurité global : toute l'app (hors /api/logout) est privée,
 * réservée aux comptes role "PLAYER" scopés à un club ET à un joueur — voir
 * src/lib/auth.ts pour la vérification "page par page" (celle-ci n'est
 * qu'une défense en profondeur, comme club-hub/src/middleware.ts). Importe
 * packages/auth-shared/src/session directement (pas src/lib/ssoSession.ts,
 * qui importe next/headers, indisponible dans un middleware Edge).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/logout).*)"],
};

export async function middleware(request: NextRequest) {
  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoTokenWithRevocation(token) : null;

  if (session && session.role === "PLAYER" && session.teamId && session.playerId) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/joueur/login"));
}
