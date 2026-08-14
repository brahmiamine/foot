import { getDataSource } from "@/lib/db";
import { MatchLineup } from "@/entities/MatchLineup";
import { Match } from "@/entities/Match";
import { TeamMembership } from "@/entities/TeamMembership";
import { Repository } from "typeorm";

export class LineupService {
  private async getRepository(): Promise<Repository<MatchLineup>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchLineup);
  }

  private async filterEligibleAtMatchDate(matchId: string, lineups: MatchLineup[]): Promise<MatchLineup[]> {
    if (!lineups.length) return lineups;
    const dataSource = await getDataSource();
    const match = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match?.date) return lineups;

    const membershipRepo = dataSource.getRepository(TeamMembership);
    const eligible: MatchLineup[] = [];
    for (const lineup of lineups) {
      const membership = await membershipRepo
        .createQueryBuilder("membership")
        .where("membership.playerId = :playerId", { playerId: lineup.playerId })
        .andWhere("membership.teamId = :teamId", { teamId: lineup.teamId })
        .andWhere("membership.startDate <= :matchDate", { matchDate: match.date })
        .andWhere("(membership.endDate IS NULL OR membership.endDate >= :matchDate)", { matchDate: match.date })
        .getOne();
      if (membership) eligible.push(lineup);
    }
    return eligible;
  }

  async findByMatch(matchId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    const lineups = await repository.find({
      where: { matchId },
      relations: ["player", "team"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
    return this.filterEligibleAtMatchDate(matchId, lineups);
  }

  async findByMatchAndTeam(matchId: string, teamId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    const lineups = await repository.find({
      where: { matchId, teamId },
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
    return this.filterEligibleAtMatchDate(matchId, lineups);
  }
}
