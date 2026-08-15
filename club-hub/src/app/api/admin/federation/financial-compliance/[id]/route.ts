import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFinancialComplianceBundleForClub } from "@/services/FinancialComplianceService";
import { FinancialComplianceWorkflowError } from "../../../../../../../../packages/regulatory-shared/src/financialCompliance";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    return NextResponse.json(await getFinancialComplianceBundleForClub(session.user.teamId, id));
  } catch (error) {
    if (error instanceof FinancialComplianceWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("Error loading financial compliance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
