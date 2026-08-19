import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createMemberAccount: vi.fn(),
  registerPasswordMemberForClub: vi.fn(),
  issueSession: vi.fn(),
  recordFailedLoginAttempt: vi.fn(),
}));

vi.mock("@/lib/members", () => ({ createMemberAccount: mocks.createMemberAccount }));
vi.mock("@/lib/memberRegistration", () => ({
  registerPasswordMemberForClub: mocks.registerPasswordMemberForClub,
  MemberRegistrationError: class MemberRegistrationError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
      this.name = "MemberRegistrationError";
    }
  },
}));
vi.mock("@/lib/session", () => ({ issueSession: mocks.issueSession }));
vi.mock("@/lib/getClientIP", () => ({ getClientIP: () => "203.0.113.10" }));
vi.mock("@/lib/loginRateLimit", () => ({
  isLoginRateLimited: () => false,
  recordFailedLoginAttempt: mocks.recordFailedLoginAttempt,
}));
vi.mock("@/lib/redirect", () => ({ sanitizeRedirect: (value: string | null) => value }));

import { MemberRegistrationError } from "@/lib/memberRegistration";
import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("https://identity.example.test/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/register — ID-004", () => {
  it("uses the governed club registration workflow when teamId is present", async () => {
    mocks.registerPasswordMemberForClub.mockResolvedValue({
      status: "ACTIVE",
      user: { id: "u-1", email: "fan@example.test", name: "Fan", role: "MEMBER", teamId: null, tokenVersion: 0 },
      affiliationCreated: true,
    });

    const response = await POST(request({
      name: "Fan",
      email: "fan@example.test",
      password: "password123",
      teamId: "team-1",
      invitationToken: "invite-token",
      redirect: "https://club.example.test/espace-membre",
    }));

    expect(response.status).toBe(200);
    expect(mocks.registerPasswordMemberForClub).toHaveBeenCalledWith(expect.objectContaining({
      teamId: "team-1",
      email: "fan@example.test",
      invitationToken: "invite-token",
    }));
    expect(mocks.createMemberAccount).not.toHaveBeenCalled();
    expect(mocks.issueSession).toHaveBeenCalledTimes(1);
  });

  it("returns 202 and does not issue a session while club approval is pending", async () => {
    mocks.registerPasswordMemberForClub.mockResolvedValue({
      status: "PENDING_CLUB_APPROVAL",
      requestId: "request-1",
    });

    const response = await POST(request({
      name: "Fan",
      email: "fan@example.test",
      password: "password123",
      teamId: "team-1",
    }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ status: "PENDING_CLUB_APPROVAL", requestId: "request-1" });
    expect(mocks.issueSession).not.toHaveBeenCalled();
  });

  it("rejects a closed club registration and never creates a session", async () => {
    mocks.registerPasswordMemberForClub.mockRejectedValue(
      new MemberRegistrationError("REGISTRATION_CLOSED", "Les inscriptions sont fermées pour ce club"),
    );

    const response = await POST(request({
      name: "Fan",
      email: "fan@example.test",
      password: "password123",
      teamId: "team-1",
    }));

    expect(response.status).toBe(403);
    expect(mocks.issueSession).not.toHaveBeenCalled();
    expect(mocks.recordFailedLoginAttempt).toHaveBeenCalledTimes(1);
  });

  it("keeps the legacy global MEMBER signup when no teamId is supplied", async () => {
    mocks.createMemberAccount.mockResolvedValue({
      ok: true,
      user: { id: "u-legacy", email: "global@example.test", name: "Global", role: "MEMBER", teamId: null, tokenVersion: 0 },
    });

    const response = await POST(request({
      name: "Global",
      email: "global@example.test",
      password: "password123",
    }));

    expect(response.status).toBe(200);
    expect(mocks.createMemberAccount).toHaveBeenCalledTimes(1);
    expect(mocks.registerPasswordMemberForClub).not.toHaveBeenCalled();
    expect(mocks.issueSession).toHaveBeenCalledTimes(1);
  });
});
