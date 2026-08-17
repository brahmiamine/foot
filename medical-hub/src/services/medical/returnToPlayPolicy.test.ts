import { describe, expect, it } from "vitest";
import {
  countLatestClearances,
  expectedNextStage,
  requiredClearances,
} from "./returnToPlayPolicy";

const strictPolicy = {
  clearanceRequired: true,
  severeSecondOpinionRequired: true,
};

describe("Return-to-Play policy", () => {
  it("enforces the ordered progression", () => {
    expect(expectedNextStage("INJURED", strictPolicy)).toBe("TREATMENT");
    expect(expectedNextStage("TREATMENT", strictPolicy)).toBe("INDIVIDUAL");
    expect(expectedNextStage("INDIVIDUAL", strictPolicy)).toBe("PARTIAL");
    expect(expectedNextStage("PARTIAL", strictPolicy)).toBe("FULL");
    expect(expectedNextStage("FULL", strictPolicy)).toBe("CLEARANCE");
    expect(expectedNextStage("CLEARANCE", strictPolicy)).toBeNull();
    expect(expectedNextStage("AVAILABLE", strictPolicy)).toBeNull();
  });

  it("allows FULL to AVAILABLE only when clearance is disabled", () => {
    expect(
      expectedNextStage("FULL", {
        clearanceRequired: false,
        severeSecondOpinionRequired: true,
      }),
    ).toBe("AVAILABLE");
  });

  it("requires two distinct favorable reviewers for severe injuries when configured", () => {
    expect(requiredClearances("SEVERE", strictPolicy)).toBe(2);
    expect(requiredClearances("MODERATE", strictPolicy)).toBe(1);

    expect(
      countLatestClearances([
        { reviewerUserId: "doctor-1", decision: "CLEAR" },
        { reviewerUserId: "doctor-1", decision: "CLEAR" },
      ]),
    ).toBe(1);

    expect(
      countLatestClearances([
        { reviewerUserId: "doctor-1", decision: "CLEAR" },
        { reviewerUserId: "doctor-2", decision: "CLEAR" },
      ]),
    ).toBe(2);
  });

  it("uses the latest decision from each reviewer", () => {
    expect(
      countLatestClearances([
        { reviewerUserId: "doctor-1", decision: "CLEAR" },
        { reviewerUserId: "doctor-1", decision: "NOT_CLEAR" },
        { reviewerUserId: "doctor-2", decision: "CLEAR" },
      ]),
    ).toBe(1);
  });
});
