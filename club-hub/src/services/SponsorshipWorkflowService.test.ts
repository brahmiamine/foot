import { describe, expect, it } from "vitest";
import { sponsorApprovalModeForAmount, validateSponsorContractWindow } from "./SponsorshipWorkflowService";
import { registerApproval } from "../../../packages/domain-contracts/src/approval";

describe("sponsorship governance invariants", () => {
  it("requires dual approval at or above the configured amount threshold", () => {
    expect(sponsorApprovalModeForAmount(999.999, 1000)).toBe("SINGLE_APPROVAL");
    expect(sponsorApprovalModeForAmount(1000, 1000)).toBe("DUAL_APPROVAL");
    expect(sponsorApprovalModeForAmount(5000, 1000)).toBe("DUAL_APPROVAL");
  });

  it("uses the fail-safe default threshold 0 as dual approval for every non-negative contract", () => {
    expect(sponsorApprovalModeForAmount(0, 0)).toBe("DUAL_APPROVAL");
    expect(sponsorApprovalModeForAmount(1, 0)).toBe("DUAL_APPROVAL");
  });

  it("rejects invalid amounts and thresholds", () => {
    expect(() => sponsorApprovalModeForAmount(-1, 1000)).toThrow("Montant du contrat invalide");
    expect(() => sponsorApprovalModeForAmount(1000, -1)).toThrow("Seuil de double approbation invalide");
  });

  it("requires a strictly increasing ISO contract date window", () => {
    expect(() => validateSponsorContractWindow("2026-09-01", "2027-06-30")).not.toThrow();
    expect(() => validateSponsorContractWindow("2026-09-01", "2026-09-01")).toThrow(
      "La fin du contrat doit être postérieure au début",
    );
    expect(() => validateSponsorContractWindow("not-a-date", "2027-06-30")).toThrow("Dates du contrat invalides");
  });

  it("keeps the contract maker out of approval and requires two distinct approvers in dual mode", () => {
    const policy = { mode: "DUAL_APPROVAL" as const, makerCheckerEnabled: true };
    const initial = { makerUserId: "maker-1", approverUserIds: [] as string[] };

    expect(() => registerApproval(policy, initial, "maker-1")).toThrow();

    const first = registerApproval(policy, initial, "checker-1");
    expect(first.evaluation.canFinalize).toBe(false);
    expect(() => registerApproval(policy, first.nextState, "checker-1")).toThrow();

    const second = registerApproval(policy, first.nextState, "checker-2");
    expect(second.evaluation.canFinalize).toBe(true);
    expect(second.nextState.approverUserIds).toEqual(["checker-1", "checker-2"]);
  });
});
