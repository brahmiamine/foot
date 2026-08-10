import { cache } from "react";
import { requireTeamId } from "./team-context";
import { TeamService } from "@/services/TeamService";
import { TeamBrandingService } from "@/services/TeamBrandingService";

/**
 * Identité & apparence résolues pour le club connecté (module "Branding").
 * Toujours calculée après authentification, à partir de `session.user.teamId`
 * — jamais avant (la page /login ne connaît pas encore le club, voir
 * lib/auth.ts). C'est le "bootstrap" léger de l'interface, dans l'esprit du
 * TeamContext demandé : chargé une seule fois par requête (voir
 * `getTeamContext`, mis en cache via React `cache()`), puis passé en props
 * aux composants (AdminLayout -> AdminHeader/AdminSidebar), jamais refetché
 * composant par composant.
 */
export interface ResolvedBranding {
  teamId: string;
  displayName: string;
  shortName: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const DEFAULT_COLORS = {
  primaryColor: "#556ee6",
  secondaryColor: "#74788d",
  accentColor: "#f1b44c",
};

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TM";
  if (words.length === 1) return words[0].slice(0, 8);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 4);
}

/**
 * Combine le référentiel partagé `teams` (nom officiel, logo) avec les
 * surcharges optionnelles de `cms_team_branding`. Ne modifie jamais
 * `teams` : c'est purement une résolution en lecture, pour ne prendre
 * aucun risque sur ArbiNote/superadmin qui partagent cette table.
 */
export function resolveBranding(
  team: { id: string; nom: string; logoUrl?: string | null },
  branding: {
    displayName?: string | null;
    shortName?: string | null;
    logoUrl?: string | null;
    logoDarkUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  } | null
): ResolvedBranding {
  const displayName = branding?.displayName?.trim() || team.nom;
  return {
    teamId: team.id,
    displayName,
    shortName: branding?.shortName?.trim() || deriveShortName(displayName),
    logoUrl: branding?.logoUrl || team.logoUrl || null,
    logoDarkUrl: branding?.logoDarkUrl || branding?.logoUrl || team.logoUrl || null,
    faviconUrl: branding?.faviconUrl || branding?.logoUrl || team.logoUrl || null,
    primaryColor: branding?.primaryColor || DEFAULT_COLORS.primaryColor,
    secondaryColor: branding?.secondaryColor || DEFAULT_COLORS.secondaryColor,
    accentColor: branding?.accentColor || DEFAULT_COLORS.accentColor,
  };
}

/**
 * Contexte club résolu pour la requête en cours — équivalent du
 * "GET /api/me/context" du plan, mais résolu directement en Server
 * Component (pas d'aller-retour HTTP nécessaire). `cache()` déduplique
 * l'appel si plusieurs Server Components de la même requête l'appellent
 * (ex: `generateMetadata` + le layout lui-même).
 */
export const getTeamContext = cache(async (): Promise<ResolvedBranding> => {
  const teamId = await requireTeamId();

  const teamService = new TeamService();
  const brandingService = new TeamBrandingService();
  const [team, branding] = await Promise.all([teamService.findById(teamId), brandingService.findByTeam(teamId)]);

  if (!team) {
    throw new Error("Club introuvable");
  }

  return resolveBranding(team, branding);
});

// ---- Utilitaires couleur (pas de dépendance externe) ---------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r: Number.isNaN(r) ? 0 : r, g: Number.isNaN(g) ? 0 : g, b: Number.isNaN(b) ? 0 : b };
}

/** Luminance relative WCAG — sert à choisir automatiquement un texte clair ou sombre. */
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Couleur de texte (#ffffff ou #111111) garantissant un contraste correct sur `hex`. */
export function pickContrastText(hex: string): string {
  return relativeLuminance(hexToRgb(hex)) > 0.5 ? "#111111" : "#ffffff";
}

/** CSS custom properties du thème `skote-admin.css`, dérivées du branding du club. */
export function buildBrandingCssVars(branding: ResolvedBranding): string {
  const { r, g, b } = hexToRgb(branding.primaryColor);
  return [
    `--skote-primary: ${branding.primaryColor};`,
    `--skote-primary-rgb: ${r}, ${g}, ${b};`,
    `--skote-secondary: ${branding.secondaryColor};`,
    `--skote-accent: ${branding.accentColor};`,
    `--skote-primary-contrast: ${pickContrastText(branding.primaryColor)};`,
    // Le fond sombre de la sidebar reste neutre (lisibilité garantie quelle
    // que soit la couleur du club) ; seul l'item actif est teinté par une
    // superposition translucide de la couleur primaire.
    `--skote-sidebar-menu-item-active-bg: rgba(${r}, ${g}, ${b}, 0.35);`,
  ].join(" ");
}
