import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("staff-hub localized date formatting", () => {
  it("uses distinct French and Tunisian Arabic locale formats", () => {
    const date = new Date("2026-08-15T12:00:00Z");
    expect(formatDate(date, "ar")).not.toBe(formatDate(date, "fr"));
    expect(formatDateTime(date, "ar")).not.toBe(formatDateTime(date, "fr"));
  });
});
