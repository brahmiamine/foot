import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { MatchDayService } from "@/services/MatchDayService";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const dataSource = await getDataSource();
  const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  }

  const events = await new MatchDayService().getEvents(matchId);

  return NextResponse.json({
    status: match.status,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    events,
  });
}
