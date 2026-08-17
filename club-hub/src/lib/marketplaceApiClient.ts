function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.MARKETPLACE_API_URL; const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('MARKETPLACE_API_URL et MARKETPLACE_API_KEY doivent être configurés pour la marketplace.');
  return { baseUrl, apiKey };
}

export interface MarketplaceSeller { id: string; clubId: string; businessName: string; ownerName: string; email: string; phone?: string | null; status: string; statusReason: string | null; commissionRate: string; documents?: Array<{label:string;url:string}> | null; createdAt: string }
export interface MarketplaceSellerApplication { id: string; clubId: string; businessName: string; ownerName: string; email: string; phone: string | null; activityCategory: string | null; taxId: string | null; tradeRegister: string | null; documents: Array<{label:string;url:string}> | null; status: string; rejectionReason: string | null; reviewedBy: string | null; reviewedAt: string | null; sellerId: string | null; createdAt: string }
export interface MarketplaceSettings { clubId: string; sellerApplicationsEnabled: boolean; sellerApprovalRequired: boolean; productApprovalRequired: boolean; productReapprovalOnSensitiveChange: boolean; updatedBy: string | null }
export interface MarketplaceCategory { id: string; clubId: string; name: string }
export interface MarketplaceProduct { id: string; sellerId: string; seller: MarketplaceSeller; name: string; categoryId: string | null; price: string; status: string; rejectionReason: string | null; reviewedBy: string | null; reviewedAt: string | null; createdAt: string; updatedAt: string }
export interface ModerationProductFilters { sellerId?: string; status?: string; categoryId?: string; name?: string; from?: string; to?: string }

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig(); const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, ...(init?.headers ?? {}) }, cache: 'no-store' });
  if (!response.ok) { const body = await response.text().catch(() => ''); throw new Error(`marketplace ${response.status} sur ${path}: ${body}`); }
  return response.json() as Promise<T>;
}
function buildQuery(params: Record<string, string | undefined>): string { const qs = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value); const query = qs.toString(); return query ? `?${query}` : ''; }

export const listSellersForClub = (clubId: string) => apiFetch<MarketplaceSeller[]>(`/sellers${buildQuery({ clubId })}`);
export const listCategoriesForClub = (clubId: string) => apiFetch<MarketplaceCategory[]>(`/categories${buildQuery({ clubId })}`);
export const listSellerApplicationsForClub = (clubId: string, status?: string) => apiFetch<MarketplaceSellerApplication[]>(`/seller-applications${buildQuery({ clubId, status })}`);
export const getMarketplaceSettings = (clubId: string) => apiFetch<MarketplaceSettings>(`/marketplace-settings${buildQuery({ clubId })}`);
export const updateMarketplaceSettings = (clubId: string, actorId: string, settings: Omit<MarketplaceSettings, 'clubId'|'updatedBy'>) => apiFetch<MarketplaceSettings>(`/marketplace-settings${buildQuery({ clubId })}`, { method: 'PATCH', body: JSON.stringify({ ...settings, actorId }) });
export const updateSellerStatus = (id: string, clubId: string, status: string, reason?: string) => apiFetch<MarketplaceSeller>(`/sellers/${id}/status${buildQuery({ clubId })}`, { method: 'PATCH', body: JSON.stringify({ status, reason }) });
export const updateSellerCommission = (id: string, clubId: string, commissionRate: number) => apiFetch<MarketplaceSeller>(`/sellers/${id}/commission${buildQuery({ clubId })}`, { method: 'PATCH', body: JSON.stringify({ commissionRate }) });

async function applicationTransition(id: string, clubId: string, action: 'review'|'approve'|'reject', actorId: string, reason?: string) { return apiFetch<MarketplaceSellerApplication | { application: MarketplaceSellerApplication; seller: MarketplaceSeller }>(`/seller-applications/${id}/${action}${buildQuery({ clubId })}`, { method: 'POST', body: JSON.stringify({ actorId, reason }) }); }
export const reviewSellerApplication = (id: string, clubId: string, actorId: string) => applicationTransition(id, clubId, 'review', actorId);
export const approveSellerApplication = (id: string, clubId: string, actorId: string) => applicationTransition(id, clubId, 'approve', actorId);
export const rejectSellerApplication = (id: string, clubId: string, actorId: string, reason: string) => applicationTransition(id, clubId, 'reject', actorId, reason);

export const listModerationProducts = (clubId: string, filters: ModerationProductFilters) => apiFetch<MarketplaceProduct[]>(`/moderation/products${buildQuery({ clubId, ...filters })}`);
async function moderationTransition(id: string, clubId: string, action: 'review'|'approve'|'publish'|'reject', body: Record<string, unknown>): Promise<MarketplaceProduct> { return apiFetch(`/moderation/products/${id}/${action}${buildQuery({ clubId })}`, { method: 'POST', body: JSON.stringify(body) }); }
export const reviewProduct = (id: string, clubId: string, actorId: string) => moderationTransition(id, clubId, 'review', { actorId });
export const approveProduct = (id: string, clubId: string, actorId: string) => moderationTransition(id, clubId, 'approve', { actorId });
export const publishProduct = (id: string, clubId: string, actorId: string) => moderationTransition(id, clubId, 'publish', { actorId });
export const rejectProduct = (id: string, clubId: string, actorId: string, rejectionReason: string) => moderationTransition(id, clubId, 'reject', { actorId, rejectionReason });
