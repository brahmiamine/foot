import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trip: null as null | Record<string, unknown>,
  participants: [] as Array<Record<string, unknown>>,
  settings: { dualApprovalThreshold: "5000.000", receiptRequiredThreshold: "100.000", version: 1 },
  expenses: [] as Array<Record<string, unknown>>,
}));

const tripSave = vi.fn(async (value: Record<string, unknown>) => value);
const participantFind = vi.fn(async () => state.participants);
const eventSave = vi.fn(async (value: Record<string, unknown>) => value);
const expenseSave = vi.fn(async (value: Record<string, unknown>) => value);

const manager = {
  getRepository(entity: { name?: string }) {
    switch (entity.name) {
      case "Trip":
        return {
          findOne: vi.fn(async () => state.trip),
          save: tripSave,
        };
      case "TripParticipant":
        return {
          find: participantFind,
          save: vi.fn(async (value: Record<string, unknown>) => value),
        };
      case "TripGovernanceSettings":
        return {
          findOne: vi.fn(async () => state.settings),
        };
      case "TripExpenseReceipt":
        return {
          create: (value: Record<string, unknown>) => value,
          save: expenseSave,
          find: vi.fn(async () => state.expenses),
        };
      case "TripWorkflowEvent":
        return {
          create: (value: Record<string, unknown>) => value,
          save: eventSave,
        };
      default:
        throw new Error(`Unexpected repository ${entity.name ?? "unknown"}`);
    }
  },
};

vi.mock("@/lib/database", () => ({
  getDataSource: vi.fn(async () => ({
    transaction: async (callback: (value: typeof manager) => unknown) => callback(manager),
  })),
}));

beforeEach(() => {
  state.trip = {
    id: 11,
    teamId: "team-1",
    category: "u15",
    departureTime: new Date("2026-09-01T08:00:00.000Z"),
    workflowStatus: "APPROVED",
    approvedBudget: "3000.000",
  };
  state.participants = [];
  state.expenses = [];
  state.settings = { dualApprovalThreshold: "5000.000", receiptRequiredThreshold: "100.000", version: 1 };
  tripSave.mockClear();
  participantFind.mockClear();
  eventSave.mockClear();
  expenseSave.mockClear();
});

describe("TripWorkflowService behavior gates", () => {
  it("blocks READY when a minor participant has no granted consent", async () => {
    state.participants = [
      {
        id: 1,
        tripId: 11,
        participantType: "PLAYER",
        consentStatus: "PENDING",
        player: { birthDate: new Date("2010-01-01T00:00:00.000Z") },
      },
    ];
    const { TripWorkflowService } = await import("./TripWorkflowService");

    await expect(new TripWorkflowService().markReady(11, "team-1", "actor-1")).rejects.toThrow(
      "1 consentement(s) requis",
    );
    expect(tripSave).not.toHaveBeenCalled();
    expect(eventSave).not.toHaveBeenCalled();
  });

  it("fails safe on unknown birth date and accepts READY only after explicit consent", async () => {
    state.participants = [
      {
        id: 1,
        tripId: 11,
        participantType: "PLAYER",
        consentStatus: "GRANTED",
        player: { birthDate: null },
      },
    ];
    const { TripWorkflowService } = await import("./TripWorkflowService");

    const result = await new TripWorkflowService().markReady(11, "team-1", "actor-1");
    expect(result.workflowStatus).toBe("READY");
    expect(tripSave).toHaveBeenCalled();
    expect(eventSave).toHaveBeenCalledWith(expect.objectContaining({ transition: "MARK_READY", toStatus: "READY" }));
  });

  it("requires evidence exactly at the configured receipt threshold", async () => {
    const { TripWorkflowService } = await import("./TripWorkflowService");
    const service = new TripWorkflowService();

    await expect(service.addExpense(11, "team-1", "actor-1", { label: "Hôtel", amount: 100 })).rejects.toThrow(
      "justificatif est obligatoire",
    );
    expect(expenseSave).not.toHaveBeenCalled();

    const saved = await service.addExpense(11, "team-1", "actor-1", { label: "Péage", amount: 99.999 });
    expect(saved).toMatchObject({
      amount: "99.999",
      receiptThresholdSnapshot: "100.000",
      receiptRequired: false,
      documentUrl: null,
    });
  });

  it("stores the receipt requirement snapshot with evidence above the threshold", async () => {
    const { TripWorkflowService } = await import("./TripWorkflowService");
    const saved = await new TripWorkflowService().addExpense(11, "team-1", "actor-1", {
      label: "Bus",
      amount: 500,
      documentUrl: "/uploads/trips/bus.pdf",
    });
    expect(saved).toMatchObject({
      amount: "500.000",
      receiptThresholdSnapshot: "100.000",
      receiptRequired: true,
      documentUrl: "/uploads/trips/bus.pdf",
    });
  });
});
