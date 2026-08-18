import { notFound } from "next/navigation";

export type PublicSectionKey =
  | "NEWS"
  | "ANNOUNCEMENTS"
  | "GALLERY"
  | "SHOP"
  | "CALENDAR"
  | "COMMUNITY"
  | "PARTNERS"
  | "RECRUITMENT"
  | "FORMATION"
  | "SELLER_ONBOARDING";

interface ResolvedPublicContentPolicy {
  emergencyBanner: {
    enabled: boolean;
    messageFr: string | null;
    messageAr: string | null;
    severity: "INFO" | "WARNING" | "CRITICAL";
  };
  [section: string]: unknown;
}

function config() {
  const baseUrl = process.env.CLUB_HUB_API_URL;
  const apiKey = process.env.CLUB_HUB_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

/**
 * OB-004 : lecture de disponibilité de contenu (pas une frontière de
 * sécurité) — un échec d'appel vers club-hub laisse la section visible
 * (fail-open) plutôt que de rendre tout le site indisponible. Contraste
 * volontaire avec OB-001 (fail-closed) : là-bas une ouverture manquée
 * autoriserait une écriture non désirée, ici une fermeture manquée ne
 * fait qu'afficher une page qui aurait dû être masquée.
 */
export async function resolvePublicContentPolicy(teamId: string | undefined): Promise<ResolvedPublicContentPolicy | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const url = new URL(`${cfg.baseUrl}/api/internal/public-content-policy`);
    if (teamId) url.searchParams.set("teamId", teamId);
    const response = await fetch(url, { headers: { "x-api-key": cfg.apiKey }, cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as ResolvedPublicContentPolicy;
  } catch {
    return null;
  }
}

export async function assertSectionEnabled(teamId: string | undefined, section: PublicSectionKey): Promise<void> {
  const policy = await resolvePublicContentPolicy(teamId);
  if (policy && policy[section] === false) {
    notFound();
  }
}
