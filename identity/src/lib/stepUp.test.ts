import { describe, expect, it } from "vitest";
import { DEFAULT_STEP_UP_MAX_AGE_SECONDS, getStepUpMaxAgeSeconds, hasRecentMfa } from "./stepUp";

describe("MFA step-up freshness", () => {
  it("accepts only a non-future MFA proof inside the configured window", () => {
    const now = Date.parse("2026-08-17T09:00:00Z");

    expect(hasRecentMfa({ mfaVerifiedAt: now - 9 * 60 * 1000 }, 10 * 60, now)).toBe(true);
    expect(hasRecentMfa({ mfaVerifiedAt: now - 11 * 60 * 1000 }, 10 * 60, now)).toBe(false);
    expect(hasRecentMfa({ mfaVerifiedAt: now + 1 }, 10 * 60, now)).toBe(false);
    expect(hasRecentMfa({ mfaVerifiedAt: null }, 10 * 60, now)).toBe(false);
  });

  it("bounds the environment configuration to one minute through one hour", () => {
    expect(getStepUpMaxAgeSeconds({ MFA_STEP_UP_MAX_AGE_SECONDS: "900" })).toBe(900);
    expect(getStepUpMaxAgeSeconds({ MFA_STEP_UP_MAX_AGE_SECONDS: "30" })).toBe(
      DEFAULT_STEP_UP_MAX_AGE_SECONDS,
    );
    expect(getStepUpMaxAgeSeconds({ MFA_STEP_UP_MAX_AGE_SECONDS: "7200" })).toBe(
      DEFAULT_STEP_UP_MAX_AGE_SECONDS,
    );
    expect(getStepUpMaxAgeSeconds({ MFA_STEP_UP_MAX_AGE_SECONDS: "not-a-number" })).toBe(
      DEFAULT_STEP_UP_MAX_AGE_SECONDS,
    );
  });
});
