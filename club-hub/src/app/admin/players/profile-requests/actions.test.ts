import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  permissions: new Set<string>(["players.edit"]),
  categories: ["u17"] as "ALL" | string[],
}));
const findById = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
const auditCreate = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/team-context", () => ({ requireTeamId: vi.fn(async () => state.teamId) }));
vi.mock("@/lib/access", () => ({
  getUserAccess: vi.fn(async () => ({
    userId: "reviewer-1",
    teamId: state.teamId,
    permissions: state.permissions,
    categories: state.categories,
    isClubAdmin: false,
  })),
  requirePermission: (_access: unknown, permission: string) => {
    if (!state.permissions.has(permission)) throw new Error("permission manquante");
  },
  requireCategory: (_access: unknown, category: string) => {
    if (state.categories !== "ALL" && !state.categories.includes(category)) throw new Error("catégorie hors de votre périmètre");
  },
}));
vi.mock("@/services/PlayerProfileChangeRequestService", () => ({
  PlayerProfileChangeRequestService: class {
    findById = findById;
    approve = approve;
    reject = reject;
  },
}));
vi.mock("@/services/AuditLogService", () => ({
  AuditLogService: class { create = auditCreate; },
}));

beforeEach(() => {
  state.teamId = "team-1";
  state.permissions = new Set(["players.edit"]);
  state.categories = ["u17"];
  findById.mockReset();
  approve.mockReset();
  reject.mockReset();
  auditCreate.mockReset().mockResolvedValue(undefined);
  findById.mockResolvedValue({
    id: "request-1",
    teamId: "team-1",
    playerId: "player-1",
    requesterUserId: "player-user",
    status: "PENDING",
    currentCategory: "u17",
    requestedChanges: { position: "MIDFIELDER" },
    beforeSnapshot: { position: "DEFENDER" },
  });
  approve.mockResolvedValue({ id: "request-1", playerId: "player-1", status: "APPROVED" });
  reject.mockResolvedValue({ id: "request-1", playerId: "player-1", status: "REJECTED", reviewReason: "incorrect" });
});

describe("PLAYER-001 profile request review boundaries", () => {
  it("requires players.edit", async () => {
    state.permissions.clear();
    const { approvePlayerProfileRequest } = await import("./actions");
    const result = await approvePlayerProfileRequest("request-1");
    expect(result.success).toBe(false);
    expect(approve).not.toHaveBeenCalled();
  });

  it("blocks reviewing a player outside the actor category", async () => {
    state.categories = ["u19"];
    const { approvePlayerProfileRequest } = await import("./actions");
    const result = await approvePlayerProfileRequest("request-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors");
    expect(approve).not.toHaveBeenCalled();
  });

  it("also requires access to the requested target category", async () => {
    findById.mockResolvedValue({
      id: "request-1",
      teamId: "team-1",
      playerId: "player-1",
      requesterUserId: "player-user",
      status: "PENDING",
      currentCategory: "u17",
      requestedChanges: { category: "u19" },
      beforeSnapshot: { category: "u17" },
    });
    const { approvePlayerProfileRequest } = await import("./actions");
    const result = await approvePlayerProfileRequest("request-1");
    expect(result.success).toBe(false);
    expect(approve).not.toHaveBeenCalled();
  });

  it("approves only after tenant and category checks", async () => {
    const { approvePlayerProfileRequest } = await import("./actions");
    const result = await approvePlayerProfileRequest("request-1");
    expect(result.success).toBe(true);
    expect(findById).toHaveBeenCalledWith("request-1", "team-1");
    expect(approve).toHaveBeenCalledWith("request-1", "team-1", "reviewer-1");
  });
});
