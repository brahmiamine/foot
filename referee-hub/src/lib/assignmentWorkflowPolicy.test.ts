import { describe, expect, it } from "vitest";
import {
  assignmentResponseDeadlineHours,
  canAcceptAssignment,
  canRequestReplacement,
  computeAssignmentResponseDeadline,
} from "./assignmentWorkflowPolicy";

describe("referee assignment workflow policy", () => {
  it("bounds the configurable response deadline", () => {
    expect(assignmentResponseDeadlineHours({ REFEREE_ASSIGNMENT_RESPONSE_DEADLINE_HOURS: "24" })).toBe(24);
    expect(assignmentResponseDeadlineHours({ REFEREE_ASSIGNMENT_RESPONSE_DEADLINE_HOURS: "0" })).toBe(48);
    expect(assignmentResponseDeadlineHours({ REFEREE_ASSIGNMENT_RESPONSE_DEADLINE_HOURS: "500" })).toBe(48);
  });

  it("never sets the response deadline after kickoff", () => {
    const assignedAt = new Date("2026-08-17T08:00:00Z");
    const matchDate = new Date("2026-08-18T08:00:00Z");
    expect(computeAssignmentResponseDeadline(assignedAt, matchDate, 48)).toEqual(matchDate);
  });

  it("allows acceptance only for an active assignment before deadline and kickoff", () => {
    const deadline = new Date("2026-08-18T08:00:00Z");
    const matchDate = new Date("2026-08-19T08:00:00Z");
    expect(canAcceptAssignment({ assignmentActive: true, responseDeadline: deadline, matchDate, now: new Date("2026-08-18T07:00:00Z") })).toBe(true);
    expect(canAcceptAssignment({ assignmentActive: true, responseDeadline: deadline, matchDate, now: new Date("2026-08-18T09:00:00Z") })).toBe(false);
    expect(canAcceptAssignment({ assignmentActive: false, responseDeadline: deadline, matchDate, now: new Date("2026-08-18T07:00:00Z") })).toBe(false);
  });

  it("allows replacement requests only after acceptance and before kickoff", () => {
    const matchDate = new Date("2026-08-20T12:00:00Z");
    expect(canRequestReplacement({ assignmentActive: true, responseStatus: "ACCEPTED", matchDate, now: new Date("2026-08-19T12:00:00Z") })).toBe(true);
    expect(canRequestReplacement({ assignmentActive: true, responseStatus: "PENDING_ACCEPTANCE", matchDate, now: new Date("2026-08-19T12:00:00Z") })).toBe(false);
    expect(canRequestReplacement({ assignmentActive: true, responseStatus: "DECLINED", matchDate, now: new Date("2026-08-19T12:00:00Z") })).toBe(false);
    expect(canRequestReplacement({ assignmentActive: true, responseStatus: "ACCEPTED", matchDate, now: new Date("2026-08-20T12:00:00Z") })).toBe(false);
  });
});
