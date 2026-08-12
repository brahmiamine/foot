import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { SheetService } from "@/services/SheetService";

export const runtime = "nodejs";

/**
 * POST /api/internal/matches/[matchId]/reopen
 * Service-à-service uniquement (x-api-key, voir lib/serviceAuth.ts).
 * Appelée par superadmin (reopenMatchAdmin) — remplace l'écriture directe
 * qu'il faisait jusqu'ici dans `ms_sheets`/`matches` (TS-31, avancement.md).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { matchId } = await params;
    const sheetService = new SheetService();
    const sheet = await sheetService.reopen(matchId);
    return NextResponse.json({ id: sheet.id, matchId: sheet.matchId, status: sheet.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("introuvable") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
