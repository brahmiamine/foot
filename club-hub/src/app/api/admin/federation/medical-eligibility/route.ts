import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMedicalEligibilitiesForClub, submitMedicalEligibilityForClub } from "@/services/MedicalEligibilityService";
import { MedicalEligibilityWorkflowError } from "../../../../../../../packages/regulatory-shared/src/medicalEligibility";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listMedicalEligibilitiesForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading medical eligibilities:", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.playerId || !body.seasonId || !body.examinationDate) return NextResponse.json({ error: "Joueur, saison et date d'examen requis" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const eligibility = await submitMedicalEligibilityForClub(session.user.teamId, { playerId: String(body.playerId), seasonId: String(body.seasonId), examinationDate: String(body.examinationDate), certificateReference: body.certificateReference ? String(body.certificateReference) : null, documentUrl: body.documentUrl ? String(body.documentUrl) : null }, actor);
    return NextResponse.json(eligibility, { status: 201 });
  } catch (error) {
    if (error instanceof MedicalEligibilityWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting medical eligibility:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
