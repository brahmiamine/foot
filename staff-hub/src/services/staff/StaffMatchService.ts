import { In } from "typeorm";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Team } from "@/entities/Team";
import type { AgeCategory } from "@/types/categories";
import { StaffRosterService } from "./StaffRosterService";
import type { MatchInfo } from "./StaffServiceBase";

export class StaffMatchService extends StaffRosterService {
  private async buildOfficialMatchInfo(teamId: string, matches: Match[]): Promise<Map<string, MatchInfo>> {
    const result = new Map<string, MatchInfo>();
    if (matches.length === 0) return result;

    const ds = await this.ds();
    const opponentTeamIds = [
      ...new Set(matches.map((match) => (match.equipeHome === teamId ? match.equipeAway : match.equipeHome))),
    ];
    const opponents = opponentTeamIds.length
      ? await ds.getRepository(Team).find({ where: { id: In(opponentTeamIds) } })
      : [];
    const opponentById = new Map(opponents.map((team) => [team.id, team]));

    for (const match of matches) {
      const isHome = match.equipeHome === teamId;
      const opponentTeamId = isHome ? match.equipeAway : match.equipeHome;
      result.set(match.id, {
        kind: "OFFICIAL",
        id: match.id,
        date: match.date ?? null,
        opponentName: opponentById.get(opponentTeamId)?.nom ?? "Adversaire",
        isHome,
        status: match.status,
      });
    }
    return result;
  }

  protected async resolveMatchesByIds(teamId: string, matchIds: string[]): Promise<Map<string, MatchInfo>> {
    if (matchIds.length === 0) return new Map();
    const ds = await this.ds();
    const matches = await ds.getRepository(Match).find({ where: { id: In([...new Set(matchIds)]) } });
    return this.buildOfficialMatchInfo(teamId, matches);
  }

  protected async resolveMatch(teamId: string, matchId: string): Promise<MatchInfo | null> {
    const matches = await this.resolveMatchesByIds(teamId, [matchId]);
    return matches.get(matchId) ?? null;
  }

  async listMatches(teamId: string): Promise<MatchInfo[]> {
    const ds = await this.ds();
    const [official, friendly] = await Promise.all([
      ds.getRepository(Match).find({
        where: [{ equipeHome: teamId }, { equipeAway: teamId }],
        order: { date: "DESC" },
      }),
      ds.getRepository(FriendlyMatch).find({
        where: { teamId },
        order: { date: "DESC" },
      }),
    ]);

    const officialById = await this.buildOfficialMatchInfo(teamId, official);
    const friendlyInfo: MatchInfo[] = friendly.map((match) => ({
      kind: "FRIENDLY",
      id: String(match.id),
      date: match.date,
      opponentName: match.opponentName ?? "Adversaire",
      isHome: match.isHome,
      status: match.status,
    }));

    return [...officialById.values(), ...friendlyInfo].sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  async createFriendlyMatch(data: {
    teamId: string;
    category: AgeCategory;
    opponentName: string;
    isHome: boolean;
    venueName?: string;
    date: Date;
  }): Promise<FriendlyMatch> {
    const ds = await this.ds();
    const repo = ds.getRepository(FriendlyMatch);
    return repo.save(repo.create({ ...data, status: "UPCOMING" }));
  }
}
