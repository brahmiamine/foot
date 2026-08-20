import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  denied: new Set<string>(),
  categories: "ALL" as "ALL" | string[],
  applicationCategory: "U15",
}));

const approveTechnical = vi.hoisted(() => vi.fn());
const approveAdministrative = vi.hoisted(() => vi.fn());
const preScreen = vi.hoisted(() => vi.fn());
const findById = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "actor-1", teamId: "team-1", role: "OBSERVATEUR" } }),
}));
vi.mock("@/lib/team-context", () => ({ requireTeamId: async () => "team-1" }));
vi.mock("@/lib/access", () => ({
  getUserAccess: async () => ({
    userId: "actor-1",
    teamId: "team-1",
    isClubAdmin: false,
    permissions: new Set<string>(),
    categories: state.categories,
  }),
  requirePermission: (_access: unknown, permission: string) => {
    if (state.denied.has(permission)) throw new Error("Action non autorisée : permission manquante");
  },
  requireCategory: (_access: unknown, category: string) => {
    if (state.categories !== "ALL" && !state.categories.includes(category)) {
      throw new Error("Action non autorisée : catégorie hors de votre périmètre");
    }
  },
}));
vi.mock("@/services/PlayerApplicationService", () => ({
  normalizeAcademyCategory: (value: string) => {
    const normalized = value.trim().toLowerCase();
    return ["u7", "u8", "u9", "u10", "u11", "u12", "u13", "u14", "u15", "u16", "u17", "u18", "u19", "u20", "u21", "seniors"].includes(normalized)
      ? normalized
      : null;
  },
  PlayerApplicationService: class {
    findById = findById;
    preScreen = preScreen;
    approveTechnical = approveTechnical;
    approveAdministrative = approveAdministrative;
  },
}));

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.denied.clear();
  state.categories = "ALL";
  state.applicationCategory = "U15";
  findById.mockReset();
  preScreen.mockReset();
  approveTechnical.mockReset();
  approveAdministrative.mockReset();
  findById.mockImplementation(async () => ({ id: 1, teamId: "team-1", category: state.applicationCategory }));
});

describe("academy application actions authorization", () => {
  it("allows technical approval with playerApplications.manage", async () => {
    const { approvePlayerApplicationTechnical } = await import("./actions");
    const result = await approvePlayerApplicationTechnical(1, form({ notes: "Essai concluant" }));

    expect(result.success, JSON.stringify(result)).toBe(true);
    expect(approveTechnical).toHaveBeenCalledWith(1, "team-1", "actor-1", "Essai concluant");
  });

  it("requires players.create for administrative approval", async () => {
    state.denied.add("players.create");
    const { approvePlayerApplicationAdministrative } = await import("./actions");
    const result = await approvePlayerApplicationAdministrative(1, form({ notes: "Dossier complet" }));

    expect(result.success).toBe(false);
    expect(approveAdministrative).not.toHaveBeenCalled();
  });

  it("blocks processing outside the actor category scope", async () => {
    state.categories = ["u17"];
    const { preScreenPlayerApplication } = await import("./actions");
    const result = await preScreenPlayerApplication(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(preScreen).not.toHaveBeenCalled();
  });

  it("fails closed for an unknown academy category when access is category-restricted", async () => {
    state.categories = ["u15"];
    state.applicationCategory = "U6";
    const { preScreenPlayerApplication } = await import("./actions");
    const result = await preScreenPlayerApplication(1, form({ notes: "OK" }));

    expect(result.success).toBe(false);
    expect(preScreen).not.toHaveBeenCalled();
  });
})
