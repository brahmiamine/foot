import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";

export const runtime = "nodejs";

/**
 * POST /api/internal/outbox/process — TS-26 (avancement.md). Traite un lot
 * d'événements `notification_outbox_events` dus. Service-à-service
 * uniquement (x-api-key, voir lib/serviceAuth.ts) : à invoquer
 * périodiquement par un ordonnanceur externe (cron), teamManager n'ayant
 * pas de process long-running dédié comme les API NestJS de ce dépôt.
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const result = await new NotificationOutboxService().processDue();
  return NextResponse.json(result);
}
