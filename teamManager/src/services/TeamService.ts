import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { Repository } from "typeorm";

/**
 * Service for Team operations.
 * `teams` est une table partagée avec ArbiNote et cardManager : cette app ne
 * fait que lire les informations du club de l'utilisateur connecté. La
 * création/édition d'équipes reste dans cardManager.
 */
export class TeamService {
  private async getRepository(): Promise<Repository<Team>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Team);
  }

  /**
   * Get a team by id (le club de l'utilisateur connecté)
   */
  async findById(teamId: string): Promise<Team | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id: teamId },
      relations: ["federation"],
    });
  }
}
