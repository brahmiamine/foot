import { describe, expect, it } from "vitest";
import { assertPlayerRegistrationTransition, eligibilityForRegistrationStatus, isPlayerRegistrationEditable } from "../../../packages/regulatory-shared/src/playerRegistration";

describe("player registration domain", () => {
  it("supports submission and federal approval", () => {
    expect(() => assertPlayerRegistrationTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertPlayerRegistrationTransition("SUBMITTED", "APPROVED")).not.toThrow();
  });
  it("blocks direct club approval", () => expect(() => assertPlayerRegistrationTransition("DRAFT", "APPROVED")).toThrow());
  it("maps regulatory status to eligibility", () => {
    expect(eligibilityForRegistrationStatus("APPROVED")).toBe("ELIGIBLE");
    expect(eligibilityForRegistrationStatus("SUSPENDED")).toBe("INELIGIBLE");
    expect(eligibilityForRegistrationStatus("SUBMITTED")).toBe("PENDING");
  });
  it("only allows editing a draft", () => {
    expect(isPlayerRegistrationEditable("DRAFT")).toBe(true);
    expect(isPlayerRegistrationEditable("REJECTED")).toBe(false);
  });
});
