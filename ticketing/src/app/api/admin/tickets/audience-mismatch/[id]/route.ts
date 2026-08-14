import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { dismissAudienceMismatch } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// PATCH /api/admin/tickets/audience-mismatch/[id] — traite le signal
// (revu par un admin), sans jamais annuler le billet ni bloquer l'accès.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await dismissAudienceMismatch(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
