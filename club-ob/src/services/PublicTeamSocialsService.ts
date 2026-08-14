import { getDataSource } from "@/lib/database";
import { TeamSocials } from "@/entities/TeamSocials";

/** Service lecture seule pour les liens réseaux sociaux (footer/header). */
export class PublicTeamSocialsService {
  async get(teamId: string): Promise<TeamSocials | null> {
    const ds = await getDataSource();
    return ds.getRepository(TeamSocials).findOne({ where: { teamId } });
  }
}
