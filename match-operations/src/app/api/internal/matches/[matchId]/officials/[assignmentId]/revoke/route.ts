import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MatchOfficialAssignmentService, MatchOfficialAssignmentError } from "@/services/MatchOfficialAssignmentService";

export const runtime = "nodejs";

/**
 * POST /api/internal/matches/[matchId]/officials/[assignmentId]/revoke —
 * migration.md §11. Ne supprime jamais la ligne (historique conservé) :
 * bascule status=REVOKED, revokedBy/revokedAt.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string; assignmentId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { matchId, assignmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const revokedBy = typeof body?.revokedBy === "string" ? body.revokedBy : null;

  try {
    const assignment = await new MatchOfficialAssignmentService().revoke(Number(assignmentId), revokedBy);
    if (assignment.matchId !== matchId) {
      return NextResponse.json({ error: "Affectation introuvable pour ce match" }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof MatchOfficialAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error revoking match official assignment:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
