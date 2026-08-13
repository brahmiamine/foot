import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

const envBackup = { ...process.env };

beforeEach(() => {
  process.env.TEAMMANAGER_SERVICE_API_KEY = "current-key";
});

afterEach(() => {
  process.env = { ...envBackup };
});

function buildRequest(apiKey?: string) {
  return new NextRequest("http://localhost/api/internal/outbox/process", {
    method: "POST",
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
}

/** TASK-P0-003 : rotation sans interruption de TEAMMANAGER_SERVICE_API_KEY. */
describe("ensureServiceAuth", () => {
  it("returns 503 when TEAMMANAGER_SERVICE_API_KEY is not configured", async () => {
    delete process.env.TEAMMANAGER_SERVICE_API_KEY;
    const { ensureServiceAuth } = await import("./serviceAuth");

    const response = ensureServiceAuth(buildRequest("anything"));

    expect(response?.status).toBe(503);
  });

  it("returns 401 without an x-api-key header", async () => {
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest())?.status).toBe(401);
  });

  it("returns 401 for an unknown key", async () => {
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest("wrong-key"))?.status).toBe(401);
  });

  it("accepts the current key (returns null)", async () => {
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest("current-key"))).toBeNull();
  });

  it("accepts the previous key while still within the grace period", async () => {
    process.env.TEAMMANAGER_SERVICE_API_KEY_PREVIOUS = "old-key";
    process.env.TEAMMANAGER_SERVICE_API_KEY_PREVIOUS_EXPIRES_AT = new Date(Date.now() + 60_000).toISOString();
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest("old-key"))).toBeNull();
  });

  it("rejects the previous key once the grace period has expired", async () => {
    process.env.TEAMMANAGER_SERVICE_API_KEY_PREVIOUS = "old-key";
    process.env.TEAMMANAGER_SERVICE_API_KEY_PREVIOUS_EXPIRES_AT = new Date(Date.now() - 60_000).toISOString();
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest("old-key"))?.status).toBe(401);
  });

  it("accepts the previous key with no expiry configured (no rotation deadline set)", async () => {
    process.env.TEAMMANAGER_SERVICE_API_KEY_PREVIOUS = "old-key";
    const { ensureServiceAuth } = await import("./serviceAuth");

    expect(ensureServiceAuth(buildRequest("old-key"))).toBeNull();
  });
});
