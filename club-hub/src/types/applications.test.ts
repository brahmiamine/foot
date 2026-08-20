import { describe, expect, it } from "vitest";
import { academyCreatePlayerSchema, createPlayerApplicationSchema } from "./applications";

function publicApplication(overrides: Record<string, unknown> = {}) {
  return {
    childLastName: "Ben Salah",
    childFirstName: "Youssef",
    birthDate: "2011-04-10",
    category: "U15",
    position: "MIDFIELDER",
    parentName: "Parent",
    parentPhone: "+21600000000",
    parentEmail: "parent@example.com",
    ...overrides,
  };
}

describe("academy application validation", () => {
  it("accepts only local application-upload paths for public attachments", () => {
    expect(
      createPlayerApplicationSchema.parse(
        publicApplication({ documentUrl: "/uploads/applications/1720000000000_document.pdf" }),
      ).documentUrl,
    ).toBe("/uploads/applications/1720000000000_document.pdf");

    expect(() =>
      createPlayerApplicationSchema.parse(publicApplication({ documentUrl: "javascript:alert(1)" })),
    ).toThrow();
    expect(() =>
      createPlayerApplicationSchema.parse(publicApplication({ documentUrl: "/uploads/applications/../../secret" })),
    ).toThrow();
  });

  it("keeps Player creation aligned with the canonical number and position domain", () => {
    expect(academyCreatePlayerSchema.parse({ number: "99", category: "u15", position: "MIDFIELDER" })).toEqual({
      number: 99,
      category: "u15",
      position: "MIDFIELDER",
    });
    expect(() => academyCreatePlayerSchema.parse({ number: "100", category: "u15", position: "MIDFIELDER" })).toThrow();
    expect(() => academyCreatePlayerSchema.parse({ number: "10", category: "u15", position: "WINGER" })).toThrow();
  });
});
