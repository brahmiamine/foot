import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const processDue = vi.fn();
vi.mock("@/services/NotificationOutboxService", () => ({
  NotificationOutboxService: class {
    processDue = processDue;
  },
}));

beforeEach(() => {
  process.env.CLUB_HUB_SERVICE_API_KEY = "test-service-key";
  processDue.mockReset();
});

afterEach(() => {
  delete process.env.CLUB_HUB_SERVICE_API_KEY;
});

function buildRequest(apiKey?: string) {
  return new NextRequest("http://localhost/api/internal/outbox/process", {
    method: "POST",
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
}

/** TS-26 — POST /api/internal/outbox/process. */
describe("POST /api/internal/outbox/process", () => {
  it("rejects without a valid service API key", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(processDue).not.toHaveBeenCalled();
  });

  it("returns 503 when the service key isn't configured", async () => {
    delete process.env.CLUB_HUB_SERVICE_API_KEY;
    const { POST } = await import("./route");

    const response = await POST(buildRequest("anything"));

    expect(response.status).toBe(503);
  });

  it("processes the outbox and returns the result", async () => {
    processDue.mockResolvedValue({ processed: 2, failed: 0, rescheduled: 1 });
    const { POST } = await import("./route");

    const response = await POST(buildRequest("test-service-key"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 2, failed: 0, rescheduled: 1 });
  });
});
