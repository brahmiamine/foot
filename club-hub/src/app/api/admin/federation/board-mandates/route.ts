import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBoardMandateForClub, listBoardMandatesForClub } from "@/services/GovernanceService";
import { GovernanceWorkflowError } from "../../../../../../../packages/regulatory-shared/src/governance";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listBoardMandatesForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading board mandates:", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.startsAt || !body.endsAt) return NextResponse.json({ error: "Dates de mandat requises" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const mandate = await createBoardMandateForClub(session.user.teamId, { startsAt: String(body.startsAt), endsAt: String(body.endsAt), electionDocumentUrl: body.electionDocumentUrl ? String(body.electionDocumentUrl) : null }, actor);
    return NextResponse.json(mandate, { status: 201 });
  } catch (error) {
    if (error instanceof GovernanceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error creating board mandate:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
