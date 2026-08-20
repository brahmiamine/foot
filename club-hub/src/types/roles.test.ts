import { describe, expect, it } from "vitest";
import { assignRoleSchema, createRoleDelegationSchema } from "./roles";

describe("temporary role schemas", () => {
  it("keeps legacy permanent role assignments valid without a reason", () => {
    const result = assignRoleSchema.safeParse({
      userId: "user-1",
      roleId: 1,
      category: "u17",
      validFrom: null,
      validUntil: null,
      reason: null,
    });

    expect(result.success).toBe(true);
  });

  it("requires a reason and an ordered window for temporary assignments", () => {
    expect(assignRoleSchema.safeParse({
      userId: "user-1",
      roleId: 1,
      category: "u17",
      validFrom: "2026-08-20T14:00:00.000Z",
      validUntil: "2026-08-21T14:00:00.000Z",
      reason: null,
    }).success).toBe(false);

    expect(assignRoleSchema.safeParse({
      userId: "user-1",
      roleId: 1,
      category: "u17",
      validFrom: "2026-08-21T14:00:00.000Z",
      validUntil: "2026-08-20T14:00:00.000Z",
      reason: "Intérim staff",
    }).success).toBe(false);
  });
});

describe("role delegation schema", () => {
  it("requires at least one permission, an explicit reason and a finite ordered window", () => {
    const valid = createRoleDelegationSchema.safeParse({
      delegateeUserId: "user-2",
      permissions: ["trainings.view"],
      category: "u17",
      validFrom: "2026-08-20T14:00:00.000Z",
      validUntil: "2026-08-21T14:00:00.000Z",
      reason: "Remplacement du coach U17",
    });
    expect(valid.success).toBe(true);

    expect(createRoleDelegationSchema.safeParse({
      delegateeUserId: "user-2",
      permissions: [],
      category: "u17",
      validFrom: "2026-08-20T14:00:00.000Z",
      validUntil: "2026-08-21T14:00:00.000Z",
      reason: "Remplacement du coach U17",
    }).success).toBe(false);

    expect(createRoleDelegationSchema.safeParse({
      delegateeUserId: "user-2",
      permissions: ["trainings.view"],
      category: "u17",
      validFrom: "2026-08-21T14:00:00.000Z",
      validUntil: "2026-08-20T14:00:00.000Z",
      reason: "Remplacement du coach U17",
    }).success).toBe(false);
  });
});
