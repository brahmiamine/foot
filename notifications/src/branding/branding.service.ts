import { Injectable, Logger } from '@nestjs/common';
import { SharedDirectoryService } from '../database/shared-directory.service';

export interface ClubBranding {
  name: string;
  nameAr: string | null;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: ClubBranding = {
  name: 'Foot',
  nameAr: null,
  logoUrl: null,
};

/**
 * Récupère le branding club (nom, logo) pour les templates email/push (§34).
 * Ne duplique jamais la configuration du club : lecture à la demande via
 * SharedDirectoryService (base partagée `foot`), avec repli sur un branding
 * générique si la notification est globale (`teamId` null) ou si la base
 * partagée n'est pas configurée.
 */
@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);

  constructor(private readonly directory: SharedDirectoryService) {}

  async getBranding(teamId: string | null): Promise<ClubBranding> {
    if (!teamId || !this.directory.isEnabled()) return DEFAULT_BRANDING;
    try {
      const team = await this.directory.getTeamBranding(teamId);
      if (!team) return DEFAULT_BRANDING;
      return { name: team.name, nameAr: team.nameAr, logoUrl: team.logoUrl };
    } catch (error) {
      this.logger.warn(
        `Failed to resolve branding for team ${teamId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return DEFAULT_BRANDING;
    }
  }
}
