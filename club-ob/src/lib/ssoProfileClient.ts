import { getSsoToken } from "@/lib/ssoSession";

export interface MemberProfile {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

/**
 * Client serveur-à-serveur vers sso : GET/PATCH /api/members/me/profile
 * (firstName/lastName/phoneNumber, distincts de `name`/`email` déjà portés
 * par le JWT de session). Même convention que notificationApi.ts — relaie
 * le JWT `sso` du membre courant en Authorization: Bearer, jamais de
 * secret propre à `ob`. Ces champs existent pour que ticketing puisse
 * proposer Paymee (voir avancement.md, "Paymee : profil MEMBER incomplet").
 */
class SsoProfileError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function baseUrl(): string {
  const url = process.env.SSO_URL;
  if (!url) throw new Error("SSO_URL must be set");
  return url.replace(/\/$/, "");
}

async function callSso<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSsoToken();
  if (!token) throw new SsoProfileError(401, "Not authenticated");

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SsoProfileError(res.status, `sso ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMemberProfile(): Promise<MemberProfile> {
  return callSso<MemberProfile>("/api/members/me/profile");
}

export async function updateMemberProfile(input: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}): Promise<MemberProfile> {
  return callSso<MemberProfile>("/api/members/me/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
