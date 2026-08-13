import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { revokeTicket, unrevokeTicket } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// PATCH /api/admin/tickets/[id]/revoke { reason? } — révocation ciblée
// (TASK-P0-009) : invalide le billet pour le scan avant sa fin de vie
// naturelle, sans annuler le paiement ni le statut PAID. Voir
// src/lib/tickets.ts, revokeTicket / scanTicket.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

    await revokeTicket(id, session.id, reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/admin/tickets/[id]/revoke — annule une révocation (erreur
// d'admin, litige résolu en faveur du porteur).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await unrevokeTicket(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
