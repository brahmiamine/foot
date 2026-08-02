import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { Repository } from "typeorm";

/**
 * Service for Match operations.
 * `matches` est une table partagée avec ArbiNote et cardManager : cette app ne
 * fait que lire les matchs d'une équipe et gérer leur visibilité publique /
 * galerie photo. La création/édition d'un match reste dans ArbiNote/cardManager.
 */
export class MatchService {
  private async getRepository(): Promise<Repository<Match>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Match);
  }

  /**
   * Get all matches involving the given team
   */
  async findAll(teamId: string): Promise<Match[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: [{ equipeHome: teamId }, { equipeAway: teamId }],
      relations: ["homeTeam", "awayTeam", "matchday"],
      order: { date: "DESC" },
    });
  }

  /**
   * Get a match by ID (must involve the given team)
   */
  async findById(id: string, teamId: string): Promise<Match | null> {
    const repository = await this.getRepository();
    const match = await repository.findOne({
      where: { id },
      relations: ["homeTeam", "awayTeam"],
    });
    if (!match) return null;
    if (match.equipeHome !== teamId && match.equipeAway !== teamId) {
      return null;
    }
    return match;
  }

  /**
   * Toggle whether a match is visible on the public site
   */
  async setPublicVisible(id: string, teamId: string, isPublicVisible: boolean): Promise<Match> {
    const match = await this.findById(id, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }
    const repository = await this.getRepository();
    match.isPublicVisible = isPublicVisible;
    return repository.save(match);
  }
}
