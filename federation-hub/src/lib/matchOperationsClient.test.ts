import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envBackup = { ...process.env };

beforeEach(() => {
  process.env.MATCH_OPERATIONS_URL = "http://match-operations.invalid";
  process.env.MATCH_OPERATIONS_SERVICE_API_KEY = "test-key";
});

afterEach(() => {
  process.env = { ...envBackup };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** TASK-P0-014 : réouverture idempotente — la même clé est réutilisée sur les retries réseau. */
describe("reopenSheet", () => {
  it("throws when MATCH_OPERATIONS_URL/MATCH_OPERATIONS_SERVICE_API_KEY are not configured", async () => {
    delete process.env.MATCH_OPERATIONS_URL;
    const { reopenSheet } = await import("./matchOperationsClient");

    await expect(reopenSheet("match-1")).rejects.toThrow(/non configurés/);
  });

  it("succeeds on the first attempt without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { reopenSheet } = await import("./matchOperationsClient");

    await reopenSheet("match-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the same Idempotency-Key header on every retry after a network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { reopenSheet } = await import("./matchOperationsClient");

    await reopenSheet("match-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(secondHeaders["Idempotency-Key"]).toBe(firstHeaders["Idempotency-Key"]);
  });

  it("throws after exhausting retries on repeated network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const { reopenSheet } = await import("./matchOperationsClient");

    await expect(reopenSheet("match-1")).rejects.toThrow(/Échec de la réouverture/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never retries a received HTTP error response (business refusal, not a network failure)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Impossible de rouvrir une feuille au statut DRAFT" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reopenSheet } = await import("./matchOperationsClient");

    await expect(reopenSheet("match-1")).rejects.toThrow(/Impossible de rouvrir/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
