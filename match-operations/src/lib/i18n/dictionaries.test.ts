import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";
import { directionFor, resolveLanguage } from "./locale";
import { readFileSync, readdirSync } from "node:fs";

describe("i18n catalogs", () => {
  it("resolves contextual keys in both languages", () => {
    expect(translate("fr", "events.goal.actions.add")).toBe("Ajouter un but");
    expect(translate("ar", "common.actions.close")).toBe("إغلاق");
  });
  it("interpolates every occurrence", () => {
    expect(translate("fr", "controls.progress", { done: 3, total: 11 })).toBe("3/11 contrôlés");
  });
  it("keeps French and Arabic keys in parity", () => {
    expect(Object.keys(dictionaries.ar).sort()).toEqual(Object.keys(dictionaries.fr).sort());
  });
  it("translates every stable action return code in both locales", () => {
    const actionRoot = "src/app/[matchId]";
    const actionFiles = readdirSync(actionRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${actionRoot}/${entry.name}/actions.ts`)
      .filter((file) => {
        try { readFileSync(file); return true; } catch { return false; }
      });
    const codes = new Set(
      actionFiles.flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/(?:message|error):\s*"([a-z][A-Za-z.]+)"/g)].map((match) => match[1]),
      ),
    );

    expect(codes.size).toBeGreaterThan(0);
    for (const code of codes) {
      expect(dictionaries.fr).toHaveProperty(code);
      expect(dictionaries.ar).toHaveProperty(code);
      expect(translate("fr", code as keyof typeof dictionaries.fr)).not.toBe(code);
      expect(translate("ar", code as keyof typeof dictionaries.fr)).not.toBe(code);
    }
  });
  it("keeps interpolation parameters identical between catalogs", () => {
    const parameters = (text: string) => [...text.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();

    for (const key of Object.keys(dictionaries.fr) as (keyof typeof dictionaries.fr)[]) {
      expect(parameters(dictionaries.ar[key]), key).toEqual(parameters(dictionaries.fr[key]));
    }
    expect(translate("fr", "actions.closure.errors.signaturesRequired", { count: 3 })).toContain("3");
    expect(translate("ar", "actions.closure.errors.signaturesRequired", { count: 3 })).toContain("3");
  });
  it("resolves the document direction from the persisted locale", () => {
    expect(directionFor(resolveLanguage("fr"))).toBe("ltr");
    expect(directionFor(resolveLanguage("ar"))).toBe("rtl");
    expect(resolveLanguage("unknown")).toBe("fr");
  });
});
