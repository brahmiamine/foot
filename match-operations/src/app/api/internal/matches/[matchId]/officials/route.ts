import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MatchOfficialAssignmentService, MatchOfficialAssignmentError } from "@/services/MatchOfficialAssignmentService";

export const runtime = "nodejs";

/**
 * GET/POST /api/internal/matches/[matchId]/officials — migration.md §11
 * (Phase 4). Service-à-service uniquement (x-api-key, voir
 * lib/serviceAuth.ts). Appelée par federation-hub (fédération/ligue) pour
 * affecter un compte REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER à un match —
 * jamais d'écriture directe de federation-hub dans `match_official_assignments`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { matchId } = await params;
  const assignments = await new MatchOfficialAssignmentService().listForMatch(matchId);
  return NextResponse.json(assignments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { matchId } = await params;
  const body = await request.json();
  const { userId, role, refereeId, assignedBy } = body;

  if (!userId || !role) {
    return NextResponse.json({ error: "userId et role sont requis" }, { status: 400 });
  }

  try {
    const assignment = await new MatchOfficialAssignmentService().assign({
      matchId,
      userId,
      role,
      refereeId,
      assignedBy,
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof MatchOfficialAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error assigning match official:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
