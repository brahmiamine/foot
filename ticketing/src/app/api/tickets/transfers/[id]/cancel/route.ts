import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketTransferService } from "@/services/TicketTransferService";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new TicketTransferService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");

    const { id } = await params;
    const transfer = await service.cancel(id, session.id);
    return NextResponse.json({ transfer });
  } catch (error) {
    return handleApiError(error);
  }
}
