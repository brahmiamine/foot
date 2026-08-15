import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTransfer, listTransfersForTeam, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listTransfersForTeam(session.user.teamId));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { playerId, toTeamId, transferType, effectiveDate, seasonId, fee, currency, loanStartDate, loanEndDate, notes, agentId, representationAgreementId, intermediaryDeclaration } = body;
    if (!playerId || !toTeamId || !transferType || !effectiveDate) {
      return NextResponse.json({ error: "playerId, toTeamId, transferType et effectiveDate sont requis" }, { status: 400 });
    }
    const transfer = await createTransfer({
      playerId,
      fromTeamId: session.user.teamId,
      toTeamId,
      transferType,
      effectiveDate,
      seasonId: seasonId ?? null,
      fee: fee ?? null,
      currency: currency ?? null,
      loanStartDate: loanStartDate ?? null,
      loanEndDate: loanEndDate ?? null,
      notes: notes ?? null,
      agentId: agentId ?? null,
      representationAgreementId: representationAgreementId ?? null,
      intermediaryDeclaration: intermediaryDeclaration ?? null,
      createdBy: session.user.email,
    });
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof PlayerTransferError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error creating club transfer request:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
