import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MatchOfficialAssignmentService, MatchOfficialAssignmentError } from "@/services/MatchOfficialAssignmentService";

export const runtime = "nodejs";

/**
 * REF-006 — POST /api/internal/matches/[matchId]/officials/candidates
 * Classe des candidats selon la policy de désignation (MANUAL/SUGGESTED/AUTO).
 * Lecture seule : federation-hub reste responsable d'appeler ensuite
 * POST .../officials (assign) pour créer réellement l'affectation.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { matchId } = await params;
  const body = await request.json().catch(() => null);
  const candidates = Array.isArray(body?.candidates) ? body.candidates : null;
  if (!candidates) {
    return NextResponse.json({ error: "candidates (tableau) est requis" }, { status: 400 });
  }

  try {
    const result = await new MatchOfficialAssignmentService().rankCandidates(matchId, candidates);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MatchOfficialAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error ranking match official candidates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
