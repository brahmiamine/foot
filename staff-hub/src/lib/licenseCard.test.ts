import { describe, expect, it } from "vitest";
import { getEffectiveLicenseStatus, getLicenseRoleLabel, getLicenseStatusLabel } from "../../../packages/regulatory-shared/src/licenseCard";

describe("staff federation license card", () => {
  it("keeps a suspended coach license non-valid and translates the role", () => {
    expect(getEffectiveLicenseStatus("SUSPENDED", "2027-06-30T23:59:59.000Z", new Date("2026-08-15T00:00:00.000Z"))).toBe("SUSPENDED");
    expect(getLicenseStatusLabel("SUSPENDED", null, "fr")).toBe("Suspendue");
    expect(getLicenseRoleLabel("COACH", "ar")).toBe("مدرب");
  });
});
