import { getDataSource } from "@/lib/database";
import { Stadium } from "@/entities/Stadium";

export class PublicStadiumService {
  async getHomeStadium(teamId: string): Promise<Stadium | null> {
    const ds = await getDataSource();
    return ds.getRepository(Stadium).findOne({ where: { teamId, isHome: true } });
  }
}
