import { describe, expect, it } from "vitest";
import { parseInjuryDocuments } from "./MedicalServiceBase";

describe("parseInjuryDocuments", () => {
  it("returns only valid document entries", () => {
    const value = JSON.stringify([
      { name: "IRM", url: "https://example.test/irm.pdf" },
      { name: "missing-url" },
      null,
      "invalid",
    ]);
    expect(parseInjuryDocuments(value)).toEqual([
      { name: "IRM", url: "https://example.test/irm.pdf" },
    ]);
  });

  it("is resilient to empty and malformed JSON", () => {
    expect(parseInjuryDocuments(null)).toEqual([]);
    expect(parseInjuryDocuments("not-json")).toEqual([]);
    expect(parseInjuryDocuments("{}")).toEqual([]);
  });
});
