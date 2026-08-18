/**
 * Client serveur-à-serveur vers club-hub (`/api/internal/*`), même
 * convention que `marketplaceApi.ts` : URL + clé de service dédiées,
 * jamais `NEXT_PUBLIC_CLUB_HUB_URL` (réservée aux liens de redirection
 * navigateur, voir `publicForms.ts`).
 */
function config() {
  const baseUrl = process.env.CLUB_HUB_API_URL;
  const apiKey = process.env.CLUB_HUB_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Club Hub API non configurée');
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export interface PublicFormSettingsResponse {
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  rateLimitMax: number | null;
  rateLimitWindowMinutes: number | null;
  version: number;
}

/**
 * OB-001 : consulte l'ouverture/fenêtre/rate limit configurés côté club-hub
 * pour le formulaire vendeur — jamais de décision d'autorisation prise
 * localement dans club-ob. Un échec d'appel doit être traité fail-closed
 * par l'appelant (voir seller-applications/route.ts) plutôt que de laisser
 * passer la soumission.
 */
export async function fetchPublicFormSettings(
  teamId: string,
  domain: 'ACADEMY' | 'RECRUITMENT' | 'SPONSOR' | 'SELLER' | 'CONTACT',
): Promise<PublicFormSettingsResponse> {
  return call<PublicFormSettingsResponse>(
    `/api/internal/public-form-settings?teamId=${encodeURIComponent(teamId)}&domain=${domain}`,
  );
}

export interface MembershipTypeOption {
  id: string;
  code: 'FAN' | 'SOCIO' | 'VIP' | 'SUPPORTER' | 'PARTNER';
  labelFr: string;
  labelAr: string | null;
  requiresApproval: boolean;
  durationDays: number | null;
  rights: string[];
}

export interface ActiveMembership {
  membershipId: string;
  membershipTypeId: string;
  code: MembershipTypeOption['code'];
  rights: string[];
  expiresAt: string | null;
}

/** OB-002 : types de membership actifs proposés par le club. */
export async function fetchMembershipTypes(teamId: string): Promise<MembershipTypeOption[]> {
  return call<MembershipTypeOption[]>(`/api/internal/memberships?teamId=${encodeURIComponent(teamId)}`);
}

/**
 * OB-002/OB-003 : membership actif du membre connecté pour ce club — même
 * route que celle consommée par ticketing pour la règle serveur de
 * prévente (jamais un simple claim client).
 */
export async function fetchActiveMembership(teamId: string, userId: string): Promise<ActiveMembership | null> {
  const result = await call<{ active: ActiveMembership | null }>(
    `/api/internal/memberships/active?teamId=${encodeURIComponent(teamId)}&userId=${encodeURIComponent(userId)}`,
  );
  return result.active;
}

/** Candidature de membership pour le membre connecté (déjà authentifié par l'appelant). */
export async function submitMembershipApplication(
  teamId: string,
  userId: string,
  membershipTypeId: string,
): Promise<void> {
  await call('/api/internal/memberships', {
    method: 'POST',
    body: JSON.stringify({ teamId, userId, membershipTypeId }),
  });
}
