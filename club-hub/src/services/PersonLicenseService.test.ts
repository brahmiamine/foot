import { describe, expect, it } from "vitest";
import {
  assertApprovalMetadata,
  assertPersonLicenseTransition,
  isPersonLicenseActive,
  isPersonLicenseEditable,
} from "../../../packages/regulatory-shared/src/personLicensing";

describe("person licensing domain", () => {
  it("allows the normal submission and review flow", () => {
    expect(() => assertPersonLicenseTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertPersonLicenseTransition("SUBMITTED", "UNDER_REVIEW")).not.toThrow();
    expect(() => assertPersonLicenseTransition("UNDER_REVIEW", "APPROVED")).not.toThrow();
  });

  it("blocks self approval and terminal transitions", () => {
    expect(() => assertPersonLicenseTransition("DRAFT", "APPROVED")).toThrow();
    expect(() => assertPersonLicenseTransition("REVOKED", "APPROVED")).toThrow();
  });

  it("requires a license number before approval", () => {
    expect(() => assertApprovalMetadata({ licenseNumber: "" })).toThrow();
    expect(() => assertApprovalMetadata({ licenseNumber: "FTF-2027-42" })).not.toThrow();
  });

  it("treats only unexpired approved licenses as active", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(isPersonLicenseActive("APPROVED", "2027-06-30", now)).toBe(true);
    expect(isPersonLicenseActive("APPROVED", "2026-06-30", now)).toBe(false);
    expect(isPersonLicenseActive("SUSPENDED", "2027-06-30", now)).toBe(false);
    expect(isPersonLicenseEditable("DRAFT")).toBe(true);
  });
});
