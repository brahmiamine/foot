import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { getTransferById } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

/** GET /api/internal/player-transfers/[id] — lecture directe sans dépendre de la limite de la liste. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const transfer = await getTransferById(id);
    if (!transfer) return NextResponse.json({ error: "Transfert introuvable" }, { status: 404 });
    return NextResponse.json(transfer);
  } catch (error) {
    console.error("Error fetching player transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
