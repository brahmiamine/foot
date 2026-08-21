import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { MatchFormation } from "@/entities/MatchFormation";
import { MatchLineup } from "@/entities/MatchLineup";
import { PlayerAvailabilityDeclaration } from "@/entities/PlayerAvailabilityDeclaration";
import { LineupLockPolicy } from "@/entities/LineupLockPolicy";
import { createFakeRepository, numericSequence, uuidSequence, type FakeRepository } from "./testFakeDataSource";
import { StaffLineupService } from "./StaffLineupService";

let friendlyMatches: FriendlyMatch[] = [];
let formations: MatchFormation[] = [];
let lineups: MatchLineup[] = [];
let declarations: PlayerAvailabilityDeclaration[] = [];
let lineupLockPolicies: LineupLockPolicy[] = [];

const uuid = uuidSequence("id");
const numeric = numericSequence();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const repos = new Map<unknown, FakeRepository<{ id: unknown }>>();
    const getRepository = (entity: unknown) => {
      if (!repos.has(entity)) {
        if (entity === FriendlyMatch) repos.set(entity, createFakeRepository(friendlyMatches as never, numeric as never));
        else if (entity === MatchFormation) repos.set(entity, createFakeRepository(formations as never, uuid as never));
        else if (entity === MatchLineup) repos.set(entity, createFakeRepository(lineups as never, numeric as never));
        else if (entity === PlayerAvailabilityDeclaration) repos.set(entity, createFakeRepository(declarations as never, numeric as never));
        else if (entity === LineupLockPolicy) repos.set(entity, createFakeRepository(lineupLockPolicies as never, uuid as never));
        else throw new Error("Unexpected repository in StaffLineupService availability test");
      }
      return repos.get(entity);
    };
    return { getRepository };
  },
}));

beforeEach(() => {
  friendlyMatches = [
    {
      id: 1,
      teamId: "team-1",
      category: "seniors",
      opponentName: "Adversaire",
      isHome: true,
      venueName: null,
      date: new Date("2026-08-22T18:00:00Z"),
      status: "UPCOMING",
    } as FriendlyMatch,
  ];
  formations = [];
  lineups = [];
  declarations = [];
  lineupLockPolicies = [];
});

describe("StaffLineupService — PLAYER-002 availability consumption", () => {
  it("has no blocking declaration when the player never declared anything", async () => {
    const service = new StaffLineupService();
    await expect(
      service.getPlayerAvailabilityDeclaration("team-1", "player-1", "FRIENDLY", undefined, 1),
    ).resolves.toBeNull();
  });

  it("refuses to add a player who declared themselves unavailable for the match date", async () => {
    const service = new StaffLineupService();
    declarations.push({
      id: 1,
      playerId: "player-1",
      status: "UNAVAILABLE",
      startDate: "2026-08-20",
      endDate: "2026-08-25",
      reason: "Blessure personnelle",
      cancelledAt: null,
    } as PlayerAvailabilityDeclaration);

    await expect(
      service.setLineupEntry("team-1", "FRIENDLY", "player-1", "STARTER", { friendlyMatchId: 1 }),
    ).rejects.toThrow("indisponible");
  });

  it("allows adding a player who declared LIMITED availability (warning only, not a hard block)", async () => {
    const service = new StaffLineupService();
    declarations.push({
      id: 1,
      playerId: "player-1",
      status: "LIMITED",
      startDate: "2026-08-20",
      endDate: "2026-08-25",
      reason: "Reprise progressive",
      cancelledAt: null,
    } as PlayerAvailabilityDeclaration);

    await expect(
      service.setLineupEntry("team-1", "FRIENDLY", "player-1", "STARTER", { friendlyMatchId: 1 }),
    ).resolves.toBeUndefined();
  });

  it("ignores a cancelled declaration", async () => {
    const service = new StaffLineupService();
    declarations.push({
      id: 1,
      playerId: "player-1",
      status: "UNAVAILABLE",
      startDate: "2026-08-20",
      endDate: "2026-08-25",
      reason: null,
      cancelledAt: new Date("2026-08-19T00:00:00Z"),
    } as PlayerAvailabilityDeclaration);

    await expect(
      service.setLineupEntry("team-1", "FRIENDLY", "player-1", "STARTER", { friendlyMatchId: 1 }),
    ).resolves.toBeUndefined();
  });

  it("ignores a declaration outside the match date window", async () => {
    const service = new StaffLineupService();
    declarations.push({
      id: 1,
      playerId: "player-1",
      status: "UNAVAILABLE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      reason: null,
      cancelledAt: null,
    } as PlayerAvailabilityDeclaration);

    await expect(
      service.setLineupEntry("team-1", "FRIENDLY", "player-1", "STARTER", { friendlyMatchId: 1 }),
    ).resolves.toBeUndefined();
  });
});
