import { beforeEach, describe, expect, it, vi } from "vitest";

const assertEnabled = vi.fn();
const applications = new Map<number, Record<string, unknown>>();
const events: Record<string, unknown>[] = [];

const applicationRepository = {
  findOne: vi.fn(async ({ where }: { where: { id: number; teamId: string } }) => {
    const row = applications.get(Number(where.id));
    return row?.teamId === where.teamId ? row : null;
  }),
  save: vi.fn(async (value: Record<string, unknown>) => {
    applications.set(Number(value.id), value);
    return value;
  }),
  remove: vi.fn(async (value: Record<string, unknown>) => {
    applications.delete(Number(value.id));
    return value;
  }),
};

const eventRepository = {
  create: vi.fn((value: Record<string, unknown>) => value),
  save: vi.fn(async (value: Record<string, unknown>) => {
    events.push(value);
    return value;
  }),
};

const manager = {
  getRepository: vi.fn((entity: { name: string }) =>
    entity.name === "RecruitmentApplication" ? applicationRepository : eventRepository,
  ),
};

type ManagerMock = typeof manager;

const dataSource = {
  getRepository: vi.fn(() => applicationRepository),
  transaction: vi.fn(async (callback: (transactionManager: ManagerMock) => Promise<unknown>) => callback(manager)),
};

vi.mock("@/lib/database", () => ({ getDataSource: vi.fn(async () => dataSource) }));
vi.mock("./ClubFeatureSettingsService", () => ({
  ClubFeatureSettingsService: class {
    assertEnabled = assertEnabled;
  },
}));

function seedApplication(overrides: Record<string, unknown> = {}) {
  const row = {
    id: 1,
    teamId: "team-1",
    name: "Ali Test",
    birthDate: "2005-02-10",
    category: "seniors",
    position: "FORWARD",
    currentClub: "Club A",
    parentPhone: "+21600000000",
    email: "ali@example.com",
    videoUrl: "https://example.com/video",
    message: null,
    adminNotes: null,
    status: "NEW",
    scoutReviewedAt: null,
    scoutReviewedBy: null,
    scoutNotes: null,
    coachReviewedAt: null,
    coachReviewedBy: null,
    coachNotes: null,
    trialScheduledAt: null,
    trialLocation: null,
    trialNotes: null,
    trialApprovedAt: null,
    trialApprovedBy: null,
    trialEvaluation: null,
    sportingDirectorApprovedAt: null,
    sportingDirectorApprovedBy: null,
    sportingDirectorNotes: null,
    negotiationStartedAt: null,
    negotiationStartedBy: null,
    negotiationNotes: null,
    acceptedAt: null,
    acceptedBy: null,
    acceptanceNotes: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    ...overrides,
  };
  applications.set(1, row);
  return row;
}

beforeEach(() => {
  applications.clear();
  events.length = 0;
  assertEnabled.mockReset();
  applicationRepository.findOne.mockClear();
  applicationRepository.save.mockClear();
  applicationRepository.remove.mockClear();
  eventRepository.create.mockClear();
  eventRepository.save.mockClear();
  manager.getRepository.mockClear();
  dataSource.transaction.mockClear();
});

describe("RecruitmentWorkflowService", () => {
  it("enforces scout -> coach -> trial -> sporting director -> negotiation -> accepted", async () => {
    seedApplication();
    const { RecruitmentWorkflowService } = await import("./RecruitmentWorkflowService");
    const service = new RecruitmentWorkflowService();

    await service.approveScout(1, "team-1", "scout-1", "Profil intéressant");
    expect(applications.get(1)?.status).toBe("SCOUT_APPROVED");

    await service.approveCoach(1, "team-1", "coach-1", "Compatible avec le projet de jeu");
    expect(applications.get(1)?.status).toBe("COACH_APPROVED");

    await service.scheduleTrial(1, "team-1", "coach-1", {
      scheduledAt: "2026-08-27T16:00:00.000Z",
      location: "Terrain principal",
      notes: "Séance avec groupe seniors",
    });
    expect(applications.get(1)?.status).toBe("TRIAL_SCHEDULED");

    await service.approveTrial(1, "team-1", "coach-1", "Essai concluant");
    expect(applications.get(1)?.status).toBe("TRIAL_APPROVED");

    await service.approveSportingDirector(1, "team-1", "director-1", "Validation sportive");
    expect(applications.get(1)?.status).toBe("SPORTING_DIRECTOR_APPROVED");

    await service.startNegotiation(1, "team-1", "director-1", "Proposition transmise");
    expect(applications.get(1)?.status).toBe("NEGOTIATION");

    await service.accept(1, "team-1", "director-1", "Accord obtenu");
    expect(applications.get(1)?.status).toBe("ACCEPTED");
    expect(events).toHaveLength(7);
  });

  it("refuses to skip the coach review before scheduling a trial", async () => {
    seedApplication({ status: "SCOUT_APPROVED" });
    const { RecruitmentWorkflowService } = await import("./RecruitmentWorkflowService");

    await expect(
      new RecruitmentWorkflowService().scheduleTrial(1, "team-1", "coach-1", {
        scheduledAt: "2026-08-27T16:00:00.000Z",
        location: "Terrain principal",
      }),
    ).rejects.toThrow("Transition de recrutement invalide");
  });

  it("never mutates an application from another club", async () => {
    seedApplication({ teamId: "team-2" });
    const { RecruitmentWorkflowService } = await import("./RecruitmentWorkflowService");

    await expect(
      new RecruitmentWorkflowService().approveScout(1, "team-1", "scout-1", "OK"),
    ).rejects.toThrow("Candidature introuvable");
  });

  it("requires a rejection reason and prevents hard delete after processing", async () => {
    seedApplication({ status: "SCOUT_APPROVED" });
    const { RecruitmentWorkflowService } = await import("./RecruitmentWorkflowService");
    const service = new RecruitmentWorkflowService();

    await expect(service.reject(1, "team-1", "director-1", "   ")).rejects.toThrow("Motif de refus obligatoire");
    await expect(service.deleteNew(1, "team-1")).rejects.toThrow("Une candidature déjà traitée ne peut pas être supprimée");

    await service.reject(1, "team-1", "director-1", "Profil non retenu");
    expect(applications.get(1)?.status).toBe("REJECTED");
    expect(applications.get(1)?.rejectionReason).toBe("Profil non retenu");
  });

  it("does not allow an accepted application to return to negotiation or rejection", async () => {
    seedApplication({ status: "ACCEPTED" });
    const { RecruitmentWorkflowService } = await import("./RecruitmentWorkflowService");
    const service = new RecruitmentWorkflowService();

    await expect(service.startNegotiation(1, "team-1", "director-1", "retry")).rejects.toThrow(
      "Transition de recrutement invalide",
    );
    await expect(service.reject(1, "team-1", "director-1", "retry")).rejects.toThrow(
      "Transition de recrutement invalide",
    );
  });
});
