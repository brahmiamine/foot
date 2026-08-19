import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentSession } from "@/lib/session";
import { revokeUserSession } from "@/lib/sessionRegistry";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/** Révoque une session du compte courant, jamais celle d'un autre utilisateur. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const revoked = await revokeUserSession(session.id, id);
  if (!revoked) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const response = NextResponse.json({ success: true, current: session.sessionId === id });
  return session.sessionId === id ? clearSessionCookie(response) : response;
}
