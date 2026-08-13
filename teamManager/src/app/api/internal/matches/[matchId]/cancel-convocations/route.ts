import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { ConvocationService } from "@/services/ConvocationService";

export const runtime = "nodejs";

/**
 * POST /api/internal/matches/[matchId]/cancel-convocations — TASK-P0-003
 * (todo.md). Service-à-service uniquement (x-api-key, voir
 * lib/serviceAuth.ts). Appelée par superadmin juste après avoir marqué le
 * match `CANCELLED` (voir cancelMatchAdmin) : annule (soft) toutes les
 * convocations liées à ce match officiel, tous clubs confondus. Idempotente
 * — voir ConvocationService.cancelForMatch.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { matchId } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : "Match annulé.";

  const cancelled = await new ConvocationService().cancelForMatch(matchId, reason);
  return NextResponse.json({ cancelled });
}
