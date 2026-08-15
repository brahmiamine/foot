import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { FinancialCompliance } from "@/entities/FinancialCompliance";
import { submitFinancialCompliance } from "@/services/FinancialComplianceService";
import { isFinancialComplianceWindowOpen } from "@/services/SeasonRegulatoryCycleService";
import { FinancialComplianceWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/financialCompliance";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const dataSource = await getDataSource();
    const compliance = await dataSource.getRepository(FinancialCompliance).findOne({ where: { id, clubId: session.user.teamId } });
    if (!compliance) return NextResponse.json({ error: "Dossier financier introuvable" }, { status: 404 });
    if (!await isFinancialComplianceWindowOpen(compliance.seasonId, dataSource)) {
      return NextResponse.json({ error: "La campagne de conformité financière est fermée pour cette saison" }, { status: 409 });
    }
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    return NextResponse.json(await submitFinancialCompliance(session.user.teamId, id, actor));
  } catch (error) {
    if (error instanceof FinancialComplianceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting financial compliance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
