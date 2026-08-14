import { getDataSource } from "@/lib/db";
import { Match } from "@/entities/Match";
import { Repository } from "typeorm";

/**
 * Service for Match operations. match-operations lit tous les matchs (tous clubs
 * confondus), pas de scoping par team_id — l'app est utilisée par l'arbitre
 * ou les délégués sur place, pas par un club en particulier.
 */
export class MatchService {
  private async getRepository(): Promise<Repository<Match>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Match);
  }

  /**
   * Les matchs les plus proches d'aujourd'hui (peu importe l'écart), plus
   * ceux sans date fixée — c'est cette liste qui alimente la barre du bas.
   * Un ±3 jours fixe laissait la barre vide dès qu'un calendrier avait un
   * trou (ex. intersaison), même avec des matchs à venir dans les deux sens.
   */
  async findRecent(limit = 20): Promise<Match[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.homeTeam", "homeTeam")
      .leftJoinAndSelect("match.awayTeam", "awayTeam")
      .leftJoinAndSelect("match.matchday", "matchday")
      .orderBy("match.date IS NULL", "DESC")
      .addOrderBy("ABS(DATEDIFF(match.date, CURDATE()))", "ASC")
      .addOrderBy("match.date", "ASC")
      .limit(limit)
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
