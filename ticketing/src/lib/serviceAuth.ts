import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `TICKETING_SERVICE_API_KEY`), jamais la session d'un
 * acheteur ou d'un vendeur. Même pattern que
 * match-operations/src/lib/serviceAuth.ts et club-hub/src/lib/serviceAuth.ts
 * (TS-31/TASK-P0-003) — première route interne de ce type dans ticketing,
 * qui n'exposait jusqu'ici que des routes `/api/cron/*` protégées par un
 * secret différent (`CRON_SECRET`, voir src/app/api/cron/*).
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.TICKETING_SERVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
