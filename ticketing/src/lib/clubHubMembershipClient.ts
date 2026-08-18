export interface ActiveMembership {
  membershipTypeId: string;
  code: "FAN" | "SOCIO" | "VIP" | "SUPPORTER" | "PARTNER";
  rights: string[];
  expiresAt: string | null;
}

/**
 * Client serveur-à-serveur vers club-hub (`/api/internal/memberships/active`),
 * même convention `x-api-key` que le reste de l'écosystème (voir
 * `club-hub/src/lib/serviceAuth.ts`). OB-003 : renvoie `null` sur tout échec
 * (pas configuré, timeout, 5xx...) — l'appelant (`tickets.ts`) doit traiter
 * `null` comme "pas de membership actif" (fail-closed), jamais comme
 * "vérification sautée".
 */
export async function fetchActiveMembership(teamId: string, userId: string): Promise<ActiveMembership | null> {
  const baseUrl = process.env.CLUB_HUB_API_URL;
  const apiKey = process.env.CLUB_HUB_API_KEY;
  if (!baseUrl || !apiKey) return null;

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/internal/memberships/active?teamId=${encodeURIComponent(teamId)}&userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { headers: { "x-api-key": apiKey }, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { active: ActiveMembership | null };
    return data.active ?? null;
  } catch {
    return null;
  }
}
