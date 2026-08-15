import { describe, expect, it } from "vitest";
import { getAlertMessage, getRoleLabelKey } from "./dashboard";
describe("medical dashboard helpers", () => {
  it("normalizes overdue and upcoming alert messages", () => {
    expect(getAlertMessage("OVERDUE", -3)).toEqual({ key: "dashboard.alerts.overdue", values: { days: 3 } });
    expect(getAlertMessage("UPCOMING", 5)).toEqual({ key: "dashboard.alerts.upcoming", values: { days: 5 } });
  });
  it("maps known roles", () => { expect(getRoleLabelKey("ADMIN")).toBe("role.admin"); expect(getRoleLabelKey("UNKNOWN")).toBeNull(); });
});
