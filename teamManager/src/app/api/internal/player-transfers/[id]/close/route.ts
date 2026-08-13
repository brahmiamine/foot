import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { closeTransfer, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

/**
 * POST /api/internal/player-transfers/[id]/close — annule (`CANCELLED`,
 * retiré par son auteur) ou rejette (`REJECTED`, refusé par la fédération/
 * ligue) un transfert qui n'a pas encore été complété (migration.md §19).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body?.status;
  const reason = typeof body?.reason === "string" ? body.reason : null;

  if (status !== "CANCELLED" && status !== "REJECTED") {
    return NextResponse.json({ error: "status doit être CANCELLED ou REJECTED" }, { status: 400 });
  }

  try {
    const transfer = await closeTransfer(id, { status, reason });
    return NextResponse.json(transfer);
  } catch (error) {
    if (error instanceof PlayerTransferError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error closing player transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
