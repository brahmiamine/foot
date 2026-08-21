import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { SeasonPassService } from "@/services/SeasonPassService";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new SeasonPassService();

// POST /api/tickets/season-passes/[id]/redeem { matchTicketCategoryId }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { matchTicketCategoryId?: string };
    const ticket = await service.redeem(id, String(body.matchTicketCategoryId ?? ""), session.id);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
