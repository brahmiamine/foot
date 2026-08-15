import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitBoardMandate } from "@/services/GovernanceService";
import { GovernanceWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/governance";
export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    return NextResponse.json(await submitBoardMandate(session.user.teamId, id, actor));
  } catch (error) {
    if (error instanceof GovernanceWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting board mandate:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
