import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { TicketGrantService } from "@/services/TicketGrantService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new TicketGrantService();

// POST /api/admin/tickets/grants/[id]/reject { reason }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) return NextResponse.json({ error: "Scope club requis" }, { status: 403 });

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const grant = await service.reject(id, session.teamId, session.id, body.reason ?? "");
    return NextResponse.json({ grant });
  } catch (error) {
    return handleApiError(error);
  }
}
