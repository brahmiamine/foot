import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  accessTeamId: "team-1",
  permissions: new Set<string>(["trainings.view", "trainings.edit", "trainings.create"]),
  categories: "ALL" as "ALL" | string[],
}));

const findById = vi.fn();
const updateResponsePolicy = vi.fn();
const lockInvitations = vi.fn();
const createTemplateFromTraining = vi.fn();
const createFromTemplate = vi.fn();
const deleteTemplate = vi.fn();
const findTemplates = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "actor-1" } })),
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
vi.mock("@/services/TrainingService", () => ({
  TrainingService: class {
    findById = findById;
    updateResponsePolicy = updateResponsePolicy;
    lockInvitations = lockInvitations;
    createTemplateFromTraining = createTemplateFromTraining;
    createFromTemplate = createFromTemplate;
    deleteTemplate = deleteTemplate;
    findTemplates = findTemplates;
  },
}));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.teamId = "team-1";
  state.accessTeamId = "team-1";
  state.permissions = new Set(["trainings.view", "trainings.edit", "trainings.create"]);
  state.categories = "ALL";
  for (const mock of [findById, updateResponsePolicy, lockInvitations, createTemplateFromTraining, createFromTemplate, deleteTemplate, findTemplates]) {
    mock.mockReset();
  }
  findById.mockResolvedValue({ id: 11, teamId: "team-1", category: "u15", status: "SCHEDULED" });
  findTemplates.mockResolvedValue([{ id: 22, teamId: "team-1", category: "u15", name: "Pré-match" }]);
});

describe("training configuration server actions", () => {
  it("fails closed when request and access club contexts differ", async () => {
    state.accessTeamId = "team-2";
    const { lockTrainingInvitations } = await import("./actions");
    const result = await lockTrainingInvitations(11);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Contexte club invalide");
    expect(findById).not.toHaveBeenCalled();
  });

  it("requires trainings.edit before changing the response policy", async () => {
    state.permissions = new Set(["trainings.view"]);
    const { updateTrainingResponsePolicy } = await import("./actions");
    const result = await updateTrainingResponsePolicy(form({
      trainingId: "11",
      responseDeadline: "2026-09-01T12:00",
      reminderOffsetMinutes: "120",
    }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(updateResponsePolicy).not.toHaveBeenCalled();
  });

  it("enforces category scope before locking a roster", async () => {
    state.categories = ["u17"];
    const { lockTrainingInvitations } = await import("./actions");
    const result = await lockTrainingInvitations(11);
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(lockInvitations).not.toHaveBeenCalled();
  });

  it("passes tenant and actor to the irreversible roster lock", async () => {
    state.categories = ["u15"];
    const { lockTrainingInvitations } = await import("./actions");
    const result = await lockTrainingInvitations(11);
    expect(result.success).toBe(true);
    expect(lockInvitations).toHaveBeenCalledWith(11, "team-1", "actor-1");
  });

  it("requires trainings.create before generating a session from a template", async () => {
    state.permissions = new Set(["trainings.view", "trainings.edit"]);
    const { createTrainingFromTemplate } = await import("./actions");
    const result = await createTrainingFromTemplate(form({ templateId: "22", date: "2026-09-05T18:00" }));
    expect(result.success).toBe(false);
    expect(createFromTemplate).not.toHaveBeenCalled();
  });
});
