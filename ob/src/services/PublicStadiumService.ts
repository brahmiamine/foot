import { getDataSource } from "@/lib/database";
import { Stadium } from "@/entities/Stadium";

export class PublicStadiumService {
  async getHomeStadium(teamId: string): Promise<Stadium | null> {
    const ds = await getDataSource();
    return ds.getRepository(Stadium).findOne({ where: { teamId, isHome: true } });
  }

  /** Toutes les installations du club (stade, terrains, vestiaires, salle de muscu, centre sportif), pour /club. */
  async getAllFacilities(teamId: string): Promise<Stadium[]> {
    const ds = await getDataSource();
    return ds.getRepository(Stadium).find({ where: { teamId }, order: { isHome: "DESC", nameFr: "ASC" } });
  }
}
