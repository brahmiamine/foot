import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { revokeSubscription, unrevokeSubscription } from "@/lib/subscriptions";
import { handleApiError } from "@/lib/api";

// PATCH /api/admin/subscriptions/[id]/revoke { reason? } — révocation
// ciblée, même sémantique que PATCH /api/admin/tickets/[id]/revoke. Voir
// src/lib/subscriptions.ts, revokeSubscription / scanSubscription.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

    await revokeSubscription(id, session.id, reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/subscriptions/[id]/revoke — annule une révocation.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await unrevokeSubscription(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
