import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerStat } from "@/entities/PlayerStat";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { ClubConfigurationAudit } from "@/entities/ClubConfigurationAudit";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { PlayerStatService } from "./PlayerStatService";

let stats: PlayerStat[] = [];
let policies: StatReviewPolicy[] = [];
let audits: ClubConfigurationAudit[] = [];
let friendlyMatches: FriendlyMatch[] = [];

function repository<T extends { id: unknown }>(rows: T[]) {
  return {
    find: (options?: { where?: Record<string, unknown> }) =>
      Promise.resolve(
        rows.filter((row) =>
          Object.entries(options?.where ?? {}).every(
            ([key, value]) => value === undefined || (row as Record<string, unknown>)[key] === value,
          ),
        ),
      ),
    findOne: (options: { where: Record<string, unknown> }) =>
      Promise.resolve(
        rows.find((row) =>
          Object.entries(options.where).every(
            ([key, value]) => value === undefined || (row as Record<string, unknown>)[key] === value,
          ),
        ) ?? null,
      ),
    create: (data: Partial<T>) => ({ ...data }) as T,
    save: (row: T) => {
      rows.push(row);
      return Promise.resolve(row);
    },
    remove: (row: T) => {
      const index = rows.indexOf(row);
      if (index >= 0) rows.splice(index, 1);
      return Promise.resolve(row);
    },
  };
}

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === PlayerStat) return repository(stats);
      if (entity === StatReviewPolicy) return repository(policies);
      if (entity === ClubConfigurationAudit) return repository(audits);
      if (entity === FriendlyMatch) return repository(friendlyMatches);
      throw new Error("Unexpected repository in PlayerStatService test");
    },
  }),
}));

beforeEach(() => {
  stats = [];
  policies = [];
  audits = [];
  friendlyMatches = [];
});

function actor(reason?: string) {
  return { actorUserId: "admin-1", actorRole: "ADMIN", reason };
}

describe("PlayerStatService.delete — STAFF-004 (club-hub entry point)", () => {
  it("deletes a manual season stat with no match freely", async () => {
    stats.push({ id: 1, teamId: "team-1", matchId: null, friendlyMatchId: null } as PlayerStat);
    const service = new PlayerStatService();
    await expect(service.delete(1, "team-1", actor())).resolves.toBe(true);
    expect(stats).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });

  it("deletes a match-linked stat freely while the review window has not elapsed", async () => {
    friendlyMatches.push({ id: 5, teamId: "team-1", date: new Date() } as FriendlyMatch);
    stats.push({ id: 2, teamId: "team-1", matchId: null, friendlyMatchId: 5 } as PlayerStat);
    const service = new PlayerStatService();
    await expect(service.delete(2, "team-1", actor())).resolves.toBe(true);
    expect(audits).toHaveLength(0);
  });

  it("rejects deletion without a reason once the review window has elapsed, and audits it once justified", async () => {
    friendlyMatches.push({ id: 6, teamId: "team-1", date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } as FriendlyMatch);
    stats.push({ id: 3, teamId: "team-1", matchId: null, friendlyMatchId: 6, goals: 2 } as PlayerStat);
    const service = new PlayerStatService();

    await expect(service.delete(3, "team-1", actor())).rejects.toThrow(/motif/);
    expect(stats).toHaveLength(1);

    await expect(service.delete(3, "team-1", actor("Entrée en doublon détectée en revue"))).resolves.toBe(true);
    expect(stats).toHaveLength(0);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ domain: "STAFF_PLAYER_STAT_CORRECTION", reason: "Entrée en doublon détectée en revue" });
  });

  it("respects a club's configured review window", async () => {
    const policyRepo = repository(policies);
    await policyRepo.save({
      id: "policy-1",
      teamId: "team-1",
      reviewWindowHours: 1,
      version: 1,
      effectiveFrom: new Date("2020-01-01T00:00:00Z"),
      effectiveUntil: null,
      updatedBy: null,
      createdAt: new Date(),
    } as StatReviewPolicy);
    friendlyMatches.push({ id: 7, teamId: "team-1", date: new Date(Date.now() - 2 * 60 * 60 * 1000) } as FriendlyMatch);
    stats.push({ id: 4, teamId: "team-1", matchId: null, friendlyMatchId: 7 } as PlayerStat);

    const service = new PlayerStatService();
    await expect(service.delete(4, "team-1", actor())).rejects.toThrow(/motif/);
  });
});
