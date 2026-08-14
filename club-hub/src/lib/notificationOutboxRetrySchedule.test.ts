import { describe, expect, it } from "vitest";
import { computeNextRetryAt, RETRY_SCHEDULE_MINUTES } from "./notificationOutboxRetrySchedule";

describe("computeNextRetryAt (TS-26)", () => {
  it("follows the 1min -> 5min -> 15min -> 1h -> 6h schedule", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeNextRetryAt(1, now)).toEqual(new Date("2026-01-01T00:01:00.000Z"));
    expect(computeNextRetryAt(2, now)).toEqual(new Date("2026-01-01T00:05:00.000Z"));
    expect(computeNextRetryAt(3, now)).toEqual(new Date("2026-01-01T00:15:00.000Z"));
    expect(computeNextRetryAt(4, now)).toEqual(new Date("2026-01-01T01:00:00.000Z"));
    expect(computeNextRetryAt(5, now)).toEqual(new Date("2026-01-01T06:00:00.000Z"));
  });

  it("returns null once the schedule is exhausted", () => {
    expect(computeNextRetryAt(RETRY_SCHEDULE_MINUTES.length + 1)).toBeNull();
  });
});
