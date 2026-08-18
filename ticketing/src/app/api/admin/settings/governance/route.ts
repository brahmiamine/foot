import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { TicketSaleGovernanceService } from "@/services/TicketSaleGovernanceService";

export const runtime = "nodejs";
const service = new TicketSaleGovernanceService();

async function context(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return { unauthorized } as const;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId)
    return {
      unauthorized: NextResponse.json(
        { error: "Scope club requis" },
        { status: 403 },
      ),
    } as const;
  return { session, clubId: session.teamId, actorUserId: session.id } as const;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  return NextResponse.json(await service.getSettings(ctx.clubId));
}

export async function PUT(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(
      await service.updateSettings(ctx.clubId, ctx.actorUserId, {
        ...(Object.prototype.hasOwnProperty.call(body, "saleApprovalRequired")
          ? { saleApprovalRequired: body.saleApprovalRequired as boolean }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "makerCheckerEnabled")
          ? { makerCheckerEnabled: body.makerCheckerEnabled as boolean }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(
          body,
          "priceReapprovalRequired",
        )
          ? { priceReapprovalRequired: body.priceReapprovalRequired as boolean }
          : {}),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paramètres invalides" },
      { status: 400 },
    );
  }
}
