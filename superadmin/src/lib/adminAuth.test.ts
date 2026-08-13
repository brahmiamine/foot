import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import type { SsoUser } from "./ssoSession";

const mockGetSsoSessionFromRequest = vi.fn<() => Promise<SsoUser | null>>();

vi.mock("./ssoSession", () => ({
  getSsoSession: vi.fn(),
  getSsoSessionFromRequest: () => mockGetSsoSessionFromRequest(),
  redirectToLogin: vi.fn(),
}));

const { ensureAdminAuth, ensureFederationAccess, ensureLeagueAccess } = await import("./adminAuth");

const fakeRequest = {} as NextRequest;

function session(overrides: Partial<SsoUser>): SsoUser {
  return {
    id: "u1",
    email: "u1@example.com",
    name: "User One",
    role: "FEDERATION_ADMIN",
    teamId: null,
    federationId: null,
    leagueId: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetSsoSessionFromRequest.mockReset();
});

describe("ensureAdminAuth — accès plateforme complet uniquement (migration.md §9)", () => {
  it("accepts SUPERADMIN and its PLATFORM_SUPERADMIN alias", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "SUPERADMIN" }));
    expect(await ensureAdminAuth(fakeRequest)).toBeNull();

    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "PLATFORM_SUPERADMIN" }));
    expect(await ensureAdminAuth(fakeRequest)).toBeNull();
  });

  it("rejects FEDERATION_ADMIN and LEAGUE_ADMIN — never widened to the full platform gate", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "FEDERATION_ADMIN", federationId: "fed-a" }));
    const res1 = await ensureAdminAuth(fakeRequest);
    expect(res1?.status).toBe(401);

    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "LEAGUE_ADMIN", leagueId: "league-x" }));
    const res2 = await ensureAdminAuth(fakeRequest);
    expect(res2?.status).toBe(401);
  });

  it("rejects when there is no session", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(null);
    const res = await ensureAdminAuth(fakeRequest);
    expect(res?.status).toBe(401);
  });
});

describe("ensureFederationAccess (migration.md §9, §27)", () => {
  it("PLATFORM_SUPERADMIN/SUPERADMIN pass for any federation", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "PLATFORM_SUPERADMIN" }));
    expect(await ensureFederationAccess(fakeRequest, "fed-a")).toBeNull();
  });

  it("FEDERATION_ADMIN A can access federation A but not federation B", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "FEDERATION_ADMIN", federationId: "fed-a" }));
    expect(await ensureFederationAccess(fakeRequest, "fed-a")).toBeNull();

    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "FEDERATION_ADMIN", federationId: "fed-a" }));
    const res = await ensureFederationAccess(fakeRequest, "fed-b");
    expect(res?.status).toBe(403);
  });

  it("LEAGUE_ADMIN never manages a federation", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "LEAGUE_ADMIN", leagueId: "league-x" }));
    const res = await ensureFederationAccess(fakeRequest, "fed-a");
    expect(res?.status).toBe(403);
  });

  it("returns 401 without a session", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(null);
    const res = await ensureFederationAccess(fakeRequest, "fed-a");
    expect(res?.status).toBe(401);
  });
});

describe("ensureLeagueAccess (migration.md §9, §27)", () => {
  it("LEAGUE_ADMIN X can access league X but not league Y", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "LEAGUE_ADMIN", leagueId: "league-x" }));
    expect(await ensureLeagueAccess(fakeRequest, "league-x")).toBeNull();

    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "LEAGUE_ADMIN", leagueId: "league-x" }));
    const res = await ensureLeagueAccess(fakeRequest, "league-y");
    expect(res?.status).toBe(403);
  });

  it("FEDERATION_ADMIN accesses a league of their own federation when leagueFederationId is provided", async () => {
    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "FEDERATION_ADMIN", federationId: "fed-a" }));
    expect(await ensureLeagueAccess(fakeRequest, "league-x", "fed-a")).toBeNull();

    mockGetSsoSessionFromRequest.mockResolvedValueOnce(session({ role: "FEDERATION_ADMIN", federationId: "fed-a" }));
    const res = await ensureLeagueAccess(fakeRequest, "league-x", "fed-b");
    expect(res?.status).toBe(403);
  });
});
