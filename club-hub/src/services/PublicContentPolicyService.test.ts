import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClubConfigurationAudit } from "@/entities/ClubConfigurationAudit";
import { PublicContentPolicy } from "@/entities/PublicContentPolicy";
import { PublicContentPolicyService } from "./PublicContentPolicyService";

let rows: PublicContentPolicy[] = [];
let audits: ClubConfigurationAudit[] = [];
let seq = 0;

function isNullOperator(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function contentRepository() {
  return {
    find: () => Promise.resolve(rows),
    create: (data: Partial<PublicContentPolicy>) =>
      ({ id: `pcp-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...data }) as PublicContentPolicy,
    save: (row: PublicContentPolicy) => {
      rows.push(row);
      return Promise.resolve(row);
    },
    findOne: (options: { where: { scopeType: string; scopeId: unknown } }) => {
      const wantsNull = isNullOperator(options.where.scopeId);
      const matches = rows
        .filter(
          (row) =>
            row.scopeType === options.where.scopeType &&
            (wantsNull ? row.scopeId === null : row.scopeId === options.where.scopeId),
        )
        .sort((a, b) => b.version - a.version);
      return Promise.resolve(matches[0] ?? null);
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
      if (entity === PublicContentPolicy) return contentRepository();
      if (entity === ClubConfigurationAudit) return auditRepository();
      throw new Error("Unexpected repository in PublicContentPolicyService test");
    };
    return {
      getRepository,
      transaction: async (work: (manager: { getRepository: typeof getRepository }) => Promise<unknown>) =>
        work({ getRepository }),
    };
  },
}));

beforeEach(() => {
  rows = [];
  audits = [];
  seq = 0;
});

function auditContext(actorUserId = "admin-1", reason = "Mise à jour de la politique de contenu public") {
  return {
    actorUserId,
    actorRole: actorUserId.startsWith("superadmin") ? "PLATFORM_SUPERADMIN" : "CLUB_ADMIN",
    reason,
    ipAddress: "203.0.113.30",
    userAgent: "vitest",
  };
}

describe("PublicContentPolicyService", () => {
  it("enables every section by default", async () => {
    const service = new PublicContentPolicyService();
    const resolved = await service.resolve("team-1");
    expect(resolved.SHOP).toBe(true);
    expect(resolved.NEWS).toBe(true);
    expect(resolved.emergencyBanner.enabled).toBe(false);
  });

  it("lets a CLUB override disable one section without affecting the others (flat keys, not a nested object)", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({
      scopeType: "PLATFORM",
      scopeId: null,
      sections: { GALLERY: false },
      ...auditContext("superadmin-1"),
    });
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { SHOP: false },
      ...auditContext("club-admin-1"),
    });

    const resolved = await service.resolve("team-1");
    expect(resolved.SHOP).toBe(false);
    expect(resolved.GALLERY).toBe(false);
    expect(resolved.NEWS).toBe(true);
  });

  it("does not leak a CLUB override to another club", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { SHOP: false },
      ...auditContext(),
    });

    const resolved = await service.resolve("team-2");
    expect(resolved.SHOP).toBe(true);
  });

  it("schedules a policy version to take effect in the future (programmation de publication)", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { SHOP: false },
      effectiveFrom: new Date("2026-06-01T00:00:00Z"),
      ...auditContext(),
    });

    const before = await service.resolve("team-1", new Date("2026-05-01T00:00:00Z"));
    expect(before.SHOP).toBe(true);
    const after = await service.resolve("team-1", new Date("2026-06-15T00:00:00Z"));
    expect(after.SHOP).toBe(false);
  });

  it("replaces the whole emergency banner atomically rather than merging fields", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({
      scopeType: "PLATFORM",
      scopeId: null,
      emergencyBanner: { enabled: true, messageFr: "Maintenance plateforme", severity: "WARNING" },
      ...auditContext("superadmin-1"),
    });
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      emergencyBanner: { enabled: true, messageFr: "Alerte club", severity: "CRITICAL" },
      ...auditContext("club-admin-1"),
    });

    const resolved = await service.resolve("team-1");
    expect(resolved.emergencyBanner).toEqual({
      enabled: true,
      messageFr: "Alerte club",
      messageAr: null,
      severity: "CRITICAL",
    });
  });

  it("writes before/after/version/actor/reason/IP/User-Agent for every policy change", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { NEWS: false },
      ...auditContext("club-admin-1"),
    });
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { NEWS: true },
      ...auditContext("club-admin-2", "Réouverture des actualités après validation éditoriale"),
    });

    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      domain: "CLUB_PUBLIC",
      configurationKey: "PUBLIC_CONTENT_POLICY",
      scopeType: "CLUB",
      scopeId: "team-1",
      previousVersion: null,
      newVersion: 1,
      actorUserId: "club-admin-1",
      actorRole: "CLUB_ADMIN",
      reason: "Mise à jour de la politique de contenu public",
      ipAddress: "203.0.113.30",
      userAgent: "vitest",
    });
    expect(audits[1].before).toMatchObject({ version: 1, sections: { NEWS: false } });
    expect(audits[1].after).toMatchObject({ version: 2, sections: { NEWS: true } });
  });

  it("rejects changes without a meaningful reason", async () => {
    const service = new PublicContentPolicyService();
    await expect(
      service.upsert({
        scopeType: "CLUB",
        scopeId: "team-1",
        sections: { NEWS: false },
        ...auditContext("club-admin-1", " "),
      }),
    ).rejects.toThrow(/motif/);
    expect(rows).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });
});