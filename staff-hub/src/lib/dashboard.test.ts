import { describe, expect, it } from "vitest";
import { countAvailability, getConvocationMessage, getRoleLabelKey } from "./dashboard";

describe("staff dashboard helpers", () => {
  it("counts availability statuses", () => expect(countAvailability(["AVAILABLE", "INJURED", "AVAILABLE", "SUSPENDED"])).toEqual({ AVAILABLE: 2, INJURED: 1, SUSPENDED: 1 }));
  it("selects the convocation semantic message", () => {
    expect(getConvocationMessage(2, 4)).toEqual({ key: "dashboard.callups.responses", values: { answered: 2, total: 4 } });
    expect(getConvocationMessage(0, 0)).toEqual({ key: "dashboard.callups.none" });
  });
  it("maps known roles without translating unknown role codes", () => {
    expect(getRoleLabelKey("ADMIN")).toBe("role.admin");
    expect(getRoleLabelKey("OTHER")).toBeNull();
  });
});
