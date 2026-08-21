import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { ScanDeviceService } from "@/services/ScanDeviceService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new ScanDeviceService();

// POST /api/admin/tickets/scan-devices/[id]/rotate — nouveau secret, key_version incrémenté, ancien secret rejeté immédiatement.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) return NextResponse.json({ error: "Scope club requis" }, { status: 403 });

  try {
    const { id } = await params;
    const result = await service.rotateSecret(id, session.teamId, session.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
