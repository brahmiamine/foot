import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESIGNATION_POLICY,
  evaluateDesignationCandidate,
  rankDesignationCandidates,
} from "./designationPolicy";

describe("match official designation policy", () => {
  it("only blocks on availability in MANUAL mode", () => {
    const result = evaluateDesignationCandidate(DEFAULT_DESIGNATION_POLICY, {
      userId: "u1",
      available: true,
      grade: "REGIONAL",
      restHoursBeforeMatch: 1,
      priorAssignmentsCount: 0,
      distanceKm: 999,
    });
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("blocks unavailable candidates regardless of mode", () => {
    const result = evaluateDesignationCandidate(DEFAULT_DESIGNATION_POLICY, { userId: "u1", available: false });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/Indisponible/);
  });

  it("enforces grade/rest/history/distance only in SUGGESTED/AUTO", () => {
    const policy = {
      ...DEFAULT_DESIGNATION_POLICY,
      mode: "AUTO" as const,
      requiredGrades: ["FEDERAL"],
      minRestHours: 72,
      minHistoryMatches: 5,
      maxDistanceKm: 50,
    };
    const result = evaluateDesignationCandidate(policy, {
      userId: "u1",
      available: true,
      grade: "REGIONAL",
      restHoursBeforeMatch: 24,
      priorAssignmentsCount: 1,
      distanceKm: 120,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toHaveLength(4);
  });

  it("never blocks on a criterion whose data is missing", () => {
    const policy = { ...DEFAULT_DESIGNATION_POLICY, mode: "AUTO" as const, requiredGrades: ["FEDERAL"], maxDistanceKm: 50 };
    const result = evaluateDesignationCandidate(policy, { userId: "u1", available: true });
    expect(result.eligible).toBe(true);
  });

  it("ranks eligible candidates first, then by score", () => {
    const policy = { ...DEFAULT_DESIGNATION_POLICY, mode: "SUGGESTED" as const };
    const ranked = rankDesignationCandidates(policy, [
      { userId: "low-score", available: true, priorAssignmentsCount: 1 },
      { userId: "ineligible", available: false },
      { userId: "high-score", available: true, priorAssignmentsCount: 10 },
    ]);
    expect(ranked.map((entry) => entry.userId)).toEqual(["high-score", "low-score", "ineligible"]);
  });
});
