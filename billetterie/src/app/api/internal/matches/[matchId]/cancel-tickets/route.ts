import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { cancelMatchTickets } from "@/lib/matchCancellationRefunds";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/internal/matches/[matchId]/cancel-tickets — TASK-P0-003
 * (todo.md). Service-à-service uniquement (x-api-key, voir
 * lib/serviceAuth.ts). Appelée par superadmin juste après avoir marqué le
 * match `CANCELLED` (voir cancelMatchAdmin) : ferme la vente (billets
 * PENDING -> CANCELLED) et ouvre un dossier de remboursement pour chaque
 * paiement PAID sur ce match. Idempotente — un rejeu (retry réseau,
 * scheduler de rattrapage, superadmin qui rappelle après un timeout) ne
 * refait jamais deux fois le même travail, voir matchCancellationRefunds.ts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { matchId } = await params;
    const result = await cancelMatchTickets(matchId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
