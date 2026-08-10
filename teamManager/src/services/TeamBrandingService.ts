import { getDataSource } from "@/lib/database";
import { TeamBranding } from "@/entities/TeamBranding";
import { Repository } from "typeorm";

export interface UpdateBrandingInput {
  displayName?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

/**
 * Service for TeamBranding operations — identité & apparence du club
 * (module "Branding"). Une seule ligne par club (UNIQUE team_id) : `update`
 * fait un upsert implicite (crée la ligne si elle n'existe pas encore).
 */
export class TeamBrandingService {
  private async getRepository(): Promise<Repository<TeamBranding>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TeamBranding);
  }

  async findByTeam(teamId: string): Promise<TeamBranding | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { teamId } });
  }

  async update(teamId: string, data: UpdateBrandingInput): Promise<TeamBranding> {
    const repository = await this.getRepository();
    const existing = await repository.findOne({ where: { teamId } });

    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }

    const branding = repository.create({ teamId, ...data });
    return repository.save(branding);
  }
}
