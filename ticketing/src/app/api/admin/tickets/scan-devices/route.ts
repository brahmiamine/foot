import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { ScanDeviceService } from "@/services/ScanDeviceService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new ScanDeviceService();

async function context(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return { unauthorized } as const;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) {
    return { unauthorized: NextResponse.json({ error: "Scope club requis" }, { status: 403 }) } as const;
  }
  return { session, clubId: session.teamId, actorUserId: session.id } as const;
}

// GET /api/admin/tickets/scan-devices — appareils enregistrés pour le club.
export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  try {
    const devices = await service.listForClub(ctx.clubId);
    return NextResponse.json({ devices });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/tickets/scan-devices { label } — le secret n'est renvoyé qu'une fois.
export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if ("unauthorized" in ctx) return ctx.unauthorized;
  try {
    const body = (await request.json().catch(() => ({}))) as { label?: string };
    const result = await service.register(ctx.clubId, body.label ?? "", ctx.actorUserId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
