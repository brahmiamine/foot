import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  revokeUserSession: vi.fn(),
  isTrustedOrigin: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
  clearSessionCookie: <T extends { cookies: { set: (options: Record<string, unknown>) => void } }>(response: T) => {
    response.cookies.set({ name: "foot_sso_session", value: "", path: "/", maxAge: 0 });
    return response;
  },
}));
vi.mock("@/lib/sessionRegistry", () => ({ revokeUserSession: mocks.revokeUserSession }));
vi.mock("@/lib/csrf", () => ({ isTrustedOrigin: mocks.isTrustedOrigin }));

import { DELETE } from "./route";

function request() {
  return new NextRequest("https://identity.example.test/api/account/sessions/sid-target", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedOrigin.mockReturnValue(true);
});

describe("DELETE /api/account/sessions/[id]", () => {
  it("rejects an untrusted origin before touching session state", async () => {
    mocks.isTrustedOrigin.mockReturnValue(false);

    const response = await DELETE(request(), { params: Promise.resolve({ id: "sid-target" }) });

    expect(response.status).toBe(403);
    expect(mocks.getCurrentSession).not.toHaveBeenCalled();
    expect(mocks.revokeUserSession).not.toHaveBeenCalled();
  });

  it("scopes revocation to the authenticated user", async () => {
    mocks.getCurrentSession.mockResolvedValue({ id: "user-1", sessionId: "sid-current" });
    mocks.revokeUserSession.mockResolvedValue(false);

    const response = await DELETE(request(), { params: Promise.resolve({ id: "sid-foreign" }) });

    expect(mocks.revokeUserSession).toHaveBeenCalledWith("user-1", "sid-foreign");
    expect(response.status).toBe(404);
  });

  it("revokes another device without clearing the current cookie", async () => {
    mocks.getCurrentSession.mockResolvedValue({ id: "user-1", sessionId: "sid-current" });
    mocks.revokeUserSession.mockResolvedValue(true);

    const response = await DELETE(request(), { params: Promise.resolve({ id: "sid-other" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.current).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears the cookie when the current session revokes itself", async () => {
    mocks.getCurrentSession.mockResolvedValue({ id: "user-1", sessionId: "sid-current" });
    mocks.revokeUserSession.mockResolvedValue(true);

    const response = await DELETE(request(), { params: Promise.resolve({ id: "sid-current" }) });
    const body = await response.json();

    expect(body.current).toBe(true);
    expect(response.headers.get("set-cookie") ?? "").toContain("foot_sso_session=;");
  });
});
