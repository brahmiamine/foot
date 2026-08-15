import { describe, expect, it } from "vitest";
import { assertClubSanctionTransition, blocksRegistrations, blocksTransfers, isClubSanctionEnforceable } from "../../../packages/regulatory-shared/src/clubSanction";
describe("club sanction domain (club-hub mirror)", () => {
  it("rejects transitions out of a terminal status", () => {
    expect(() => assertClubSanctionTransition("CANCELLED", "ACTIVE")).toThrow();
    expect(() => assertClubSanctionTransition("ACTIVE", "CANCELLED")).not.toThrow();
  });
  it("computes enforceability against the current date", () => {
    expect(isClubSanctionEnforceable("ACTIVE", "2026-01-01", "2026-12-31", new Date("2026-08-14"))).toBe(true);
    expect(isClubSanctionEnforceable("ACTIVE", "2026-01-01", "2026-06-01", new Date("2026-08-14"))).toBe(false);
  });
  it("only TRANSFER_BAN and REGISTRATION_BAN block their respective workflows", () => {
    expect(blocksTransfers("TRANSFER_BAN")).toBe(true);
    expect(blocksTransfers("REGISTRATION_BAN")).toBe(false);
    expect(blocksRegistrations("REGISTRATION_BAN")).toBe(true);
    expect(blocksRegistrations("WARNING")).toBe(false);
  });
});
