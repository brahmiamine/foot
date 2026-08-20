import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS } from "./permissions";

function preset(name: string) {
  const value = DEFAULT_ROLE_PRESETS.find((role) => role.name === name);
  if (!value) throw new Error(`Preset introuvable: ${name}`);
  return value;
}

function permissions(name: string) {
  return new Set(preset(name).permissions);
}

describe("CLUB-013 medical role presets", () => {
  it("exposes granular medical permissions in the catalogue", () => {
    expect(ALL_PERMISSION_KEYS).toEqual(expect.arrayContaining([
      "medical.injuries.manage",
      "medical.followups.manage",
      "medical.rtp.manage",
      "medical.clearance.manage",
      "medical.documents.manage",
      "medical.settings.manage",
    ]));
  });

  it("gives the physiotherapist only follow-up and rehabilitation authority", () => {
    const role = preset("Kiné");
    expect(role.isGlobal).toBe(false);
    expect(new Set(role.permissions)).toEqual(new Set([
      "players.view",
      "staff.view",
      "matches.view",
      "convocations.view",
      "trainings.view",
      "medical.view",
      "medical.followups.manage",
      "medical.rtp.manage",
    ]));
    expect(role.permissions).not.toContain("medical.injuries.manage");
    expect(role.permissions).not.toContain("medical.clearance.manage");
    expect(role.permissions).not.toContain("medical.settings.manage");
  });

  it("gives the doctor clinical authority but not organisation-wide settings", () => {
    const role = preset("Médecin");
    const rolePermissions = new Set(role.permissions);
    expect(role.isGlobal).toBe(false);
    expect(rolePermissions.has("medical.injuries.manage")).toBe(true);
    expect(rolePermissions.has("medical.followups.manage")).toBe(true);
    expect(rolePermissions.has("medical.rtp.manage")).toBe(true);
    expect(rolePermissions.has("medical.clearance.manage")).toBe(true);
    expect(rolePermissions.has("medical.documents.manage")).toBe(true);
    expect(rolePermissions.has("medical.settings.manage")).toBe(false);
    expect(rolePermissions.has("medical.manage")).toBe(false);
  });

  it("makes the medical manager global and grants every granular medical capability", () => {
    const role = preset("Responsable médical");
    const rolePermissions = new Set(role.permissions);
    expect(role.isGlobal).toBe(true);
    for (const permission of [
      "medical.view",
      "medical.injuries.manage",
      "medical.followups.manage",
      "medical.rtp.manage",
      "medical.clearance.manage",
      "medical.documents.manage",
      "medical.settings.manage",
    ]) {
      expect(rolePermissions.has(permission)).toBe(true);
    }
    expect(rolePermissions.has("medical.manage")).toBe(false);
  });

  it("keeps the secretary general excluded from every medical permission", () => {
    expect([...permissions("Secrétaire Général")].some((permission) => permission.startsWith("medical."))).toBe(false);
  });
});
