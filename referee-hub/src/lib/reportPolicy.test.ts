import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_POLICY, computeReportSlaSchedule, isReportMandatoryForRole, resolveReportSlaState } from "./reportPolicy";

describe("referee report policy", () => {
  it("flags mandatory roles from the policy", () => {
    expect(isReportMandatoryForRole(DEFAULT_REPORT_POLICY, "CENTER_REFEREE")).toBe(true);
    expect(isReportMandatoryForRole(DEFAULT_REPORT_POLICY, "ASSISTANT_REFEREE")).toBe(false);
  });

  it("derives reminder/due/escalation from hour-based policy fields", () => {
    const matchFinishedAt = new Date("2026-08-17T18:00:00Z");
    const schedule = computeReportSlaSchedule(DEFAULT_REPORT_POLICY, matchFinishedAt);
    expect(schedule.dueAt).toEqual(new Date("2026-08-20T18:00:00Z"));
    expect(schedule.reminderAt).toEqual(new Date("2026-08-19T18:00:00Z"));
    expect(schedule.escalationAt).toEqual(new Date("2026-08-22T18:00:00Z"));
  });

  it("resolves the SLA state at a given time", () => {
    const matchFinishedAt = new Date("2026-08-17T18:00:00Z");
    const schedule = computeReportSlaSchedule(DEFAULT_REPORT_POLICY, matchFinishedAt);
    expect(resolveReportSlaState(schedule, new Date("2026-08-18T00:00:00Z"))).toBe("IN_SLA");
    expect(resolveReportSlaState(schedule, new Date("2026-08-20T00:00:00Z"))).toBe("DUE_SOON");
    expect(resolveReportSlaState(schedule, new Date("2026-08-21T00:00:00Z"))).toBe("OVERDUE");
    expect(resolveReportSlaState(schedule, new Date("2026-08-23T00:00:00Z"))).toBe("ESCALATION_DUE");
  });
});
