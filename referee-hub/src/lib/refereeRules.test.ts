import { describe, expect, it } from "vitest";
import { canWriteMatchReport, validateDateRange } from "./refereeRules";

describe("referee private workflows", () => {
  it("allows a report only for an active referee assignment on a finished match", () => {
    expect(canWriteMatchReport("CENTER_REFEREE", "ACTIVE", "FINISHED")).toBe(true);
    expect(canWriteMatchReport("REFEREE_OBSERVER", "ACTIVE", "FINISHED")).toBe(false);
    expect(canWriteMatchReport("CENTER_REFEREE", "REVOKED", "FINISHED")).toBe(false);
    expect(canWriteMatchReport("CENTER_REFEREE", "ACTIVE", "IN_PROGRESS")).toBe(false);
  });

  it("validates inclusive future unavailability ranges", () => {
    expect(validateDateRange("2026-08-20", "2026-08-20", "2026-08-14")).toBeNull();
    expect(validateDateRange("2026-08-20", "2026-08-19", "2026-08-14")).toContain("fin");
    expect(validateDateRange("2026-08-01", "2026-08-02", "2026-08-14")).toContain("passé");
  });
});
