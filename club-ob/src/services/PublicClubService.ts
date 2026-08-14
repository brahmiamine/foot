import { getDataSource } from "@/lib/database";
import { ClubInfo } from "@/entities/ClubInfo";
import { History } from "@/entities/History";
import { HistoryFigure } from "@/entities/HistoryFigure";
import { Honor } from "@/entities/Honor";

/** Service lecture seule pour les pages /club et /club/histoire. */
export class PublicClubService {
  async getClubInfo(teamId: string): Promise<ClubInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(ClubInfo).findOne({ where: { teamId } });
  }

  async getHistory(teamId: string): Promise<History | null> {
    const ds = await getDataSource();
    return ds.getRepository(History).findOne({ where: { teamId } });
  }

  async getFigures(teamId: string): Promise<HistoryFigure[]> {
    const ds = await getDataSource();
    return ds.getRepository(HistoryFigure).find({ where: { teamId }, order: { category: "ASC", displayOrder: "ASC" } });
  }

  async getHonors(teamId: string): Promise<Honor[]> {
    const ds = await getDataSource();
    return ds.getRepository(Honor).find({ where: { teamId }, order: { displayOrder: "ASC" } });
  }
}
