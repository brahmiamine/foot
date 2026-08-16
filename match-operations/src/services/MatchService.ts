import { getDataSource } from "@/lib/db";
import { Match } from "@/entities/Match";
import { Repository } from "typeorm";

/**
 * Read service for the shared official match calendar. Authorization remains
 * in MatchAccessService; the scoped queries here only return candidates that
 * belong to the authenticated actor's club/category perimeter.
 */
export class MatchService {
  private async getRepository(): Promise<Repository<Match>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Match);
  }

  /**
   * Legacy/global recent list retained for callers outside the authenticated
   * landing flow. The match-operations UI itself now uses actor-scoped lists.
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

  async findForClub(
    teamId: string,
    categories: "ALL" | string[],
    limit = 20,
  ): Promise<Match[]> {
    if (categories !== "ALL" && categories.length === 0) return [];

    const repository = await this.getRepository();
    const query = repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.homeTeam", "homeTeam")
      .leftJoinAndSelect("match.awayTeam", "awayTeam")
      .leftJoinAndSelect("match.matchday", "matchday")
      .where("(match.equipe_home = :teamId OR match.equipe_away = :teamId)", { teamId });

    if (categories !== "ALL") {
      query.andWhere(
        `((match.equipe_home = :teamId AND homeTeam.age_category IN (:...categories))
          OR (match.equipe_away = :teamId AND awayTeam.age_category IN (:...categories)))`,
        { teamId, categories },
      );
    }

    return query
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
