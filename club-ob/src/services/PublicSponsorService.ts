import { getDataSource } from "@/lib/database";
import { Sponsor } from "@/entities/Sponsor";

/** Service lecture seule pour la page /partenaires. */
export class PublicSponsorService {
  async getActive(teamId: string): Promise<Sponsor[]> {
    const ds = await getDataSource();
    return ds.getRepository(Sponsor).find({ where: { teamId, isActive: true }, order: { companyName: "ASC" } });
  }
}
