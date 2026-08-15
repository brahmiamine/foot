import { getDataSource } from "@/lib/database";
import { cachePublicData } from "@/lib/public-cache";
import { ClubInfo } from "@/entities/ClubInfo";
import { History } from "@/entities/History";
import { HistoryFigure } from "@/entities/HistoryFigure";
import { Honor } from "@/entities/Honor";

/** Service lecture seule pour les pages /club et /club/histoire. */
export class PublicClubService {
  async getClubInfo(teamId: string): Promise<ClubInfo | null> {
    return cachePublicData(["club", "info", teamId], async () => {
      const ds = await getDataSource();
      return ds.getRepository(ClubInfo).findOne({ where: { teamId } });
    }, 300);
  }

  async getHistory(teamId: string): Promise<History | null> {
    return cachePublicData(["club", "history", teamId], async () => {
      const ds = await getDataSource();
      return ds.getRepository(History).findOne({ where: { teamId } });
    }, 300);
  }

  async getFigures(teamId: string): Promise<HistoryFigure[]> {
    return cachePublicData(["club", "figures", teamId], async () => {
      const ds = await getDataSource();
      return ds.getRepository(HistoryFigure).find({
        where: { teamId },
        order: { category: "ASC", displayOrder: "ASC" },
      });
    }, 300);
  }

  async getHonors(teamId: string): Promise<Honor[]> {
    return cachePublicData(["club", "honors", teamId], async () => {
      const ds = await getDataSource();
      return ds.getRepository(Honor).find({ where: { teamId }, order: { displayOrder: "ASC" } });
    }, 300);
  }
}
