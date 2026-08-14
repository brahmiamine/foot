import { describe, expect, it } from "vitest";
import {
  canAccessFederation,
  canAccessLeague,
  canAccessPlatform,
  isPlatformSuperAdmin,
  normalizeRole,
} from "../../../packages/auth-shared/src/roles";

describe("normalizeRole", () => {
  it("maps legacy roles to their target Fédération/Ligue/Club equivalent (migration.md §7)", () => {
    expect(normalizeRole("SUPERADMIN")).toBe("PLATFORM_SUPERADMIN");
    expect(normalizeRole("ADMIN")).toBe("CLUB_ADMIN");
    expect(normalizeRole("OBSERVATEUR")).toBe("CLUB_STAFF");
    expect(normalizeRole("MEMBER")).toBe("MEMBER");
  });

  it("passes target roles through unchanged", () => {
    expect(normalizeRole("PLATFORM_SUPERADMIN")).toBe("PLATFORM_SUPERADMIN");
    expect(normalizeRole("FEDERATION_ADMIN")).toBe("FEDERATION_ADMIN");
    expect(normalizeRole("LEAGUE_ADMIN")).toBe("LEAGUE_ADMIN");
  });

  it("returns null for an unknown role rather than guessing", () => {
    expect(normalizeRole("NOT_A_ROLE")).toBeNull();
  });
});

describe("isPlatformSuperAdmin / canAccessPlatform", () => {
  it("accepts both SUPERADMIN and PLATFORM_SUPERADMIN", () => {
    expect(isPlatformSuperAdmin("SUPERADMIN")).toBe(true);
    expect(isPlatformSuperAdmin("PLATFORM_SUPERADMIN")).toBe(true);
    expect(isPlatformSuperAdmin("FEDERATION_ADMIN")).toBe(false);
  });

  it("canAccessPlatform mirrors isPlatformSuperAdmin for a full session object", () => {
    expect(canAccessPlatform({ role: "SUPERADMIN" })).toBe(true);
    expect(canAccessPlatform({ role: "FEDERATION_ADMIN", federationId: "fed-a" })).toBe(false);
  });
});

describe("canAccessFederation (migration.md §9, §27)", () => {
  it("PLATFORM_SUPERADMIN accesses any federation", () => {
    expect(canAccessFederation({ role: "PLATFORM_SUPERADMIN" }, "fed-a")).toBe(true);
    expect(canAccessFederation({ role: "SUPERADMIN" }, "fed-b")).toBe(true);
  });

  it("FEDERATION_ADMIN A cannot access federation B", () => {
    const sessionA = { role: "FEDERATION_ADMIN", federationId: "fed-a" };
    expect(canAccessFederation(sessionA, "fed-a")).toBe(true);
    expect(canAccessFederation(sessionA, "fed-b")).toBe(false);
  });

  it("FEDERATION_ADMIN without a federationId scope is refused everywhere", () => {
    expect(canAccessFederation({ role: "FEDERATION_ADMIN", federationId: null }, "fed-a")).toBe(false);
  });

  it("LEAGUE_ADMIN never accesses a federation resource", () => {
    expect(canAccessFederation({ role: "LEAGUE_ADMIN", leagueId: "league-x" }, "fed-a")).toBe(false);
  });

  it("CLUB_ADMIN / unknown roles never access a federation resource", () => {
    expect(canAccessFederation({ role: "CLUB_ADMIN", teamId: "team-1" }, "fed-a")).toBe(false);
    expect(canAccessFederation({ role: "MEMBER" }, "fed-a")).toBe(false);
  });
});

describe("canAccessLeague (migration.md §9, §27)", () => {
  it("PLATFORM_SUPERADMIN accesses any league", () => {
    expect(canAccessLeague({ role: "PLATFORM_SUPERADMIN" }, "league-x")).toBe(true);
  });

  it("LEAGUE_ADMIN X cannot access league Y", () => {
    const sessionX = { role: "LEAGUE_ADMIN", leagueId: "league-x" };
    expect(canAccessLeague(sessionX, "league-x")).toBe(true);
    expect(canAccessLeague(sessionX, "league-y")).toBe(false);
  });

  it("FEDERATION_ADMIN accesses a league only when leagueFederationId matches their own federation", () => {
    const sessionA = { role: "FEDERATION_ADMIN", federationId: "fed-a" };
    expect(canAccessLeague(sessionA, "league-x", "fed-a")).toBe(true);
    expect(canAccessLeague(sessionA, "league-x", "fed-b")).toBe(false);
  });

  it("FEDERATION_ADMIN is refused when leagueFederationId is not provided by the caller", () => {
    const sessionA = { role: "FEDERATION_ADMIN", federationId: "fed-a" };
    expect(canAccessLeague(sessionA, "league-x")).toBe(false);
  });

  it("CLUB_ADMIN never accesses a league resource", () => {
    expect(canAccessLeague({ role: "CLUB_ADMIN", teamId: "team-1" }, "league-x")).toBe(false);
  });
});
