import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { scanSubscription } from "@/lib/subscriptions";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const scanSchema = z.object({
  token: z.string().min(1),
  terminalId: z.string().min(1).optional(),
});

// POST /api/admin/subscriptions/scan { token, terminalId? } — même contrat
// que POST /api/admin/tickets/scan, pour un abonnement (voir
// src/lib/subscriptions.ts, scanSubscription : au plus une validation
// réussie par jour civil, contrairement à un billet).
export async function POST(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) throw new UnauthorizedError("Unauthorized");

    const body = scanSchema.parse(await request.json());
    const result = await scanSubscription(body.token, session.id, body.terminalId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
