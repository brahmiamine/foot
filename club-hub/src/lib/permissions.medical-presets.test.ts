import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS } from "./permissions";

function preset(name: string) {
  const value = DEFAULT_ROLE_PRESETS.find((role) => role.name === name);
  if (!value) throw new Error(`Preset introuvable: ${name}`);
  return new Set(value.permissions);
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
    const permissions = preset("Kiné");
    expect(permissions).toEqual(new Set([
      "players.view",
      "staff.view",
      "matches.view",
      "convocations.view",
      "trainings.view",
      "medical.view",
      "medical.followups.manage",
      "medical.rtp.manage",
    ]));
    expect(permissions.has("medical.injuries.manage")).toBe(false);
    expect(permissions.has("medical.clearance.manage")).toBe(false);
    expect(permissions.has("medical.settings.manage")).toBe(false);
  });

  it("gives the doctor clinical authority but not organisation-wide settings", () => {
    const permissions = preset("Médecin");
    expect(permissions.has("medical.injuries.manage")).toBe(true);
    expect(permissions.has("medical.followups.manage")).toBe(true);
    expect(permissions.has("medical.rtp.manage")).toBe(true);
    expect(permissions.has("medical.clearance.manage")).toBe(true);
    expect(permissions.has("medical.documents.manage")).toBe(true);
    expect(permissions.has("medical.settings.manage")).toBe(false);
    expect(permissions.has("medical.manage")).toBe(false);
  });

  it("gives the medical manager every granular medical capability", () => {
    const permissions = preset("Responsable médical");
    for (const permission of [
      "medical.view",
      "medical.injuries.manage",
      "medical.followups.manage",
      "medical.rtp.manage",
      "medical.clearance.manage",
      "medical.documents.manage",
      "medical.settings.manage",
    ]) {
      expect(permissions.has(permission)).toBe(true);
    }
    expect(permissions.has("medical.manage")).toBe(false);
  });

  it("keeps the secretary general excluded from every medical permission", () => {
    const permissions = preset("Secrétaire Général");
    expect([...permissions].some((permission) => permission.startsWith("medical."))).toBe(false);
  });
});
