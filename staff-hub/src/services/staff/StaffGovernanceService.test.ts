import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineupLockPolicy } from "@/entities/LineupLockPolicy";
import { TrainingApprovalPolicy } from "@/entities/TrainingApprovalPolicy";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { HeadCoachDelegation } from "@/entities/HeadCoachDelegation";
import { StaffConfigurationAudit } from "@/entities/StaffConfigurationAudit";
import { Staff } from "@/entities/Staff";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Match } from "@/entities/Match";
import { Team } from "@/entities/Team";
import { createFakeRepository, numericSequence, uuidSequence, type FakeRepository } from "./testFakeDataSource";
import { StaffGovernanceService } from "./StaffGovernanceService";

let lineupLockPolicies: LineupLockPolicy[] = [];
let trainingApprovalPolicies: TrainingApprovalPolicy[] = [];
let statReviewPolicies: StatReviewPolicy[] = [];
let headCoachDelegations: HeadCoachDelegation[] = [];
let audits: StaffConfigurationAudit[] = [];
let staff: Staff[] = [];
let friendlyMatches: FriendlyMatch[] = [];
let matches: Match[] = [];
let teams: Team[] = [];

const uuid = uuidSequence("id");
const numeric = numericSequence();

function context(reason = "Ajustement de la politique") {
  return { actorUserId: "admin-1", actorRole: "ADMIN", reason, ipAddress: "203.0.113.10", userAgent: "vitest" };
}

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const repos = new Map<unknown, FakeRepository<{ id: unknown }>>();
    const getRepository = (entity: unknown) => {
      if (!repos.has(entity)) {
        if (entity === LineupLockPolicy) repos.set(entity, createFakeRepository(lineupLockPolicies as never, uuid as never));
        else if (entity === TrainingApprovalPolicy) repos.set(entity, createFakeRepository(trainingApprovalPolicies as never, uuid as never));
        else if (entity === StatReviewPolicy) repos.set(entity, createFakeRepository(statReviewPolicies as never, uuid as never));
        else if (entity === HeadCoachDelegation) repos.set(entity, createFakeRepository(headCoachDelegations as never, uuid as never));
        else if (entity === StaffConfigurationAudit) repos.set(entity, createFakeRepository(audits as never, uuid as never));
        else if (entity === Staff) repos.set(entity, createFakeRepository(staff as never, numeric as never));
        else if (entity === FriendlyMatch) repos.set(entity, createFakeRepository(friendlyMatches as never, numeric as never));
        else if (entity === Match) repos.set(entity, createFakeRepository(matches as never, uuid as never));
        else if (entity === Team) repos.set(entity, createFakeRepository(teams as never, uuid as never));
        else throw new Error("Unexpected repository in StaffGovernanceService test");
      }
      return repos.get(entity);
    };
    return { getRepository };
  },
}));

beforeEach(() => {
  lineupLockPolicies = [];
  trainingApprovalPolicies = [];
  statReviewPolicies = [];
  headCoachDelegations = [];
  audits = [];
  staff = [];
  friendlyMatches = [];
  matches = [];
  teams = [];
});

describe("StaffGovernanceService — STAFF-002 lineup lock policy", () => {
  it("keeps auto-lock disabled by default for backward compatibility", async () => {
    const service = new StaffGovernanceService();
    await expect(service.getLineupLockPolicy("team-1")).resolves.toMatchObject({ enabled: false, lockMinutesBeforeKickoff: 60 });
  });

  it("locks the lineup once inside the configured window before kickoff, and only then", async () => {
    const service = new StaffGovernanceService();
    await service.updateLineupLockPolicy(
      "team-1",
      { enabled: true, lockMinutesBeforeKickoff: 60 },
      { ...context(), effectiveFrom: new Date("2020-01-01T00:00:00Z") },
    );
    friendlyMatches.push({
      id: 1,
      teamId: "team-1",
      category: "seniors",
      opponentName: "Adversaire",
      isHome: true,
      venueName: null,
      date: new Date("2026-08-20T18:00:00Z"),
      status: "UPCOMING",
    } as FriendlyMatch);

    await expect(
      service.isLineupAutoLocked("team-1", "FRIENDLY", undefined, 1, new Date("2026-08-20T16:30:00Z")),
    ).resolves.toBe(false);
    await expect(
      service.isLineupAutoLocked("team-1", "FRIENDLY", undefined, 1, new Date("2026-08-20T17:30:00Z")),
    ).resolves.toBe(true);
  });

  it("never leaks one club's policy into another club", async () => {
    const service = new StaffGovernanceService();
    await service.updateLineupLockPolicy("team-1", { enabled: true, lockMinutesBeforeKickoff: 60 }, context());
    await expect(service.getLineupLockPolicy("team-2")).resolves.toMatchObject({ enabled: false });
  });

  it("keeps versioned snapshots and standard configuration audit evidence", async () => {
    const service = new StaffGovernanceService();
    await service.updateLineupLockPolicy("team-1", { enabled: true, lockMinutesBeforeKickoff: 45 }, context("Activation initiale"));
    const second = await service.updateLineupLockPolicy("team-1", { enabled: false, lockMinutesBeforeKickoff: 45 }, context("Désactivation"));

    expect(second.version).toBe(2);
    expect(audits).toHaveLength(2);
    expect(audits[1]).toMatchObject({
      domain: "STAFF_LINEUP_LOCK_POLICY",
      previousVersion: 1,
      newVersion: 2,
      reason: "Désactivation",
    });
  });
});

describe("StaffGovernanceService — STAFF-003 training approval policy", () => {
  it("requires no approval by default", async () => {
    const service = new StaffGovernanceService();
    await expect(service.getTrainingApprovalPolicy("team-1")).resolves.toMatchObject({ approvalRequired: false });
  });

  it("switches to approval-required after an update", async () => {
    const service = new StaffGovernanceService();
    await service.updateTrainingApprovalPolicy("team-1", { approvalRequired: true }, context());
    await expect(service.getTrainingApprovalPolicy("team-1")).resolves.toMatchObject({ approvalRequired: true });
  });
});

describe("StaffGovernanceService — STAFF-004 stat review policy", () => {
  it("defaults to a 72h review window", async () => {
    const service = new StaffGovernanceService();
    await expect(service.getStatReviewPolicy("team-1")).resolves.toMatchObject({ reviewWindowHours: 72 });
  });

  it("locks once the review window has elapsed", async () => {
    const service = new StaffGovernanceService();
    const matchDate = new Date("2026-08-01T15:00:00Z");
    await expect(service.isStatLocked("team-1", matchDate, new Date("2026-08-02T00:00:00Z"))).resolves.toBe(false);
    await expect(service.isStatLocked("team-1", matchDate, new Date("2026-08-05T00:00:00Z"))).resolves.toBe(true);
  });

  it("never locks a stat with no identifiable match", async () => {
    const service = new StaffGovernanceService();
    await expect(service.isStatLocked("team-1", null)).resolves.toBe(false);
  });
});

describe("StaffGovernanceService — STAFF-005 head coach delegation", () => {
  function coach(overrides: Partial<Staff> = {}): Staff {
    return {
      id: 1,
      teamId: "team-1",
      firstNameFr: "Karim",
      lastNameFr: "Adjoint",
      imageUrl: null,
      staffType: "ADJOINT",
      category: "seniors",
      createdAt: new Date(),
      ...overrides,
    } as Staff;
  }

  it("rejects a delegatee who is not a registered staff member of the club", async () => {
    const service = new StaffGovernanceService();
    await expect(
      service.grantHeadCoachDelegation("team-1", {
        delegatorUserId: "coach-1",
        delegateeUserId: "user-2",
        delegateeStaffId: 999,
        matchId: "match-1",
        reason: "Coach principal absent pour raisons médicales",
      }),
    ).rejects.toThrow(/membre du staff/);
  });

  it("rejects a qualified-looking staff member whose type is not COACH or ADJOINT", async () => {
    staff.push(coach({ staffType: "KINE" }));
    const service = new StaffGovernanceService();
    await expect(
      service.grantHeadCoachDelegation("team-1", {
        delegatorUserId: "coach-1",
        delegateeUserId: "user-2",
        delegateeStaffId: 1,
        matchId: "match-1",
        reason: "Coach principal absent pour raisons médicales",
      }),
    ).rejects.toThrow(/coach ou un adjoint/);
  });

  it("rejects a delegation bounded to both a match and a period", async () => {
    staff.push(coach());
    const service = new StaffGovernanceService();
    await expect(
      service.grantHeadCoachDelegation("team-1", {
        delegatorUserId: "coach-1",
        delegateeUserId: "user-2",
        delegateeStaffId: 1,
        matchId: "match-1",
        validFrom: new Date("2026-08-01T00:00:00Z"),
        validUntil: new Date("2026-08-02T00:00:00Z"),
        reason: "Motif",
      }),
    ).rejects.toThrow(/jamais les deux/);
  });

  it("rejects a delegation with no scope at all", async () => {
    staff.push(coach());
    const service = new StaffGovernanceService();
    await expect(
      service.grantHeadCoachDelegation("team-1", {
        delegatorUserId: "coach-1",
        delegateeUserId: "user-2",
        delegateeStaffId: 1,
        reason: "Motif",
      }),
    ).rejects.toThrow(/match ou une période/);
  });

  it("grants a match-bound delegation and reports it active only for that exact match", async () => {
    staff.push(coach());
    const service = new StaffGovernanceService();
    await service.grantHeadCoachDelegation("team-1", {
      delegatorUserId: "coach-1",
      delegateeUserId: "user-2",
      delegateeStaffId: 1,
      matchId: "match-1",
      reason: "Coach principal suspendu pour ce match",
    });

    await expect(service.isHeadCoachDelegated("team-1", "user-2", { matchId: "match-1" })).resolves.toBe(true);
    await expect(service.isHeadCoachDelegated("team-1", "user-2", { matchId: "match-2" })).resolves.toBe(false);
    await expect(service.isHeadCoachDelegated("team-1", "user-3", { matchId: "match-1" })).resolves.toBe(false);
  });

  it("grants a period-bound delegation active only inside the window", async () => {
    staff.push(coach());
    const service = new StaffGovernanceService();
    await service.grantHeadCoachDelegation("team-1", {
      delegatorUserId: "coach-1",
      delegateeUserId: "user-2",
      delegateeStaffId: 1,
      validFrom: new Date("2026-08-01T00:00:00Z"),
      validUntil: new Date("2026-08-10T00:00:00Z"),
      reason: "Coach principal en congé",
    });

    await expect(
      service.isHeadCoachDelegated("team-1", "user-2", {}, new Date("2026-08-05T00:00:00Z")),
    ).resolves.toBe(true);
    await expect(
      service.isHeadCoachDelegated("team-1", "user-2", {}, new Date("2026-08-11T00:00:00Z")),
    ).resolves.toBe(false);
  });

  it("stops applying a delegation once revoked", async () => {
    staff.push(coach());
    const service = new StaffGovernanceService();
    const delegation = await service.grantHeadCoachDelegation("team-1", {
      delegatorUserId: "coach-1",
      delegateeUserId: "user-2",
      delegateeStaffId: 1,
      matchId: "match-1",
      reason: "Coach principal suspendu",
    });

    await service.revokeHeadCoachDelegation(delegation.id, "team-1", "coach-1", "Coach principal de nouveau disponible");
    await expect(service.isHeadCoachDelegated("team-1", "user-2", { matchId: "match-1" })).resolves.toBe(false);
  });
});
