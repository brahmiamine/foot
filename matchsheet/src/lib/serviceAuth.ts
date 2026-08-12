import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `MATCHSHEET_SERVICE_API_KEY`), jamais la session SSO d'un
 * utilisateur. TS-31 (avancement.md) : matchsheet n'exposait jusqu'ici
 * aucune API pour ses tables propres (`ms_sheets`) — superadmin écrivait
 * directement dedans (`reopenMatchAdmin`, exception documentée mais
 * cross-domain). Ce endpoint remplace cette écriture directe par un appel
 * HTTP authentifié, même pattern que le `x-api-key` déjà utilisé par
 * marketplace-api (ServiceAuthGuard) et notification-api.
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.MATCHSHEET_SERVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
