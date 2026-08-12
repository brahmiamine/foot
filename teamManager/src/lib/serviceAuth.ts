import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `TEAMMANAGER_SERVICE_API_KEY`), jamais la session SSO d'un
 * utilisateur. Même pattern que `matchsheet/src/lib/serviceAuth.ts` (TS-31)
 * et `sso/src/lib/serviceAuth.ts` (TS-53/TS-54).
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.TEAMMANAGER_SERVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
