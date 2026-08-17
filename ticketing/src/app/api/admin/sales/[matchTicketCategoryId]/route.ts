import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import {
  TicketSaleGovernanceService,
  type SaleConfigurationInput,
} from "@/services/TicketSaleGovernanceService";

export const runtime = "nodejs";

const service = new TicketSaleGovernanceService();

async function adminContext(request: NextRequest) {
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
  return {
    session,
    clubId: session.teamId,
    actorUserId: session.id,
  } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchTicketCategoryId: string }> },
) {
  const context = await adminContext(request);
  if ("unauthorized" in context) return context.unauthorized;
  try {
    const { matchTicketCategoryId } = await params;
    const rule = await service.getOrCreateRule(
      matchTicketCategoryId,
      context.clubId,
    );
    const settings = await service.getSettings(context.clubId);
    return NextResponse.json({ rule, settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur Ticketing" },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchTicketCategoryId: string }> },
) {
  const context = await adminContext(request);
  if ("unauthorized" in context) return context.unauthorized;
  try {
    const { matchTicketCategoryId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const configuration: SaleConfigurationInput = {
      ...(body.allowedAudience === "PUBLIC" ||
      body.allowedAudience === "HOME_SUPPORTERS" ||
      body.allowedAudience === "AWAY_SUPPORTERS"
        ? { allowedAudience: body.allowedAudience }
        : {}),
      ...(body.audienceValidationMode === "STRICT" ||
      body.audienceValidationMode === "DECLARATIVE"
        ? { audienceValidationMode: body.audienceValidationMode }
        : {}),
      ...(typeof body.maxTicketsPerUser === "number"
        ? { maxTicketsPerUser: body.maxTicketsPerUser }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "startsAt")
        ? {
            startsAt:
              typeof body.startsAt === "string" ? new Date(body.startsAt) : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "endsAt")
        ? {
            endsAt:
              typeof body.endsAt === "string" ? new Date(body.endsAt) : null,
          }
        : {}),
    };
    const rule = await service.updateConfiguration(
      matchTicketCategoryId,
      context.clubId,
      configuration,
    );
    if (typeof body.price === "string" || typeof body.price === "number") {
      await service.updatePrice(
        matchTicketCategoryId,
        context.clubId,
        String(body.price),
      );
    }
    return NextResponse.json({
      rule: await service.getOrCreateRule(
        matchTicketCategoryId,
        context.clubId,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Configuration invalide",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchTicketCategoryId: string }> },
) {
  const context = await adminContext(request);
  if ("unauthorized" in context) return context.unauthorized;
  try {
    const { matchTicketCategoryId } = await params;
    const body = (await request.json()) as { action?: unknown; reason?: unknown };
    let rule;
    switch (body.action) {
      case "SUBMIT":
        rule = await service.submit(
          matchTicketCategoryId,
          context.clubId,
          context.actorUserId,
        );
        break;
      case "APPROVE":
        rule = await service.approve(
          matchTicketCategoryId,
          context.clubId,
          context.actorUserId,
        );
        break;
      case "REJECT":
        rule = await service.reject(
          matchTicketCategoryId,
          context.clubId,
          context.actorUserId,
          typeof body.reason === "string" ? body.reason : "",
        );
        break;
      case "PAUSE":
        rule = await service.pause(matchTicketCategoryId, context.clubId);
        break;
      case "RESUME":
        rule = await service.resume(matchTicketCategoryId, context.clubId);
        break;
      case "CLOSE":
        rule = await service.close(matchTicketCategoryId, context.clubId);
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transition invalide" },
      { status: 400 },
    );
  }
}
