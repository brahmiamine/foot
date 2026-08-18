import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFormSettings } from "@/entities/PublicFormSettings";
import { PublicFormClosedError, PublicFormSettingsService } from "./PublicFormSettingsService";

let rows: PublicFormSettings[] = [];

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: () => ({
      findOne: (options: { where: { teamId: string; domain: string } }) =>
        Promise.resolve(
          rows.find(
            (row) => row.teamId === options.where.teamId && row.domain === options.where.domain,
          ) ?? null,
        ),
      find: (options: { where: { teamId: string } }) =>
        Promise.resolve(rows.filter((row) => row.teamId === options.where.teamId)),
      create: (data: Partial<PublicFormSettings>) => ({ id: `pfs-${rows.length + 1}`, ...data }) as PublicFormSettings,
      save: (row: PublicFormSettings) => {
        const index = rows.findIndex((r) => r.id === row.id);
        if (index >= 0) rows[index] = row;
        else rows.push(row);
        return Promise.resolve(row);
      },
    }),
  }),
}));

beforeEach(() => {
  rows = [];
});

describe("PublicFormSettingsService", () => {
  it("is open by default when nothing is configured", async () => {
    const service = new PublicFormSettingsService();
    await expect(service.assertOpen("team-1", "CONTACT")).resolves.toBeUndefined();
  });

  it("blocks submissions once a form is closed", async () => {
    const service = new PublicFormSettingsService();
    await service.update("team-1", "CONTACT", { isOpen: false }, "admin-1");

    await expect(service.assertOpen("team-1", "CONTACT")).rejects.toThrow(PublicFormClosedError);
  });

  it("blocks submissions outside the configured opening window", async () => {
    const service = new PublicFormSettingsService();
    await service.update(
      "team-1",
      "SPONSOR",
      { isOpen: true, opensAt: new Date("2026-06-01T00:00:00Z"), closesAt: new Date("2026-07-01T00:00:00Z") },
      "admin-1",
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
      "admin-1",
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
    await service.update("team-1", "CONTACT", { isOpen: false }, "admin-1");

    await expect(service.assertOpen("team-2", "CONTACT")).resolves.toBeUndefined();
  });

  it("keeps immutable version snapshots instead of overwriting in place", async () => {
    const service = new PublicFormSettingsService();
    const first = await service.update("team-1", "CONTACT", { isOpen: true }, "admin-1");
    const second = await service.update("team-1", "CONTACT", { isOpen: false }, "admin-1");

    expect(second.version).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.version)).toEqual([1, 2]);
    expect(first.id).not.toBe(second.id);
    expect(rows[0].isOpen).toBe(true);
    expect(rows[1].isOpen).toBe(false);
  });
});