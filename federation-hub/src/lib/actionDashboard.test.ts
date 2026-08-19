import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import type { SsoUser } from "./ssoSession";

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("./regulatorySla", () => ({
  getRegulatoryPendingQueue: mocks.pending,
}));
vi.mock("./regulatoryPermissions", () => ({
  hasRegulatoryPermission: mocks.hasPermission,
}));

import { getFederationActionDashboard } from "./actionDashboard";

const session: SsoUser = {
  id: "league-admin-1",
  email: "league@example.test",
  name: "League Admin",
  role: "LEAGUE_ADMIN",
  teamId: null,
  federationId: "fed-1",
  leagueId: "league-1",
};

function pendingItem(federationId: string, entityId: string) {
  return {
    domain: "GRANT" as const,
    entityId,
    label: entityId,
    federationId,
    leagueId: null,
    pendingSince: new Date("2026-08-19T08:00:00Z"),
    hoursPending: 5,
    state: "OVERDUE" as const,
    reminderAt: new Date("2026-08-19T09:00:00Z"),
    dueAt: new Date("2026-08-19T10:00:00Z"),
    escalationAt: new Date("2026-08-19T11:00:00Z"),
    policyVersion: 3,
  };
}

describe("Federation action dashboard (GOV-009)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only pending work whose review permission is effective for the actor", async () => {
    mocks.pending.mockResolvedValue([
      {
        domain: "CLUB_LICENSE",
        entityId: "license-1",
        label: "LIC-001",
        federationId: "fed-1",
        leagueId: "league-1",
        pendingSince: new Date("2026-08-19T08:00:00Z"),
        hoursPending: 5,
        state: "DUE_SOON",
        reminderAt: new Date("2026-08-19T09:00:00Z"),
        dueAt: new Date("2026-08-19T10:00:00Z"),
        escalationAt: new Date("2026-08-19T11:00:00Z"),
        policyVersion: 2,
      },
      pendingItem("fed-1", "grant-1"),
    ]);
    mocks.hasPermission.mockImplementation(
      async (_source: DataSource, _session: SsoUser, permission: string) => permission === "grant.review",
    );

    const items = await getFederationActionDashboard({} as DataSource, session);

    expect(mocks.pending).toHaveBeenCalledWith(expect.anything(), session);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "regulatory:GRANT:grant-1",
      domain: "REGULATORY_GRANT",
      entityId: "grant-1",
      href: "/admin/federal-operations?domain=grants",
      priority: "OVERDUE",
      scope: { federationId: "fed-1", leagueId: "league-1" },
    });
  });

  it("aggregates active federations for a platform superadmin without a federation scope", async () => {
    const platform: SsoUser = {
      id: "platform-1",
      email: "platform@example.test",
      name: "Platform",
      role: "PLATFORM_SUPERADMIN",
      teamId: null,
      federationId: null,
      leagueId: null,
    };
    const source = {
      query: vi.fn().mockResolvedValue([{ id: "fed-1" }, { id: "fed-2" }]),
    } as unknown as DataSource;
    mocks.pending.mockImplementation(
      async (_source: DataSource, _session: SsoUser, federationId: string) => [
        pendingItem(federationId, `grant-${federationId}`),
      ],
    );
    mocks.hasPermission.mockResolvedValue(true);

    const items = await getFederationActionDashboard(source, platform);

    expect(source.query).toHaveBeenCalledWith(
      "SELECT id FROM federations WHERE is_active = 1 ORDER BY name ASC",
    );
    expect(mocks.pending).toHaveBeenCalledTimes(2);
    expect(items.map((item) => item.scope.federationId)).toEqual(["fed-1", "fed-2"]);
  });
});
