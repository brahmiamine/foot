import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cancelMatchTickets = vi.fn();
vi.mock("@/lib/matchCancellationRefunds", () => ({
  cancelMatchTickets: (...args: unknown[]) => cancelMatchTickets(...args),
}));

beforeEach(() => {
  process.env.BILLETTERIE_SERVICE_API_KEY = "test-service-key";
  cancelMatchTickets.mockReset();
});

afterEach(() => {
  delete process.env.BILLETTERIE_SERVICE_API_KEY;
});

function buildRequest(apiKey?: string) {
  return new NextRequest("http://localhost/api/internal/matches/match-1/cancel-tickets", {
    method: "POST",
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });
}

/** TASK-P0-003 — POST /api/internal/matches/[matchId]/cancel-tickets. */
describe("POST /api/internal/matches/[matchId]/cancel-tickets", () => {
  it("rejects without a valid service API key", async () => {
    const { POST } = await import("./route");

    const response = await POST(buildRequest(), { params: Promise.resolve({ matchId: "match-1" }) });

    expect(response.status).toBe(401);
    expect(cancelMatchTickets).not.toHaveBeenCalled();
  });

  it("returns 503 when the service key isn't configured", async () => {
    delete process.env.BILLETTERIE_SERVICE_API_KEY;
    const { POST } = await import("./route");

    const response = await POST(buildRequest("anything"), { params: Promise.resolve({ matchId: "match-1" }) });

    expect(response.status).toBe(503);
  });

  it("cancels the match's tickets and returns the result", async () => {
    cancelMatchTickets.mockResolvedValue({ ticketsReleased: 2, refundCasesOpened: 1 });
    const { POST } = await import("./route");

    const response = await POST(buildRequest("test-service-key"), { params: Promise.resolve({ matchId: "match-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cancelMatchTickets).toHaveBeenCalledWith("match-1");
    expect(body).toEqual({ ticketsReleased: 2, refundCasesOpened: 1 });
  });
});
