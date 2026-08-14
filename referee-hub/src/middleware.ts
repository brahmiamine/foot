import { NextRequest, NextResponse } from "next/server";
import {
  getSsoTokenFromRequest,
  redirectToIdentity,
  REFEREE_HUB_ROLES,
} from "@/lib/ssoSession";
import { verifySsoTokenWithRevocation } from "../../packages/auth-shared/src/session";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const PUBLIC_PATHS = new Set(["/unauthorized", "/api/health", "/api/logout", "/api/locale"]);

export async function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const token = getSsoTokenFromRequest(request);
  if (!token) return redirectToIdentity(request);

  const session = await verifySsoTokenWithRevocation(token, "closed");
  if (!session) return redirectToIdentity(request);
  if (!REFEREE_HUB_ROLES.has(session.role) || session.teamId) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sso-user-id", session.id);
  requestHeaders.set("x-sso-name", encodeURIComponent(session.name));
  requestHeaders.set("x-sso-email", session.email);
  requestHeaders.set("x-sso-role", session.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
