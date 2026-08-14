import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { closeTransfer, getTransferById, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const transfer = await getTransferById(id);
    if (!transfer) return NextResponse.json({ error: "Transfert introuvable" }, { status: 404 });
    if (transfer.toTeamId !== session.user.teamId) {
      return NextResponse.json({ error: "Seul le club destination peut rejeter cette demande" }, { status: 403 });
    }
    return NextResponse.json(await closeTransfer(id, { status: "REJECTED", reason: typeof body?.reason === "string" ? body.reason : null }));
  } catch (error) {
    if (error instanceof PlayerTransferError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error rejecting transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
