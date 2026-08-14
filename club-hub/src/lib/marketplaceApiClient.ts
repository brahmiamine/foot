/**
 * Client HTTP serveur-à-serveur vers marketplace (voir
 * ../../marketplace/README.md). Remplace l'accès cross-DB direct que
 * club-hub avait auparavant vers `sp_products`/`sp_sellers` (voir
 * avancement.md, TS-04) : toute la modération marketplace passe désormais
 * par cette API, jamais par une entité TypeORM locale.
 */

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.MARKETPLACE_API_URL;
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("MARKETPLACE_API_URL et MARKETPLACE_API_KEY doivent être configurés pour la modération marketplace.");
  }
  return { baseUrl, apiKey };
}

export interface MarketplaceSeller {
  id: string;
  clubId: string;
  businessName: string;
  email: string;
}

export interface MarketplaceCategory {
  id: string;
  clubId: string;
  name: string;
}

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  seller: MarketplaceSeller;
  name: string;
  categoryId: string | null;
  price: string;
  status: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationProductFilters {
  sellerId?: string;
  status?: string;
  categoryId?: string;
  name?: string;
  from?: string;
  to?: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`marketplace ${response.status} sur ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function listSellersForClub(clubId: string): Promise<MarketplaceSeller[]> {
  return apiFetch(`/sellers${buildQuery({ clubId })}`);
}

export async function listCategoriesForClub(clubId: string): Promise<MarketplaceCategory[]> {
  return apiFetch(`/categories${buildQuery({ clubId })}`);
}

export async function listModerationProducts(
  clubId: string,
  filters: ModerationProductFilters
): Promise<MarketplaceProduct[]> {
  return apiFetch(`/moderation/products${buildQuery({ clubId, ...filters })}`);
}

async function moderationTransition(
  id: string,
  clubId: string,
  action: "review" | "approve" | "publish" | "reject",
  body: Record<string, unknown>
): Promise<MarketplaceProduct> {
  return apiFetch(`/moderation/products/${id}/${action}${buildQuery({ clubId })}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** SUBMITTED -> UNDER_REVIEW */
export async function reviewProduct(id: string, clubId: string, actorId: string): Promise<MarketplaceProduct> {
  return moderationTransition(id, clubId, "review", { actorId });
}

/** UNDER_REVIEW -> APPROVED */
export async function approveProduct(id: string, clubId: string, actorId: string): Promise<MarketplaceProduct> {
  return moderationTransition(id, clubId, "approve", { actorId });
}

/** APPROVED -> PUBLISHED */
export async function publishProduct(id: string, clubId: string, actorId: string): Promise<MarketplaceProduct> {
  return moderationTransition(id, clubId, "publish", { actorId });
}

/** UNDER_REVIEW -> REJECTED (motif obligatoire) */
export async function rejectProduct(
  id: string,
  clubId: string,
  actorId: string,
  rejectionReason: string
): Promise<MarketplaceProduct> {
  return moderationTransition(id, clubId, "reject", { actorId, rejectionReason });
}
