import { In } from "typeorm";
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

  /**
   * Resolve a whole convocation list with at most three DB queries:
   * official matches, opponent teams and friendly matches.
   */
  async resolveConvocationMatches(convocations: Convocation[]): Promise<Map<number, MatchInfo | null>> {
    const result = new Map<number, MatchInfo | null>();
    if (convocations.length === 0) return result;

    const ds = await this.ds();
    const officialIds = [
      ...new Set(
        convocations
          .filter((convocation) => convocation.matchType !== "FRIENDLY" && convocation.matchId)
          .map((convocation) => convocation.matchId as string)
      ),
    ];
    const friendlyIds = [
      ...new Set(
        convocations
          .filter((convocation) => convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId)
          .map((convocation) => convocation.friendlyMatchId as number)
      ),
    ];

    const [officialMatches, friendlyMatches] = await Promise.all([
      officialIds.length
        ? ds.getRepository(Match).find({ where: { id: In(officialIds) } })
        : Promise.resolve([] as Match[]),
      friendlyIds.length
        ? ds.getRepository(FriendlyMatch).find({ where: { id: In(friendlyIds) } })
        : Promise.resolve([] as FriendlyMatch[]),
    ]);

    const officialById = new Map(officialMatches.map((match) => [match.id, match]));
    const friendlyById = new Map(friendlyMatches.map((match) => [Number(match.id), match]));

    const opponentTeamIds = new Set<string>();
    for (const convocation of convocations) {
      if (!convocation.matchId) continue;
      const match = officialById.get(convocation.matchId);
      if (!match) continue;
      const isHome = match.equipeHome === convocation.teamId;
      opponentTeamIds.add(isHome ? match.equipeAway : match.equipeHome);
    }

    const teams = opponentTeamIds.size
      ? await ds.getRepository(Team).find({ where: { id: In([...opponentTeamIds]) } })
      : [];
    const teamById = new Map(teams.map((team) => [team.id, team]));

    for (const convocation of convocations) {
      if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
        const match = friendlyById.get(Number(convocation.friendlyMatchId));
        result.set(
          convocation.id,
          match
            ? {
                kind: "FRIENDLY",
                id: String(match.id),
                date: match.date,
                opponentName: match.opponentName ?? "Adversaire",
                isHome: match.isHome,
                scoreHome: match.scoreHome ?? null,
                scoreAway: match.scoreAway ?? null,
                status: match.status,
              }
            : null
        );
        continue;
      }

      if (!convocation.matchId) {
        result.set(convocation.id, null);
        continue;
      }

      const match = officialById.get(convocation.matchId);
      if (!match) {
        result.set(convocation.id, null);
        continue;
      }

      const isHome = match.equipeHome === convocation.teamId;
      const opponentTeamId = isHome ? match.equipeAway : match.equipeHome;
      result.set(convocation.id, {
        kind: "OFFICIAL",
        id: match.id,
        date: match.date ?? null,
        opponentName: teamById.get(opponentTeamId)?.nom ?? "Adversaire",
        isHome,
        scoreHome: match.scoreHome ?? null,
        scoreAway: match.scoreAway ?? null,
        status: match.status,
      });
    }

    return result;
  }
}
