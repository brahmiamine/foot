import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClubConfigurationAudit } from "@/entities/ClubConfigurationAudit";
import { PublicFormSettings } from "@/entities/PublicFormSettings";
import { PublicFormClosedError, PublicFormSettingsService } from "./PublicFormSettingsService";

let rows: PublicFormSettings[] = [];
let audits: ClubConfigurationAudit[] = [];

function settingsRepository() {
  return {
    find: (options: { where: { teamId: string; domain?: string } }) =>
      Promise.resolve(
        rows
          .filter(
            (row) =>
              row.teamId === options.where.teamId &&
              (options.where.domain == null || row.domain === options.where.domain),
          )
          .sort((a, b) => b.version - a.version),
      ),
    create: (data: Partial<PublicFormSettings>) =>
      ({
        id: `pfs-${rows.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }) as PublicFormSettings,
    save: (row: PublicFormSettings) => {
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
      if (entity === PublicFormSettings) return settingsRepository();
      if (entity === ClubConfigurationAudit) return auditRepository();
      throw new Error("Unexpected repository in PublicFormSettingsService test");
    };
    return {
      getRepository,
      transaction: (callback: (manager: { getRepository: typeof getRepository }) => Promise<unknown>) =>
        callback({ getRepository }),
    };
  },
}));

beforeEach(() => {
  rows = [];
  audits = [];
});

function mutationContext(reason = "Mise à jour de la gouvernance des formulaires") {
  return {
    actorUserId: "admin-1",
    actorRole: "CLUB_ADMIN",
    reason,
    ipAddress: "203.0.113.20",
    userAgent: "vitest",
  };
}

describe("PublicFormSettingsService", () => {
  it("is open by default when nothing is configured", async () => {
    const service = new PublicFormSettingsService();
    await expect(service.assertOpen("team-1", "CONTACT")).resolves.toBeUndefined();
  });

  it("explains whether the effective form setting comes from defaults or a club policy", async () => {
    const service = new PublicFormSettingsService();
    const defaults = await service.getExplained("team-1", "CONTACT");
    expect(defaults.sources.isOpen).toEqual({ kind: "DEFAULT" });

    await service.update("team-1", "CONTACT", { isOpen: false }, mutationContext());
    const configured = await service.getExplained("team-1", "CONTACT");
    expect(configured.values.isOpen).toBe(false);
    expect(configured.sources.isOpen).toMatchObject({
      kind: "POLICY",
      scopeType: "CLUB",
      scopeId: "team-1",
      version: 1,
    });
  });

  it("blocks submissions once a form is closed", async () => {
    const service = new PublicFormSettingsService();
    await service.update("team-1", "CONTACT", { isOpen: false }, mutationContext());

    await expect(service.assertOpen("team-1", "CONTACT")).rejects.toThrow(PublicFormClosedError);
  });

  it("blocks submissions outside the configured opening window", async () => {
    const service = new PublicFormSettingsService();
    await service.update(
      "team-1",
      "SPONSOR",
      { isOpen: true, opensAt: new Date("2026-06-01T00:00:00Z"), closesAt: new Date("2026-07-01T00:00:00Z") },
      { ...mutationContext(), effectiveFrom: new Date("2026-01-01T00:00:00Z") },
    );

    await expect(
      service.assertOpen("team-1", "SPONSOR", undefined, new Date("2026-05-01T00:00:00Z")),
    ).rejects.toThrow(PublicFormClosedError);
    await expect(
      service.assertOpen("team-1", "SPONSOR", undefined, new Date("2026-06-15T00:00:00Z")),
    ).resolves.toBeUndefined();
  });

  it("blocks submissions once the configured rate limit is reached", async () => {
    const service = new PublicFormSettingsService();
    await service.update(
      "team-1",
      "RECRUITMENT",
      { isOpen: true, rateLimitMax: 2, rateLimitWindowMinutes: 60 },
      mutationContext(),
    );

    await expect(
      service.assertOpen("team-1", "RECRUITMENT", async () => 1),
    ).resolves.toBeUndefined();
    await expect(
      service.assertOpen("team-1", "RECRUITMENT", async () => 2),
    ).rejects.toThrow(PublicFormClosedError);
  });

  it("does not leak another club's settings", async () => {
    const service = new PublicFormSettingsService();
    await service.update("team-1", "CONTACT", { isOpen: false }, mutationContext());

    await expect(service.assertOpen("team-2", "CONTACT")).resolves.toBeUndefined();
  });

  it("keeps immutable version snapshots and writes the standard audit context", async () => {
    const service = new PublicFormSettingsService();
    const first = await service.update("team-1", "CONTACT", { isOpen: true }, mutationContext());
    const second = await service.update(
      "team-1",
      "CONTACT",
      { isOpen: false },
      mutationContext("Fermeture temporaire pendant la maintenance"),
    );

    expect(second.version).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.version)).toEqual([1, 2]);
    expect(first.id).not.toBe(second.id);
    expect(rows[0].isOpen).toBe(true);
    expect(rows[1].isOpen).toBe(false);

    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      domain: "CLUB_PUBLIC",
      configurationKey: "PUBLIC_FORM_SETTINGS",
      scopeType: "CLUB_FORM",
      scopeId: "team-1:CONTACT",
      previousVersion: null,
      newVersion: 1,
      actorUserId: "admin-1",
      actorRole: "CLUB_ADMIN",
      reason: "Mise à jour de la gouvernance des formulaires",
      ipAddress: "203.0.113.20",
      userAgent: "vitest",
    });
    expect(audits[1].before).toMatchObject({ version: 1, isOpen: true });
    expect(audits[1].after).toMatchObject({ version: 2, isOpen: false });
  });

  it("keeps the current form policy active until a future version takes effect", async () => {
    const service = new PublicFormSettingsService();
    await service.update(
      "team-1",
      "CONTACT",
      { isOpen: true },
      { ...mutationContext(), effectiveFrom: new Date("2026-08-01T00:00:00Z") },
    );
    await service.update(
      "team-1",
      "CONTACT",
      { isOpen: false },
      {
        ...mutationContext("Fermeture programmée pour la maintenance"),
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
      },
    );

    await expect(service.get("team-1", "CONTACT", new Date("2026-08-20T00:00:00Z"))).resolves.toMatchObject({
      isOpen: true,
      version: 1,
    });
    await expect(service.get("team-1", "CONTACT", new Date("2026-09-02T00:00:00Z"))).resolves.toMatchObject({
      isOpen: false,
      version: 2,
    });
  });

  it("rejects a configuration change without a meaningful reason", async () => {
    const service = new PublicFormSettingsService();
    await expect(
      service.update("team-1", "CONTACT", { isOpen: false }, mutationContext(" ")),
    ).rejects.toThrow(/motif/);
    expect(rows).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });
});
