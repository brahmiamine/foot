import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { LiveMatchService } from "@/services/LiveMatchService";
import { getObTeam } from "@/lib/ob-team";

export const dynamic = "force-dynamic";

/**
 * Fil d'événements live pour la page d'accueil (polling côté client, voir
 * LiveMatchSection.tsx). Lecture seule — ne renvoie que les matchs
 * `isPublicVisible`, comme le reste du site (§ PublicMatchService).
 *
 * TASK-P0-011 : `matches` est une table partagée entre tous les clubs — sans
 * filtrer par OB_TEAM_ID, un `matchId` d'un autre club (deviné/énuméré)
 * renvoyait quand même son score/événements live via cet endpoint public
 * non authentifié. Le match doit désormais impliquer l'équipe OB (domicile
 * ou visiteur).
 */
export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await context.params;

  const team = await getObTeam();
  if (!team) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ds = await getDataSource();
  const match = await ds.getRepository(Match).findOne({
    where: [
      { id: matchId, equipeHome: team.id },
      { id: matchId, equipeAway: team.id },
    ],
    relations: ["homeTeam", "awayTeam"],
  });

  if (!match || !match.isPublicVisible) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const liveService = new LiveMatchService();
  const [events, score] = await Promise.all([
    liveService.getEvents(matchId),
    liveService.getLiveScore(matchId, match.equipeHome, match.equipeAway),
  ]);

  return NextResponse.json({
    status: match.status,
    score,
    events,
  });
}
