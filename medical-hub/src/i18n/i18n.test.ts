import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";
const keys = (value: Record<string, string>) => Object.keys(value).sort();
describe("medical-hub i18n", () => {
  it("keeps FR and AR catalogs aligned", () => expect(keys(dictionaries.ar)).toEqual(keys(dictionaries.fr)));
  it("interpolates semantic alert labels", () => {
    expect(translate("fr", "dashboard.alerts.upcoming", { days: 4 })).toBe("Retour dans 4j");
    expect(translate("ar", "dashboard.unavailable.expectedReturn", { date: "20/08/2026" })).toContain("20/08/2026");
  });
});
