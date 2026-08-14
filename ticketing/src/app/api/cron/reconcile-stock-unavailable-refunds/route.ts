import { NextRequest, NextResponse } from "next/server";
import { processStockUnavailableRefunds } from "@/lib/stockUnavailableRefunds";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

/**
 * TASK-P0-002 (todo.md). Reprend les demandes de remboursement en échec et
 * rafraîchit/alerte les dossiers PAID_STOCK_UNAVAILABLE ouverts (voir
 * processStockUnavailableRefunds). Un scheduler in-process
 * (instrumentation.ts) appelle déjà cette même logique toutes les 10
 * minutes sans passer par HTTP ; cette route reste disponible pour les
 * déploiements qui préfèrent un ordonnanceur externe ou du multi-instance —
 * même authentification par secret partagé que
 * POST /api/cron/purge-pending-reservations.
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

    const result = await processStockUnavailableRefunds();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
