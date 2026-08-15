import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listFinancialComplianceForClub, upsertFinancialComplianceDraft } from "@/services/FinancialComplianceService";
import { FinancialComplianceWorkflowError } from "../../../../../../../packages/regulatory-shared/src/financialCompliance";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listFinancialComplianceForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading financial compliance:", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.seasonId) return NextResponse.json({ error: "Saison requise" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const item = await upsertFinancialComplianceDraft(session.user.teamId, String(body.seasonId), body as Record<string, string | null | undefined>, actor);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof FinancialComplianceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error saving financial compliance draft:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
