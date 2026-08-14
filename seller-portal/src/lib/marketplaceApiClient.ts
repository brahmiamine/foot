/**
 * Client HTTP serveur-à-serveur vers marketplace (voir
 * ../../marketplace/README.md), pour les écritures produit (create,
 * update, delete, submit, withdraw) — voir avancement.md, TS-04.
 * seller-portal a déjà authentifié le vendeur via sa propre session
 * (src/lib/session.ts, SP_JWT_SECRET) : ces routes internal/* de
 * marketplace font confiance à `sellerId` passé explicitement plutôt
 * que d'exiger un second login vendeur (marketplace a son propre JWT
 * self-service, SELLER_JWT_SECRET, non interchangeable avec celui-ci).
 * Les lectures produit restent en TypeORM direct côté seller-portal (même
 * table `sp_products`, aucun problème de cohérence).
 */

class MarketplaceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.MARKETPLACE_API_URL;
  const apiKey = process.env.MARKETPLACE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("MARKETPLACE_API_URL et MARKETPLACE_API_KEY doivent être configurés.");
  }
  return { baseUrl, apiKey };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new MarketplaceApiError((body as { message?: string })?.message ?? `marketplace ${response.status}`, response.status);
  }

  return body as T;
}

export interface MarketplaceProductInput {
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string | null;
  brand?: string | null;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  taxRate?: number;
  weightKg?: number | null;
  dimensions?: string | null;
}

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  status: string;
  rejectionReason: string | null;
  isActive: boolean;
}

export async function createMarketplaceProduct(
  sellerId: string,
  input: MarketplaceProductInput
): Promise<MarketplaceProduct> {
  return apiFetch(`/internal/products?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMarketplaceProduct(
  sellerId: string,
  productId: string,
  input: Partial<MarketplaceProductInput>
): Promise<MarketplaceProduct> {
  return apiFetch(`/internal/products/${productId}?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteMarketplaceProduct(sellerId: string, productId: string): Promise<void> {
  await apiFetch(`/internal/products/${productId}?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "DELETE",
  });
}

export async function submitMarketplaceProduct(sellerId: string, productId: string): Promise<MarketplaceProduct> {
  return apiFetch(`/internal/products/${productId}/submit?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "POST",
  });
}

export async function withdrawMarketplaceProduct(sellerId: string, productId: string): Promise<MarketplaceProduct> {
  return apiFetch(`/internal/products/${productId}/withdraw?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "POST",
  });
}

/** Bascule isActive, sans restriction de statut (voir marketplace ProductsService.toggleActive). */
export async function toggleActiveMarketplaceProduct(sellerId: string, productId: string): Promise<MarketplaceProduct> {
  return apiFetch(`/internal/products/${productId}/toggle-active?sellerId=${encodeURIComponent(sellerId)}`, {
    method: "POST",
  });
}
