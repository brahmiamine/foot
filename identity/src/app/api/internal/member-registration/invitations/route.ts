import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import {
  inviteMemberToClub,
  MemberRegistrationError,
} from "@/lib/memberRegistration";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const actorUserId = typeof body?.actorUserId === "string" ? body.actorUserId.trim() : "";
    if (!teamId || !email || !actorUserId) {
      return NextResponse.json({ error: "teamId, email et actorUserId requis" }, { status: 400 });
    }
    const invitation = await inviteMemberToClub({ teamId, email, actorUserId });
    return NextResponse.json(
      { requestId: invitation.requestId, expiresAt: invitation.expiresAt.toISOString() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MemberRegistrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Member invitation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
