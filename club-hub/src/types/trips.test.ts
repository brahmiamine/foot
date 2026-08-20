import { describe, expect, it } from "vitest";
import {
  tripExpenseSchema,
  tripGovernanceSettingsSchema,
  tripDecisionReasonSchema,
  submitTripBudgetSchema,
} from "./trips";

describe("trip governance input schemas", () => {
  it("accepts non-negative approval and receipt thresholds", () => {
    const parsed = tripGovernanceSettingsSchema.parse({
      dualApprovalThreshold: "5000",
      receiptRequiredThreshold: "250",
    });
    expect(parsed).toEqual({ dualApprovalThreshold: 5000, receiptRequiredThreshold: 250 });
  });

  it("rejects negative budgets and thresholds", () => {
    expect(() => submitTripBudgetSchema.parse({ estimatedBudget: "-1" })).toThrow();
    expect(() => tripGovernanceSettingsSchema.parse({ dualApprovalThreshold: -1, receiptRequiredThreshold: 0 })).toThrow();
  });

  it("requires a meaningful rejection or cancellation reason", () => {
    expect(() => tripDecisionReasonSchema.parse({ reason: "  " })).toThrow();
    expect(tripDecisionReasonSchema.parse({ reason: "Budget non conforme" }).reason).toBe("Budget non conforme");
  });

  it("accepts optional safe evidence and rejects executable or traversal locations", () => {
    expect(
      tripExpenseSchema.parse({ label: "Hôtel", amount: "350", documentUrl: "/uploads/trips/hotel-01.pdf" }),
    ).toMatchObject({ label: "Hôtel", amount: 350, documentUrl: "/uploads/trips/hotel-01.pdf" });
    expect(() => tripExpenseSchema.parse({ label: "Bus", amount: 100, documentUrl: "javascript:alert(1)" })).toThrow();
    expect(() => tripExpenseSchema.parse({ label: "Bus", amount: 100, documentUrl: "/uploads/trips/../../secret" })).toThrow();
  });

  it("allows an empty evidence location because the server threshold decides whether it is required", () => {
    expect(tripExpenseSchema.parse({ label: "Péage", amount: "10", documentUrl: "" }).documentUrl).toBeNull();
  });
});
