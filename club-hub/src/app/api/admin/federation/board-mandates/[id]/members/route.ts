import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addBoardMember } from "@/services/GovernanceService";
import { BOARD_MEMBER_ROLES, GovernanceWorkflowError, type BoardMemberRole } from "../../../../../../../../../packages/regulatory-shared/src/governance";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.personName || !body.role || !BOARD_MEMBER_ROLES.includes(body.role as BoardMemberRole) || !body.startsAt) return NextResponse.json({ error: "Nom, rôle et date de début requis" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const member = await addBoardMember(session.user.teamId, id, { personName: String(body.personName), userId: body.userId ? String(body.userId) : null, role: body.role as BoardMemberRole, startsAt: String(body.startsAt), endsAt: body.endsAt ? String(body.endsAt) : null, appointmentDocumentUrl: body.appointmentDocumentUrl ? String(body.appointmentDocumentUrl) : null }, actor);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof GovernanceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error adding board member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
