import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes `/api/internal/*` — service-à-service
 * (clé partagée `SSO_SERVICE_API_KEY`), jamais la session SSO d'un
 * utilisateur. TS-53/TS-54 (avancement.md, Epic E17) : `superadmin`
 * écrivait jusqu'ici directement dans `User` (table dont `sso` est
 * l'unique propriétaire, voir TS-30) pour gérer les comptes staff — ce
 * endpoint remplace ces écritures directes par un appel HTTP authentifié,
 * même pattern que `matchsheet/src/lib/serviceAuth.ts`
 * (`MATCHSHEET_SERVICE_API_KEY`) et `x-api-key` côté marketplace-api/
 * notification-api.
 */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.SSO_SERVICE_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
