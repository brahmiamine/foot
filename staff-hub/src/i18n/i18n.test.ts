import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";

const keys = (value: Record<string, string>) => Object.keys(value).sort();
describe("staff-hub i18n", () => {
  it("keeps FR and AR catalogs aligned", () => expect(keys(dictionaries.ar)).toEqual(keys(dictionaries.fr)));
  it("interpolates semantic keys", () => {
    expect(translate("fr", "dashboard.callups.responses", { answered: 3, total: 5 })).toBe("3 / 5 réponses");
    expect(translate("ar", "dashboard.greeting", { name: "أمين" })).toContain("أمين");
  });
});
