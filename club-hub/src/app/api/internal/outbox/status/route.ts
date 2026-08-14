import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";

export const runtime = "nodejs";

/**
 * GET /api/internal/outbox/status — TASK-P0-006 (todo.md). Expose
 * pending/processed/dlq counts pour `notification_outbox_events`, à
 * l'usage d'un moniteur ops (même esprit que payments's
 * GET /health/outbox). Service-à-service uniquement (x-api-key, voir
 * lib/serviceAuth.ts).
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const stats = await new NotificationOutboxService().getStats();
  return NextResponse.json({
    status: stats.dlq > 0 ? "degraded" : "ok",
    ...stats,
    timestamp: new Date().toISOString(),
  });
}
