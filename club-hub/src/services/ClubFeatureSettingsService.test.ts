import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClubConfigurationAudit } from "@/entities/ClubConfigurationAudit";
import { ClubFeatureSettings } from "@/entities/ClubFeatureSettings";
import {
  ClubFeatureDisabledError,
  ClubFeatureSettingsService,
} from "./ClubFeatureSettingsService";

let rows: ClubFeatureSettings[] = [];
let audits: ClubConfigurationAudit[] = [];

function settingsRepository() {
  return {
    find: (options: { where: { teamId: string; feature?: string } }) =>
      Promise.resolve(
        rows
          .filter(
            (row) =>
              row.teamId === options.where.teamId &&
              (options.where.feature == null || row.feature === options.where.feature),
          )
          .sort((a, b) => b.version - a.version),
      ),
    create: (data: Partial<ClubFeatureSettings>) =>
      ({ id: `feature-${rows.length + 1}`, createdAt: new Date(), ...data }) as ClubFeatureSettings,
    save: (row: ClubFeatureSettings) => {
      rows.push(row);
      return Promise.resolve(row);
    },
  };
}

function auditRepository() {
  return {
    create: (data: Partial<ClubConfigurationAudit>) =>
      ({ id: `audit-${audits.length + 1}`, createdAt: new Date(), ...data }) as ClubConfigurationAudit,
    save: (row: ClubConfigurationAudit) => {
      audits.push(row);
      return Promise.resolve(row);
    },
  };
}

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const getRepository = (entity: unknown) => {
      if (entity === ClubFeatureSettings) return settingsRepository();
      if (entity === ClubConfigurationAudit) return auditRepository();
      throw new Error("Unexpected repository in ClubFeatureSettingsService test");
    };
    return {
      getRepository,
      transaction: (callback: (manager: { getRepository: typeof getRepository }) => Promise<unknown>) =>
        callback({ getRepository }),
    };
  },
}));

function context(reason = "Désactivation temporaire du module") {
  return {
    actorUserId: "admin-1",
    actorRole: "ADMIN",
    reason,
    ipAddress: "203.0.113.10",
    userAgent: "vitest",
  };
}

beforeEach(() => {
  rows = [];
  audits = [];
});

describe("ClubFeatureSettingsService (GOV-010)", () => {
  it("keeps modules enabled by default for backward compatibility", async () => {
    const service = new ClubFeatureSettingsService();
    await expect(service.assertEnabled("team-1", "ACADEMY")).resolves.toBeUndefined();
    await expect(service.assertEnabled("team-1", "TICKETING")).resolves.toBeUndefined();
  });

  it("blocks the server boundary once a club disables a module", async () => {
    const service = new ClubFeatureSettingsService();
    await service.update("team-1", "ACADEMY", false, context());

    await expect(service.assertEnabled("team-1", "ACADEMY")).rejects.toThrow(
      ClubFeatureDisabledError,
    );
  });

  it("never leaks one club feature setting into another club", async () => {
    const service = new ClubFeatureSettingsService();
    await service.update("team-1", "RECRUITMENT", false, context());

    await expect(service.assertEnabled("team-2", "RECRUITMENT")).resolves.toBeUndefined();
  });

  it("keeps versioned snapshots and standard configuration audit evidence", async () => {
    const service = new ClubFeatureSettingsService();
    await service.update("team-1", "SPONSORING", true, context("Activation initiale du sponsoring"));
    const second = await service.update(
      "team-1",
      "SPONSORING",
      false,
      context("Suspension du sponsoring pendant la maintenance"),
    );

    expect(second.version).toBe(2);
    expect(rows.map((row) => [row.version, row.enabled])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(audits).toHaveLength(2);
    expect(audits[1]).toMatchObject({
      domain: "CLUB_FEATURES",
      configurationKey: "FEATURE_SETTINGS",
      scopeType: "CLUB_FEATURE",
      scopeId: "team-1:SPONSORING",
      previousVersion: 1,
      newVersion: 2,
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      reason: "Suspension du sponsoring pendant la maintenance",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
    });
    expect(audits[1].before).toMatchObject({ version: 1, enabled: true });
    expect(audits[1].after).toMatchObject({ version: 2, enabled: false });
  });

  it("resolves future feature versions only once their effective date is reached", async () => {
    const service = new ClubFeatureSettingsService();
    await service.update("team-1", "MARKETPLACE", true, {
      ...context("Activation du marketplace"),
      effectiveFrom: new Date("2026-08-01T00:00:00Z"),
    });
    await service.update("team-1", "MARKETPLACE", false, {
      ...context("Fermeture marketplace programmée"),
      effectiveFrom: new Date("2026-09-01T00:00:00Z"),
    });

    await expect(service.get("team-1", "MARKETPLACE", new Date("2026-08-20T00:00:00Z"))).resolves.toMatchObject({
      enabled: true,
      version: 1,
    });
    await expect(service.get("team-1", "MARKETPLACE", new Date("2026-09-02T00:00:00Z"))).resolves.toMatchObject({
      enabled: false,
      version: 2,
    });
  });
});
