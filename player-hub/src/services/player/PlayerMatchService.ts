import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Team } from "@/entities/Team";
import { Convocation } from "@/entities/Convocation";
import { PlayerServiceBase, type MatchInfo } from "./PlayerServiceBase";

export class PlayerMatchService extends PlayerServiceBase {
  protected async resolveMatch(teamId: string, matchId: string): Promise<MatchInfo | null> {
    const ds = await this.ds();
    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) return null;

    const isHome = match.equipeHome === teamId;
    const opponentTeamId = isHome ? match.equipeAway : match.equipeHome;
    const opponent = await ds.getRepository(Team).findOne({ where: { id: opponentTeamId } });
    return {
      kind: "OFFICIAL",
      id: match.id,
      date: match.date ?? null,
      opponentName: opponent?.nom ?? "Adversaire",
      isHome,
      scoreHome: match.scoreHome ?? null,
      scoreAway: match.scoreAway ?? null,
      status: match.status,
    };
  }

  protected async resolveFriendlyMatch(friendlyMatchId: number): Promise<MatchInfo | null> {
    const ds = await this.ds();
    const match = await ds.getRepository(FriendlyMatch).findOne({ where: { id: friendlyMatchId } });
    if (!match) return null;
    return {
      kind: "FRIENDLY",
      id: String(match.id),
      date: match.date,
      opponentName: match.opponentName ?? "Adversaire",
      isHome: match.isHome,
      scoreHome: match.scoreHome ?? null,
      scoreAway: match.scoreAway ?? null,
      status: match.status,
    };
  }

  async resolveConvocationMatch(convocation: Convocation): Promise<MatchInfo | null> {
    if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
      return this.resolveFriendlyMatch(convocation.friendlyMatchId);
    }
    if (convocation.matchId) return this.resolveMatch(convocation.teamId, convocation.matchId);
    return null;
  }
}
