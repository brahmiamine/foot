import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketTransferService } from "@/services/TicketTransferService";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new TicketTransferService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    if (session.role !== "MEMBER") throw new ForbiddenError("Seul un compte membre peut accepter un transfert.");

    const { id } = await params;
    const transfer = await service.accept(id, session.id, session.email);
    return NextResponse.json({ transfer });
  } catch (error) {
    return handleApiError(error);
  }
}
