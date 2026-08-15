import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAppealsForClub, submitAppealForClub } from "@/services/AppealService";
import { APPEAL_SOURCE_TYPES, AppealWorkflowError, type AppealSourceType } from "../../../../../../../packages/regulatory-shared/src/appeals";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listAppealsForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading appeals:", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.sourceType || !APPEAL_SOURCE_TYPES.includes(body.sourceType as AppealSourceType) || !body.sourceId || !body.grounds) return NextResponse.json({ error: "sourceType, sourceId et grounds sont requis" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const appeal = await submitAppealForClub(session.user.teamId, { sourceType: body.sourceType as AppealSourceType, sourceId: String(body.sourceId), grounds: String(body.grounds), documentUrl: body.documentUrl ? String(body.documentUrl) : null, documentName: body.documentName ? String(body.documentName) : null }, actor);
    return NextResponse.json(appeal, { status: 201 });
  } catch (error) {
    if (error instanceof AppealWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting appeal:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
