import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listCoachQualificationsForClub, submitCoachQualificationForClub } from "@/services/CoachQualificationService";
import { COACH_QUALIFICATION_TYPES, CoachQualificationWorkflowError, type CoachQualificationType } from "../../../../../../../packages/regulatory-shared/src/coachQualification";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listCoachQualificationsForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading coach qualifications:", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.staffId || !body.qualificationType || !COACH_QUALIFICATION_TYPES.includes(body.qualificationType as CoachQualificationType)) return NextResponse.json({ error: "Staff et type de qualification requis" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const qualification = await submitCoachQualificationForClub(session.user.teamId, { staffId: String(body.staffId), qualificationType: body.qualificationType as CoachQualificationType, licenseNumber: body.licenseNumber ? String(body.licenseNumber) : null, documentUrl: body.documentUrl ? String(body.documentUrl) : null }, actor);
    return NextResponse.json(qualification, { status: 201 });
  } catch (error) {
    if (error instanceof CoachQualificationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting coach qualification:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
