import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/community/requireMember";
import { submitPrediction } from "@/lib/community/predictions";
import { getObTeam } from "@/lib/ob-team";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Match introuvable.",
  closed: "Les pronostics sont fermés pour ce match.",
};

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const scoreHome = Number.isInteger(body.scoreHome) ? body.scoreHome : NaN;
  const scoreAway = Number.isInteger(body.scoreAway) ? body.scoreAway : NaN;

  if (!matchId || Number.isNaN(scoreHome) || Number.isNaN(scoreAway) || scoreHome < 0 || scoreAway < 0) {
    return NextResponse.json({ error: "Score invalide" }, { status: 400 });
  }

  const obTeam = await getObTeam();
  if (!obTeam) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  const result = await submitPrediction(auth.data.session.id, matchId, scoreHome, scoreAway, obTeam.id);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    prediction: {
      matchId: result.prediction.matchId,
      scoreHome: result.prediction.scoreHome,
      scoreAway: result.prediction.scoreAway,
    },
  });
}
