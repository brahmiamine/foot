import { describe, expect, it } from "vitest";
import {
  isAccessWindowActive,
  resolveDirectAuthority,
  resolveDirectAuthorityForWindow,
  validateDelegationGrant,
  type DirectRoleGrant,
} from "./roleDelegation";

const now = new Date("2026-08-20T14:00:00.000Z");

function grant(patch: Partial<DirectRoleGrant> = {}): DirectRoleGrant {
  return {
    permissions: ["trainings.view", "trainings.edit"],
    category: "u17",
    isGlobal: false,
    validFrom: null,
    validUntil: null,
    revokedAt: null,
    ...patch,
  };
}

describe("isAccessWindowActive", () => {
  it("keeps legacy permanent assignments active", () => {
    expect(isAccessWindowActive({ validFrom: null, validUntil: null, revokedAt: null }, now)).toBe(true);
  });

  it("uses a half-open validity window and fails closed outside it", () => {
    expect(isAccessWindowActive({
      validFrom: new Date("2026-08-20T13:00:00.000Z"),
      validUntil: new Date("2026-08-20T15:00:00.000Z"),
      revokedAt: null,
    }, now)).toBe(true);
    expect(isAccessWindowActive({
      validFrom: new Date("2026-08-20T15:00:00.000Z"),
      validUntil: null,
      revokedAt: null,
    }, now)).toBe(false);
    expect(isAccessWindowActive({
      validFrom: null,
      validUntil: new Date("2026-08-20T14:00:00.000Z"),
      revokedAt: null,
    }, now)).toBe(false);
  });

  it("treats an explicit revocation as inactive", () => {
    expect(isAccessWindowActive({
      validFrom: null,
      validUntil: null,
      revokedAt: new Date("2026-08-20T13:30:00.000Z"),
    }, now)).toBe(false);
  });
});

describe("resolveDirectAuthority", () => {
  it("only exposes permissions from active direct roles for the requested category", () => {
    const authority = resolveDirectAuthority([
      grant({ category: "u17", permissions: ["trainings.view", "trainings.edit"] }),
      grant({ category: "u19", permissions: ["discipline.manage"] }),
      grant({ category: "u17", permissions: ["roles.manage"], validUntil: new Date("2026-08-20T13:00:00.000Z") }),
    ], "u17", now);

    expect([...authority.permissions].sort()).toEqual(["trainings.edit", "trainings.view"]);
    expect(authority.canGlobalScope).toBe(false);
  });

  it("lets an active global direct role contribute to every category", () => {
    const authority = resolveDirectAuthority([
      grant({ isGlobal: true, category: null, permissions: ["notifications.send", "roles.manage"] }),
    ], "u15", now);

    expect(authority.permissions.has("notifications.send")).toBe(true);
    expect(authority.canGlobalScope).toBe(true);
  });
});

describe("resolveDirectAuthorityForWindow", () => {
  it("only exposes authority that covers the whole requested delegation window", () => {
    const requestedFrom = new Date("2026-08-20T14:00:00.000Z");
    const requestedUntil = new Date("2026-08-21T14:00:00.000Z");

    const authority = resolveDirectAuthorityForWindow([
      grant({ permissions: ["roles.manage", "trainings.view"], validUntil: requestedUntil }),
      grant({ permissions: ["discipline.manage"], validUntil: new Date("2026-08-21T13:59:59.000Z") }),
      grant({ permissions: ["notifications.send"], validFrom: new Date("2026-08-20T14:00:01.000Z") }),
      grant({ permissions: ["ticketing.view"], revokedAt: new Date("2026-08-20T13:00:00.000Z") }),
    ], "u17", requestedFrom, requestedUntil);

    expect([...authority.permissions].sort()).toEqual(["roles.manage", "trainings.view"]);
  });
});

describe("validateDelegationGrant", () => {
  it("accepts only a bounded subset of the delegator direct authority", () => {
    const authority = resolveDirectAuthority([grant()], "u17", now);

    expect(() => validateDelegationGrant({
      requestedPermissions: ["trainings.view"],
      category: "u17",
      validFrom: now,
      validUntil: new Date("2026-08-21T14:00:00.000Z"),
      reason: "Remplacement coach pour le match du week-end",
      authority,
    })).not.toThrow();

    expect(() => validateDelegationGrant({
      requestedPermissions: ["discipline.manage"],
      category: "u17",
      validFrom: now,
      validUntil: new Date("2026-08-21T14:00:00.000Z"),
      reason: "Délégation trop large",
      authority,
    })).toThrow("autorité directe");
  });

  it("requires an explicit finite window and a reason", () => {
    const authority = resolveDirectAuthority([grant()], "u17", now);
    expect(() => validateDelegationGrant({
      requestedPermissions: ["trainings.view"],
      category: "u17",
      validFrom: now,
      validUntil: now,
      reason: "raison",
      authority,
    })).toThrow("postérieure");
    expect(() => validateDelegationGrant({
      requestedPermissions: ["trainings.view"],
      category: "u17",
      validFrom: now,
      validUntil: new Date("2026-08-21T14:00:00.000Z"),
      reason: " ",
      authority,
    })).toThrow("motif");
  });

  it("rejects a global delegation without a global direct role", () => {
    const authority = resolveDirectAuthority([grant()], "u17", now);
    expect(() => validateDelegationGrant({
      requestedPermissions: ["trainings.view"],
      category: null,
      validFrom: now,
      validUntil: new Date("2026-08-21T14:00:00.000Z"),
      reason: "Couverture globale temporaire",
      authority,
    })).toThrow("portée globale");
  });
});