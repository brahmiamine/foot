import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  permissions: new Set<string>(["trips.manage"]),
  categories: "ALL" as "ALL" | string[],
}));

const findParticipantById = vi.fn();
const toggleConfirmed = vi.fn();
const removeParticipant = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "actor-1" } })) }));
vi.mock("@/lib/team-context", () => ({ requireTeamId: vi.fn(async () => state.teamId) }));
vi.mock("@/lib/access", () => ({
  getUserAccess: vi.fn(async () => ({
    userId: "actor-1",
    teamId: state.teamId,
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
    findParticipantById = findParticipantById;
    toggleConfirmed = toggleConfirmed;
    removeParticipant = removeParticipant;
    findById = vi.fn();
    create = vi.fn();
    update = vi.fn();
    delete = vi.fn();
    addParticipant = vi.fn();
  },
}));
vi.mock("@/services/AuditLogService", () => ({
  AuditLogService: class {
    create = vi.fn();
  },
}));

beforeEach(() => {
  state.teamId = "team-1";
  state.permissions = new Set(["trips.manage"]);
  state.categories = "ALL";
  findParticipantById.mockReset();
  toggleConfirmed.mockReset();
  removeParticipant.mockReset();
  findParticipantById.mockResolvedValue({
    id: 9,
    tripId: 11,
    trip: { id: 11, teamId: "team-1", category: "u15" },
  });
});

describe("trip participant mutation boundaries", () => {
  it("blocks presence changes outside the actor category scope", async () => {
    state.categories = ["u17"];
    const { toggleTripParticipantConfirmed } = await import("./actions");

    const result = await toggleTripParticipantConfirmed(9);

    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(toggleConfirmed).not.toHaveBeenCalled();
  });

  it("blocks participant removal outside the actor category scope", async () => {
    state.categories = ["u17"];
    const { removeTripParticipant } = await import("./actions");

    const result = await removeTripParticipant(9);

    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(removeParticipant).not.toHaveBeenCalled();
  });

  it("allows scoped mutation only after tenant-scoped participant lookup", async () => {
    state.categories = ["u15"];
    const { toggleTripParticipantConfirmed } = await import("./actions");

    const result = await toggleTripParticipantConfirmed(9);

    expect(result.success).toBe(true);
    expect(findParticipantById).toHaveBeenCalledWith(9, "team-1");
    expect(toggleConfirmed).toHaveBeenCalledWith(9, "team-1");
  });
});
