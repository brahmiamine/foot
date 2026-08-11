import { getSsoToken } from "@/lib/ssoSession";

export interface MemberProfile {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

/**
 * Client serveur-à-serveur vers sso : GET /api/members/me/profile
 * (firstName/lastName/phoneNumber). Relaie le JWT de session du membre en
 * Authorization: Bearer, même convention que ob/src/lib/notificationApi.ts.
 * N'existe que pour Paymee, qui exige ces trois champs à l'initiation d'un
 * paiement — voir src/lib/tickets.ts et avancement.md, "Paymee : profil
 * MEMBER incomplet".
 */
function baseUrl(): string {
  const url = process.env.SSO_URL;
  if (!url) throw new Error("SSO_URL must be set");
  return url.replace(/\/$/, "");
}

export async function fetchMemberProfile(): Promise<MemberProfile | null> {
  const token = await getSsoToken();
  if (!token) return null;

  const res = await fetch(`${baseUrl()}/api/members/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  return (await res.json()) as MemberProfile;
}

/**
 * Clubs suivis par le membre (préférences déclaratives, voir
 * sso/src/entities/MemberTeamAffiliation.ts) — jamais pour restreindre un
 * achat, seulement pour calculer `audience_mismatch` (signal de modération
 * non bloquant) sur les catégories HOME_SUPPORTERS/AWAY_SUPPORTERS. Renvoie
 * `null` si l'appel échoue plutôt que de faire échouer l'achat : l'absence
 * de signal ne doit jamais bloquer une vente, voir src/lib/tickets.ts.
 */
export async function fetchMemberAffiliatedTeamIds(): Promise<Set<string> | null> {
  const token = await getSsoToken();
  if (!token) return null;

  const res = await fetch(`${baseUrl()}/api/members/me/affiliations`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { teams?: { id: string }[] };
  return new Set((data.teams ?? []).map((team) => team.id));
}
