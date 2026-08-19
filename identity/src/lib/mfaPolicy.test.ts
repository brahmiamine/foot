import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { IdentityPolicyAudit } from "@/entities/IdentityPolicyAudit";
import { MfaRolePolicy } from "@/entities/MfaRolePolicy";

let dataSource: DataSource;
vi.mock("@/lib/db", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});

afterEach(async () => {
  await dataSource.destroy();
});

function auditContext() {
  return {
    updatedBy: "platform-admin",
    actorRole: "PLATFORM_SUPERADMIN" as const,
    reason: "Renforcement de la politique de sécurité",
    ipAddress: "203.0.113.10",
    userAgent: "vitest",
  };
}

describe("MFA role policies", () => {
  it("requires MFA immediately for platform and federation admins by default", async () => {
    const { getMfaRolePolicy } = await import("./mfaPolicy");

    await expect(getMfaRolePolicy("PLATFORM_SUPERADMIN")).resolves.toMatchObject({
      mode: "REQUIRED",
      version: 0,
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
      ...auditContext(),
    });

    const stored = await getMfaRolePolicy("ADMIN", new Date());
    expect(stored).toMatchObject({
      mode: "REQUIRED",
      gracePeriodDays: 7,
      version: 1,
      requirementEnforced: false,
    });
    expect(stored.graceEndsAt).toBeInstanceOf(Date);

    const afterGrace = new Date((stored.graceEndsAt as Date).getTime() + 1);
    await expect(getMfaRolePolicy("ADMIN", afterGrace)).resolves.toMatchObject({
      mode: "REQUIRED",
      requirementEnforced: true,
    });
  });

  it("increments versions, preserves immutable snapshots and writes before/after audit context", async () => {
    const { updateMfaRolePolicy } = await import("./mfaPolicy");
    const first = await updateMfaRolePolicy({
      role: "REFEREE",
      mode: "REQUIRED",
      gracePeriodDays: 5,
      ...auditContext(),
    });
    const second = await updateMfaRolePolicy({
      role: "REFEREE",
      mode: "OPTIONAL",
      gracePeriodDays: 0,
      ...auditContext(),
      reason: "Retour en mode optionnel après la campagne pilote",
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);

    const snapshots = await dataSource.getRepository(MfaRolePolicy).find({
      where: { role: "REFEREE" },
      order: { version: "ASC" },
    });
    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((row) => row.version)).toEqual([1, 2]);
    expect(snapshots[0]).toMatchObject({ mode: "REQUIRED", gracePeriodDays: 5 });
    expect(snapshots[1]).toMatchObject({ mode: "OPTIONAL", gracePeriodDays: 0 });

    const audits = await dataSource.getRepository(IdentityPolicyAudit).find({
      order: { createdAt: "ASC" },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      domain: "IDENTITY_SECURITY",
      configurationKey: "MFA_ROLE_POLICY",
      scopeType: "ROLE",
      scopeId: "REFEREE",
      previousVersion: null,
      newVersion: 1,
      actorUserId: "platform-admin",
      actorRole: "PLATFORM_SUPERADMIN",
      reason: "Renforcement de la politique de sécurité",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
    });
    expect(audits[1].before).toMatchObject({ role: "REFEREE", mode: "REQUIRED", version: 1 });
    expect(audits[1].after).toMatchObject({ role: "REFEREE", mode: "OPTIONAL", version: 2 });
  });

  it("does not apply a future MFA policy version before effectiveFrom", async () => {
    const { updateMfaRolePolicy, getMfaRolePolicy } = await import("./mfaPolicy");
    await updateMfaRolePolicy({
      role: "PLAYER",
      mode: "REQUIRED",
      gracePeriodDays: 0,
      effectiveFrom: new Date("2026-09-01T00:00:00Z"),
      ...auditContext(),
    } as Parameters<typeof updateMfaRolePolicy>[0] & { effectiveFrom: Date });

    await expect(getMfaRolePolicy("PLAYER", new Date("2026-08-20T00:00:00Z"))).resolves.toMatchObject({
      mode: "OPTIONAL",
      version: 0,
      source: "DEFAULT",
    });
    await expect(getMfaRolePolicy("PLAYER", new Date("2026-09-02T00:00:00Z"))).resolves.toMatchObject({
      mode: "REQUIRED",
      version: 1,
      source: "DATABASE",
    });
  });

  it("stores DISABLED overrides and rejects invalid grace periods or missing reasons", async () => {
    const { updateMfaRolePolicy, getMfaRolePolicy } = await import("./mfaPolicy");

    await updateMfaRolePolicy({
      role: "REFEREE",
      mode: "DISABLED",
      gracePeriodDays: 0,
      ...auditContext(),
    });
    await expect(getMfaRolePolicy("REFEREE")).resolves.toMatchObject({
      mode: "DISABLED",
      version: 1,
      source: "DATABASE",
      requirementEnforced: false,
    });

    await expect(
      updateMfaRolePolicy({
        role: "PLAYER",
        mode: "REQUIRED",
        gracePeriodDays: 91,
        ...auditContext(),
      }),
    ).rejects.toThrow(/0 et 90 jours/);

    await expect(
      updateMfaRolePolicy({
        role: "PLAYER",
        mode: "REQUIRED",
        gracePeriodDays: 0,
        ...auditContext(),
        reason: " ",
      }),
    ).rejects.toThrow(/motif/);
  });
});