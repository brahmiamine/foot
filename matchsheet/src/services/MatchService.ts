import { getDataSource } from "@/lib/db";
import { Match } from "@/entities/Match";
import { Repository } from "typeorm";

/**
 * Service for Match operations. matchsheet lit tous les matchs (tous clubs
 * confondus), pas de scoping par team_id — l'app est utilisée par l'arbitre
 * ou les délégués sur place, pas par un club en particulier.
 */
export class MatchService {
  private async getRepository(): Promise<Repository<Match>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Match);
  }

  /**
   * Matchs autour d'aujourd'hui (±3 jours), les plus proches d'abord —
   * c'est cette liste qui alimente la barre du bas.
   */
  async findRecent(): Promise<Match[]> {
    const repository = await this.getRepository();
    const from = new Date();
    from.setDate(from.getDate() - 3);
    const to = new Date();
    to.setDate(to.getDate() + 3);

    return repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.homeTeam", "homeTeam")
      .leftJoinAndSelect("match.awayTeam", "awayTeam")
      .leftJoinAndSelect("match.matchday", "matchday")
      .where("match.date BETWEEN :from AND :to", { from, to })
      .orWhere("match.date IS NULL")
      .orderBy("match.date", "ASC")
      .getMany();
  }

  async findById(id: string): Promise<Match | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id },
      relations: ["homeTeam", "awayTeam", "matchday"],
    });
  }
}
