import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  accessTeamId: "team-1",
  permissions: new Set<string>(["discipline.manage"]),
  categories: "ALL" as "ALL" | string[],
}));

const createRuleSet = vi.fn();
const createOverride = vi.fn();
const revokeOverride = vi.fn();
const listOverrides = vi.fn();
const findPlayer = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/team-context", () => ({ requireTeamId: vi.fn(async () => state.teamId) }));
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
vi.mock("@/services/PlayerService", () => ({
  PlayerService: class { findById = findPlayer; },
}));
vi.mock("@/services/DisciplineRuleService", () => ({
  DisciplineRuleService: class {
    createRuleSet = createRuleSet;
    createOverride = createOverride;
    revokeOverride = revokeOverride;
    listOverrides = listOverrides;
  },
}));
vi.mock("@/services/AuditLogService", () => ({
  AuditLogService: class { create = vi.fn(async () => undefined); },
}));

function ruleForm(category = "u17") {
  const form = new FormData();
  form.set("seasonId", "season-1");
  form.set("competitionType", "championnat");
  form.set("category", category);
  form.set("yellowWarningThreshold", "2");
  form.set("yellowSuspensionThreshold", "3");
  form.set("yellowSuspensionMatches", "1");
  form.set("yellowFineAmount", "30");
  form.set("redFineAmount", "50");
  form.set("fineDueDays", "15");
  form.set("defaultRedSuspensionMatches", "1");
  form.set("defaultDoubleYellowSuspensionMatches", "1");
  form.set("validFrom", "2026-09-01T00:00:00.000Z");
  form.set("reason", "Règlement saison 2026/2027");
  return form;
}

function overrideForm(targetType: "MATCH" | "PLAYER", targetId: string) {
  const form = new FormData();
  form.set("targetType", targetType);
  form.set("targetId", targetId);
  form.set("yellowSuspensionThreshold", "4");
  form.set("validFrom", "2026-09-01T00:00:00.000Z");
  form.set("reason", "Décision exceptionnelle PV-42");
  return form;
}

beforeEach(() => {
  state.teamId = "team-1";
  state.accessTeamId = "team-1";
  state.permissions = new Set(["discipline.manage"]);
  state.categories = "ALL";
  createRuleSet.mockReset();
  createOverride.mockReset();
  revokeOverride.mockReset();
  listOverrides.mockReset();
  findPlayer.mockReset();
  createRuleSet.mockResolvedValue({ id: "rule-1", version: 1, seasonId: "season-1", reason: "ok" });
  createOverride.mockResolvedValue({ id: "override-1", reason: "ok" });
});

describe("discipline rule actions", () => {
  it("requires discipline.manage", async () => {
    state.permissions.clear();
    const { createDisciplineRuleSetAction } = await import("./actions");
    const result = await createDisciplineRuleSetAction(ruleForm());
    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(createRuleSet).not.toHaveBeenCalled();
  });

  it("fails closed when team context differs from effective access", async () => {
    state.accessTeamId = "team-2";
    const { createDisciplineRuleSetAction } = await import("./actions");
    const result = await createDisciplineRuleSetAction(ruleForm());
    expect(result.success).toBe(false);
    expect(result.error).toContain("contexte club incohérent");
    expect(createRuleSet).not.toHaveBeenCalled();
  });

  it("prevents category-scoped users from creating a global rule", async () => {
    state.categories = ["u17"];
    const { createDisciplineRuleSetAction } = await import("./actions");
    const result = await createDisciplineRuleSetAction(ruleForm(""));
    expect(result.success).toBe(false);
    expect(result.error).toContain("toutes les catégories");
    expect(createRuleSet).not.toHaveBeenCalled();
  });

  it("allows a category-scoped rule inside the actor scope", async () => {
    state.categories = ["u17"];
    const { createDisciplineRuleSetAction } = await import("./actions");
    const result = await createDisciplineRuleSetAction(ruleForm("u17"));
    expect(result.success).toBe(true);
    expect(createRuleSet).toHaveBeenCalledWith("team-1", expect.objectContaining({ category: "u17" }), "actor-1");
  });

  it("requires global category scope for a match override", async () => {
    state.categories = ["u17"];
    const { createDisciplineOverrideAction } = await import("./actions");
    const result = await createDisciplineOverrideAction(overrideForm("MATCH", "match-1"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("toutes les catégories");
    expect(createOverride).not.toHaveBeenCalled();
  });

  it("enforces player category on player overrides", async () => {
    state.categories = ["u17"];
    findPlayer.mockResolvedValue({ id: "player-1", category: "u19" });
    const { createDisciplineOverrideAction } = await import("./actions");
    const result = await createDisciplineOverrideAction(overrideForm("PLAYER", "player-1"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie hors de votre périmètre");
    expect(createOverride).not.toHaveBeenCalled();
  });
});
