import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { ScanDeviceService } from "@/services/ScanDeviceService";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";
const service = new ScanDeviceService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;
  const session = await getSsoSessionFromRequest(request);
  if (!session?.teamId) return NextResponse.json({ error: "Scope club requis" }, { status: 403 });

  try {
    const { id } = await params;
    const device = await service.revoke(id, session.teamId, session.id);
    return NextResponse.json({ device });
  } catch (error) {
    return handleApiError(error);
  }
}
