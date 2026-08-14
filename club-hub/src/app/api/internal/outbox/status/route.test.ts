import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getStats = vi.fn();
vi.mock("@/services/NotificationOutboxService", () => ({
  NotificationOutboxService: class {
    getStats = getStats;
  },
}));

beforeEach(() => {
  process.env.CLUB_HUB_SERVICE_API_KEY = "test-service-key";
  getStats.mockReset();
});

afterEach(() => {
  delete process.env.CLUB_HUB_SERVICE_API_KEY;
});

function buildRequest(apiKey?: string) {
  return new NextRequest("http://localhost/api/internal/outbox/status", {
    method: "GET",
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
}

/** TASK-P0-006 (todo.md) — GET /api/internal/outbox/status. */
describe("GET /api/internal/outbox/status", () => {
  it("rejects without a valid service API key", async () => {
    const { GET } = await import("./route");

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(getStats).not.toHaveBeenCalled();
  });

  it("returns ok when the dead-letter queue is empty", async () => {
    getStats.mockResolvedValue({ pending: 3, processed: 40, dlq: 0 });
    const { GET } = await import("./route");

    const response = await GET(buildRequest("test-service-key"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", pending: 3, processed: 40, dlq: 0 });
  });

  it("returns degraded when events have dead-lettered", async () => {
    getStats.mockResolvedValue({ pending: 1, processed: 40, dlq: 2 });
    const { GET } = await import("./route");

    const response = await GET(buildRequest("test-service-key"));
    const body = await response.json();

    expect(body).toMatchObject({ status: "degraded", dlq: 2 });
  });
});
