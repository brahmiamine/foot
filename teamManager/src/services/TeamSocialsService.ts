import { getDataSource } from "@/lib/database";
import { TeamSocials } from "@/entities/TeamSocials";

interface TeamSocialsData {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  xUrl?: string | null;
}

/** Service pour les réseaux sociaux du club (footer/header du site public). */
export class TeamSocialsService {
  async get(teamId: string): Promise<TeamSocials | null> {
    const ds = await getDataSource();
    return ds.getRepository(TeamSocials).findOne({ where: { teamId } });
  }

  async save(teamId: string, data: TeamSocialsData): Promise<TeamSocials> {
    const ds = await getDataSource();
    const repository = ds.getRepository(TeamSocials);
    const existing = await repository.findOne({ where: { teamId } });
    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }
    return repository.save(repository.create({ ...data, teamId }));
  }
}
