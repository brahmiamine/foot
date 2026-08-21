import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { TicketPromotionService } from "@/services/TicketPromotionService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new TicketPromotionService();

// GET /api/admin/tickets/promotions?matchTicketCategoryId=...
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const matchTicketCategoryId = request.nextUrl.searchParams.get("matchTicketCategoryId")?.trim();
    if (!matchTicketCategoryId) return NextResponse.json({ error: "matchTicketCategoryId manquant." }, { status: 400 });
    const promotions = await service.listForCategory(matchTicketCategoryId);
    return NextResponse.json({ promotions });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/tickets/promotions { matchTicketCategoryId, code, discountType, discountValue, maxUses?, startsAt?, endsAt? }
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) return NextResponse.json({ error: "Scope club requis" }, { status: 403 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const promotion = await service.create(session.teamId, session.id, {
      matchTicketCategoryId: String(body.matchTicketCategoryId ?? ""),
      code: String(body.code ?? ""),
      discountType: body.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
      discountValue: String(body.discountValue ?? ""),
      maxUses: typeof body.maxUses === "number" ? body.maxUses : null,
      startsAt: typeof body.startsAt === "string" ? new Date(body.startsAt) : null,
      endsAt: typeof body.endsAt === "string" ? new Date(body.endsAt) : null,
    });
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
