import { describe, expect, it } from "vitest";
import { getEffectiveLicenseStatus, getLicenseRoleLabel, getLicenseStatusLabel } from "../../../packages/regulatory-shared/src/licenseCard";

describe("medical federation license card", () => {
  it("does not present a submitted medical license as approved", () => {
    expect(getEffectiveLicenseStatus("SUBMITTED", null)).toBe("SUBMITTED");
    expect(getLicenseStatusLabel("SUBMITTED", null, "ar")).toBe("مودعة");
    expect(getLicenseRoleLabel("MEDICAL", "fr")).toBe("Staff médical");
  });
});
