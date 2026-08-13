import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { approveDestinationTransfer, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const approvedBy = typeof body?.approvedBy === "string" ? body.approvedBy : null;
  if (!approvedBy) return NextResponse.json({ error: "approvedBy est requis" }, { status: 400 });

  try {
    return NextResponse.json(await approveDestinationTransfer(id, approvedBy));
  } catch (error) {
    if (error instanceof PlayerTransferError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error approving player transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
