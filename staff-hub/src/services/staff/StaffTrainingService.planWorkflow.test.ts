import { beforeEach, describe, expect, it, vi } from "vitest";
import { Training } from "@/entities/Training";
import { TrainingApprovalPolicy } from "@/entities/TrainingApprovalPolicy";
import { StaffConfigurationAudit } from "@/entities/StaffConfigurationAudit";
import { Player } from "@/entities/Player";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { createFakeRepository, numericSequence, uuidSequence, type FakeRepository } from "./testFakeDataSource";
import { StaffTrainingService } from "./StaffTrainingService";

let trainings: Training[] = [];
let policies: TrainingApprovalPolicy[] = [];
let audits: StaffConfigurationAudit[] = [];
let players: Player[] = [];
let invitations: TrainingInvitation[] = [];

const numeric = numericSequence();
const uuid = uuidSequence("policy");

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const repos = new Map<unknown, FakeRepository<{ id: unknown }>>();
    const getRepository = (entity: unknown) => {
      if (!repos.has(entity)) {
        if (entity === Training) repos.set(entity, createFakeRepository(trainings as never, numeric as never));
        else if (entity === TrainingApprovalPolicy) repos.set(entity, createFakeRepository(policies as never, uuid as never));
        else if (entity === StaffConfigurationAudit) repos.set(entity, createFakeRepository(audits as never, uuid as never));
        else if (entity === Player) repos.set(entity, createFakeRepository(players as never, numeric as never));
        else if (entity === TrainingInvitation) repos.set(entity, createFakeRepository(invitations as never, numeric as never));
        else throw new Error("Unexpected repository in StaffTrainingService test");
      }
      return repos.get(entity);
    };
    return { getRepository };
  },
}));

beforeEach(() => {
  trainings = [];
  policies = [];
  audits = [];
  players = [];
  invitations = [];
});

describe("StaffTrainingService — STAFF-003 training plan validation", () => {
  it("keeps trainings immediately usable when the approval policy is disabled", async () => {
    const service = new StaffTrainingService();
    const training = await service.createTraining({
      teamId: "team-1",
      category: "seniors",
      title: "Séance technique",
      date: new Date("2026-08-25T18:00:00Z"),
      createdBy: "coach-1",
    });

    expect(training.planStatus).toBe("APPROVED");
    await expect(service.inviteRosterToTraining(training.id, "team-1")).resolves.toBe(0);
  });

  it("requires submission then approval by a different user once the policy is enabled", async () => {
    const service = new StaffTrainingService();
    await service.updateTrainingApprovalPolicy(
      "team-1",
      { approvalRequired: true },
      { actorUserId: "admin-1", actorRole: "ADMIN", reason: "Activation de la validation des plans" },
    );

    const training = await service.createTraining({
      teamId: "team-1",
      category: "seniors",
      title: "Séance tactique",
      date: new Date("2026-08-26T18:00:00Z"),
      createdBy: "adjoint-1",
    });
    expect(training.planStatus).toBe("DRAFT");

    await expect(service.inviteRosterToTraining(training.id, "team-1")).rejects.toThrow(/approuvé/);

    await service.submitTrainingPlan(training.id, "team-1", "adjoint-1");
    await expect(service.approveTrainingPlan(training.id, "team-1", "adjoint-1")).rejects.toThrow(
      /propre plan/,
    );

    const approved = await service.approveTrainingPlan(training.id, "team-1", "coach-1");
    expect(approved.planStatus).toBe("APPROVED");
    await expect(service.inviteRosterToTraining(training.id, "team-1")).resolves.toBe(0);
  });
});
