import { describe, expect, it } from "vitest";
import { getEffectiveLicenseStatus, getLicenseRoleLabel } from "../../../packages/regulatory-shared/src/licenseCard";

describe("player federation license card", () => {
  it("shows an approved but expired player license as expired", () => {
    expect(getEffectiveLicenseStatus("APPROVED", "2025-06-30T23:59:59.000Z", new Date("2026-08-15T00:00:00.000Z"))).toBe("EXPIRED");
    expect(getLicenseRoleLabel("PLAYER", "fr")).toBe("Joueur");
    expect(getLicenseRoleLabel("PLAYER", "ar")).toBe("لاعب");
  });
});
