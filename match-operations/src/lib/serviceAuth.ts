import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `MATCH_OPERATIONS_SERVICE_API_KEY`), jamais la session SSO d'un
 * utilisateur. TS-31 (avancement.md) : match-operations n'exposait jusqu'ici
 * aucune API pour ses tables propres (`ms_sheets`) — federation-hub écrivait
 * directement dedans (`reopenMatchAdmin`, exception documentée mais
 * cross-domain). Ce endpoint remplace cette écriture directe par un appel
 * HTTP authentifié, même pattern que le `x-api-key` déjà utilisé par
 * marketplace (ServiceAuthGuard) et notifications.
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.MATCH_OPERATIONS_SERVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
