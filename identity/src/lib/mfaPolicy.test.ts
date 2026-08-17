import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";

let dataSource: DataSource;
vi.mock("@/lib/db", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("MFA role policies", () => {
  it("requires MFA immediately for platform and federation admins by default", async () => {
    const { getMfaRolePolicy } = await import("./mfaPolicy");

    await expect(getMfaRolePolicy("PLATFORM_SUPERADMIN")).resolves.toMatchObject({
      mode: "REQUIRED",
      source: "DEFAULT",
      requirementEnforced: true,
    });
    await expect(getMfaRolePolicy("FEDERATION_ADMIN")).resolves.toMatchObject({
      mode: "REQUIRED",
      requirementEnforced: true,
    });
    await expect(getMfaRolePolicy("PLAYER")).resolves.toMatchObject({
      mode: "OPTIONAL",
      requirementEnforced: false,
    });
  });

  it("supports a bounded grace period before REQUIRED enforcement", async () => {
    const { updateMfaRolePolicy, getMfaRolePolicy } = await import("./mfaPolicy");
    await updateMfaRolePolicy({
      role: "ADMIN",
      mode: "REQUIRED",
      gracePeriodDays: 7,
      updatedBy: "platform-admin",
    });

    const stored = await getMfaRolePolicy("ADMIN", new Date());
    expect(stored).toMatchObject({ mode: "REQUIRED", gracePeriodDays: 7, requirementEnforced: false });
    expect(stored.graceEndsAt).toBeInstanceOf(Date);

    const afterGrace = new Date((stored.graceEndsAt as Date).getTime() + 1);
    await expect(getMfaRolePolicy("ADMIN", afterGrace)).resolves.toMatchObject({
      mode: "REQUIRED",
      requirementEnforced: true,
    });
  });

  it("stores OPTIONAL/DISABLED overrides and rejects invalid grace periods", async () => {
    const { updateMfaRolePolicy, getMfaRolePolicy } = await import("./mfaPolicy");

    await updateMfaRolePolicy({ role: "REFEREE", mode: "DISABLED", gracePeriodDays: 0, updatedBy: "admin" });
    await expect(getMfaRolePolicy("REFEREE")).resolves.toMatchObject({
      mode: "DISABLED",
      source: "DATABASE",
      requirementEnforced: false,
    });

    await expect(
      updateMfaRolePolicy({ role: "PLAYER", mode: "REQUIRED", gracePeriodDays: 91, updatedBy: "admin" }),
    ).rejects.toThrow(/0 et 90 jours/);
  });
});
