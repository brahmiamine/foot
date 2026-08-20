import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  teamId: "team-1",
  accessTeamId: "team-1",
  permissions: new Set<string>(["sponsors.manage"]),
}));

const reviewRequest = vi.fn();
const draftContract = vi.fn();
const submitForApproval = vi.fn();
const approveContract = vi.fn();
const deletePendingRequest = vi.fn();
const updateGovernanceSettings = vi.fn();

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
    categories: "ALL",
  })),
  requirePermission: (_access: unknown, permission: string) => {
    if (!state.permissions.has(permission)) throw new Error("Action non autorisée : permission manquante");
  },
}));
vi.mock("@/services/SponsorshipWorkflowService", () => ({
  SponsorshipWorkflowService: class {
    reviewRequest = reviewRequest;
    startNegotiation = vi.fn();
    draftContract = draftContract;
    updateDraftContract = vi.fn();
    submitForApproval = submitForApproval;
    approveContract = approveContract;
    rejectContract = vi.fn();
    activateSponsor = vi.fn();
    refuseRequest = vi.fn();
    deletePendingRequest = deletePendingRequest;
    updateGovernanceSettings = updateGovernanceSettings;
  },
}));

function form(fields: Record<string, string | string[]> = {}) {
  const value = new FormData();
  for (const [key, fieldValue] of Object.entries(fields)) {
    if (Array.isArray(fieldValue)) {
      for (const item of fieldValue) value.append(key, item);
    } else {
      value.set(key, fieldValue);
    }
  }
  return value;
}

beforeEach(() => {
  state.teamId = "team-1";
  state.accessTeamId = "team-1";
  state.permissions = new Set(["sponsors.manage"]);
  reviewRequest.mockReset();
  draftContract.mockReset();
  submitForApproval.mockReset();
  approveContract.mockReset();
  deletePendingRequest.mockReset();
  updateGovernanceSettings.mockReset();
  draftContract.mockResolvedValue({ id: 44 });
  submitForApproval.mockResolvedValue({ id: "approval-1", approvalMode: "DUAL_APPROVAL" });
  approveContract.mockResolvedValue({ id: "approval-1", status: "PENDING" });
  updateGovernanceSettings.mockResolvedValue({ dualApprovalThreshold: 5000, version: 2 });
});

describe("sponsorship server actions", () => {
  it("blocks mutations without sponsors.manage", async () => {
    state.permissions.clear();
    const { reviewSponsorRequest } = await import("./actions");

    const result = await reviewSponsorRequest(1, form({ notes: "À étudier" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("permission manquante");
    expect(reviewRequest).not.toHaveBeenCalled();
  });

  it("fails closed when the authenticated and requested club contexts differ", async () => {
    state.accessTeamId = "team-2";
    const { reviewSponsorRequest } = await import("./actions");

    const result = await reviewSponsorRequest(1, form({ notes: "À étudier" }));

    expect(result.success).toBe(false);
    expect(result.error).toContain("contexte club incohérent");
    expect(reviewRequest).not.toHaveBeenCalled();
  });

  it("passes the current tenant and actor to the review workflow", async () => {
    const { reviewSponsorRequest } = await import("./actions");

    const result = await reviewSponsorRequest(7, form({ notes: "Partenaire stratégique" }));

    expect(result.success).toBe(true);
    expect(reviewRequest).toHaveBeenCalledWith(7, "team-1", "actor-1", "Partenaire stratégique");
  });

  it("parses a complete contract before drafting it", async () => {
    const { draftSponsorContract } = await import("./actions");

    const result = await draftSponsorContract(7, form({
      level: "OR",
      logoSize: "LARGE",
      logoPlacement: ["HOME", "MATCH_PAGES"],
      contractStart: "2026-09-01",
      contractEnd: "2027-06-30",
      contractAmount: "25000.500",
      notes: "Sponsor principal",
    }));

    expect(result.success).toBe(true);
    expect(result.sponsorId).toBe(44);
    expect(draftContract).toHaveBeenCalledWith(7, "team-1", "actor-1", {
      level: "OR",
      logoSize: "LARGE",
      logoPlacement: ["HOME", "MATCH_PAGES"],
      contractStart: "2026-09-01",
      contractEnd: "2027-06-30",
      contractAmount: 25000.5,
      notes: "Sponsor principal",
    });
  });

  it("returns the approval id and preserves dual-approval semantics", async () => {
    const { submitSponsorContractForApproval } = await import("./actions");

    const result = await submitSponsorContractForApproval(44);

    expect(result.success).toBe(true);
    expect(result.approvalId).toBe("approval-1");
    expect(result.message).toContain("double approbation");
    expect(submitForApproval).toHaveBeenCalledWith(44, "team-1", "actor-1");
  });

  it("delegates hard-delete to the pending-only workflow guard", async () => {
    const { deleteSponsorRequest } = await import("./actions");

    const result = await deleteSponsorRequest(7);

    expect(result.success).toBe(true);
    expect(deletePendingRequest).toHaveBeenCalledWith(7, "team-1");
  });

  it("updates the financial threshold through the governed service", async () => {
    const { updateSponsorshipGovernance } = await import("./actions");

    const result = await updateSponsorshipGovernance(form({ dualApprovalThreshold: "5000" }));

    expect(result.success).toBe(true);
    expect(updateGovernanceSettings).toHaveBeenCalledWith("team-1", "actor-1", 5000);
  });
});
