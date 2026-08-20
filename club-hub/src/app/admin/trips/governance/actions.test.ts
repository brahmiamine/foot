import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  accessTeamId: "team-1",
  permissions: new Set<string>(["trips.manage", "trips.approve"]),
  categories: "ALL" as "ALL" | string[],
}));

const findById = vi.fn();
const findApprovalTrip = vi.fn();
const submitBudget = vi.fn();
const approveBudget = vi.fn();
const updateGovernanceSettings = vi.fn();
const addExpense = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "actor-1", teamId: state.teamId } })),
}));
vi.mock("@/lib/team-context", () => ({
  requireTeamId: vi.fn(async () => state.teamId),
}));
vi.mock("@/lib/access", () => ({
  getUserAccess: vi.fn(async () => ({
    userId: "actor-1",
    teamId: state.accessTeamId,
    permissions: state.permissions,
    categories: state.categories,
    isClubAdmin: false,
  })),
  requirePermission: (_access: unknown, permission: string) => {
    if (!state.permissions.has(permission)) throw new Error("Action non autorisée : permission manquante");
  },
  requireCategory: (_access: unknown, category: string) => {
    if (state.categories !== "ALL" && !state.categories.includes(category)) {
      throw new Error("Action non autorisée : catégorie hors de votre périmètre");
    }
  },
}));
vi.mock("@/services/TripService", () => ({
  TripService: class {
    findById = findById;
  },
}));
vi.mock("@/services/TripGovernanceQueryService", () => ({
  TripGovernanceQueryService: class {
    findApprovalTrip = findApprovalTrip;
  },
}));
vi.mock("@/services/TripWorkflowService", () => ({
  TripWorkflowService: class {
    updateGovernanceSettings = updateGovernanceSettings;
    submitBudget = submitBudget;
    approveBudget = approveBudget;
    rejectBudget = vi.fn();
    recordConsent = vi.fn();
    markReady = vi.fn();
    markDeparted = vi.fn();
    addExpense = addExpense;
    removeExpense = vi.fn();
    completeTrip = vi.fn();
    cancelTrip = vi.fn();
  },
}));

function form(fields: Record<string, string> = {}) {
  const value = new FormData();
  for (const [key, fieldValue] of Object.entries(fields)) value.set(key, fieldValue);
  return value;
}

beforeEach(() => {
  state.teamId = "team-1";
  state.accessTeamId = "team-1";
  state.permissions = new Set(["trips.manage", "trips.approve"]);
  state.categories = "ALL";
  findById.mockReset();
  findApprovalTrip.mockReset();
  submitBudget.mockReset();
  approveBudget.mockReset();
  updateGovernanceSettings.mockReset();
  addExpense.mockReset();
  findById.mockResolvedValue({ id: 11, teamId: "team-1", category: "u15", workflowStatus: "DRAFT" });
  findApprovalTrip.mockResolvedValue({
    approval: { id: "approval-1", tripId: 11 },
    trip: { id: 11, teamId: "team-1", category: "u15", workflowStatus: "APPROVAL_PENDING" },
  });
});

describe("trip governance server actions", () => {
  it("requires trips.manage before a budget can be submitted", async () => {
    state.permissions = new Set(["trips.approve"]);
    const { submitTripBudget } = await import("./actions");
    const result = await submitTripBudget(11, form({ estimatedBudget: "3000" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(submitBudget).not.toHaveBeenCalled();
  });

  it("requires trips.approve rather than trips.manage to approve a budget", async () => {
    state.permissions = new Set(["trips.manage"]);
    const { approveTripBudget } = await import("./actions");
    const result = await approveTripBudget("approval-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(approveBudget).not.toHaveBeenCalled();
  });

  it("fails closed when authenticated and requested club contexts differ", async () => {
    state.accessTeamId = "team-2";
    const { submitTripBudget } = await import("./actions");
    const result = await submitTripBudget(11, form({ estimatedBudget: "3000" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("contexte club incohérent");
    expect(findById).not.toHaveBeenCalled();
  });

  it("enforces category scope on budget approval", async () => {
    state.categories = ["u17"];
    const { approveTripBudget } = await import("./actions");
    const result = await approveTripBudget("approval-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(approveBudget).not.toHaveBeenCalled();
  });

  it("passes tenant and actor to budget submission after validation", async () => {
    state.categories = ["u15"];
    const { submitTripBudget } = await import("./actions");
    const result = await submitTripBudget(11, form({ estimatedBudget: "3000.125" }));
    expect(result.success).toBe(true);
    expect(submitBudget).toHaveBeenCalledWith(11, "team-1", "actor-1", 3000.125);
  });

  it("reserves threshold configuration to trip approvers", async () => {
    state.permissions = new Set(["trips.manage"]);
    const { updateTripGovernanceSettings } = await import("./actions");
    const result = await updateTripGovernanceSettings(
      form({ dualApprovalThreshold: "5000", receiptRequiredThreshold: "250" }),
    );
    expect(result.success).toBe(false);
    expect(updateGovernanceSettings).not.toHaveBeenCalled();
  });

  it("validates expense data before delegating it to the workflow", async () => {
    const { addTripExpense } = await import("./actions");
    const result = await addTripExpense(
      11,
      form({ label: "Hôtel", amount: "350", documentUrl: "/uploads/trips/hotel.pdf" }),
    );
    expect(result.success).toBe(true);
    expect(addExpense).toHaveBeenCalledWith(11, "team-1", "actor-1", {
      label: "Hôtel",
      amount: 350,
      documentUrl: "/uploads/trips/hotel.pdf",
    });
  });
});
