import { getDataSource } from "@/lib/db";
import { MatchLineup } from "@/entities/MatchLineup";
import { Repository } from "typeorm";

/**
 * Service for MatchLineup reads. La composition (titulaires/remplaçants)
 * est saisie côté teamManager par chaque club ; matchsheet ne fait que la
 * lire, pour les deux équipes d'un match.
 */
export class LineupService {
  private async getRepository(): Promise<Repository<MatchLineup>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchLineup);
  }

  async findByMatch(matchId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId },
      relations: ["player", "team"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }

  async findByMatchAndTeam(matchId: string, teamId: string): Promise<MatchLineup[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId, teamId },
      relations: ["player"],
      order: { role: "ASC", shirtNumber: "ASC" },
    });
  }
}
