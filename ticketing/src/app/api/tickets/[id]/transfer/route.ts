import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketTransferService } from "@/services/TicketTransferService";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new TicketTransferService();

// POST /api/tickets/[id]/transfer { toEmail } — le titulaire du billet demande son transfert.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    if (session.role !== "MEMBER") throw new ForbiddenError("Seul un compte membre peut transférer un billet.");

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { toEmail?: string };
    const transfer = await service.request(id, session.id, body.toEmail ?? "");
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
