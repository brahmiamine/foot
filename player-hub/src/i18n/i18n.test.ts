import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";

const sortedKeys = (value: Record<string, string>) => Object.keys(value).sort();

describe("player-hub i18n", () => {
  it("keeps the French and Arabic catalogs in sync", () => {
    expect(sortedKeys(dictionaries.ar)).toEqual(sortedKeys(dictionaries.fr));
  });

  it("interpolates semantic translations in both locales", () => {
    expect(translate("fr", "dashboard.greeting", { name: "Amine" })).toBe("Bonjour Amine 👋");
    expect(translate("ar", "dashboard.greeting", { name: "أمين" })).toContain("أمين");
  });
});
