import { describe, expect, it } from "vitest";
import { canWriteMatchReport, reportTypeForRole, validateDateRange } from "./refereeRules";

describe("referee private workflows", () => {
  it("allows reports for active referees, match delegates and referee observers after a finished match", () => {
    expect(canWriteMatchReport("CENTER_REFEREE", "ACTIVE", "FINISHED")).toBe(true);
    expect(canWriteMatchReport("MATCH_DELEGATE", "ACTIVE", "FINISHED")).toBe(true);
    expect(canWriteMatchReport("REFEREE_OBSERVER", "ACTIVE", "FINISHED")).toBe(true);
    expect(canWriteMatchReport("TEAM_REPRESENTATIVE", "ACTIVE", "FINISHED")).toBe(false);
    expect(canWriteMatchReport("CENTER_REFEREE", "REVOKED", "FINISHED")).toBe(false);
    expect(canWriteMatchReport("CENTER_REFEREE", "ACTIVE", "IN_PROGRESS")).toBe(false);
  });

  it("derives the authoritative report type from the official assignment role", () => {
    expect(reportTypeForRole("CENTER_REFEREE")).toBe("REFEREE_COMPLEMENTARY");
    expect(reportTypeForRole("ASSISTANT_REFEREE")).toBe("REFEREE_COMPLEMENTARY");
    expect(reportTypeForRole("MATCH_DELEGATE")).toBe("MATCH_DELEGATE");
    expect(reportTypeForRole("REFEREE_OBSERVER")).toBe("REFEREE_OBSERVER");
    expect(reportTypeForRole("TEAM_REPRESENTATIVE")).toBeNull();
  });

  it("validates inclusive future unavailability ranges", () => {
    expect(validateDateRange("2026-08-20", "2026-08-20", "2026-08-14")).toBeNull();
    expect(validateDateRange("2026-08-20", "2026-08-19", "2026-08-14")).toContain("fin");
    expect(validateDateRange("2026-08-01", "2026-08-02", "2026-08-14")).toContain("passé");
  });
});
