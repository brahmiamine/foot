import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  fetchGoogleProfile: vi.fn(),
  findOrCreateGoogleMember: vi.fn(),
  registerGoogleMemberForClub: vi.fn(),
  issueSession: vi.fn(),
}));

vi.mock("@/lib/google", () => ({ fetchGoogleProfile: mocks.fetchGoogleProfile }));
vi.mock("@/lib/members", () => ({ findOrCreateGoogleMember: mocks.findOrCreateGoogleMember }));
vi.mock("@/lib/memberRegistration", () => ({
  registerGoogleMemberForClub: mocks.registerGoogleMemberForClub,
  MemberRegistrationError: class MemberRegistrationError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
      this.name = "MemberRegistrationError";
    }
  },
}));
vi.mock("@/lib/session", () => ({ issueSession: mocks.issueSession }));
vi.mock("@/lib/redirect", () => ({ sanitizeRedirect: (value: string | null) => value }));

import { GET } from "./route";

function callbackRequest(statePayload: Record<string, unknown>) {
  const state = String(statePayload.state);
  const cookie = encodeURIComponent(JSON.stringify(statePayload));
  return new NextRequest(`https://identity.example.test/api/auth/google/callback?code=code-1&state=${state}`, {
    headers: { cookie: `sso_oauth_state=${cookie}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchGoogleProfile.mockResolvedValue({
    email: "fan@example.test",
    name: "Fan Google",
    emailVerified: true,
  });
});

describe("Google OAuth callback — ID-004", () => {
  it("enforces the club registration workflow when OAuth state contains teamId", async () => {
    mocks.registerGoogleMemberForClub.mockResolvedValue({
      status: "ACTIVE",
      user: { id: "u-1", email: "fan@example.test", name: "Fan Google", role: "MEMBER", teamId: null, tokenVersion: 0 },
      affiliationCreated: true,
    });

    const response = await GET(callbackRequest({
      state: "state-1",
      redirect: "https://club.example.test/espace-membre",
      teamId: "team-1",
      invitationToken: "invite-1",
    }));

    expect(mocks.registerGoogleMemberForClub).toHaveBeenCalledWith({
      teamId: "team-1",
      email: "fan@example.test",
      name: "Fan Google",
      invitationToken: "invite-1",
    });
    expect(mocks.findOrCreateGoogleMember).not.toHaveBeenCalled();
    expect(mocks.issueSession).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("https://club.example.test/espace-membre");
  });

  it("does not issue a session for a new user waiting for club approval", async () => {
    mocks.registerGoogleMemberForClub.mockResolvedValue({
      status: "PENDING_CLUB_APPROVAL",
      requestId: "request-1",
    });

    const response = await GET(callbackRequest({
      state: "state-2",
      redirect: "https://club.example.test/espace-membre",
      teamId: "team-1",
    }));

    expect(mocks.issueSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/membre/login?error=club_approval_pending");
  });

  it("keeps legacy Google MEMBER login when no club context is present", async () => {
    mocks.findOrCreateGoogleMember.mockResolvedValue({
      ok: true,
      user: { id: "u-global", email: "fan@example.test", name: "Fan Google", role: "MEMBER", teamId: null, tokenVersion: 0 },
    });

    await GET(callbackRequest({
      state: "state-3",
      redirect: "https://client.example.test/",
    }));

    expect(mocks.findOrCreateGoogleMember).toHaveBeenCalledTimes(1);
    expect(mocks.registerGoogleMemberForClub).not.toHaveBeenCalled();
    expect(mocks.issueSession).toHaveBeenCalledTimes(1);
  });
});
