import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../packages/auth-shared/src/session";

/**
 * Filet de sécurité global — même principe que club-hub/src/middleware.ts
 * et player-hub/src/middleware.ts : toute l'app (hors /api/logout) est
 * privée, réservée au staff club (ADMIN/OBSERVATEUR avec teamId, jamais
 * SUPERADMIN/PLATFORM_SUPERADMIN/MEMBER/PLAYER). La résolution fine des
 * permissions (lib/access.ts) reste une défense supplémentaire par page.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/logout).*)"],
};

export async function middleware(request: NextRequest) {
  const token = getSsoTokenFromRequest(request);
  const session = token ? await verifySsoTokenWithRevocation(token) : null;

  if (
    session &&
    session.role !== "SUPERADMIN" &&
    session.role !== "PLATFORM_SUPERADMIN" &&
    session.role !== "MEMBER" &&
    session.role !== "PLAYER" &&
    session.teamId
  ) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/login"));
}
