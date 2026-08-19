import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import {
  approveMemberRegistration,
  MemberRegistrationError,
  rejectMemberRegistration,
} from "@/lib/memberRegistration";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  const { id, action } = await params;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Action invalide" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    const actorUserId = typeof body?.actorUserId === "string" ? body.actorUserId.trim() : "";
    if (!teamId || !actorUserId) {
      return NextResponse.json({ error: "teamId et actorUserId requis" }, { status: 400 });
    }
    if (action === "approve") {
      const user = await approveMemberRegistration(teamId, id, actorUserId);
      return NextResponse.json({ success: true, userId: user.id });
    }
    const reason = typeof body?.reason === "string" ? body.reason : "";
    await rejectMemberRegistration(teamId, id, actorUserId, reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MemberRegistrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Member registration review error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
