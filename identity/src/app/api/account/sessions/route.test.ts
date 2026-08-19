import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  listUserSessions: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock("@/lib/sessionRegistry", () => ({ listUserSessions: mocks.listUserSessions }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/account/sessions", () => {
  it("rejects an unauthenticated request", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.listUserSessions).not.toHaveBeenCalled();
  });

  it("lists only sessions for the authenticated account and marks the current sid", async () => {
    mocks.getCurrentSession.mockResolvedValue({ id: "user-1", sessionId: "sid-current" });
    mocks.listUserSessions.mockResolvedValue([
      {
        id: "sid-current",
        ipAddress: "127.0.0.1",
        userAgent: "Browser",
        createdAt: new Date("2026-08-19T18:00:00Z"),
        lastSeenAt: new Date("2026-08-19T19:00:00Z"),
        expiresAt: new Date("2026-08-20T06:00:00Z"),
        current: true,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.listUserSessions).toHaveBeenCalledWith("user-1", "sid-current");
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].current).toBe(true);
  });
});
