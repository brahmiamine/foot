import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envBackup = { ...process.env };

beforeEach(() => {
  process.env.MARKETPLACE_API_URL = "http://marketplace.internal";
  process.env.MARKETPLACE_API_KEY = "test-api-key";
});

afterEach(() => {
  process.env = { ...envBackup };
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** TS-35 — transitions produits déléguées à marketplace (TS-04). */
describe("marketplaceApiClient", () => {
  it("throws when MARKETPLACE_API_URL/MARKETPLACE_API_KEY are not configured", async () => {
    delete process.env.MARKETPLACE_API_URL;
    const { submitMarketplaceProduct } = await import("./marketplaceApiClient");

    await expect(submitMarketplaceProduct("seller-1", "product-1")).rejects.toThrow(
      /MARKETPLACE_API_URL/,
    );
  });

  it("submit: calls the internal endpoint with sellerId, the service API key, and no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: "product-1", sellerId: "seller-1", status: "SUBMITTED" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { submitMarketplaceProduct } = await import("./marketplaceApiClient");

    const result = await submitMarketplaceProduct("seller-1", "product-1");

    expect(result.status).toBe("SUBMITTED");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://marketplace.internal/internal/products/product-1/submit?sellerId=seller-1",
    );
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe("test-api-key");
  });

  it("withdraw: hits the withdraw endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: "product-1", sellerId: "seller-1", status: "DRAFT" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { withdrawMarketplaceProduct } = await import("./marketplaceApiClient");

    await withdrawMarketplaceProduct("seller-1", "product-1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://marketplace.internal/internal/products/product-1/withdraw?sellerId=seller-1",
    );
  });

  it("toggleActive: hits the toggle-active endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: "product-1", sellerId: "seller-1", isActive: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { toggleActiveMarketplaceProduct } = await import("./marketplaceApiClient");

    await toggleActiveMarketplaceProduct("seller-1", "product-1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://marketplace.internal/internal/products/product-1/toggle-active?sellerId=seller-1",
    );
  });

  it("propagates a rejected transition (409) as an error carrying the status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "Transition DRAFT → PUBLISHED non autorisée" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { submitMarketplaceProduct } = await import("./marketplaceApiClient");

    await expect(submitMarketplaceProduct("seller-1", "product-1")).rejects.toMatchObject({
      status: 409,
      message: "Transition DRAFT → PUBLISHED non autorisée",
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => null,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { submitMarketplaceProduct } = await import("./marketplaceApiClient");

    await expect(submitMarketplaceProduct("seller-1", "product-1")).rejects.toMatchObject({
      status: 500,
      message: "marketplace 500",
    });
  });

  it("encodes sellerId in the query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: "product-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { submitMarketplaceProduct } = await import("./marketplaceApiClient");

    await submitMarketplaceProduct("seller/with spaces", "product-1");

    expect(fetchMock.mock.calls[0][0]).toContain("sellerId=seller%2Fwith%20spaces");
  });
});
