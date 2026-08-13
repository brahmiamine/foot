import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cancelForMatch = vi.fn();
vi.mock("@/services/ConvocationService", () => ({
  ConvocationService: class {
    cancelForMatch = cancelForMatch;
  },
}));

beforeEach(() => {
  process.env.TEAMMANAGER_SERVICE_API_KEY = "test-service-key";
  cancelForMatch.mockReset();
});

afterEach(() => {
  delete process.env.TEAMMANAGER_SERVICE_API_KEY;
});

function buildRequest(apiKey?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/internal/matches/match-1/cancel-convocations", {
    method: "POST",
    headers: {
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** TASK-P0-003 — POST /api/internal/matches/[matchId]/cancel-convocations. */
describe("POST /api/internal/matches/[matchId]/cancel-convocations", () => {
  it("rejects without a valid service API key", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest(), { params: Promise.resolve({ matchId: "match-1" }) });

    expect(response.status).toBe(401);
    expect(cancelForMatch).not.toHaveBeenCalled();
  });

  it("cancels the match's convocations with the given reason", async () => {
    cancelForMatch.mockResolvedValue(5);
    const { POST } = await import("./route");

    const response = await POST(buildRequest("test-service-key", { reason: "Terrain impraticable." }), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cancelForMatch).toHaveBeenCalledWith("match-1", "Terrain impraticable.");
    expect(body).toEqual({ cancelled: 5 });
  });

  it("falls back to a default reason when the body is missing/invalid", async () => {
    cancelForMatch.mockResolvedValue(0);
    const { POST } = await import("./route");

    const response = await POST(buildRequest("test-service-key"), { params: Promise.resolve({ matchId: "match-1" }) });

    expect(response.status).toBe(200);
    expect(cancelForMatch).toHaveBeenCalledWith("match-1", "Match annulé.");
  });
});
