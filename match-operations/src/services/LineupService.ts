import { getDataSource } from "@/lib/db";
import { MatchLineup } from "@/entities/MatchLineup";
import { Repository } from "typeorm";

export class LineupService {
  private async getRepository(): Promise<Repository<MatchLineup>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchLineup);
  }

  async findByMatch(matchId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    const lineups = await repository.find({
      where: { matchId },
      relations: ["player", "team"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
    return lineups;
  }

  async findByMatchAndTeam(matchId: string, teamId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    const lineups = await repository.find({
      where: { matchId, teamId },
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
    return lineups;
  }
}
