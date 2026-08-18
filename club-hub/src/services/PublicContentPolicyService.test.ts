import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicContentPolicy } from "@/entities/PublicContentPolicy";
import { PublicContentPolicyService } from "./PublicContentPolicyService";

let rows: PublicContentPolicy[] = [];
let seq = 0;

function isNullOperator(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function repository() {
  return {
    find: () => Promise.resolve(rows),
    create: (data: Partial<PublicContentPolicy>) => ({ id: `pcp-${++seq}`, ...data }) as PublicContentPolicy,
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

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: repository,
    transaction: async (work: (manager: { getRepository: typeof repository }) => Promise<unknown>) =>
      work({ getRepository: repository }),
  }),
}));

beforeEach(() => {
  rows = [];
});

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
      actorUserId: "superadmin-1",
    });
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      sections: { SHOP: false },
      actorUserId: "club-admin-1",
    });

    const resolved = await service.resolve("team-1");
    expect(resolved.SHOP).toBe(false);
    expect(resolved.GALLERY).toBe(false); // hérité de PLATFORM
    expect(resolved.NEWS).toBe(true);
  });

  it("does not leak a CLUB override to another club", async () => {
    const service = new PublicContentPolicyService();
    await service.upsert({ scopeType: "CLUB", scopeId: "team-1", sections: { SHOP: false }, actorUserId: "a" });

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
      actorUserId: "a",
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
      actorUserId: "a",
    });
    await service.upsert({
      scopeType: "CLUB",
      scopeId: "team-1",
      emergencyBanner: { enabled: true, messageFr: "Alerte club", severity: "CRITICAL" },
      actorUserId: "b",
    });

    const resolved = await service.resolve("team-1");
    expect(resolved.emergencyBanner).toEqual({
      enabled: true,
      messageFr: "Alerte club",
      messageAr: null,
      severity: "CRITICAL",
    });
  });
});
