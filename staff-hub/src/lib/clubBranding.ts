import { getDataSource } from "./database";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";

/**
 * ClubBranding résolu dynamiquement à partir du teamId du membre du staff
 * connecté — jamais hardcodé à un club en particulier (voir README racine,
 * section « Classification des projets »). Mêmes valeurs par défaut que le
 * thème actuel de staff-hub (globals.css) tant qu'un club n'a pas configuré
 * son propre branding — voir seller-portal/src/lib/clubBranding.ts (même pattern).
 */
export interface ClubBranding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const DEFAULT_BRANDING: Omit<ClubBranding, "name" | "logoUrl"> = {
  faviconUrl: null,
  primaryColor: "#c8102e",
  secondaryColor: "#0d0d0d",
  accentColor: "#b8860b",
};

export async function getClubBranding(teamId: string): Promise<ClubBranding> {
  const dataSource = await getDataSource();
  const team = await dataSource.getRepository(Team).findOne({ where: { id: teamId } });
  const branding = await dataSource.getRepository(TeamBranding).findOne({ where: { teamId } });

  return {
    name: team?.nom ?? "mon club",
    logoUrl: team?.logoUrl ?? null,
    faviconUrl: branding?.faviconUrl || DEFAULT_BRANDING.faviconUrl,
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: branding?.accentColor || DEFAULT_BRANDING.accentColor,
  };
}
