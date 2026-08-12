import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { listAudienceMismatchTickets } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// GET /api/admin/tickets/audience-mismatch?matchId=... — liste les billets
// dont l'audience déclarée ne correspond pas aux affiliations sso de
// l'acheteur (voir src/lib/tickets.ts, flagAudienceMismatchIfNeeded).
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId") ?? undefined;

    const tickets = await listAudienceMismatchTickets(matchId);
    return NextResponse.json({ tickets });
  } catch (error) {
    return handleApiError(error);
  }
}
