import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `CLUB_HUB_SERVICE_API_KEY`), jamais la session SSO d'un
 * utilisateur. Même pattern que `match-operations/src/lib/serviceAuth.ts` (TS-31)
 * et `identity/src/lib/serviceAuth.ts` (TS-53/TS-54).
 *
 * TASK-P0-003 (portion applicable ici — pas de registre par application
 * comme les API NestJS, une seule clé partagée par un ordonnanceur externe,
 * donc pas de `serviceId` attribuable par appel) : rotation sans
 * interruption via `CLUB_HUB_SERVICE_API_KEY_PREVIOUS` (acceptée en
 * parallèle jusqu'à `CLUB_HUB_SERVICE_API_KEY_PREVIOUS_EXPIRES_AT`) et
 * log structuré (kid, endpoint, timestamp) à chaque appel authentifié.
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const current = process.env.CLUB_HUB_SERVICE_API_KEY;
  if (!current) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let kid: "current" | "previous" | null = null;
  if (provided === current) {
    kid = "current";
  } else {
    const previous = process.env.CLUB_HUB_SERVICE_API_KEY_PREVIOUS;
    const previousExpiresAt = process.env.CLUB_HUB_SERVICE_API_KEY_PREVIOUS_EXPIRES_AT;
    const stillInGracePeriod = !previousExpiresAt || new Date(previousExpiresAt).getTime() > Date.now();
    if (previous && provided === previous && stillInGracePeriod) {
      kid = "previous";
    }
  }

  if (!kid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.warn(
    JSON.stringify({
      event: "service_auth",
      kid,
      endpoint: `${request.method} ${request.nextUrl.pathname}`,
      timestamp: new Date().toISOString(),
    }),
  );

  return null;
}
