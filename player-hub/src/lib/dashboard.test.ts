import { describe, expect, it } from "vitest";
import { getAgendaLabelKey, getAvailabilityLabelKey, getTrainingAttendance } from "./dashboard";

describe("player dashboard helpers", () => {
  it("computes training attendance safely", () => {
    expect(getTrainingAttendance(7, 10)).toBe("70%");
    expect(getTrainingAttendance(0, 0)).toBe("—");
  });

  it("maps agenda types to semantic translation keys", () => {
    expect(getAgendaLabelKey("MATCH")).toBe("dashboard.agenda.match");
    expect(getAgendaLabelKey("TRAINING")).toBe("dashboard.agenda.training");
  });

  it("maps availability to semantic translation keys", () => {
    expect(getAvailabilityLabelKey(true)).toBe("dashboard.status.available");
    expect(getAvailabilityLabelKey(false, "INJURED")).toBe("dashboard.status.injured");
    expect(getAvailabilityLabelKey(false, "SUSPENDED")).toBe("dashboard.status.suspended");
  });
});
