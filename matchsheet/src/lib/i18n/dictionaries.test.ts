import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";
import { directionFor, resolveLanguage } from "./locale";

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
  it("resolves the document direction from the persisted locale", () => {
    expect(directionFor(resolveLanguage("fr"))).toBe("ltr");
    expect(directionFor(resolveLanguage("ar"))).toBe("rtl");
    expect(resolveLanguage("unknown")).toBe("fr");
  });
});
