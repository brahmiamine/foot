import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "./dictionaries";

describe("translation dictionaries", () => {
  it("keeps exact French/Arabic key parity", () => {
    expect(Object.keys(dictionaries.ar).sort()).toEqual(Object.keys(dictionaries.fr).sort());
  });

  it.each(["fr", "ar"] as const)("interpolates placeholders in %s", (locale) => {
    const result = translate(locale, "contact.page.title", { team: "Olympique" });
    expect(result).toContain("Olympique");
    expect(result).not.toContain("{team}");
  });
});
