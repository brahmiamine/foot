import { describe, expect, it } from "vitest";
import { registerApproval } from "../../../packages/domain-contracts/src/approval";
import {
  isSafeTripEvidenceLocation,
  playerRequiresTripConsent,
  requiresTripReceipt,
  tripApprovalModeForBudget,
  validateTripBudget,
} from "./TripWorkflowService";

describe("trip governance rules", () => {
  it("uses a single approver below the configured budget threshold", () => {
    expect(tripApprovalModeForBudget(4999.999, 5000)).toBe("SINGLE_APPROVAL");
  });

  it("uses dual approval at or above the threshold, including fail-safe threshold zero", () => {
    expect(tripApprovalModeForBudget(5000, 5000)).toBe("DUAL_APPROVAL");
    expect(tripApprovalModeForBudget(0, 0)).toBe("DUAL_APPROVAL");
  });

  it("rejects invalid budgets and thresholds", () => {
    expect(() => validateTripBudget(-1)).toThrow("Budget du déplacement invalide");
    expect(() => validateTripBudget(Number.NaN)).toThrow("Budget du déplacement invalide");
    expect(() => tripApprovalModeForBudget(100, -1)).toThrow("Seuil de double approbation invalide");
  });

  it("requires an expense receipt at or above the configured threshold", () => {
    expect(requiresTripReceipt(999.999, 1000)).toBe(false);
    expect(requiresTripReceipt(1000, 1000)).toBe(true);
    expect(requiresTripReceipt(1, 0)).toBe(true);
    expect(requiresTripReceipt(0, 0)).toBe(false);
  });

  it("requires consent for minors and fails safe when a player's birth date is unknown", () => {
    const departure = new Date("2026-09-01T08:00:00.000Z");
    expect(playerRequiresTripConsent(new Date("2010-09-02T00:00:00.000Z"), departure)).toBe(true);
    expect(playerRequiresTripConsent(new Date("2008-09-01T00:00:00.000Z"), departure)).toBe(false);
    expect(playerRequiresTripConsent(new Date("2008-09-02T00:00:00.000Z"), departure)).toBe(true);
    expect(playerRequiresTripConsent(null, departure)).toBe(true);
  });

  it("normalizes MariaDB DATE strings before computing majority", () => {
    expect(playerRequiresTripConsent("2010-09-02", "2026-09-01T08:00:00.000Z")).toBe(true);
    expect(playerRequiresTripConsent("2008-09-01", "2026-09-01T08:00:00.000Z")).toBe(false);
    expect(playerRequiresTripConsent("not-a-date", "2026-09-01T08:00:00.000Z")).toBe(true);
  });

  it("accepts only http(s) evidence URLs or normalized local trip upload paths", () => {
    expect(isSafeTripEvidenceLocation("https://files.example.com/receipt.pdf")).toBe(true);
    expect(isSafeTripEvidenceLocation("/uploads/trips/receipt-123.pdf")).toBe(true);
    expect(isSafeTripEvidenceLocation("javascript:alert(1)")).toBe(false);
    expect(isSafeTripEvidenceLocation("/uploads/trips/../../secret")).toBe(false);
  });

  it("inherits maker/checker semantics for high-budget trips", () => {
    const policy = { mode: "DUAL_APPROVAL" as const, makerCheckerEnabled: true };
    const state = { makerUserId: "maker", approverUserIds: [] as string[] };
    expect(() => registerApproval(policy, state, "maker")).toThrow();
    const first = registerApproval(policy, state, "approver-1");
    expect(first.evaluation.canFinalize).toBe(false);
    const second = registerApproval(policy, first.state, "approver-2");
    expect(second.evaluation.canFinalize).toBe(true);
  });
});
