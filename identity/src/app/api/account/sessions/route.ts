import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listUserSessions } from "@/lib/sessionRegistry";

export const runtime = "nodejs";

/** Liste uniquement les sessions actives appartenant au compte connecté. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const sessions = await listUserSessions(session.id, session.sessionId);
  return NextResponse.json({ sessions });
}
