import { describe, expect, it } from "vitest";
import { supporterPublicName } from "./supporterPublicIdentity";

describe("supporterPublicName", () => {
  it("is stable for the same member and club", () => {
    expect(supporterPublicName("member-1", "team-1")).toBe(supporterPublicName("member-1", "team-1"));
  });

  it("does not expose the technical user id and separates members/clubs", () => {
    const first = supporterPublicName("amine@example.com", "team-1");
    const second = supporterPublicName("amine@example.com", "team-2");
    expect(first).toMatch(/^Supporter [0-9A-F]{6}$/);
    expect(first).not.toContain("amine@example.com");
    expect(first).not.toBe(second);
  });
});
