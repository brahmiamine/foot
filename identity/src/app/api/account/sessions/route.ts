import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listUserSessions } from "@/lib/sessionRegistry";

export const runtime = "nodejs";

/** Liste uniquement les sessions actives de la génération courante du compte connecté. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const sessions = await listUserSessions(session.id, session.tokenVersion, session.sessionId);
  return NextResponse.json({ sessions });
}
