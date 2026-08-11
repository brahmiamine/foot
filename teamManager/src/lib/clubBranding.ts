import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";

/**
 * ClubBranding résolu dynamiquement à partir du teamId du club connecté —
 * jamais hardcodé (voir README racine, section « Classification des
 * projets »). name/shortName/logo viennent de `teams` (référentiel géré
 * dans superadmin) ; favicon/couleurs/police viennent de `team_branding`
 * (optionnelle, voir superadmin/TeamBrandingPanel). Les valeurs par défaut
 * ci-dessous reprennent l'ancien thème hardcodé pour ne rien changer
 * visuellement tant qu'un club n'a pas configuré son propre branding.
 */
export interface ClubBranding {
  name: string;
  shortName: string;
  logoUrl: string | null;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string | null;
}

const DEFAULT_BRANDING: Omit<ClubBranding, "name" | "shortName" | "logoUrl"> = {
  faviconUrl: "/images/favicon.png",
  primaryColor: "#c8102e",
  secondaryColor: "#0d0d0d",
  accentColor: "#f5f2ee",
  font: null,
};

export async function getClubBranding(teamId: string): Promise<ClubBranding> {
  const dataSource = await getDataSource();
  const team = await dataSource.getRepository(Team).findOne({ where: { id: teamId } });
  const branding = await dataSource.getRepository(TeamBranding).findOne({ where: { teamId } });

  return {
    name: team?.nom ?? "TeamManager",
    shortName: team?.abbr ?? "TM",
    logoUrl: team?.logoUrl ?? null,
    faviconUrl: branding?.faviconUrl || DEFAULT_BRANDING.faviconUrl,
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: branding?.accentColor || DEFAULT_BRANDING.accentColor,
    font: branding?.font || DEFAULT_BRANDING.font,
  };
}
