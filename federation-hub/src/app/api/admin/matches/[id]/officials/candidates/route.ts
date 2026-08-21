import { NextRequest, NextResponse } from "next/server";
import { safeErrorMessage } from "@/lib/apiError";
import { getAdminSession, canAccessFederation, canAccessLeague, canAccessPlatform } from "@/lib/adminAuth";
import { getDataSource } from "@/lib/db";
import { getMatchScope } from "@/lib/matchFederationScope";
import { rankMatchOfficialCandidates, MatchOfficialClientError } from "@/lib/matchOfficialClient";

export const runtime = "nodejs";

/**
 * REF-006 — POST /api/admin/matches/:id/officials/candidates : classe des
 * candidats selon la policy de désignation en vigueur (grade/dispo/repos/
 * distance/historique). Lecture seule, même périmètre d'autorisation que
 * l'affectation elle-même (voir .../officials/route.ts).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: matchId } = await params;
    const body = await request.json().catch(() => null);
    const candidates = Array.isArray(body?.candidates) ? body.candidates : null;
    if (!candidates) return NextResponse.json({ error: "candidates (tableau) est requis" }, { status: 400 });

    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dataSource = await getDataSource();
    const scope = await getMatchScope(dataSource, matchId);
    const authorized = scope
      ? canAccessPlatform(session) || canAccessLeague(session, scope.leagueId, scope.federationId) || canAccessFederation(session, scope.federationId)
      : canAccessPlatform(session);
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await rankMatchOfficialCandidates(matchId, candidates);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MatchOfficialClientError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error ranking match official candidates:", error);
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
