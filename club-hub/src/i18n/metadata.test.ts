import { describe, expect, it } from "vitest";
import { translate } from "./dictionaries";
import { createAppMetadata } from "./metadata";

describe("localized application metadata", () => {
  it.each(["fr", "ar"] as const)("translates generic metadata in %s", (locale) => {
    const metadata = createAppMetadata(null, (key, values) => translate(locale, key, values));
    expect(metadata.description).toBe(translate(locale, "metadata.description.default"));
  });

  it.each(["fr", "ar"] as const)("translates and interpolates club metadata in %s", (locale) => {
    const metadata = createAppMetadata({ name: "Club Africain", faviconUrl: "/club.png" }, (key, values) => translate(locale, key, values));
    expect(metadata.description).toBe(translate(locale, "metadata.description.club", { team: "Club Africain" }));
    expect(metadata.icons).toEqual({ icon: "/club.png", apple: "/icons/apple-touch-icon.png" });
  });
});
