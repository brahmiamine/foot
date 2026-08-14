import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { removePushSubscription } from "@/lib/notificationApi";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ deviceId: string }> }) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { deviceId } = await params;
    await removePushSubscription(deviceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("removePushSubscription failed:", error);
    return NextResponse.json({ error: "Impossible de désactiver les notifications" }, { status: 502 });
  }
}
