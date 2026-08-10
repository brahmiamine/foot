import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";

/**
 * Ne lit que les matchs `isPublicVisible = true` : le flag existe déjà côté
 * teamManager (`MatchService.setPublicVisible`) pour que le club décide ce
 * qui apparaît sur le site public.
 */
export class PublicMatchService {
  private async repo() {
    const ds = await getDataSource();
    return ds.getRepository(Match);
  }

  async getNextMatch(teamId: string): Promise<Match | null> {
    const repo = await this.repo();
    return repo.findOne({
      where: [
        { equipeHome: teamId, isPublicVisible: true, status: In(["UPCOMING", "IN_PROGRESS"]) },
        { equipeAway: teamId, isPublicVisible: true, status: In(["UPCOMING", "IN_PROGRESS"]) },
      ],
      relations: ["homeTeam", "awayTeam"],
      order: { date: "ASC" },
    });
  }

  async getRecentResults(teamId: string, limit = 5): Promise<Match[]> {
    const repo = await this.repo();
    return repo.find({
      where: [
        { equipeHome: teamId, isPublicVisible: true, status: "FINISHED" },
        { equipeAway: teamId, isPublicVisible: true, status: "FINISHED" },
      ],
      relations: ["homeTeam", "awayTeam"],
      order: { date: "DESC" },
      take: limit,
    });
  }
}
