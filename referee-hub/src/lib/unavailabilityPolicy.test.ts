import { describe, expect, it } from "vitest";
import { DEFAULT_UNAVAILABILITY_POLICY, validateUnavailabilityRequest } from "./unavailabilityPolicy";

const now = new Date("2026-08-17T08:00:00Z");

describe("referee unavailability policy", () => {
  it("requires the configured minimum notice period", () => {
    const tooSoon = validateUnavailabilityRequest(
      DEFAULT_UNAVAILABILITY_POLICY,
      { startDate: "2026-08-17", endDate: "2026-08-18", reasonCategory: "OTHER" },
      now,
    );
    expect(tooSoon).toMatch(/préavis/);

    const okNotice = validateUnavailabilityRequest(
      DEFAULT_UNAVAILABILITY_POLICY,
      { startDate: "2026-08-20", endDate: "2026-08-21", reasonCategory: "OTHER" },
      now,
    );
    expect(okNotice).toBeNull();
  });

  it("rejects a duration longer than the configured maximum", () => {
    const error = validateUnavailabilityRequest(
      { ...DEFAULT_UNAVAILABILITY_POLICY, maxDurationDays: 5 },
      { startDate: "2026-08-25", endDate: "2026-09-05", reasonCategory: "OTHER" },
      now,
    );
    expect(error).toMatch(/5 jours/);
  });

  it("rejects recurrence unless the policy allows it", () => {
    const error = validateUnavailabilityRequest(
      { ...DEFAULT_UNAVAILABILITY_POLICY, recurrenceAllowed: false },
      {
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        reasonCategory: "OTHER",
        recurrenceDaysOfWeek: [1],
        recurrenceEndDate: "2026-09-30",
      },
      now,
    );
    expect(error).toMatch(/récurrentes/);

    const ok = validateUnavailabilityRequest(
      { ...DEFAULT_UNAVAILABILITY_POLICY, recurrenceAllowed: true },
      {
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        reasonCategory: "OTHER",
        recurrenceDaysOfWeek: [1],
        recurrenceEndDate: "2026-09-30",
      },
      now,
    );
    expect(ok).toBeNull();
  });

  it("rejects a recurrence end date before the first occurrence ends", () => {
    const error = validateUnavailabilityRequest(
      { ...DEFAULT_UNAVAILABILITY_POLICY, recurrenceAllowed: true },
      {
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        reasonCategory: "OTHER",
        recurrenceDaysOfWeek: [1],
        recurrenceEndDate: "2026-08-20",
      },
      now,
    );
    expect(error).toMatch(/postérieure/);
  });

  it("requires proof for reasons configured as requiring it", () => {
    const missing = validateUnavailabilityRequest(
      DEFAULT_UNAVAILABILITY_POLICY,
      { startDate: "2026-08-25", endDate: "2026-08-26", reasonCategory: "MEDICAL" },
      now,
    );
    expect(missing).toMatch(/justificatif/);

    const provided = validateUnavailabilityRequest(
      DEFAULT_UNAVAILABILITY_POLICY,
      {
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        reasonCategory: "MEDICAL",
        proofDocumentUrl: "https://example.test/proof.pdf",
      },
      now,
    );
    expect(provided).toBeNull();

    const notRequired = validateUnavailabilityRequest(
      DEFAULT_UNAVAILABILITY_POLICY,
      { startDate: "2026-08-25", endDate: "2026-08-26", reasonCategory: "PERSONAL" },
      now,
    );
    expect(notRequired).toBeNull();
  });
});
