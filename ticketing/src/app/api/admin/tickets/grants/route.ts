import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { TicketGrantService } from "@/services/TicketGrantService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new TicketGrantService();

async function context(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return { unauthorized } as const;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) {
    return { unauthorized: NextResponse.json({ error: "Scope club requis" }, { status: 403 }) } as const;
  }
  return { session, clubId: session.teamId, actorUserId: session.id } as const;
}

// GET /api/admin/tickets/grants — file des demandes de billets gratuits/invitations du club.
export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  try {
    const grants = await service.listForClub(ctx.clubId);
    return NextResponse.json({ grants });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/tickets/grants { matchTicketCategoryId, recipientName, recipientEmail?, quantity, reason }
export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const grant = await service.request(ctx.clubId, ctx.actorUserId, {
      matchTicketCategoryId: String(body.matchTicketCategoryId ?? ""),
      recipientName: String(body.recipientName ?? ""),
      recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : null,
      quantity: Number(body.quantity),
      reason: String(body.reason ?? ""),
    });
    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
