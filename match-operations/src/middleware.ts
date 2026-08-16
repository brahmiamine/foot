import { NextRequest, NextResponse } from "next/server";
import { getSsoSessionFromRequest, redirectToLogin } from "@/lib/ssoSession";
import { normalizeRole } from "../../packages/auth-shared/src/roles";

/**
 * SSO gate for the electronic match sheet. The landing page is protected too:
 * after login, the Node runtime resolves the user's actual match perimeter.
 *
 * Only two populations may enter this application:
 * - club accounts normalised to CLUB_ADMIN / CLUB_STAFF and carrying teamId;
 * - REFEREE accounts without teamId. A REFEREE still needs an ACTIVE
 *   CENTER_REFEREE assignment for each match (MatchAccessService).
 *
 * Federation/league/platform administration stays in federation-hub, and
 * assistants/delegates/observers do not receive a match-operations workspace.
 * `/api/internal/*` remains service-to-service and is authenticated separately.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicStaticAsset(pathname: string): boolean {
  return (
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/fonts/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/internal/") || isPublicStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const session = await getSsoSessionFromRequest(request);
  if (!session) {
    return redirectToLogin(request);
  }

  const role = normalizeRole(session.role);
  const isClubAccount =
    !!session.teamId && (role === "CLUB_ADMIN" || role === "CLUB_STAFF");
  const isCenterRefereeCandidate = !session.teamId && role === "REFEREE";
  if (!isClubAccount && !isCenterRefereeCandidate) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sso-user-id", session.id);
  if (session.teamId) {
    requestHeaders.set("x-sso-team-id", session.teamId);
  }
  requestHeaders.set("x-sso-role", session.role);
  requestHeaders.set("x-sso-name", session.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
