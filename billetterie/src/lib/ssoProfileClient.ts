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
