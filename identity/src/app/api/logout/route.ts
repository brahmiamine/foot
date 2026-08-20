import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentSession } from "@/lib/session";
import { revokeUserSession } from "@/lib/sessionRegistry";
import { sanitizeRedirect } from "@/lib/redirect";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

async function handleLogout(request: NextRequest) {
  const redirect = sanitizeRedirect(request.nextUrl.searchParams.get("redirect")) ?? "/login";
  const session = await getCurrentSession();
  if (session?.sessionId) {
    await revokeUserSession(session.id, session.sessionId, "LOGOUT");
  }

  // 303 explicite : la déconnexion répond à un POST, un 307/308 par défaut
  // referait suivre un POST vers la page de destination.
  const response = NextResponse.redirect(new URL(redirect, request.url), 303);
  return clearSessionCookie(response);
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return handleLogout(request);
}
