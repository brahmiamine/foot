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

  /**
   * Le statut `UPCOMING` n'est pas toujours retombé à `FINISHED`/`CANCELLED`
   * après la date du match (calendriers saisis à l'avance, resynchro pas
   * encore faite) : trier uniquement par date ASC peut donc remonter un
   * match déjà passé. On écarte les dates passées, sauf `IN_PROGRESS` qui
   * est par définition en cours.
   */
  async getNextMatch(teamId: string): Promise<Match | null> {
    const repo = await this.repo();
    const candidates = await repo.find({
      where: [
        { equipeHome: teamId, isPublicVisible: true, status: In(["UPCOMING", "IN_PROGRESS"]) },
        { equipeAway: teamId, isPublicVisible: true, status: In(["UPCOMING", "IN_PROGRESS"]) },
      ],
      relations: ["homeTeam", "awayTeam"],
    });

    const now = Date.now();
    const upcoming = candidates
      .filter((m) => m.status === "IN_PROGRESS" || !m.date || m.date.getTime() >= now)
      .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

    return upcoming[0] ?? null;
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

  /** Calendrier complet (passés et à venir), pour la page /calendrier. */
  async getAllPublic(teamId: string): Promise<Match[]> {
    const repo = await this.repo();
    return repo.find({
      where: [
        { equipeHome: teamId, isPublicVisible: true },
        { equipeAway: teamId, isPublicVisible: true },
      ],
      relations: ["homeTeam", "awayTeam"],
      order: { date: "ASC" },
    });
  }
}
