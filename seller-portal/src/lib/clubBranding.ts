import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";

/**
 * ClubBranding résolu dynamiquement à partir du clubId du vendeur connecté
 * (Seller.clubId) — jamais hardcodé à un club en particulier. name/logoUrl
 * viennent de `teams` (référentiel géré dans federation-hub) ; couleurs/favicon
 * viennent de `team_branding` (optionnelle, voir federation-hub/TeamBrandingPanel).
 * Les valeurs par défaut restent synchronisées avec @foot/design-tokens et
 * seller-portal/src/app/globals.css pour éviter un flash de thème différent
 * lorsqu'un club n'a pas encore configuré son branding.
 */
export interface ClubBranding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string | null;
}

const DEFAULT_BRANDING: Omit<ClubBranding, "name" | "logoUrl"> = {
  faviconUrl: null,
  primaryColor: "#c8102e",
  secondaryColor: "#0d0d0d",
  accentColor: "#b8860b",
  font: null,
};

export async function getClubBranding(clubId: string): Promise<ClubBranding> {
  const dataSource = await getDataSource();
  const team = await dataSource.getRepository(Team).findOne({ where: { id: clubId } });
  const branding = await dataSource.getRepository(TeamBranding).findOne({ where: { teamId: clubId } });

  return {
    name: team?.nom ?? "votre club",
    logoUrl: team?.logoUrl ?? null,
    faviconUrl: branding?.faviconUrl || DEFAULT_BRANDING.faviconUrl,
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: branding?.accentColor || DEFAULT_BRANDING.accentColor,
    font: branding?.font || DEFAULT_BRANDING.font,
  };
}
