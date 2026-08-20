import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  accessTeamId: "team-1",
  permissions: new Set<string>(["recruitment.manage"]),
  categories: "ALL" as "ALL" | string[],
}));

const approveScout = vi.fn();
const scheduleTrial = vi.fn();
const deleteNew = vi.fn();
const findApplicationById = vi.fn();

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
    isClubAdmin: false,
    permissions: state.permissions,
    categories: state.categories,
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
vi.mock("@/services/RecruitmentService", () => ({
  RecruitmentService: class {
    findApplicationById = findApplicationById;
    createNeed = vi.fn();
    updateNeed = vi.fn();
    deleteNeed = vi.fn();
  },
}));
vi.mock("@/services/RecruitmentWorkflowService", () => ({
  RecruitmentWorkflowService: class {
    approveScout = approveScout;
    approveCoach = vi.fn();
    scheduleTrial = scheduleTrial;
    approveTrial = vi.fn();
    approveSportingDirector = vi.fn();
    startNegotiation = vi.fn();
    accept = vi.fn();
    reject = vi.fn();
    deleteNew = deleteNew;
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
  state.permissions = new Set(["recruitment.manage"]);
  state.categories = "ALL";
  approveScout.mockReset();
  scheduleTrial.mockReset();
  deleteNew.mockReset();
  findApplicationById.mockReset();
  findApplicationById.mockResolvedValue({ id: 1, teamId: "team-1", category: "U15", status: "NEW" });
});

describe("recruitment server actions", () => {
  it("blocks mutations without recruitment.manage", async () => {
    state.permissions.clear();
    const { approveRecruitmentScout } = await import("./actions");

    const result = await approveRecruitmentScout(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(approveScout).not.toHaveBeenCalled();
  });

  it("fails closed when the authenticated and requested club contexts differ", async () => {
    state.accessTeamId = "team-2";
    const { approveRecruitmentScout } = await import("./actions");

    const result = await approveRecruitmentScout(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("contexte club incohérent");
    expect(findApplicationById).not.toHaveBeenCalled();
  });

  it("blocks a scoped user from processing another category", async () => {
    state.categories = ["u17"];
    const { approveRecruitmentScout } = await import("./actions");

    const result = await approveRecruitmentScout(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(approveScout).not.toHaveBeenCalled();
  });

  it("fails closed for an unrecognized public category when the user is category-scoped", async () => {
    state.categories = ["u15"];
    findApplicationById.mockResolvedValue({ id: 1, teamId: "team-1", category: "Academy X", status: "NEW" });
    const { approveRecruitmentScout } = await import("./actions");

    const result = await approveRecruitmentScout(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie recrutement non reconnue");
    expect(approveScout).not.toHaveBeenCalled();
  });

  it("passes the current tenant and actor to the workflow", async () => {
    state.categories = ["u15"];
    const { approveRecruitmentScout } = await import("./actions");

    const result = await approveRecruitmentScout(1, form({ notes: "Profil intéressant" }));

    expect(result.success).toBe(true);
    expect(approveScout).toHaveBeenCalledWith(1, "team-1", "actor-1", "Profil intéressant");
  });

  it("converts trial input only after authorization and category checks", async () => {
    const { scheduleRecruitmentTrial } = await import("./actions");

    const result = await scheduleRecruitmentTrial(
      1,
      form({
        scheduledAt: "2026-08-27T16:00:00.000Z",
        location: "Terrain principal",
        notes: "Groupe seniors",
      }),
    );

    expect(result.success).toBe(true);
    expect(scheduleTrial).toHaveBeenCalledWith(1, "team-1", "actor-1", {
      scheduledAt: "2026-08-27T16:00:00.000Z",
      location: "Terrain principal",
      notes: "Groupe seniors",
    });
  });

  it("delegates hard-delete to the workflow guard", async () => {
    const { deleteRecruitmentApplication } = await import("./actions");

    const result = await deleteRecruitmentApplication(1);

    expect(result.success).toBe(true);
    expect(deleteNew).toHaveBeenCalledWith(1, "team-1");
  });
});
