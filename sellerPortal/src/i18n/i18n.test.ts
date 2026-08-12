import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { fr } from "./fr";
import { translate } from "./index";
describe("seller portal i18n", () => {
  it("keeps French and Arabic catalogs in parity", () => expect(Object.keys(ar).sort()).toEqual(Object.keys(fr).sort()));
  it("interpolates named values", () => expect(translate("fr", "seller.dashboard.welcome", { name: "Amal" })).toBe("Bienvenue, Amal"));
  it("falls back to French for a missing localized value", () => {
    const old = ar["common.save"]; delete (ar as Partial<typeof ar>)["common.save"];
    expect(translate("ar", "common.save")).toBe(fr["common.save"]); ar["common.save"] = old;
  });
});
