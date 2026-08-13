import { NextRequest, NextResponse } from "next/server";
import { processMatchCancellationRefunds } from "@/lib/matchCancellationRefunds";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

/**
 * TASK-P0-003 (todo.md). Rattrape tout match CANCELLED dont des billets
 * PENDING/PAID n'auraient pas encore été traités et reprend/rafraîchit les
 * dossiers de remboursement ouverts (voir processMatchCancellationRefunds).
 * Un scheduler in-process (instrumentation.ts) appelle déjà cette même
 * logique toutes les 10 minutes sans passer par HTTP ; cette route reste
 * disponible pour un ordonnanceur externe ou du multi-instance — même
 * authentification par secret partagé que
 * POST /api/cron/reconcile-stock-unavailable-refunds.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      throw new UnauthorizedError("Secret de réconciliation manquant ou invalide.");
    }

    const result = await processMatchCancellationRefunds();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
