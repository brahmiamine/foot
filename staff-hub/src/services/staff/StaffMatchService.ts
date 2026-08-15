import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Team } from "@/entities/Team";
import type { AgeCategory } from "@/types/categories";
import { StaffRosterService } from "./StaffRosterService";
import type { MatchInfo } from "./StaffServiceBase";

export class StaffMatchService extends StaffRosterService {
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
      status: match.status,
    };
  }

  async listMatches(teamId: string): Promise<MatchInfo[]> {
    const ds = await this.ds();
    const official = await ds.getRepository(Match).find({
      where: [{ equipeHome: teamId }, { equipeAway: teamId }],
      order: { date: "DESC" },
    });
    const officialInfo = await Promise.all(official.map((match) => this.resolveMatch(teamId, match.id)));
    const friendly = await ds.getRepository(FriendlyMatch).find({
      where: { teamId },
      order: { date: "DESC" },
    });
    const friendlyInfo: MatchInfo[] = friendly.map((match) => ({
      kind: "FRIENDLY",
      id: String(match.id),
      date: match.date,
      opponentName: match.opponentName ?? "Adversaire",
      isHome: match.isHome,
      status: match.status,
    }));

    return [...officialInfo.filter((match): match is MatchInfo => !!match), ...friendlyInfo].sort(
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
