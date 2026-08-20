import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerStat } from "@/entities/PlayerStat";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { StaffConfigurationAudit } from "@/entities/StaffConfigurationAudit";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Player } from "@/entities/Player";
import { createFakeRepository, numericSequence, uuidSequence, type FakeRepository } from "./testFakeDataSource";
import { StaffPlanningService } from "./StaffPlanningService";

let stats: PlayerStat[] = [];
let policies: StatReviewPolicy[] = [];
let audits: StaffConfigurationAudit[] = [];
let friendlyMatches: FriendlyMatch[] = [];
let players: Player[] = [];

const numeric = numericSequence();
const uuid = uuidSequence("policy");

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const repos = new Map<unknown, FakeRepository<{ id: unknown }>>();
    const getRepository = (entity: unknown) => {
      if (!repos.has(entity)) {
        if (entity === PlayerStat) repos.set(entity, createFakeRepository(stats as never, numeric as never));
        else if (entity === StatReviewPolicy) repos.set(entity, createFakeRepository(policies as never, uuid as never));
        else if (entity === StaffConfigurationAudit) repos.set(entity, createFakeRepository(audits as never, uuid as never));
        else if (entity === FriendlyMatch) repos.set(entity, createFakeRepository(friendlyMatches as never, numeric as never));
        else if (entity === Player) repos.set(entity, createFakeRepository(players as never, numeric as never));
        else throw new Error("Unexpected repository in StaffPlanningService test");
      }
      return repos.get(entity);
    };
    return { getRepository };
  },
}));

beforeEach(() => {
  stats = [];
  policies = [];
  audits = [];
  friendlyMatches = [];
  players = [];
});

function baseStat(overrides: Partial<PlayerStat> = {}): PlayerStat {
  return {
    id: 1,
    teamId: "team-1",
    playerId: "player-1",
    matchType: null,
    matchId: null,
    friendlyMatchId: null,
    season: "2025-2026",
    minutesPlayed: 60,
    goals: 1,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    injuriesCount: 0,
    trainingsAttended: 0,
    trainingsTotal: 0,
    lockedAt: null,
    lockedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PlayerStat;
}

describe("StaffPlanningService — STAFF-004 post-match stat review & lock", () => {
  it("edits a manual season stat with no match freely, no reason required", async () => {
    stats.push(baseStat());
    const service = new StaffPlanningService();
    const updated = await service.updateStat(1, "team-1", "coach-1", { goals: 2 });
    expect(updated.goals).toBe(2);
    expect(audits).toHaveLength(0);
  });

  it("edits a match-linked stat freely while the review window has not elapsed", async () => {
    friendlyMatches.push({
      id: 5,
      teamId: "team-1",
      category: "seniors",
      opponentName: "Adversaire",
      isHome: true,
      venueName: null,
      date: new Date(),
      status: "FINISHED",
    } as FriendlyMatch);
    stats.push(baseStat({ matchType: "FRIENDLY", friendlyMatchId: 5 }));

    const service = new StaffPlanningService();
    const updated = await service.updateStat(1, "team-1", "coach-1", { goals: 3 });
    expect(updated.goals).toBe(3);
    expect(updated.lockedAt).toBeNull();
    expect(audits).toHaveLength(0);
  });

  it("requires a reason and journals the correction once the review window has elapsed", async () => {
    friendlyMatches.push({
      id: 6,
      teamId: "team-1",
      category: "seniors",
      opponentName: "Adversaire",
      isHome: true,
      venueName: null,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: "FINISHED",
    } as FriendlyMatch);
    stats.push(baseStat({ id: 2, matchType: "FRIENDLY", friendlyMatchId: 6 }));

    const service = new StaffPlanningService();
    await expect(service.updateStat(2, "team-1", "coach-1", { goals: 4 })).rejects.toThrow(/motif/);

    const corrected = await service.updateStat(2, "team-1", "coach-1", { goals: 4 }, "Erreur de saisie constatée en revue");
    expect(corrected.goals).toBe(4);
    expect(corrected.lockedAt).not.toBeNull();
    expect(corrected.lockedBy).toBe("coach-1");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ domain: "STAFF_PLAYER_STAT_CORRECTION", reason: "Erreur de saisie constatée en revue" });
    expect(audits[0].before).toMatchObject({ goals: 1 });
    expect(audits[0].after).toMatchObject({ goals: 4 });
  });
});
