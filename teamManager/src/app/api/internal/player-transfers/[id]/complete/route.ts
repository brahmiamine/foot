import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { completeTransfer, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

/**
 * POST /api/internal/player-transfers/[id]/complete — migration.md §20,
 * homologation. Clôture l'affiliation cms_team_members du club source, en
 * ouvre une au club destination et met à jour Player.teamId dans une seule
 * transaction (voir PlayerTransferService.completeTransfer). Idempotent :
 * un second appel sur un transfert déjà COMPLETED échoue en 400 sans rien
 * rejouer.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const approvedBy = typeof body?.approvedBy === "string" ? body.approvedBy : null;

  try {
    const transfer = await completeTransfer(id, approvedBy);
    return NextResponse.json(transfer);
  } catch (error) {
    if (error instanceof PlayerTransferError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error completing player transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
